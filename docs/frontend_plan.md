# my 项目前端落地计划(总后台 + 子后台)

> 两个新仓库:
> - `my_manage_backend` 总后台前端 ← 参考 `jh_manage_backend`
> - `my_backend` 站点(子)后台前端 ← 参考 `jh_backend`
> 技术栈与 jh 保持一致: Vben Admin v5.5.9 monorepo(pnpm+turbo)· apps/web-ele(Element Plus)· Vue3+Vite+TS+Pinia。
> 后端接口已全部就绪: 总后台 M0~M6(:8003 /manage), 站点后台 B0~B8(:8000 /backend)。

---


## ⚠️ 运行环境前提(容器, 非宿主机)

前端一律在 mydocker 的 **node 容器**里运行(node:20-alpine v20.19.6 + pnpm 10.24.0, 满足 Vben v5 要求)。

| 项 | 约定 |
|---|---|
| 路径映射 | 宿主 `/Users/wangdante/D/kugou/` = 容器 `/var/www/html/` → 本仓库在容器内为 `/var/www/html/my/my_manage_backend` |
| dev 端口 | 必须用容器已发布的端口: **总后台 5778, 子后台 5779**(9527/5777 归 jh 用, 5173/5174 留给 vite 默认) |
| dev host | Vite dev server 监听 `0.0.0.0`(容器内跑, 宿主浏览器访问 http://localhost:5778) |
| 后端代理 | Go 服务跑在宿主机, 容器内 proxy 目标用 **`http://host.docker.internal:8003`**(总后台)/`:8000`(子后台), 不能写 127.0.0.1 |
| 命令样式 | `docker-compose exec node sh -c "cd /var/www/html/my/my_manage_backend && pnpm install"`(或先 `docker-compose exec node /bin/sh` 进去再操作) |

> 截图里 `vue-element-admin@4.3.1` 报 vue-cli-service not found, 是目录里残留的旧 vue2 工程痕迹(与本计划无关); FM0 铺设的是 Vben v5 骨架, `pnpm install` 后用 `pnpm dev` 启动。

---
## 全局决策(已定)

| 决策点 | 结论 |
|---|---|
| 骨架来源 | **复制 jh 对应项目剥离业务**(不拷 node_modules/.git): jh 已调通 vben 配置/登录页/token注入/401 处理, 比官方骨架重配快 |
| UI 库 | 沿用 web-ele(Element Plus) |
| 菜单方案 | **先方案A**: 前端静态路由(accessMode=frontend), 按钮/接口权限靠后端 Casbin 兜底; 以后需要页面级动态控制再升级方案B(menu 表) |
| 响应适配 | request.ts 拦截器适配 `{code, message, data}`(code=0 成功取 data; 未授权码 → 清token跳登录) |
| baseURL | 总后台 `VITE_GLOB_API_URL=/manage` + Vite proxy `/manage→127.0.0.1:8003`; 子后台 `/backend→127.0.0.1:8000`(生产由 Nginx 同规则转发) |
| 品牌 | 总后台固定标题「漫隐·总后台」; 子后台动态品牌(照抄 jh 的 VBEN_SITE_NAME 机制, 需后端 login/info 加 site_name 字段) |

## 每期工作方式

我写代码 → 你 `pnpm install`(仅首次)/`pnpm dev` → 浏览器走查验收 → 过了进下一期。
后端不动(接口全在), 个别期标注了后端小增量。

---

# 一、总后台 my_manage_backend(先行)

### FM0 · 工程骨架 + 基座适配【最先】
- 复制 jh_manage_backend 骨架(去 node_modules/.git/业务 views/业务 api)
- 改名: package 名/标题「漫隐·总后台」/.env(`VITE_PORT=5778`, `VITE_GLOB_API_URL=/manage`, proxy→`host.docker.internal:8003`, host 0.0.0.0)
- request.ts 适配 `{code,message,data}`; 401/未授权统一登出
- accessMode 改 **frontend**(静态路由), 删除 /app/menus 依赖
- 登录页对接 `POST /manage/auth/login`(admin/admin123), info 对接 `GET /manage/auth/info`
- **验收**: pnpm dev 起来, 登录成功进空框架, 退出/失效跳登录

### FM1 · 商户管理
- 页面: 列表(名称/联系人搜索+状态筛选+分页)、新建/编辑弹窗、启停(带确认)
- 对接: `/manage/merchants*`(M1)
- **验收**: 增改查停全链路; 停用有站点的商户时能看到后端报错提示

### FM2 · 站点管理 + 域名
- 页面: 站点列表(商户/环境/状态筛选)、新建站点表单(site_code 校验提示/DB登记/密码只写)、
  站点详情抽屉: 基本信息 + DB 信息(密码******) + **db-check 按钮**(显示延迟) + 域名子表(绑定/解绑/设主)
- 对接: `/manage/sites*`(M2)
- **验收**: 建站→绑域名→设主→db-check 绿; site_code 非法/域名重复有校验提示

### FM3 · 配置发布(核心页)
- 页面: YAML 编辑器(CodeMirror6, 语法高亮)+「当前 Nacos 配置」只读视图(脱敏) + 发布(备注) + 历史列表(版本/操作人/备注/时间) + 一键回滚(确认弹窗)
- 参考 jh customerManage 的发布/版本历史交互
- 对接: `/manage/sites/{id}/config*`(M3)
- **验收**: 发布→当前配置可见 database 注入+脱敏; 回滚生成新版本且内容回退

### FM4 · 开站清单 + 上线
- 页面: 站点详情内清单卡片(五项 ✓/✗ + detail), 全绿才亮「上线」按钮; 状态流转(筹备/上线/停用)
- 对接: `/manage/sites/{id}/provision-check`、`/status`(M4)
- **验收**: 缺项时上线按钮禁用且后端拦截信息可见; 补齐后可上线

### FM5 · Dashboard + 监控
- 页面: overview 汇总卡片(站点数/用户/今日新增/活跃/充值) + 分站表格(含采集失败标红)、站点健康按钮、审计日志页(筛选)
- 对接: `/manage/overview`、`/sites/{id}/health`、`/logs`(M5)

### FM6 · 系统管理(角色/权限/账号)
- 页面: 角色 CRUD、权限配置(path+method 列表式增删)、管理员 CRUD(角色下拉/重置密码)
- 对接: `/manage/roles*`、`/admins*`(M6)
- **验收**: 复刻 rbac.http 的场景——低权限账号登录只能进授权页面对应接口

### FM7(可选) · 动态菜单升级(方案B)
- 后端增量: manage 加 menu 表+角色绑定接口; 前端切回 accessMode=backend

---

# 二、子后台 my_backend(随后)

### FB0 · 骨架 + 动态品牌
- 复制 my_manage_backend 的 FM0 成果改造(request 层/登录模式直接复用), proxy→:8000, baseURL=/backend
- 动态品牌: 照抄 jh 的 VBEN_SITE_NAME(登录后覆盖标题)
- **后端小增量**: `/backend/auth/login`、`/auth/info` 响应加 `site_code/site_name`(读 SITE_CODE env + 配置)
- **验收**: 登录后标题显示「漫隐」(来自后端)

### FB1 · 用户管理(核心)
- 列表(关键字/渠道/组/状态/注册日期段)、详情抽屉(资产/组/推荐人/轨迹)、禁用/解禁(原因)、调组(组下拉自动回填)、调余额(balance/credit 正负+备注)、余额流水子表 → B1

### FB2 · 财务
- 充值套餐/VIP套餐 CRUD、充值订单对账(状态/时间筛选)、全站流水 → B2

### FB3 · 兑换码
- 批量生成(生成后弹窗展示+一键复制/导出 CSV)、列表(批次/状态)、作废、兑换记录 → B3

### FB4 · 用户组 + 成长
- 用户组 CRUD(改组同步提示)、任务 CRUD(奖励/上限/上下线)、任务记录、签到统计(日历热力或柱状) → B4/B5

### FB5 · 运营
- 公告发布/列表/上下线、客服链接配置、消息监控(关键字)、关注查询、分享统计+拉新排行 → B6/B7

### FB6 · Dashboard
- 概览卡片 + 注册趋势/充值趋势折线 + 渠道分析表 → B8(图表用 ECharts, vben 内置)

### FB7 · 系统管理
- 管理员/角色/权限(与 FM6 同构, 直接复制页面改接口前缀) → B0.x

### FB8(可选) · 动态菜单升级

---

## 里程碑顺序(执行序)

FM0 → FM1 → FM2 → FM3(核心) → FM4 → FM5 → FM6 → 【切 my_backend】FB0 → FB1 → FB2 → FB3~FB7 按运营优先级 → 两边可选动态菜单。
