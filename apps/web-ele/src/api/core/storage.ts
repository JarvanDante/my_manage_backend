import type { RequestClientOptions } from "@vben/request";

import {
  defaultResponseInterceptor,
  RequestClient,
} from "@vben/request";

import { ElMessage } from "element-plus";

/** 统一存储 my_storage（与总后台 manage API 分离） */
const storageBaseURL =
  (import.meta.env.VITE_STORAGE_API_URL as string) || "/storage-api";
const storageAdminToken =
  (import.meta.env.VITE_STORAGE_ADMIN_TOKEN as string) || "";

function createStorageClient(options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL: storageBaseURL,
  });

  client.addRequestInterceptor({
    fulfilled(config) {
      config.headers["X-Admin-Token"] = storageAdminToken;
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
        data?.message || data?.msg || error?.message || "存储服务请求失败";
      ElMessage.error(msg);
      return Promise.reject(error);
    },
  });

  return client;
}

const storageClient = createStorageClient({ responseReturn: "data" });

export namespace StorageApi {
  export interface ObjectItem {
    id: string;
    app_key: string;
    site_code: string;
    biz: string;
    filename: string;
    content_type: string;
    size_bytes: number;
    public_url: string;
    status: number;
    remark: string;
    created_at: string;
  }

  export interface ObjectDetail extends ObjectItem {
    bucket: string;
    object_key: string;
  }

  export interface ListData {
    list: ObjectItem[];
    total: number;
  }

  export interface CreateData {
    id: string;
    upload_url: string;
    method: string;
    bucket: string;
    key: string;
    expire_sec: number;
    public_url: string;
    content_type: string;
  }

  export interface DownloadURLData {
    download_url: string;
    method: string;
    expire_sec: number;
    public_url: string;
  }

  export interface QuotaData {
    app_key: string;
    max_bytes: number;
    used_bytes: number;
    max_files: number;
    used_files: number;
  }
}

export function getStorageObjectListApi(params: {
  page?: number;
  size?: number;
  keyword?: string;
  app_key?: string;
  site_code?: string;
  biz?: string;
  status?: number;
}) {
  return storageClient.get<StorageApi.ListData>("/admin/objects", { params });
}

export function createStorageObjectApi(body: {
  app_key?: string;
  site_code: string;
  biz?: string;
  filename: string;
  content_type?: string;
  size_bytes?: number;
  remark?: string;
}) {
  return storageClient.post<StorageApi.CreateData>("/admin/objects", body);
}

/** 总后台推荐：服务端代传到 MinIO，避免浏览器预签名 SignatureDoesNotMatch */
export function uploadStorageObjectApi(body: {
  file: File;
  site_code: string;
  app_key?: string;
  biz?: string;
  remark?: string;
}) {
  return storageClient.upload<{
    id: string;
    status: number;
    size_bytes: number;
    public_url: string;
    filename: string;
  }>(
    "/admin/objects/upload",
    {
      file: body.file,
      site_code: body.site_code,
      app_key: body.app_key,
      biz: body.biz,
      remark: body.remark,
    },
    { timeout: 120_000 },
  );
}

export function getStorageObjectDetailApi(id: string) {
  return storageClient.get<StorageApi.ObjectDetail>(`/admin/objects/${id}`);
}

export function confirmStorageObjectApi(id: string) {
  return storageClient.post<{
    id: string;
    status: number;
    size_bytes: number;
    public_url: string;
  }>(`/admin/objects/${id}/confirm`);
}

export function getStorageDownloadUrlApi(id: string) {
  return storageClient.post<StorageApi.DownloadURLData>(
    `/admin/objects/${id}/download-url`,
  );
}

export function deleteStorageObjectApi(id: string) {
  return storageClient.delete<{ id: string }>(`/admin/objects/${id}`);
}

export function getStorageQuotaApi(appKey: string) {
  return storageClient.get<StorageApi.QuotaData>("/admin/quota", {
    params: { app_key: appKey },
  });
}

/**
 * 浏览器直传 MinIO（预签名 PUT）。
 * 用 ArrayBuffer，不要带 Content-Type（预签名未签该头，带了会 SignatureDoesNotMatch）。
 */
export async function putStorageFile(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: await file.arrayBuffer(),
  });
  if (!res.ok) {
    const hint = await res.text().catch(() => "");
    throw new Error(
      `上传失败 HTTP ${res.status}${hint ? `: ${hint.slice(0, 200)}` : ""}`,
    );
  }
}

export function storageApiConfigured() {
  return Boolean(storageAdminToken);
}

export function formatBytes(n: number) {
  if (!n || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function fileExt(filename: string) {
  const name = (filename || "").trim();
  const i = name.lastIndexOf(".");
  if (i < 0 || i === name.length - 1) return "";
  return name.slice(i + 1).toLowerCase();
}

/** 展示用格式，优先扩展名 */
export function formatLabel(filename: string, contentType?: string) {
  const ext = fileExt(filename);
  if (ext) return ext.toUpperCase();
  const ct = (contentType || "").trim();
  if (ct.includes("/")) {
    const sub = ct.split("/")[1] || "";
    return (sub.split(";")[0] || ct).toUpperCase();
  }
  return ct || "-";
}

export function isImageObject(filename: string, contentType?: string) {
  const ct = (contentType || "").toLowerCase();
  if (ct.startsWith("image/")) return true;
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
    fileExt(filename),
  );
}
