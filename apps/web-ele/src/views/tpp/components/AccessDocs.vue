<script lang="ts" setup>
import { ref } from "vue";

import {
  ElCollapse,
  ElCollapseItem,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import ApiEndpoint, { type ApiParam } from "./ApiEndpoint.vue";

defineOptions({ name: "TppAccessDocs" });

const MEDIA = "http://127.0.0.1:8004";
const STORAGE = "http://127.0.0.1:8015";
const AD = "http://127.0.0.1:8016";
const PLAY = "http://127.0.0.1:8006";

const docTab = ref("overview");
const mediaOpenKeys = ref(["m-o-0", "m-o-1", "m-o-2", "m-o-3"]);
const mediaAdminKeys = ref(["m-a-0", "m-a-1", "m-a-2", "m-a-3", "m-a-4", "m-a-5"]);
const storageOpenKeys = ref([
  "s-o-0",
  "s-o-1",
  "s-o-2",
  "s-o-3",
  "s-o-4",
  "s-o-5",
  "s-o-6",
]);
const storageAdminKeys = ref([
  "s-a-0",
  "s-a-1",
  "s-a-2",
  "s-a-3",
  "s-a-4",
  "s-a-5",
  "s-a-6",
  "s-a-7",
]);
const adOpenKeys = ref(["a-o-0", "a-o-1"]);
const playOpenKeys = ref(["p-o-0", "p-o-1", "p-o-2", "p-o-3"]);
const playAdminKeys = ref(["p-a-0", "p-a-1", "p-a-2", "p-a-3", "p-a-4"]);
const adAdminKeys = ref([
  "a-a-0",
  "a-a-1",
  "a-a-2",
  "a-a-3",
  "a-a-4",
  "a-a-5",
  "a-a-6",
  "a-a-7",
  "a-a-8",
  "a-a-9",
  "a-a-10",
  "a-a-11",
  "a-a-12",
]);

interface DocApi {
  key: string;
  title: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  summary: string;
  auth: "open" | "admin" | "none";
  base: string;
  tip?: string;
  params?: ApiParam[];
  bodyExample?: string;
  responseExample?: string;
  curl?: string;
}

const mediaOpenApis: DocApi[] = [
  {
    key: "m-o-0",
    title: "GET /open/assets · 可选用列表",
    method: "GET",
    path: "/open/assets",
    summary: "可选用媒资列表（仅就绪）",
    auth: "open",
    base: MEDIA,
    params: [
      { name: "page", in: "query", type: "int", desc: "页码", example: "1" },
      { name: "size", in: "query", type: "int", desc: "每页条数，默认20", example: "20" },
      { name: "keyword", in: "query", desc: "标题关键词" },
    ],
    responseExample: `{
  "list": [
    {
      "id": "Ab12Cd34Ef56Gh78",
      "title": "示例视频",
      "cover_url": "http://127.0.0.1:19000/.../cover.jpg",
      "play_url": "http://127.0.0.1:19000/.../index.m3u8",
      "duration_sec": 120,
      "picked": false
    }
  ],
  "total": 1
}`,
    curl: `curl -sS '${MEDIA}/open/assets?page=1&size=20&keyword=示例' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "m-o-1",
    title: "GET /open/assets/{id} · 详情",
    method: "GET",
    path: "/open/assets/{id}",
    summary: "媒资详情（未就绪返回不可用）",
    auth: "open",
    base: MEDIA,
    params: [
      {
        name: "id",
        in: "path",
        required: true,
        desc: "资产短码，8~16位",
        example: "Ab12Cd34Ef56Gh78",
      },
    ],
    responseExample: `{
  "id": "Ab12Cd34Ef56Gh78",
  "title": "示例视频",
  "cover_url": "...",
  "play_url": "...",
  "duration_sec": 120,
  "picked": true,
  "play_key": "media/hls/Ab12Cd34Ef56Gh78/index.m3u8"
}`,
    curl: `curl -sS '${MEDIA}/open/assets/Ab12Cd34Ef56Gh78' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "m-o-2",
    title: "POST /open/assets/{id}/pick · 选用",
    method: "POST",
    path: "/open/assets/{id}/pick",
    summary: "将媒资选用到本站（幂等）",
    auth: "open",
    base: MEDIA,
    tip: "无 JSON body，id 在 path。",
    params: [
      { name: "id", in: "path", required: true, desc: "资产短码", example: "Ab12Cd34Ef56Gh78" },
    ],
    responseExample: `{
  "id": "Ab12Cd34Ef56Gh78",
  "title": "示例视频",
  "cover_url": "...",
  "play_url": "...",
  "play_key": "media/hls/.../index.m3u8",
  "duration_sec": 120
}`,
    curl: `curl -sS -X POST '${MEDIA}/open/assets/Ab12Cd34Ef56Gh78/pick' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "m-o-3",
    title: "GET /open/picks · 已选用列表",
    method: "GET",
    path: "/open/picks",
    summary: "本站已选用媒资",
    auth: "open",
    base: MEDIA,
    params: [
      { name: "page", in: "query", type: "int", desc: "页码", example: "1" },
      { name: "size", in: "query", type: "int", desc: "每页条数", example: "20" },
    ],
    responseExample: `{
  "list": [
    {
      "id": "Ab12Cd34Ef56Gh78",
      "title": "示例视频",
      "cover_url": "...",
      "play_url": "...",
      "play_key": "...",
      "duration_sec": 120,
      "picked_at": "2026-08-10 01:00:00"
    }
  ],
  "total": 1
}`,
    curl: `curl -sS '${MEDIA}/open/picks?page=1&size=20' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
];

const mediaAdminApis: DocApi[] = [
  {
    key: "m-a-0",
    title: "GET /admin/assets · 列表",
    method: "GET",
    path: "/admin/assets",
    summary: "媒资池列表",
    auth: "admin",
    base: MEDIA,
    params: [
      { name: "page", in: "query", type: "int", desc: "页码", example: "1" },
      { name: "size", in: "query", type: "int", desc: "每页条数", example: "20" },
      { name: "keyword", in: "query", desc: "标题关键词" },
      { name: "status", in: "query", type: "int", desc: "状态，-1全部", example: "-1" },
    ],
    responseExample: `{
  "list": [
    {
      "id": "Ab12Cd34Ef56Gh78",
      "title": "示例视频",
      "cover_url": "",
      "status": 2,
      "transcode_status": "ready",
      "play_url": "...",
      "duration_sec": 120,
      "created_at": "2026-08-10 01:00:00"
    }
  ],
  "total": 1
}`,
    curl: `curl -sS '${MEDIA}/admin/assets?page=1&size=20&status=-1' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "m-a-1",
    title: "POST /admin/assets · 创建",
    method: "POST",
    path: "/admin/assets",
    summary: "创建资产元数据，返回短码 id",
    auth: "admin",
    base: MEDIA,
    params: [
      { name: "title", in: "body", required: true, desc: "标题" },
      { name: "cover_url", in: "body", desc: "封面，可空（转码后自动填）" },
      { name: "remark", in: "body", desc: "备注" },
    ],
    bodyExample: `{
  "title": "示例视频",
  "remark": "首测"
}`,
    responseExample: `{ "id": "Ab12Cd34Ef56Gh78" }`,
    curl: `curl -sS -X POST '${MEDIA}/admin/assets' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"title":"示例视频","remark":"首测"}'`,
  },
  {
    key: "m-a-2",
    title: "GET /admin/assets/{id} · 详情",
    method: "GET",
    path: "/admin/assets/{id}",
    summary: "资产详情（含原片 key、转码信息）",
    auth: "admin",
    base: MEDIA,
    params: [{ name: "id", in: "path", required: true, desc: "短码 8~16 位" }],
    responseExample: `{
  "id": "Ab12Cd34Ef56Gh78",
  "title": "示例视频",
  "status": 1,
  "transcode_status": "running",
  "source_bucket": "my-media",
  "source_key": "media/source/.../x.mp4",
  "play_key": "",
  "transcode_job_id": "media_Ab12_...",
  "transcode_error": "",
  "remark": "首测"
}`,
    curl: `curl -sS '${MEDIA}/admin/assets/Ab12Cd34Ef56Gh78' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "m-a-3",
    title: "POST /admin/assets/{id}/upload-url · 预签名上传",
    method: "POST",
    path: "/admin/assets/{id}/upload-url",
    summary: "获取原片预签名 PUT 地址",
    auth: "admin",
    base: MEDIA,
    tip: "拿到 upload_url 后对 MinIO 执行 PUT，body 为文件二进制，勿加 Content-Type。",
    params: [
      { name: "id", in: "path", required: true, desc: "资产短码" },
      {
        name: "filename",
        in: "body",
        desc: "原片文件名，默认 video.mp4",
        example: "demo.mp4",
      },
    ],
    bodyExample: `{ "filename": "demo.mp4" }`,
    responseExample: `{
  "upload_url": "http://127.0.0.1:19000/my-media/...?X-Amz-...",
  "method": "PUT",
  "bucket": "my-media",
  "key": "media/source/Ab12.../uuid.mp4",
  "expire_sec": 7200
}`,
    curl: `curl -sS -X POST '${MEDIA}/admin/assets/Ab12Cd34Ef56Gh78/upload-url' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"filename":"demo.mp4"}'

# 直传（UPLOAD_URL 换成上一步返回）
curl -sS -X PUT --data-binary @./demo.mp4 "$UPLOAD_URL"`,
  },
  {
    key: "m-a-4",
    title: "POST /admin/assets/{id}/transcode · 转码",
    method: "POST",
    path: "/admin/assets/{id}/transcode",
    summary: "触发 HLS 转码（需已上传原片）",
    auth: "admin",
    base: MEDIA,
    params: [
      { name: "id", in: "path", required: true, desc: "资产短码" },
      {
        name: "cover_seek_sec",
        in: "body",
        type: "int",
        desc: "封面截取秒数，默认8",
        example: "8",
      },
    ],
    bodyExample: `{ "cover_seek_sec": 8 }`,
    responseExample: `{ "job_id": "media_Ab12Cd34Ef56Gh78_1723..." }`,
    curl: `curl -sS -X POST '${MEDIA}/admin/assets/Ab12Cd34Ef56Gh78/transcode' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"cover_seek_sec":8}'`,
  },
  {
    key: "m-a-5",
    title: "DELETE /admin/assets/{id} · 删除",
    method: "DELETE",
    path: "/admin/assets/{id}",
    summary: "删除资产并清理 MinIO 前缀对象",
    auth: "admin",
    base: MEDIA,
    params: [{ name: "id", in: "path", required: true, desc: "资产短码" }],
    responseExample: `{ "deleted_objects": 12 }`,
    curl: `curl -sS -X DELETE '${MEDIA}/admin/assets/Ab12Cd34Ef56Gh78' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
];

const storageOpenApis: DocApi[] = [
  {
    key: "s-o-0",
    title: "GET /open/objects · 列表",
    method: "GET",
    path: "/open/objects",
    summary: "本站对象列表（按当前 app_key 隔离）",
    auth: "open",
    base: STORAGE,
    params: [
      { name: "page", in: "query", type: "int", desc: "页码", example: "1" },
      { name: "size", in: "query", type: "int", desc: "每页条数", example: "20" },
      { name: "keyword", in: "query", desc: "文件名/短码" },
      { name: "biz", in: "query", desc: "业务前缀，如 cover" },
      {
        name: "status",
        in: "query",
        type: "int",
        desc: "-1全部 0待上传 1就绪",
        example: "-1",
      },
    ],
    responseExample: `{
  "list": [
    {
      "id": "VSDj9BLN6r5sBVtc",
      "biz": "cover",
      "filename": "a.jpg",
      "content_type": "image/jpeg",
      "size_bytes": 10240,
      "public_url": "http://127.0.0.1:19000/my-storage/...",
      "status": 1,
      "created_at": "2026-08-10 01:40:12"
    }
  ],
  "total": 1
}`,
    curl: `curl -sS '${STORAGE}/open/objects?page=1&size=20&biz=cover&status=1' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "s-o-1",
    title: "POST /open/objects · 创建+预签名",
    method: "POST",
    path: "/open/objects",
    summary: "创建对象并返回 upload_url",
    auth: "open",
    base: STORAGE,
    tip: "site_code 由凭证自动带入。随后 PUT upload_url，再调 confirm。",
    params: [
      { name: "filename", in: "body", required: true, desc: "文件名", example: "a.jpg" },
      { name: "biz", in: "body", desc: "业务，默认 common", example: "cover" },
      {
        name: "content_type",
        in: "body",
        desc: "MIME，可空自动猜",
        example: "image/jpeg",
      },
      {
        name: "size_bytes",
        in: "body",
        type: "int64",
        desc: "声明大小，用于配额预检",
        example: "10240",
      },
      { name: "remark", in: "body", desc: "备注" },
    ],
    bodyExample: `{
  "filename": "a.jpg",
  "biz": "cover",
  "content_type": "image/jpeg",
  "size_bytes": 10240,
  "remark": "活动封面"
}`,
    responseExample: `{
  "id": "VSDj9BLN6r5sBVtc",
  "upload_url": "http://127.0.0.1:19000/my-storage/...?X-Amz-...",
  "method": "PUT",
  "bucket": "my-storage",
  "key": "SITE/cover/VSDj9BLN6r5sBVtc/a.jpg",
  "expire_sec": 7200,
  "public_url": "http://127.0.0.1:19000/my-storage/SITE/cover/.../a.jpg",
  "content_type": "image/jpeg"
}`,
    curl: `curl -sS -X POST '${STORAGE}/open/objects' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET' \\
  -H 'Content-Type: application/json' \\
  -d '{"filename":"a.jpg","biz":"cover","content_type":"image/jpeg","size_bytes":10240}'`,
  },
  {
    key: "s-o-2",
    title: "GET /open/objects/{id} · 详情",
    method: "GET",
    path: "/open/objects/{id}",
    summary: "对象详情（仅本站）",
    auth: "open",
    base: STORAGE,
    params: [{ name: "id", in: "path", required: true, desc: "16位短码" }],
    responseExample: `{
  "id": "VSDj9BLN6r5sBVtc",
  "biz": "cover",
  "filename": "a.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 10240,
  "public_url": "...",
  "status": 1,
  "created_at": "...",
  "object_key": "SITE/cover/VSDj9BLN6r5sBVtc/a.jpg"
}`,
    curl: `curl -sS '${STORAGE}/open/objects/VSDj9BLN6r5sBVtc' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "s-o-3",
    title: "POST /open/objects/{id}/confirm · 确认上传",
    method: "POST",
    path: "/open/objects/{id}/confirm",
    summary: "Stat MinIO 后标记就绪并计入配额",
    auth: "open",
    base: STORAGE,
    tip: "必须先成功 PUT 到 upload_url，否则会报「尚未上传」。",
    params: [{ name: "id", in: "path", required: true, desc: "16位短码" }],
    responseExample: `{
  "id": "VSDj9BLN6r5sBVtc",
  "status": 1,
  "size_bytes": 10240,
  "public_url": "http://127.0.0.1:19000/my-storage/..."
}`,
    curl: `# PUT 直传（不要 Content-Type）
curl -sS -X PUT --data-binary @./a.jpg "$UPLOAD_URL"

curl -sS -X POST '${STORAGE}/open/objects/VSDj9BLN6r5sBVtc/confirm' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "s-o-4",
    title: "POST /open/objects/{id}/download-url · 下载凭证",
    method: "POST",
    path: "/open/objects/{id}/download-url",
    summary: "预签名 GET，用于预览/下载",
    auth: "open",
    base: STORAGE,
    tip: "用返回的 download_url 打开；不要用 public_url（私有桶会 403）。",
    params: [
      { name: "id", in: "path", required: true, desc: "16位短码，且 status=就绪" },
    ],
    responseExample: `{
  "download_url": "http://127.0.0.1:19000/my-storage/...?X-Amz-...",
  "method": "GET",
  "expire_sec": 7200,
  "public_url": "http://127.0.0.1:19000/my-storage/..."
}`,
    curl: `curl -sS -X POST '${STORAGE}/open/objects/VSDj9BLN6r5sBVtc/download-url' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "s-o-5",
    title: "DELETE /open/objects/{id} · 删除",
    method: "DELETE",
    path: "/open/objects/{id}",
    summary: "删除本站对象（清 MinIO + 软删库）",
    auth: "open",
    base: STORAGE,
    params: [{ name: "id", in: "path", required: true, desc: "16位短码" }],
    responseExample: `{ "id": "VSDj9BLN6r5sBVtc" }`,
    curl: `curl -sS -X DELETE '${STORAGE}/open/objects/VSDj9BLN6r5sBVtc' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "s-o-6",
    title: "GET /open/usage · 用量",
    method: "GET",
    path: "/open/usage",
    summary: "本站存储配额与已用量",
    auth: "open",
    base: STORAGE,
    responseExample: `{
  "app_key": "ak_xxx",
  "max_bytes": 10737418240,
  "used_bytes": 10240,
  "max_files": 100000,
  "used_files": 1
}`,
    curl: `curl -sS '${STORAGE}/open/usage' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
];

const storageAdminApis: DocApi[] = [
  {
    key: "s-a-0",
    title: "GET /admin/objects · 列表",
    method: "GET",
    path: "/admin/objects",
    summary: "全站对象列表（可筛）",
    auth: "admin",
    base: STORAGE,
    params: [
      { name: "page", in: "query", type: "int", desc: "页码", example: "1" },
      { name: "size", in: "query", type: "int", desc: "每页", example: "20" },
      { name: "keyword", in: "query", desc: "文件名/短码" },
      { name: "app_key", in: "query", desc: "按调用方筛" },
      { name: "site_code", in: "query", desc: "按站点筛" },
      { name: "biz", in: "query", desc: "业务" },
      { name: "status", in: "query", type: "int", desc: "-1全部", example: "-1" },
    ],
    responseExample: `{ "list": [ /* ObjectItem */ ], "total": 1 }`,
    curl: `curl -sS '${STORAGE}/admin/objects?page=1&size=20&site_code=TEST&status=-1' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "s-a-1",
    title: "POST /admin/objects · 创建+预签名",
    method: "POST",
    path: "/admin/objects",
    summary: "创建对象并返回预签名（需 site_code）",
    auth: "admin",
    base: STORAGE,
    params: [
      { name: "site_code", in: "body", required: true, desc: "站点码", example: "TEST" },
      { name: "filename", in: "body", required: true, desc: "文件名" },
      { name: "app_key", in: "body", desc: "可选，计入该站配额" },
      { name: "biz", in: "body", desc: "默认 common" },
      { name: "content_type", in: "body", desc: "MIME" },
      { name: "size_bytes", in: "body", type: "int64", desc: "大小" },
      { name: "remark", in: "body", desc: "备注" },
    ],
    bodyExample: `{
  "site_code": "TEST",
  "app_key": "ak_xxx",
  "biz": "cover",
  "filename": "a.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 10240
}`,
    responseExample: `{
  "id": "VSDj9BLN6r5sBVtc",
  "upload_url": "http://127.0.0.1:19000/...?X-Amz-...",
  "method": "PUT",
  "bucket": "my-storage",
  "key": "TEST/cover/.../a.jpg",
  "expire_sec": 7200,
  "public_url": "...",
  "content_type": "image/jpeg"
}`,
    curl: `curl -sS -X POST '${STORAGE}/admin/objects' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"site_code":"TEST","filename":"a.jpg","biz":"cover","content_type":"image/jpeg","size_bytes":10240}'`,
  },
  {
    key: "s-a-2",
    title: "POST /admin/objects/upload · 服务端代传",
    method: "POST",
    path: "/admin/objects/upload",
    summary: "multipart 代传（文件经 storage 写入 MinIO）",
    auth: "admin",
    base: STORAGE,
    tip: "Content-Type 用 multipart/form-data；字段 file 为文件。",
    params: [
      { name: "file", in: "form", required: true, type: "file", desc: "上传文件" },
      { name: "site_code", in: "form", required: true, desc: "站点码" },
      { name: "app_key", in: "form", desc: "可选" },
      { name: "biz", in: "form", desc: "业务" },
      { name: "remark", in: "form", desc: "备注" },
    ],
    responseExample: `{
  "id": "VSDj9BLN6r5sBVtc",
  "status": 1,
  "size_bytes": 10240,
  "public_url": "...",
  "filename": "a.jpg"
}`,
    curl: `curl -sS -X POST '${STORAGE}/admin/objects/upload' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -F 'file=@./a.jpg' \\
  -F 'site_code=TEST' \\
  -F 'biz=cover'`,
  },
  {
    key: "s-a-3",
    title: "GET /admin/objects/{id} · 详情",
    method: "GET",
    path: "/admin/objects/{id}",
    summary: "对象详情",
    auth: "admin",
    base: STORAGE,
    params: [{ name: "id", in: "path", required: true, desc: "16位短码" }],
    responseExample: `{
  "id": "VSDj9BLN6r5sBVtc",
  "app_key": "",
  "site_code": "TEST",
  "biz": "cover",
  "filename": "a.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 10240,
  "public_url": "...",
  "status": 1,
  "remark": "",
  "created_at": "...",
  "bucket": "my-storage",
  "object_key": "TEST/cover/.../a.jpg"
}`,
    curl: `curl -sS '${STORAGE}/admin/objects/VSDj9BLN6r5sBVtc' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "s-a-4",
    title: "POST /admin/objects/{id}/confirm · 确认",
    method: "POST",
    path: "/admin/objects/{id}/confirm",
    summary: "确认预签名上传完成",
    auth: "admin",
    base: STORAGE,
    params: [{ name: "id", in: "path", required: true, desc: "16位短码" }],
    responseExample: `{
  "id": "VSDj9BLN6r5sBVtc",
  "status": 1,
  "size_bytes": 10240,
  "public_url": "..."
}`,
    curl: `curl -sS -X POST '${STORAGE}/admin/objects/VSDj9BLN6r5sBVtc/confirm' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "s-a-5",
    title: "POST /admin/objects/{id}/download-url · 下载",
    method: "POST",
    path: "/admin/objects/{id}/download-url",
    summary: "预签名下载",
    auth: "admin",
    base: STORAGE,
    params: [{ name: "id", in: "path", required: true, desc: "就绪对象短码" }],
    responseExample: `{
  "download_url": "http://127.0.0.1:19000/...?X-Amz-...",
  "method": "GET",
  "expire_sec": 7200,
  "public_url": "..."
}`,
    curl: `curl -sS -X POST '${STORAGE}/admin/objects/VSDj9BLN6r5sBVtc/download-url' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "s-a-6",
    title: "DELETE /admin/objects/{id} · 删除",
    method: "DELETE",
    path: "/admin/objects/{id}",
    summary: "删除对象",
    auth: "admin",
    base: STORAGE,
    params: [{ name: "id", in: "path", required: true, desc: "16位短码" }],
    responseExample: `{ "id": "VSDj9BLN6r5sBVtc" }`,
    curl: `curl -sS -X DELETE '${STORAGE}/admin/objects/VSDj9BLN6r5sBVtc' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "s-a-7",
    title: "GET /admin/quota · 配额",
    method: "GET",
    path: "/admin/quota",
    summary: "按 app_key 查配额用量",
    auth: "admin",
    base: STORAGE,
    params: [
      {
        name: "app_key",
        in: "query",
        required: true,
        desc: "调用方 key",
        example: "ak_xxx",
      },
    ],
    responseExample: `{
  "app_key": "ak_xxx",
  "max_bytes": 10737418240,
  "used_bytes": 10240,
  "max_files": 100000,
  "used_files": 1
}`,
    curl: `curl -sS '${STORAGE}/admin/quota?app_key=ak_xxx' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
];

const fullPipeline = `BASE=${STORAGE}
KEY=YOUR_APP_KEY
SEC=YOUR_APP_SECRET

CREATE=$(curl -sS -X POST "$BASE/open/objects" \\
  -H "X-App-Key: $KEY" -H "X-App-Secret: $SEC" -H "Content-Type: application/json" \\
  -d '{"filename":"a.jpg","biz":"cover","content_type":"image/jpeg","size_bytes":1024}')
echo "$CREATE"
ID=$(echo "$CREATE" | jq -r '.data.id')
UPLOAD=$(echo "$CREATE" | jq -r '.data.upload_url')

curl -sS -o /dev/null -w "%{http_code}\\n" -X PUT --data-binary @./a.jpg "$UPLOAD"

curl -sS -X POST "$BASE/open/objects/$ID/confirm" \\
  -H "X-App-Key: $KEY" -H "X-App-Secret: $SEC"

curl -sS -X POST "$BASE/open/objects/$ID/download-url" \\
  -H "X-App-Key: $KEY" -H "X-App-Secret: $SEC"`;

const adOpenApis: DocApi[] = [
  {
    key: "a-o-0",
    title: "GET /open/ads · 按广告位拉取",
    method: "GET",
    path: "/open/ads",
    summary: "按 slot_code 拉取本站当前可展示广告",
    auth: "open",
    base: AD,
    tip: "site_code 由凭证自动带入。匹配：广告位启用 + 投放启用 + 素材就绪 +（全站或本站）+ 排期内；按 priority/weight 降序。",
    params: [
      {
        name: "slot_code",
        in: "query",
        required: true,
        desc: "广告位 code，如 home_banner",
        example: "home_banner",
      },
      {
        name: "limit",
        in: "query",
        type: "int",
        desc: "最多返回条数，默认10，最大50",
        example: "10",
      },
    ],
    responseExample: `{
  "list": [
    {
      "campaign_id": "Ab12Cd34Ef56Gh78",
      "creative_id": "Xy98Zw76Vu54Ts32",
      "title": "活动封面",
      "media_url": "https://cdn.example.com/a.jpg",
      "link_url": "https://example.com/act",
      "slot_code": "home_banner",
      "priority": 100,
      "weight": 100
    }
  ]
}`,
    curl: `curl -sS '${AD}/open/ads?slot_code=home_banner&limit=10' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "a-o-1",
    title: "POST /open/events · 曝光/点击上报",
    method: "POST",
    path: "/open/events",
    summary: "上报展示或点击（可选，写 ad_event）",
    auth: "open",
    base: AD,
    tip: "site_code / app_key 由凭证写入事件表，用于后续粗统计。",
    params: [
      {
        name: "event_type",
        in: "body",
        required: true,
        desc: "impression | click",
        example: "impression",
      },
      { name: "campaign_id", in: "body", desc: "投放短码" },
      { name: "creative_id", in: "body", desc: "素材短码" },
      { name: "slot_code", in: "body", desc: "广告位 code" },
    ],
    bodyExample: `{
  "event_type": "impression",
  "campaign_id": "Ab12Cd34Ef56Gh78",
  "creative_id": "Xy98Zw76Vu54Ts32",
  "slot_code": "home_banner"
}`,
    responseExample: `{ "ok": true }`,
    curl: `curl -sS -X POST '${AD}/open/events' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET' \\
  -H 'Content-Type: application/json' \\
  -d '{"event_type":"click","campaign_id":"Ab12Cd34Ef56Gh78","creative_id":"Xy98Zw76Vu54Ts32","slot_code":"home_banner"}'`,
  },
];

