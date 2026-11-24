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
  ElProgress,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
  ElTabPane,
  ElTabs,
} from "element-plus";

import ConfigPublish from "../components/ConfigPublish.vue";
import Hls from "hls.js";

import {
  createMediaAssetApi,
  createMediaEpisodeApi,
  createMediaNovelChapterApi,
  deleteMediaAssetApi,
  deleteMediaComicChapterApi,
  getDramaImportJobApi,
  getDramaImportLimitsApi,
  getMediaAssetDetailApi,
  getMediaAssetListApi,
  getMediaUploadUrlApi,
  importComicsZipApi,
  importNovelZipApi,
  mediaApiConfigured,
  putMediaFile,
  retryDramaImportJobApi,
  uploadDramaZipAndEnqueue,
  replaceMediaCoverApi,
  triggerMediaTranscodeApi,
  updateMediaAssetApi,
  updateMediaNovelChapterApi,
  type MediaApi,
} from "#/api/core/media";

import {
  buildImportPlan,
  checkZipLimits,
  groupDramaZip,
  humanBytes,
  defaultDramaImportLimits,
  listZipEntries,
  type DramaImportLimits,
  type DramaZipGroup,
} from "./dramaZip";

defineOptions({ name: "PaasMedia" });

const pageTab = ref("video");
const managePanes = [
  { name: "video", label: "视频管理", kind: 0 },
  { name: "douyin", label: "抖音管理", kind: 3 },
  { name: "comics", label: "漫画管理", kind: 1 },
  { name: "cartoon", label: "动漫管理", kind: 2 },
  { name: "novel", label: "小说管理", kind: 4 },
  { name: "drama", label: "短剧管理", kind: 5 },
] as const;

function paneHint(kind: number) {
  if (kind === 1) return "zip 直写 MinIO comics/ 前缀，无需转码";
  if (kind === 2) return "上传原片后转码为 HLS，对象落在 MinIO cartoon/（与 media/ 同级）";
  if (kind === 3) return "上传原片后转码为 HLS，对象落在 MinIO video/（与 media/ 同级）";
  if (kind === 4) return "zip 导入正文进 PostgreSQL，封面写 my-media/novels/，无需转码";
  if (kind === 5) return "zip 分片上传后异步入库，对象落在 MinIO drama/；剧集走原转码队列转 HLS";
  return "上传原片后转码为 HLS，封面自动截取";
}

function isSeriesListKind(kind: number) {
  return kind === 1 || kind === 4 || kind === 5;
}

function paneCreateLabel(kind: number) {
  if (kind === 2) return "新建动漫";
  if (kind === 3) return "新建抖音";
  if (kind === 5) return "新建短剧";
  return "新建视频";
}

function paneTitlePlaceholder(kind: number) {
  if (kind === 2) return "动漫标题";
  if (kind === 3) return "抖音标题";
  if (kind === 5) return "短剧标题";
  return "视频标题";
}

const currentPane = computed(
  () => managePanes.find((p) => p.name === pageTab.value) ?? managePanes[0],
);

const loading = ref(false);
const tableData = ref<MediaApi.AssetItem[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchForm = reactive({ keyword: "", status: -1, kind: 0 });

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
      kind: searchForm.kind,
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

function onPageTabChange(name: string | number) {
  if (name === "config") return;
  const pane = managePanes.find((p) => p.name === name);
  searchForm.kind = pane?.kind ?? 0;
  pagination.current = 1;
  void fetchList();
}

// ---------- 创建 ----------
const createVisible = ref(false);
const creating = ref(false);
const createForm = reactive({ title: "", remark: "", intro: "", update_status: 1 });

function openCreate() {
  createForm.title = "";
  createForm.remark = "";
  createForm.intro = "";
  createForm.update_status = 1;
  createVisible.value = true;
}

const importVisible = ref(false);
const novelImportVisible = ref(false);
const importing = ref(false);
const importFile = ref<File | null>(null);
const importResume = ref(false);
const importResult = ref<MediaApi.ImportComicsData | null>(null);
const dramaImportVisible = ref(false);
const dramaImporting = ref(false);
const dramaImportFile = ref<File | null>(null);
const dramaImportConfirmed = ref(false);
const dramaImportError = ref("");
const dramaImportGroups = ref<DramaZipGroup[]>([]);
const dramaImportLimits = ref<DramaImportLimits | null>(null);
const dramaImportTargets = ref<{ id: string; title: string }[]>([]);
const dramaUploadSessionId = ref("");
const dramaUploadPercent = ref(0);
const dramaUploadPhase = ref<"idle" | "upload" | "complete" | "job">("idle");
const dramaImportJob = ref<MediaApi.DramaImportJob | null>(null);
let dramaJobTimer: number | null = null;
const dramaEdit = reactive({ title: "", intro: "", remark: "", update_status: 1 });
const episodeForm = reactive({ seq: 1, title: "" });
const selectedEpisodeId = ref("");
const savingDrama = ref(false);
const addingEpisode = ref(false);


function openImport() {
  importFile.value = null;
  importResult.value = null;
  importResume.value = false;
  importVisible.value = true;
}

function onImportFileChange(file: { raw?: File }) {
  importFile.value = file?.raw || null;
}

async function submitImport() {
  if (!importFile.value) {
    ElMessage.warning("请选择 zip");
    return;
  }
  importing.value = true;
  try {
    const data = await importComicsZipApi(importFile.value, importResume.value);
    importResult.value = data;
    ElMessage.success(`已导入 ${data.imported} 部漫画`);
    pageTab.value = "comics";
    searchForm.kind = 1;
    pagination.current = 1;
    await fetchList();
  } catch (e: any) {
    ElMessage.error(e?.message || "导入失败");
  } finally {
    importing.value = false;
  }
}

function openNovelImport() {
  importFile.value = null;
  importResult.value = null;
  importResume.value = false;
  novelImportVisible.value = true;
}

async function submitNovelImport() {
  if (!importFile.value) {
    ElMessage.warning("请选择 zip");
    return;
  }
  importing.value = true;
  try {
    const data = await importNovelZipApi(importFile.value, importResume.value);
    importResult.value = data;
    ElMessage.success(`已导入 ${data.imported} 部小说`);
    pageTab.value = "novel";
    searchForm.kind = 4;
    pagination.current = 1;
    await fetchList();
  } catch (e: any) {
    ElMessage.error(e?.message || "导入失败");
  } finally {
    importing.value = false;
  }
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
      kind: searchForm.kind,
      intro: createForm.intro.trim() || undefined,
      update_status: searchForm.kind === 5 ? createForm.update_status : undefined,
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
const replacingCover = ref(false);
const transcoding = ref(false);
const deleting = ref(false);
const deletingChapter = ref(0);
const uploadPercent = ref(0);
const coverSeekSec = ref(8);
const previewChapter = ref(0);
const savingChapter = ref(false);
const addingChapter = ref(false);
const addChapterVisible = ref(false);
const novelEdit = reactive({ title: "", content: "" });
const addChapterForm = reactive({ seq: 1, title: "", content: "" });
const previewChapters = computed(() => {
  const list = [...(detail.value?.chapters || [])];
  list.sort((a, b) => {
    const sa = Number(a.seq) || 0;
    const sb = Number(b.seq) || 0;
    if (sa !== sb) return sa - sb;
    return String(a.title || "").localeCompare(String(b.title || ""), "zh");
  });
  return list;
});
const videoRef = ref<HTMLVideoElement | null>(null);
const playerError = ref("");
let hlsPlayer: Hls | null = null;

// ---- 清晰度切换(多码率 master.m3u8 时可用) ----
const qualityLevels = ref<{ index: number; label: string }[]>([]);
const currentQuality = ref(-1); // -1 = 自动
const activeQualityLabel = ref(""); // 自动模式下当前实际档位

function resetQuality() {
  qualityLevels.value = [];
  currentQuality.value = -1;
  activeQualityLabel.value = "";
}

function onQualityChange(v: number | string | boolean | undefined) {
  const idx = Number(v);
  currentQuality.value = idx;
  if (!hlsPlayer) return;
  // -1 交回 ABR 自动; 其他立即切到指定档
  hlsPlayer.currentLevel = idx;
  if (idx >= 0) {
    activeQualityLabel.value = "";
  }
}

function destroyPlayer() {
  playerError.value = "";
  resetQuality();
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

  // hls.js 优先: Chrome 新版内置 HLS 会让 canPlayType 返回非空, 但嵌入播放不稳定(卡 0:00)
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
      resetQuality();
    });
    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
      const levels = hlsPlayer?.levels ?? [];
      // 单档不显示切换菜单
      qualityLevels.value =
        levels.length > 1
          ? levels.map((lv, i) => ({
              index: i,
              label:
                (lv as any).name ||
                (lv.height ? `${lv.height}p` : `${Math.round(lv.bitrate / 1000)}k`),
            }))
          : [];
      currentQuality.value = -1;
    });
    hlsPlayer.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
      // 自动模式下显示 ABR 当前实际档位
      if (currentQuality.value === -1) {
        const lv = hlsPlayer?.levels?.[data.level];
        activeQualityLabel.value = lv
          ? (lv as any).name || (lv.height ? `${lv.height}p` : "")
          : "";
      }
    });
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(el);
    return;
  }
  // 原生兜底(Safari 等)
  if (el.canPlayType("application/vnd.apple.mpegurl")) {
    el.src = url;
    return;
  }
  playerError.value = "当前浏览器不支持 HLS 播放";
}

