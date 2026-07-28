const fs = require('fs');
const path = require('path');
const os = require('os');

function initial() {
  // 产品类型
  global.productType = 0;
  global.propertyPath = '';
  global.sdbPath = '';
  global.exportPath = '';
  global.importPath = '';
  global.drivePath = './Driver';
  global.demoPath = '';
  global.RestfulIP = '';
  global.__dir = __dirname;
  global.oauthInfo = {
    expires_in: 0,
    checkTokenFlag: false,
    access_token: 0,
    refresh_token: 0,
  };

  const strConfigPath = path.resolve(__dirname, '../config/serverconfig.json');
  let objJson;
  try {
    objJson = JSON.parse(fs.readFileSync(strConfigPath, 'utf8'));
  } catch (e) {
    objJson = {};
  }

  global.isHttp = !(objJson.data && objJson.data.isHttp === false);

  if (objJson.data && objJson.data.ProductTypeRule && objJson.data.ProductTypeRule.ProductType !== undefined) {
    global.productType = objJson.data.ProductTypeRule.ProductType;
    if (objJson.data.ProductTypeRule.Rule && objJson.data.ProductTypeRule.Rule['KF3.6'] == global.productType) {
      let objExConfig = {};
      try {
        objExConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../config/externalConfig.json'), 'utf8'));
      } catch (e) {}
      if (objExConfig.data && objExConfig.data.projectDir) {
        global.sdbPath = objExConfig.data.projectDir;
      }
      global.propertyPath = './Data/config/propertyConfigForKF3.6';
      global.demoPath = './Data/demo/KF3.6';
    } else if (objJson.data.ProductTypeRule.Rule && objJson.data.ProductTypeRule.Rule['KF4.0'] == global.productType) {
      global.sdbPath = '../sdb';
      global.propertyPath = './Data/config/propertyConfigForKF4.0';
      global.demoPath = './Data/demo/KF4.0';
    }
  } else {
    global.productType = 2;
    global.sdbPath = '../sdb';
  }

  // 生成导入导出文件暂存目录
  const strFileStatPath = path.join(__dirname, '../../../sdb/filestation/kingioserver');
  if (!fs.existsSync(strFileStatPath)) {
    fs.mkdirSync(strFileStatPath + '/export', { recursive: true });
    fs.mkdirSync(strFileStatPath + '/import', { recursive: true });
  }
  global.exportPath = strFileStatPath + '/export';
  global.importPath = strFileStatPath + '/import';

  // 公共模块目录
  global.commonDir = path.resolve(`${__dirname}/../../../common/`);
  global.__DIR = __dirname;
}

// 初始化日志
function initLogger() {
  const LoggerInstance = require(`${global.commonDir}/log-utils`).getInstance();
  LoggerInstance.init(`../../../sdb/logs/kingioserver`);
  global.logger = LoggerInstance;
}

// 初始化日志数据库
function initLogDB() {
  const logUtilPath = path.resolve(`${global.commonDir}/sqlitelog-utils`);
  const DbLoggerUtil = require(logUtilPath);
  const kfCenterPath = path.resolve(`${global.commonDir}/../`);
  const logConfig = require(path.resolve(`${global.commonDir}/../config/common.json`));
  const dbLoggerUtil = new DbLoggerUtil({
    kfPath: kfCenterPath,
    dbType: 'center',
    tableName: 'kingioserver',
    batchSize: 50,
    flushInterval: 2000,
    retentionUnit: 'day',
    retention: logConfig.logConfig.retainTime,
    cleanupInterval: 12 * 60 * 60 * 1000,
    level: 'info',
  });
  global.appLogger = {
    system: dbLoggerUtil.getLogger('system', 'kingioserver'),
    operation: dbLoggerUtil.getLogger('opration', 'kingioserver'),
    script: dbLoggerUtil.getLogger('script', 'kingioserver'),
  };
}

function getWebPort() {
  const devConfigPath = path.resolve(__dirname, '../../../../config/devconfig.json');
  let objJson = {};
  try {
    objJson = JSON.parse(fs.readFileSync(devConfigPath, 'utf8'));
  } catch (e) {}
  if (objJson.Error || objJson.startport === undefined || !objJson.devCenterPortShift || objJson.devCenterPortShift.kingio === undefined) {
    return 11002;
  }
  return objJson.startport + objJson.devCenterPortShift.kingio;
}

module.exports = { initial, initLogger, initLogDB, getWebPort };
