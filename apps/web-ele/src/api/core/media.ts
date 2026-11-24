import type { RequestClientOptions } from "@vben/request";

import {
  defaultResponseInterceptor,
  RequestClient,
} from "@vben/request";

import { ElMessage } from "element-plus";

/** 媒资中心 my_media（与总后台 manage API 分离） */
const mediaBaseURL =
  (import.meta.env.VITE_MEDIA_API_URL as string) || "/media-api";
const mediaAdminToken =
  (import.meta.env.VITE_MEDIA_ADMIN_TOKEN as string) || "";

function createMediaClient(options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL: mediaBaseURL,
  });

  client.addRequestInterceptor({
    fulfilled(config) {
      config.headers["X-Admin-Token"] = mediaAdminToken;
      return config;
    },
  });

  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: "code",
      dataField: "data",
      successCode: 0,
    }),
  );

  client.addResponseInterceptor({
    rejected(error) {
      const data = error?.response?.data ?? {};
      const msg =
        data?.message || data?.msg || error?.message || "媒资服务请求失败";
      ElMessage.error(msg);
      return Promise.reject(error);
    },
  });

  return client;
}

const mediaClient = createMediaClient({ responseReturn: "data" });

/** 供其他 PaaS 页面(播放服务等)复用的 my_media 客户端 */
export const mediaRequest = mediaClient;

export namespace MediaApi {
  export interface AssetItem {
    id: string;
    title: string;
    cover_url: string;
    status: number;
    transcode_status: string;
    play_url: string;
    duration_sec: number;
    kind: number; // 0视频 1漫画 2动漫 3抖音 4小说 5短剧
    category: string;
    chapter_count: number;
    word_count?: number;
    parent_id?: number;
    seq?: number;
    update_status?: number;
    intro?: string;
    created_at: string;
  }

  export interface ComicPage {
    filename: string;
    key: string;
    url: string;
  }

  export interface ComicChapter {
    seq: number;
    title: string;
    page_count: number;
    pages?: ComicPage[];
    content?: string;
    word_count?: number;
  }

  export interface DramaEpisode {
    id: string;
    seq: number;
    title: string;
    status: number;
    transcode_status: string;
    play_url: string;
    duration_sec: number;
    source_key: string;
    cover_url?: string;
    transcode_error?: string;
  }

  export interface AssetDetail extends AssetItem {
    source_bucket: string;
    source_key: string;
    play_key: string;
    transcode_job_id: string;
    transcode_error: string;
    remark: string;
    intro: string;
    chapters?: ComicChapter[];
    episodes?: DramaEpisode[];
  }

  export interface DramaImportLimits {
    max_zip_bytes: number;
    max_body_bytes?: number;
    max_chunk_bytes?: number;
    max_parts?: number;
    max_extract_bytes: number;
    max_files: number;
    max_file_bytes: number;
    max_ratio: number;
    min_free_bytes: number;
    import_timeout_sec?: number;
    job_timeout_sec?: number;
    max_running_jobs?: number;
  }

  export interface ImportDramasData {
    job_id?: string;
    imported: number;
    failed_count: number;
    list: {
      id: string;
      title: string;
      chapter_count: number;
      appended?: boolean;
      skipped_count?: number;
      imported_count?: number;
    }[];
    failed: { title: string; error: string }[];
  }

  export interface DramaUploadPart {
    n: number;
    offset: number;
    size: number;
    done: boolean;
    mode: string;
    url?: string;
  }

  export interface DramaUploadSession {
    id: string;
    filename: string;
    total_size: number;
    chunk_size: number;
    part_count: number;
    status: string;
    expires_at: string;
    job_id?: string;
    parts: DramaUploadPart[];
  }

  export interface DramaImportJobDrama {
    id: string;
    title: string;
    chapter_count: number;
    appended?: boolean;
    skipped_count?: number;
    imported_count?: number;
    ready_count?: number;
    processing_count?: number;
    failed_count?: number;
  }

