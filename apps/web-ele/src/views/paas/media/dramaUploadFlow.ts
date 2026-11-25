/** 短剧上传恢复控制：持久化必须落盘成功，生命周期与 job 回调隔离，进度即时通知视图。 */

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
  DramaUploadTerminalError,
  abortDramaUploadSafely,
  classifyDramaCompleteFailure,
  completeDramaUploadIdempotent,
  isDramaCompleteQueryOnly,
  probeDramaUploadSession,
  uploadDramaZipAndEnqueue,
  type DramaUploadProgress,
  type MediaApi,
} from "../../../api/core/media";

export type DramaUploadPhase = "idle" | "upload" | "complete" | "job";

export interface DramaUploadFlowState {
  lifecycle: number;
  generation: number;
  active: boolean;
  finalized: boolean;
  completePending: boolean;
  identity: DramaFileIdentity | null;
  sessionId: string;
  resume: DramaUploadResume | null;
  error: string;
  persistError: string;
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

export interface DramaUploadView {
  resume: { value: DramaUploadResume | null };
  sessionId: { value: string };
  identity: { value: DramaFileIdentity | null };
  phase: { value: DramaUploadPhase };
  percent: { value: number };
  error?: { value: string };
  importing?: { value: boolean };
}

type BoundOp = {
  generation: number;
  lifecycle: number;
  identity: DramaFileIdentity;
  abort: AbortController;
  done: Promise<unknown>;
};

export function syncDramaUploadView(flow: { state: DramaUploadFlowState }, view: DramaUploadView) {
  view.resume.value = flow.state.resume;
  view.sessionId.value = flow.state.sessionId;
  view.identity.value = flow.state.identity;
  view.phase.value = flow.state.phase;
  view.percent.value = flow.state.percent;
  if (flow.state.error && view.error) view.error.value = flow.state.error;
  if (view.importing) view.importing.value = flow.state.active;
}

export function bindDramaUploadView(
  flow: { state: DramaUploadFlowState; subscribe: (fn: () => void) => () => void },
  view: DramaUploadView,
) {
  const sync = () => syncDramaUploadView(flow, view);
  return flow.subscribe(sync);
}

export function createDramaUploadFlow() {
  const state: DramaUploadFlowState = {
    lifecycle: 0,
    generation: 0,
    active: false,
    finalized: false,
    completePending: false,
    identity: null,
    sessionId: "",
    resume: null,
    error: "",
    persistError: "",
    phase: "idle",
    percent: 0,
    jobId: "",
    jobStatus: "",
    expiresAt: "",
    uploadedParts: undefined,
    partCount: undefined,
  };

  const listeners = new Set<() => void>();
  const notify = () => {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* 视图同步失败不阻断上传 */
      }
    });
  };
  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    fn();
    return () => {
      listeners.delete(fn);
    };
  };

  let op: BoundOp | null = null;
  let discarding: Promise<{ ok: boolean; error: string }> | null = null;

  const canDiscard = () => !state.active && !state.finalized && !!state.resume;
  const canSelectFile = () => !state.active;
  const isQueryOnly = () => state.completePending && !state.jobId;

  function beginNewLifecycle() {
    state.lifecycle += 1;
    state.generation += 1;
    state.finalized = false;
    state.completePending = false;
    state.active = false;
    state.identity = null;
    state.sessionId = "";
    state.resume = null;
    state.jobId = "";
    state.jobStatus = "";
    state.error = "";
    state.persistError = "";
    state.phase = "idle";
    state.percent = 0;
    state.expiresAt = "";
    state.uploadedParts = undefined;
    state.partCount = undefined;
    notify();
  }

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
      plan: completePending ? (patch.plan ?? prev?.plan) : undefined,
    };
    if (!next.job_id) delete next.job_id;
    const ok = saveDramaUploadResume(next);
    if (!ok) {
      if (next.complete_pending) state.completePending = false;
      notify();
      return false;
    }
    state.resume = next;
    state.sessionId = next.session_id;
    state.completePending = Boolean(next.complete_pending);
    if (next.expires_at) state.expiresAt = next.expires_at;
    if (next.job_id) state.jobId = next.job_id;
    if (typeof next.uploaded_parts === "number") state.uploadedParts = next.uploaded_parts;
    if (typeof next.part_count === "number") state.partCount = next.part_count;
    notify();
    return true;
  }

  function finalize(fromJobId?: string) {
    if (fromJobId && state.jobId && fromJobId !== state.jobId) return;
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
    notify();
  }

  function applyResume(r: DramaUploadResume | null) {
    state.resume = r;
    if (!r) {
      state.sessionId = "";
      state.completePending = false;
      state.identity = null;
      state.jobId = "";
      state.jobStatus = "";
      state.expiresAt = "";
      state.uploadedParts = undefined;
      state.partCount = undefined;
      notify();
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
    state.jobStatus = r.job_id ? state.jobStatus : "";
    state.completePending = Boolean(r.complete_pending) && !r.job_id;
    state.expiresAt = r.expires_at || "";
    state.uploadedParts = r.uploaded_parts;
    state.partCount = r.part_count;
    if (r.generation) state.generation = Math.max(state.generation, r.generation);
    notify();
  }

  function open() {
    state.error = "";
    if (op && state.active) {
      notify();
      return { restoredActive: true, resume: state.resume };
    }
    const resume = loadDramaUploadResume();
    if (resume) {
      state.finalized = false;
      applyResume(resume);
      return { restoredActive: false, resume };
    }
    beginNewLifecycle();
    return { restoredActive: false, resume: null };
  }

  async function selectFile(file: File | null): Promise<DramaSelectResult> {
    state.error = "";
    if (state.active) {
      const error = "上传进行中，请等待当前会话结束后再选择文件";
      state.error = error;
      notify();
      return { accepted: false, error, identity: state.identity };
    }
    if (!file) {
      const resume = loadDramaUploadResume();
      if (resume) applyResume(resume);
      else applyResume(null);
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
      notify();
      return { accepted: true, error: "", identity: ident };
    }
    beginNewLifecycle();
    state.identity = ident;
    notify();
    return { accepted: true, error: "", identity: ident };
  }

  // complete 结果未知时放弃前先核对：已取消/不存在直接放行，未建任务先取消会话（终态）再放行，已有任务则拒绝
  async function confirmPendingExit(): Promise<string> {
    const sessionId = state.sessionId;
    const lifecycle = state.lifecycle;
    const switched = () => lifecycle !== state.lifecycle || sessionId !== state.sessionId;
    if (!sessionId) return "";
    const probe = await probeDramaUploadSession(sessionId);
    if (switched()) return "会话已切换，请重新核对";
    if (probe.kind === "not_found" || (probe.kind === "session" && probe.status === "aborted")) return "";
    let job = probe.kind === "job" ? probe.job : null;
    if (probe.kind === "session") {
      const r = await abortDramaUploadSafely(sessionId);
      if (switched()) return "会话已切换，请重新核对";
      if (r.kind === "aborted") return "";
      if (r.kind === "job") job = r.job;
    }
    if (job && job.status === "aborted") return "";
    if (job) {
      persist({ session_id: job.session_id, job_id: job.job_id, status: job.status, complete_pending: false });
      return `原会话已关联导入任务 ${job.job_id}，不能放弃`;
    }
    return "未能确认原会话已取消，已保留记录，请稍后再试";
  }

  // 服务端确认终态后开启新生命周期，允许重新选择文件新建上传
  function terminate() {
    beginNewLifecycle();
    clearDramaUploadResume();
    notify();
  }

  function discard(): Promise<{ ok: boolean; error: string }> {
    // 在途锁：重复点击复用同一次放弃
    if (!discarding) {
      discarding = doDiscard().finally(() => {
        discarding = null;
      });
    }
    return discarding;
  }

  async function doDiscard(): Promise<{ ok: boolean; error: string }> {
    if (state.completePending && !state.jobId) {
      const error = await confirmPendingExit();
      if (error) {
        state.error = error;
        notify();
        return { ok: false, error };
      }
    }
    if (state.active && op) {
      const leaving = op;
      state.generation += 1;
      leaving.abort.abort();
      await leaving.done.catch(() => undefined);
      if (op === leaving) op = null;
      state.active = false;
    }
    beginNewLifecycle();
    clearDramaUploadResume();
    notify();
    return { ok: true, error: "" };
  }

  function close() {
    if (!state.finalized && state.identity && state.sessionId) {
      persist({}, { generation: state.generation, identity: state.identity });
    }
    notify();
  }

  function watchJob(id: string, meta?: { lifecycle?: number }) {
    if (!id) return false;
    if (meta?.lifecycle !== undefined && meta.lifecycle !== state.lifecycle) return false;
    state.jobId = id;
    state.phase = "job";
    notify();
    return true;
  }

  function onJobStatus(job: { id: string; status: string }, meta?: { lifecycle?: number }) {
    if (!job?.id) return;
    if (meta?.lifecycle !== undefined && meta.lifecycle !== state.lifecycle) return;
    if (!state.jobId || job.id !== state.jobId) return;
    state.jobStatus = job.status;
    if (job.status === "succeeded") {
      finalize(job.id);
      return;
    }
    if (state.finalized) return;
    persist({ job_id: job.id, status: job.status, complete_pending: false });
    notify();
  }

  async function submit(opts: DramaUploadFlowSubmitOpts) {
    if (state.active) {
      throw new Error("当前会话仍在上传，请等待结束后再试");
    }
    if (state.finalized) {
      throw new Error("该上传已完成，无需再次提交");
    }
    const upload = opts.upload || uploadDramaZipAndEnqueue;
    // 落盘失败属可恢复错误，新一次提交重新尝试持久化
    state.persistError = "";
    if (isQueryOnly()) {
      state.phase = "complete";
      notify();
      if (!state.sessionId) {
        throw new Error("完成结果未知，缺少原会话，不能新建上传");
      }
      if (opts.file && (state.identity || state.resume)) {
        const ident = await dramaFileIdentity(opts.file);
        const expected = state.identity || state.resume!;
        const mismatch = fileMatchesIdentity(opts.file, expected, ident.digest);
        if (mismatch) {
          state.error = mismatch;
          notify();
          throw new Error(mismatch);
        }
      }
      const sessionId = state.sessionId;
      const lifecycle = state.lifecycle;
      const probe = await probeDramaUploadSession(sessionId);
      if (sessionId !== state.sessionId) throw new DramaCompleteUnknownError(sessionId);
      const saveJob = (job: { session_id: string; job_id: string; status: string }) =>
        persist({ session_id: job.session_id, job_id: job.job_id, status: job.status, complete_pending: false });
      if (probe.kind === "job") {
        saveJob(probe.job);
        return probe.job;
      }
      if (probe.kind === "not_found" || (probe.kind === "session" && probe.status === "aborted")) {
        terminate();
        throw new DramaUploadTerminalError(sessionId, "原会话已取消或不存在（终态，不会再生成任务），请重新选择 zip 新建上传");
      }
      if (probe.kind !== "session") throw new DramaCompleteUnknownError(sessionId);
      // uploading 或 completed 无 job：服务端按会话幂等，可用原计划安全重提补建任务
      const plan = opts.plan ?? state.resume?.plan;
      if (plan === undefined) {
        const msg = "完成结果未知且缺少原导入计划，请重新选择原 zip 并确认后再核对";
        state.error = msg;
        notify();
        throw new DramaCompleteUnknownError(sessionId, msg);
      }
      const timeoutSec = opts.limits?.import_timeout_sec && opts.limits.import_timeout_sec > 0
        ? opts.limits.import_timeout_sec
        : 600;
      try {
        const done = await completeDramaUploadIdempotent(sessionId, { plan, target_id: opts.targetId }, timeoutSec);
        if (lifecycle === state.lifecycle && sessionId === state.sessionId) saveJob(done);
        return done;
      } catch (e) {
        if (lifecycle === state.lifecycle && sessionId === state.sessionId) {
          if (e instanceof DramaUploadTerminalError) terminate();
          else if (!isDramaCompleteQueryOnly(e) && classifyDramaCompleteFailure(e) === "business") {
            persist({ session_id: sessionId, complete_pending: false });
          }
        }
        throw e;
      }
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
        notify();
        throw new Error(mismatch);
      }
    }
    state.identity = ident;
    state.generation += 1;
    const bound = { generation: state.generation, identity: { ...ident } };
    const abort = new AbortController();
    const boundLifecycle = state.lifecycle;
    // 仅 pending 落盘成功并放行 POST 后才视为 complete 已发出
    let completeSent = false;
    state.active = true;
    state.finalized = false;
    state.phase = "upload";
    state.error = "";
    notify();
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
            notify();
            persist(
              {
                session_id: p.sessionId,
                uploaded_parts: p.uploadedParts,
                part_count: p.partCount,
                expires_at: p.expiresAt,
                status: p.phase,
              },
              bound,
            );
          },
          onBeforeComplete: () => {
            if (bound.generation !== state.generation) return false;
            const ok = persist(
              { session_id: state.sessionId, complete_pending: true, status: "complete", plan: opts.plan },
              bound,
            );
            if (!ok) {
              state.completePending = false;
              state.persistError = "无法持久化完成待核对标记，已停止提交完成。请清理浏览器存储后重试同一会话，不要新建上传";
              notify();
              return false;
            }
            completeSent = true;
            state.phase = "complete";
            notify();
            return true;
          },
        });
        if (bound.generation !== state.generation || boundLifecycle !== state.lifecycle) return done;
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
        notify();
        return done;
      } catch (e) {
        if (bound.generation === state.generation && boundLifecycle === state.lifecycle) {
          if (e instanceof DramaUploadTerminalError) {
            terminate();
          } else if (!completeSent) {
            state.completePending = false;
          } else if (!isDramaCompleteQueryOnly(e) && classifyDramaCompleteFailure(e) === "business") {
            persist({ session_id: state.sessionId, complete_pending: false }, bound);
            state.completePending = false;
          } else {
            persist({ session_id: state.sessionId, complete_pending: true, status: "complete" }, bound);
            state.completePending = true;
          }
          notify();
        }
        throw e;
      } finally {
        if (bound.generation === state.generation && boundLifecycle === state.lifecycle) {
          state.active = false;
          notify();
        }
      }
    })();
    op = { generation: bound.generation, lifecycle: boundLifecycle, identity: bound.identity, abort, done: run };
    return run;
  }

  function reset() {
    if (op) {
      op.abort.abort();
      op = null;
    }
    listeners.clear();
    beginNewLifecycle();
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
    watchJob,
    reset,
    subscribe,
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
