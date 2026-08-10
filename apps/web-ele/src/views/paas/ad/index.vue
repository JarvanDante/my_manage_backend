<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from "vue";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElImage,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  adApiConfigured,
  createAdCampaignApi,
  createAdCreativeApi,
  createAdSlotApi,
  deleteAdCreativeApi,
  deleteAdSlotApi,
  getAdCampaignListApi,
  getAdCreativeListApi,
  getAdSlotListApi,
  setAdCampaignStatusApi,
  type AdApi,
  updateAdCampaignApi,
  updateAdCreativeApi,
  updateAdSlotApi,
} from "#/api/core/ad";

defineOptions({ name: "PaasAd" });

const configured = computed(() => adApiConfigured());
const activeTab = ref("slots");

const statusOptions = [
  { label: "全部状态", value: -1 },
  { label: "启用", value: 1 },
  { label: "停用", value: 0 },
];

const slotTypeOptions = [
  { label: "banner", value: "banner" },
  { label: "splash", value: "splash" },
  { label: "feed", value: "feed" },
  { label: "player", value: "player" },
];

function statusTag(status: number): "success" | "info" {
  return status === 1 ? "success" : "info";
}

function statusLabel(status: number) {
  return status === 1 ? "启用" : "停用";
}

// ---------- 广告位 ----------
const slotLoading = ref(false);
const slotRows = ref<AdApi.SlotItem[]>([]);
const slotPage = reactive({ current: 1, pageSize: 20, total: 0 });
const slotSearch = reactive({ keyword: "", status: -1 });
const slotDialog = ref(false);
const slotSaving = ref(false);
const slotEditingId = ref<number | null>(null);
const slotForm = reactive({
  code: "",
  name: "",
  slot_type: "banner",
  width: 0,
  height: 0,
  status: 1,
  remark: "",
});

async function loadSlots() {
  if (!configured.value) return;
  slotLoading.value = true;
  try {
    const res = await getAdSlotListApi({
      page: slotPage.current,
      size: slotPage.pageSize,
      keyword: slotSearch.keyword || undefined,
      status: slotSearch.status,
    });
    slotRows.value = res.list || [];
    slotPage.total = res.total || 0;
  } finally {
    slotLoading.value = false;
  }
}

function openSlotCreate() {
  slotEditingId.value = null;
  Object.assign(slotForm, {
    code: "",
    name: "",
    slot_type: "banner",
    width: 0,
    height: 0,
    status: 1,
    remark: "",
  });
  slotDialog.value = true;
}

function openSlotEdit(row: AdApi.SlotItem) {
  slotEditingId.value = row.id;
  Object.assign(slotForm, {
    code: row.code,
    name: row.name,
    slot_type: row.slot_type || "banner",
    width: row.width || 0,
    height: row.height || 0,
    status: row.status,
    remark: row.remark || "",
  });
  slotDialog.value = true;
}

async function saveSlot() {
  if (!slotForm.name.trim()) {
    ElMessage.warning("请填写名称");
    return;
  }
  if (!slotEditingId.value && !slotForm.code.trim()) {
    ElMessage.warning("请填写 code");
    return;
  }
  slotSaving.value = true;
  try {
    if (slotEditingId.value) {
      await updateAdSlotApi(slotEditingId.value, {
        name: slotForm.name.trim(),
        slot_type: slotForm.slot_type,
        width: slotForm.width,
        height: slotForm.height,
        status: slotForm.status,
        remark: slotForm.remark.trim(),
      });
      ElMessage.success("已更新广告位");
    } else {
      await createAdSlotApi({
        code: slotForm.code.trim(),
        name: slotForm.name.trim(),
        slot_type: slotForm.slot_type,
        width: slotForm.width,
        height: slotForm.height,
        status: slotForm.status,
        remark: slotForm.remark.trim(),
      });
      ElMessage.success("已创建广告位");
    }
    slotDialog.value = false;
    await loadSlots();
    await loadSlotOptions();
  } finally {
    slotSaving.value = false;
  }
}