const playTargetUrl = computed(() => {
  if (!detail.value) return "";
  if (detail.value.kind === 5) {
    const ep = (detail.value.episodes || []).find((x) => x.id === selectedEpisodeId.value);
    return ep?.play_url || "";
  }
  return detail.value.play_url || "";
});

watch(
  () => [detailVisible.value, playTargetUrl.value] as const,
  ([visible, url]) => {
    if (visible && url) {
      void setupPlayer(url);
    } else {
      destroyPlayer();
    }
  },
);

onBeforeUnmount(() => { stopDramaJobPoll(); destroyPlayer(); });

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  coverSeekSec.value = 8;
  previewChapter.value = 0;
  destroyPlayer();
  try {
    detail.value = await getMediaAssetDetailApi(id);
    syncDramaDetail(detail.value);
  } finally {
    detailLoading.value = false;
  }
}

function syncDramaDetail(d: MediaApi.AssetDetail | null) {
  if (!d || d.kind !== 5) {
    selectedEpisodeId.value = "";
    return;
  }
  dramaEdit.title = d.title || "";
  dramaEdit.intro = d.intro || "";
  dramaEdit.remark = d.remark || "";
  dramaEdit.update_status = d.update_status === 2 ? 2 : 1;
  const eps = d.episodes || [];
  if (selectedEpisodeId.value && eps.some((x) => x.id === selectedEpisodeId.value)) return;
  selectedEpisodeId.value = eps[0]?.id || "";
  if (eps.length) {
    const maxSeq = eps.reduce((m, x) => Math.max(m, x.seq || 0), 0);
    episodeForm.seq = maxSeq + 1;
    episodeForm.title = "";
  } else {
    episodeForm.seq = 1;
    episodeForm.title = "";
  }
}

async function refreshDetail() {
  if (!detail.value) return;
  const id = detail.value.id;
  detailLoading.value = true;
  try {
    detail.value = await getMediaAssetDetailApi(id);
    syncDramaDetail(detail.value);
    await fetchList();
  } finally {
    detailLoading.value = false;
  }
}

function mediaWorkId() {
  if (detail.value?.kind === 5) return selectedEpisodeId.value;
  return detail.value?.id || "";
}