  export interface DramaImportJob {
    id: string;
    upload_id: string;
    status: string;
    stage: string;
    progress: number;
    message: string;
    error: string;
    attempts: number;
    max_attempts: number;
    imported: number;
    failed_count: number;
    list: DramaImportJobDrama[];
    failed: { title: string; error: string }[];
    episode_total: number;
    episode_ready: number;
    episode_processing: number;
    episode_failed: number;
    created_at: string;
    updated_at: string;
    finished_at?: string;
  }

  export interface ImportComicsData {
    imported: number;
    failed_count: number;
    list: {
      id: string;
      title: string;
      category: string;
      chapter_count: number;
      page_count?: number;
      word_count?: number;
      appended?: boolean;
      skipped_count?: number;
    }[];
    failed: { title: string; error: string }[];
  }

  export interface ListData {
    list: AssetItem[];
    total: number;
  }

  export interface UploadURLData {
    upload_url: string;
    method: string;
    bucket: string;
    key: string;
    expire_sec: number;
  }
}

export function getMediaAssetListApi(params: {
  page?: number;
  size?: number;
  keyword?: string;
  status?: number;
  kind?: number;
}) {
  return mediaClient.get<MediaApi.ListData>("/admin/assets", { params });
}

export function createMediaAssetApi(body: {
  title: string;
  cover_url?: string;
  remark?: string;
  kind?: number;
  intro?: string;
  update_status?: number;
}) {
  return mediaClient.post<{ id: string }>("/admin/assets", body);
}

export function updateMediaAssetApi(
  id: string,
  body: {
    title?: string;
    remark?: string;
    intro?: string;
    update_status?: number;
    seq?: number;
  },
) {
  return mediaClient.put<{ id: string }>(`/admin/assets/${id}`, body);
}

export function createMediaEpisodeApi(id: string, body: { seq: number; title?: string }) {
  return mediaClient.post<{ id: string; created: boolean }>(
    `/admin/assets/${id}/episodes`,
    body,
  );
}

export function getDramaImportLimitsApi() {
  return mediaClient.get<MediaApi.DramaImportLimits>("/admin/dramas/import-limits");
}

export function getMediaAssetDetailApi(id: string) {
  return mediaClient.get<MediaApi.AssetDetail>(`/admin/assets/${id}`);
}

export function getMediaUploadUrlApi(id: string, filename: string) {
  return mediaClient.post<MediaApi.UploadURLData>(
    `/admin/assets/${id}/upload-url`,
    { filename },
  );
}

export function triggerMediaTranscodeApi(
  id: string,
  body?: { cover_seek_sec?: number },
) {
  return mediaClient.post<{ job_id: string }>(
    `/admin/assets/${id}/transcode`,
    { cover_seek_sec: body?.cover_seek_sec ?? 8 },
  );
}

export function deleteMediaAssetApi(id: string) {
  return mediaClient.delete<{ deleted_objects: number }>(`/admin/assets/${id}`);
}

export function deleteMediaComicChapterApi(id: string, seq: number) {
  return mediaClient.delete<{ deleted_objects: number; chapter_count: number }>(
    `/admin/assets/${id}/chapters/${seq}`,
  );
}

export function createMediaNovelChapterApi(
  id: string,
  body: { seq?: number; title: string; content: string },
) {
  return mediaClient.post<{
    seq: number;
    word_count: number;
    chapter_count: number;
  }>(`/admin/assets/${id}/novel-chapters`, body);
}

export function updateMediaNovelChapterApi(
  id: string,
  seq: number,
  body: { title: string; content: string },
) {
  return mediaClient.put<{
    seq: number;
    word_count: number;
    chapter_count: number;
  }>(`/admin/assets/${id}/novel-chapters/${seq}`, body);
}