async function disableSlot(row: AdApi.SlotItem) {
  await ElMessageBox.confirm(`停用广告位「${row.code}」？`, "确认", {
    type: "warning",
  });
  await deleteAdSlotApi(row.id);
  ElMessage.success("已停用");
  await loadSlots();
  await loadSlotOptions();
}

// ---------- 素材 ----------
const creativeLoading = ref(false);
const creativeRows = ref<AdApi.CreativeItem[]>([]);
const creativePage = reactive({ current: 1, pageSize: 20, total: 0 });
const creativeSearch = reactive({ keyword: "", status: -1 });
const creativeDialog = ref(false);
const creativeSaving = ref(false);
const creativeEditingId = ref<string | null>(null);
const creativeForm = reactive({
  title: "",
  media_url: "",
  link_url: "",
  storage_object_id: "",
  status: 1,
  remark: "",
});

async function loadCreatives() {
  if (!configured.value) return;
  creativeLoading.value = true;
  try {
    const res = await getAdCreativeListApi({
      page: creativePage.current,
      size: creativePage.pageSize,
      keyword: creativeSearch.keyword || undefined,
      status: creativeSearch.status,
    });
    creativeRows.value = res.list || [];
    creativePage.total = res.total || 0;
  } finally {
    creativeLoading.value = false;
  }
}

function openCreativeCreate() {
  creativeEditingId.value = null;
  Object.assign(creativeForm, {
    title: "",
    media_url: "",
    link_url: "",
    storage_object_id: "",
    status: 1,
    remark: "",
  });
  creativeDialog.value = true;
}

function openCreativeEdit(row: AdApi.CreativeItem) {
  creativeEditingId.value = row.id;
  Object.assign(creativeForm, {
    title: row.title,
    media_url: row.media_url,
    link_url: row.link_url || "",
    storage_object_id: row.storage_object_id || "",
    status: row.status,
    remark: row.remark || "",
  });
  creativeDialog.value = true;
}

async function saveCreative() {
  if (!creativeForm.title.trim() || !creativeForm.media_url.trim()) {
    ElMessage.warning("标题与 media_url 必填");
    return;
  }
  creativeSaving.value = true;
  try {
    const body = {
      title: creativeForm.title.trim(),
      media_url: creativeForm.media_url.trim(),
      link_url: creativeForm.link_url.trim(),
      storage_object_id: creativeForm.storage_object_id.trim(),
      status: creativeForm.status,
      remark: creativeForm.remark.trim(),
    };
    if (creativeEditingId.value) {
      await updateAdCreativeApi(creativeEditingId.value, body);
      ElMessage.success("已更新素材");
    } else {
      await createAdCreativeApi(body);
      ElMessage.success("已创建素材");
    }
    creativeDialog.value = false;
    await loadCreatives();
    await loadCreativeOptions();
  } finally {
    creativeSaving.value = false;
  }
}

async function disableCreative(row: AdApi.CreativeItem) {
  await ElMessageBox.confirm(`下架素材「${row.title}」？`, "确认", {
    type: "warning",
  });
  await deleteAdCreativeApi(row.id);
  ElMessage.success("已下架");
  await loadCreatives();
  await loadCreativeOptions();
}

// ---------- 投放 ----------
const campaignLoading = ref(false);
const campaignRows = ref<AdApi.CampaignItem[]>([]);
const campaignPage = reactive({ current: 1, pageSize: 20, total: 0 });
const campaignSearch = reactive({
  keyword: "",
  site_code: "",
  slot_id: undefined as number | undefined,
  status: -1,
});
const campaignDialog = ref(false);
const campaignSaving = ref(false);
const campaignEditingId = ref<string | null>(null);
const campaignForm = reactive({
  name: "",
  slot_id: undefined as number | undefined,
  creative_id: "",
  site_code: "",
  priority: 100,
  weight: 100,
  status: 1,
  start_at: "",
  end_at: "",
  remark: "",
});

const slotOptions = ref<AdApi.SlotItem[]>([]);
const creativeOptions = ref<AdApi.CreativeItem[]>([]);

