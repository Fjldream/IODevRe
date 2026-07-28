/**
 * controller_realtime.js - 实时数据控制器
 *
 * 负责实时数据查询的 HTTP 请求处理。
 * 路由配置见 app/routers/api/v1/realtime_router_config.js
 */

const { request_handler } = require('../../core/utils');
const RealtimeDataService = require('../services/RealtimeDataService');

/**
 * 创建 RealtimeDataService 实例
 * @returns {RealtimeDataService}
 */
function getService() {
  return new RealtimeDataService();
}

class RealtimeController {
  /**
   * GET /api/v1/batchrealvalue - 批量获取实时值
   * @param {Request} req - query: { tagNames }
   * @param {Response} res
   */
  async getBatchRealValue(req, res) {
    try {
      const { tagNames } = request_handler.httpGetData(req);
      const names = typeof tagNames === 'string' ? tagNames.split(',') : (tagNames || []);
      const values = getService().getBatchRealValue(names);
      res.sendOk(values);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/realtimeVarInfo - 获取实时变量信息
   * @param {Request} req - query: { projectName }
   * @param {Response} res
   */
  async getRealtimeVarInfo(req, res) {
    try {
      const { projectName } = request_handler.httpGetData(req);
      const info = getService().getRealtimeVarInfo(projectName);
      res.sendOk(info);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }
}

module.exports = new RealtimeController();
