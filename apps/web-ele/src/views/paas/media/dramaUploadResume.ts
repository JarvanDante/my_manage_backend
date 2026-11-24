/** 短剧分片上传中断恢复：只持久化会话身份与 complete 待核对标记，不保存 token 或签名 URL。 */

export const DRAMA_UPLOAD_RESUME_KEY = "paas.media.dramaUpload.resume.v1";

export interface DramaFileIdentity {
  filename: string;
  total_size: number;
  last_modified: number;
  digest: string;
}

export interface DramaUploadResume extends DramaFileIdentity {
  session_id: string;
  job_id?: string;
  status?: string;
  expires_at?: string;
  uploaded_parts?: number;
  part_count?: number;
  saved_at: number;
  generation?: number;
  complete_pending?: boolean;
}

const EDGE = 65536;

export async function dramaFileIdentity(file: File): Promise<DramaFileIdentity> {
  return {
    filename: file.name,
    total_size: file.size,
    last_modified: file.lastModified || 0,
    digest: await edgeDigest(file),
  };
}

export async function edgeDigest(file: File): Promise<string> {
  const firstLen = Math.min(EDGE, Math.max(0, file.size));
  const lastStart = file.size > EDGE ? file.size - EDGE : 0;
  const first = new Uint8Array(await file.slice(0, firstLen).arrayBuffer());
  const last =
    lastStart > 0 ? new Uint8Array(await file.slice(lastStart).arrayBuffer()) : first;
  const packed = new Uint8Array(16 + first.length + last.length);
  const view = new DataView(packed.buffer);
  view.setUint32(0, file.size % 0x100000000, true);
  view.setUint32(4, Math.floor(file.size / 0x100000000), true);
  view.setUint32(8, first.length, true);
  view.setUint32(12, last.length, true);
  packed.set(first, 16);
  packed.set(last, 16 + first.length);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const hash = await subtle.digest("SHA-256", packed);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 2166136261;
  for (const b of packed) h = Math.imul(h ^ b, 16777619);
  return `fnv_${(h >>> 0).toString(16)}`;
}

export function fileMatchesIdentity(file: File, id: DramaFileIdentity, digest?: string): string {
  if (file.name !== id.filename) {
    return "当前文件与未完成会话的文件名不一致，不能复用该会话。请选择原来的 zip 或开始新的上传";
  }
  if (file.size !== id.total_size) {
    return "当前文件与未完成会话的大小不一致，不能复用该会话。请选择原来的 zip 或开始新的上传";
  }
  if (id.last_modified > 0 && file.lastModified > 0 && file.lastModified !== id.last_modified) {
    return "当前文件与未完成会话不是同一份 zip，不能复用该会话。请选择原来的文件或开始新的上传";
  }
  if (digest && id.digest && digest !== id.digest) {
    return "当前文件内容与未完成会话不一致，不能复用该会话。请选择原来的 zip 或开始新的上传";
  }
  return "";
}

export function sessionMatchesFile(
  sess: { filename: string; total_size: number; expires_at?: string },
  file: File,
): string {
  if (sess.expires_at) {
    const exp = Date.parse(sess.expires_at);
    if (Number.isFinite(exp) && exp <= Date.now()) {
      return "未完成的上传会话已过期，不能继续复用，请重新选择文件后新建上传";
    }
  }
  if (sess.filename !== file.name) {
    return "当前文件与未完成会话的文件名不一致，不能复用该会话。请选择原来的 zip 或开始新的上传";
  }
  if (sess.total_size !== file.size) {
    return "当前文件与未完成会话的大小不一致，不能复用该会话。请选择原来的 zip 或开始新的上传";
  }
  return "";
}

export function isUnknownCompleteError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (!msg) return false;
  if (msg.includes("结果未知") || msg.includes("完成导入任务超时") || msg.includes("只查询核对")) return true;
  if (/Failed to fetch|NetworkError|network/i.test(msg) && /complete|完成/.test(msg)) return true;
  return false;
}

export function shouldKeepExpiredResume(p: Partial<DramaUploadResume>): boolean {
  return Boolean(p.complete_pending || p.job_id);
}

export function loadDramaUploadResume(): DramaUploadResume | null {
  try {
    const raw = localStorage.getItem(DRAMA_UPLOAD_RESUME_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<DramaUploadResume>;
    if (!p || typeof p !== "object" || !p.session_id || !p.filename || !p.total_size) return null;
    if (p.expires_at && !shouldKeepExpiredResume(p)) {
      const exp = Date.parse(p.expires_at);
      if (Number.isFinite(exp) && exp <= Date.now()) {
        clearDramaUploadResume();
        return null;
      }
    }
    return sanitizeDramaUploadResume(p);
  } catch {
    return null;
  }
}

export function sanitizeDramaUploadResume(p: Partial<DramaUploadResume>): DramaUploadResume | null {
  if (!p || !p.session_id || !p.filename || !p.total_size) return null;
  return {
    session_id: String(p.session_id),
    filename: String(p.filename),
    total_size: Number(p.total_size),
    last_modified: Number(p.last_modified) || 0,
    digest: String(p.digest || ""),
    job_id: p.job_id ? String(p.job_id) : undefined,
    status: p.status ? String(p.status) : undefined,
    expires_at: p.expires_at ? String(p.expires_at) : undefined,
    uploaded_parts: typeof p.uploaded_parts === "number" ? p.uploaded_parts : undefined,
    part_count: typeof p.part_count === "number" ? p.part_count : undefined,
    saved_at: Number(p.saved_at) || Date.now(),
    generation: typeof p.generation === "number" ? p.generation : undefined,
    complete_pending: p.complete_pending ? true : undefined,
  };
}

export function saveDramaUploadResume(input: DramaUploadResume): void {
  const clean = sanitizeDramaUploadResume(input);
  if (!clean) return;
  try {
    localStorage.setItem(DRAMA_UPLOAD_RESUME_KEY, JSON.stringify(clean));
  } catch {
    /* 隐私模式等无法写入时忽略，不阻断上传 */
  }
}

export function clearDramaUploadResume(): void {
  try {
    localStorage.removeItem(DRAMA_UPLOAD_RESUME_KEY);
  } catch {
    /* ignore */
  }
}

export function resumeHint(r: DramaUploadResume): string {
  const parts =
    r.part_count && r.part_count > 0
      ? `已记录 ${r.uploaded_parts ?? 0}/${r.part_count} 个分片`
      : "已记录上传会话";
  if (r.complete_pending && !r.job_id) {
    return `原会话「${r.filename}」完成结果未知。将只核对是否已关联导入任务，不会再次提交完成或新建上传。`;
  }
  if (r.job_id) {
    return `发现原会话已关联导入任务 ${r.job_id}（${r.filename}）。将先核对该任务，不会自动新建上传。`;
  }
  return `发现未完成的上传会话「${r.filename}」（${parts}）。请选择同一份 zip 后续传，错文件不能复用。`;
}
