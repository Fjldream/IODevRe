const ErrorCodes = {
  // 通用 (0-999)
  SUCCESS:                    { code: 0,   key: 'success' },
  INTERNAL_ERROR:             { code: 500, key: 'internalError' },
  VALIDATION_ERROR:           { code: 400, key: 'validationError' },
  NOT_FOUND:                  { code: 404, key: 'notFound' },
  UNAUTHORIZED:               { code: 401, key: 'unauthorized' },
  FILE_NOT_FOUND:             { code: 405, key: 'fileNotFound' },
  FILE_READ_ERROR:            { code: 406, key: 'fileReadError' },
  FILE_WRITE_ERROR:           { code: 407, key: 'fileWriteError' },

  // 工程 (900-999)
  PROJECT_NOT_FOUND:          { code: 900, key: 'projectNotFound' },
  PROJECT_NAME_EXISTS:        { code: 901, key: 'projectNameExists' },
  PROJECT_GROUP_NOT_FOUND:    { code: 902, key: 'projectGroupNotFound' },

  // 设备 (1000-1999)
  DEVICE_NOT_FOUND:           { code: 1000, key: 'deviceNotFound' },
  DEVICE_NAME_EXISTS:         { code: 1001, key: 'deviceNameExists' },
  DEVICE_GROUP_NOT_FOUND:     { code: 1002, key: 'deviceGroupNotFound' },
  DEVICE_GROUP_NAME_EXISTS:   { code: 1003, key: 'deviceGroupNameExists' },
  DEVICE_ADDRESS_INVALID:     { code: 1004, key: 'deviceAddressInvalid' },
  DEVICE_IMPORT_FAILED:       { code: 1005, key: 'deviceImportFailed' },
  DEVICE_EXPORT_FAILED:       { code: 1006, key: 'deviceExportFailed' },
  DEVICE_HAS_VARIABLES:       { code: 1007, key: 'deviceHasVariables' },

  // 变量 (2000-2999)
  VARIABLE_NOT_FOUND:         { code: 2000, key: 'variableNotFound' },
  VARIABLE_NAME_EXISTS:       { code: 2001, key: 'variableNameExists' },
  VARIABLE_GROUP_NOT_FOUND:   { code: 2002, key: 'variableGroupNotFound' },
  VARIABLE_GROUP_NAME_EXISTS: { code: 2003, key: 'variableGroupNameExists' },
  VARIABLE_IMPORT_FAILED:     { code: 2004, key: 'variableImportFailed' },
  VARIABLE_EXPORT_FAILED:     { code: 2005, key: 'variableExportFailed' },
  VARIABLE_REG_INVALID:       { code: 2006, key: 'variableRegInvalid' },
  VARIABLE_TYPE_INVALID:      { code: 2007, key: 'variableTypeInvalid' },
  VARIABLE_DEVICE_NOT_FOUND:  { code: 2008, key: 'variableDeviceNotFound' },
  VARIABLE_HAS_VARIABLES:     { code: 2009, key: 'variableGroupHasVariables' },

  // 驱动 (3000-3999)
  DRIVER_NOT_FOUND:           { code: 3000, key: 'driverNotFound' },
  DRIVER_INSTALL_FAILED:      { code: 3001, key: 'driverInstallFailed' },
  DRIVER_UNINSTALL_FAILED:    { code: 3002, key: 'driverUninstallFailed' },
  DRIVER_ALREADY_EXISTS:      { code: 3004, key: 'driverAlreadyExists' },
  DRIVER_FILE_NOT_FOUND:      { code: 3004, key: 'driverFileNotFound' },

  // 网络/存储/转发 (4000-4999)
  NETWORK_CONFIG_INVALID:     { code: 4000, key: 'networkConfigInvalid' },
  STORAGE_NOT_FOUND:          { code: 4001, key: 'storageNotFound' },
  STORAGE_CONFIG_INVALID:     { code: 4002, key: 'storageConfigInvalid' },
  TRANS_NOT_FOUND:            { code: 4003, key: 'transNotFound' },
  TRANS_CONFIG_INVALID:       { code: 4004, key: 'transConfigInvalid' },
  DB_CONNECT_FAILED:          { code: 4005, key: 'dbConnectFailed' },

  // UA采集 (5000-5999)
  UA_CONNECT_FAILED:          { code: 5000, key: 'uaConnectFailed' },
  UA_DEVICE_NOT_FOUND:        { code: 5001, key: 'uaDeviceNotFound' },
  UA_SOURCE_BROWSE_FAILED:    { code: 5002, key: 'uaSourceBrowseFailed' },
  UA_IMPORT_FAILED:           { code: 5003, key: 'uaImportFailed' },
  UA_EXPORT_FAILED:           { code: 5004, key: 'uaExportFailed' },

  // DA采集 (6000-6999)
  DA_CONNECT_FAILED:          { code: 6000, key: 'daConnectFailed' },
  DA_DEVICE_NOT_FOUND:        { code: 6001, key: 'daDeviceNotFound' },
  DA_DEVICE_GROUP_NOT_FOUND:  { code: 6002, key: 'daDeviceGroupNotFound' },
  DA_SOURCE_BROWSE_FAILED:    { code: 6003, key: 'daSourceBrowseFailed' },
  DA_IMPORT_FAILED:           { code: 6004, key: 'daImportFailed' },
  DA_EXPORT_FAILED:           { code: 6005, key: 'daExportFailed' },

  // 权限 (7000-7999)
  PERMISSION_DENIED:          { code: 7000, key: 'permissionDenied' },
  TOKEN_INVALID:              { code: 7001, key: 'tokenInvalid' },
  TOKEN_EXPIRED:              { code: 7002, key: 'tokenExpired' },
  USER_NOT_FOUND:             { code: 7003, key: 'userNotFound' },
};

module.exports = ErrorCodes;
