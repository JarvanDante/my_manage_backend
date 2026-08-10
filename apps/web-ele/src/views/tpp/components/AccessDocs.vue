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

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}
</script>

<template>
  <div class="access-docs">
    <ElTabs v-model="docTab" class="access-docs__tabs">
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
              <span class="chip">统一播放 / 支付 / 广告规划中</span>
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
          <section class="doc-hero doc-hero--muted">
            <div>
              <div class="doc-hero__meta">
                <ElTag type="info" size="small">规划中</ElTag>
              </div>
              <h3 class="doc-hero__title">统一播放</h3>
              <p class="doc-hero__desc">
                现阶段直接使用媒资返回的 <code>play_url</code>。网关接口待立项后按同样格式补充。
              </p>
            </div>
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
          <section class="doc-hero doc-hero--muted">
            <div>
              <div class="doc-hero__meta">
                <ElTag type="info" size="small">规划中</ElTag>
              </div>
              <h3 class="doc-hero__title">广告中台</h3>
              <p class="doc-hero__desc">素材文件走统一存储；广告业务接口待补充。</p>
            </div>
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

:deep(.access-docs__tabs .el-tabs__header) {
  margin-bottom: 16px;
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
