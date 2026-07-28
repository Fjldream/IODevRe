module.exports = {
  DeviceService: require('./DeviceService'),
  VariableService: require('./VariableService'),
  DriverService: require('./DriverService'),
  NetworkService: require('./NetworkService').NetworkService,
  StorageService: require('./NetworkService').StorageService,
  TransService: require('./NetworkService').TransService,
  UACollectService: require('./UACollectService'),
  DACollectService: require('./DACollectService'),
  RealtimeDataService: require('./RealtimeDataService'),
  AuthorityService: require('./AuthorityService'),
};