async function onFileChange(file: { raw?: File }) {
  const raw = file?.raw;
  if (!raw || !detail.value) return;
  const targetId = mediaWorkId();
  if (!targetId) {
    ElMessage.warning("请先选择或新建一集");
    return;
  }
  uploading.value = true;
  uploadPercent.value = 0;
  try {
    const { upload_url } = await getMediaUploadUrlApi(targetId, raw.name);
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

async function onCoverChange(file: { raw?: File }) {
  const raw = file?.raw;
  if (!raw || !detail.value) return;
  replacingCover.value = true;
  try {
    await replaceMediaCoverApi(detail.value.id, raw);
    ElMessage.success("封面已替换");
    await refreshDetail();
  } catch (e: any) {
    ElMessage.error(e?.message || "替换封面失败");
  } finally {
    replacingCover.value = false;
  }
}

async function onTranscode() {
  if (!detail.value) return;
  const targetId = mediaWorkId();
  const ep = (detail.value.episodes || []).find((x) => x.id === targetId);
  const hasSource = detail.value.kind === 5 ? Boolean(ep?.source_key) : Boolean(detail.value.source_key);
  if (!targetId || !hasSource) {
    ElMessage.warning("请先上传原片");
    return;
  }
  transcoding.value = true;
  try {
    const res = await triggerMediaTranscodeApi(targetId, {
      cover_seek_sec: coverSeekSec.value ?? 8,
    });
    ElMessage.success(`已投递转码 job_id=${res.job_id}，完成后请点「刷新状态」`);
    await refreshDetail();
  } finally {
    transcoding.value = false;
  }
}

function openPlay() {
  const url = playTargetUrl.value || detail.value?.play_url;
  if (url) window.open(url, "_blank");
}

async function saveDrama() {
  if (!detail.value || detail.value.kind !== 5) return;
  if (!dramaEdit.title.trim()) {
    ElMessage.warning("请填写标题");
    return;
  }
  savingDrama.value = true;
  try {
    await updateMediaAssetApi(detail.value.id, {
      title: dramaEdit.title.trim(),
      intro: dramaEdit.intro.trim(),
      remark: dramaEdit.remark.trim(),
      update_status: dramaEdit.update_status,
    });
    ElMessage.success("已保存");
    await refreshDetail();
  } finally {
    savingDrama.value = false;
  }
}

function onSelectEpisodeRow(row: MediaApi.DramaEpisode) {
  selectedEpisodeId.value = row.id;
}

async function addEpisode() {
  if (!detail.value) return;
  if (episodeForm.seq < 1) {
    ElMessage.warning("集号必须从 1 开始");
    return;
  }
  addingEpisode.value = true;
  try {
    const res = await createMediaEpisodeApi(detail.value.id, {
      seq: episodeForm.seq,
      title: episodeForm.title.trim() || undefined,
    });
    selectedEpisodeId.value = res.id;
    ElMessage.success(res.created ? "已新增剧集" : "该集号已存在，已打开原记录");
    await refreshDetail();
  } finally {
    addingEpisode.value = false;
  }
}

async function onDeleteEpisode(ep: MediaApi.DramaEpisode) {
  try {
    await ElMessageBox.confirm(
      `确认删除「第${ep.seq}集 ${ep.title}」？将清理该集对象存储，且不可恢复。`,
      "删除剧集",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  deleting.value = true;
  try {
    await deleteMediaAssetApi(ep.id);
    if (selectedEpisodeId.value === ep.id) selectedEpisodeId.value = "";
    ElMessage.success("已删除剧集");
    await refreshDetail();
  } finally {
    deleting.value = false;
  }
}

function stopDramaJobPoll() {
  if (dramaJobTimer != null) {
    window.clearInterval(dramaJobTimer);
    dramaJobTimer = null;
  }
}

function dramaJobStatusText(job: MediaApi.DramaImportJob | null) {
  if (!job) return "";
  if (job.status === "queued") return "已排队，等待后台导入";
  if (job.status === "running") return job.message || "正在解压入库";
  if (job.status === "import_done") {
    return `入库完成（不等于全部转码完成）。转码就绪 ${job.episode_ready}/${job.episode_total}，处理中 ${job.episode_processing}，失败 ${job.episode_failed}`;
  }
  if (job.status === "succeeded") return `全部 ${job.episode_total} 集已转码完成`;
  if (job.status === "failed") return job.error || job.message || "导入失败";
  if (job.status === "canceled") return "任务已取消";
  return job.message || job.status;
}

async function pollDramaImportJob(id: string) {
  const job = await getDramaImportJobApi(id);
  dramaImportJob.value = job;
  if (job.status === "succeeded" || job.status === "failed" || job.status === "canceled") {
    stopDramaJobPoll();
    if (job.status === "succeeded") {
      pageTab.value = "drama";
      searchForm.kind = 5;
      pagination.current = 1;
      await fetchList();
    }
  }
}

function startDramaJobPoll(id: string) {
  stopDramaJobPoll();
  dramaUploadPhase.value = "job";
  pollDramaImportJob(id).catch((e) => {
    ElMessage.error(e?.message || "查询导入任务失败");
  });
  dramaJobTimer = window.setInterval(() => {
    pollDramaImportJob(id).catch(() => undefined);
  }, 2000);
}

async function openDramaImport() {
  stopDramaJobPoll();
  dramaImportFile.value = null;
  dramaImportGroups.value = [];
  dramaImportError.value = "";
  dramaImportJob.value = null;
  dramaUploadSessionId.value = "";
  dramaUploadPercent.value = 0;
  dramaUploadPhase.value = "idle";
  dramaImportConfirmed.value = false;
  dramaImportVisible.value = true;
  try {
    dramaImportLimits.value = await getDramaImportLimitsApi();
  } catch {
    dramaImportLimits.value = { ...defaultDramaImportLimits };
  }
  try {
    const data = await getMediaAssetListApi({ page: 1, size: 200, kind: 5 });
    dramaImportTargets.value = (data?.list || []).map((it) => ({ id: it.id, title: it.title }));
  } catch {
    dramaImportTargets.value = [];
  }
}

async function onDramaZipChange(file: { raw?: File }) {
  const raw = file?.raw;
  dramaImportFile.value = raw || null;
  dramaImportGroups.value = [];
  dramaImportError.value = "";
  dramaImportJob.value = null;
  dramaUploadSessionId.value = "";
  dramaUploadPercent.value = 0;
  dramaUploadPhase.value = "idle";
  dramaImportConfirmed.value = false;
  if (!raw) return;
  const lim = dramaImportLimits.value;
  if (lim && raw.size > lim.max_zip_bytes) {
    dramaImportError.value = `压缩包大小 ${humanBytes(raw.size)} 超过上限 ${humanBytes(lim.max_zip_bytes)}`;
    return;
  }
  try {
    const entries = await listZipEntries(raw);
    if (lim) {
      const err = checkZipLimits(raw.size, entries, lim);
      if (err) {
        dramaImportError.value = err;
        return;
      }
    }
    dramaImportGroups.value = groupDramaZip(entries, raw.name);
  } catch (e: any) {
    dramaImportError.value = e?.message || "无法解析压缩包";
  }
}

async function submitDramaImport() {
  if (!dramaImportFile.value) {
    ElMessage.warning("请选择 zip");
    return;
  }
  if (dramaImportError.value) {
    ElMessage.warning(dramaImportError.value);
    return;
  }
  const needs = dramaImportGroups.value.some((g) => g.needsConfirm);
  if (needs && !dramaImportConfirmed.value) {
    ElMessage.warning("存在需确认项，请核对集号和封面后再勾选确认");
    return;
  }
  for (const g of dramaImportGroups.value) {
    if (!g.title.trim()) {
      ElMessage.warning("短剧标题不能为空");
      return;
    }
    const seen = new Set<number>();
    for (const v of g.videos) {
      if (!v.hasSeq || v.seq < 1) {
        ElMessage.warning(`「${g.title}」还有未确认的集号`);
        return;
      }
      if (seen.has(v.seq)) {
        ElMessage.warning(`「${g.title}」集号 ${v.seq} 重复`);
        return;
      }
      seen.add(v.seq);
    }
  }
  dramaImporting.value = true;
  dramaUploadPhase.value = "upload";
  try {
    const done = await uploadDramaZipAndEnqueue(dramaImportFile.value, {
      plan: buildImportPlan(dramaImportGroups.value),
      limits: dramaImportLimits.value || defaultDramaImportLimits,
      sessionId: dramaUploadSessionId.value || undefined,
      onProgress: (p) => {
        dramaUploadSessionId.value = dramaUploadSessionId.value;
        dramaUploadPhase.value = p.phase;
        dramaUploadPercent.value = p.total > 0 ? Math.min(100, Math.round((p.uploadedBytes / p.total) * 100)) : 0;
      },
    });
    dramaUploadSessionId.value = done.session_id;
    dramaUploadPercent.value = 100;
    ElMessage.success("分片已提交，后台正在导入。入库完成不等于全部转码完成。");
    startDramaJobPoll(done.job_id);
  } catch (e: any) {
    ElMessage.error(e?.message || "上传失败");
  } finally {
    dramaImporting.value = false;
  }
}

async function retryDramaImport() {
  const job = dramaImportJob.value;
  if (!job?.id) return;
  try {
    const next = await retryDramaImportJobApi(job.id);
    dramaImportJob.value = next;
    ElMessage.success("已提交重试");
    startDramaJobPoll(next.id);
  } catch (e: any) {
    ElMessage.error(e?.message || "重试失败");
  }
}

function dramaCoverOptions(g: DramaZipGroup) {
  return [{ path: "", name: "暂不设置" }, ...g.covers.map((c) => ({ path: c.path, name: c.name }))];
}

function syncNovelEdit() {
  const ch = previewChapters.value[previewChapter.value];
  novelEdit.title = ch?.title || "";
  novelEdit.content = ch?.content || "";
}

watch(
  () => [previewChapter.value, detail.value?.id, previewChapters.value.length] as const,
  syncNovelEdit,
);

function openAddChapter() {
  const max = previewChapters.value.reduce((m, ch) => Math.max(m, Number(ch.seq) || 0), 0);
  addChapterForm.seq = max + 1;
  addChapterForm.title = `第${max + 1}章`;
  addChapterForm.content = "";
  addChapterVisible.value = true;
}

async function onAddChapter() {
  if (!detail.value) return;
  const title = addChapterForm.title.trim();
  if (!title) {
    ElMessage.warning("请填写章节标题");
    return;
  }
  addingChapter.value = true;
  try {
    const res = await createMediaNovelChapterApi(detail.value.id, {
      seq: addChapterForm.seq,
      title,
      content: addChapterForm.content,
    });
    ElMessage.success(`已新增第${res.seq}章`);
    addChapterVisible.value = false;
    await refreshDetail();
    const idx = previewChapters.value.findIndex((item) => item.seq === res.seq);
    previewChapter.value = idx >= 0 ? idx : previewChapters.value.length - 1;
  } catch (e: any) {
    ElMessage.error(e?.message || "新增章节失败");
  } finally {
    addingChapter.value = false;
  }
}

async function onSaveChapter() {
  if (!detail.value) return;
  const ch = previewChapters.value[previewChapter.value];
  if (!ch) return;
  const title = novelEdit.title.trim();
  if (!title) {
    ElMessage.warning("请填写章节标题");
    return;
  }
  savingChapter.value = true;
  try {
    await updateMediaNovelChapterApi(detail.value.id, ch.seq, {
      title,
      content: novelEdit.content,
    });
    ElMessage.success("章节已保存");
    const staySeq = ch.seq;
    await refreshDetail();
    const next = previewChapters.value.findIndex((item) => item.seq === staySeq);
    if (next >= 0) previewChapter.value = next;
  } catch (e: any) {
    ElMessage.error(e?.message || "保存章节失败");
  } finally {
    savingChapter.value = false;
  }
}

async function onDeleteChapter(ch: MediaApi.ComicChapter) {
  if (!detail.value) return;
  try {
    await ElMessageBox.confirm(
      detail.value.kind === 4
        ? `确认删除第${ch.seq}章「${ch.title || ""}」？正文会一并删除且不可恢复。`
        : `确认删除第${ch.seq}话「${ch.title || ""}」？该集页图会一并删除且不可恢复。`,
      "删除章节",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  const staySeq = previewChapters.value[previewChapter.value]?.seq;
  deletingChapter.value = ch.seq;
  try {
    await deleteMediaComicChapterApi(detail.value.id, ch.seq);
    ElMessage.success(`已删除第${ch.seq}话`);
    await refreshDetail();
    const next = previewChapters.value.findIndex((item) => item.seq === staySeq);
    if (next >= 0) {
      previewChapter.value = next;
    } else {
      previewChapter.value = Math.min(
        previewChapter.value,
        Math.max(previewChapters.value.length - 1, 0),
      );
    }
  } finally {
    deletingChapter.value = 0;
  }
}

async function onDelete(row?: { id: string; title: string }) {
  const target = row ?? detail.value;
  if (!target) return;
  try {
    const extra =
      detail.value?.kind === 5 && detail.value.id === target.id
        ? "将同时删除该短剧下全部剧集及对象存储，且不可恢复。"
        : "将同时清理 MinIO 对象，且不可恢复。";
    await ElMessageBox.confirm(
      `确认删除「${target.title}」？${extra}`,
      "删除媒资",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  deleting.value = true;
  try {
    await deleteMediaAssetApi(target.id);
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
    <ElTabs v-model="pageTab" type="border-card" @tab-change="onPageTabChange">
    <ElTabPane
      v-for="pane in managePanes"
      :key="pane.name"
      :label="pane.label"
      :name="pane.name"
    >
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
            <div class="text-base font-semibold">{{ pane.label }}</div>
            <div class="mt-1 text-xs text-gray-500">
              {{ paneHint(pane.kind) }}
            </div>
          </div>
          <ElButton
            v-if="pane.kind === 1"
            :disabled="!configured"
            @click="openImport"
          >
            批量上传漫画
          </ElButton>
          <ElButton
            v-else-if="pane.kind === 4"
            :disabled="!configured"
            @click="openNovelImport"
          >
            批量上传小说
          </ElButton>
          <template v-else-if="pane.kind === 5">
            <ElButton :disabled="!configured" @click="openDramaImport">
              批量上传短剧
            </ElButton>
            <ElButton type="primary" :disabled="!configured" @click="openCreate">
              新建短剧
            </ElButton>
          </template>
          <ElButton
            v-else
            type="primary"
            :disabled="!configured"
            @click="openCreate"
          >
            {{ paneCreateLabel(pane.kind) }}
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
        <ElTableColumn
          v-if="isSeriesListKind(pane.kind)"
          :label="pane.kind === 5 ? '集数' : '章节'"
          width="90"
        >
          <template #default="{ row }">
            {{ row.chapter_count || 0 }} {{ pane.kind === 5 ? "集" : "章" }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          v-if="pane.kind === 4"
          label="字数"
          width="100"
        >
          <template #default="{ row }">
            {{ row.word_count || 0 }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          v-if="!isSeriesListKind(pane.kind)"
          prop="transcode_status"
          label="转码"
          width="110"
        />
        <ElTableColumn v-if="!isSeriesListKind(pane.kind)" label="时长" width="90">
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
    </ElTabPane>
    <ElTabPane label="配置发布" name="config" lazy>
      <ConfigPublish service="media" />
    </ElTabPane>
    </ElTabs>

    <!-- 新建 -->
    <ElDialog
      v-model="createVisible"
      :title="paneCreateLabel(currentPane.kind)"
      width="480px"
      destroy-on-close
    >
      <ElForm label-width="80px">
        <ElFormItem label="标题" required>
          <ElInput
            v-model="createForm.title"
            :placeholder="paneTitlePlaceholder(currentPane.kind)"
          />
        </ElFormItem>
        <ElFormItem v-if="currentPane.kind === 5" label="简介">
          <ElInput v-model="createForm.intro" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem v-if="currentPane.kind === 5" label="更新">
          <ElRadioGroup v-model="createForm.update_status">
            <ElRadioButton :value="1">连载</ElRadioButton>
            <ElRadioButton :value="2">完结</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="createForm.remark" type="textarea" :rows="2" />
        </ElFormItem>
        <p v-if="currentPane.kind !== 5" class="mb-0 pl-[80px] text-xs text-gray-400">
          封面由转码自动截取，无需手动填写
        </p>
        <p v-else class="mb-0 pl-[80px] text-xs text-gray-400">
          主封面请在详情里上传；也可使用「批量上传短剧」按目录打包导入
        </p>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="creating" @click="submitCreate">
          创建
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="importVisible" title="批量上传漫画" width="640px" destroy-on-close>
      <p class="mb-3 text-sm leading-relaxed text-gray-600">
        按下面目录打成 zip 上传。章节文件夹可以是「漫画名第1话」，也可以是「001_漫画名」（导入后变成「漫画名 第1话」）。
        一个 zip 里可以有多部漫画，单包不超过 2GB。zip 内可用 jpg/png；入库后封面与内页都会加密成
        <code>.bnc</code>。
      </p>
      <pre class="mb-4 overflow-auto rounded bg-gray-50 p-3 text-xs leading-6 text-gray-700">漫画名/
  cover.jpg                 → 入库 cover.bnc
  info.json                 可选，title / description / writer / types
  001_漫画名/                 导入后章节名为「漫画名 第1话」
    page_001.jpg            → 入库 page_001.bnc
  漫画名第2话/                也可直接用第N话
    chapter_info.json       可选
    page_001.jpg</pre>
      <ElUpload
        :auto-upload="false"
        :limit="1"
        accept=".zip,application/zip"
        :on-change="onImportFileChange"
      >
        <ElButton>选择 zip</ElButton>
      </ElUpload>
      <div class="mt-3 flex items-center gap-2">
        <span class="text-sm text-gray-700">续载</span>
        <ElSwitch v-model="importResume" />
        <span class="text-xs text-gray-400">
          关闭时名称已存在会停止；开启后追加新话，已有话数跳过
        </span>
      </div>
      <div v-if="importResult" class="mt-4 text-sm">
        <p>
          成功 {{ importResult.imported }} 部
          <span v-if="importResult.failed_count">，失败 {{ importResult.failed_count }}</span>
        </p>
        <ul v-if="importResult.list?.length" class="mt-2 list-disc pl-5">
          <li v-for="item in importResult.list" :key="item.id">
            <template v-if="item.appended">
              {{ item.title }} · 追加 {{ item.chapter_count }} 章
              <span v-if="item.skipped_count"> · 跳过 {{ item.skipped_count }} 章</span>
            </template>
            <template v-else>
              {{ item.title }} · {{ item.chapter_count }} 章 · {{ item.page_count }} 页
            </template>
          </li>
        </ul>
        <ul v-if="importResult.failed?.length" class="mt-2 list-disc pl-5 text-red-500">
          <li v-for="(item, i) in importResult.failed" :key="i">
            {{ item.title }}：{{ item.error }}
          </li>
        </ul>
      </div>
      <template #footer>
        <ElButton @click="importVisible = false">关闭</ElButton>
        <ElButton type="primary" :loading="importing" @click="submitImport">
          开始导入
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="novelImportVisible" title="批量上传小说" width="640px" destroy-on-close>
      <p class="mb-3 text-sm leading-relaxed text-gray-600">
        按下面目录打成 zip 上传。兼容采集工具
        <code>library/</code>
        的书目录。一个 zip 可含多部，单包不超过 200MB。正文写入数据库；封面可选，入库成
        <code>novels/{code}/cover.bnc</code>。
      </p>
      <pre class="mb-4 overflow-auto rounded bg-gray-50 p-3 text-xs leading-6 text-gray-700">书名/
  meta.json                 可选
  cover.jpg                 可选，入库成 cover.bnc
  01-第一章.txt
  02-第二章.txt

分类/书名/                  也可带一层分类目录
  01-第一章.txt</pre>
      <ElUpload
        :auto-upload="false"
        :limit="1"
        accept=".zip,application/zip"
        :on-change="onImportFileChange"
      >
        <ElButton>选择 zip</ElButton>
      </ElUpload>
      <div class="mt-3 flex items-center gap-2">
        <span class="text-sm text-gray-700">续载</span>
        <ElSwitch v-model="importResume" />
        <span class="text-xs text-gray-400">
          关闭时名称已存在会停止；开启后追加新章，已有章序跳过
        </span>
      </div>
      <div v-if="importResult" class="mt-4 text-sm">
        <p>
          成功 {{ importResult.imported }} 部
          <span v-if="importResult.failed_count">，失败 {{ importResult.failed_count }}</span>
        </p>
        <ul v-if="importResult.list?.length" class="mt-2 list-disc pl-5">
          <li v-for="item in importResult.list" :key="item.id">
            <template v-if="item.appended">
              {{ item.title }} · 追加 {{ item.chapter_count }} 章
              <span v-if="item.skipped_count"> · 跳过 {{ item.skipped_count }} 章</span>
            </template>
            <template v-else>
              {{ item.title }} · {{ item.chapter_count }} 章
              <span v-if="item.word_count"> · {{ item.word_count }} 字</span>
            </template>
          </li>
        </ul>
        <ul v-if="importResult.failed?.length" class="mt-2 list-disc pl-5 text-red-500">
          <li v-for="(item, i) in importResult.failed" :key="i">
            {{ item.title }}：{{ item.error }}
          </li>
        </ul>
      </div>
      <template #footer>
        <ElButton @click="novelImportVisible = false">关闭</ElButton>
        <ElButton type="primary" :loading="importing" @click="submitNovelImport">
          开始导入
        </ElButton>
      </template>
    </ElDialog>


    <ElDialog v-model="dramaImportVisible" title="批量上传短剧" width="860px" destroy-on-close @closed="stopDramaJobPoll">
      <p class="mb-3 text-sm leading-relaxed text-gray-600">
        先在本地把短剧目录打成 zip 再分片上传（不要把多部剧的视频摊在压缩包根目录以外的零散位置）。
        目录名即剧名，目录内放各集视频和一张封面；支持一次打包多部。
        整包上限
        {{ humanBytes((dramaImportLimits || defaultDramaImportLimits).max_zip_bytes) }}
        ，单集上限
        {{ humanBytes((dramaImportLimits || defaultDramaImportLimits).max_file_bytes) }}
        ，单片约
        {{ humanBytes((dramaImportLimits || defaultDramaImportLimits).max_chunk_bytes || 32 * 1024 * 1024) }}
        （须小于公网约 100MB 的单次请求限制）。上传完成后立即进入后台任务：先解压入库，再逐集走原转码队列；入库完成不等于全部转码完成。
        默认创建新剧；若要向已有短剧追加集数，请显式选择目标，不要靠修改标题识别。ZIP 通常不会明显减小视频体积。
      </p>
      <pre class="mb-4 overflow-auto rounded bg-gray-50 p-3 text-xs leading-6 text-gray-700">剧名或父目录/
  剧名/
    剧名_第01集.mp4
    剧名_第02集.mp4
    cover.jpg                 也可以是采集得到的单张 jpeg
  另一部剧/
    另一部剧_第01集.mp4</pre>
      <ElUpload :auto-upload="false" :limit="1" accept=".zip,application/zip" :on-change="onDramaZipChange">
        <ElButton>选择 zip</ElButton>
      </ElUpload>
      <p v-if="dramaImportError" class="mt-3 text-sm text-red-500">{{ dramaImportError }}</p>
      <div v-if="dramaImportGroups.length" class="mt-4 space-y-4">
        <div v-for="(g, gi) in dramaImportGroups" :key="gi" class="rounded border p-3">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="text-sm text-gray-500">剧名</span>
            <ElInput v-model="g.title" class="!w-72" />
            <span class="text-sm text-gray-500">入库方式</span>
            <ElSelect v-model="g.targetId" placeholder="创建新剧" class="!w-64" clearable filterable>
              <ElOption label="创建新剧" value="" />
              <ElOption
                v-for="it in dramaImportTargets"
                :key="it.id"
                :label="`续传到「${it.title}」(${it.id})`"
                :value="it.id"
              />
            </ElSelect>
            <span class="text-sm text-gray-500">封面</span>
            <ElSelect v-model="g.coverPath" clearable placeholder="请选择" class="!w-56">
              <ElOption
                v-for="opt in dramaCoverOptions(g)"
                :key="opt.path || 'none'"
                :label="opt.name"
                :value="opt.path"
              />
            </ElSelect>
          </div>
          <ul v-if="g.warnings.length" class="mb-2 list-disc pl-5 text-xs text-amber-600">
            <li v-for="(w, wi) in g.warnings" :key="wi">{{ w }}</li>
          </ul>
          <ElTable :data="g.videos" size="small" border>
            <ElTableColumn label="集号" width="110">
              <template #default="{ row }">
                <ElInputNumber v-model="row.seq" :min="1" size="small" controls-position="right" class="!w-24" @change="row.hasSeq = row.seq >= 1" />
              </template>
            </ElTableColumn>
            <ElTableColumn prop="name" label="文件" min-width="220" show-overflow-tooltip />
            <ElTableColumn label="大小" width="100">
              <template #default="{ row }">{{ humanBytes(row.size) }}</template>
            </ElTableColumn>
          </ElTable>
        </div>
      </div>
      <div class="mt-2 flex items-center gap-2">
        <ElSwitch v-model="dramaImportConfirmed" />
        <span class="text-sm text-gray-700">已核对集号、封面和入库目标，确认导入</span>
      </div>
      <div v-if="dramaUploadPhase !== 'idle'" class="mt-4">
        <p class="mb-1 text-sm text-gray-600">
          <template v-if="dramaUploadPhase === 'upload' || dramaUploadPhase === 'complete'">上传进度（与后台导入任务分开）</template>
          <template v-else>后台任务进度</template>
        </p>
        <ElProgress v-if="dramaUploadPhase === 'upload' || dramaUploadPhase === 'complete'" :percentage="dramaUploadPercent" />
        <p v-if="dramaUploadPhase === 'complete'" class="mt-1 text-xs text-gray-500">正在创建导入任务…</p>
      </div>
      <div v-if="dramaImportJob" class="mt-4 text-sm">
        <p>任务 {{ dramaImportJob.id }} · {{ dramaJobStatusText(dramaImportJob) }}</p>
        <ElProgress
          class="mt-2"
          :percentage="dramaImportJob.status === 'succeeded' ? 100 : dramaImportJob.progress"
          :status="dramaImportJob.status === 'failed' ? 'exception' : dramaImportJob.status === 'succeeded' ? 'success' : undefined"
        />
        <ul v-if="dramaImportJob.list?.length" class="mt-2 list-disc pl-5">
          <li v-for="item in dramaImportJob.list" :key="item.id">
            {{ item.title }} · 入库 {{ item.chapter_count }} 集
            <span v-if="item.appended"> · 续传到 {{ item.id }}</span>
            <span v-if="item.skipped_count"> · 跳过已就绪 {{ item.skipped_count }} 集</span>
            · 转码就绪 {{ item.ready_count || 0 }}/{{ item.chapter_count }}
          </li>
        </ul>
        <ul v-if="dramaImportJob.failed?.length" class="mt-2 list-disc pl-5 text-red-500">
          <li v-for="(item, i) in dramaImportJob.failed" :key="i">
            {{ item.title }}：{{ item.error }}
          </li>
        </ul>
      </div>
      <template #footer>
        <ElButton @click="dramaImportVisible = false">关闭</ElButton>
        <ElButton
          v-if="dramaImportJob && (dramaImportJob.status === 'failed' || dramaImportJob.status === 'canceled' || (dramaImportJob.status === 'import_done' && (dramaImportJob.failed_count || dramaImportJob.episode_failed)))"
          @click="retryDramaImport"
        >
          重试失败步骤
        </ElButton>
        <ElButton type="primary" :loading="dramaImporting" :disabled="!!dramaImportError || !dramaImportFile || dramaUploadPhase === 'job'" @click="submitDramaImport">
          开始导入
        </ElButton>
      </template>
    </ElDialog>

    <!-- 详情弹窗 + 预览 -->
    <ElDialog
      v-model="detailVisible"
      title="媒资详情"
      :width="isSeriesListKind(detail?.kind || 0) ? '1080px' : '880px'"
      top="6vh"
      destroy-on-close
      align-center
      @closed="destroyPlayer"
    >
      <div v-loading="detailLoading">
        <template v-if="detail">
          <template v-if="detail.kind === 1">
            <div class="mb-4 flex gap-4">
              <div class="shrink-0">
                <ElImage
                  v-if="detail.cover_url"
                  :src="detail.cover_url"
                  :preview-src-list="[detail.cover_url]"
                  fit="cover"
                  preview-teleported
                  class="h-40 w-28 rounded border bg-gray-50"
                />
                <div class="mt-2">
                  <ElUpload
                    :auto-upload="false"
                    :show-file-list="false"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    :disabled="replacingCover"
                    :on-change="onCoverChange"
                  >
                    <ElButton size="small" :loading="replacingCover">
                      替换封面
                    </ElButton>
                  </ElUpload>
                </div>
              </div>
              <div class="min-w-0 text-sm">
                <div class="text-base font-medium">{{ detail.title }}</div>
                <div class="mt-2 text-gray-500">ID：{{ detail.id }}</div>
                <div v-if="detail.category" class="mt-1 text-gray-500">
                  分类：{{ detail.category }}
                </div>
                <div class="mt-1 text-gray-500">
                  共 {{ detail.chapter_count || detail.chapters?.length || 0 }} 章
                </div>
                <p v-if="detail.intro" class="mt-2 line-clamp-4 text-gray-600">
                  {{ detail.intro }}
                </p>
              </div>
            </div>
            <div class="flex min-h-[420px] gap-3">
              <aside
                class="flex w-52 shrink-0 flex-col overflow-hidden rounded border bg-white"
              >
                <div
                  class="border-b px-3 py-2 text-xs text-gray-500"
                >
                  共 {{ previewChapters.length }} 话
                </div>
                <div class="min-h-0 flex-1 overflow-y-auto">
                  <div
                    v-for="(ch, idx) in previewChapters"
                    :key="`${ch.seq}-${ch.title}`"
                    class="flex cursor-pointer items-center gap-1 border-b px-2 py-2 text-sm last:border-b-0"
                    :class="
                      previewChapter === idx
                        ? 'bg-rose-50 text-rose-600'
                        : 'hover:bg-gray-50'
                    "
                    @click="previewChapter = idx"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="truncate font-medium">第{{ ch.seq }}话</div>
                      <div class="truncate text-xs text-gray-400">
                        {{ ch.title || `${ch.page_count || 0} 页` }}
                      </div>
                    </div>
                    <ElButton
                      link
                      type="danger"
                      size="small"
                      :loading="deletingChapter === ch.seq"
                      @click.stop="onDeleteChapter(ch)"
                    >
                      删除
                    </ElButton>
                  </div>
                  <div
                    v-if="!previewChapters.length"
                    class="px-3 py-8 text-center text-xs text-gray-400"
                  >
                    暂无章节
                  </div>
                </div>
              </aside>
              <div
                v-if="previewChapters[previewChapter]?.pages?.length"
                :key="previewChapter"
                class="min-w-0 flex-1 overflow-y-auto rounded border bg-neutral-200"
                style="max-height: 62vh"
              >
                <div class="mx-auto w-[min(420px,100%)] bg-black">
                  <ElImage
                    v-for="(p, i) in previewChapters[previewChapter].pages"
                    :key="p.key"
                    :src="p.url"
                    :initial-index="i"
                    :preview-src-list="
                      previewChapters[previewChapter].pages.map((x) => x.url)
                    "
                    fit="contain"
                    preview-teleported
                    class="block w-full bg-black [&_.el-image__inner]:!h-auto [&_.el-image__inner]:!w-full"
                  />
                </div>
              </div>
              <div
                v-else
                class="flex min-w-0 flex-1 items-center justify-center rounded border bg-neutral-100 text-sm text-gray-400"
              >
                请选择左侧集数查看图集
              </div>
            </div>
            <div class="mb-3 mt-6 text-sm font-medium">删除</div>
            <ElButton type="danger" plain :loading="deleting" @click="onDelete">
              删除漫画（含 MinIO 页图）
            </ElButton>
          </template>
          <template v-else-if="detail.kind === 4">
            <div class="mb-4 flex gap-4">
              <div class="shrink-0">
                <ElImage
                  v-if="detail.cover_url"
                  :src="detail.cover_url"
                  :preview-src-list="[detail.cover_url]"
                  fit="cover"
                  preview-teleported
                  class="h-40 w-28 rounded border bg-gray-50"
                />
                <div class="mt-2">
                  <ElUpload
                    :auto-upload="false"
                    :show-file-list="false"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    :disabled="replacingCover"
                    :on-change="onCoverChange"
                  >
                    <ElButton size="small" :loading="replacingCover">
                      替换封面
                    </ElButton>
                  </ElUpload>
                </div>
              </div>
              <div class="min-w-0 text-sm">
                <div class="text-base font-medium">{{ detail.title }}</div>
                <div class="mt-2 text-gray-500">ID：{{ detail.id }}</div>
                <div v-if="detail.category" class="mt-1 text-gray-500">
                  分类：{{ detail.category }}
                </div>
                <div class="mt-1 text-gray-500">
                  共 {{ detail.chapter_count || detail.chapters?.length || 0 }} 章
                  <span v-if="detail.word_count"> · {{ detail.word_count }} 字</span>
                </div>
                <p v-if="detail.intro" class="mt-2 line-clamp-4 text-gray-600">
                  {{ detail.intro }}
                </p>
              </div>
            </div>
            <div class="flex min-h-[420px] gap-3">
              <aside
                class="flex w-52 shrink-0 flex-col overflow-hidden rounded border bg-white"
              >
                <div
                  class="flex items-center justify-between gap-1 border-b px-3 py-2 text-xs text-gray-500"
                >
                  <span>共 {{ previewChapters.length }} 章</span>
                  <ElButton link type="primary" size="small" @click="openAddChapter">
                    新增
                  </ElButton>
                </div>
                <div class="min-h-0 flex-1 overflow-y-auto">
                  <div
                    v-for="(ch, idx) in previewChapters"
                    :key="`${ch.seq}-${ch.title}`"
                    class="flex cursor-pointer items-center gap-1 border-b px-2 py-2 text-sm last:border-b-0"
                    :class="
                      previewChapter === idx
                        ? 'bg-rose-50 text-rose-600'
                        : 'hover:bg-gray-50'
                    "
                    @click="previewChapter = idx"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="truncate font-medium">第{{ ch.seq }}章</div>
                      <div class="truncate text-xs text-gray-400">
                        {{ ch.title || `${ch.word_count || 0} 字` }}
                      </div>
                    </div>
                    <ElButton
                      link
                      type="danger"
                      size="small"
                      :loading="deletingChapter === ch.seq"
                      @click.stop="onDeleteChapter(ch)"
                    >
                      删除
                    </ElButton>
                  </div>
                  <div
                    v-if="!previewChapters.length"
                    class="px-3 py-8 text-center text-xs text-gray-400"
                  >
                    暂无章节
                  </div>
                </div>
              </aside>
              <div
                v-if="previewChapters[previewChapter]"
                :key="previewChapters[previewChapter].seq"
                class="flex min-w-0 flex-1 flex-col overflow-hidden rounded border bg-white p-4"
                style="max-height: 62vh"
              >
                <ElInput
                  v-model="novelEdit.title"
                  placeholder="章节标题"
                  class="mb-2"
                />
                <div class="mb-2 text-xs text-gray-400">
                  {{ [...novelEdit.content].length }} 字
                </div>
                <ElInput
                  v-model="novelEdit.content"
                  type="textarea"
                  :rows="16"
                  placeholder="章节正文"
                />
                <div class="mt-3 flex justify-end">
                  <ElButton
                    type="primary"
                    :loading="savingChapter"
                    @click="onSaveChapter"
                  >
                    保存本章
                  </ElButton>
                </div>
              </div>
              <div
                v-else
                class="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded border bg-neutral-100 text-sm text-gray-400"
              >
                <span>暂无章节，先新增一章</span>
                <ElButton type="primary" @click="openAddChapter">新增章节</ElButton>
              </div>
            </div>
            <div class="mb-3 mt-6 text-sm font-medium">删除</div>
            <ElButton type="danger" plain :loading="deleting" @click="onDelete">
              删除小说
            </ElButton>
          </template>
          <template v-else-if="detail.kind === 5">
            <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="sm:col-span-2 flex flex-wrap items-start gap-4">
                <ElImage
                  v-if="detail.cover_url"
                  :src="detail.cover_url"
                  :preview-src-list="[detail.cover_url]"
                  fit="contain"
                  preview-teleported
                  class="h-40 w-28 rounded border bg-gray-50"
                />
                <div class="min-w-[220px]">
                  <div class="mb-2 text-sm text-gray-500">主封面</div>
                  <ElUpload
                    :auto-upload="false"
                    :show-file-list="false"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    :disabled="replacingCover"
                    :on-change="onCoverChange"
                  >
                    <ElButton size="small" :loading="replacingCover">
                      选择图片并替换
                    </ElButton>
                  </ElUpload>
                </div>
              </div>
              <ElFormItem label="标题">
                <ElInput v-model="dramaEdit.title" />
              </ElFormItem>
              <ElFormItem label="更新">
                <ElRadioGroup v-model="dramaEdit.update_status">
                  <ElRadioButton :value="1">连载</ElRadioButton>
                  <ElRadioButton :value="2">完结</ElRadioButton>
                </ElRadioGroup>
              </ElFormItem>
              <div class="sm:col-span-2">
                <div class="mb-1 text-sm text-gray-500">简介</div>
                <ElInput v-model="dramaEdit.intro" type="textarea" :rows="3" />
              </div>
              <div class="sm:col-span-2">
                <div class="mb-1 text-sm text-gray-500">备注</div>
                <ElInput v-model="dramaEdit.remark" type="textarea" :rows="2" />
              </div>
            </div>
            <div class="mb-4 flex flex-wrap gap-2">
              <ElButton type="primary" :loading="savingDrama" @click="saveDrama">
                保存资料
              </ElButton>
              <ElButton @click="refreshDetail">刷新状态</ElButton>
              <ElButton type="danger" plain :loading="deleting" @click="onDelete()">
                删除短剧（含全部剧集和对象）
              </ElButton>
            </div>

            <div class="mb-2 text-sm font-medium">剧集</div>
            <div class="mb-3 flex flex-wrap items-end gap-2">
              <span class="text-sm text-gray-500">集号</span>
              <ElInputNumber v-model="episodeForm.seq" :min="1" controls-position="right" class="!w-28" />
              <ElInput v-model="episodeForm.title" placeholder="可选标题，默认第N集" class="!w-48" />
              <ElButton type="primary" plain :loading="addingEpisode" @click="addEpisode">
                新增剧集
              </ElButton>
            </div>
            <ElTable
              :data="detail.episodes || []"
              stripe
              border
              highlight-current-row
              class="mb-4"
              @row-click="onSelectEpisodeRow"
            >
              <ElTableColumn prop="seq" label="集号" width="80" />
              <ElTableColumn prop="title" label="标题" min-width="140" show-overflow-tooltip />
              <ElTableColumn label="状态" width="100">
                <template #default="{ row }">
                  <ElTag :type="statusMeta[row.status]?.type || 'info'" size="small">
                    {{ statusMeta[row.status]?.label || row.status }}
                  </ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="transcode_status" label="转码" width="100" />
              <ElTableColumn label="时长" width="80">
                <template #default="{ row }">
                  {{ formatDuration(row.duration_sec) }}
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <ElButton link type="primary" @click.stop="selectedEpisodeId = row.id">
                    选择
                  </ElButton>
                  <ElButton link type="danger" @click.stop="onDeleteEpisode(row)">
                    删除
                  </ElButton>
                </template>
              </ElTableColumn>
            </ElTable>

            <template v-if="selectedEpisodeId">
              <div class="mb-3 text-sm font-medium">
                当前剧集：第{{ (detail.episodes || []).find((x) => x.id === selectedEpisodeId)?.seq }}集
              </div>
              <div class="mb-4 overflow-hidden rounded-md bg-black">
                <video
                  v-if="playTargetUrl"
                  ref="videoRef"
                  class="max-h-[360px] w-full"
                  controls
                  playsinline
                  preload="metadata"
                />
                <div v-else class="flex h-40 items-center justify-center text-sm text-gray-400">
                  暂无播放地址（上传并转码完成后可预览）
                </div>
              </div>
              <p v-if="playerError" class="mb-3 text-xs text-red-500">{{ playerError }}</p>
              <div class="mb-3 text-sm font-medium">1. 上传原片</div>
              <ElUpload
                :auto-upload="false"
                :show-file-list="false"
                accept="video/*,.mp4,.mov,.mkv"
                :disabled="uploading"
                :on-change="onFileChange"
              >
                <ElButton type="primary" plain :loading="uploading">选择视频并上传</ElButton>
              </ElUpload>
              <div v-if="uploading" class="mt-2 text-xs text-gray-500">上传中… {{ uploadPercent }}%</div>
              <div class="mb-3 mt-6 text-sm font-medium">2. 触发转码</div>
              <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <span class="text-gray-500">封面截取秒数</span>
                <ElInputNumber v-model="coverSeekSec" :min="0" :max="36000" :step="1" controls-position="right" class="!w-36" />
              </div>
              <div class="flex flex-wrap gap-2">
                <ElButton type="primary" :loading="transcoding" @click="onTranscode">开始转码（HLS）</ElButton>
                <ElButton :disabled="!playTargetUrl" @click="openPlay">打开播放地址</ElButton>
                <ElButton @click="refreshDetail">刷新状态</ElButton>
              </div>
            </template>
            <p class="mt-4 text-xs leading-relaxed text-gray-400">
              原片和 HLS 写入 MinIO drama/ 前缀。整部不转码。批量入库请打 zip：目录名即剧名，内含各集视频和一张封面。
            </p>
          </template>
          <template v-else>
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
          <div
            v-if="qualityLevels.length > 1"
            class="mb-3 flex items-center gap-2"
          >
            <span class="text-xs text-gray-500">清晰度：</span>
            <ElRadioGroup
              :model-value="currentQuality"
              size="small"
              @update:model-value="onQualityChange"
            >
              <ElRadioButton :value="-1">
                自动{{ activeQualityLabel ? `(${activeQualityLabel})` : "" }}
              </ElRadioButton>
              <ElRadioButton
                v-for="q in qualityLevels"
                :key="q.index"
                :value="q.index"
              >
                {{ q.label }}
              </ElRadioButton>
            </ElRadioGroup>
          </div>
          <p v-if="playerError" class="mb-3 text-xs text-red-500">
            {{ playerError }}
          </p>

          <div class="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><span class="text-gray-500">ID：</span>{{ detail.id }}</div>
            <div><span class="text-gray-500">标题：</span>{{ detail.title }}</div>
            <div class="sm:col-span-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-gray-500">替换封面</span>
                <ElUpload
                  :auto-upload="false"
                  :show-file-list="false"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  :disabled="replacingCover"
                  :on-change="onCoverChange"
                >
                  <ElButton size="small" :loading="replacingCover">
                    选择图片并替换
                  </ElButton>
                </ElUpload>
                <span class="text-xs text-gray-400">
                  覆盖当前封面，不触发转码；再次转码会按截取秒数重新生成
                </span>
              </div>
            </div>
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
        </template>
      </div>
    </ElDialog>

    <ElDialog
      v-model="addChapterVisible"
      title="新增章节"
      width="720px"
      destroy-on-close
      append-to-body
    >
      <ElForm label-width="72px">
        <ElFormItem label="章序">
          <ElInputNumber
            v-model="addChapterForm.seq"
            :min="1"
            :max="99999"
            controls-position="right"
            class="!w-36"
          />
        </ElFormItem>
        <ElFormItem label="标题">
          <ElInput v-model="addChapterForm.title" placeholder="章节标题" />
        </ElFormItem>
        <ElFormItem label="正文">
          <ElInput
            v-model="addChapterForm.content"
            type="textarea"
            :rows="14"
            placeholder="章节正文"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="addChapterVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="addingChapter" @click="onAddChapter">
          新增
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
