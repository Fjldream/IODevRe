/**
 * realtime_router_config.js - 实时数据路由配置
 *
 * 定义实时数据查询相关 RESTful 接口路由及其处理器。
 */

const { realtime } = require('../../../controllers');

module.exports = {
  get: {
    '/batchrealvalue': [realtime.getBatchRealValue],
    '/realtimeVarInfo': [realtime.getRealtimeVarInfo],
  },
};
