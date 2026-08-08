<script lang="ts" setup>
import ModulePlaceholder from "#/views/tpp/components/ModulePlaceholder.vue";

defineOptions({ name: "PaasPay" });
</script>

<template>
  <ModulePlaceholder
    title="支付中台"
    tag="PaaS"
    summary="统一下单、渠道适配、回调验签与对账；用户余额与订单归属仍落在各站租户库。"
    :bullets="[
      '渠道商户号与回调路由（按 site_code）',
      '对账与异常单处理',
      '站点侧保留套餐/商品与用户账本',
    ]"
  />
</template>
