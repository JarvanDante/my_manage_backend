<script lang="ts" setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";

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
  ElTag,
  ElUpload,
} from "element-plus";
import Hls from "hls.js";

import {
  createMediaAssetApi,
  deleteMediaAssetApi,
  getMediaAssetDetailApi,
  getMediaAssetListApi,
  getMediaUploadUrlApi,
  mediaApiConfigured,
  putMediaFile,
  triggerMediaTranscodeApi,
  type MediaApi,
} from "#/api/core/media";

defineOptions({ name: "PaasMedia" });

const loading = ref(false);
const tableData = ref<MediaApi.AssetItem[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchForm = reactive({ keyword: "", status: -1 });

const statusOptions = [
  { label: "全部状态", value: -1 },
  { label: "草稿", value: 0 },
  { label: "转码中", value: 1 },
  { label: "就绪", value: 2 },
  { label: "失败", value: 3 },
  { label: "下架", value: 4 },
];

const statusMeta: Record<
  number,
  { label: string; type: "info" | "warning" | "success" | "danger" }
> = {
  0: { label: "草稿", type: "info" },
  1: { label: "转码中", type: "warning" },
  2: { label: "就绪", type: "success" },
  3: { label: "失败", type: "danger" },
  4: { label: "下架", type: "info" },
};

const configured = computed(() => mediaApiConfigured());

function formatDuration(sec: number) {
  if (!sec || sec <= 0) return "-";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function fetchList() {
  if (!configured.value) return;
  loading.value = true;
  try {
    const res = await getMediaAssetListApi({
      keyword: searchForm.keyword || undefined,
      status: searchForm.status,
      page: pagination.current,
      size: pagination.pageSize,
    });
    tableData.value = res.list || [];
    pagination.total = res.total || 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.current = 1;
  void fetchList();
}

// ---------- 创建 ----------
const createVisible = ref(false);
const creating = ref(false);
const createForm = reactive({ title: "", remark: "" });

function openCreate() {
  createForm.title = "";
  createForm.remark = "";
  createVisible.value = true;
}

async function submitCreate() {
  if (!createForm.title.trim()) {
    ElMessage.warning("请填写标题");
    return;
  }
  creating.value = true;
  try {
    const res = await createMediaAssetApi({
      title: createForm.title.trim(),
      remark: createForm.remark.trim(),
    });
    ElMessage.success(`已创建资产 #${res.id}`);
    createVisible.value = false;
    await fetchList();
    openDetail(res.id);
  } finally {
    creating.value = false;
  }
}

// ---------- 详情 / 上传 / 转码 / 预览 ----------
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<MediaApi.AssetDetail | null>(null);
const uploading = ref(false);
const transcoding = ref(false);
const deleting = ref(false);
const uploadPercent = ref(0);
const coverSeekSec = ref(8);
const videoRef = ref<HTMLVideoElement | null>(null);
const playerError = ref("");
let hlsPlayer: Hls | null = null;

function destroyPlayer() {
  playerError.value = "";
  if (hlsPlayer) {
    hlsPlayer.destroy();
    hlsPlayer = null;
  }
  const el = videoRef.value;
  if (el) {
    el.pause();
    el.removeAttribute("src");
    el.load();
  }
}

async function setupPlayer(url: string) {
  await nextTick();
  destroyPlayer();
  const el = videoRef.value;
  if (!el || !url) return;

  if (el.canPlayType("application/vnd.apple.mpegurl")) {
    el.src = url;
    return;
  }
  if (Hls.isSupported()) {
    hlsPlayer = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
    });
    hlsPlayer.on(Hls.Events.ERROR, (_evt, data) => {
      if (!data.fatal) return;
      playerError.value = `播放失败：${data.type}/${data.details}`;
      hlsPlayer?.destroy();
      hlsPlayer = null;
    });
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(el);
    return;
  }
  playerError.value = "当前浏览器不支持 HLS 播放";
}

watch(
  () => [detailVisible.value, detail.value?.play_url] as const,
  ([visible, url]) => {
    if (visible && url) {
      void setupPlayer(url);
    } else {
      destroyPlayer();
    }
  },
);

onBeforeUnmount(destroyPlayer);

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  coverSeekSec.value = 8;
  destroyPlayer();
  try {
    detail.value = await getMediaAssetDetailApi(id);
  } finally {
    detailLoading.value = false;
  }
}

