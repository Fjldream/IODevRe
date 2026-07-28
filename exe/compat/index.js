const express = require('express');
module.exports = function () {
  const r = express.Router();
  r.use('/ProjectDev', require('./adapters/adapter_device')());
  r.use('/ProjectVar', require('./adapters/adapter_variable')());
  r.use('/DriverManage', require('./adapters/adapter_driver')());
  r.use('/Project', require('./adapters/adapter_network')());
  r.use('/Authority', require('./adapters/adapter_authority')());
  require('./adapters/adapter_restful')(r);
  return r;
};
