import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: "lucide:scroll-text",
      order: 80,
      title: "操作审计",
    },
    name: "ManageLogs",
    path: "/monitor/logs",
    component: () => import("#/views/monitor/logs.vue"),
  },
];

export default routes;
