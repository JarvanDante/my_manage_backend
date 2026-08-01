import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: "lucide:store",
      order: 10,
      title: "商户管理",
    },
    name: "Merchant",
    path: "/merchant",
    component: () => import("#/views/merchant/index.vue"),
  },
];

export default routes;
