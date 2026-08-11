<script lang="ts" setup>
import { onMounted, ref } from "vue";

import {
  ElButton,
  ElDrawer,
  ElEmpty,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  getSvcConfigApi,
  getSvcConfigHistoryApi,
  publishSvcConfigApi,
  rollbackSvcConfigApi,
  type SvcConfigApi,
} from "#/api/core/svcconfig";

const props = defineProps<{ service: string }>();

const env = ref("dev");
const loading = ref(false);
const publishing = ref(false);
const content = ref(""); // 左侧可编辑原文
const current = ref<SvcConfigApi.CurrentData | null>(null);
const remark = ref("");

async function loadCurrent() {
  loading.value = true;
  try {
    const res = await getSvcConfigApi(props.service, env.value);
    current.value = res;
    // 首次载入用当前 Nacos 内容预填编辑器(在原地改)
    content.value = res.content || "";
  } finally {
    loading.value = false;
  }
}

async function handlePublish() {
  if (!content.value.trim()) {
    ElMessage.warning("配置内容不能为空");
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认把当前编辑内容发布到 Nacos(${current.value?.data_id} @ ${env.value})? 服务下次重启/热更新即读取新配置。`,
      "发布配置",
      { type: "warning", confirmButtonText: "确认发布", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  publishing.value = true;
  try {
    const res = await publishSvcConfigApi(
      props.service,
      env.value,
      content.value,
      remark.value,
    );
    ElMessage.success(`已发布 v${res.version}`);
    remark.value = "";
    loadCurrent();
  } finally {
    publishing.value = false;
  }
}

// ---- 历史 / 回滚 ----
const drawer = ref(false);
const hisLoading = ref(false);
const history = ref<SvcConfigApi.HistoryItem[]>([]);
const viewItem = ref<SvcConfigApi.HistoryItem | null>(null);

async function openHistory() {
  drawer.value = true;
  hisLoading.value = true;
  try {
    const res = await getSvcConfigHistoryApi(props.service, env.value, 1, 50);
    history.value = res.list || [];
  } finally {
    hisLoading.value = false;
  }
}

async function doRollback(row: SvcConfigApi.HistoryItem) {
  try {
    await ElMessageBox.confirm(
      `回滚到 v${row.version}? 会把该版本原文重新发布为一个新版本。`,
      "回滚",
      { type: "warning", confirmButtonText: "确认回滚", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  await rollbackSvcConfigApi(props.service, env.value, row.version);
  ElMessage.success(`已回滚 v${row.version}`);
  drawer.value = false;
  loadCurrent();
}

onMounted(loadCurrent);
</script>

<template>
  <div>
    <div class="mb-3 flex items-center gap-2">
      <span class="text-sm text-gray-500">环境</span>
      <ElSelect v-model="env" style="width: 120px" @change="loadCurrent">
        <ElOption label="dev" value="dev" />
        <ElOption label="test" value="test" />
        <ElOption label="prod" value="prod" />
      </ElSelect>
      <span v-if="current" class="text-muted-foreground text-xs">
        发布目标: {{ current.data_id }} @ {{ current.env }}(namespace:
        {{ current.namespace_id }}, group: {{ current.group }})
        <ElTag
          :type="current.exists ? 'success' : 'info'"
          size="small"
          class="ml-1"
        >
          {{ current.exists ? "已存在" : "未发布" }}
        </ElTag>
      </span>
      <div class="flex-1"></div>
      <ElButton @click="openHistory">历史版本</ElButton>
      <ElButton @click="loadCurrent">刷新</ElButton>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <div class="mb-1 text-sm font-medium">
          编辑配置(YAML)
          <span class="text-muted-foreground text-xs">
            — 原样发布, 不注入任何内容; 含密钥请谨慎(仅超管可见)
          </span>
        </div>
        <ElInput
          v-model="content"
          type="textarea"
          :rows="22"
          :input-style="{ fontFamily: 'monospace', fontSize: '12px' }"
          placeholder="在此粘贴/编辑该服务的 YAML 配置"
        />
        <div class="mt-2 flex items-center gap-2">
          <ElInput
            v-model="remark"
            placeholder="发布备注(可选, 如 调大限流阈值)"
            style="flex: 1"
          />
          <ElButton type="primary" :loading="publishing" @click="handlePublish">
            发布到 Nacos
          </ElButton>
        </div>
      </div>

      <div>
        <div class="mb-1 text-sm font-medium">当前 Nacos 配置</div>
        <div
          v-loading="loading"
          class="config-view"
        >
          <pre v-if="current?.content">{{ current.content }}</pre>
          <ElEmpty v-else description="该环境尚未发布配置" :image-size="80" />
        </div>
      </div>
    </div>

    <!-- 历史版本抽屉 -->
    <ElDrawer v-model="drawer" title="发布历史" size="60%">
      <ElTable v-loading="hisLoading" :data="history" border stripe height="70vh">
        <ElTableColumn prop="version" label="版本" width="70">
          <template #default="{ row }">v{{ row.version }}</template>
        </ElTableColumn>
        <ElTableColumn prop="env" label="环境" width="70" />
        <ElTableColumn prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <ElTableColumn prop="operator" label="操作人ID" width="90" />
        <ElTableColumn prop="created_at" label="时间" width="170" />
        <ElTableColumn label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="viewItem = row">查看</ElButton>
            <ElButton link type="warning" @click="doRollback(row)">回滚</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="viewItem" class="mt-3">
        <div class="mb-1 text-sm font-medium">v{{ viewItem.version }} 内容</div>
        <div class="config-view"><pre>{{ viewItem.content }}</pre></div>
      </div>
    </ElDrawer>
  </div>
</template>

<style scoped>
.config-view {
  height: 480px;
  overflow: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 8px 10px;
  background: var(--el-fill-color-light);
}
.config-view pre {
  margin: 0;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
