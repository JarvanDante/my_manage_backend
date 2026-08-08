<script lang="ts" setup>
import ModulePlaceholder from "#/views/tpp/components/ModulePlaceholder.vue";

defineOptions({ name: "PaasMedia" });
</script>

<template>
  <ModulePlaceholder
    title="媒资中心"
    tag="PaaS"
    summary="统一视频上传、转码、入库。总后台维护中央媒资池，子后台从池中选用后上架到各站。"
    :bullets="[
      '上传 / 转码任务 / 媒资元数据',
      '池内可用状态；禁用可联动各站已上架内容',
      '子站通过 media_id 引用，避免重复存文件',
    ]"
  />
</template>
