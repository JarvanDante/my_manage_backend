<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElRadioButton,
  ElRadioGroup,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  bindDomainApi,
  dbCheckApi,
  getSiteDetailApi,
  provisionCheckApi,
  resetSiteSecretApi,
  revealSiteSecretApi,
  setMainDomainApi,
  setSiteStatusApi,
  type SiteApi,
  unbindDomainApi,
} from "#/api/core/site";
import {
  getConfigHistoryApi,
  getCurrentConfigApi,
  publishConfigApi,
  rollbackConfigApi,
  type SiteConfigApi,
} from "#/api/core/siteconfig";

defineOptions({ name: "SiteDetail" });

const route = useRoute();
const router = useRouter();
const siteId = Number(route.query.id);
const detail = ref<SiteApi.SiteDetail | null>(null);
const activeTab = ref("info");

function ensureSiteId() {
  if (!Number.isFinite(siteId) || siteId <= 0) {
    ElMessage.warning("请从站点列表进入详情");
    void router.replace("/site");
    return false;
  }
  return true;
}

const statusTag: Record<number, { label: string; type: "info" | "success" | "danger" }> = {
  0: { label: "筹备", type: "info" },
  1: { label: "上线", type: "success" },
  2: { label: "停用", type: "danger" },
};

async function fetchDetail() {
  if (!ensureSiteId()) return;
  detail.value = await getSiteDetailApi(siteId);
}

// ---------- PaaS 凭证 ----------
const secretDialogVisible = ref(false);
const secretLoading = ref(false);
const shownSecret = ref({ app_key: "", app_secret: "" });

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(`${label} 已复制`);
  } catch {
    ElMessage.error("复制失败, 请手动选择复制");
  }
}

async function openSecretDialog(res: { app_key: string; app_secret: string }) {
  shownSecret.value = { app_key: res.app_key, app_secret: res.app_secret };
  secretDialogVisible.value = true;
}

async function handleRevealSecret() {
  secretLoading.value = true;
  try {
    const res = await revealSiteSecretApi(siteId);
    await openSecretDialog(res);
  } finally {
    secretLoading.value = false;
  }
}

async function handleResetSecret() {
  const tip = detail.value?.app_key
    ? "确认重置 APPSECRET？旧密钥立即失效，调用方需同步更新配置。"
    : "该站尚无凭证，确认生成 APPKEY / APPSECRET？";
  await ElMessageBox.confirm(tip, "PaaS 凭证", { type: "warning" });
  secretLoading.value = true;
  try {
    const res = await resetSiteSecretApi(siteId);
    await openSecretDialog(res);
    await fetchDetail();
  } finally {
    secretLoading.value = false;
  }
}

// ---------- db-check ----------
const dbChecking = ref(false);
const dbResult = ref<SiteApi.DbCheckData | null>(null);
async function handleDbCheck() {
  dbChecking.value = true;
  dbResult.value = null;
  try {
    dbResult.value = await dbCheckApi(siteId);
  } finally {
    dbChecking.value = false;
  }
}

// ---------- 域名 ----------
const domainKindLabel: Record<string, string> = {
  admin: "admin",
  h5: "H5",
  app: "APP",
};
const domainKindTag: Record<string, "warning" | "success" | "primary"> = {
  admin: "warning",
  h5: "success",
  app: "primary",
};
const bindDialogVisible = ref(false);
const newDomain = ref("");
const newDomainKind = ref<SiteApi.DomainKind>("h5");
const newHttps = ref(true);
const domainLoading = ref(false);

function openBindDialog() {
  newDomain.value = "";
  newDomainKind.value = "h5";
  newHttps.value = true;
  bindDialogVisible.value = true;
}

async function handleBindDomain() {
  if (!newDomain.value) {
    ElMessage.warning("请输入域名");
    return;
  }
  domainLoading.value = true;
  try {
    await bindDomainApi(siteId, newDomain.value, newDomainKind.value, newHttps.value ? 1 : 0);
    ElMessage.success("绑定成功(首个域名自动设为主域名)");
    bindDialogVisible.value = false;
    fetchDetail();
  } finally {
    domainLoading.value = false;
  }
}
async function handleUnbind(d: SiteApi.DomainItem) {
  await ElMessageBox.confirm(`确认解绑域名 ${d.domain}?`, "提示", { type: "warning" });
  await unbindDomainApi(siteId, d.id);
  ElMessage.success("解绑成功");
  fetchDetail();
}
async function handleSetMain(d: SiteApi.DomainItem) {
  await setMainDomainApi(siteId, d.id);
  ElMessage.success("已设为主域名");
  fetchDetail();
}

