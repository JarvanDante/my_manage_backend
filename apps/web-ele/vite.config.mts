import { defineConfig } from "@vben/vite-config";

import ElementPlus from "unplugin-element-plus/vite";

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [
        ElementPlus({
          format: "esm",
        }),
      ],
      server: {
        host: "0.0.0.0",
        proxy: {
          "/manage": {
            changeOrigin: true,
            // 前端跑在 node 容器里, Go 后端(manageapi :8003)在宿主机
            target: "http://host.docker.internal:8003",
            ws: true,
          },
        },
      },
    },
  };
});
