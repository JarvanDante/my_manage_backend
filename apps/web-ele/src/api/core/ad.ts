import type { RequestClientOptions } from "@vben/request";

import { defaultResponseInterceptor, RequestClient } from "@vben/request";

import { ElMessage } from "element-plus";

/** 广告中台 my_ad（与总后台 manage API 分离） */
const adBaseURL = (import.meta.env.VITE_AD_API_URL as string) || "/ad-api";
const adAdminToken = (import.meta.env.VITE_AD_ADMIN_TOKEN as string) || "";

function createAdClient(options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL: adBaseURL,
  });

  client.addRequestInterceptor({
    fulfilled(config) {
      config.headers["X-Admin-Token"] = adAdminToken;
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
        data?.message || data?.msg || error?.message || "广告服务请求失败";
      ElMessage.error(msg);
      return Promise.reject(error);
    },
  });

  return client;
}

const adClient = createAdClient({ responseReturn: "data" });

export namespace AdApi {
  export interface SlotItem {
    id: number;
    code: string;
    name: string;
    slot_type: string;
    width: number;
    height: number;
    status: number;
    remark: string;
    created_at: string;
    updated_at: string;
  }

  export interface CreativeItem {
    id: string;
    title: string;
    media_url: string;
    link_url: string;
    storage_object_id: string;
    status: number;
    remark: string;
    created_at: string;
    updated_at: string;
  }

  export interface CampaignItem {
    id: string;
    name: string;
    slot_id: number;
    creative_id: string;
    site_code: string;
    priority: number;
    weight: number;
    status: number;
    start_at: string;
    end_at: string;
    remark: string;
    created_at: string;
    updated_at: string;
  }

  export interface ListData<T> {
    list: T[];
    total: number;
  }
}

export function adApiConfigured() {
  return Boolean(adAdminToken);
}

// ---- slots ----

export function getAdSlotListApi(params: {
  page?: number;
  size?: number;
  keyword?: string;
  status?: number;
}) {
  return adClient.get<AdApi.ListData<AdApi.SlotItem>>("/admin/slots", {
    params,
  });
}

export function createAdSlotApi(body: {
  code: string;
  name: string;
  slot_type?: string;
  width?: number;
  height?: number;
  status?: number;
  remark?: string;
}) {
  return adClient.post<{ id: number; code: string }>("/admin/slots", body);
}

export function updateAdSlotApi(
  id: number,
  body: {
    name: string;
    slot_type?: string;
    width?: number;
    height?: number;
    status?: number;
    remark?: string;
  },
) {
  return adClient.put<{ id: number }>(`/admin/slots/${id}`, body);
}

export function deleteAdSlotApi(id: number) {
  return adClient.delete<{ id: number; status: number }>(`/admin/slots/${id}`);
}

// ---- creatives ----

export function getAdCreativeListApi(params: {
  page?: number;
  size?: number;
  keyword?: string;
  status?: number;
}) {
  return adClient.get<AdApi.ListData<AdApi.CreativeItem>>("/admin/creatives", {
    params,
  });
}

export function createAdCreativeApi(body: {
  title: string;
  media_url: string;
  link_url?: string;
  storage_object_id?: string;
  status?: number;
  remark?: string;
}) {
  return adClient.post<{ id: string }>("/admin/creatives", body);
}

export function updateAdCreativeApi(
  id: string,
  body: {
    title: string;
    media_url: string;
    link_url?: string;
    storage_object_id?: string;
    status?: number;
    remark?: string;
  },
) {
  return adClient.put<{ id: string }>(`/admin/creatives/${id}`, body);
}

export function deleteAdCreativeApi(id: string) {
  return adClient.delete<{ id: string; status: number }>(
    `/admin/creatives/${id}`,
  );
}

// ---- campaigns ----

export function getAdCampaignListApi(params: {
  page?: number;
  size?: number;
  keyword?: string;
  site_code?: string;
  slot_id?: number;
  status?: number;
}) {
  return adClient.get<AdApi.ListData<AdApi.CampaignItem>>("/admin/campaigns", {
    params,
  });
}

export function createAdCampaignApi(body: {
  name: string;
  slot_id: number;
  creative_id: string;
  site_code?: string;
  priority?: number;
  weight?: number;
  status?: number;
  start_at?: string;
  end_at?: string;
  remark?: string;
}) {
  return adClient.post<{ id: string }>("/admin/campaigns", body);
}

export function updateAdCampaignApi(
  id: string,
  body: {
    name: string;
    slot_id: number;
    creative_id: string;
    site_code?: string;
    priority?: number;
    weight?: number;
    status?: number;
    start_at?: string;
    end_at?: string;
    remark?: string;
  },
) {
  return adClient.put<{ id: string }>(`/admin/campaigns/${id}`, body);
}

export function setAdCampaignStatusApi(id: string, status: number) {
  return adClient.post<{ id: string; status: number }>(
    `/admin/campaigns/${id}/status`,
    { status },
  );
}
