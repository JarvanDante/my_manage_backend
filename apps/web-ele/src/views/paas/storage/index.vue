<script lang="ts" setup>
import ModulePlaceholder from "#/views/tpp/components/ModulePlaceholder.vue";

defineOptions({ name: "PaasStorage" });
</script>

<template>
  <ModulePlaceholder
    title="统一存储"
    tag="PaaS"
    summary="对象存储与文件管理：上传、下载、预览、权限与多站配额。"
    :bullets="[
      '对接 MinIO / 云存储',
      '按站点/应用隔离桶或前缀',
      '为媒资、广告素材等能力提供底层存储',
    ]"
  />
</template>