const adAdminApis: DocApi[] = [
  {
    key: "a-a-0",
    title: "PUT /admin/clients · 同步调用方",
    method: "PUT",
    path: "/admin/clients",
    summary: "登记/更新 Open 凭证（开站 manage adsync 写入）",
    auth: "admin",
    base: AD,
    tip: "一般无需手调；建站/重置 APPSECRET 时总后台会 best-effort 同步。",
    params: [
      { name: "app_key", in: "body", required: true, desc: "调用方 key" },
      { name: "app_secret", in: "body", required: true, desc: "明文 secret，落库哈希" },
      { name: "site_code", in: "body", desc: "站点码", example: "MY" },
      { name: "status", in: "body", type: "int", desc: "1启用 0停用", example: "1" },
      { name: "remark", in: "body", desc: "备注" },
    ],
    bodyExample: `{
  "app_key": "ak_xxx",
  "app_secret": "sk_xxx",
  "site_code": "MY",
  "status": 1,
  "remark": "sync from my_manage_service"
}`,
    responseExample: `{ "app_key": "ak_xxx", "site_code": "MY", "status": 1 }`,
    curl: `curl -sS -X PUT '${AD}/admin/clients' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"app_key":"ak_xxx","app_secret":"sk_xxx","site_code":"MY","status":1}'`,
  },
  {
    key: "a-a-1",
    title: "GET /admin/slots · 广告位列表",
    method: "GET",
    path: "/admin/slots",
    summary: "广告位模板列表",
    auth: "admin",
    base: AD,
    params: [
      { name: "page", in: "query", type: "int", desc: "页码", example: "1" },
      { name: "size", in: "query", type: "int", desc: "每页", example: "20" },
      { name: "keyword", in: "query", desc: "code / 名称" },
      {
        name: "status",
        in: "query",
        type: "int",
        desc: "-1全部 1启用 0停用",
        example: "-1",
      },
    ],
    responseExample: `{
  "list": [
    {
      "id": 1,
      "code": "home_banner",
      "name": "首页Banner",
      "slot_type": "banner",
      "width": 750,
      "height": 320,
      "status": 1,
      "remark": "",
      "created_at": "2026-08-11 00:00:00",
      "updated_at": "2026-08-11 00:00:00"
    }
  ],
  "total": 1
}`,
    curl: `curl -sS '${AD}/admin/slots?page=1&size=20&status=-1' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "a-a-2",
    title: "POST /admin/slots · 创建广告位",
    method: "POST",
    path: "/admin/slots",
    summary: "创建广告位（code 全局唯一）",
    auth: "admin",
    base: AD,
    params: [
      {
        name: "code",
        in: "body",
        required: true,
        desc: "位编码，创建后不可改",
        example: "home_banner",
      },
      { name: "name", in: "body", required: true, desc: "显示名" },
      {
        name: "slot_type",
        in: "body",
        desc: "banner / splash / feed / player",
        example: "banner",
      },
      { name: "width", in: "body", type: "int", desc: "建议宽度" },
      { name: "height", in: "body", type: "int", desc: "建议高度" },
      { name: "status", in: "body", type: "int", desc: "默认1", example: "1" },
      { name: "remark", in: "body", desc: "备注" },
    ],
    bodyExample: `{
  "code": "home_banner",
  "name": "首页Banner",
  "slot_type": "banner",
  "width": 750,
  "height": 320,
  "status": 1
}`,
    responseExample: `{ "id": 1, "code": "home_banner" }`,
    curl: `curl -sS -X POST '${AD}/admin/slots' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"code":"home_banner","name":"首页Banner","slot_type":"banner","width":750,"height":320}'`,
  },
  {
    key: "a-a-3",
    title: "GET/PUT/DELETE /admin/slots/{id}",
    method: "GET",
    path: "/admin/slots/{id}",
    summary: "详情 / 更新 / 停用（DELETE 软停用 status=0）",
    auth: "admin",
    base: AD,
    tip: "更新用 PUT；停用用 DELETE（软禁用，不物理删）。",
    params: [
      { name: "id", in: "path", required: true, type: "int64", desc: "广告位 ID" },
      { name: "name", in: "body", desc: "PUT 时必填" },
      { name: "slot_type", in: "body", desc: "PUT" },
      { name: "width / height / status / remark", in: "body", desc: "PUT 可选字段" },
    ],
    bodyExample: `{
  "name": "首页Banner",
  "slot_type": "banner",
  "width": 750,
  "height": 320,
  "status": 1,
  "remark": ""
}`,
    responseExample: `{ "id": 1, "code": "home_banner", "name": "首页Banner", "status": 1 }`,
    curl: `curl -sS '${AD}/admin/slots/1' -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'

curl -sS -X PUT '${AD}/admin/slots/1' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' -H 'Content-Type: application/json' \\
  -d '{"name":"首页Banner","slot_type":"banner","width":750,"height":320,"status":1}'

curl -sS -X DELETE '${AD}/admin/slots/1' -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "a-a-4",
    title: "GET /admin/creatives · 素材列表",
    method: "GET",
    path: "/admin/creatives",
    summary: "素材列表",
    auth: "admin",
    base: AD,
    params: [
      { name: "page", in: "query", type: "int", desc: "页码", example: "1" },
      { name: "size", in: "query", type: "int", desc: "每页", example: "20" },
      { name: "keyword", in: "query", desc: "标题 / 短码" },
      { name: "status", in: "query", type: "int", desc: "-1全部", example: "-1" },
    ],
    responseExample: `{
  "list": [
    {
      "id": "Xy98Zw76Vu54Ts32",
      "title": "活动封面",
      "media_url": "https://cdn.example.com/a.jpg",
      "link_url": "https://example.com/act",
      "storage_object_id": "",
      "status": 1,
      "remark": "",
      "created_at": "..."
    }
  ],
  "total": 1
}`,
    curl: `curl -sS '${AD}/admin/creatives?page=1&size=20&status=1' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "a-a-5",
    title: "POST /admin/creatives · 创建素材",
    method: "POST",
    path: "/admin/creatives",
    summary: "创建素材，返回 16 位短码 id",
    auth: "admin",
    base: AD,
    tip: "文件请先上传统一存储，再把可访问 URL 填入 media_url；可选填 storage_object_id。",
    params: [
      { name: "title", in: "body", required: true, desc: "标题" },
      {
        name: "media_url",
        in: "body",
        required: true,
        desc: "素材 URL（图片/视频）",
      },
      { name: "link_url", in: "body", desc: "点击落地页" },
      {
        name: "storage_object_id",
        in: "body",
        desc: "可选，统一存储对象短码",
      },
      { name: "status", in: "body", type: "int", desc: "默认1", example: "1" },
      { name: "remark", in: "body", desc: "备注" },
    ],
    bodyExample: `{
  "title": "活动封面",
  "media_url": "https://cdn.example.com/a.jpg",
  "link_url": "https://example.com/act",
  "storage_object_id": "",
  "status": 1
}`,
    responseExample: `{ "id": "Xy98Zw76Vu54Ts32" }`,
    curl: `curl -sS -X POST '${AD}/admin/creatives' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"title":"活动封面","media_url":"https://cdn.example.com/a.jpg","link_url":"https://example.com/act"}'`,
  },
  {
    key: "a-a-6",
    title: "GET/PUT/DELETE /admin/creatives/{id}",
    method: "GET",
    path: "/admin/creatives/{id}",
    summary: "素材详情 / 更新 / 下架",
    auth: "admin",
    base: AD,
    tip: "DELETE 为软下架（status=0），已绑定投放将不再被 Open 拉出。",
    params: [
      { name: "id", in: "path", required: true, desc: "16位短码" },
      { name: "title / media_url", in: "body", desc: "PUT 必填" },
      { name: "link_url / storage_object_id / status / remark", in: "body", desc: "PUT 可选" },
    ],
    bodyExample: `{
  "title": "活动封面",
  "media_url": "https://cdn.example.com/a.jpg",
  "link_url": "https://example.com/act",
  "status": 1
}`,
    responseExample: `{ "id": "Xy98Zw76Vu54Ts32", "title": "活动封面", "status": 1 }`,
    curl: `curl -sS '${AD}/admin/creatives/Xy98Zw76Vu54Ts32' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'

curl -sS -X DELETE '${AD}/admin/creatives/Xy98Zw76Vu54Ts32' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "a-a-7",
    title: "GET /admin/campaigns · 投放列表",
    method: "GET",
    path: "/admin/campaigns",
    summary: "投放单列表（可按站/广告位筛）",
    auth: "admin",
    base: AD,
    params: [
      { name: "page", in: "query", type: "int", desc: "页码", example: "1" },
      { name: "size", in: "query", type: "int", desc: "每页", example: "20" },
      { name: "keyword", in: "query", desc: "名称 / 短码" },
      { name: "site_code", in: "query", desc: "站点筛选", example: "MY" },
      { name: "slot_id", in: "query", type: "int64", desc: "广告位 ID" },
      { name: "status", in: "query", type: "int", desc: "-1全部", example: "-1" },
    ],
    responseExample: `{
  "list": [
    {
      "id": "Ab12Cd34Ef56Gh78",
      "name": "首页活动",
      "slot_id": 1,
      "creative_id": "Xy98Zw76Vu54Ts32",
      "site_code": "MY",
      "priority": 100,
      "weight": 100,
      "status": 1,
      "start_at": "",
      "end_at": "",
      "remark": ""
    }
  ],
  "total": 1
}`,
    curl: `curl -sS '${AD}/admin/campaigns?page=1&size=20&site_code=MY&status=1' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "a-a-8",
    title: "POST /admin/campaigns · 创建投放",
    method: "POST",
    path: "/admin/campaigns",
    summary: "绑定广告位 + 素材，生成投放单",
    auth: "admin",
    base: AD,
    tip: "site_code 空=全站；非空仅该站可见。start_at/end_at 可空表示不限排期。",
    params: [
      { name: "name", in: "body", required: true, desc: "投放名称" },
      { name: "slot_id", in: "body", required: true, type: "int64", desc: "广告位 ID" },
      {
        name: "creative_id",
        in: "body",
        required: true,
        desc: "素材 16 位短码",
      },
      { name: "site_code", in: "body", desc: "空=全站", example: "MY" },
      { name: "priority", in: "body", type: "int", desc: "越大越优先，默认100" },
      { name: "weight", in: "body", type: "int", desc: "同优先级权重，默认100" },
      { name: "status", in: "body", type: "int", desc: "1投放中 0暂停" },
      { name: "start_at", in: "body", desc: "可选，如 2026-08-11 00:00:00" },
      { name: "end_at", in: "body", desc: "可选" },
      { name: "remark", in: "body", desc: "备注" },
    ],
    bodyExample: `{
  "name": "首页活动",
  "slot_id": 1,
  "creative_id": "Xy98Zw76Vu54Ts32",
  "site_code": "MY",
  "priority": 100,
  "weight": 100,
  "status": 1
}`,
    responseExample: `{ "id": "Ab12Cd34Ef56Gh78" }`,
    curl: `curl -sS -X POST '${AD}/admin/campaigns' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"首页活动","slot_id":1,"creative_id":"Xy98Zw76Vu54Ts32","site_code":"MY","status":1}'`,
  },
  {
    key: "a-a-9",
    title: "GET/PUT /admin/campaigns/{id}",
    method: "GET",
    path: "/admin/campaigns/{id}",
    summary: "投放详情 / 更新",
    auth: "admin",
    base: AD,
    params: [
      { name: "id", in: "path", required: true, desc: "投放短码" },
      { name: "name / slot_id / creative_id", in: "body", desc: "PUT 必填" },
      {
        name: "site_code / priority / weight / status / start_at / end_at",
        in: "body",
        desc: "PUT 可选",
      },
    ],
    responseExample: `{
  "id": "Ab12Cd34Ef56Gh78",
  "name": "首页活动",
  "slot_id": 1,
  "creative_id": "Xy98Zw76Vu54Ts32",
  "site_code": "MY",
  "status": 1
}`,
    curl: `curl -sS '${AD}/admin/campaigns/Ab12Cd34Ef56Gh78' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "a-a-10",
    title: "POST /admin/campaigns/{id}/status · 启停",
    method: "POST",
    path: "/admin/campaigns/{id}/status",
    summary: "快速开启/暂停投放",
    auth: "admin",
    base: AD,
    params: [
      { name: "id", in: "path", required: true, desc: "投放短码" },
      {
        name: "status",
        in: "body",
        required: true,
        type: "int",
        desc: "1开启 0暂停",
        example: "0",
      },
    ],
    bodyExample: `{ "status": 0 }`,
    responseExample: `{ "id": "Ab12Cd34Ef56Gh78", "status": 0 }`,
    curl: `curl -sS -X POST '${AD}/admin/campaigns/Ab12Cd34Ef56Gh78/status' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"status":0}'`,
  },
  {
    key: "a-a-11",
    title: "GET /admin/clients · 调用方列表",
    method: "GET",
    path: "/admin/clients",
    summary: "已同步的 Open 调用方",
    auth: "admin",
    base: AD,
    params: [
      { name: "page", in: "query", type: "int", example: "1" },
      { name: "size", in: "query", type: "int", example: "20" },
      { name: "keyword", in: "query", desc: "app_key / site_code" },
    ],
    responseExample: `{
  "list": [
    { "id": 1, "app_key": "ak_xxx", "site_code": "MY", "status": 1, "remark": "..." }
  ],
  "total": 1
}`,
    curl: `curl -sS '${AD}/admin/clients?page=1&size=20' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
  {
    key: "a-a-12",
    title: "POST /admin/clients/{app_key}/disable",
    method: "POST",
    path: "/admin/clients/{app_key}/disable",
    summary: "停用调用方（Open 鉴权失败）",
    auth: "admin",
    base: AD,
    params: [
      { name: "app_key", in: "path", required: true, desc: "调用方 key" },
    ],
    responseExample: `{ "app_key": "ak_xxx", "status": 0 }`,
    curl: `curl -sS -X POST '${AD}/admin/clients/ak_xxx/disable' \\
  -H 'X-Admin-Token: YOUR_ADMIN_TOKEN'`,
  },
];

const adPipeline = `ADMIN_TOKEN=YOUR_ADMIN_TOKEN
BASE=${AD}
KEY=YOUR_APP_KEY
SEC=YOUR_APP_SECRET

# 1) 广告位
curl -sS -X POST "$BASE/admin/slots" \\
  -H "X-Admin-Token: $ADMIN_TOKEN" -H "Content-Type: application/json" \\
  -d '{"code":"home_banner","name":"首页Banner","slot_type":"banner","width":750,"height":320}'

# 2) 素材（media_url 建议先走统一存储拿到可访问地址）
CREATIVE=$(curl -sS -X POST "$BASE/admin/creatives" \\
  -H "X-Admin-Token: $ADMIN_TOKEN" -H "Content-Type: application/json" \\
  -d '{"title":"活动封面","media_url":"https://cdn.example.com/a.jpg","link_url":"https://example.com/act"}')
echo "$CREATIVE"
CID=$(echo "$CREATIVE" | jq -r '.data.id')

# 3) 投放（site_code 空=全站）
curl -sS -X POST "$BASE/admin/campaigns" \\
  -H "X-Admin-Token: $ADMIN_TOKEN" -H "Content-Type: application/json" \\
  -d "{\\"name\\":\\"首页活动\\",\\"slot_id\\":1,\\"creative_id\\":\\"$CID\\",\\"site_code\\":\\"MY\\",\\"status\\":1}"

# 4) 子站拉取
curl -sS "$BASE/open/ads?slot_code=home_banner&limit=10" \\
  -H "X-App-Key: $KEY" -H "X-App-Secret: $SEC"

# 5) 可选上报
curl -sS -X POST "$BASE/open/events" \\
  -H "X-App-Key: $KEY" -H "X-App-Secret: $SEC" -H "Content-Type: application/json" \\
  -d '{"event_type":"impression","slot_code":"home_banner","creative_id":"'"$CID"'"}'`;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}

// ---- 统一播放(my_play 网关 + my_media 签发/策略) ----

const playOpenApis: DocApi[] = [
  {
    key: "p-o-0",
    title: "POST /open/assets/{id}/play-token · 签发播放地址",
    method: "POST",
    path: "/open/assets/{id}/play-token",
    summary: "对已选用媒资签发网关播放地址（可试看 / 可绑IP）",
    auth: "open",
    base: MEDIA,
    tip: "推荐入口：所有播放都从这里现签现用。返回的 play_url 指向播放网关（多码率自动指向 master.m3u8），有效期由站点策略 token_ttl_sec 决定（默认 4 小时）。",
    params: [
      { name: "id", in: "path", required: true, desc: "资产短码（需本站已 pick）", example: "FgySA8kT9SV9db7w" },
      { name: "preview_sec", in: "body", type: "int", desc: "试看秒数；0 或不传 = 完整播放", example: "30" },
      { name: "client_ip", in: "body", desc: "绑定观众 IP；传了则该链接仅此 IP 可播", example: "203.0.113.8" },
    ],
    bodyExample: `{
  "preview_sec": 30,
  "client_ip": "203.0.113.8"
}`,
    responseExample: `{
  "play_url": "http://127.0.0.1:8006/hls/FgySA8kT9SV9db7w/master.m3u8?e=1786398266&s=MY&t=1786383866&d=30&i=203.0.113.8&sig=9bf042...",
  "expires_at": 1786398266
}`,
    curl: `curl -sS -X POST '${MEDIA}/open/assets/FgySA8kT9SV9db7w/play-token' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET' \\
  -H 'Content-Type: application/json' \\
  -d '{"preview_sec":0}'`,
  },
  {
    key: "p-o-1",
    title: "GET /hls/{code}/{file} · 网关播放入口",
    method: "GET",
    path: "/hls/{code}/{file}",
    summary: "播放器直接请求（token 在 URL 上），业务侧无需手工调用",
    auth: "none",
    base: PLAY,
    tip: "把 play-token 返回的 play_url 直接喂给 hls.js / 原生播放器即可。网关逐级校验：token 验签 → IP 绑定 → 失效闸 → Referer 白名单 / UA 黑名单，任一不过返回 403。m3u8 动态重写并续签子清单与分片，ts 默认 302 到 MinIO 预签名地址。",
    params: [
      { name: "code", in: "path", required: true, desc: "资产短码", example: "FgySA8kT9SV9db7w" },
      { name: "file", in: "path", required: true, desc: "master.m3u8 / 720p/index.m3u8 / index0.ts（多码率含一级子目录）", example: "master.m3u8" },
      { name: "e", in: "query", required: true, type: "int", desc: "过期时间戳（Unix 秒）" },
      { name: "s", in: "query", required: true, desc: "站点 code（statistics/策略归属）", example: "MY" },
      { name: "t", in: "query", required: true, type: "int", desc: "签发时间戳 iat（链接一键失效用）" },
      { name: "d", in: "query", type: "int", desc: "试看秒数；>0 时清单按时长截断" },
      { name: "i", in: "query", desc: "绑定 IP；与请求来源不符则 403" },
      { name: "sig", in: "query", required: true, desc: "HMAC-SHA256(code|site|exp|d|ip|iat)" },
    ],
    responseExample: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=3128000,RESOLUTION=1280x720,NAME="720p"
720p/index.m3u8?e=1786398266&s=MY&t=1786383866&sig=9bf042...
#EXT-X-STREAM-INF:BANDWIDTH=1628000,RESOLUTION=854x480,NAME="480p"
480p/index.m3u8?e=1786398266&s=MY&t=1786383866&sig=9bf042...`,
  },
  {
    key: "p-o-2",
    title: "GET /open/picks · 已选用列表（含长效 play_url）",
    method: "GET",
    path: "/open/picks",
    summary: "本站已选用媒资；play_url 为网关签名地址（默认 TTL）",
    auth: "open",
    base: MEDIA,
    tip: "列表返回的 play_url 也是网关签名地址，适合直接渲染；需要试看/绑IP 等定制场景再调 play-token 单独签发。",
    params: [
      { name: "page", in: "query", type: "int", desc: "页码", example: "1" },
      { name: "size", in: "query", type: "int", desc: "每页条数", example: "20" },
    ],
    curl: `curl -sS '${MEDIA}/open/picks?page=1&size=20' \\
  -H 'X-App-Key: YOUR_APP_KEY' \\
  -H 'X-App-Secret: YOUR_APP_SECRET'`,
  },
  {
    key: "p-o-3",
    title: "GET /healthz · 网关探活",
    method: "GET",
    path: "/healthz",
    summary: "播放网关健康检查",
    auth: "none",
    base: PLAY,
    responseExample: `{ "ok": true, "service": "my_play" }`,
    curl: `curl -sS '${PLAY}/healthz'`,
  },
];

