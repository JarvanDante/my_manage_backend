<script lang="ts" setup>
import { useRouter } from "vue-router";

import { IconifyIcon } from "@vben/icons";

defineOptions({ name: "TppOverview" });

const router = useRouter();

/** 平台能力目录 → 跳转「平台服务」二级菜单 */
const products = [
  {
    title: "媒资中心",
    desc: "统一视频上传、转码与入库，子站从中央媒资池选用上架。",
    icon: "lucide:clapperboard",
    path: "/paas/media",
  },
  {
    title: "统一存储",
    desc: "对象存储与文件管理：上传、下载、预览与多站配额。",
    icon: "lucide:hard-drive",
    path: "/paas/storage",
  },
  {
    title: "统一播放",
    desc: "HLS / 鉴权 / 防盗链播放网关，各站共用播放能力。",
    icon: "lucide:play-circle",
    path: "/paas/play",
  },
  {
    title: "支付中台",
    desc: "统一下单、渠道适配、回调验签与对账能力。",
    icon: "lucide:wallet",
    path: "/paas/pay",
  },
  {
    title: "广告中台",
    desc: "广告位、素材与投放配置，子站按策略引用展示。",
    icon: "lucide:megaphone",
    path: "/paas/ad",
  },
] as const;

const quickLinks = [
  { title: "接入中心", desc: "开通凭证 + 对接文档", path: "/tpp/center" },
] as const;

function go(path: string) {
  void router.push(path);
}
</script>

<template>
  <div class="tpp-overview">
    <!-- 顶部横幅：主题色 -->
    <section class="tpp-hero">
      <div class="tpp-hero__content">
        <p class="tpp-hero__eyebrow">TPP 门户</p>
        <h1 class="tpp-hero__title">私有云 PaaS 平台</h1>
        <p class="tpp-hero__sub">
          平台级基础设施服务，减少各站重复造轮子
        </p>
        <div class="tpp-hero__actions">
          <button
            v-for="link in quickLinks"
            :key="link.path"
            type="button"
            class="tpp-hero__btn"
            @click="go(link.path)"
          >
            {{ link.title }}
          </button>
        </div>
      </div>
      <div class="tpp-hero__deco" aria-hidden="true" />
    </section>

    <!-- 产品能力网格 -->
    <section class="tpp-section">
      <h2 class="tpp-section__title">平台服务</h2>
      <p class="tpp-section__hint">点击卡片进入对应能力配置页（侧栏「平台服务」二级目录）</p>
      <div class="tpp-grid">
        <button
          v-for="item in products"
          :key="item.path"
          type="button"
          class="tpp-card"
          @click="go(item.path)"
        >
          <span class="tpp-card__icon">
            <IconifyIcon :icon="item.icon" class="size-8" />
          </span>
          <span class="tpp-card__title">{{ item.title }}</span>
          <span class="tpp-card__desc">{{ item.desc }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tpp-overview {
  min-height: 100%;
  background: #f5f7fb;
}

.tpp-hero {
  position: relative;
  overflow: hidden;
  padding: 22px 28px 26px;
  color: hsl(var(--primary-foreground));
  background: linear-gradient(
    120deg,
    hsl(var(--primary)) 0%,
    hsl(347 77% 68%) 55%,
    hsl(347 85% 78%) 100%
  );
}

.tpp-hero__content {
  position: relative;
  z-index: 1;
  max-width: 720px;
}

.tpp-hero__eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.08em;
  opacity: 0.85;
}

.tpp-hero__title {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.25;
}

.tpp-hero__sub {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.92;
}

.tpp-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tpp-hero__btn {
  padding: 6px 14px;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 14%);
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 6px;
  transition: background 0.2s ease;
}

.tpp-hero__btn:hover {
  background: rgb(255 255 255 / 26%);
}

.tpp-hero__deco {
  position: absolute;
  right: -60px;
  bottom: -90px;
  width: 260px;
  height: 260px;
  pointer-events: none;
  background: radial-gradient(circle, rgb(255 255 255 / 22%) 0%, transparent 68%);
}

.tpp-section {
  padding: 24px 28px 36px;
}

.tpp-section__title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.tpp-section__hint {
  margin: 0 0 18px;
  font-size: 13px;
  color: #6b7280;
}

.tpp-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px 24px;
}

@media (max-width: 1200px) {
  .tpp-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .tpp-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .tpp-hero {
    padding: 18px 16px 22px;
  }

  .tpp-hero__title {
    font-size: 22px;
  }

  .tpp-section {
    padding: 16px;
  }

  .tpp-grid {
    grid-template-columns: 1fr;
  }
}

.tpp-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 20px 18px 18px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #eee3e7;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.tpp-card:hover {
  border-color: hsl(var(--primary) / 40%);
  box-shadow: 0 8px 24px hsl(var(--primary) / 14%);
  transform: translateY(-2px);
}

.tpp-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 12px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 14px;
}

.tpp-card__title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.tpp-card__desc {
  font-size: 13px;
  line-height: 1.55;
  color: #6b7280;
}
</style>
