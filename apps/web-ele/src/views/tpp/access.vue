<script lang="ts" setup>
import ModulePlaceholder from "./components/ModulePlaceholder.vue";

defineOptions({ name: "TppAccess" });
</script>

<template>
  <ModulePlaceholder
    title="系统接入"
    tag="待实现"
    summary="为商户/站点开通平台能力，发放 APPKEY / APPSECRET，控制调用额度与权限。"
    :bullets="[
      '创建站点时自动发放 APPKEY / APPSECRET（AES 落库，详情可反复查看）',
      '站点详情可查看/重置密钥；发布配置时注入 Nacos paas 段',
      '站点 my_service 通过 HTTPS + 签名调用各 PaaS 服务',
    ]"
  />
</template>