// ---------- 开站清单(FM4) ----------
const provisionLoading = ref(false);
const provision = ref<SiteApi.ProvisionData | null>(null);
async function handleProvisionCheck() {
  provisionLoading.value = true;
  try {
    provision.value = await provisionCheckApi(siteId);
  } finally {
    provisionLoading.value = false;
  }
}
const canOnline = computed(
  () => provision.value?.all_passed === true && detail.value?.status !== 1
);
async function handleSetStatus(status: number) {
  const names: Record<number, string> = { 0: "筹备", 1: "上线", 2: "停用" };
  await ElMessageBox.confirm(`确认将站点置为「${names[status]}」?`, "提示", {
    type: "warning",
  });
  await setSiteStatusApi(siteId, status);
  ElMessage.success("状态已更新");
  fetchDetail();
  if (status === 1) provision.value = null;
}

// ---------- 配置发布(FM3) ----------
const current = ref<SiteConfigApi.CurrentData | null>(null);
const editContent = ref("");
const publishRemark = ref("");
const publishing = ref(false);
const historyData = ref<SiteConfigApi.HistoryItem[]>([]);
const historyTotal = ref(0);
const viewDialog = ref(false);
const viewContent = ref("");

async function loadConfigTab(syncEditor = false) {
  const [cur, his] = await Promise.all([
    getCurrentConfigApi(siteId),
    getConfigHistoryApi(siteId, 1, 20),
  ]);
  current.value = cur;
  historyData.value = his.list || [];
  historyTotal.value = his.total || 0;
  // 首次进入或发布/回滚后, 用最新历史原文同步编辑器
  if ((syncEditor || !editContent.value) && historyData.value.length > 0) {
    editContent.value = historyData.value[0]!.content;
  }
}

async function handlePublish() {
  if (!editContent.value.trim()) {
    ElMessage.warning("配置内容不能为空");
    return;
  }
  await ElMessageBox.confirm(
    `确认发布到 Nacos(${current.value?.data_id} @ ${detail.value?.env})? 将保留你的配置, 自动覆盖 database.default.link, 并注入 paas.app_key / paas.app_secret。`,
    "发布确认",
    { type: "warning" }
  );
  publishing.value = true;
  try {
    const res = await publishConfigApi(siteId, editContent.value, publishRemark.value);
    ElMessage.success(`发布成功, 版本 v${res.version}`);
    publishRemark.value = "";
    await loadConfigTab(true);
  } finally {
    publishing.value = false;
  }
}

async function handleRollback(item: SiteConfigApi.HistoryItem) {
  await ElMessageBox.confirm(
    `确认回滚到 v${item.version}? 将生成新版本并立即发布到 Nacos。`,
    "回滚确认",
    { type: "warning" }
  );
  const res = await rollbackConfigApi(siteId, item.version);
  ElMessage.success(`回滚成功, 新版本 v${res.version}`);
  await loadConfigTab(true);
}

function handleViewHistory(item: SiteConfigApi.HistoryItem) {
  viewContent.value = item.content;
  viewDialog.value = true;
}

function handleLoadToEditor(item: SiteConfigApi.HistoryItem) {
  editContent.value = item.content;
  ElMessage.success(`v${item.version} 已载入编辑器(未发布)`);
}

function onTabChange(name: string | number) {
  if (name === "config") loadConfigTab();
  if (name === "provision") handleProvisionCheck();
}

onMounted(fetchDetail);
</script>

