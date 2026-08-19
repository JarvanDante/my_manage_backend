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
    kind: number;
    category: string;
    chapter_count: number;
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
    pages: ComicPage[];
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
  }

  export interface ImportComicsData {
    imported: number;
    failed_count: number;
    list: {
      id: string;
      title: string;
      category: string;
      chapter_count: number;
      page_count: number;
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
}) {
  return mediaClient.post<{ id: string }>("/admin/assets", body);
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

export async function importComicsZipApi(file: File) {
  const maxBytes = 2 * 1024 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("压缩包不能超过 2GB");
  }
  const fd = new FormData();
  fd.append("file", file);
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

export function mediaApiConfigured() {
  return Boolean(mediaAdminToken);
}
