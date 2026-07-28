/**
 * bootstrap.js - kingioserver 启动初始化模块
 *
 * 负责：
 * - 全局变量初始化（productType、sdbPath、路径配置）
 * - 日志系统初始化（文件日志 + sqlite 日志数据库）
 * - 服务端口读取
 *
 * 路径约定（以 exe/ 为基准）：
 * - sdb/   → ../../sdb  （工程文件存储，与 kingdevopscenter 平级）
 * - common/ → ../common  （公共模块，kingioserver_Re 内部）
 * - config/ → ../config  （平台级配置，kingioserver_Re 内部）
 */

const fs = require('fs');
const path = require('path');

/** exe 目录绝对路径，所有相对路径以此为基准 */
const EXE_DIR = path.resolve(__dirname, '..');

/**
 * 初始化全局变量和路径配置
 *
 * 读取 serverconfig.json 确定产品类型（KF3.6/KF4.0），
 * 设置 sdbPath、propertyPath、exportPath 等全局路径。
 * KF3.6 从 externalConfig.json 读取工程目录；
 * KF4.0 使用 sdb/ 作为工程文件根目录。
 */
function initial() {
  // ---- 全局变量默认值 ----
  global.productType = 0;
  global.propertyPath = '';
  global.sdbPath = '';
  global.exportPath = '';
  global.importPath = '';
  global.drivePath = path.join(EXE_DIR, 'Driver');
  global.demoPath = '';
  global.RestfulIP = '';
  global.__dir = EXE_DIR;
  global.__DIR = EXE_DIR;
  global.oauthInfo = {
    expires_in: 0,
    checkTokenFlag: false,
    access_token: 0,
    refresh_token: 0,
  };

  // ---- 读取服务配置 ----
  const strConfigPath = path.join(EXE_DIR, 'config', 'serverconfig.json');
  let objJson;
  try {
    objJson = JSON.parse(fs.readFileSync(strConfigPath, 'utf8'));
  } catch (e) {
    objJson = {};
  }

  global.isHttp = !(objJson.data && objJson.data.isHttp === false);

  // ---- 根据产品类型设置路径 ----
  if (
    objJson.data &&
    objJson.data.ProductTypeRule &&
    objJson.data.ProductTypeRule.ProductType !== undefined
  ) {
    global.productType = objJson.data.ProductTypeRule.ProductType;

    if (
      objJson.data.ProductTypeRule.Rule &&
      objJson.data.ProductTypeRule.Rule['KF3.6'] == global.productType
    ) {
      // KF3.6: sdbPath 从 externalConfig 读取
      let objExConfig = {};
      try {
        const exConfigPath = path.join(EXE_DIR, '..', 'config', 'externalConfig.json');
        objExConfig = JSON.parse(fs.readFileSync(exConfigPath, 'utf8'));
      } catch (e) {
        /* ignore */
      }
      if (objExConfig.data && objExConfig.data.projectDir) {
        global.sdbPath = objExConfig.data.projectDir;
      }
      global.propertyPath = path.join(EXE_DIR, 'Data', 'config', 'propertyConfigForKF3.6');
      global.demoPath = path.join(EXE_DIR, 'Data', 'demo', 'KF3.6');
    } else if (
      objJson.data.ProductTypeRule.Rule &&
      objJson.data.ProductTypeRule.Rule['KF4.0'] == global.productType
    ) {
      // KF4.0: sdb 在 kingdevopscenter 同级目录
      global.sdbPath = path.resolve(EXE_DIR, '..', '..', 'sdb');
      global.propertyPath = path.join(EXE_DIR, 'Data', 'config', 'propertyConfigForKF4.0');
      global.demoPath = path.join(EXE_DIR, 'Data', 'demo', 'KF4.0');
    }
  } else {
    // 默认 KF4.0
    global.productType = 2;
    global.sdbPath = path.resolve(EXE_DIR, '..', '..', 'sdb');
  }

  // ---- 导入导出临时目录 ----
  const strFileStatPath = path.resolve(
    EXE_DIR,
    '..',
    '..',
    'sdb',
    'filestation',
    'kingioserver'
  );
  if (!fs.existsSync(path.join(strFileStatPath, 'export'))) {
    fs.mkdirSync(path.join(strFileStatPath, 'export'), { recursive: true });
  }
  if (!fs.existsSync(path.join(strFileStatPath, 'import'))) {
    fs.mkdirSync(path.join(strFileStatPath, 'import'), { recursive: true });
  }
  global.exportPath = path.join(strFileStatPath, 'export');
  global.importPath = path.join(strFileStatPath, 'import');

  // ---- 公共模块目录（kingioserver_Re/common/） ----
  global.commonDir = path.resolve(EXE_DIR, '..', 'common');
}

/**
 * 初始化文件日志系统
 *
 * 使用 common/log-utils 模块获取 Logger 单例，
 * 日志文件输出到 sdb/logs/kingioserver 目录。
 */
function initLogger() {
  const LoggerInstance = require(path.join(global.commonDir, 'log-utils')).getInstance();
  const logDir = path.resolve(EXE_DIR, '..', '..', 'sdb', 'logs', 'kingioserver');
  LoggerInstance.init(logDir);
  global.logger = LoggerInstance;
}

/**
 * 初始化 SQLite 日志数据库
 *
 * 使用 common/sqlitelog-utils 模块，将运行日志持久化到 sqlite。
 * 按天保留日志，定期清理过期数据，批量写入以优化性能。
 */
function initLogDB() {
  const logUtilPath = path.join(global.commonDir, 'sqlitelog-utils');
  const DbLoggerUtil = require(logUtilPath);
  const kfCenterPath = path.resolve(EXE_DIR, '..', '..');
  const logConfigPath = path.join(global.commonDir, '..', 'config', 'common.json');
  const logConfig = require(logConfigPath);

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

/**
 * 获取 Web 服务端口号
 *
 * 从 devconfig.json 读取 startport + devCenterPortShift.kingio 计算端口。
 * @returns {number} 端口号，默认 11002
 */
function getWebPort() {
  const devConfigPath = path.resolve(EXE_DIR, '..', 'config', 'devconfig.json');
  let objJson = {};
  try {
    objJson = JSON.parse(fs.readFileSync(devConfigPath, 'utf8'));
  } catch (e) {
    /* ignore */
  }

  if (
    objJson.Error ||
    objJson.startport === undefined ||
    !objJson.devCenterPortShift ||
    objJson.devCenterPortShift.kingio === undefined
  ) {
    return 11002;
  }
  return objJson.startport + objJson.devCenterPortShift.kingio;
}

module.exports = { initial, initLogger, initLogDB, getWebPort };
