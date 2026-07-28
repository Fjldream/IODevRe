/**
 * app/routers/api/v1/index.js - 新版 RESTful API 路由汇总
 *
 * 聚合所有业务模块的路由配置，供 route_loader 动态注册。
 * 添加新模块时只需引入对应的 router_config 即可。
 */

const routerConfig = {};

routerConfig.device = require('./device_router_config');
routerConfig.variable = require('./variable_router_config');
routerConfig.driver = require('./driver_router_config');
routerConfig.network = require('./network_router_config');
routerConfig.uaCollect = require('./uaCollect_router_config');
routerConfig.daCollect = require('./daCollect_router_config');
routerConfig.realtime = require('./realtime_router_config');
routerConfig.authority = require('./authority_router_config');

module.exports = routerConfig;
