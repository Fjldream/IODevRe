const express = require('express');
module.exports = function () {
  const r = express.Router();
  r.use('/ProjectDev', require('./adapters/adapter_device')());
  // 后续步骤添加: /ProjectVar, /DriverManage, /Authority, /Project
  // 以及 adapter_restful
  return r;
};