async function refreshDetail() {
  if (!detail.value) return;
  const id = detail.value.id;
  detailLoading.value = true;
  try {
    detail.value = await getMediaAssetDetailApi(id);
    await fetchList();
  } finally {
    detailLoading.value = false;
  }
}

async function onFileChange(file: { raw?: File }) {
  const raw = file?.raw;
  if (!raw || !detail.value) return;
  uploading.value = true;
  uploadPercent.value = 0;
  try {
    const { upload_url } = await getMediaUploadUrlApi(detail.value.id, raw.name);
    uploadPercent.value = 30;
    await putMediaFile(upload_url, raw);
    uploadPercent.value = 100;
    ElMessage.success("原片已上传，可触发转码");
    await refreshDetail();
  } catch (e: any) {
    ElMessage.error(e?.message || "上传失败");
  } finally {
    uploading.value = false;
  }
}

async function onTranscode() {
  if (!detail.value) return;
  if (!detail.value.source_key) {
    ElMessage.warning("请先上传原片");
    return;
  }
  transcoding.value = true;
  try {
    const res = await triggerMediaTranscodeApi(detail.value.id, {
      cover_seek_sec: coverSeekSec.value ?? 8,
    });
    ElMessage.success(`已投递转码 job_id=${res.job_id}`);
    await refreshDetail();
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      await refreshDetail();
      if (
        detail.value &&
        (detail.value.status === 2 || detail.value.status === 3)
      ) {
        break;
      }
    }
  } finally {
    transcoding.value = false;
  }
}

function openPlay() {
  if (detail.value?.play_url) {
    window.open(detail.value.play_url, "_blank");
  }
}

