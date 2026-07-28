/**
 * app/routers/index.js - 新版业务路由入口
 *
 * 挂载中间件链（响应封装、国际化、租户ID校验、认证提取），
 * 然后通过 route_loader 动态注册所有 /api/v1 路由。
 * 中间件链与 lib/routers/index.js 保持一致。
 */

const router = require('express').Router();
const {
  midware_response,
  midware_tenantId,
  midware_auth,
} = require('../../core/middlewares');
const midware_i18n = require('../../core/middlewares/midware_i18n');

// 中间件链
router.use(midware_response);
router.use(midware_i18n);
router.use(midware_tenantId);
router.use(midware_auth.extractUserInfo);

// 复用 lib 的 route_loader 模式动态注册路由
const RouteLoader = require('../../lib/routers/route_loader');
const routerConfig = require('./api/v1');

const loader = new RouteLoader.constructor
  ? new RouteLoader.constructor()
  : new (Object.getPrototypeOf(RouteLoader).constructor)();

// 手动注入 routerContainer（因为 route_loader 默认读取 lib 的配置）
loader.routerContainer = routerConfig;
loader.registerRoutes(router);

module.exports = router;
