<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElImage,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
  ElTabPane,
  ElTabs,
} from "element-plus";

import ConfigPublish from "../components/ConfigPublish.vue";

import {
  confirmStorageObjectApi,
  createStorageObjectApi,
  deleteStorageObjectApi,
  formatBytes,
  formatLabel,
  getStorageDownloadUrlApi,
  getStorageObjectDetailApi,
  getStorageObjectListApi,
  isImageObject,
  putStorageFile,
  storageApiConfigured,
  type StorageApi,
} from "#/api/core/storage";

defineOptions({ name: "PaasStorage" });

const pageTab = ref("manage");

const loading = ref(false);
const tableData = ref<StorageApi.ObjectItem[]>([]);
const previewUrls = ref<Record<string, string>>({});
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchForm = reactive({
  keyword: "",
  site_code: "",
  biz: "",
  status: -1,
});

const statusOptions = [
  { label: "全部状态", value: -1 },
  { label: "待上传", value: 0 },
  { label: "就绪", value: 1 },
];

const statusMeta: Record<
  number,
  { label: string; type: "info" | "warning" | "success" | "danger" }
> = {
  0: { label: "待上传", type: "warning" },
  1: { label: "就绪", type: "success" },
  2: { label: "已删", type: "info" },
};

const configured = computed(() => storageApiConfigured());

async function loadPreviews(list: StorageApi.ObjectItem[]) {
  const next: Record<string, string> = {};
  const jobs = list
    .filter((r) => r.status === 1 && isImageObject(r.filename, r.content_type))
    .map(async (r) => {
      try {
        const res = await getStorageDownloadUrlApi(r.id);
        if (res.download_url) next[r.id] = res.download_url;
      } catch {
        /* ignore single preview failure */
      }
    });
  await Promise.all(jobs);
  previewUrls.value = next;
}

async function fetchList() {
  if (!configured.value) return;
  loading.value = true;
  try {
    const res = await getStorageObjectListApi({
      keyword: searchForm.keyword || undefined,
      site_code: searchForm.site_code || undefined,
      biz: searchForm.biz || undefined,
      status: searchForm.status,
      page: pagination.current,
      size: pagination.pageSize,
    });
    tableData.value = res.list || [];
    pagination.total = res.total || 0;
    void loadPreviews(tableData.value);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.current = 1;
  void fetchList();
}

const createVisible = ref(false);
const creating = ref(false);
const createForm = reactive({
  site_code: "",
  app_key: "",
  biz: "common",
  remark: "",
});
const pendingFile = ref<File | null>(null);

function openCreate() {
  createForm.site_code = "";
  createForm.app_key = "";
  createForm.biz = "common";
  createForm.remark = "";
  pendingFile.value = null;
  createVisible.value = true;
}

function onCreateFileChange(file: { raw?: File }) {
  pendingFile.value = file?.raw || null;
}

async function submitCreate() {
  if (!createForm.site_code.trim()) {
    ElMessage.warning("请填写 site_code");
    return;
  }
  if (!pendingFile.value) {
    ElMessage.warning("请选择文件");
    return;
  }
  creating.value = true;
  try {
    const file = pendingFile.value;
    const created = await createStorageObjectApi({
      site_code: createForm.site_code.trim(),
      app_key: createForm.app_key.trim() || undefined,
      biz: createForm.biz.trim() || "common",
      filename: file.name,
      content_type: file.type || undefined,
      size_bytes: file.size,
      remark: createForm.remark.trim(),
    });
    await putStorageFile(created.upload_url, file);
    await confirmStorageObjectApi(created.id);
    ElMessage.success(`已上传 ${created.id}`);
    createVisible.value = false;
    await fetchList();
    openDetail(created.id);
  } catch (e: any) {
    ElMessage.error(e?.message || "上传失败");
  } finally {
    creating.value = false;
  }
}

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<StorageApi.ObjectDetail | null>(null);
const detailPreviewUrl = ref("");
const deleting = ref(false);

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  detailPreviewUrl.value = "";
  try {
    detail.value = await getStorageObjectDetailApi(id);
    if (
      detail.value &&
      detail.value.status === 1 &&
      isImageObject(detail.value.filename, detail.value.content_type)
    ) {
      detailPreviewUrl.value =
        previewUrls.value[id] ||
        (await getStorageDownloadUrlApi(id).then((r) => r.download_url).catch(() => ""));
    }
  } finally {
    detailLoading.value = false;
  }
}

