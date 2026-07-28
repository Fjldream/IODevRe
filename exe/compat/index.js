/**
 * compat/index.js - gateway 兼容适配层入口
 *
 * 注册所有旧路径适配器，使 gateway 可以继续使用原有接口路径。
 * 每个适配器处理一个旧路径前缀。
 *
 * 剥离方式：删除 `app.use('/', require('./compat')());` 一行即可。
 * 或删除整个 compat/ 目录。
 */

const express = require('express');

module.exports = function () {
  const router = express.Router();

  // /ProjectDev/* → 设备管理
  router.use('/ProjectDev', require('./adapters/adapter_device')());

  // /ProjectVar/* → 变量管理
  router.use('/ProjectVar', require('./adapters/adapter_variable')());

  // /DriverManage/* → 驱动管理
  router.use('/DriverManage', require('./adapters/adapter_driver')());

  // /Authority/* → 权限管理（login 等接口注册在 adapter_authority 中）
  router.use('/Authority', require('./adapters/adapter_authority')());

  // /Project/* → 网络/存储/转发
  router.use('/Project', require('./adapters/adapter_network')());

  // /api/v1 → UA/DA/实时数据/转发（旧格式，直接注册中间件）
  const restfulAdapter = require('./adapters/adapter_restful');
  restfulAdapter(router);

  return router;
};
