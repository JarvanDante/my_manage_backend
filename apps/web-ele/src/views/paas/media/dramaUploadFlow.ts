/** 短剧上传恢复控制：持久化绑定不可变操作身份与 generation，过期回调不得改写。 */

import {
  clearDramaUploadResume,
  dramaFileIdentity,
  fileMatchesIdentity,
  loadDramaUploadResume,
  saveDramaUploadResume,
  type DramaFileIdentity,
  type DramaUploadResume,
} from "./dramaUploadResume";

import {
  DramaCompleteUnknownError,
  isDramaCompleteQueryOnly,
  queryDramaUploadJob,
  uploadDramaZipAndEnqueue,
  type DramaUploadProgress,
  type MediaApi,
} from "../../../api/core/media";

export type DramaUploadPhase = "idle" | "upload" | "complete" | "job";

export interface DramaUploadFlowState {
  generation: number;
  active: boolean;
  finalized: boolean;
  completePending: boolean;
  identity: DramaFileIdentity | null;
  sessionId: string;
  resume: DramaUploadResume | null;
  error: string;
  phase: DramaUploadPhase;
  percent: number;
  jobId: string;
  jobStatus: string;
  expiresAt: string;
  uploadedParts?: number;
  partCount?: number;
}

export interface DramaUploadFlowSubmitOpts {
  file?: File | null;
  plan?: unknown;
  targetId?: string;
  limits?: MediaApi.DramaImportLimits;
  upload?: typeof uploadDramaZipAndEnqueue;
}

export interface DramaSelectResult {
  accepted: boolean;
  error: string;
  identity: DramaFileIdentity | null;
}

type BoundOp = {
  generation: number;
  identity: DramaFileIdentity;
  abort: AbortController;
  done: Promise<unknown>;
};