async function loadSlotOptions() {
  if (!configured.value) return;
  const res = await getAdSlotListApi({ page: 1, size: 100, status: 1 });
  slotOptions.value = res.list || [];
}

async function loadCreativeOptions() {
  if (!configured.value) return;
  const res = await getAdCreativeListApi({ page: 1, size: 100, status: 1 });
  creativeOptions.value = res.list || [];
}

function slotLabel(id: number) {
  const s = slotOptions.value.find((x) => x.id === id);
  return s ? `${s.code} · ${s.name}` : String(id);
}

function creativeLabel(id: string) {
  const c = creativeOptions.value.find((x) => x.id === id);
  return c ? `${c.title} (${c.id.slice(0, 6)}…)` : id;
}

async function loadCampaigns() {
  if (!configured.value) return;
  campaignLoading.value = true;
  try {
    const res = await getAdCampaignListApi({
      page: campaignPage.current,
      size: campaignPage.pageSize,
      keyword: campaignSearch.keyword || undefined,
      site_code: campaignSearch.site_code || undefined,
      slot_id: campaignSearch.slot_id,
      status: campaignSearch.status,
    });
    campaignRows.value = res.list || [];
    campaignPage.total = res.total || 0;
  } finally {
    campaignLoading.value = false;
  }
}

function openCampaignCreate() {
  campaignEditingId.value = null;
  Object.assign(campaignForm, {
    name: "",
    slot_id: undefined,
    creative_id: "",
    site_code: "",
    priority: 100,
    weight: 100,
    status: 1,
    start_at: "",
    end_at: "",
    remark: "",
  });
  campaignDialog.value = true;
}

function openCampaignEdit(row: AdApi.CampaignItem) {
  campaignEditingId.value = row.id;
  Object.assign(campaignForm, {
    name: row.name,
    slot_id: row.slot_id,
    creative_id: row.creative_id,
    site_code: row.site_code || "",
    priority: row.priority,
    weight: row.weight,
    status: row.status,
    start_at: row.start_at || "",
    end_at: row.end_at || "",
    remark: row.remark || "",
  });
  campaignDialog.value = true;
}

async function saveCampaign() {
  if (!campaignForm.name.trim()) {
    ElMessage.warning("请填写投放名称");
    return;
  }
  if (!campaignForm.slot_id || !campaignForm.creative_id) {
    ElMessage.warning("请选择广告位与素材");
    return;
  }
  campaignSaving.value = true;
  try {
    const body = {
      name: campaignForm.name.trim(),
      slot_id: campaignForm.slot_id,
      creative_id: campaignForm.creative_id,
      site_code: campaignForm.site_code.trim().toUpperCase(),
      priority: campaignForm.priority,
      weight: campaignForm.weight,
      status: campaignForm.status,
      start_at: campaignForm.start_at.trim() || undefined,
      end_at: campaignForm.end_at.trim() || undefined,
      remark: campaignForm.remark.trim(),
    };
    if (campaignEditingId.value) {
      await updateAdCampaignApi(campaignEditingId.value, body);
      ElMessage.success("已更新投放");
    } else {
      await createAdCampaignApi(body);
      ElMessage.success("已创建投放");
    }
    campaignDialog.value = false;
    await loadCampaigns();
  } finally {
    campaignSaving.value = false;
  }
}

async function toggleCampaign(row: AdApi.CampaignItem) {
  const next = row.status === 1 ? 0 : 1;
  await setAdCampaignStatusApi(row.id, next);
  ElMessage.success(next === 1 ? "已开启投放" : "已暂停投放");
  await loadCampaigns();
}

async function refreshCurrent() {
  if (activeTab.value === "slots") await loadSlots();
  else if (activeTab.value === "creatives") await loadCreatives();
  else await loadCampaigns();
}

watch(activeTab, (tab) => {
  if (tab === "slots") void loadSlots();
  if (tab === "creatives") void loadCreatives();
  if (tab === "campaigns") void loadCampaigns();
});

onMounted(() => {
  if (!configured.value) return;
  void loadSlots();
  void loadSlotOptions();
  void loadCreativeOptions();
});
</script>