const playAdminApis: DocApi[] = [
  {
    key: "p-a-0",
    title: "GET /admin/play/policies · 防盗链策略列表",
    method: "GET",
    path: "/admin/play/policies",
    summary: "各站点防盗链策略（Referer 白名单 / UA 黑名单 / token 有效期）",
    auth: "admin",
    base: MEDIA,
    curl: `curl -sS '${MEDIA}/admin/play/policies' -H 'X-Admin-Token: ADMIN_TOKEN'`,
  },
  {
    key: "p-a-1",
    title: "PUT /admin/play/policies/{site_code} · 保存站点策略",
    method: "PUT",
    path: "/admin/play/policies/{site_code}",
    summary: "按站点保存防盗链策略；网关约 1 分钟内同步生效",
    auth: "admin",
    base: MEDIA,
    params: [
      { name: "site_code", in: "path", required: true, desc: "站点 code", example: "MY" },
      { name: "referer_whitelist", in: "body", desc: "逗号分隔域名子串；空 = 不限制", example: "mysite.com,localhost" },
      { name: "ua_blacklist", in: "body", desc: "逗号分隔 UA 子串，命中即拒", example: "curl,wget,python" },
      { name: "token_ttl_sec", in: "body", type: "int", required: true, desc: "token 有效期（秒），≥60", example: "14400" },
      { name: "status", in: "body", type: "int", desc: "1=启用 0=停用（停用即不做额外限制）", example: "1" },
    ],
    bodyExample: `{
  "referer_whitelist": "mysite.com,localhost",
  "ua_blacklist": "curl,wget,python",
  "token_ttl_sec": 14400,
  "status": 1
}`,
  },
  {
    key: "p-a-2",
    title: "GET /admin/play/stats · 播放统计",
    method: "GET",
    path: "/admin/play/stats",
    summary: "按日 × 站点 × 资产的播放次数与分片请求数",
    auth: "admin",
    base: MEDIA,
    tip: "plays = 顶层清单拉取次数（≈播放次数，多码率子清单不重复计）；seg_reqs = 分片请求数，可估流量热度。网关每 30 秒批量上报一次。",
    params: [
      { name: "start", in: "query", required: true, desc: "开始日期 YYYY-MM-DD", example: "2026-08-04" },
      { name: "end", in: "query", required: true, desc: "结束日期 YYYY-MM-DD", example: "2026-08-10" },
      { name: "site_code", in: "query", desc: "按站点过滤，可空" },
    ],
    curl: `curl -sS '${MEDIA}/admin/play/stats?start=2026-08-04&end=2026-08-10' -H 'X-Admin-Token: ADMIN_TOKEN'`,
  },
  {
    key: "p-a-3",
    title: "POST /admin/play/revoke · 链接一键失效",
    method: "POST",
    path: "/admin/play/revoke",
    summary: "使站点（或单个资产）已签发的播放链接立即失效",
    auth: "admin",
    base: MEDIA,
    tip: "原理：记录失效基线 not_before，签发时间 iat 早于基线的 token 一律 403；之后新签发的不受影响。网关约 15 秒同步。适用：链接被盗播扩散、套餐变更强制重签。",
    params: [
      { name: "site_code", in: "body", required: true, desc: "站点 code；传 * 表示全部站点(跨站打击)", example: "MY" },
      { name: "asset_code", in: "body", desc: "资产短码；空 = 整站全部", example: "FgySA8kT9SV9db7w" },
    ],
    bodyExample: `{
  "site_code": "MY",
  "asset_code": ""
}`,
    responseExample: `{ "not_before": 1786384000 }`,
  },
  {
    key: "p-a-4",
    title: "GET /admin/play/revokes · 失效闸列表",
    method: "GET",
    path: "/admin/play/revokes",
    summary: "当前生效的失效基线（站点级 + 资产级）",
    auth: "admin",
    base: MEDIA,
    curl: `curl -sS '${MEDIA}/admin/play/revokes' -H 'X-Admin-Token: ADMIN_TOKEN'`,
  },
];
</script>

