<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import { getSiteListApi, type SiteApi } from "#/api/core/site";

import AccessDocs from "./components/AccessDocs.vue";

defineOptions({ name: "TppCenter" });

const router = useRouter();
const loading = ref(false);
const sites = ref<SiteApi.SiteItem[]>([]);

async function loadSites() {
  loading.value = true;
  try {
    const res = await getSiteListApi({ page: 1, size: 8, status: -1 });
    sites.value = res.list || [];
  } catch {
    sites.value = [];
  } finally {
    loading.value = false;
  }
}

function goSites() {
  void router.push("/site");
}

function goSiteDetail(id: number) {
  void router.push({ path: "/site/detail", query: { id } });
}

function statusLabel(status: number) {
  if (status === 1) return "上线";
  if (status === 2) return "停用";
  return "筹备";
}

function statusType(status: number): "success" | "info" | "warning" {
  if (status === 1) return "success";
  if (status === 2) return "info";
  return "warning";
}

onMounted(() => {
  void loadSites();
});
</script>

<template>
  <div class="center-page">
    <header class="center-page__head">
      <div>
        <h2 class="center-page__title">接入中心</h2>
        <p class="center-page__sub">
          上半开通凭证，下半对接文档。视频走媒资、图片走统一存储，两边并列互不强制依赖。
        </p>
      </div>
    </header>

    <!-- 上半：开通 -->
    <ElCard shadow="never" class="center-card">
      <template #header>
        <div class="center-card__header">
          <div>
            <div class="center-card__title">开通 / 凭证</div>
            <div class="center-card__hint">
              一把 APPKEY 可调用多个 PaaS；密钥在站点详情查看 / 重置
            </div>
          </div>
          <ElButton type="primary" @click="goSites">去站点管理</ElButton>
        </div>
      </template>

      <ElAlert
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
        title="开通流程"
      >
        创建站点自动发放 APPKEY / APPSECRET → 详情可查看与重置 → 发布配置注入 Nacos
        paas 段 → 同步到媒资中心、统一存储的调用方凭证。
      </ElAlert>

      <ElTable v-loading="loading" :data="sites" stripe border size="small">
        <ElTableColumn prop="site_code" label="站点" width="120" />
        <ElTableColumn
          prop="name"
          label="名称"
          min-width="140"
          show-overflow-tooltip
        />
        <ElTableColumn prop="env" label="环境" width="80" />
        <ElTableColumn label="状态" width="90">
          <template #default="{ row }">
            <ElTag :type="statusType(row.status)" size="small" effect="plain">
              {{ statusLabel(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="APPKEY" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.app_key" class="mono">{{ row.app_key }}</span>
            <span v-else class="dim">未生成</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="goSiteDetail(row.id)">
              凭证
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <p class="foot-hint">仅展示最近站点；完整列表与创建请在「站点管理」操作。</p>
    </ElCard>

    <!-- 下半：文档 -->
    <ElCard shadow="never" class="center-card">
      <template #header>
        <div>
          <div class="center-card__title">接入文档</div>
          <div class="center-card__hint">
            鉴权、环境、接口清单与对接示例（页内 Tab）
          </div>
        </div>
      </template>
      <AccessDocs />
    </ElCard>
  </div>
</template>

<style scoped>
.center-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.center-page__head {
  padding: 4px 2px 0;
}

.center-page__title {
  margin: 0;
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.center-page__sub {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.center-card {
  border-radius: 12px;
}

.center-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.center-card__title {
  color: #111827;
  font-size: 15px;
  font-weight: 650;
}

.center-card__hint {
  margin-top: 2px;
  color: #9ca3af;
  font-size: 12px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.dim {
  color: #9ca3af;
  font-size: 12px;
}

.foot-hint {
  margin: 10px 0 0;
  color: #9ca3af;
  font-size: 12px;
}
</style>
