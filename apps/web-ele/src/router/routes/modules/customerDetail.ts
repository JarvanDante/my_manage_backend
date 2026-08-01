import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    name: "CustomerDetail",
    path: "/customerManage/customerDetail",
    component: () => import("#/views/customerManage/customerDetail.vue"),
    meta: {
      hideInMenu: true,
      title: "商户详情",
      menuKey: "customerDetail",
    },
  },
];

export default routes;
