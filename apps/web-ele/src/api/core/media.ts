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

export namespace MediaApi {
  export interface AssetItem {
    id: string; // 对外短码(新 16 位，历史可能 8 位)
    title: string;
    cover_url: string;
    status: number;
    transcode_status: string;
    play_url: string;
    duration_sec: number;
    created_at: string;
  }

  export interface AssetDetail extends AssetItem {
    source_bucket: string;
    source_key: string;
    play_key: string;
    transcode_job_id: string;
    transcode_error: string;
    remark: string;
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

export function mediaApiConfigured() {
  return Boolean(mediaAdminToken);
}
