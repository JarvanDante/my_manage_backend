<script lang="ts" setup>
import ModulePlaceholder from "./components/ModulePlaceholder.vue";

defineOptions({ name: "TppOverview" });
</script>

<template>
  <ModulePlaceholder
    title="TPP 能力概览"
    tag="门户"
    summary="平台级基础设施入口：汇聚媒资、存储、播放、支付、广告等可复用能力，减少各站重复建设。"
    :bullets="[
      '首页展示已开通的平台服务目录',
      '跳转各服务的接入文档与配置页',
      '开站时可勾选开通能力并下发 app_key（后续实现）',
    ]"
  />
</template>