<template>
  <div class="ad-page">
    <ElCard shadow="never" class="ad-page__head">
      <div class="ad-page__title-row">
        <div>
          <h2 class="ad-page__title">广告中台</h2>
          <p class="ad-page__sub">
            管理广告位 / 素材 / 投放。子站 Open：
            <code>GET /open/ads?slot_code=</code> · 服务
            <code>http://127.0.0.1:8016</code>
          </p>
        </div>
        <ElButton @click="refreshCurrent">刷新</ElButton>
      </div>
      <ElAlert
        v-if="!configured"
        type="warning"
        :closable="false"
        show-icon
        title="未配置 VITE_AD_ADMIN_TOKEN"
        description="请在 .env.development 配置广告中台 Admin Token，并确保 vite 代理 /ad-api → :8016。"
        class="mt-3"
      />
    </ElCard>

    <ElCard v-if="configured" shadow="never">
      <ElTabs v-model="activeTab">
        <!-- 广告位 -->
        <ElTabPane label="广告位" name="slots">
          <div class="toolbar">
            <ElInput
              v-model="slotSearch.keyword"
              clearable
              placeholder="code / 名称"
              style="width: 200px"
              @keyup.enter="
                slotPage.current = 1;
                loadSlots();
              "
            />
            <ElSelect v-model="slotSearch.status" style="width: 120px">
              <ElOption
                v-for="o in statusOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <ElButton
              type="primary"
              @click="
                slotPage.current = 1;
                loadSlots();
              "
            >
              查询
            </ElButton>
            <ElButton type="primary" plain @click="openSlotCreate">
              新建广告位
            </ElButton>
          </div>
          <ElTable v-loading="slotLoading" :data="slotRows" stripe border size="small">
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn prop="code" label="code" min-width="120" />
            <ElTableColumn prop="name" label="名称" min-width="120" />
            <ElTableColumn prop="slot_type" label="类型" width="90" />
            <ElTableColumn label="尺寸" width="100">
              <template #default="{ row }">
                {{ row.width || "-" }}×{{ row.height || "-" }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="80">
              <template #default="{ row }">
                <ElTag :type="statusTag(row.status)" size="small" effect="plain">
                  {{ statusLabel(row.status) }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="创建时间" min-width="160" />
            <ElTableColumn label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openSlotEdit(row)">
                  编辑
                </ElButton>
                <ElButton
                  v-if="row.status === 1"
                  link
                  type="danger"
                  @click="disableSlot(row)"
                >
                  停用
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
          <div class="pager">
            <ElPagination
              v-model:current-page="slotPage.current"
              v-model:page-size="slotPage.pageSize"
              :total="slotPage.total"
              layout="total, prev, pager, next"
              @current-change="loadSlots"
            />
          </div>
        </ElTabPane>

        <!-- 素材 -->
        <ElTabPane label="素材" name="creatives">
          <div class="toolbar">
            <ElInput
              v-model="creativeSearch.keyword"
              clearable
              placeholder="标题 / id"
              style="width: 200px"
              @keyup.enter="
                creativePage.current = 1;
                loadCreatives();
              "
            />
            <ElSelect v-model="creativeSearch.status" style="width: 120px">
              <ElOption
                v-for="o in statusOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <ElButton
              type="primary"
              @click="
                creativePage.current = 1;
                loadCreatives();
              "
            >
              查询
            </ElButton>
            <ElButton type="primary" plain @click="openCreativeCreate">
              新建素材
            </ElButton>
          </div>
          <ElTable
            v-loading="creativeLoading"
            :data="creativeRows"
            stripe
            border
            size="small"
          >
            <ElTableColumn label="预览" width="80">
              <template #default="{ row }">
                <ElImage
                  v-if="row.media_url"
                  :src="row.media_url"
                  fit="cover"
                  style="width: 48px; height: 48px; border-radius: 4px"
                  :preview-src-list="[row.media_url]"
                />
                <span v-else class="dim">-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="id" label="ID" min-width="140" show-overflow-tooltip />
            <ElTableColumn prop="title" label="标题" min-width="120" />
            <ElTableColumn
              prop="media_url"
              label="media_url"
              min-width="180"
              show-overflow-tooltip
            />
            <ElTableColumn
              prop="link_url"
              label="落地页"
              min-width="140"
              show-overflow-tooltip
            />
            <ElTableColumn label="状态" width="80">
              <template #default="{ row }">
                <ElTag :type="statusTag(row.status)" size="small" effect="plain">
                  {{ statusLabel(row.status) }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openCreativeEdit(row)">
                  编辑
                </ElButton>
                <ElButton
                  v-if="row.status === 1"
                  link
                  type="danger"
                  @click="disableCreative(row)"
                >
                  下架
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
          <div class="pager">
            <ElPagination
              v-model:current-page="creativePage.current"
              v-model:page-size="creativePage.pageSize"
              :total="creativePage.total"
              layout="total, prev, pager, next"
              @current-change="loadCreatives"
            />
          </div>
        </ElTabPane>

        <!-- 投放 -->
        <ElTabPane label="投放" name="campaigns">
          <div class="toolbar">
            <ElInput
              v-model="campaignSearch.keyword"
              clearable
              placeholder="名称 / id"
              style="width: 160px"
              @keyup.enter="
                campaignPage.current = 1;
                loadCampaigns();
              "
            />
            <ElInput
              v-model="campaignSearch.site_code"
              clearable
              placeholder="site_code"
              style="width: 120px"
            />
            <ElSelect
              v-model="campaignSearch.slot_id"
              clearable
              placeholder="广告位"
              style="width: 180px"
            >
              <ElOption
                v-for="s in slotOptions"
                :key="s.id"
                :label="`${s.code} · ${s.name}`"
                :value="s.id"
              />
            </ElSelect>
            <ElSelect v-model="campaignSearch.status" style="width: 120px">
              <ElOption
                v-for="o in statusOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <ElButton
              type="primary"
              @click="
                campaignPage.current = 1;
                loadCampaigns();
              "
            >
              查询
            </ElButton>
            <ElButton type="primary" plain @click="openCampaignCreate">
              新建投放
            </ElButton>
          </div>
          <ElTable
            v-loading="campaignLoading"
            :data="campaignRows"
            stripe
            border
            size="small"
          >
            <ElTableColumn prop="name" label="名称" min-width="120" />
            <ElTableColumn label="广告位" min-width="140">
              <template #default="{ row }">
                {{ slotLabel(row.slot_id) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="素材" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">
                {{ creativeLabel(row.creative_id) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="站点" width="90">
              <template #default="{ row }">
                {{ row.site_code || "全站" }}
              </template>
            </ElTableColumn>
            <ElTableColumn prop="priority" label="优先级" width="70" />
            <ElTableColumn prop="weight" label="权重" width="70" />
            <ElTableColumn label="状态" width="80">
              <template #default="{ row }">
                <ElTag :type="statusTag(row.status)" size="small" effect="plain">
                  {{ row.status === 1 ? "投放中" : "暂停" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openCampaignEdit(row)">
                  编辑
                </ElButton>
                <ElButton link type="warning" @click="toggleCampaign(row)">
                  {{ row.status === 1 ? "暂停" : "开启" }}
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
          <div class="pager">
            <ElPagination
              v-model:current-page="campaignPage.current"
              v-model:page-size="campaignPage.pageSize"
              :total="campaignPage.total"
              layout="total, prev, pager, next"
              @current-change="loadCampaigns"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 广告位弹窗 -->
    <ElDialog
      v-model="slotDialog"
      :title="slotEditingId ? '编辑广告位' : '新建广告位'"
      width="520px"
      destroy-on-close
    >
      <ElForm label-width="96px">
        <ElFormItem label="code" required>
          <ElInput
            v-model="slotForm.code"
            :disabled="!!slotEditingId"
            placeholder="如 home_banner"
          />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="slotForm.name" />
        </ElFormItem>
        <ElFormItem label="类型">
          <ElSelect v-model="slotForm.slot_type" style="width: 100%">
            <ElOption
              v-for="o in slotTypeOptions"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="宽 × 高">
          <div class="inline-2">
            <ElInputNumber v-model="slotForm.width" :min="0" />
            <ElInputNumber v-model="slotForm.height" :min="0" />
          </div>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="slotForm.status" style="width: 100%">
            <ElOption label="启用" :value="1" />
            <ElOption label="停用" :value="0" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="slotForm.remark" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="slotDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="slotSaving" @click="saveSlot">
          保存
        </ElButton>
      </template>
    </ElDialog>

    <!-- 素材弹窗 -->
    <ElDialog
      v-model="creativeDialog"
      :title="creativeEditingId ? '编辑素材' : '新建素材'"
      width="560px"
      destroy-on-close
    >
      <ElForm label-width="120px">
        <ElFormItem label="标题" required>
          <ElInput v-model="creativeForm.title" />
        </ElFormItem>
        <ElFormItem label="media_url" required>
          <ElInput
            v-model="creativeForm.media_url"
            placeholder="图片/视频 URL（建议统一存储下载地址）"
          />
        </ElFormItem>
        <ElFormItem label="落地页 link_url">
          <ElInput v-model="creativeForm.link_url" />
        </ElFormItem>
        <ElFormItem label="storage_object_id">
          <ElInput
            v-model="creativeForm.storage_object_id"
            placeholder="可选，统一存储对象短码"
          />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="creativeForm.status" style="width: 100%">
            <ElOption label="启用" :value="1" />
            <ElOption label="下架" :value="0" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="creativeForm.remark" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="creativeDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="creativeSaving" @click="saveCreative">
          保存
        </ElButton>
      </template>
    </ElDialog>

    <!-- 投放弹窗 -->
    <ElDialog
      v-model="campaignDialog"
      :title="campaignEditingId ? '编辑投放' : '新建投放'"
      width="560px"
      destroy-on-close
    >
      <ElForm label-width="110px">
        <ElFormItem label="名称" required>
          <ElInput v-model="campaignForm.name" />
        </ElFormItem>
        <ElFormItem label="广告位" required>
          <ElSelect
            v-model="campaignForm.slot_id"
            filterable
            style="width: 100%"
            placeholder="选择启用中的广告位"
          >
            <ElOption
              v-for="s in slotOptions"
              :key="s.id"
              :label="`${s.code} · ${s.name}`"
              :value="s.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="素材" required>
          <ElSelect
            v-model="campaignForm.creative_id"
            filterable
            style="width: 100%"
            placeholder="选择启用中的素材"
          >
            <ElOption
              v-for="c in creativeOptions"
              :key="c.id"
              :label="`${c.title} (${c.id})`"
              :value="c.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="site_code">
          <ElInput
            v-model="campaignForm.site_code"
            placeholder="空=全站；如 MY"
          />
        </ElFormItem>
        <ElFormItem label="优先级 / 权重">
          <div class="inline-2">
            <ElInputNumber v-model="campaignForm.priority" :min="1" />
            <ElInputNumber v-model="campaignForm.weight" :min="1" />
          </div>
        </ElFormItem>
        <ElFormItem label="开始 / 结束">
          <div class="inline-2">
            <ElInput
              v-model="campaignForm.start_at"
              placeholder="可选 2026-08-11 00:00:00"
            />
            <ElInput
              v-model="campaignForm.end_at"
              placeholder="可选，空=不限"
            />
          </div>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="campaignForm.status" style="width: 100%">
            <ElOption label="投放中" :value="1" />
            <ElOption label="暂停" :value="0" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="campaignForm.remark" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="campaignDialog = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="campaignSaving"
          @click="saveCampaign"
        >
          保存
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.ad-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.ad-page__head {
  border-radius: 12px;
}

.ad-page__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ad-page__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.ad-page__sub {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.ad-page__sub code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #f3f4f6;
  font-size: 12px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.inline-2 {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.dim {
  color: #9ca3af;
}

.mt-3 {
  margin-top: 12px;
}
</style>
