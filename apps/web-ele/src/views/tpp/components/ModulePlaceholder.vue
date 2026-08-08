<script lang="ts" setup>
import { ElAlert, ElCard, ElTag } from "element-plus";

defineProps<{
  title: string;
  summary: string;
  bullets?: string[];
  tag?: string;
}>();
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h2 class="m-0 text-lg font-semibold">{{ title }}</h2>
        <ElTag v-if="tag" type="warning" size="small">{{ tag }}</ElTag>
      </div>
      <p class="mb-4 text-sm text-gray-500">{{ summary }}</p>
      <ElAlert type="info" :closable="false" show-icon title="占位页">
        菜单与路由已挂到总后台；真正的能力服务将独立部署，这里后续接文档 / 配置 / 管理界面。
      </ElAlert>
      <ul v-if="bullets?.length" class="mt-4 list-disc pl-5 text-sm leading-7 text-gray-600">
        <li v-for="item in bullets" :key="item">{{ item }}</li>
      </ul>
    </ElCard>
  </div>
</template>
