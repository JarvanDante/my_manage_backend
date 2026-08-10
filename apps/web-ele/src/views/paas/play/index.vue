<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  getPlayPolicyListApi,
  getPlayRevokeListApi,
  getPlayStatsApi,
  type PlayApi,
  revokePlayApi,
  savePlayPolicyApi,
} from "#/api/core/play";
import { getSiteListApi } from "#/api/core/site";

defineOptions({ name: "PaasPlay" });

const activeTab = ref("policy");

// ---------- 站点(用于新建策略下拉) ----------
const siteCodes = ref<string[]>([]);
async function loadSites() {
  try {
    const res = await getSiteListApi({ page: 1, size: 100 } as any);
    const codes = (res.list || []).map((s: any) => s.site_code || s.code).filter(Boolean);
    // admin = 总后台预览播放的站点标识(playsign.Wrap 固定用 "admin"), 策略与失效闸都可能需要
    siteCodes.value = ["admin", ...codes.filter((c: string) => c !== "admin")];
  } catch {
    siteCodes.value = ["admin"];
  }
}

// 站点下拉展示名: admin 是总后台预览来源, 非正式子站, 标注清楚避免误解
function siteLabel(code: string) {
  return code === "admin" ? "admin(总后台预览)" : code;
}

// ---------- 防盗链策略 ----------
const policies = ref<PlayApi.PolicyItem[]>([]);
const pLoading = ref(false);
async function loadPolicies() {
  pLoading.value = true;
  try {
    const res = await getPlayPolicyListApi();
    policies.value = res.list || [];
  } finally {
    pLoading.value = false;
  }
}

const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const form = reactive({
  site_code: "",
  referer_whitelist: "",
  ua_blacklist: "",
  token_ttl_sec: 14400,
  status: true,
});

function openCreate() {
  isEdit.value = false;
  Object.assign(form, {
    site_code: "",
    referer_whitelist: "",
    ua_blacklist: "curl,wget,python",
    token_ttl_sec: 14400,
    status: true,
  });
  dialogVisible.value = true;
}

function openEdit(row: PlayApi.PolicyItem) {
  isEdit.value = true;
  Object.assign(form, {
    site_code: row.site_code,
    referer_whitelist: row.referer_whitelist,
    ua_blacklist: row.ua_blacklist,
    token_ttl_sec: row.token_ttl_sec,
    status: row.status === 1,
  });
  dialogVisible.value = true;
}

async function handleSave() {
  if (!form.site_code) {
    ElMessage.warning("请选择站点");
    return;
  }
  saving.value = true;
  try {
    await savePlayPolicyApi({
      site_code: form.site_code,
      referer_whitelist: form.referer_whitelist,
      ua_blacklist: form.ua_blacklist,
      token_ttl_sec: form.token_ttl_sec,
      status: form.status ? 1 : 0,
    });
    ElMessage.success("已保存(网关约 1 分钟内生效)");
    dialogVisible.value = false;
    loadPolicies();
  } finally {
    saving.value = false;
  }
}

// ---------- 播放统计 ----------
function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}
const statRange = ref<[string, string]>([daysAgo(6), today()]);
const statSite = ref("");
const statList = ref<PlayApi.StatItem[]>([]);
const sLoading = ref(false);
async function loadStats() {
  sLoading.value = true;
  try {
    const res = await getPlayStatsApi({
      start: statRange.value?.[0] || daysAgo(6),
      end: statRange.value?.[1] || today(),
      site_code: statSite.value || undefined,
    });
    statList.value = res.list || [];
  } finally {
    sLoading.value = false;
  }
}

// ---------- 链接一键失效 ----------
const revokes = ref<PlayApi.RevokeItem[]>([]);
const rLoading = ref(false);
const revoking = ref(false);
const revokeForm = reactive({ site_code: "", asset_code: "" });

async function loadRevokes() {
  rLoading.value = true;
  try {
    const res = await getPlayRevokeListApi();
    revokes.value = res.list || [];
  } finally {
    rLoading.value = false;
  }
}

function fmtTs(sec: number) {
  if (!sec) return "-";
  return new Date(sec * 1000).toLocaleString();
}