/** 覆盖 MinIO 同路径 cover.jpg，不触发转码。 */
export async function replaceMediaCoverApi(id: string, file: File) {
  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("封面不能超过 8MB");
  }
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${mediaBaseURL}/admin/assets/${id}/cover`, {
    method: "POST",
    headers: { "X-Admin-Token": mediaAdminToken },
    body: fd,
  });
  const text = await res.text();
  let json: {
    code: number;
    message?: string;
    data: { cover_url: string };
  };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(text?.slice(0, 120) || `替换封面失败 HTTP ${res.status}`);
  }
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || `替换封面失败 HTTP ${res.status}`);
  }
  return json.data;
}

/** 直传 MinIO（预签名 PUT）。勿加未签名的 Content-Type，否则签名失效。 */
export async function putMediaFile(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
  });
  if (!res.ok) {
    throw new Error(`上传失败 HTTP ${res.status}`);
  }
}

export async function importComicsZipApi(file: File, resume = false) {
  const maxBytes = 2 * 1024 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("压缩包不能超过 2GB");
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("resume", resume ? "1" : "0");
  const res = await fetch(`${mediaBaseURL}/admin/comics/import`, {
    method: "POST",
    headers: { "X-Admin-Token": mediaAdminToken },
    body: fd,
  });
  const text = await res.text();
  let json: {
    code: number;
    message?: string;
    data: MediaApi.ImportComicsData;
  };
  try {
    json = JSON.parse(text);
  } catch {
    if (/body too large|ParseMultipartForm/i.test(text)) {
      throw new Error("压缩包太大，单包不能超过 2GB");
    }
    throw new Error(text?.slice(0, 120) || `导入失败 HTTP ${res.status}`);
  }
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || `导入失败 HTTP ${res.status}`);
  }
  return json.data;
}

export async function importNovelZipApi(file: File, resume = false) {
  const maxBytes = 200 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("压缩包不能超过 200MB");
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("resume", resume ? "1" : "0");
  const res = await fetch(`${mediaBaseURL}/admin/novels/import`, {
    method: "POST",
    headers: { "X-Admin-Token": mediaAdminToken },
    body: fd,
  });
  const text = await res.text();
  let json: {
    code: number;
    message?: string;
    data: MediaApi.ImportComicsData;
  };
  try {
    json = JSON.parse(text);
  } catch {
    if (/body too large|ParseMultipartForm/i.test(text)) {
      throw new Error("压缩包太大，单包不能超过 200MB");
    }
    throw new Error(text?.slice(0, 120) || `导入失败 HTTP ${res.status}`);
  }
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || `导入失败 HTTP ${res.status}`);
  }
  return json.data;
}

function formatBytesShort(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

async function fetchMediaJSON<T>(
  input: string,
  init: RequestInit,
  timeoutSec: number,
  timeoutMsg: string,
): Promise<T> {
  const ac = new AbortController();
  const timer = window.setTimeout(() => ac.abort(), (timeoutSec > 0 ? timeoutSec : 600) * 1000);
  let res: Response | undefined;
  let text = "";
  try {
    res = await fetch(input, { ...init, signal: ac.signal });
    text = await res.text();
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(timeoutMsg);
    }
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
  const tooLarge =
    (res && res.status === 413) ||
    /body too large|ParseMultipartForm|entity too large|request entity too large/i.test(text);
  if (tooLarge) {
    throw new Error("上传被拒绝：请求体超过允许上限。请检查分片大小后重试。");
  }
  let json: { code: number; message?: string; data: T } | undefined;
  try {
    json = JSON.parse(text);
  } catch {
    if (res && (res.status === 504 || res.status === 408)) {
      throw new Error(timeoutMsg);
    }
    throw new Error(text?.slice(0, 120) || `请求失败 HTTP ${res?.status ?? 0}`);
  }
  // 先判定结构化成功，避免标题等字段命中 timeout 字样
  if (json && res && res.ok && json.code === 0) {
    return json.data;
  }
  if (res && (res.status === 504 || res.status === 408)) {
    throw new Error(timeoutMsg);
  }
  throw new Error(json?.message || `请求失败 HTTP ${res?.status ?? 0}`);
}

export function createDramaUploadApi(body: { filename: string; total_size: number }) {
  return mediaClient.post<MediaApi.DramaUploadSession>("/admin/dramas/uploads", body);
}

export function getDramaUploadApi(id: string) {
  return mediaClient.get<MediaApi.DramaUploadSession>(`/admin/dramas/uploads/${id}`);
}

export function completeDramaUploadApi(
  id: string,
  body: { plan?: unknown; target_id?: string },
) {
  return mediaClient.post<{ upload_id: string; job_id: string; status: string }>(
    `/admin/dramas/uploads/${id}/complete`,
    body,
  );
}

export function abortDramaUploadApi(id: string) {
  return mediaClient.post<{ id: string; deleted: number }>(
    `/admin/dramas/uploads/${id}/abort`,
    {},
  );
}

export function getDramaImportJobApi(id: string) {
  return mediaClient.get<MediaApi.DramaImportJob>(`/admin/dramas/import-jobs/${id}`);
}

export function retryDramaImportJobApi(id: string) {
  return mediaClient.post<MediaApi.DramaImportJob>(
    `/admin/dramas/import-jobs/${id}/retry`,
    {},
  );
}

export async function putDramaUploadPartApi(
  id: string,
  n: number,
  blob: Blob,
  timeoutSec = 600,
) {
  return fetchMediaJSON(
    `${mediaBaseURL}/admin/dramas/uploads/${id}/parts/${n}`,
    {
      method: "PUT",
      headers: { "X-Admin-Token": mediaAdminToken },
      body: blob,
    },
    timeoutSec,
    `分片上传超时（超过 ${timeoutSec} 秒），结果可能部分完成，请刷新核对后再决定重试`,
  );
}

export async function putMediaFileWithTimeout(
  uploadUrl: string,
  file: Blob,
  timeoutSec = 600,
) {
  const ac = new AbortController();
  const timer = window.setTimeout(() => ac.abort(), (timeoutSec > 0 ? timeoutSec : 600) * 1000);
  try {
    const res = await fetch(uploadUrl, { method: "PUT", body: file, signal: ac.signal });
    if (!res.ok) {
      throw new Error(`上传失败 HTTP ${res.status}`);
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(
        `分片上传超时（超过 ${timeoutSec} 秒），结果可能部分完成，请刷新核对后再决定重试`,
      );
    }
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function uploadDramaZipAndEnqueue(
  file: File,
  opts: {
    plan?: unknown;
    targetId?: string;
    limits?: MediaApi.DramaImportLimits;
    sessionId?: string;
    onProgress?: (p: { uploadedBytes: number; total: number; phase: "upload" | "complete" }) => void;
  },
): Promise<{ upload_id: string; job_id: string; status: string; session_id: string }> {
  const maxBytes = opts.limits?.max_zip_bytes ?? 8 * 1024 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`压缩包不能超过 ${formatBytesShort(maxBytes)}`);
  }
  const timeoutSec = opts.limits?.import_timeout_sec && opts.limits.import_timeout_sec > 0
    ? opts.limits.import_timeout_sec
    : 600;
  let sessionId = opts.sessionId || "";
  if (!sessionId) {
    const created = await createDramaUploadApi({ filename: file.name, total_size: file.size });
    sessionId = created.id;
  }
  const sess = await getDramaUploadApi(sessionId);
  let uploaded = 0;
  for (const part of sess.parts || []) {
    if (part.done) {
      uploaded += part.size;
      opts.onProgress?.({ uploadedBytes: uploaded, total: file.size, phase: "upload" });
      continue;
    }
    const blob = file.slice(part.offset, part.offset + part.size);
    if (part.mode === "presign" && part.url) {
      await putMediaFileWithTimeout(part.url, blob, timeoutSec);
    } else {
      await putDramaUploadPartApi(sess.id, part.n, blob, timeoutSec);
    }
    uploaded += part.size;
    opts.onProgress?.({ uploadedBytes: uploaded, total: file.size, phase: "upload" });
  }
  opts.onProgress?.({ uploadedBytes: file.size, total: file.size, phase: "complete" });
  const done = await completeDramaUploadApi(sess.id, {
    plan: opts.plan,
    target_id: opts.targetId,
  });
  return { ...done, session_id: sess.id };
}

export function mediaApiConfigured() {
  return Boolean(mediaAdminToken);
}