<template>
  <div class="access-docs">
    <ElTabs v-model="docTab" type="border-card" class="access-docs__tabs">
      <ElTabPane label="接入总览" name="overview">
        <div class="doc-stack">
          <section class="doc-hero">
            <div class="doc-hero__main">
              <h3 class="doc-hero__title">子站如何接入 PaaS</h3>
              <p class="doc-hero__desc">
                一把 <code>APPKEY / APPSECRET</code>，按能力分流调用。各 Tab
                含完整参数与示例。
              </p>
              <div class="route-pills">
                <span class="route-pill">
                  <em>视频</em>
                  <i />
                  <strong>媒资中心</strong>
                </span>
                <span class="route-pill">
                  <em>图片 / 文件</em>
                  <i />
                  <strong>统一存储</strong>
                </span>
              </div>
            </div>
            <div class="doc-hero__chips">
              <span class="chip chip--ok">媒资已落地</span>
              <span class="chip chip--ok">存储已落地</span>
              <span class="chip chip--ok">广告中台已落地</span>
              <span class="chip chip--ok">统一播放已落地</span>
              <span class="chip">支付规划中</span>
            </div>
          </section>

          <section class="doc-grid-3">
            <article class="doc-card doc-card--auth">
              <div class="doc-card__head">
                <div class="doc-card__label">Open 鉴权</div>
                <span class="badge badge--open">子站</span>
              </div>
              <p class="doc-card__hint">业务侧调用 Open 接口时携带</p>
              <pre class="code-block code-block--fill">X-App-Key: {APPKEY}
