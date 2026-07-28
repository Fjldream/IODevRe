/**
 * app/services 模块索引
 * 统一导出所有业务服务类
 */
module.exports = {
  DeviceService: require('./DeviceService'),
  VariableService: require('./VariableService'),
  DriverService: require('./DriverService'),
  UACollectService: require('./UACollectService'),
  DACollectService: require('./DACollectService'),
  NetworkService: require('./NetworkService'),
  StorageService: require('./StorageService'),
  TransService: require('./TransService'),
  RealtimeDataService: require('./RealtimeDataService'),
  AuthorityService: require('./AuthorityService'),
};
