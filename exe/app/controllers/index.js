/**
 * app/controllers 模块索引
 * 统一导出所有业务控制器实例
 */
module.exports = {
  device: require('./controller_device'),
  variable: require('./controller_variable'),
  driver: require('./controller_driver'),
  uacollect: require('./controller_uacollect'),
  dacollect: require('./controller_dacollect'),
  network: require('./controller_network'),
  realtime: require('./controller_realtime'),
  authority: require('./controller_authority'),
};
