import { mediaRequest } from "#/api/core/media";

/** 播放服务(my_play 网关)管理 API — 策略与统计存于 my_media */
export namespace PlayApi {
  export interface PolicyItem {
    site_code: string;
    referer_whitelist: string;
    ua_blacklist: string;
    token_ttl_sec: number;
    status: number;
    updated_at: string;
  }
  export interface StatItem {
    day: string;
    site_code: string;
    asset_code: string;
    plays: number;
    seg_reqs: number;
  }
  export interface RevokeItem {
    site_code: string;
    asset_code: string;
    not_before: number;
    updated_at: string;
  }
}

export function getPlayPolicyListApi() {
  return mediaRequest.get<{ list: PlayApi.PolicyItem[] }>("/admin/play/policies");
}

export function savePlayPolicyApi(p: {
  site_code: string;
  referer_whitelist?: string;
  ua_blacklist?: string;
  token_ttl_sec: number;
  status: number;
}) {
  return mediaRequest.put(`/admin/play/policies/${p.site_code}`, p);
}

export function getPlayStatsApi(params: {
  start: string;
  end: string;
  site_code?: string;
}) {
  return mediaRequest.get<{ list: PlayApi.StatItem[] }>("/admin/play/stats", { params });
}

export function getPlayRevokeListApi() {
  return mediaRequest.get<{ list: PlayApi.RevokeItem[] }>("/admin/play/revokes");
}

/** 一键失效: asset_code 为空表示整站现有链接全部失效 */
export function revokePlayApi(p: { site_code: string; asset_code?: string }) {
  return mediaRequest.post<{ not_before: number }>("/admin/play/revoke", p);
}
