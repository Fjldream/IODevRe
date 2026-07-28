const router = require("express").Router();
// 加载中间件
const { midware_response, midware_tenantId, midware_auth } = require(`../../core/middlewares`);
// 加载响应中间件
router.use(midware_response);
// 加载租户校验中间件
router.use(midware_tenantId);
// 加载提取用户信息中间件
router.use(midware_auth.extractUserInfo);
// 注册路由
const routerLoader = require("./route_loader");
routerLoader.registerRoutes(router);

module.exports = router;