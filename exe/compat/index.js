const express = require('express');
module.exports = function () {
  const r = express.Router();
  r.use('/ProjectDev', require('./adapters/adapter_device')());
  return r;
};
