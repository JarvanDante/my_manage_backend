<script lang="ts" setup>
import { ElMessage, ElTag } from "element-plus";

export interface ApiParam {
  name: string;
  in: "path" | "query" | "body" | "form" | "header";
  type?: string;
  required?: boolean;
  desc: string;
  example?: string;
}

const props = defineProps<{
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  summary: string;
  base?: string;
  auth?: "open" | "admin" | "none";
  params?: ApiParam[];
  bodyExample?: string;
  responseExample?: string;
  curl?: string;
  tip?: string;
}>();

const methodType = {
  GET: "success",
  POST: "primary",
  PUT: "warning",
  DELETE: "danger",
} as const;

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}

function authText() {
  if (props.auth === "admin") return "X-Admin-Token";
  if (props.auth === "open") return "X-App-Key + X-App-Secret";
  return "无";
}
</script>

<template>
  <article class="ep">
    <header class="ep__head">
      <ElTag :type="methodType[method]" size="small" effect="dark">{{ method }}</ElTag>
      <code class="ep__path">{{ path }}</code>
      <span class="ep__summary">{{ summary }}</span>
    </header>

    <div class="ep__meta">
      <span v-if="base">Base：<code>{{ base }}</code></span>
      <span>鉴权：<code>{{ authText() }}</code></span>
    </div>

    <p v-if="tip" class="ep__tip">{{ tip }}</p>

    <div v-if="params?.length" class="ep__block">
      <div class="ep__label">请求参数</div>
      <table class="ep__table">
        <thead>
          <tr>
            <th>参数</th>
            <th>位置</th>
            <th>类型</th>
            <th>必填</th>
            <th>说明</th>
            <th>示例</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in params" :key="p.name + p.in">
            <td><code>{{ p.name }}</code></td>
            <td>{{ p.in }}</td>
            <td>{{ p.type || "string" }}</td>
            <td>{{ p.required ? "是" : "否" }}</td>
            <td>{{ p.desc }}</td>
            <td class="muted">{{ p.example || "—" }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="bodyExample" class="ep__block">
      <div class="ep__label-row">
        <div class="ep__label">请求体示例</div>
        <button type="button" class="ep__copy" @click="copy(bodyExample)">复制</button>
      </div>
      <pre class="ep__code">{{ bodyExample }}</pre>
    </div>

    <div v-if="responseExample" class="ep__block">
      <div class="ep__label-row">
        <div class="ep__label">成功响应 data 示例</div>
        <button type="button" class="ep__copy" @click="copy(responseExample)">复制</button>
      </div>
      <pre class="ep__code">{{ responseExample }}</pre>
    </div>

    <div v-if="curl" class="ep__block">
      <div class="ep__label-row">
        <div class="ep__label">cURL</div>
        <button type="button" class="ep__copy" @click="copy(curl)">复制</button>
      </div>
      <pre class="ep__code">{{ curl }}</pre>
    </div>
  </article>
</template>

<style scoped>
.ep {
  padding: 14px 16px;
  border: 1px solid #e8e8ec;
  border-radius: 10px;
  background: #fff;
}

.ep__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin-bottom: 8px;
}

.ep__path {
  padding: 2px 8px;
  border-radius: 4px;
  background: #f3f4f6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.ep__summary {
  color: #374151;
  font-size: 13px;
  font-weight: 600;
}

.ep__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.ep__meta code {
  padding: 0 4px;
  border-radius: 3px;
  background: #f3f4f6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.ep__tip {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fffbeb;
  color: #92400e;
  font-size: 12px;
  line-height: 1.6;
}

.ep__block {
  margin-top: 12px;
}

.ep__label {
  margin-bottom: 6px;
  color: #111827;
  font-size: 12px;
  font-weight: 650;
}

.ep__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.ep__label-row .ep__label {
  margin-bottom: 0;
}

.ep__copy {
  padding: 2px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #4b5563;
  font-size: 11px;
  cursor: pointer;
}

.ep__copy:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
}

.ep__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.ep__table th,
.ep__table td {
  padding: 6px 8px;
  border-bottom: 1px solid #eef0f3;
  text-align: left;
  vertical-align: top;
}

.ep__table th {
  background: #f7f7f9;
  color: #6b7280;
  font-weight: 600;
}

.ep__table code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.muted {
  color: #9ca3af;
}

.ep__code {
  margin: 0;
  padding: 10px 12px;
  overflow-x: auto;
  border-radius: 8px;
  background: #111827;
  color: #e5e7eb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  line-height: 1.65;
  white-space: pre-wrap;
}
</style>
