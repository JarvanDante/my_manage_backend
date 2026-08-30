import { defineConfig } from "@vben/vite-config";

import ElementPlus from "unplugin-element-plus/vite";

export default defineConfig(async () => {
  return {
    application: {
      // 关闭 unplugin-vue-i18n 的 runtime-only 别名(它把 vue-i18n 指向无编译器的 runtime 版,导致 message 无法编译)
      i18n: false,
    },
    vite: {
      plugins: [
        ElementPlus({
          format: "esm",
        }),
      ],
      server: {
        host: "0.0.0.0",
        allowedHosts: ["manage.panalow.cc"],
        proxy: {
          "/manage": {
            changeOrigin: true,
            target: "http://host.docker.internal:8003",
            ws: true,
          },
          // 媒资中心 my_media（Docker 内前端需走 host.docker.internal，与 /manage 一致）
          "/media-api": {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/media-api/, ""),
            target: "http://host.docker.internal:8004",
            timeout: 600_000,
            proxyTimeout: 600_000,
            ws: true,
          },
          // 统一存储 my_storage（宿主机映射 8015，避免与 jh_game :8005 冲突）
          "/storage-api": {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/storage-api/, ""),
            target: "http://host.docker.internal:8015",
            ws: true,
          },
          // 广告中台 my_ad（宿主机映射 8016）
          "/ad-api": {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/ad-api/, ""),
            target: "http://host.docker.internal:8016",
            ws: true,
          },
        },
      },
    },
  };
});
