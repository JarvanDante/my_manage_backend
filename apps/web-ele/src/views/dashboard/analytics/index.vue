<script lang="ts" setup>
import { onMounted, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  getOverviewApi,
  getSiteHealthApi,
  type MonitorApi,
} from "#/api/core/monitor";

defineOptions({ name: "Analytics" });

const loading = ref(false);
const data = ref<MonitorApi.OverviewData | null>(null);
const healthLoading = ref<Record<number, boolean>>({});

async function fetchOverview() {
  loading.value = true;
  try {
    data.value = await getOverviewApi();
  } finally {
    loading.value = false;
  }
}

async function handleHealth(row: MonitorApi.SiteOverviewItem) {
  healthLoading.value[row.site_id] = true;
  try {
    const h = await getSiteHealthApi(row.site_id);
    if (h.db_ok) {
      ElMessage.success(
        `${h.site_code}: DB 正常 ${h.latency_ms}ms, 迁移版本 v${h.goose_version}`
      );
    } else {
      ElMessage.error(`${h.site_code}: ${h.message}`);
    }
  } finally {
    healthLoading.value[row.site_id] = false;
  }
}

function cardValue(key: string) {
  const d = data.value as any;
  return d ? (d[key] ?? "-") : "-";
}

const cards = [
  { key: "site_count", label: "上线站点", unit: "个" },
  { key: "user_count", label: "用户总数", unit: "人" },
  { key: "today_new", label: "今日新增", unit: "人" },
  { key: "today_active", label: "今日活跃", unit: "人" },
  { key: "paid_amount", label: "累计充值", unit: "元" },
  { key: "paid_orders", label: "充值单数", unit: "笔" },
] as const;

onMounted(fetchOverview);
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold">跨站数据汇总</h2>
      <ElButton type="primary" :loading="loading" @click="fetchOverview">刷新</ElButton>
    </div>

    <div class="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <ElCard v-for="c in cards" :key="c.key" shadow="hover">
        <div class="text-muted-foreground text-sm">{{ c.label }}</div>
        <div class="mt-1 text-2xl font-semibold">
          {{ cardValue(c.key) }}
          <span class="text-muted-foreground text-xs">{{ c.unit }}</span>
        </div>
      </ElCard>
    </div>

    <ElCard shadow="never">
      <div class="mb-3 flex items-center gap-2">
        <span class="font-medium">分站明细</span>
        <ElTag v-if="data" size="small" type="info">
          采集成功 {{ data.ok_count }}/{{ data.site_count }}
        </ElTag>
        <span class="text-muted-foreground text-xs">(仅统计「上线」状态站点)</span>
      </div>
      <ElTable v-loading="loading" :data="data?.sites || []" border stripe>
        <ElTableColumn prop="site_code" label="site_code" width="110" />
        <ElTableColumn prop="name" label="站点名" min-width="120" />
        <ElTableColumn prop="env" label="环境" width="70" align="center" />
        <ElTableColumn label="采集" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.ok ? 'success' : 'danger'">
              {{ row.ok ? "成功" : "失败" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="user_count" label="用户数" width="90" align="right" />
        <ElTableColumn prop="today_new" label="今日新增" width="90" align="right" />
        <ElTableColumn prop="today_active" label="今日活跃" width="90" align="right" />
        <ElTableColumn prop="paid_amount" label="累计充值" width="110" align="right" />
        <ElTableColumn prop="paid_orders" label="充值单数" width="90" align="right" />
        <ElTableColumn prop="error" label="错误" min-width="140" show-overflow-tooltip />
        <ElTableColumn label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <ElButton
              link
              type="primary"
              :loading="healthLoading[row.site_id]"
              @click="handleHealth(row)"
            >
              健康检查
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="data && data.site_count === 0" class="text-muted-foreground py-6 text-center text-sm">
        暂无上线站点 —— 到「站点管理」创建站点并通过开站清单后上线
      </div>
    </ElCard>
  </div>
</template>