<template>
  <div class="p-5">
    <ElCard v-if="detail" shadow="never">
      <div class="mb-4 flex items-center gap-3">
        <h2 class="text-lg font-semibold">
          {{ detail.name }}
          <span class="text-muted-foreground ml-2 text-sm">{{ detail.site_code }}</span>
        </h2>
        <ElTag :type="statusTag[detail.status]?.type">
          {{ statusTag[detail.status]?.label }}
        </ElTag>
        <ElTag type="info">{{ detail.env }}</ElTag>
        <div class="flex-1"></div>
        <ElButton v-if="detail.status !== 2" type="danger" plain @click="handleSetStatus(2)">
          停用
        </ElButton>
        <ElButton v-if="detail.status === 2" type="info" plain @click="handleSetStatus(0)">
          恢复筹备
        </ElButton>
      </div>

      <ElTabs v-model="activeTab" type="border-card" @tab-change="onTabChange">
        <!-- 基本信息 + DB -->
        <ElTabPane label="基本信息" name="info">
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem label="所属商户">
              {{ detail.merchant_name || "-" }}
              <span v-if="detail.merchant_id" class="text-muted-foreground ml-1 text-xs">
                (#{{ detail.merchant_id }})
              </span>
            </ElDescriptionsItem>
            <ElDescriptionsItem label="创建时间">{{ detail.created_at }}</ElDescriptionsItem>
            <ElDescriptionsItem label="DB 地址">
              {{ detail.db_host }}:{{ detail.db_port }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="DB 库/账号">
              {{ detail.db_name }} / {{ detail.db_user }}(密码 ******)
            </ElDescriptionsItem>
            <ElDescriptionsItem label="APPKEY">
              <span v-if="detail.app_key" class="font-mono text-sm">{{ detail.app_key }}</span>
              <span v-else class="text-muted-foreground">未生成(历史站可点下方补发)</span>
            </ElDescriptionsItem>
            <ElDescriptionsItem label="APPSECRET">
              ******
              <span class="text-muted-foreground ml-2 text-xs">默认脱敏, 可点「查看」解密回显</span>
            </ElDescriptionsItem>
            <ElDescriptionsItem label="备注" :span="2">{{ detail.remark || "-" }}</ElDescriptionsItem>
          </ElDescriptions>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <ElButton type="primary" :loading="dbChecking" @click="handleDbCheck">
              连通性校验(db-check)
            </ElButton>
            <ElButton
              v-if="detail.app_key"
              :loading="secretLoading"
              @click="handleRevealSecret"
            >
              查看 APPSECRET
            </ElButton>
            <ElButton :loading="secretLoading" @click="handleResetSecret">
              {{ detail.app_key ? "重置 APPSECRET" : "生成 PaaS 凭证" }}
            </ElButton>
            <ElTag v-if="dbResult" :type="dbResult.ok ? 'success' : 'danger'">
              {{ dbResult.ok ? `连接正常 ${dbResult.latency_ms}ms` : dbResult.message }}
            </ElTag>
          </div>
        </ElTabPane>

        <!-- 域名 -->
        <ElTabPane label="域名" name="domains">
          <div class="mb-3 flex items-center justify-end">
            <ElButton type="primary" @click="openBindDialog">绑定域名</ElButton>
          </div>
          <ElTable :data="detail.domains" border>
            <ElTableColumn prop="domain" label="域名" min-width="220" />
            <ElTableColumn label="用途" width="100" align="center">
              <template #default="{ row }">
                <ElTag v-if="row.kind" :type="domainKindTag[row.kind] || 'info'">
                  {{ domainKindLabel[row.kind] || row.kind }}
                </ElTag>
                <span v-else class="text-muted-foreground">-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="主域名" width="90" align="center">
              <template #default="{ row }">
                <ElTag v-if="row.is_main === 1" type="success">主</ElTag>
                <span v-else>-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="HTTPS" width="80" align="center">
              <template #default="{ row }">{{ row.https === 1 ? "是" : "否" }}</template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="180">
              <template #default="{ row }">
                <ElButton
                  v-if="row.is_main !== 1"
                  link
                  type="primary"
                  @click="handleSetMain(row)"
                >
                  设为主域名
                </ElButton>
                <ElButton
                  v-if="row.is_main !== 1"
                  link
                  type="danger"
                  @click="handleUnbind(row)"
                >
                  解绑
                </ElButton>
                <span v-if="row.is_main === 1" class="text-muted-foreground text-xs">
                  主域名不可解绑
                </span>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- 配置发布 FM3 -->
        <ElTabPane label="配置发布" name="config">
          <ElAlert
            v-if="current"
            type="info"
            :closable="false"
            class="mb-3"
            :title="`发布目标: ${current.data_id} @ ${current.env}(namespace: ${current.namespace_id || '未配置'}, group: ${current.group})`"
          />
          <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <div class="mb-2 flex items-center gap-2">
                <span class="font-medium">编辑配置(YAML)</span>
                <span class="text-muted-foreground text-xs">
                  原文保留; 自动覆盖 database.default.link, 并注入 paas.app_key/app_secret
                </span>
              </div>
              <ElInput
                v-model="editContent"
                type="textarea"
                :rows="18"
                spellcheck="false"
                style="font-family: monospace"
                placeholder="server:&#10;  address: ':8001'&#10;logger:&#10;  level: all"
              />
              <div class="mt-2 flex items-center gap-2">
                <ElInput
                  v-model="publishRemark"
                  placeholder="发布备注(可选)"
                  style="width: 240px"
                />
                <ElButton type="primary" :loading="publishing" @click="handlePublish">
                  发布到 Nacos
                </ElButton>
              </div>
            </div>
            <div>
              <div class="mb-2 font-medium">
                当前 Nacos 配置
                <ElTag v-if="current" size="small" :type="current.exists ? 'success' : 'info'" class="ml-1">
                  {{ current.exists ? "已存在" : "未发布" }}
                </ElTag>
              </div>
              <pre
                class="bg-muted max-h-[420px] overflow-auto rounded p-3 text-xs leading-5"
              >{{ current?.content || "(Nacos 上暂无该站点配置)" }}</pre>
            </div>
          </div>

          <div class="mt-5">
            <div class="mb-2 font-medium">发布历史({{ historyTotal }})</div>
            <ElTable :data="historyData" border size="small">
              <ElTableColumn prop="version" label="版本" width="70" align="center">
                <template #default="{ row }">v{{ row.version }}</template>
              </ElTableColumn>
              <ElTableColumn prop="remark" label="备注" min-width="160" show-overflow-tooltip />
              <ElTableColumn prop="operator" label="操作人ID" width="90" align="center" />
              <ElTableColumn prop="created_at" label="发布时间" width="170" />
              <ElTableColumn label="操作" width="200">
                <template #default="{ row }">
                  <ElButton link type="primary" @click="handleViewHistory(row)">查看</ElButton>
                  <ElButton link type="primary" @click="handleLoadToEditor(row)">载入</ElButton>
                  <ElButton link type="warning" @click="handleRollback(row)">回滚</ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </ElTabPane>

        <!-- 开站清单 FM4 -->
        <ElTabPane label="开站清单" name="provision">
          <div class="mb-3 flex items-center gap-3">
            <ElButton type="primary" :loading="provisionLoading" @click="handleProvisionCheck">
              重新校验
            </ElButton>
            <ElButton
              type="success"
              :disabled="!canOnline"
              @click="handleSetStatus(1)"
            >
              上线站点
            </ElButton>
            <span v-if="detail.status === 1" class="text-sm text-green-600">已上线</span>
          </div>
          <ElAlert
            v-if="provision"
            :type="provision.all_passed ? 'success' : 'warning'"
            :title="provision.all_passed ? '五项校验全部通过, 可以上线' : '存在未通过项, 不能上线'"
            :closable="false"
            class="mb-3"
          />
          <ElTable v-if="provision" :data="provision.items" border>
            <ElTableColumn prop="name" label="校验项" width="140" />
            <ElTableColumn label="结果" width="90" align="center">
              <template #default="{ row }">
                <ElTag :type="row.ok ? 'success' : 'danger'">
                  {{ row.ok ? "通过" : "未过" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="detail" label="说明" min-width="300" />
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog
      v-model="bindDialogVisible"
      title="绑定域名"
      width="480px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <ElForm label-width="88px">
        <ElFormItem label="用途" required>
          <ElRadioGroup v-model="newDomainKind">
            <ElRadioButton value="admin">admin</ElRadioButton>
            <ElRadioButton value="h5">H5</ElRadioButton>
            <ElRadioButton value="app">APP</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="域名" required>
          <ElInput
            v-model="newDomain"
            placeholder="如 h5.example.com 或 localhost:5779"
            @keyup.enter="handleBindDomain"
          />
        </ElFormItem>
        <ElFormItem label="HTTPS">
          <ElSwitch v-model="newHttps" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="bindDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="domainLoading" @click="handleBindDomain">
          绑定
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="viewDialog" title="历史版本内容" width="640px">
      <pre class="bg-muted max-h-[480px] overflow-auto rounded p-3 text-xs leading-5">{{ viewContent }}</pre>
    </ElDialog>

    <ElDialog
      v-model="secretDialogVisible"
      title="PaaS 凭证"
      width="560px"
      :close-on-click-modal="false"
    >
      <ElAlert
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
        title="APPSECRET 已加密保存在控制面，可随时再次查看；重置后旧密钥失效。发布配置会同步写入 Nacos。"
      />
      <div class="space-y-3 text-sm">
        <div>
          <div class="mb-1 flex items-center justify-between">
            <span class="text-muted-foreground">APPKEY</span>
            <ElButton link type="primary" @click="copyText(shownSecret.app_key, 'APPKEY')">
              复制
            </ElButton>
          </div>
          <ElInput :model-value="shownSecret.app_key" readonly />
        </div>
        <div>
          <div class="mb-1 flex items-center justify-between">
            <span class="text-muted-foreground">APPSECRET</span>
            <ElButton link type="primary" @click="copyText(shownSecret.app_secret, 'APPSECRET')">
              复制
            </ElButton>
          </div>
          <ElInput :model-value="shownSecret.app_secret" readonly type="textarea" :rows="2" />
        </div>
      </div>
      <template #footer>
        <ElButton type="primary" @click="secretDialogVisible = false">我已保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
