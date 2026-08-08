import type { RouteRecordRaw } from "vue-router";

/** 前端静态路由备份；生产菜单以 manage_permission 后端下发为准 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: "lucide:boxes",
      order: 40,
      title: "平台服务",
    },
    name: "Paas",
    path: "/paas",
    children: [
      {
        name: "PaasMedia",
        path: "media",
        component: () => import("#/views/paas/media/index.vue"),
        meta: { icon: "lucide:clapperboard", title: "媒资中心" },
      },
      {
        name: "PaasStorage",
        path: "storage",
        component: () => import("#/views/paas/storage/index.vue"),
        meta: { icon: "lucide:hard-drive", title: "统一存储" },
      },
      {
        name: "PaasPlay",
        path: "play",
        component: () => import("#/views/paas/play/index.vue"),
        meta: { icon: "lucide:play-circle", title: "播放服务" },
      },
      {
        name: "PaasPay",
        path: "pay",
        component: () => import("#/views/paas/pay/index.vue"),
        meta: { icon: "lucide:wallet", title: "支付中台" },
      },
      {
        name: "PaasAd",
        path: "ad",
        component: () => import("#/views/paas/ad/index.vue"),
        meta: { icon: "lucide:megaphone", title: "广告平台" },
      },
    ],
  },
];

export default routes;
