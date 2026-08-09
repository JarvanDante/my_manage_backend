import type { RouteRecordRaw } from "vue-router";

/** 前端静态路由备份；生产菜单以 manage_permission 后端下发为准 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: "lucide:layout-grid",
      order: 30,
      title: "TPP门户",
    },
    name: "Tpp",
    path: "/tpp",
    children: [
      {
        name: "TppOverview",
        path: "overview",
        component: () => import("#/views/tpp/overview.vue"),
        meta: { icon: "lucide:panels-top-left", title: "能力概览" },
      },
      {
        name: "TppCenter",
        path: "center",
        component: () => import("#/views/tpp/center.vue"),
        meta: { icon: "lucide:key-round", title: "接入中心" },
      },
      // 旧路径兼容
      {
        name: "TppAccessRedirect",
        path: "access",
        redirect: "/tpp/center",
        meta: { hideInMenu: true, title: "系统接入" },
      },
      {
        name: "TppDocsRedirect",
        path: "docs",
        redirect: "/tpp/center",
        meta: { hideInMenu: true, title: "接入文档" },
      },
    ],
  },
];

export default routes;