X-App-Secret: {APPSECRET}
Content-Type: application/json</pre>
            </article>
            <article class="doc-card doc-card--auth">
              <div class="doc-card__head">
                <div class="doc-card__label">Admin 鉴权</div>
                <span class="badge badge--admin">总后台</span>
              </div>
              <p class="doc-card__hint">运营 / 管理端调用 Admin 接口时携带</p>
              <pre class="code-block code-block--fill">X-Admin-Token: {admin_token}
Content-Type: application/json</pre>
            </article>
            <article class="doc-card doc-card--auth">
              <div class="doc-card__head">
                <div class="doc-card__label">统一响应</div>
                <span class="badge">JSON</span>
              </div>
              <p class="doc-card__hint">
                <code>code === 0</code> 成功，业务数据在 <code>data</code>
              </p>
              <pre class="code-block code-block--fill">{
  "code": 0,
  "message": "OK",
  "data": { ... }
}</pre>
            </article>
          </section>

          <section class="doc-card">
            <div class="doc-card__head">
              <div class="doc-card__label">本地环境</div>
              <span class="doc-card__sub">点击地址可复制</span>
            </div>
            <div class="env-grid">
              <div class="env-item" @click="copyText(MEDIA)">
                <div class="env-item__top">
                  <span>媒资 my_media</span>
                  <em>点击复制</em>
                </div>
                <code>{{ MEDIA }}</code>
              </div>
              <div class="env-item" @click="copyText(STORAGE)">
                <div class="env-item__top">
                  <span>存储 my_storage</span>
                  <em>Docker 映射 8015→8005</em>
                </div>
                <code>{{ STORAGE }}</code>
              </div>
              <div class="env-item" @click="copyText(AD)">
                <div class="env-item__top">
                  <span>广告 my_ad</span>
                  <em>Docker 映射 8016→8006</em>
                </div>
                <code>{{ AD }}</code>
              </div>
              <div class="env-item" @click="copyText('http://127.0.0.1:19000')">
                <div class="env-item__top">
                  <span>MinIO</span>
                  <em>点击复制</em>
                </div>
                <code>http://127.0.0.1:19000</code>
              </div>
              <div
                class="env-item"
                @click="copyText(`${MEDIA}/swagger/`)"
              >
                <div class="env-item__top">
                  <span>Swagger</span>
                  <em>各服务根路径 /swagger/</em>
                </div>
                <code>{{ MEDIA }}/swagger/</code>
              </div>
            </div>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">通用注意</div>
            <div class="note-grid">
              <div class="note-item">
                <strong>预签名 PUT</strong>
                <p>不要额外带未签名的 Content-Type；浏览器请用 arrayBuffer</p>
              </div>
              <div class="note-item">
                <strong>私有桶</strong>
                <p>不要裸开 public_url；预览 / 下载用 download-url</p>
              </div>
              <div class="note-item">
                <strong>短码</strong>
                <p>媒资 8～16 位；存储对象固定 16 位，业务侧建议只存 id</p>
              </div>
              <div class="note-item">
                <strong>状态</strong>
                <p>媒资 0草稿 1转码中 2就绪 3失败 4下架；存储 0待上传 1就绪 2已删</p>
              </div>
            </div>
          </section>
        </div>
      </ElTabPane>

      <ElTabPane label="媒资中心" name="media">
        <div class="doc-stack">
          <section class="doc-hero doc-hero--media">
            <div>
              <div class="doc-hero__meta">
                <ElTag type="success" size="small">已落地</ElTag>
                <span>my_media · {{ MEDIA }}</span>
              </div>
              <h3 class="doc-hero__title">媒资中心（视频）</h3>
              <p class="doc-hero__desc">
                运营上传转码 → 子站选用。探活 <code>GET /healthz</code>。
              </p>
            </div>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">使用流程与逻辑</div>
            <ol class="flow-steps">
              <li>
                <strong>运营侧（Admin）</strong>：创建资产 → 拿
                <code>upload-url</code> → PUT 原片到 MinIO → 调
                <code>transcode</code> 转 HLS
              </li>
              <li>
                <strong>就绪后</strong>：状态变为就绪（status=2），池内可被各子站看到
              </li>
              <li>
                <strong>子站侧（Open）</strong>：列表/详情浏览 →
                <code>pick</code> 选用到本站 → 业务侧存短码，播放用返回的
                <code>play_url</code>
              </li>
              <li>
                <strong>隔离</strong>：Open 凭证只访问「可选用池 + 本站已 pick」；不直接碰原片上传
              </li>
            </ol>
            <div class="flow-rail" aria-hidden="true">
              <span>创建</span>
              <i />
              <span>预签名 PUT</span>
              <i />
              <span>转码</span>
              <i />
              <span>就绪</span>
              <i />
              <span>子站 pick</span>
              <i />
              <span>播放</span>
            </div>
            <ul class="bullet-list flow-notes">
              <li>媒资与统一存储并列：视频只走媒资，不要把视频再套一层存储上传</li>
              <li>封面由转码截取写入；子站拿的是 CDN/MinIO 上的封面与 m3u8</li>
              <li>短码 8～16 位，业务侧建议只存 id，URL 以接口实时返回为准</li>
            </ul>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">Open · 子站接口</div>
            <ElCollapse v-model="mediaOpenKeys">
              <ElCollapseItem
                v-for="api in mediaOpenApis"
                :key="api.key"
                :title="api.title"
                :name="api.key"
              >
                <ApiEndpoint
                  :method="api.method"
                  :path="api.path"
                  :summary="api.summary"
                  :base="api.base"
                  :auth="api.auth"
                  :tip="api.tip"
                  :params="api.params"
                  :body-example="api.bodyExample"
                  :response-example="api.responseExample"
                  :curl="api.curl"
                />
              </ElCollapseItem>
            </ElCollapse>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">Admin · 总后台接口</div>
            <ElCollapse v-model="mediaAdminKeys">
              <ElCollapseItem
                v-for="api in mediaAdminApis"
                :key="api.key"
                :title="api.title"
                :name="api.key"
              >
                <ApiEndpoint
                  :method="api.method"
                  :path="api.path"
                  :summary="api.summary"
                  :base="api.base"
                  :auth="api.auth"
                  :tip="api.tip"
                  :params="api.params"
                  :body-example="api.bodyExample"
                  :response-example="api.responseExample"
                  :curl="api.curl"
                />
              </ElCollapseItem>
            </ElCollapse>
          </section>
        </div>
      </ElTabPane>

      <ElTabPane label="统一存储" name="storage">
        <div class="doc-stack">
          <section class="doc-hero doc-hero--storage">
            <div>
              <div class="doc-hero__meta">
                <ElTag type="success" size="small">已落地</ElTag>
                <span>my_storage · {{ STORAGE }}</span>
              </div>
              <h3 class="doc-hero__title">统一存储（图片 / 文件）</h3>
              <p class="doc-hero__desc">
                Key：<code>{site_code}/{biz}/{code}/{filename}</code>。短码固定 16 位。
              </p>
            </div>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">使用流程与逻辑</div>
            <ol class="flow-steps">
              <li>
                <strong>创建</strong>：Open/Admin 调
                <code>POST .../objects</code>，拿到 <code>id</code> +
                <code>upload_url</code>（对象先处于待上传）
              </li>
              <li>
                <strong>直传</strong>：客户端对 MinIO 执行 PUT（body=文件二进制，勿额外带
                Content-Type）
              </li>
              <li>
                <strong>确认</strong>：调 <code>confirm</code>，服务端 Stat 对象后标记就绪并计入配额
              </li>
              <li>
                <strong>使用</strong>：业务存 16 位短码；预览/下载走
                <code>download-url</code>（私有桶不要裸开 <code>public_url</code>）
              </li>
            </ol>
            <div class="flow-rail" aria-hidden="true">
              <span>创建元数据</span>
              <i />
              <span>预签名 PUT</span>
              <i />
              <span>confirm</span>
              <i />
              <span>就绪</span>
              <i />
              <span>download-url</span>
            </div>
            <ul class="bullet-list flow-notes">
              <li>Open 按 app_key 隔离，只能管本站对象；Admin 可跨站并代传 multipart</li>
              <li>Key 固定为 <code>{site_code}/{biz}/{code}/{filename}</code>，biz 如 cover / avatar</li>
              <li>图片/通用文件走存储；视频仍走媒资中心，两者互不强制依赖</li>
            </ul>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">Open · 子站接口</div>
            <ElCollapse v-model="storageOpenKeys">
              <ElCollapseItem
                v-for="api in storageOpenApis"
                :key="api.key"
                :title="api.title"
                :name="api.key"
              >
                <ApiEndpoint
                  :method="api.method"
                  :path="api.path"
                  :summary="api.summary"
                  :base="api.base"
                  :auth="api.auth"
                  :tip="api.tip"
                  :params="api.params"
                  :body-example="api.bodyExample"
                  :response-example="api.responseExample"
                  :curl="api.curl"
                />
              </ElCollapseItem>
            </ElCollapse>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">Admin · 总后台接口</div>
            <ElCollapse v-model="storageAdminKeys">
              <ElCollapseItem
                v-for="api in storageAdminApis"
                :key="api.key"
                :title="api.title"
                :name="api.key"
              >
                <ApiEndpoint
                  :method="api.method"
                  :path="api.path"
                  :summary="api.summary"
                  :base="api.base"
                  :auth="api.auth"
                  :tip="api.tip"
                  :params="api.params"
                  :body-example="api.bodyExample"
                  :response-example="api.responseExample"
                  :curl="api.curl"
                />
              </ElCollapseItem>
            </ElCollapse>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">完整链路示例 · 子站上传图片</div>
            <pre class="code-block">{{ fullPipeline }}</pre>
            <button type="button" class="copy-btn" @click="copyText(fullPipeline)">
              复制脚本
            </button>
          </section>
        </div>
      </ElTabPane>

      <ElTabPane label="统一播放" name="play">
        <div class="doc-stack">
          <section class="doc-hero doc-hero--media">
            <div>
              <div class="doc-hero__meta">
                <ElTag type="success" size="small">已落地</ElTag>
                <span>my_play · {{ PLAY }}（签发/策略在 my_media · {{ MEDIA }}）</span>
              </div>
              <h3 class="doc-hero__title">统一播放（HLS 网关）</h3>
              <p class="doc-hero__desc">
                播放地址统一由网关签名下发：token 验签 → 防盗链 → 多码率 → 试看 →
                一键失效 → 播放统计。探活 <code>GET /healthz</code>。
              </p>
            </div>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">使用流程与逻辑</div>
            <ol class="flow-steps">
              <li>
                <strong>子站侧（Open）</strong>：对已 pick 的媒资调
                <code>play-token</code> 现签播放地址（可带试看秒数 / 绑定观众
                IP），或直接用 <code>/open/picks</code> 返回的默认地址
              </li>
              <li>
                <strong>播放器</strong>：拿到的 URL 指向网关
                <code>master.m3u8</code>（多码率自动按带宽切 720p/480p），直接喂给
                hls.js / 原生播放器，无需其他处理
              </li>
              <li>
                <strong>网关逐级校验</strong>：HMAC 验签（含过期）→ IP 绑定 →
                失效闸（iat &lt; not_before 即拒）→ Referer 白名单 / UA
                黑名单，任一不过 403
              </li>
              <li>
                <strong>回源</strong>：m3u8 动态重写续签；ts 默认
                <code>302</code> 到 MinIO 短时预签名（300s），支持切换代理直出 /
                CDN 签名模式，源站永不裸奔
              </li>
            </ol>
            <div class="flow-rail" aria-hidden="true">
              <span>play-token 签发</span>
              <i />
              <span>master.m3u8</span>
              <i />
              <span>档位清单</span>
              <i />
              <span>ts 302 预签名</span>
              <i />
              <span>统计上报</span>
            </div>
            <ul class="bullet-list flow-notes">
              <li>
                token v3 签名串 <code>code|site|exp|d|ip|iat</code>；有效期默认 4
                小时，可按站点策略调整；主/副双密钥支持平滑轮换
              </li>
              <li>
                试看：<code>preview_sec&gt;0</code> 时清单按分片时长截断并补
                <code>EXT-X-ENDLIST</code>，观众只能看到指定秒数
              </li>
              <li>
                一键失效：总后台「平台服务 → 播放服务 →
                链接失效」或 Admin 接口触发，约 15 秒全网生效，只打击基线前签发的链接
              </li>
              <li>
                业务侧永远不要落库播放 URL——只存资产短码，播放时现签现用
              </li>
            </ul>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">Open · 子站接口</div>
            <ElCollapse v-model="playOpenKeys">
              <ElCollapseItem
                v-for="api in playOpenApis"
                :key="api.key"
                :title="api.title"
                :name="api.key"
              >
                <ApiEndpoint
                  :method="api.method"
                  :path="api.path"
                  :summary="api.summary"
                  :base="api.base"
                  :auth="api.auth"
                  :tip="api.tip"
                  :params="api.params"
                  :body-example="api.bodyExample"
                  :response-example="api.responseExample"
                  :curl="api.curl"
                />
              </ElCollapseItem>
            </ElCollapse>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">Admin · 总后台接口</div>
            <ElCollapse v-model="playAdminKeys">
              <ElCollapseItem
                v-for="api in playAdminApis"
                :key="api.key"
                :title="api.title"
                :name="api.key"
              >
                <ApiEndpoint
                  :method="api.method"
                  :path="api.path"
                  :summary="api.summary"
                  :base="api.base"
                  :auth="api.auth"
                  :tip="api.tip"
                  :params="api.params"
                  :body-example="api.bodyExample"
                  :response-example="api.responseExample"
                  :curl="api.curl"
                />
              </ElCollapseItem>
            </ElCollapse>
          </section>
        </div>
      </ElTabPane>

      <ElTabPane label="支付中台" name="pay">
        <div class="doc-stack">
          <section class="doc-hero doc-hero--muted">
            <div>
              <div class="doc-hero__meta">
                <ElTag type="info" size="small">规划中</ElTag>
              </div>
              <h3 class="doc-hero__title">支付中台</h3>
              <p class="doc-hero__desc">统一下单、回调验签与对账；接口清单待补充。</p>
            </div>
          </section>
        </div>
      </ElTabPane>

      <ElTabPane label="广告中台" name="ad">
        <div class="doc-stack">
          <section class="doc-hero doc-hero--storage">
            <div>
              <div class="doc-hero__meta">
                <ElTag type="success" size="small">已落地</ElTag>
                <span>my_ad · {{ AD }}</span>
              </div>
              <h3 class="doc-hero__title">广告中台</h3>
              <p class="doc-hero__desc">
                广告位 / 素材 / 投放。子站
                <code>GET /open/ads?slot_code=</code> 拉取；素材文件走统一存储，本服务存
                <code>media_url</code>。探活 <code>GET /healthz</code> · Swagger
                <code>{{ AD }}/swagger/</code>
              </p>
            </div>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">使用流程与逻辑</div>
            <ol class="flow-steps">
              <li>
                <strong>Admin</strong>：创建广告位（code）→ 创建素材（media_url）→ 创建投放（绑定位
                + 素材，可选 site_code / 排期）
              </li>
              <li>
                <strong>子站 Open</strong>：凭证鉴权后按
                <code>slot_code</code> 拉取有效广告 → 前端展示 media_url / link_url
              </li>
              <li>
                <strong>上报（可选）</strong>：曝光/点击
                <code>POST /open/events</code>
              </li>
              <li>
                <strong>凭证</strong>：开站/重置 secret 经 manage
                <code>adsync</code> 写入本服务 <code>paas_client</code>
              </li>
            </ol>
            <div class="flow-rail" aria-hidden="true">
              <span>广告位</span>
              <i />
              <span>素材</span>
              <i />
              <span>投放</span>
              <i />
              <span>Open 拉取</span>
              <i />
              <span>展示/上报</span>
            </div>
            <ul class="bullet-list flow-notes">
              <li>
                拉取条件：广告位启用 + 投放启用 + 素材就绪 +（全站或匹配本站）+ 在排期内
              </li>
              <li>排序：priority 降序，再 weight 降序</li>
              <li>
                素材文件建议先走统一存储拿 URL；本服务不存文件，只存
                <code>media_url</code> / 可选 <code>storage_object_id</code>
              </li>
              <li>总后台可视化管理：平台服务 → 广告中台（代理 <code>/ad-api</code>）</li>
            </ul>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">Open · 子站接口</div>
            <ElCollapse v-model="adOpenKeys">
              <ElCollapseItem
                v-for="api in adOpenApis"
                :key="api.key"
                :title="api.title"
                :name="api.key"
              >
                <ApiEndpoint
                  :method="api.method"
                  :path="api.path"
                  :summary="api.summary"
                  :base="api.base"
                  :auth="api.auth"
                  :tip="api.tip"
                  :params="api.params"
                  :body-example="api.bodyExample"
                  :response-example="api.responseExample"
                  :curl="api.curl"
                />
              </ElCollapseItem>
            </ElCollapse>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">Admin · 总后台接口</div>
            <ElCollapse v-model="adAdminKeys">
              <ElCollapseItem
                v-for="api in adAdminApis"
                :key="api.key"
                :title="api.title"
                :name="api.key"
              >
                <ApiEndpoint
                  :method="api.method"
                  :path="api.path"
                  :summary="api.summary"
                  :base="api.base"
                  :auth="api.auth"
                  :tip="api.tip"
                  :params="api.params"
                  :body-example="api.bodyExample"
                  :response-example="api.responseExample"
                  :curl="api.curl"
                />
              </ElCollapseItem>
            </ElCollapse>
          </section>

          <section class="doc-card">
            <div class="doc-card__label">完整链路示例 · Admin 配置 + 子站拉取</div>
            <pre class="code-block">{{ adPipeline }}</pre>
            <button type="button" class="copy-btn" @click="copyText(adPipeline)">
              复制脚本
            </button>
          </section>
        </div>
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<style scoped>
.access-docs {
  --doc-border: #e8e8ec;
  --doc-bg: #f7f7f9;
  --doc-muted: #8a8f98;
}

