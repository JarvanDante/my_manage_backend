<script lang="ts" setup>
import ModulePlaceholder from "./components/ModulePlaceholder.vue";

defineOptions({ name: "TppDocs" });
</script>

<template>
  <ModulePlaceholder
    title="接入文档"
    tag="待完善"
    summary="中台能力接入说明、环境地址、鉴权方式与接口清单（对齐 TME TPP 文档形态）。"
    :bullets="[
      '鉴权：APPKEY + APPSECRET 签名',
      '协议：默认 HTTPS/JSON；高频内网链路可后续加 gRPC',
      '按服务拆分二级文档：媒资、存储、播放、支付、广告',
    ]"
  />
</template>