async function doRevoke() {
  if (!revokeForm.site_code) {
    ElMessage.warning("请选择站点");
    return;
  }
  const siteLabel =
    revokeForm.site_code === "*" ? "全部站点" : `站点 ${revokeForm.site_code}`;
  const scope = revokeForm.asset_code
    ? `${siteLabel} 的资产 ${revokeForm.asset_code}`
    : `${siteLabel} 全部资产`;
  try {
    await ElMessageBox.confirm(
      `将使【${scope}】已签发的播放链接立即失效(用户重新进入页面会拿到新链接)。确认?`,
      "一键失效",
      { type: "warning", confirmButtonText: "确认失效", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  revoking.value = true;
  try {
    await revokePlayApi({
      site_code: revokeForm.site_code,
      asset_code: revokeForm.asset_code || undefined,
    });
    ElMessage.success("已失效(网关约 15 秒内同步生效)");
    revokeForm.asset_code = "";
    loadRevokes();
  } finally {
    revoking.value = false;
  }
}

onMounted(() => {
  loadPolicies();
  loadSites();
  loadStats();
  loadRevokes();
});
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab">
        <!-- 防盗链策略 -->
        <ElTabPane label="防盗链策略" name="policy">
          <div class="mb-3 flex items-center">
            <span class="text-muted-foreground text-xs">
              按站点约束播放来源; 未配置策略的站点仅有 token 验签(M1 基线)。保存后网关约 1 分钟同步生效。
            </span>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openCreate">新增策略</ElButton>
          </div>
          <ElTable v-loading="pLoading" :data="policies" border stripe>
            <ElTableColumn label="站点" width="120">
              <template #default="{ row }">
                <ElTag v-if="row.site_code === '*'" type="danger" size="small">全部站点</ElTag>
                <span v-else>{{ row.site_code }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="referer_whitelist" label="Referer 白名单" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.referer_whitelist">{{ row.referer_whitelist }}</span>
                <span v-else class="text-muted-foreground text-xs">不限制</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="ua_blacklist" label="UA 黑名单" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.ua_blacklist">{{ row.ua_blacklist }}</span>
                <span v-else class="text-muted-foreground text-xs">不拦截</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="token 有效期" width="110" align="center">
              <template #default="{ row }">{{ Math.round(row.token_ttl_sec / 60) }} 分钟</template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="80" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? "启用" : "停用" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="updated_at" label="更新时间" width="160" />
            <ElTableColumn label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- 播放统计 -->
        <ElTabPane label="播放统计" name="stats">
          <div class="mb-3 flex items-center gap-2">
            <ElDatePicker
              v-model="statRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="开始"
              end-placeholder="结束"
              style="width: 260px"
            />
            <ElSelect
              v-model="statSite"
              placeholder="全部站点"
              style="width: 160px"
              clearable
              filterable
            >
              <ElOption
                v-for="c in siteCodes"
                :key="c"
                :label="siteLabel(c)"
                :value="c"
              />
            </ElSelect>
            <ElButton type="primary" @click="loadStats">查询</ElButton>
            <span class="text-muted-foreground text-xs">plays=m3u8 拉取次数(≈播放次数); 分片请求可估算流量热度</span>
          </div>
          <ElTable v-loading="sLoading" :data="statList" border stripe>
            <ElTableColumn prop="day" label="日期" width="110" />
            <ElTableColumn prop="site_code" label="站点" width="110" />
            <ElTableColumn prop="asset_code" label="资产" min-width="160" />
            <ElTableColumn prop="plays" label="播放次数" width="110" align="right" sortable />
            <ElTableColumn prop="seg_reqs" label="分片请求" width="110" align="right" sortable />
          </ElTable>
        </ElTabPane>

        <!-- 链接一键失效 -->
        <ElTabPane label="链接失效" name="revoke">
          <div class="mb-3 flex items-center gap-2">
            <ElSelect
              v-model="revokeForm.site_code"
              filterable
              allow-create
              placeholder="选择站点"
              style="width: 160px"
            >
              <ElOption key="*" label="全部站点(*)" value="*" />
              <ElOption v-for="c in siteCodes" :key="c" :label="siteLabel(c)" :value="c" />
            </ElSelect>
            <ElInput
              v-model="revokeForm.asset_code"
              placeholder="资产 code(空=整站全部)"
              style="width: 220px"
              clearable
            />
            <ElButton type="danger" :loading="revoking" @click="doRevoke">一键失效</ElButton>
            <ElButton @click="loadRevokes">刷新</ElButton>
            <span class="text-muted-foreground text-xs">
              失效基线之前签发的链接一律拒绝; 之后新签发的链接不受影响。网关约 15 秒同步。
            </span>
          </div>
          <ElTable v-loading="rLoading" :data="revokes" border stripe>
            <ElTableColumn label="站点" width="120">
              <template #default="{ row }">
                <ElTag v-if="row.site_code === '*'" type="danger" size="small">全部站点</ElTag>
                <span v-else>{{ row.site_code }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="资产" min-width="160">
              <template #default="{ row }">
                <span v-if="row.asset_code && row.asset_code !== '*'">{{ row.asset_code }}</span>
                <ElTag v-else type="warning" size="small">整站</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="失效基线(此前链接全失效)" min-width="200">
              <template #default="{ row }">{{ fmtTs(row.not_before) }}</template>
            </ElTableColumn>
            <ElTableColumn prop="updated_at" label="操作时间" width="170" />
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 策略编辑弹窗 -->
    <ElDialog v-model="dialogVisible" :title="isEdit ? `编辑策略 — ${form.site_code}` : '新增策略'" width="520px">
      <ElForm :model="form" label-width="110px">
        <ElFormItem label="站点">
          <ElSelect v-if="!isEdit" v-model="form.site_code" filterable allow-create placeholder="选择或输入 site_code" style="width: 100%">
            <ElOption v-for="c in siteCodes" :key="c" :label="siteLabel(c)" :value="c" />
          </ElSelect>
          <ElInput v-else v-model="form.site_code" disabled />
        </ElFormItem>
        <ElFormItem label="Referer 白名单">
          <ElInput v-model="form.referer_whitelist" type="textarea" :rows="2" placeholder="逗号分隔的域名子串, 如 mysite.com,localhost; 空=不限制" />
        </ElFormItem>
        <ElFormItem label="UA 黑名单">
          <ElInput v-model="form.ua_blacklist" placeholder="逗号分隔子串, 如 curl,wget,python; 空=不拦截" />
        </ElFormItem>
        <ElFormItem label="token 有效期">
          <ElInputNumber v-model="form.token_ttl_sec" :min="60" :max="86400" :step="600" />
          <span class="text-muted-foreground ml-2 text-xs">秒(默认 14400 = 4 小时)</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSwitch v-model="form.status" active-text="启用" inactive-text="停用" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