.doc-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.doc-hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1f2937 0%, #374151 55%, #4b5563 100%);
  color: #f3f4f6;
}

.doc-hero__main {
  flex: 1;
  min-width: 240px;
}

.route-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.route-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgb(255 255 255 / 12%);
  font-size: 12px;
}

.route-pill em {
  font-style: normal;
  opacity: 0.85;
}

.route-pill strong {
  font-weight: 650;
}

.route-pill i {
  display: inline-block;
  width: 16px;
  height: 1px;
  background: rgb(255 255 255 / 45%);
  position: relative;
}

.route-pill i::after {
  content: "";
  position: absolute;
  right: -1px;
  top: -3px;
  border: 4px solid transparent;
  border-left-color: rgb(255 255 255 / 55%);
}

.doc-hero--media {
  background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 70%);
}

.doc-hero--storage {
  background: linear-gradient(135deg, #14532d 0%, #15803d 70%);
}

.doc-hero--muted {
  background: linear-gradient(135deg, #3f3f46 0%, #52525b 100%);
}

.doc-hero__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  opacity: 0.9;
}

.doc-hero__title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

.doc-hero__desc {
  margin: 8px 0 0;
  max-width: 780px;
  font-size: 13px;
  line-height: 1.7;
  opacity: 0.92;
}

.doc-hero__desc code,
.doc-card code,
.bullet-list code {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgb(0 0 0 / 6%);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.doc-hero__desc code {
  background: rgb(255 255 255 / 14%);
}

.doc-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgb(255 255 255 / 12%);
  font-size: 12px;
}

.chip--ok {
  background: rgb(74 222 128 / 22%);
  color: #bbf7d0;
}

.doc-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

@media (max-width: 960px) {
  .doc-grid-3 {
    grid-template-columns: 1fr;
  }
}

.doc-card {
  padding: 16px 18px;
  border: 1px solid var(--doc-border);
  border-radius: 12px;
  background: #fff;
}

.doc-card--auth {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.doc-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.doc-card__label {
  margin-bottom: 12px;
  color: #111827;
  font-size: 13px;
  font-weight: 650;
}

.doc-card__head .doc-card__label {
  margin-bottom: 0;
}

.doc-card__sub {
  color: var(--doc-muted);
  font-size: 12px;
}

.doc-card__hint {
  margin: 0 0 10px !important;
  color: var(--doc-muted) !important;
  font-size: 12px !important;
  line-height: 1.5 !important;
  min-height: 18px;
}

.doc-card p {
  margin: 0 0 8px;
  color: #3f3f46;
  font-size: 13px;
  line-height: 1.7;
}

.badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
}

.badge--open {
  background: #eff6ff;
  color: #1d4ed8;
}

.badge--admin {
  background: #f5f3ff;
  color: #6d28d9;
}

.muted {
  color: var(--doc-muted) !important;
  font-size: 12px !important;
}

.code-block {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  border-radius: 8px;
  background: #111827;
  color: #e5e7eb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.code-block--fill {
  flex: 1;
  margin-top: auto;
}

.env-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 720px) {
  .env-grid {
    grid-template-columns: 1fr;
  }
}

