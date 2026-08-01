import { defineOverridesPreferences } from "@vben/preferences";

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    authPageLayout: "panel-center",
    // 前端静态路由模式(方案A); 接口权限由后端 Casbin 兜底
    accessMode: "frontend",
  },
  theme: {
    builtinType: "pink",
    colorPrimary: "hsl(347 77% 60%)",
  },
  // 添加 logo 配置
  logo: {
    enable: true,
    source: "/logo.png", // 亮色主题 logo
  },
});
