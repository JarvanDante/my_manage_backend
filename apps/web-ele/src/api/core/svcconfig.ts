import { requestClient } from "#/api/request";

/** 平台服务配置发布(发布/历史/回滚到 Nacos, 命名空间按环境) */
export namespace SvcConfigApi {
  export interface CurrentData {
    service: string;
    binary: string;
    env: string;
    namespace_id: string;
    data_id: string;
    group: string;
    exists: boolean;
    content: string;
  }
  export interface PublishData {
    version: number;
    data_id: string;
  }
  export interface HistoryItem {
    id: number;
    version: number;
    env: string;
    content: string;
    operator: number;
    remark: string;
    created_at: string;
  }
  export interface HistoryData {
    list: HistoryItem[];
    total: number;
    page: number;
    size: number;
  }
}

export function getSvcConfigApi(service: string, env: string) {
  return requestClient.get<SvcConfigApi.CurrentData>(
    `/paas/services/${service}/config`,
    { params: { env } },
  );
}

export function publishSvcConfigApi(
  service: string,
  env: string,
  content: string,
  remark: string,
) {
  return requestClient.post<SvcConfigApi.PublishData>(
    `/paas/services/${service}/config/publish`,
    { service, env, content, remark },
  );
}

export function getSvcConfigHistoryApi(
  service: string,
  env: string,
  page = 1,
  size = 20,
) {
  return requestClient.get<SvcConfigApi.HistoryData>(
    `/paas/services/${service}/config/history`,
    { params: { env, page, size } },
  );
}

export function rollbackSvcConfigApi(
  service: string,
  env: string,
  version: number,
) {
  return requestClient.post<SvcConfigApi.PublishData>(
    `/paas/services/${service}/config/rollback`,
    { service, env, version },
  );
}