export function createDramaUploadFlow() {
  const state: DramaUploadFlowState = {
    generation: 0,
    active: false,
    finalized: false,
    completePending: false,
    identity: null,
    sessionId: "",
    resume: null,
    error: "",
    phase: "idle",
    percent: 0,
    jobId: "",
    jobStatus: "",
    expiresAt: "",
    uploadedParts: undefined,
    partCount: undefined,
  };

  let op: BoundOp | null = null;

  const canDiscard = () => !state.active && !state.completePending && !state.finalized && !!state.resume;
  const canSelectFile = () => !state.active;
  const isQueryOnly = () => state.completePending && !state.jobId;

  function persist(
    patch: Partial<DramaUploadResume> = {},
    bound?: { generation: number; identity: DramaFileIdentity },
  ) {
    if (state.finalized) return false;
    const generation = bound?.generation ?? state.generation;
    if (generation !== state.generation) return false;
    const ident = bound?.identity ?? state.identity;
    const sessionId = patch.session_id || state.sessionId;
    if (!sessionId || !ident) return false;
    if (state.jobStatus === "succeeded") {
      finalize();
      return false;
    }
    const prev = state.resume;
    const completePending =
      patch.complete_pending !== undefined
        ? Boolean(patch.complete_pending)
        : patch.job_id
          ? false
          : Boolean(prev?.complete_pending || state.completePending);
    const next: DramaUploadResume = {
      ...ident,
      session_id: sessionId,
      job_id: patch.job_id ?? (state.jobId || prev?.job_id),
      status: patch.status ?? state.phase,
      expires_at: patch.expires_at ?? state.expiresAt ?? prev?.expires_at,
      uploaded_parts: patch.uploaded_parts ?? state.uploadedParts ?? prev?.uploaded_parts,
      part_count: patch.part_count ?? state.partCount ?? prev?.part_count,
      saved_at: Date.now(),
      generation,
      complete_pending: completePending || undefined,
    };
    if (!next.job_id) delete next.job_id;
    state.resume = next;
    state.sessionId = next.session_id;
    state.completePending = Boolean(next.complete_pending);
    if (next.expires_at) state.expiresAt = next.expires_at;
    if (next.job_id) state.jobId = next.job_id;
    if (typeof next.uploaded_parts === "number") state.uploadedParts = next.uploaded_parts;
    if (typeof next.part_count === "number") state.partCount = next.part_count;
    saveDramaUploadResume(next);
    return true;
  }

  function finalize() {
    state.finalized = true;
    state.completePending = false;
    state.active = false;
    state.identity = null;
    state.sessionId = "";
    state.resume = null;
    state.expiresAt = "";
    state.uploadedParts = undefined;
    state.partCount = undefined;
    state.phase = state.phase === "job" ? "job" : "idle";
    clearDramaUploadResume();
  }

  function applyResume(r: DramaUploadResume | null) {
    state.resume = r;
    if (!r) {
      state.sessionId = "";
      state.completePending = false;
      return;
    }
    state.sessionId = r.session_id;
    state.identity = {
      filename: r.filename,
      total_size: r.total_size,
      last_modified: r.last_modified,
      digest: r.digest,
    };
    state.jobId = r.job_id || "";
    state.completePending = Boolean(r.complete_pending) && !r.job_id;
    state.expiresAt = r.expires_at || "";
    state.uploadedParts = r.uploaded_parts;
    state.partCount = r.part_count;
    if (r.generation) state.generation = Math.max(state.generation, r.generation);
  }

  function open() {
    state.error = "";
    if (op && state.active) {
      return { restoredActive: true, resume: state.resume };
    }
    state.finalized = false;
    state.percent = 0;
    if (!state.active) state.phase = "idle";
    applyResume(loadDramaUploadResume());
    return { restoredActive: false, resume: state.resume };
  }

  async function selectFile(file: File | null): Promise<DramaSelectResult> {
    state.error = "";
    if (state.active) {
      const error = "上传进行中，请等待当前会话结束后再选择文件";
      state.error = error;
      return { accepted: false, error, identity: state.identity };
    }
    if (!file) {
      applyResume(loadDramaUploadResume());
      return { accepted: false, error: "", identity: state.identity };
    }
    const ident = await dramaFileIdentity(file);
    const resume = loadDramaUploadResume() || state.resume;
    if (resume) {
      const mismatch = fileMatchesIdentity(file, resume, ident.digest);
      if (mismatch) {
        state.error = mismatch;
        applyResume(resume);
        return { accepted: false, error: mismatch, identity: state.identity };
      }
      applyResume(resume);
      state.identity = ident;
      return { accepted: true, error: "", identity: ident };
    }
    state.identity = ident;
    state.sessionId = "";
    state.jobId = "";
    state.completePending = false;
    state.phase = "idle";
    return { accepted: true, error: "", identity: ident };
  }

  async function discard(): Promise<{ ok: boolean; error: string }> {
    if (state.completePending && !state.jobId) {
      const error = "完成结果未知，正在核对原会话，不能放弃以免丢失待确认任务";
      state.error = error;
      return { ok: false, error };
    }
    if (state.active && op) {
      const leaving = op;
      state.generation += 1;
      leaving.abort.abort();
      await leaving.done.catch(() => undefined);
      if (op === leaving) op = null;
      state.active = false;
    }
    state.generation += 1;
    state.identity = null;
    state.sessionId = "";
    state.jobId = "";
    state.completePending = false;
    state.finalized = false;
    state.resume = null;
    state.error = "";
    state.phase = "idle";
    state.percent = 0;
    state.expiresAt = "";
    state.uploadedParts = undefined;
    state.partCount = undefined;
    clearDramaUploadResume();
    return { ok: true, error: "" };
  }

  function close() {
    if (!state.finalized && state.identity && state.sessionId) {
      persist({}, { generation: state.generation, identity: state.identity });
    }
  }

  function onJobStatus(job: { id: string; status: string }) {
    if (!job?.id) return;
    state.jobId = job.id;
    state.jobStatus = job.status;
    if (job.status === "succeeded") {
      finalize();
      return;
    }
    if (state.finalized) return;
    persist({ job_id: job.id, status: job.status, complete_pending: false });
  }

  async function submit(opts: DramaUploadFlowSubmitOpts) {
    if (state.active) {
      throw new Error("当前会话仍在上传，请等待结束后再试");
    }
    if (state.finalized) {
      throw new Error("该上传已完成，无需再次提交");
    }
    const upload = opts.upload || uploadDramaZipAndEnqueue;
    if (isQueryOnly()) {
      state.phase = "complete";
      if (!state.sessionId) {
        throw new Error("完成结果未知，缺少原会话，不能新建上传");
      }
      if (opts.file && (state.identity || state.resume)) {
        const ident = await dramaFileIdentity(opts.file);
        const expected = state.identity || state.resume!;
        const mismatch = fileMatchesIdentity(opts.file, expected, ident.digest);
        if (mismatch) {
          state.error = mismatch;
          throw new Error(mismatch);
        }
      }
      try {
        const got = await queryDramaUploadJob(state.sessionId);
        if (got) {
          persist({
            session_id: got.session_id,
            job_id: got.job_id,
            status: got.status,
            complete_pending: false,
          });
          return got;
        }
      } catch (e) {
        if (e instanceof DramaCompleteUnknownError) throw e;
        throw new DramaCompleteUnknownError(state.sessionId);
      }
      throw new DramaCompleteUnknownError(state.sessionId);
    }

    const file = opts.file;
    if (!file) {
      throw new Error("请选择 zip");
    }
    const ident = state.identity && fileMatchesIdentity(file, state.identity) === ""
      ? state.identity
      : await dramaFileIdentity(file);
    if (state.resume) {
      const mismatch = fileMatchesIdentity(file, state.resume, ident.digest);
      if (mismatch) {
        state.error = mismatch;
        throw new Error(mismatch);
      }
    }
    state.identity = ident;
    state.generation += 1;
    const bound = { generation: state.generation, identity: { ...ident } };
    const abort = new AbortController();
    state.active = true;
    state.finalized = false;
    state.phase = "upload";
    state.error = "";
    const run = (async () => {
      try {
        const done = await upload(file, {
          plan: opts.plan,
          targetId: opts.targetId,
          limits: opts.limits,
          sessionId: state.sessionId || undefined,
          identity: bound.identity,
          completePending: false,
          signal: abort.signal,
          onProgress: (p: DramaUploadProgress) => {
            if (bound.generation !== state.generation) return;
            state.sessionId = p.sessionId;
            state.phase = p.phase;
            state.percent = p.total > 0 ? Math.min(100, Math.round((p.uploadedBytes / p.total) * 100)) : 0;
            if (p.expiresAt) state.expiresAt = p.expiresAt;
            persist(
              {
                session_id: p.sessionId,
                uploaded_parts: p.uploadedParts,
                part_count: p.partCount,
                expires_at: p.expiresAt,
                complete_pending: p.completePending ? true : undefined,
                status: p.phase,
              },
              bound,
            );
          },
          onBeforeComplete: () => {
            if (bound.generation !== state.generation) return;
            state.completePending = true;
            state.phase = "complete";
            persist({ session_id: state.sessionId, complete_pending: true, status: "complete" }, bound);
          },
        });
        if (bound.generation !== state.generation) return done;
        state.sessionId = done.session_id;
        state.percent = 100;
        persist(
          {
            session_id: done.session_id,
            job_id: done.job_id,
            status: done.status,
            complete_pending: false,
          },
          bound,
        );
        return done;
      } catch (e) {
        if (bound.generation === state.generation) {
          if (isDramaCompleteQueryOnly(e) || (e instanceof Error && /结果未知|只查询核对/.test(e.message))) {
            state.completePending = true;
            persist({ session_id: state.sessionId, complete_pending: true, status: "complete" }, bound);
          } else {
            persist({ session_id: state.sessionId, complete_pending: false }, bound);
          }
        }
        throw e;
      } finally {
        if (bound.generation === state.generation) {
          state.active = false;
        }
      }
    })();
    op = { generation: bound.generation, identity: bound.identity, abort, done: run };
    return run;
  }

  function reset() {
    if (op) {
      op.abort.abort();
      op = null;
    }
    state.generation += 1;
    state.active = false;
    state.finalized = false;
    state.completePending = false;
    state.identity = null;
    state.sessionId = "";
    state.resume = null;
    state.error = "";
    state.phase = "idle";
    state.percent = 0;
    state.jobId = "";
    state.jobStatus = "";
    state.expiresAt = "";
    state.uploadedParts = undefined;
    state.partCount = undefined;
    clearDramaUploadResume();
  }

  return {
    state,
    persist,
    finalize,
    open,
    selectFile,
    discard,
    close,
    submit,
    onJobStatus,
    reset,
    canDiscard,
    canSelectFile,
    isQueryOnly,
  };
}

export type DramaUploadFlow = ReturnType<typeof createDramaUploadFlow>;

let singleton: DramaUploadFlow | null = null;

export function getDramaUploadFlow(): DramaUploadFlow {
  if (!singleton) singleton = createDramaUploadFlow();
  return singleton;
}

export function resetDramaUploadFlow() {
  if (singleton) singleton.reset();
  singleton = null;
}
