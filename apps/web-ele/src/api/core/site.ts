import { requestClient } from "#/api/request";

export namespace SiteApi {
  export interface DomainItem {
    id: number;
    domain: string;
    is_main: number;
    https: number;
    status: number;
  }

  export interface SiteItem {
    id: number;
    merchant_id: number;
    merchant_name: string;
    site_code: string;
    name: string;
    env: string;
    status: number; // 0筹备 1上线 2停用
    db_host: string;
    db_port: number;
    db_name: string;
    db_user: string;
    db_pass: string; // 永远 ******
    app_key: string; // PaaS APPKEY; secret 不在列表/详情返回
    remark: string;
    created_at: string;
  }

  export interface CreateResult {
    id: number;
    app_key: string;
    app_secret: string;
  }

  export interface AppCredentials {
    app_key: string;
    app_secret: string;
  }

  export interface SiteDetail extends SiteItem {
    domains: DomainItem[];
  }

  export interface ListParams {
    keyword?: string;
    merchant_id?: number;
    env?: string;
    status?: number; // -1全部
    page?: number;
    size?: number;
  }

  export interface ListData {
    list: SiteItem[];
    total: number;
    page: number;
    size: number;
  }

  export interface SaveParams {
    id?: number;
    merchant_id: number;
    site_code?: string;
    name: string;
    env: string;
    db_host: string;
    db_port: number;
    db_name: string;
    db_user: string;
    db_pass?: string;
    remark?: string;
  }

  export interface DbCheckData {
    ok: boolean;
    latency_ms: number;
    message: string;
  }

  export interface ProvisionItem {
    key: string;
    name: string;
    ok: boolean;
    detail: string;
  }

  export interface ProvisionData {
    all_passed: boolean;
    items: ProvisionItem[];
  }
}

export async function getSiteListApi(params: SiteApi.ListParams) {
  return requestClient.get<SiteApi.ListData>("/sites", { params });
}

export async function getSiteDetailApi(id: number) {
  return requestClient.get<SiteApi.SiteDetail>(`/sites/${id}`);
}

export async function createSiteApi(params: SiteApi.SaveParams) {
  return requestClient.post<SiteApi.CreateResult>("/sites", params);
}

export async function revealSiteSecretApi(id: number) {
  return requestClient.get<SiteApi.AppCredentials>(`/sites/${id}/app-secret`);
}

export async function resetSiteSecretApi(id: number) {
  return requestClient.post<SiteApi.AppCredentials>(`/sites/${id}/reset-secret`);
}

export async function updateSiteApi(params: SiteApi.SaveParams) {
  return requestClient.put(`/sites/${params.id}`, params);
}

export async function setSiteStatusApi(id: number, status: number) {
  return requestClient.post(`/sites/${id}/status`, { id, status });
}

export async function dbCheckApi(id: number) {
  return requestClient.post<SiteApi.DbCheckData>(`/sites/${id}/db-check`);
}

export async function provisionCheckApi(id: number) {
  return requestClient.post<SiteApi.ProvisionData>(`/sites/${id}/provision-check`);
}

// ---------- 域名 ----------

export async function bindDomainApi(siteId: number, domain: string, https: number) {
  return requestClient.post<{ domain_id: number }>(`/sites/${siteId}/domains`, {
    id: siteId,
    domain,
    https,
  });
}

export async function unbindDomainApi(siteId: number, domainId: number) {
  return requestClient.delete(`/sites/${siteId}/domains/${domainId}`);
}

export async function setMainDomainApi(siteId: number, domainId: number) {
  return requestClient.post(`/sites/${siteId}/domains/${domainId}/main`);
}