async function onDownload() {
  if (!detail.value) return;
  try {
    const res = await getStorageDownloadUrlApi(detail.value.id);
    window.open(res.download_url || res.public_url, "_blank");
  } catch {
    /* interceptor */
  }
}

async function onDelete(row?: { id: string; filename: string }) {
  const target = row ?? detail.value;
  if (!target) return;
  try {
    await ElMessageBox.confirm(
      `确认删除「${target.filename}」？将同时清理 MinIO 对象，且不可恢复。`,
      "删除对象",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  deleting.value = true;
  try {
    await deleteStorageObjectApi(target.id);
    ElMessage.success("删除成功");
    if (detail.value?.id === target.id) {
      detailVisible.value = false;
      detail.value = null;
    }
    await fetchList();
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  void fetchList();
});
</script>

<template>
  <div class="p-4">
    <ElTabs v-model="pageTab" type="border-card">
    <ElTabPane label="存储管理" name="manage">
    <ElAlert
      v-if="!configured"
      type="warning"
      show-icon
      :closable="false"
      class="mb-4"
      title="未配置统一存储 Token"
      description="请在 .env.development 设置 VITE_STORAGE_ADMIN_TOKEN（与 my_storage security.admin_token 一致），并确保 my_storage 已启动（宿主机 :8015）。"
    />

    <ElCard shadow="never">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-base font-semibold">统一存储</div>
            <div class="mt-1 text-xs text-gray-500">
              对接 my_storage：预签名上传 → 确认 → 下载；按站点前缀隔离
            </div>
          </div>
          <ElButton type="primary" :disabled="!configured" @click="openCreate">
            上传文件
          </ElButton>
        </div>
      </template>

      <div class="mb-4 flex flex-wrap gap-3">
        <ElInput
          v-model="searchForm.keyword"
          clearable
          placeholder="文件名/短码"
          class="!w-44"
          @keyup.enter="handleSearch"
        />
        <ElInput
          v-model="searchForm.site_code"
          clearable
          placeholder="site_code"
          class="!w-36"
          @keyup.enter="handleSearch"
        />
        <ElInput
          v-model="searchForm.biz"
          clearable
          placeholder="biz"
          class="!w-28"
          @keyup.enter="handleSearch"
        />
        <ElSelect v-model="searchForm.status" class="!w-32">
          <ElOption
            v-for="o in statusOptions"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElButton type="primary" :disabled="!configured" @click="handleSearch">
          查询
        </ElButton>
        <ElButton :disabled="!configured" @click="fetchList">刷新</ElButton>
      </div>

      <ElTable v-loading="loading" :data="tableData" stripe border>
        <ElTableColumn prop="id" label="ID" width="160" show-overflow-tooltip />
        <ElTableColumn prop="site_code" label="站点" width="90" />
        <ElTableColumn prop="biz" label="业务" width="80" />
        <ElTableColumn
          prop="filename"
          label="文件名"
          min-width="140"
          show-overflow-tooltip
        />
        <ElTableColumn label="预览" width="88" align="center">
          <template #default="{ row }">
            <ElImage
              v-if="
                row.status === 1 &&
                isImageObject(row.filename, row.content_type) &&
                previewUrls[row.id]
              "
              :src="previewUrls[row.id]"
              :preview-src-list="[previewUrls[row.id]]"
              fit="cover"
              preview-teleported
              class="h-12 w-12 cursor-zoom-in rounded bg-gray-50"
            />
            <span
              v-else-if="
                row.status === 1 && isImageObject(row.filename, row.content_type)
              "
              class="text-xs text-gray-400"
            >
              加载中
            </span>
            <span v-else class="text-xs text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="格式" width="80" align="center">
          <template #default="{ row }">
            <ElTag size="small" type="info">
              {{ formatLabel(row.filename, row.content_type) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="大小" width="100">
          <template #default="{ row }">
            {{ formatBytes(row.size_bytes) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90">
          <template #default="{ row }">
            <ElTag :type="statusMeta[row.status]?.type || 'info'" size="small">
              {{ statusMeta[row.status]?.label || row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row.id)">
              详情
            </ElButton>
            <ElButton
              link
              type="danger"
              :loading="deleting"
              @click="onDelete(row)"
            >
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <ElDialog
      v-model="createVisible"
      title="上传文件"
      width="520px"
      destroy-on-close
    >
      <ElForm label-width="96px">
        <ElFormItem label="site_code" required>
          <ElInput v-model="createForm.site_code" placeholder="如 demo" />
        </ElFormItem>
        <ElFormItem label="app_key">
          <ElInput
            v-model="createForm.app_key"
            placeholder="可选，计入该站配额"
          />
        </ElFormItem>
        <ElFormItem label="biz">
          <ElInput v-model="createForm.biz" placeholder="common" />
        </ElFormItem>
        <ElFormItem label="文件" required>
          <ElUpload
            :auto-upload="false"
            :limit="1"
            :show-file-list="true"
            :on-change="onCreateFileChange"
          >
            <ElButton>选择文件</ElButton>
          </ElUpload>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="createForm.remark" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="creating" @click="submitCreate">
          上传
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="detailVisible"
      title="对象详情"
      width="640px"
      destroy-on-close
    >
      <div v-loading="detailLoading">
        <template v-if="detail">
          <div
            v-if="detailPreviewUrl"
            class="mb-4 flex justify-center rounded bg-gray-50 p-3"
          >
            <ElImage
              :src="detailPreviewUrl"
              :preview-src-list="[detailPreviewUrl]"
              fit="contain"
              preview-teleported
              class="max-h-56 max-w-full"
            />
          </div>
          <div class="grid grid-cols-2 gap-y-2 text-sm">
            <div class="text-gray-500">短码</div>
            <div>{{ detail.id }}</div>
            <div class="text-gray-500">站点</div>
            <div>{{ detail.site_code }}</div>
            <div class="text-gray-500">业务</div>
            <div>{{ detail.biz }}</div>
            <div class="text-gray-500">文件名</div>
            <div>{{ detail.filename }}</div>
            <div class="text-gray-500">格式</div>
            <div>
              {{ formatLabel(detail.filename, detail.content_type) }}
            </div>
            <div class="text-gray-500">类型</div>
            <div>{{ detail.content_type || "-" }}</div>
            <div class="text-gray-500">大小</div>
            <div>{{ formatBytes(detail.size_bytes) }}</div>
            <div class="text-gray-500">状态</div>
            <div>
              <ElTag
                :type="statusMeta[detail.status]?.type || 'info'"
                size="small"
              >
                {{ statusMeta[detail.status]?.label || detail.status }}
              </ElTag>
            </div>
            <div class="text-gray-500">Bucket</div>
            <div class="break-all">{{ detail.bucket }}</div>
            <div class="text-gray-500">Object Key</div>
            <div class="break-all">{{ detail.object_key }}</div>
            <div class="text-gray-500">Public URL</div>
            <div class="break-all">{{ detail.public_url || "-" }}</div>
          </div>
        </template>
      </div>
      <template #footer>
        <ElButton
          type="primary"
          :disabled="!detail || detail.status !== 1"
          @click="onDownload"
        >
          下载
        </ElButton>
        <ElButton type="danger" :loading="deleting" @click="onDelete()">
          删除
        </ElButton>
        <ElButton @click="detailVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
    </ElTabPane>
    <ElTabPane label="配置发布" name="config" lazy>
      <ConfigPublish service="storage" />
    </ElTabPane>
    </ElTabs>
  </div>
</template>