async function onDelete(row?: { id: string; title: string }) {
  const target = row ?? detail.value;
  if (!target) return;
  try {
    await ElMessageBox.confirm(
      `确认删除「${target.title}」？将同时清理 MinIO 原片与 HLS 分片，且不可恢复。`,
      "删除媒资",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  deleting.value = true;
  try {
    const res = await deleteMediaAssetApi(target.id);
    ElMessage.success("删除成功");
    if (detail.value?.id === target.id) {
      destroyPlayer();
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
    <ElAlert
      v-if="!configured"
      type="warning"
      show-icon
      :closable="false"
      class="mb-4"
      title="未配置媒资服务 Token"
      description="请在 .env.development 设置 VITE_MEDIA_ADMIN_TOKEN（与 my_media security.admin_token 一致），并确保 my_media 已启动。"
    />

    <ElCard shadow="never">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-base font-semibold">媒资中心</div>
            <div class="mt-1 text-xs text-gray-500">
              对接 my_media：上传 → 转码 → 中央池；子站经 app_key 选用
            </div>
          </div>
          <ElButton type="primary" :disabled="!configured" @click="openCreate">
            新建资产
          </ElButton>
        </div>
      </template>

      <div class="mb-4 flex flex-wrap gap-3">
        <ElInput
          v-model="searchForm.keyword"
          clearable
          placeholder="标题关键词"
          class="!w-52"
          @keyup.enter="handleSearch"
        />
        <ElSelect v-model="searchForm.status" class="!w-36">
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
        <ElTableColumn prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <ElTableColumn label="封面" width="96" align="center">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover_url"
              :src="row.cover_url"
              :preview-src-list="[row.cover_url]"
              fit="contain"
              preview-teleported
              class="h-14 w-20 cursor-zoom-in rounded bg-gray-50"
            />
            <span v-else class="text-xs text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="statusMeta[row.status]?.type || 'info'" size="small">
              {{ statusMeta[row.status]?.label || row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="transcode_status" label="转码" width="110" />
        <ElTableColumn label="时长" width="90">
          <template #default="{ row }">
            {{ formatDuration(row.duration_sec) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row.id)">
              管理
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

    <!-- 新建 -->
    <ElDialog v-model="createVisible" title="新建媒资" width="480px" destroy-on-close>
      <ElForm label-width="80px">
        <ElFormItem label="标题" required>
          <ElInput v-model="createForm.title" placeholder="视频标题" />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="createForm.remark" type="textarea" :rows="2" />
        </ElFormItem>
        <p class="mb-0 pl-[80px] text-xs text-gray-400">
          封面由转码自动截取，无需手动填写
        </p>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="creating" @click="submitCreate">
          创建
        </ElButton>
      </template>
    </ElDialog>

    <!-- 详情弹窗 + 预览 -->
    <ElDialog
      v-model="detailVisible"
      title="媒资详情"
      width="880px"
      top="6vh"
      destroy-on-close
      align-center
      @closed="destroyPlayer"
    >
      <div v-loading="detailLoading">
        <template v-if="detail">
          <div class="mb-4 overflow-hidden rounded-md bg-black">
            <video
              v-if="detail.play_url"
              ref="videoRef"
              class="max-h-[360px] w-full"
              controls
              playsinline
              preload="metadata"
            />
            <div
              v-else
              class="flex h-48 items-center justify-center text-sm text-gray-400"
            >
              暂无播放地址（上传并转码完成后可预览）
            </div>
          </div>
          <p v-if="playerError" class="mb-3 text-xs text-red-500">
            {{ playerError }}
          </p>

          <div class="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><span class="text-gray-500">ID：</span>{{ detail.id }}</div>
            <div><span class="text-gray-500">标题：</span>{{ detail.title }}</div>
            <div v-if="detail.cover_url" class="sm:col-span-2">
              <span class="text-gray-500">封面：</span>
              <a
                class="text-primary break-all"
                :href="detail.cover_url"
                target="_blank"
                rel="noreferrer"
              >
                {{ detail.cover_url }}
              </a>
              <div class="mt-2">
                <ElImage
                  :src="detail.cover_url"
                  :preview-src-list="[detail.cover_url]"
                  fit="contain"
                  preview-teleported
                  class="h-40 w-auto max-w-full cursor-zoom-in rounded border bg-gray-50"
                />
              </div>
            </div>
            <div>
              <span class="text-gray-500">状态：</span>
              <ElTag :type="statusMeta[detail.status]?.type || 'info'" size="small">
                {{ statusMeta[detail.status]?.label }}
              </ElTag>
              <span class="ml-2 text-gray-500">{{ detail.transcode_status }}</span>
            </div>
            <div>
              <span class="text-gray-500">时长：</span>
              {{ formatDuration(detail.duration_sec) }}
            </div>
            <div class="break-all sm:col-span-2">
              <span class="text-gray-500">原片：</span>
              {{ detail.source_key || "（未上传）" }}
            </div>
            <div v-if="detail.transcode_error" class="text-red-500 sm:col-span-2">
              错误：{{ detail.transcode_error }}
            </div>
            <div v-if="detail.play_url" class="break-all sm:col-span-2">
              <span class="text-gray-500">播放：</span>
              <a
                class="text-primary"
                :href="detail.play_url"
                target="_blank"
                rel="noreferrer"
              >
                {{ detail.play_url }}
              </a>
            </div>
          </div>

          <div class="mb-3 text-sm font-medium">1. 上传原片</div>
          <ElUpload
            :auto-upload="false"
            :show-file-list="false"
            accept="video/*,.mp4,.mov,.mkv"
            :disabled="uploading"
            :on-change="onFileChange"
          >
            <ElButton type="primary" plain :loading="uploading">
              选择视频并上传
            </ElButton>
          </ElUpload>
          <div v-if="uploading" class="mt-2 text-xs text-gray-500">
            上传中… {{ uploadPercent }}%
          </div>

          <div class="mb-3 mt-6 text-sm font-medium">2. 触发转码</div>
          <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span class="text-gray-500">封面截取秒数</span>
            <ElInputNumber
              v-model="coverSeekSec"
              :min="0"
              :max="36000"
              :step="1"
              controls-position="right"
              class="!w-36"
            />
            <span class="text-xs text-gray-400">默认 8；片长短于该秒会自动取中点</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <ElButton
              type="primary"
              :loading="transcoding"
              :disabled="!detail.source_key"
              @click="onTranscode"
            >
              开始转码（HLS）
            </ElButton>
            <ElButton :disabled="!detail.play_url" @click="openPlay">
              打开播放地址
            </ElButton>
            <ElButton @click="refreshDetail">刷新状态</ElButton>
          </div>

          <div class="mb-3 mt-6 text-sm font-medium">3. 删除</div>
          <ElButton type="danger" plain :loading="deleting" @click="onDelete">
            删除资产（含 MinIO）
          </ElButton>

          <p class="mt-4 text-xs leading-relaxed text-gray-400">
            转码依赖 Docker 中的 my_transcode + Kafka + MinIO。完成后状态变为「就绪」，子站可用
            app_key 调用 /open 选用。删除会清库记录、选用记录、转码任务，并按前缀清理对象存储。
          </p>
        </template>
      </div>
    </ElDialog>
  </div>
</template>
