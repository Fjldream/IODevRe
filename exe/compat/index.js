const express = require('express');
module.exports = function () {
  const r = express.Router();
  r.use('/ProjectDev', require('./adapters/adapter_device')());
  r.use('/ProjectVar', require('./adapters/adapter_variable')());
  return r;
};
