import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: "lucide:globe",
      order: 20,
      title: "站点管理",
    },
    name: "Site",
    path: "/site",
    component: () => import("#/views/site/index.vue"),
  },
  {
    name: "SiteDetail",
    path: "/site/detail",
    component: () => import("#/views/site/detail.vue"),
    meta: {
      hideInMenu: true,
      title: "站点详情",
      activePath: "/site",
    },
  },
];

export default routes;
