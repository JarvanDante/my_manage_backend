<script lang="ts" setup>
import ModulePlaceholder from "#/views/tpp/components/ModulePlaceholder.vue";

defineOptions({ name: "PaasAd" });
</script>

<template>
  <ModulePlaceholder
    title="广告中台"
    tag="PaaS"
    summary="广告位、素材与投放配置的平台能力；各站在子后台决定开哪些位、权重与展示策略。"
    :bullets="[
      '素材库与广告位模板',
      '跨站投放配置（可选）',
      '子站保留本站开关与运营策略',
    ]"
  />
</template>
