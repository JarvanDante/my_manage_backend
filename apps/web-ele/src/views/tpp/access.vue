<script lang="ts" setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "TppAccessRedirect" });

const router = useRouter();
onMounted(() => {
  void router.replace("/tpp/center");
});
</script>

<template>
  <div class="p-4 text-sm text-gray-500">已合并至接入中心，正在跳转…</div>
</template>
