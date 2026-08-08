<script lang="ts" setup>
import ModulePlaceholder from "#/views/tpp/components/ModulePlaceholder.vue";

defineOptions({ name: "PaasPlay" });
</script>

<template>
  <ModulePlaceholder
    title="播放服务"
    tag="PaaS"
    summary="HLS/鉴权/防盗链播放网关。各站只负责「谁有权看」，播放票根由平台签发。"
    :bullets="[
      'm3u8 / key 代理与短时 token',
      'CDN 与防盗链策略按站配置',
      '与媒资中心产出的转码结果对接',
    ]"
  />
</template>