.env-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--doc-bg);
  font-size: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.env-item:hover {
  border-color: #93c5fd;
  background: #f0f7ff;
}

.env-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.env-item__top span {
  color: #374151;
  font-weight: 600;
}

.env-item__top em {
  color: var(--doc-muted);
  font-style: normal;
  font-size: 11px;
}

.env-item code {
  display: block;
  padding: 8px 10px;
  border: 1px solid var(--doc-border);
  border-radius: 6px;
  background: #fff;
  color: #111827;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}

.note-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 720px) {
  .note-grid {
    grid-template-columns: 1fr;
  }
}

.note-item {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--doc-bg);
}

.note-item strong {
  display: block;
  margin-bottom: 4px;
  color: #111827;
  font-size: 12px;
  font-weight: 650;
}

.note-item p {
  margin: 0 !important;
  color: #4b5563 !important;
  font-size: 12px !important;
  line-height: 1.6 !important;
}

.bullet-list {
  margin: 0;
  padding-left: 18px;
  color: #3f3f46;
  font-size: 13px;
  line-height: 1.8;
}

.flow-steps {
  margin: 0 0 14px;
  padding-left: 18px;
  color: #3f3f46;
  font-size: 13px;
  line-height: 1.85;
}

.flow-steps strong {
  color: #111827;
}

.flow-rail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 4px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--doc-bg);
}

.flow-rail span {
  padding: 4px 10px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid var(--doc-border);
  color: #1f2937;
  font-size: 12px;
  font-weight: 550;
  white-space: nowrap;
}

.flow-rail i {
  display: inline-block;
  width: 14px;
  height: 1px;
  margin: 0 2px;
  background: #c4c9d2;
  position: relative;
}

.flow-rail i::after {
  content: "";
  position: absolute;
  right: -1px;
  top: -3px;
  border: 4px solid transparent;
  border-left-color: #c4c9d2;
}

.flow-notes {
  margin-top: 0;
}

.copy-btn {
  padding: 6px 12px;
  border: 1px solid var(--doc-border);
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 12px;
  cursor: pointer;
}

.copy-btn:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
}

:deep(.access-docs__tabs .el-tabs__item) {
  min-width: 5.5em;
  padding: 0 12px;
  text-align: center;
  justify-content: center;
}

:deep(.el-collapse-item__header) {
  font-size: 13px;
  font-weight: 600;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 12px;
}
</style>
