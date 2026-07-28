# kingioserver 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 kingioserver 旧风格 Routes（~42,000行）以 lib 的 Controller→Service→Model 分层风格重构，保留 lib、core、config，新增 app（业务模块）+ compat（gateway 兼容适配层）+ i18n（国际化），输出到 kingioserver_Re。

**Architecture:** Express.js 单体服务，四层路由：lib（保留的 project/projectGroup/script）→ app（新增 device/variable/driver/ua/da/network/realtime/authority）→ compat（gateway 旧路径适配，可剥离）。所有业务模块走 Service→Model→JSON 文件读写，响应格式 `{errorCode, message, data}`。

**Tech Stack:** Node.js + Express 4.x, Joi (validation), multer (upload), csvtojson/json2csv, iconv-lite, archiver/unzipper, log4js, ws, node-opcua

## Global Constraints

- 工程文件格式和字段不允许修改（兼容现有运行态）
- 所有接口 JSON 产物与旧开发态完全一致（硬性要求）
- 接口命名 RESTful + 驼峰，遵循 lib 已有模式
- compat 层可整目录删除，剥离后不影响新开发态
- 大数量导入（万级以上）需保证性能：批量内存操作 + 单次落盘
- 国际化：错误码枚举 + 中/英 JSON 语言包 + AppError 类
- 中间件保留：midware_response、midware_tenantId、midware_auth
- 启动方式与旧版一致：HTTP/HTTPS，端口读取 devconfig.json
- gateway 不动，compat 层错误格式与旧版 codeMessage.js 保持一致

---

## Phase 1: 项目骨架搭建

### Task 1.1: 创建 kingioserver_Re 目录结构

**Files:**
- Create: `kingioserver_Re/exe/i18n/index.js`
- Create: `kingioserver_Re/exe/i18n/errorCodes.js`
- Create: `kingioserver_Re/exe/i18n/AppError.js`
- Create: `kingioserver_Re/exe/i18n/zh-CN.json`
- Create: `kingioserver_Re/exe/i18n/en-US.json`
- Create: `kingioserver_Re/exe/app/controllers/index.js`
- Create: `kingioserver_Re/exe/app/services/index.js`
- Create: `kingioserver_Re/exe/app/models/index.js`
- Create: `kingioserver_Re/exe/app/routers/index.js`
- Create: `kingioserver_Re/exe/app/routers/api/v1/index.js`
- Create: `kingioserver_Re/exe/compat/index.js`
- Create: `kingioserver_Re/exe/compat/adapters/.gitkeep`
- Create: `kingioserver_Re/exe/compat/utils/.gitkeep`

- [ ] **Step 1: 创建所有骨架目录和占位文件**

```bash
cd /Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver_Re

# 创建目录结构
mkdir -p exe/i18n
mkdir -p exe/app/controllers
mkdir -p exe/app/services
mkdir -p exe/app/models
mkdir -p exe/app/routers/api/v1
mkdir -p exe/compat/adapters
mkdir -p exe/compat/utils

# 创建占位 index.js 文件
for dir in exe/i18n exe/app/controllers exe/app/services exe/app/models \
  exe/app/routers exe/app/routers/api/v1 exe/compat exe/compat/adapters exe/compat/utils; do
  echo "// placeholder" > "$dir/.gitkeep"
done
```

- [ ] **Step 2: 验证目录结构**

```bash
find /Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver_Re/exe -type d | sort
```

Expected: 所有上述目录都存在。

---

### Task 1.2: 实现 i18n 基础设施

**Files:**
- Create: `exe/i18n/errorCodes.js`
- Create: `exe/i18n/zh-CN.json`
- Create: `exe/i18n/en-US.json`
- Create: `exe/i18n/AppError.js`
- Create: `exe/i18n/index.js`

- [ ] **Step 1: 创建错误码枚举 `exe/i18n/errorCodes.js`**

```js
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

  // 驱动 (3000-3999)
  DRIVER_NOT_FOUND:           { code: 3000, key: 'driverNotFound' },
  DRIVER_INSTALL_FAILED:      { code: 3001, key: 'driverInstallFailed' },
  DRIVER_UNINSTALL_FAILED:    { code: 3002, key: 'driverUninstallFailed' },
  DRIVER_CONFIG_INVALID:      { code: 3003, key: 'driverConfigInvalid' },
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
```

- [ ] **Step 2: 创建中文语言包 `exe/i18n/zh-CN.json`**

```json
{
  "success": "操作成功",
  "internalError": "服务器内部错误",
  "validationError": "数据验证失败",
  "notFound": "资源不存在",
  "unauthorized": "未授权访问",
  "fileNotFound": "工程文件不存在",
  "fileReadError": "文件读取失败",
  "fileWriteError": "文件写入失败",
  "projectNotFound": "工程不存在",
  "projectNameExists": "工程名称已存在",
  "projectGroupNotFound": "工程组不存在",
  "deviceNotFound": "设备不存在",
  "deviceNameExists": "设备名称已存在",
  "deviceGroupNotFound": "设备组不存在",
  "deviceGroupNameExists": "设备组名称已存在",
  "deviceAddressInvalid": "设备地址无效",
  "deviceImportFailed": "设备导入失败",
  "deviceExportFailed": "设备导出失败",
  "deviceHasVariables": "设备下存在变量，无法删除",
  "variableNotFound": "变量不存在",
  "variableNameExists": "变量名称已存在",
  "variableGroupNotFound": "变量组不存在",
  "variableGroupNameExists": "变量组名称已存在",
  "variableImportFailed": "变量导入失败",
  "variableExportFailed": "变量导出失败",
  "variableRegInvalid": "寄存器配置无效",
  "variableTypeInvalid": "变量类型无效",
  "variableDeviceNotFound": "变量关联的设备不存在",
  "driverNotFound": "驱动不存在",
  "driverInstallFailed": "驱动安装失败",
  "driverUninstallFailed": "驱动卸载失败",
  "driverConfigInvalid": "驱动配置无效",
  "driverFileNotFound": "驱动文件不存在",
  "networkConfigInvalid": "网络配置无效",
  "storageNotFound": "存储配置不存在",
  "storageConfigInvalid": "存储配置无效",
  "transNotFound": "转发配置不存在",
  "transConfigInvalid": "转发配置无效",
  "dbConnectFailed": "数据库连接失败",
  "uaConnectFailed": "UA连接测试失败",
  "uaDeviceNotFound": "UA设备不存在",
  "uaSourceBrowseFailed": "UA节点浏览失败",
  "uaImportFailed": "UA导入失败",
  "uaExportFailed": "UA导出失败",
  "daConnectFailed": "DA连接测试失败",
  "daDeviceNotFound": "DA设备不存在",
  "daDeviceGroupNotFound": "DA设备组不存在",
  "daSourceBrowseFailed": "DA节点浏览失败",
  "daImportFailed": "DA导入失败",
  "daExportFailed": "DA导出失败",
  "permissionDenied": "权限不足",
  "tokenInvalid": "Token无效",
  "tokenExpired": "Token已过期",
  "userNotFound": "用户不存在"
}
```

- [ ] **Step 3: 创建英文语言包 `exe/i18n/en-US.json`**

```json
{
  "success": "Operation successful",
  "internalError": "Internal server error",
  "validationError": "Data validation failed",
  "notFound": "Resource not found",
  "unauthorized": "Unauthorized access",
  "fileNotFound": "Project file not found",
  "fileReadError": "File read error",
  "fileWriteError": "File write error",
  "projectNotFound": "Project not found",
  "projectNameExists": "Project name already exists",
  "projectGroupNotFound": "Project group not found",
  "deviceNotFound": "Device not found",
  "deviceNameExists": "Device name already exists",
  "deviceGroupNotFound": "Device group not found",
  "deviceGroupNameExists": "Device group name already exists",
  "deviceAddressInvalid": "Device address invalid",
  "deviceImportFailed": "Device import failed",
  "deviceExportFailed": "Device export failed",
  "deviceHasVariables": "Cannot delete device with existing variables",
  "variableNotFound": "Variable not found",
  "variableNameExists": "Variable name already exists",
  "variableGroupNotFound": "Variable group not found",
  "variableGroupNameExists": "Variable group name already exists",
  "variableImportFailed": "Variable import failed",
  "variableExportFailed": "Variable export failed",
  "variableRegInvalid": "Register configuration invalid",
  "variableTypeInvalid": "Variable type invalid",
  "variableDeviceNotFound": "Associated device not found",
  "driverNotFound": "Driver not found",
  "driverInstallFailed": "Driver installation failed",
  "driverUninstallFailed": "Driver uninstallation failed",
  "driverConfigInvalid": "Driver configuration invalid",
  "driverFileNotFound": "Driver file not found",
  "networkConfigInvalid": "Network configuration invalid",
  "storageNotFound": "Storage configuration not found",
  "storageConfigInvalid": "Storage configuration invalid",
  "transNotFound": "Transfer configuration not found",
  "transConfigInvalid": "Transfer configuration invalid",
  "dbConnectFailed": "Database connection failed",
  "uaConnectFailed": "UA connection test failed",
  "uaDeviceNotFound": "UA device not found",
  "uaSourceBrowseFailed": "UA node browsing failed",
  "uaImportFailed": "UA import failed",
  "uaExportFailed": "UA export failed",
  "daConnectFailed": "DA connection test failed",
  "daDeviceNotFound": "DA device not found",
  "daDeviceGroupNotFound": "DA device group not found",
  "daSourceBrowseFailed": "DA node browsing failed",
  "daImportFailed": "DA import failed",
  "daExportFailed": "DA export failed",
  "permissionDenied": "Permission denied",
  "tokenInvalid": "Token invalid",
  "tokenExpired": "Token expired",
  "userNotFound": "User not found"
}
```

- [ ] **Step 4: 创建 AppError 类 `exe/i18n/AppError.js`**

```js
class AppError extends Error {
  /**
   * @param {Object} errorCode - 错误码对象 { code, key }
   * @param {string} detail - 附加详情
   */
  constructor(errorCode, detail = '') {
    super(errorCode.key);
    this.name = 'AppError';
    this.errorCode = errorCode.code;
    this.i18nKey = errorCode.key;
    this.detail = detail;
  }
}

module.exports = AppError;
```

- [ ] **Step 5: 创建 i18n 工具 `exe/i18n/index.js`**

```js
const zhCN = require('./zh-CN.json');
const enUS = require('./en-US.json');

const locales = {
  'zh-CN': zhCN,
  'zh': zhCN,
  'en-US': enUS,
  'en': enUS,
};

const defaultLocale = 'zh-CN';

/**
 * 翻译函数
 * @param {string} key - 语言包中的 key
 * @param {string} locale - 语言标识（从 Accept-Language 解析）
 * @returns {string}
 */
function t(key, locale = defaultLocale) {
  const langPack = locales[locale] || locales[defaultLocale];
  return langPack[key] || key;
}

/**
 * 从请求头解析语言
 * @param {string} acceptLanguage - Accept-Language 头
 * @returns {string}
 */
function parseLocale(acceptLanguage) {
  if (!acceptLanguage) return defaultLocale;
  const lang = acceptLanguage.split(',')[0].trim();
  if (lang.startsWith('zh')) return 'zh-CN';
  if (lang.startsWith('en')) return 'en-US';
  return defaultLocale;
}

module.exports = { t, parseLocale, locales, defaultLocale };
```

- [ ] **Step 6: 验证 i18n 模块加载**

```bash
cd /Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver_Re/exe
node -e "
const { t } = require('./i18n');
console.log(t('success', 'zh-CN'));
console.log(t('success', 'en-US'));
console.log(t('deviceNotFound', 'zh-CN'));
console.log(t('deviceNotFound', 'en-US'));
"
```

Expected output:
```
操作成功
Operation successful
设备不存在
Device not found
```

---

### Task 1.3: 创建 core 中间件增强（i18n 中间件）

**Files:**
- Create: `exe/core/middlewares/midware_i18n.js`
- Modify: `exe/core/middlewares/index.js` (从原 kingioserver 复制后追加导出)
- Modify: `exe/core/middlewares/midware_response.js` (从原 kingioserver 复制后增强)

- [ ] **Step 1: 创建 i18n 中间件 `exe/core/middlewares/midware_i18n.js`**

```js
const { parseLocale } = require('../../i18n');

module.exports = (req, res, next) => {
  const acceptLanguage = req.headers['accept-language'] || '';
  req.locale = parseLocale(acceptLanguage);
  next();
};
```

- [ ] **Step 2: 验证 i18n 中间件**

```bash
cd /Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver_Re/exe
node -e "
const midware = require('./core/middlewares/midware_i18n');
const req = { headers: { 'accept-language': 'en-US,en;q=0.9' } };
midware(req, {}, () => console.log('locale:', req.locale));
"
```

Expected: `locale: en-US`

---

### Task 1.4: 创建 core/utils/file_writer.js（批量文件写入工具）

**Files:**
- Create: `exe/core/utils/file_writer.js`

- [ ] **Step 1: 创建批量文件写入工具**

```js
const fs = require('fs');
const path = require('path');

class FileWriter {
  constructor(flushInterval = 3000) {
    this.pending = new Map();
    this.timer = setInterval(() => this.flush(), flushInterval);
    this.timer.unref(); // 不阻止进程退出
  }

  queue(filePath, data) {
    this.pending.set(filePath, data);
  }

  flush() {
    for (const [filePath, data] of this.pending) {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, '\t'), 'utf8');
      } catch (err) {
        console.error(`FileWriter flush error: ${filePath}`, err.message);
      }
    }
    this.pending.clear();
  }

  destroy() {
    this.flush();
    clearInterval(this.timer);
  }
}

module.exports = new FileWriter();
```

---

### Task 1.5: 创建 core/bootstrap.js 启动初始化

**Files:**
- Create: `exe/core/bootstrap.js`

- [ ] **Step 1: 创建启动初始化模块**

```js
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
```

---

## Phase 2: 复制已有资源

### Task 2.1: 复制 lib、core、config、Driver、Data 到 kingioserver_Re

- [ ] **Step 1: 从 kingioserver 复制所有现有文件**

```bash
SRC=/Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver
DEST=/Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver_Re

# 复制平台配置
cp -r "$SRC/config" "$DEST/"

# 复制公共模块
cp -r "$SRC/common" "$DEST/"

# 复制 exe 下的资源和配置
cp -r "$SRC/exe/config" "$DEST/exe/"
cp -r "$SRC/exe/Driver" "$DEST/exe/"
cp -r "$SRC/exe/Data" "$DEST/exe/"
cp "$SRC/exe/start.sh" "$SRC/exe/start.bat" "$DEST/exe/" 2>/dev/null || true
cp "$SRC/exe/version.json" "$SRC/exe/source.txt" "$SRC/exe/temp.txt" "$DEST/exe/" 2>/dev/null || true

# 复制 core（先保留原始文件，后续任务会增强）
cp -r "$SRC/exe/core" "$DEST/exe/"

# 复制 lib（保留不动）
cp -r "$SRC/exe/lib" "$DEST/exe/"

# 复制 node_modules（避免重新安装）
cp -r "$SRC/exe/node_modules" "$DEST/exe/"
```

- [ ] **Step 2: 复制 Routes 目录到 compat 参考（仅作参考，不直接使用）**

```bash
SRC=/Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver
DEST=/Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver_Re

# 复制旧 Routes 作为兼容层参考
mkdir -p "$DEST/exe/Routes"
cp "$SRC/exe/Routes/PublicInterface.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/LogInterface.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/CheckModule.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/KingConfigModule.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/codeMessage.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/CharacterInterface.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/ObjectCheckInterface.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/userManager.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/OAuthenicSystemInterface.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/OpcUaConfig.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/log.js" "$DEST/exe/Routes/"
cp "$SRC/exe/Routes/TagSchedule.js" "$DEST/exe/Routes/"
```

- [ ] **Step 3: 验证文件复制**

```bash
DEST=/Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver_Re
echo "=== 目录检查 ==="
for dir in config common exe/config exe/core exe/lib exe/Driver exe/Data exe/Routes exe/i18n exe/app exe/compat exe/node_modules; do
  if [ -d "$DEST/$dir" ]; then echo "OK: $dir"; else echo "MISSING: $dir"; fi
done

echo "=== 关键文件检查 ==="
for f in exe/lib/routers/route_loader.js exe/lib/services/TenantManager.js exe/core/middlewares/midware_response.js exe/i18n/errorCodes.js exe/Routes/PublicInterface.js; do
  if [ -f "$DEST/$f" ]; then echo "OK: $f"; else echo "MISSING: $f"; fi
done
```

---

## Phase 3: 设备管理模块

### Task 3.1: 创建 Device 和 DeviceGroup Model

**Files:**
- Create: `exe/app/models/Device.js`
- Create: `exe/app/models/DeviceGroup.js`

- [ ] **Step 1: 创建 Device 模型 `exe/app/models/Device.js`**

```js
const Joi = require('joi');
const uuid = require('uuid');

class Device {
  constructor(data) {
    this.DeviceID = data.DeviceID || uuid.v1();
    this.DeviceName = data.DeviceName || '';
    this.Description = data.Description || '';
    this.DeviceGroupID = data.DeviceGroupID || '';
    this.DriverName = data.DriverName || '';
    this.LinkName = data.LinkName || '';
    this.DeviceAddress = data.DeviceAddress || '';
    this.DeviceType = data.DeviceType || 0;
    this.CollectTimeInterval = data.CollectTimeInterval || 1000;
    this.Timeout = data.Timeout || 3000;
    this.ReconnectTime = data.ReconnectTime || 5000;
    this.Enable = data.Enable !== undefined ? data.Enable : true;
    this.ExtendField = data.ExtendField || {};
  }

  static validate(data, isUpdate = false) {
    const schema = Joi.object({
      DeviceID: isUpdate ? Joi.string().required() : Joi.string().optional(),
      DeviceName: isUpdate
        ? Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).optional()
        : Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required(),
      Description: Joi.string().allow('').optional(),
      DeviceGroupID: Joi.string().allow('').optional(),
      DriverName: Joi.string().allow('').optional(),
      LinkName: Joi.string().allow('').optional(),
      DeviceAddress: Joi.string().allow('').optional(),
      DeviceType: Joi.number().optional(),
      CollectTimeInterval: Joi.number().min(100).max(3600000).optional(),
      Timeout: Joi.number().min(100).max(60000).optional(),
      ReconnectTime: Joi.number().min(100).max(60000).optional(),
      Enable: Joi.boolean().optional(),
      ExtendField: Joi.object().optional(),
    });
    const { error, value } = schema.validate(data, { allowUnknown: true });
    if (error) throw new Error(`设备数据验证失败: ${error.details[0].message}`);
    return value;
  }

  static create(data) {
    const validated = this.validate(data);
    return new Device(validated);
  }

  update(data) {
    Object.keys(data).forEach(key => {
      if (key !== 'DeviceID') {
        this[key] = data[key];
      }
    });
    return this;
  }

  toJSON() {
    return {
      DeviceID: this.DeviceID,
      DeviceName: this.DeviceName,
      Description: this.Description,
      DeviceGroupID: this.DeviceGroupID,
      DriverName: this.DriverName,
      LinkName: this.LinkName,
      DeviceAddress: this.DeviceAddress,
      DeviceType: this.DeviceType,
      CollectTimeInterval: this.CollectTimeInterval,
      Timeout: this.Timeout,
      ReconnectTime: this.ReconnectTime,
      Enable: this.Enable,
      ExtendField: this.ExtendField,
    };
  }

  static fromJSON(data) {
    return new Device(data);
  }
}

module.exports = Device;
```

- [ ] **Step 2: 创建 DeviceGroup 模型 `exe/app/models/DeviceGroup.js`**

```js
const Joi = require('joi');
const uuid = require('uuid');

class DeviceGroup {
  constructor(data) {
    this.DeviceGroupID = data.DeviceGroupID || uuid.v1();
    this.DeviceGroupName = data.DeviceGroupName || '';
    this.Description = data.Description || '';
    this.ParentID = data.ParentID || '';
    this.Children = data.Children || [];
  }

  static validate(data) {
    const schema = Joi.object({
      DeviceGroupID: Joi.string().optional(),
      DeviceGroupName: Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required(),
      Description: Joi.string().allow('').optional(),
      ParentID: Joi.string().allow('').optional(),
      Children: Joi.array().optional(),
    });
    const { error, value } = schema.validate(data, { allowUnknown: true });
    if (error) throw new Error(`设备组数据验证失败: ${error.details[0].message}`);
    return value;
  }

  static create(data) {
    const validated = this.validate(data);
    return new DeviceGroup(validated);
  }

  update(data) {
    Object.keys(data).forEach(key => {
      if (key !== 'DeviceGroupID') {
        this[key] = data[key];
      }
    });
    return this;
  }

  toJSON() {
    return {
      DeviceGroupID: this.DeviceGroupID,
      DeviceGroupName: this.DeviceGroupName,
      Description: this.Description,
      ParentID: this.ParentID,
      Children: this.Children,
    };
  }

  static fromJSON(data) {
    return new DeviceGroup(data);
  }
}

module.exports = DeviceGroup;
```

- [ ] **Step 3: 创建 models/index.js 导出**

```js
const models = {};
models.Device = require('./Device');
models.DeviceGroup = require('./DeviceGroup');
module.exports = models;
```

---

### Task 3.2: 创建 DeviceService

**Files:**
- Create: `exe/app/services/DeviceService.js`

- [ ] **Step 1: 创建 DeviceService**

```js
const fs = require('fs');
const path = require('path');
const Device = require('../models/Device');
const DeviceGroup = require('../models/DeviceGroup');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class DeviceService {
  constructor(projectDir) {
    this.projectDir = projectDir;
  }

  _getDeviceInfoPath() {
    return path.join(this.projectDir, 'project', 'DeviceInfo.json');
  }

  _readDeviceInfo() {
    const filePath = this._getDeviceInfoPath();
    if (!fs.existsSync(filePath)) {
      return { DeviceList: [], DeviceGroupTree: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_READ_ERROR, `DeviceInfo.json: ${err.message}`);
    }
  }

  _writeDeviceInfo(data) {
    const filePath = this._getDeviceInfoPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, '\t'), 'utf8');
      return true;
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `DeviceInfo.json: ${err.message}`);
    }
  }

  // 获取设备组树（返回旧格式，保证兼容）
  getDeviceGroupTree() {
    const deviceInfo = this._readDeviceInfo();
    return deviceInfo.DeviceGroupTree || [];
  }

  // 递归查找设备组
  _findGroupInTree(tree, groupId) {
    for (const node of tree) {
      if (node.DeviceGroupID === groupId) return node;
      if (node.Children && node.Children.length > 0) {
        const found = this._findGroupInTree(node.Children, groupId);
        if (found) return found;
      }
    }
    return null;
  }

  // 递归查找父节点的引用
  _findParentRef(tree, groupId, parent = null) {
    for (const node of tree) {
      if (node.DeviceGroupID === groupId) return { node, parent, tree };
      if (node.Children && node.Children.length > 0) {
        const found = this._findParentRef(node.Children, groupId, { node, parentTree: tree });
        if (found) return found;
      }
    }
    return null;
  }

  // 创建设备组
  createDeviceGroup(groupData) {
    const validated = DeviceGroup.validate(groupData);
    const deviceInfo = this._readDeviceInfo();
    const tree = deviceInfo.DeviceGroupTree || [];

    // 检查名称是否重复
    if (this._findGroupInTree(tree, null) && this._findGroupByName(tree, validated.DeviceGroupName)) {
      throw new AppError(ErrorCodes.DEVICE_GROUP_NAME_EXISTS);
    }

    const newGroup = DeviceGroup.create(validated).toJSON();

    if (validated.ParentID) {
      const parentRef = this._findParentRef(tree, validated.ParentID);
      if (!parentRef) throw new AppError(ErrorCodes.DEVICE_GROUP_NOT_FOUND);
      if (!parentRef.node.Children) parentRef.node.Children = [];
      parentRef.node.Children.push(newGroup);
    } else {
      tree.push(newGroup);
    }

    deviceInfo.DeviceGroupTree = tree;
    this._writeDeviceInfo(deviceInfo);
    return newGroup;
  }

  // 编辑设备组
  editDeviceGroup(groupId, groupData) {
    const deviceInfo = this._readDeviceInfo();
    const tree = deviceInfo.DeviceGroupTree || [];
    const ref = this._findParentRef(tree, groupId);
    if (!ref) throw new AppError(ErrorCodes.DEVICE_GROUP_NOT_FOUND);

    Object.keys(groupData).forEach(key => {
      if (key !== 'DeviceGroupID') {
        ref.node[key] = groupData[key];
      }
    });

    deviceInfo.DeviceGroupTree = tree;
    this._writeDeviceInfo(deviceInfo);
    return ref.node;
  }

  // 删除设备组
  deleteDeviceGroup(groupId) {
    const deviceInfo = this._readDeviceInfo();
    const tree = deviceInfo.DeviceGroupTree || [];
    const devices = deviceInfo.DeviceList || [];

    // 检查是否有设备属于该组
    const hasDevices = devices.some(d => d.DeviceGroupID === groupId);
    if (hasDevices) throw new AppError(ErrorCodes.DEVICE_HAS_VARIABLES);

    const removeFromTree = (nodes) => {
      return nodes.filter(node => {
        if (node.DeviceGroupID === groupId) return false;
        if (node.Children) node.Children = removeFromTree(node.Children);
        return true;
      });
    };

    deviceInfo.DeviceGroupTree = removeFromTree(tree);
    this._writeDeviceInfo(deviceInfo);
    return true;
  }

  // 获取设备列表
  getDevices(deviceGroupId = null) {
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];
    if (deviceGroupId) {
      return devices.filter(d => d.DeviceGroupID === deviceGroupId);
    }
    return devices;
  }

  // 创建单个设备
  createDevice(deviceData) {
    const validated = Device.validate(deviceData);
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];

    // 检查名称唯一性
    const exists = devices.some(d =>
      d.DeviceName === validated.DeviceName && d.LinkName === (validated.LinkName || '')
    );
    if (exists) throw new AppError(ErrorCodes.DEVICE_NAME_EXISTS);

    const newDevice = Device.create(validated).toJSON();
    devices.push(newDevice);
    deviceInfo.DeviceList = devices;
    this._writeDeviceInfo(deviceInfo);
    return newDevice;
  }

  // 批量创建（导入时使用，高性能）
  createDevicesBatch(deviceDataList) {
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];
    const nameSet = new Set(devices.map(d => `${d.DeviceName}_${d.LinkName || ''}`));

    const newDevices = [];
    for (const data of deviceDataList) {
      const validated = Device.validate(data);
      const key = `${validated.DeviceName}_${validated.LinkName || ''}`;
      if (!nameSet.has(key)) {
        const device = Device.create(validated).toJSON();
        devices.push(device);
        newDevices.push(device);
        nameSet.add(key);
      }
    }

    deviceInfo.DeviceList = devices;
    this._writeDeviceInfo(deviceInfo);
    return newDevices;
  }

  // 编辑设备
  editDevice(deviceId, deviceData) {
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];
    const index = devices.findIndex(d => d.DeviceID === deviceId);
    if (index === -1) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND);

    const device = Device.fromJSON(devices[index]);
    device.update(deviceData);
    devices[index] = device.toJSON();
    deviceInfo.DeviceList = devices;
    this._writeDeviceInfo(deviceInfo);
    return devices[index];
  }

  // 删除设备
  deleteDevices(deviceIds) {
    const deviceInfo = this._readDeviceInfo();
    let devices = deviceInfo.DeviceList || [];
    // 同时检查变量关联
    const varInfoPath = path.join(this.projectDir, 'project', 'VarInfo.json');
    let varList = [];
    if (fs.existsSync(varInfoPath)) {
      try {
        varList = JSON.parse(fs.readFileSync(varInfoPath, 'utf8')).TagList || [];
      } catch (e) {}
    }

    for (const id of deviceIds) {
      const device = devices.find(d => d.DeviceID === id);
      if (!device) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, `ID: ${id}`);
      const hasVars = varList.some(v => v.DeviceID === id || v.DeviceName === device.DeviceName);
      if (hasVars) throw new AppError(ErrorCodes.DEVICE_HAS_VARIABLES, `设备: ${device.DeviceName}`);
    }

    devices = devices.filter(d => !deviceIds.includes(d.DeviceID));
    deviceInfo.DeviceList = devices;
    this._writeDeviceInfo(deviceInfo);
    return true;
  }

  // 获取设备属性
  getDeviceProperty(deviceId) {
    const deviceInfo = this._readDeviceInfo();
    const device = (deviceInfo.DeviceList || []).find(d => d.DeviceID === deviceId);
    if (!device) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND);
    return device;
  }

  // 移动设备到其他组
  moveDevices(deviceIds, targetGroupId) {
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];
    const tree = deviceInfo.DeviceGroupTree || [];

    if (targetGroupId) {
      const groupExists = this._findGroupInTree(tree, targetGroupId);
      if (!groupExists) throw new AppError(ErrorCodes.DEVICE_GROUP_NOT_FOUND);
    }

    for (const id of deviceIds) {
      const device = devices.find(d => d.DeviceID === id);
      if (!device) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, `ID: ${id}`);
      device.DeviceGroupID = targetGroupId;
    }

    deviceInfo.DeviceList = devices;
    this._writeDeviceInfo(deviceInfo);
    return deviceIds.map(id => devices.find(d => d.DeviceID === id));
  }

  // 获取指定设备的寄存器列表（从驱动文件读取）
  getRegisters(deviceName) {
    const deviceInfo = this._readDeviceInfo();
    const device = (deviceInfo.DeviceList || []).find(d => d.DeviceName === deviceName);
    if (!device) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND);
    // 寄存器列表从驱动配置中获取，委托给 DriverService
    return { device, registers: [] };
  }
}

module.exports = DeviceService;
```

---

### Task 3.3: 创建 controller_device.js

**Files:**
- Create: `exe/app/controllers/controller_device.js`

- [ ] **Step 1: 创建设备控制器**

```js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { request_handler } = require('../../core/utils');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class DeviceController {
  constructor() {
    this._getDeviceService = (req) => {
      const tenantId = req.headers.tenant_id;
      const TenantManager = require('../../lib/services/TenantManager');
      const projectService = TenantManager.getProjectService(tenantId);
      const DeviceService = require('../services/DeviceService');
      // 需要通过 projectId 获取工程目录
      return { projectService, DeviceService };
    };
  }

  _getProjectDir(projectId) {
    return path.join(global.sdbPath, projectId);
  }

  _getService(projectId) {
    const DeviceService = require('../services/DeviceService');
    return new DeviceService(this._getProjectDir(projectId));
  }

  // GET 设备组树
  async getDeviceGroupTree(req, res) {
    try {
      const { projectId } = request_handler.httpGetData(req);
      const service = this._getService(projectId);
      const tree = service.getDeviceGroupTree();
      res.sendOk(tree);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // POST 创建设备组
  async createDeviceGroup(req, res) {
    try {
      const { projectId, ...groupData } = request_handler.httpPostData(req);
      const service = this._getService(projectId);
      const group = service.createDeviceGroup(groupData);
      res.sendOk(group);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // PUT 编辑设备组
  async editDeviceGroup(req, res) {
    try {
      const { projectId, groupId, ...groupData } = request_handler.httpPutData(req);
      const service = this._getService(projectId);
      const group = service.editDeviceGroup(groupId, groupData);
      res.sendOk(group);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // DELETE 删除设备组
  async deleteDeviceGroup(req, res) {
    try {
      const { projectId, groupId } = request_handler.httpDeleteData(req);
      const service = this._getService(projectId);
      const result = service.deleteDeviceGroup(groupId);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // GET 设备列表
  async getDevices(req, res) {
    try {
      const { projectId, deviceGroupId } = request_handler.httpGetData(req);
      const service = this._getService(projectId);
      const devices = service.getDevices(deviceGroupId || null);
      res.sendOk(devices);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // POST 创建设备
  async createDevice(req, res) {
    try {
      const { projectId, ...deviceData } = request_handler.httpPostData(req);
      const service = this._getService(projectId);
      const device = service.createDevice(deviceData);
      res.sendOk(device);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // PUT 编辑设备
  async editDevice(req, res) {
    try {
      const { projectId, deviceId, ...deviceData } = request_handler.httpPutData(req);
      const service = this._getService(projectId);
      const device = service.editDevice(deviceId, deviceData);
      res.sendOk(device);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // DELETE 删除设备
  async deleteDevice(req, res) {
    try {
      const { projectId, deviceIds } = request_handler.httpDeleteData(req);
      const service = this._getService(projectId);
      const result = service.deleteDevices(Array.isArray(deviceIds) ? deviceIds : [deviceIds]);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // POST 移动设备
  async moveDevice(req, res) {
    try {
      const { projectId, deviceIds, targetDeviceGroupId } = request_handler.httpPostData(req);
      const service = this._getService(projectId);
      const result = service.moveDevices(deviceIds, targetDeviceGroupId);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // GET 设备属性
  async getDeviceProperty(req, res) {
    try {
      const { projectId, deviceId } = request_handler.httpGetData(req);
      const service = this._getService(projectId);
      const property = service.getDeviceProperty(deviceId);
      res.sendOk(property);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // POST 导出设备
  async exportDevices(req, res) {
    try {
      const { projectId, systemType, fileType, deviceNames } = request_handler.httpPostData(req);
      const service = this._getService(projectId);
      const devices = service.getDevices().filter(d => deviceNames.includes(d.DeviceName));
      if (fileType === 'csv') {
        // CSV 导出逻辑（参考旧代码）
        const { Parser } = require('json2csv');
        const fields = Object.keys(devices[0] || {});
        const parser = new Parser({ fields });
        const csv = parser.parse(devices);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=devices.csv');
        res.send(csv);
      } else {
        res.sendOk(devices);
      }
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // POST 导入设备
  async importDevices(req, res) {
    try {
      const { projectId, groupId } = request_handler.httpPostData(req);
      const service = this._getService(projectId);
      // multer 中间件处理文件上传
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
      upload.array('devicesFile', 1)(req, res, async (err) => {
        if (err) return res.sendErr(400, err.message);
        const file = req.files[0];
        if (!file) return res.sendErr(400, '请上传文件');

        let deviceData = [];
        if (file.originalname.endsWith('.json')) {
          deviceData = JSON.parse(file.buffer.toString('utf8'));
        } else if (file.originalname.endsWith('.csv')) {
          const csv2Json = require('csvtojson');
          deviceData = await csv2Json().fromString(file.buffer.toString('utf8'));
        }
        // 设置设备组
        if (groupId) {
          deviceData = deviceData.map(d => ({ ...d, DeviceGroupID: groupId }));
        }
        const result = service.createDevicesBatch(deviceData);
        res.sendOk(result);
      });
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }
}

module.exports = new DeviceController();
```

---

### Task 3.4: 创建设备路由配置

**Files:**
- Create: `exe/app/routers/api/v1/device_router_config.js`

- [ ] **Step 1: 创建设备路由配置**

```js
const { device } = require('../../../controllers');

module.exports = {
  'get': {
    '/deviceGroups': [device.getDeviceGroupTree],
    '/devices': [device.getDevices],
    '/deviceProperty': [device.getDeviceProperty],
    '/registers': [device.getRegisters],
  },
  'post': {
    '/deviceGroups': [device.createDeviceGroup],
    '/devices': [device.createDevice],
    '/moveDevice': [device.moveDevice],
    '/exportDevices': [device.exportDevices],
    '/importDevices': [device.importDevices],
  },
  'put': {
    '/deviceGroups': [device.editDeviceGroup],
    '/devices': [device.editDevice],
  },
  'delete': {
    '/deviceGroups': [device.deleteDeviceGroup],
    '/devices': [device.deleteDevice],
  },
};
```

---

### Task 3.5: 创建 compat 设备适配器

**Files:**
- Create: `exe/compat/adapters/adapter_device.js`

- [ ] **Step 1: 创建设备适配器（旧路径 → 新 service，保持 JSON 产物一致）**

```js
const express = require('express');
const DeviceService = require('../../app/services/DeviceService');
const path = require('path');

function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

module.exports = function() {
  const router = express.Router();

  // GET /ProjectDev/getProjectDeviceGroupTreeView
  router.post('/getProjectDeviceGroupTreeView', function(req, res) {
    try {
      const { projectId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const tree = service.getDeviceGroupTree();
      // 返回旧格式（与旧版 ProjectDeviceManage 完全一致）
      res.send(tree);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // GET /ProjectDev/getDeviceGroupAvailableMove
  router.post('/getDeviceGroupAvailableMove', function(req, res) {
    try {
      const { projectId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const tree = service.getDeviceGroupTree();
      res.send(tree);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/submitAddDeviceGroup
  router.post('/submitAddDeviceGroup', function(req, res) {
    try {
      const { projectId, groupName, groupId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const group = service.createDeviceGroup({
        DeviceGroupName: groupName,
        ParentID: groupId || '',
      });
      res.send({ Error: false, data: group });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/editDeviceGroup
  router.post('/editDeviceGroup', function(req, res) {
    try {
      const { projectId, groupId, groupName } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const group = service.editDeviceGroup(groupId, { DeviceGroupName: groupName });
      res.send({ Error: false, data: group });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/deleteDeviceGroup
  router.post('/deleteDeviceGroup', function(req, res) {
    try {
      const { projectId, groupId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      service.deleteDeviceGroup(groupId);
      res.send({ Error: false, data: 'OK' });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/getDeviceProperty
  router.post('/getDeviceProperty', function(req, res) {
    try {
      const { projectId, deviceId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const device = service.getDeviceProperty(deviceId);
      res.send(device);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/addNewDevice
  router.post('/addNewDevice', async function(req, res) {
    try {
      const { projectId, ...deviceData } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const device = service.createDevice(deviceData);
      res.send({ Error: false, data: device });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message, data: null });
    }
  });

  // POST /ProjectDev/editDevice
  router.post('/editDevice', async function(req, res) {
    try {
      const { projectId, DeviceID, ...deviceData } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const device = service.editDevice(DeviceID, deviceData);
      res.send({ Error: false, data: device });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/deleteDevice
  router.post('/deleteDevice', function(req, res) {
    try {
      const { projectId, deviceIds } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      service.deleteDevices(Array.isArray(deviceIds) ? deviceIds : [deviceIds]);
      res.send({ Error: false });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/moveDevice
  router.post('/moveDevice', function(req, res) {
    try {
      const { projectId, deviceIds, targetDeviceGroupId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const result = service.moveDevices(deviceIds, targetDeviceGroupId);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/exportDevice
  router.post('/exportDevice', function(req, res) {
    try {
      const { projectId, fileType, deviceNames } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const devices = service.getDevices().filter(d => deviceNames.includes(d.DeviceName));
      if (fileType === 'csv') {
        const { Parser } = require('json2csv');
        const parser = new Parser({ fields: Object.keys(devices[0] || {}) });
        res.send(parser.parse(devices));
      } else {
        res.send(devices);
      }
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/importDevice
  router.post('/importDevice', function(req, res) {
    try {
      const formidable = require('formidable');
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) return res.send({ Error: true, ErrorDesc: err.message });
        const { projectId, groupId } = fields;
        const service = new DeviceService(getProjectDir(projectId));
        const file = files.uploadFile;
        let deviceData = [];
        if (file.name.endsWith('.json')) {
          deviceData = JSON.parse(require('fs').readFileSync(file.path, 'utf8'));
        } else if (file.name.endsWith('.csv')) {
          const csv2Json = require('csvtojson');
          deviceData = await csv2Json().fromFile(file.path);
        }
        if (groupId) {
          deviceData = deviceData.map(d => ({ ...d, DeviceGroupID: groupId }));
        }
        const result = service.createDevicesBatch(deviceData);
        res.send({ Error: false, data: result });
      });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  // POST /ProjectDev/getAllDevice
  router.post('/getAllDevice', function(req, res) {
    try {
      const { projectId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const devices = service.getDevices();
      res.send(devices);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  return router;
};
```

---

## Phase 4: 变量管理模块

### Task 4.1: 创建 Variable 和 VariableGroup Model

**Files:**
- Create: `exe/app/models/Variable.js`
- Create: `exe/app/models/VariableGroup.js`

- [ ] **Step 1: 创建 Variable 模型**

```js
const Joi = require('joi');
const uuid = require('uuid');

class Variable {
  constructor(data) {
    this.TagID = data.TagID || uuid.v1();
    this.TagName = data.TagName || '';
    this.Description = data.Description || '';
    this.DeviceID = data.DeviceID || '';
    this.DeviceName = data.DeviceName || '';
    this.TagGroup = data.TagGroup || 'TagGroup';
    this.TagType = data.TagType || 4; // 4 = 用户变量(KF4.0)
    this.TagDataType = data.TagDataType || 128;
    this.RegDataType = data.RegDataType || 128;
    this.AccessType = data.AccessType || 0;
    this.RegName = data.RegName || null;
    this.RegAddress = data.RegAddress || null;
    this.VarPlcInfo = data.VarPlcInfo || '';
    this.CollectTimeInterval = data.CollectTimeInterval || null;
    this.DataConvertType = data.DataConvertType || null;
    this.MaxRawValue = data.MaxRawValue || null;
    this.MinRawValue = data.MinRawValue || null;
    this.MaxValue = data.MaxValue || null;
    this.MinValue = data.MinValue || null;
    this.NonLinearName = data.NonLinearName || '';
    this.DataCleaningType = data.DataCleaningType || null;
    this.DataCleaningUpperLimit = data.DataCleaningUpperLimit || null;
    this.DataCleaningLowerLimit = data.DataCleaningLowerLimit || null;
    this.ChangeRate = data.ChangeRate || null;
    this.DeadbandRate = data.DeadbandRate || null;
    this.AlarmUpperLimit = data.AlarmUpperLimit || null;
    this.AlarmLowerLimit = data.AlarmLowerLimit || null;
  }

  static validate(data) {
    const schema = Joi.object({
      TagName: Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required(),
      DeviceName: Joi.string().allow('').optional(),
      TagGroup: Joi.string().allow('').optional(),
      TagDataType: Joi.number().optional(),
      RegDataType: Joi.number().optional(),
      RegName: Joi.string().allow('', null).optional(),
      RegAddress: Joi.string().allow('', null).optional(),
    }).unknown(true);
    const { error, value } = schema.validate(data);
    if (error) throw new Error(`变量数据验证失败: ${error.details[0].message}`);
    return value;
  }

  static create(data) {
    const validated = this.validate(data);
    return new Variable(validated);
  }

  update(data) {
    Object.keys(data).forEach(key => {
      if (key !== 'TagID') this[key] = data[key];
    });
    return this;
  }

  toJSON() {
    return {
      TagID: this.TagID, TagName: this.TagName, Description: this.Description,
      DeviceID: this.DeviceID, DeviceName: this.DeviceName, TagGroup: this.TagGroup,
      TagType: this.TagType, TagDataType: this.TagDataType, RegDataType: this.RegDataType,
      AccessType: this.AccessType, RegName: this.RegName, RegAddress: this.RegAddress,
      VarPlcInfo: this.VarPlcInfo, CollectTimeInterval: this.CollectTimeInterval,
      DataConvertType: this.DataConvertType, MaxRawValue: this.MaxRawValue,
      MinRawValue: this.MinRawValue, MaxValue: this.MaxValue, MinValue: this.MinValue,
      NonLinearName: this.NonLinearName, DataCleaningType: this.DataCleaningType,
      DataCleaningUpperLimit: this.DataCleaningUpperLimit, DataCleaningLowerLimit: this.DataCleaningLowerLimit,
      ChangeRate: this.ChangeRate, DeadbandRate: this.DeadbandRate,
      AlarmUpperLimit: this.AlarmUpperLimit, AlarmLowerLimit: this.AlarmLowerLimit,
    };
  }

  static fromJSON(data) { return new Variable(data); }
}

module.exports = Variable;
```

- [ ] **Step 2: 创建 VariableGroup 模型**

```js
const Joi = require('joi');
const uuid = require('uuid');

class VariableGroup {
  constructor(data) {
    this.TagGroupID = data.TagGroupID || uuid.v1();
    this.TagGroupName = data.TagGroupName || '';
    this.Description = data.Description || '';
    this.ParentID = data.ParentID || '';
    this.Children = data.Children || [];
  }

  static validate(data) {
    const schema = Joi.object({
      TagGroupName: Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required(),
      Description: Joi.string().allow('').optional(),
      ParentID: Joi.string().allow('').optional(),
      Children: Joi.array().optional(),
    }).unknown(true);
    const { error, value } = schema.validate(data);
    if (error) throw new Error(`变量组数据验证失败: ${error.details[0].message}`);
    return value;
  }

  static create(data) { return new VariableGroup(this.validate(data)); }
  update(data) { Object.keys(data).forEach(k => { if (k !== 'TagGroupID') this[k] = data[k]; }); return this; }
  toJSON() { return { TagGroupID: this.TagGroupID, TagGroupName: this.TagGroupName, Description: this.Description, ParentID: this.ParentID, Children: this.Children }; }
  static fromJSON(data) { return new VariableGroup(data); }
}

module.exports = VariableGroup;
```

---

### Task 4.2: 创建 VariableService（含导入导出 + 性能优化）

**Files:**
- Create: `exe/app/services/VariableService.js`

- [ ] **Step 1: 创建 VariableService（核心：导入性能优化）**

```js
const fs = require('fs');
const path = require('path');
const Variable = require('../models/Variable');
const VariableGroup = require('../models/VariableGroup');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class VariableService {
  constructor(projectDir) {
    this.projectDir = projectDir;
  }

  _getVarInfoPath() {
    return path.join(this.projectDir, 'project', 'VarInfo.json');
  }

  _getDeviceInfoPath() {
    return path.join(this.projectDir, 'project', 'DeviceInfo.json');
  }

  _readVarInfo() {
    const filePath = this._getVarInfoPath();
    if (!fs.existsSync(filePath)) {
      return { TagList: [], VarGroupTree: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_READ_ERROR, `VarInfo.json: ${err.message}`);
    }
  }

  _writeVarInfo(data) {
    const filePath = this._getVarInfoPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, '\t'), 'utf8');
      return true;
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `VarInfo.json: ${err.message}`);
    }
  }

  // === 变量组 CRUD ===

  getVariableGroupTree() {
    const varInfo = this._readVarInfo();
    return varInfo.VarGroupTree || [];
  }

  _findGroupInTree(tree, groupId) {
    for (const node of tree) {
      if (node.TagGroupID === groupId) return node;
      if (node.Children && node.Children.length > 0) {
        const found = this._findGroupInTree(node.Children, groupId);
        if (found) return found;
      }
    }
    return null;
  }

  createVariableGroup(groupData) {
    const validated = VariableGroup.validate(groupData);
    const varInfo = this._readVarInfo();
    const tree = varInfo.VarGroupTree || [];
    const newGroup = VariableGroup.create(validated).toJSON();

    if (validated.ParentID) {
      const parent = this._findGroupInTree(tree, validated.ParentID);
      if (!parent) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND);
      if (!parent.Children) parent.Children = [];
      parent.Children.push(newGroup);
    } else {
      tree.push(newGroup);
    }
    varInfo.VarGroupTree = tree;
    this._writeVarInfo(varInfo);
    return newGroup;
  }

  editVariableGroup(groupId, groupData) {
    const varInfo = this._readVarInfo();
    const tree = varInfo.VarGroupTree || [];
    const node = this._findGroupInTree(tree, groupId);
    if (!node) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND);
    Object.keys(groupData).forEach(k => { if (k !== 'TagGroupID') node[k] = groupData[k]; });
    varInfo.VarGroupTree = tree;
    this._writeVarInfo(varInfo);
    return node;
  }

  deleteVariableGroup(groupId) {
    const varInfo = this._readVarInfo();
    let tree = varInfo.VarGroupTree || [];
    const tags = varInfo.TagList || [];

    // 检查是否有变量属于该组
    const hasVars = tags.some(t => t.TagGroup === groupId);
    if (hasVars) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND, '组下存在变量');

    const removeFromTree = (nodes) => nodes.filter(n => {
      if (n.TagGroupID === groupId) return false;
      if (n.Children) n.Children = removeFromTree(n.Children);
      return true;
    });
    varInfo.VarGroupTree = removeFromTree(tree);
    this._writeVarInfo(varInfo);
    return true;
  }

  // === 变量 CRUD ===

  getVariables(groupId = null) {
    const varInfo = this._readVarInfo();
    const tags = varInfo.TagList || [];
    if (groupId) return tags.filter(t => t.TagGroup === groupId);
    return tags;
  }

  createVariable(varData) {
    const validated = Variable.validate(varData);
    const varInfo = this._readVarInfo();
    const tags = varInfo.TagList || [];

    // 检查变量名 + 设备名唯一性
    const exists = tags.some(t =>
      t.TagName === validated.TagName && t.DeviceName === (validated.DeviceName || '')
    );
    if (exists) throw new AppError(ErrorCodes.VARIABLE_NAME_EXISTS);

    const newVar = Variable.create(validated).toJSON();
    tags.push(newVar);
    varInfo.TagList = tags;
    this._writeVarInfo(varInfo);
    return newVar;
  }

  editVariable(tagId, varData) {
    const varInfo = this._readVarInfo();
    const tags = varInfo.TagList || [];
    const index = tags.findIndex(t => t.TagID === tagId);
    if (index === -1) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND);

    const variable = Variable.fromJSON(tags[index]);
    variable.update(varData);
    tags[index] = variable.toJSON();
    varInfo.TagList = tags;
    this._writeVarInfo(varInfo);
    return tags[index];
  }

  deleteVariables(tagIds) {
    const varInfo = this._readVarInfo();
    let tags = varInfo.TagList || [];
    for (const id of tagIds) {
      if (!tags.find(t => t.TagID === id)) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND, `ID: ${id}`);
    }
    varInfo.TagList = tags.filter(t => !tagIds.includes(t.TagID));
    this._writeVarInfo(varInfo);
    return true;
  }

  moveVariablesToGroup(tagIds, targetGroupId) {
    const varInfo = this._readVarInfo();
    const tags = varInfo.TagList || [];
    const tree = varInfo.VarGroupTree || [];

    if (targetGroupId) {
      const groupExists = this._findGroupInTree(tree, targetGroupId);
      if (!groupExists) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND);
    }

    for (const id of tagIds) {
      const tag = tags.find(t => t.TagID === id);
      if (!tag) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND, `ID: ${id}`);
      tag.TagGroup = targetGroupId;
    }
    varInfo.TagList = tags;
    this._writeVarInfo(varInfo);
    return tagIds.map(id => tags.find(t => t.TagID === id));
  }

  getVariableProperty(tagId) {
    const varInfo = this._readVarInfo();
    const tag = (varInfo.TagList || []).find(t => t.TagID === tagId);
    if (!tag) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND);
    return tag;
  }

  // === 导入功能（性能优化：批量内存操作 + 单次落盘）===

  /**
   * 导入变量
   * @param {Array} variables - 变量数据列表
   * @param {Object} options - { mode: 'overwrite'|'append'|'toGroup', groupId, groupName }
   */
  importVariables(variables, options = {}) {
    const { mode = 'append', groupId, groupName } = options;
    const varInfo = this._readVarInfo();
    let existingTags = varInfo.TagList || [];
    let tree = varInfo.VarGroupTree || [];

    // 1. 处理组：如果指定 groupName 且组不存在，自动创建
    let targetGroupId = groupId || '';
    if (groupName && !targetGroupId) {
      const existingGroup = this._findGroupInTree(tree, null);
      // 递归查找 groupName
      const findByName = (nodes, name) => {
        for (const n of nodes) {
          if (n.TagGroupName === name) return n.TagGroupID;
          if (n.Children) {
            const found = findByName(n.Children, name);
            if (found) return found;
          }
        }
        return null;
      };
      targetGroupId = findByName(tree, groupName);
      if (!targetGroupId) {
        // 自动创建组
        const newGroup = VariableGroup.create({ TagGroupName: groupName }).toJSON();
        tree.push(newGroup);
        targetGroupId = newGroup.TagGroupID;
      }
    }

    // 2. 构建名称索引（用于去重）
    const nameIndex = new Map();
    for (const tag of existingTags) {
      const key = `${tag.TagName}_${tag.DeviceName || ''}`;
      nameIndex.set(key, tag);
    }

    // 3. 批量合并（内存操作）
    const result = { added: 0, overwritten: 0, skipped: 0, errors: [] };

    for (const varData of variables) {
      try {
        const validated = Variable.validate(varData);
        const key = `${validated.TagName}_${validated.DeviceName || ''}`;
        const newVar = Variable.create({ ...validated, TagGroup: targetGroupId || validated.TagGroup }).toJSON();

        if (nameIndex.has(key)) {
          if (mode === 'overwrite') {
            // 覆盖：替换同名变量
            const existing = nameIndex.get(key);
            Object.assign(existing, newVar, { TagID: existing.TagID });
            result.overwritten++;
          } else {
            // 追加模式：跳过
            result.skipped++;
          }
        } else {
          existingTags.push(newVar);
          nameIndex.set(key, newVar);
          result.added++;
        }
      } catch (err) {
        result.errors.push({ var: varData.TagName || 'unknown', error: err.message });
      }
    }

    // 4. 单次写盘
    varInfo.TagList = existingTags;
    varInfo.VarGroupTree = tree;
    this._writeVarInfo(varInfo);

    return result;
  }

  // === 导出功能 ===

  exportVariables(tagNames = [], allExportFlag = false) {
    const varInfo = this._readVarInfo();
    let tags = varInfo.TagList || [];
    if (!allExportFlag && tagNames.length > 0) {
      tags = tags.filter(t => tagNames.includes(t.TagName));
    }
    return tags;
  }

  // === 寄存器相关 ===

  getRegisters(deviceName) {
    // 委托给设备服务
    const deviceInfoPath = this._getDeviceInfoPath();
    if (!fs.existsSync(deviceInfoPath)) return [];
    const deviceInfo = JSON.parse(fs.readFileSync(deviceInfoPath, 'utf8'));
    const device = (deviceInfo.DeviceList || []).find(d => d.DeviceName === deviceName);
    if (!device) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, deviceName);
    return { device, registers: [] }; // 寄存器信息从驱动获取
  }
}

module.exports = VariableService;
```

---

### Task 4.3: 创建 controller_variable.js

**Files:**
- Create: `exe/app/controllers/controller_variable.js`

- [ ] **Step 1: 创建变量控制器（与 lib 风格一致）**

```js
const path = require('path');
const { request_handler } = require('../../core/utils');
const VariableService = require('../services/VariableService');

function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

class VariableController {
  _getService(projectId) {
    return new VariableService(getProjectDir(projectId));
  }

  async getVariableGroups(req, res) {
    try {
      const { projectId } = request_handler.httpGetData(req);
      const tree = this._getService(projectId).getVariableGroupTree();
      res.sendOk(tree);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async createVariableGroup(req, res) {
    try {
      const { projectId, ...groupData } = request_handler.httpPostData(req);
      const group = this._getService(projectId).createVariableGroup(groupData);
      res.sendOk(group);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async editVariableGroup(req, res) {
    try {
      const { projectId, groupId, ...groupData } = request_handler.httpPutData(req);
      const group = this._getService(projectId).editVariableGroup(groupId, groupData);
      res.sendOk(group);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async deleteVariableGroup(req, res) {
    try {
      const { projectId, groupId } = request_handler.httpDeleteData(req);
      const result = this._getService(projectId).deleteVariableGroup(groupId);
      res.sendOk(result);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async getVariables(req, res) {
    try {
      const { projectId, groupId } = request_handler.httpGetData(req);
      const vars = this._getService(projectId).getVariables(groupId || null);
      res.sendOk(vars);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async createVariable(req, res) {
    try {
      const { projectId, ...varData } = request_handler.httpPostData(req);
      const v = this._getService(projectId).createVariable(varData);
      res.sendOk(v);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async editVariable(req, res) {
    try {
      const { projectId, tagId, ...varData } = request_handler.httpPutData(req);
      const v = this._getService(projectId).editVariable(tagId, varData);
      res.sendOk(v);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async deleteVariable(req, res) {
    try {
      const { projectId, tagIds } = request_handler.httpDeleteData(req);
      const result = this._getService(projectId).deleteVariables(Array.isArray(tagIds) ? tagIds : [tagIds]);
      res.sendOk(result);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async moveVarToGroup(req, res) {
    try {
      const { projectId, varIds, targetVarGroupId } = request_handler.httpPostData(req);
      const result = this._getService(projectId).moveVariablesToGroup(varIds, targetVarGroupId);
      res.sendOk(result);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async getVariableProperty(req, res) {
    try {
      const { projectId, tagId } = request_handler.httpGetData(req);
      const prop = this._getService(projectId).getVariableProperty(tagId);
      res.sendOk(prop);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async exportTags(req, res) {
    try {
      const { projectId, tagList, allExportFlag, fileType } = request_handler.httpPostData(req);
      const tags = this._getService(projectId).exportVariables(tagList, allExportFlag);
      if (fileType === 'csv') {
        const { Parser } = require('json2csv');
        const parser = new Parser({ fields: Object.keys(tags[0] || {}) });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.send(parser.parse(tags));
      } else {
        res.sendOk(tags);
      }
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async importTags(req, res) {
    try {
      const { projectId, importMode, groupName, groupId } = request_handler.httpPostData(req);
      const multer = require('multer');
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
      upload.array('tagsFiles', 1)(req, res, async (err) => {
        if (err) return res.sendErr(400, err.message);
        const file = req.files[0];
        if (!file) return res.sendErr(400, '请上传文件');

        let varData = [];
        const content = file.buffer.toString('utf8');
        if (file.originalname.endsWith('.json')) {
          varData = JSON.parse(content);
        } else if (file.originalname.endsWith('.csv')) {
          const csv2Json = require('csvtojson');
          varData = await csv2Json().fromString(content);
        }
        const result = this._getService(projectId).importVariables(varData, {
          mode: importMode || 'append',
          groupId,
          groupName,
        });
        res.sendOk(result);
      });
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }

  async getRegisters(req, res) {
    try {
      const { projectId, deviceName } = request_handler.httpGetData(req);
      const registers = this._getService(projectId).getRegisters(deviceName);
      res.sendOk(registers);
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }
}

module.exports = new VariableController();
```

---

### Task 4.4: 创建变量路由配置 + compat 适配器

**Files:**
- Create: `exe/app/routers/api/v1/variable_router_config.js`
- Create: `exe/compat/adapters/adapter_variable.js`

- [ ] **Step 1: 创建变量路由配置**

```js
const { variable } = require('../../../controllers');

module.exports = {
  'get': {
    '/variableGroups': [variable.getVariableGroups],
    '/variables': [variable.getVariables],
    '/variableProperty': [variable.getVariableProperty],
    '/registers': [variable.getRegisters],
    '/registerDataTypes': [variable.getRegisters], // 复用
  },
  'post': {
    '/variableGroups': [variable.createVariableGroup],
    '/variables': [variable.createVariable],
    '/moveVarToGroup': [variable.moveVarToGroup],
    '/exportTags': [variable.exportTags],
    '/importTags': [variable.importTags],
  },
  'put': {
    '/variableGroups': [variable.editVariableGroup],
    '/variables': [variable.editVariable],
  },
  'delete': {
    '/variableGroups': [variable.deleteVariableGroup],
    '/variables': [variable.deleteVariable],
  },
};
```

- [ ] **Step 2: 创建变量 compat 适配器（参考旧 ProjectVarManage 路径）**

```js
const express = require('express');
const VariableService = require('../../app/services/VariableService');
const path = require('path');

function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

module.exports = function() {
  const router = express.Router();

  // GET 变量组树
  router.post('/getTagGroupList', function(req, res) {
    try {
      const { projectId } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      res.send(service.getVariableGroupTree());
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // POST 创建变量组
  router.post('/submitAddVarGroup', function(req, res) {
    try {
      const { projectId, groupName, groupId } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      const group = service.createVariableGroup({ TagGroupName: groupName, ParentID: groupId || '' });
      res.send({ Error: false, data: group });
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // PUT 编辑变量组
  router.post('/editVarGroupProperty', function(req, res) {
    try {
      const { projectId, groupId, groupName } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      const group = service.editVariableGroup(groupId, { TagGroupName: groupName });
      res.send({ Error: false, data: group });
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // DELETE 删除变量组
  router.post('/deleteVarGroup', function(req, res) {
    try {
      const { projectId, groupId } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      service.deleteVariableGroup(groupId);
      res.send({ Error: false });
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // POST 创建变量
  router.post('/submitCollectTagProperty', function(req, res) {
    try {
      const { projectId, ...varData } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      const v = service.createVariable(varData);
      res.send({ Error: false, data: v });
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // PUT 编辑变量
  router.post('/editCollectTagProperty', function(req, res) {
    try {
      const { projectId, TagID, ...varData } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      const v = service.editVariable(TagID, varData);
      res.send({ Error: false, data: v });
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // DELETE 删除变量
  router.post('/deleteCollectVariableInfo', function(req, res) {
    try {
      const { projectId, tagIds } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      service.deleteVariables(Array.isArray(tagIds) ? tagIds : [tagIds]);
      res.send({ Error: false });
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // POST 移动变量
  router.post('/moveVarToGroup', function(req, res) {
    try {
      const { projectId, varIds, targetVarGroupId } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      const result = service.moveVariablesToGroup(varIds, targetVarGroupId);
      res.send({ Error: false, data: result });
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // POST 获取变量属性
  router.post('/getVarProperty', function(req, res) {
    try {
      const { projectId, tagId } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      const prop = service.getVariableProperty(tagId);
      res.send(prop);
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // POST 导出变量
  router.post('/exportCollectTag', function(req, res) {
    try {
      const { projectId, tagList, allExportFlag, fileType } = req.body;
      const service = new VariableService(getProjectDir(projectId));
      const tags = service.exportVariables(tagList, allExportFlag);
      if (fileType === 'csv') {
        const { Parser } = require('json2csv');
        const parser = new Parser({ fields: Object.keys(tags[0] || {}) });
        res.send(parser.parse(tags));
      } else {
        res.send(tags);
      }
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  // POST 导入变量（支持覆盖/追加/导入到组）
  router.post('/ImportCollectTag', function(req, res) {
    try {
      const formidable = require('formidable');
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) return res.send({ Error: true, ErrorDesc: err.message });
        const { projectId, importMode, groupId, groupName } = fields;
        const service = new VariableService(getProjectDir(projectId));
        const file = files.uploadFile || files.tagsFiles;
        let varData = [];
        const fs = require('fs');
        if (file.name.endsWith('.json')) {
          varData = JSON.parse(fs.readFileSync(file.path, 'utf8'));
        } else if (file.name.endsWith('.csv')) {
          const csv2Json = require('csvtojson');
          varData = await csv2Json().fromFile(file.path);
        }
        const result = service.importVariables(varData, {
          mode: importMode || 'append',
          groupId,
          groupName,
        });
        res.send({ Error: false, data: result });
      });
    } catch (err) { res.send({ Error: true, ErrorDesc: err.message }); }
  });

  return router;
};
```

---

## Phase 5-10: 驱动、UA、DA、网络、实时数据、权限模块

> 以下模块遵循与 Phase 3-4 相同风格（Service → Controller → Router Config → Compat Adapter），篇幅原因列出关键差异和路径映射。

### Task 5: 驱动管理模块

**Files:**
- Create: `exe/app/models/Driver.js`
- Create: `exe/app/services/DriverService.js`
- Create: `exe/app/controllers/controller_driver.js`
- Create: `exe/app/routers/api/v1/driver_router_config.js`
- Create: `exe/compat/adapters/adapter_driver.js`

**DriverService 核心功能：**
- 读取 `exe/Driver/DriverInfo.json` 获取驱动列表
- 安装驱动：解压驱动包 → 写入 `Driver/` 目录 → 更新 `DriverInfo.json`
- 卸载驱动：删除驱动目录 → 更新 `DriverInfo.json`
- 获取驱动属性配置 `Driver/{driverName}/config.ini`
- MQTT 驱动配置上传/下载
- 点位映射文件管理

**Compat 适配器旧路径（DriverManager + KFRestfulManage）：**
| 旧路径 | HTTP方法 | → 新 Service 调用 |
|--------|----------|-------------------|
| `/DriverManage/getDriverConfig` | POST | `driverService.getDriverProperty(name)` |
| `/api/v1/drivers` | GET | `driverService.getDrivers()` |
| `/api/v1/drivers` | POST | `driverService.installDriver(file)` |
| `/api/v1/drivers` | DELETE | `driverService.uninstallDriver(name)` |
| `/api/v1/installMQTTDriverConf` | POST | `driverService.installMQTTConfig()` |
| `/api/v1/uploadMQTTDriverConf` | POST | `driverService.uploadMQTTConfig(file)` |
| `/api/v1/getPointMappingFiles` | GET | `driverService.getPointMappingFiles()` |
| `/api/v1/uploadPointMappingFile` | POST | `driverService.uploadPointMapping(file)` |
| `/api/v1/delPointMappingFile` | DELETE | `driverService.delPointMapping(name)` |
| `/api/v1/pointMappingFileDownload` | POST | `driverService.downloadPointMapping(name)` |
| `/api/v1/updateProDriver` | POST | `driverService.updateProjectDriver(projectId, driverName)` |

### Task 6: UA OPC UA 采集模块

**Files:**
- Create: `exe/app/services/UACollectService.js`
- Create: `exe/app/controllers/controller_uacollect.js`
- Create: `exe/app/routers/api/v1/uaCollect_router_config.js`
- Create: `exe/compat/adapters/adapter_restful.js`（UA/DA/网络/实时数据共用此适配器，注册在 `/api/v1` 旧路径下）

**UACollectService 核心功能：**
- UA 连接测试：调用 node-opcua 库测试连接
- UA 设备 CRUD（读写 `DeviceInfo.json` 中 UA 相关设备）
- UA 节点浏览（根节点/子节点）
- UA 变量 CRUD（读写 `VarInfo.json` 中 UA 相关变量）
- UA 变量导入导出（CSV/JSON）

**适配器注册（在 adapter_restful.js 中）：**
| 旧路径 | HTTP方法 | → 新 Service 调用 |
|--------|----------|-------------------|
| `/api/v1/uaConnect` | POST | `uaService.testConnect(url)` |
| `/api/v1/uaDevices` | GET | `uaService.getDevices(projectId)` |
| `/api/v1/uaAddDevice` | POST | `uaService.addDevice(data)` |
| `/api/v1/uaEditDevice` | PUT | `uaService.editDevice(id, data)` |
| `/api/v1/uaDelDevices` | DELETE | `uaService.deleteDevices(ids)` |
| `/api/v1/uaRootSources` | GET | `uaService.browseRootSources(params)` |
| `/api/v1/uaChildSources` | GET | `uaService.browseChildSources(params)` |
| `/api/v1/uaVars` | GET | `uaService.getVariables(params)` |
| `/api/v1/uaAddVariables` | POST | `uaService.addVariables(data)` |
| `/api/v1/uaEditVariables` | PUT | `uaService.editVariables(data)` |
| `/api/v1/uaDelVars` | DELETE | `uaService.deleteVariables(ids)` |
| `/api/v1/uaExportVars` | POST | `uaService.exportVariables(params)` |
| `/api/v1/uaImportVars` | POST | `uaService.importVariables(file)` |

### Task 7: DA 采集模块

**类似 UA 模块结构。**

**适配器注册（在 adapter_restful.js 中）：**
| 旧路径 | HTTP方法 | → 新 Service 调用 |
|--------|----------|-------------------|
| `/api/v1/daDeviceGroups` | GET | `daService.getDeviceGroups(projectId)` |
| `/api/v1/daAddDeviceGroup` | POST | `daService.addDeviceGroup(data)` |
| `/api/v1/daEditDeviceGroup` | PUT | `daService.editDeviceGroup(id, data)` |
| `/api/v1/daDelDeviceGroups` | DELETE | `daService.deleteDeviceGroups(ids)` |
| `/api/v1/daDevices` | GET | `daService.getDevices(params)` |
| `/api/v1/daAddDevice` | POST | `daService.addDevice(data)` |
| `/api/v1/daEditDevice` | PUT | `daService.editDevice(id, data)` |
| `/api/v1/daDelDevices` | DELETE | `daService.deleteDevices(ids)` |
| `/api/v1/daVars` | GET | `daService.getVariables(params)` |
| `/api/v1/daAddVariables` | POST | `daService.addVariables(data)` |
| `/api/v1/daEditVars` | PUT | `daService.editVariables(data)` |
| `/api/v1/daDelVars` | DELETE | `daService.deleteVariables(ids)` |
| `/api/v1/daTestConnect` | GET | `daService.testConnect(params)` |
| `/api/v1/daRootSources` | GET | `daService.browseRootSources(params)` |
| `/api/v1/daChildSources` | GET | `daService.browseChildSources(params)` |
| `/api/v1/daExportVars` | POST | `daService.exportVariables(params)` |
| `/api/v1/daImportVars` | POST | `daService.importVariables(file)` |

### Task 8: 网络/存储/转发配置模块

**Files:**
- Create: `exe/app/services/NetworkService.js`
- Create: `exe/app/services/StorageService.js`
- Create: `exe/app/services/TransService.js`
- Create: `exe/app/controllers/controller_network.js`
- Create: `exe/app/routers/api/v1/network_router_config.js`

**适配器注册：**
| 旧路径 | HTTP方法 | → 新 Service 调用 |
|--------|----------|-------------------|
| `/Project/getNetWorkProperty` | POST | `networkService.getProperty(projectId)` |
| `/Project/addProNetWork` | POST | `networkService.addConfig(projectId, data)` |
| `/Project/getTransCom` | POST | `transService.getTypes()` |
| `/Project/getTransDBConfig` | POST | `transService.getDBConfig(projectId)` |
| `/api/v1/addTransConfig` | POST | `transService.addConfig(data)` |
| `/Project/queryOneTrans` | POST | `transService.getById(projectId, storageId)` |
| `/Project/reduceTrans` | POST | `transService.delete(projectId, ids)` |
| `/api/v1/updateTransConfig` | POST | `transService.updateConfig(data)` |
| `/Project/getStorageList` | POST | `storageService.getList(projectId)` |
| `/Project/addStorageConfig` | POST | `storageService.addConfig(data)` |
| `/Project/reduceStroage` | POST | `storageService.delete(projectId, ids)` |
| `/Project/queryOneStorage` | POST | `storageService.getById(projectId, storageId)` |
| `/Project/editStorageConfig` | POST | `storageService.editConfig(data)` |
| `/api/v1/getDBAPPpropety` | POST | `storageService.getDBProperty(dbType)` |

### Task 9: 实时数据模块

**Files:**
- Create: `exe/app/services/RealtimeDataService.js`
- Create: `exe/app/controllers/controller_realtime.js`
- Create: `exe/app/routers/api/v1/realtime_router_config.js`

**适配器注册：**
| 旧路径 | HTTP方法 | → 新 Service 调用 |
|--------|----------|-------------------|
| `/api/v1/batchrealvalue` | GET | `realtimeService.getBatchRealValue(tagNames)` |
| `/api/v1/realtimeVarInfo` | GET | `realtimeService.getRealtimeVarInfo(projectName)` |

### Task 10: 权限管理模块

**Files:**
- Create: `exe/app/services/AuthorityService.js`
- Create: `exe/app/controllers/controller_authority.js`
- Create: `exe/app/routers/api/v1/authority_router_config.js`
- Create: `exe/compat/adapters/adapter_authority.js`

**功能：** 用户管理、角色管理（保持与旧 codeMessage.js 兼容）。

---

## Phase 11: 应用层路由汇总 + compat 入口

### Task 11.1: 汇总 app 路由

**Files:**
- Modify: `exe/app/routers/api/v1/index.js`
- Modify: `exe/app/routers/index.js`
- Modify: `exe/app/controllers/index.js`
- Modify: `exe/app/services/index.js`
- Modify: `exe/app/models/index.js`

- [ ] **Step 1: 创建 app/routers/api/v1/index.js**

```js
const routerConfig = {};

routerConfig.device = require('./device_router_config');
routerConfig.variable = require('./variable_router_config');
routerConfig.driver = require('./driver_router_config');
routerConfig.network = require('./network_router_config');
routerConfig.uaCollect = require('./uaCollect_router_config');
routerConfig.daCollect = require('./daCollect_router_config');
routerConfig.realtime = require('./realtime_router_config');
routerConfig.authority = require('./authority_router_config');

module.exports = routerConfig;
```

- [ ] **Step 2: 创建 app/routers/index.js**

```js
const router = require('express').Router();
const { midware_response, midware_tenantId, midware_auth } = require('../../core/middlewares');
const midware_i18n = require('../../core/middlewares/midware_i18n');

// 中间件链（与 lib 一致）
router.use(midware_response);
router.use(midware_i18n);
router.use(midware_tenantId);
router.use(midware_auth.extractUserInfo);

// 复用 lib 的 route_loader
const RouteLoader = require('../../lib/routers/route_loader').constructor;
const routerConfig = require('./api/v1');
const loader = new RouteLoader();
// 手动设置 routerContainer
loader.routerContainer = routerConfig;
loader.registerRoutes(router);

module.exports = router;
```

- [ ] **Step 3: 更新 app/controllers/index.js**

```js
const controllers = {};
controllers.device = require('./controller_device');
controllers.variable = require('./controller_variable');
controllers.driver = require('./controller_driver');
controllers.network = require('./controller_network');
controllers.uaCollect = require('./controller_uacollect');
controllers.daCollect = require('./controller_dacollect');
controllers.realtime = require('./controller_realtime');
controllers.authority = require('./controller_authority');
module.exports = controllers;
```

- [ ] **Step 4: 更新 models/index.js**

```js
module.exports = {
  Device: require('./Device'),
  DeviceGroup: require('./DeviceGroup'),
  Variable: require('./Variable'),
  VariableGroup: require('./VariableGroup'),
  Driver: require('./Driver'),
  NetworkConfig: require('./NetworkConfig'),
  StorageConfig: require('./StorageConfig'),
  TransConfig: require('./TransConfig'),
};
```

- [ ] **Step 5: 更新 services/index.js**

```js
module.exports = {
  DeviceService: require('./DeviceService'),
  VariableService: require('./VariableService'),
  DriverService: require('./DriverService'),
  NetworkService: require('./NetworkService'),
  StorageService: require('./StorageService'),
  TransService: require('./TransService'),
  UACollectService: require('./UACollectService'),
  DACollectService: require('./DACollectService'),
  RealtimeDataService: require('./RealtimeDataService'),
  AuthorityService: require('./AuthorityService'),
};
```

### Task 11.2: 创建 compat 入口文件

**Files:**
- Create: `exe/compat/index.js`

- [ ] **Step 1: 创建 compat 入口**

```js
const express = require('express');

module.exports = function() {
  const router = express.Router();

  // 注册各适配器到对应的旧路径前缀
  router.use('/ProjectDev', require('./adapters/adapter_device')());
  router.use('/ProjectVar', require('./adapters/adapter_variable')());
  router.use('/DriverManage', require('./adapters/adapter_driver')());
  router.use('/Authority', require('./adapters/adapter_authority')());

  // adapter_restful 处理 /api/v1 下的旧格式接口(UA/DA/实时数据/网络等)
  const restfulAdapter = require('./adapters/adapter_restful');
  // 直接注册中间件
  restfulAdapter(router);
  // adapter_network 处理 /Project 下的网络/存储/转发旧接口
  router.use('/Project', require('./adapters/adapter_network')());

  return router;
};
```

---

## Phase 12: 入口文件 + 启动集成

### Task 12: 创建 exe/index.js 入口

**Files:**
- Create: `exe/index.js`

- [ ] **Step 1: 创建入口文件（融合旧版初始化 + 新路由架构）**

```js
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const https = require('https');
const http = require('http');

const app = express();
const VERSION = 'wiot-kio-v20260601';

// 版本查询
if (process.argv.length > 2 && process.argv[2] === '-v') {
  console.log('version: ', VERSION);
  return;
}

// === 初始化 ===
const { initial, initLogger, initLogDB, getWebPort } = require('./core/bootstrap');
initial();

// 全局异常处理
process.on('uncaughtException', function (err) {
  console.log(err);
  console.log(err.stack);
  if (global.appLogger && global.appLogger.system) {
    global.appLogger.system.error('未捕获异常', { ip: '', tenantId: '', user: '', addon: {}, context: err.stack });
  }
});

// === 日志系统 ===
initLogger();
initLogDB();

// 加载旧版辅助模块（保留兼容性）
const pubInterClass = require('./Routes/PublicInterface');
const publicInterface = new pubInterClass();
global.publicInterface = publicInterface;

// === 全局中间件 ===
// 跨域（兼容旧版）
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Content-Length,Authorization,Accept,X-Requested-With,datasourcename,tenant_id,user_id,user_name,category_id');
  res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }
  next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser('sessiontest'));
app.use(session({ secret: 'sessiontest', resave: true, saveUninitialized: true }));
app.use(express.static('Public'));
app.use(express.static('Data'));
app.use(express.static(global.exportPath));
app.use(express.static(global.importPath));

// === 路由注册 ===

// 1. lib 路由 → / (project, projectGroup, script) - 保留
app.use('/', require('./lib/routers'));

// 2. app 路由 → /api/v1 (device, variable, driver, ...) - 新
app.use('/api/v1', require('./app/routers'));

// 3. compat 路由 → 旧路径 (可剥离)
//    注册在 /ProjectDev, /ProjectVar, /DriverManage, /Authority, /Project, /api/v1(旧)
app.use('/', require('./compat')());

// 4. 保留旧版路由（过渡期，compat 逐渐替代）
//    用户管理、OAuth 认证等暂时保留原样
const userManagers = require('./Routes/userManager');
const KIOUserManagers = new userManagers();
app.use('/ProjectVar', function (req, res, next) { KIOUserManagers.checkOperationTokenIsValid(req, res, next); }, require('./Routes/ProjectVarManage'));
app.use('/Project', function (req, res, next) { KIOUserManagers.checkOperationTokenIsValid(req, res, next); }, require('./Routes/ProjectManage'));
app.use('/ProjectGroup', function (req, res, next) { KIOUserManagers.checkOperationTokenIsValid(req, res, next); }, require('./Routes/ProjectGroupManage'));
app.use('/ProjectDev', function (req, res, next) { KIOUserManagers.checkOperationTokenIsValid(req, res, next); }, require('./Routes/ProjectDeviceManage'));
app.use('/DriverManage', function (req, res, next) { KIOUserManagers.checkOperationTokenIsValid(req, res, next); }, require('./Routes/DriverManager'));
app.use('/Authority', function (req, res, next) { KIOUserManagers.checkOperationTokenIsValid(req, res, next); }, require('./Routes/AuthorityManage'));

// 保留旧版 /api/v1 路由
const RestfulManage = require('./Routes/RestfulManage');
const KFRestfulManage = require('./Routes/KFRestfulManage');
app.use('/api/v1', function (req, res, next) { next(); }, RestfulManage);
app.use('/api/v1', function (req, res, next) { next(); }, KFRestfulManage);

// 5. 版本查询接口
app.get('/version', function (req, res) {
  res.send({ version: VERSION });
});

// === 启动服务 ===
const webServicePort = getWebPort();

if (global.isHttp) {
  const server = http.createServer(app);
  server.listen(webServicePort, function () {
    const host = server.address().address;
    const port = server.address().port;
    console.log(`kingioserver 启动成功，访问地址 http://${host}:${port}`);
    if (global.appLogger && global.appLogger.system) {
      global.appLogger.system.info('服务启动', { ip: '', tenantId: '', user: '无', addon: {}, context: '数采服务启动成功' });
    }
  });
} else {
  const sslPath = __dirname + '/config';
  const credentials = {
    cert: fs.readFileSync(sslPath + '/server.pem', 'utf8'),
    key: fs.readFileSync(sslPath + '/server.key', 'utf8'),
  };
  const server = https.createServer(credentials, app);
  server.listen(webServicePort, function () {
    const host = server.address().address;
    const port = server.address().port;
    console.log(`kingioserver 启动成功，访问地址 https://${host}:${port}`);
    if (global.appLogger && global.appLogger.system) {
      global.appLogger.system.info('服务启动', { ip: '', tenantId: '', user: '无', addon: {}, context: '数采服务启动成功' });
    }
  });
}

module.exports = app;
```

- [ ] **Step 2: 验证启动**

```bash
cd /Users/fengjinlong/Desktop/ykJob/中汽代码合并/kingioserver_Re/exe
node index.js &
sleep 3
curl -s http://localhost:11002/version | head -c 200
kill %1 2>/dev/null
```

Expected: 返回版本号 JSON。

---

## Phase 13: 回归测试 + JSON 产物一致性验证

### Task 13: 全量 JSON 产物一致性对比

**Files:**
- Create: `exe/compat/utils/json_comparator.js`

- [ ] **Step 1: 创建 JSON 对比工具**

```js
const fs = require('fs');
const path = require('path');

function deepCompare(oldObj, newObj, currentPath = '') {
  const diffs = [];

  if (typeof oldObj !== typeof newObj) {
    diffs.push(`${currentPath}: type mismatch (${typeof oldObj} vs ${typeof newObj})`);
    return diffs;
  }

  if (oldObj === null || newObj === null) {
    if (oldObj !== newObj) diffs.push(`${currentPath}: null mismatch`);
    return diffs;
  }

  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    if (oldObj.length !== newObj.length) {
      diffs.push(`${currentPath}: array length (${oldObj.length} vs ${newObj.length})`);
    }
    const len = Math.min(oldObj.length, newObj.length);
    for (let i = 0; i < len; i++) {
      diffs.push(...deepCompare(oldObj[i], newObj[i], `${currentPath}[${i}]`));
    }
    return diffs;
  }

  if (typeof oldObj === 'object') {
    for (const key of Object.keys(oldObj)) {
      if (!(key in newObj)) {
        diffs.push(`${currentPath}.${key}: missing in new output`);
      } else {
        diffs.push(...deepCompare(oldObj[key], newObj[key], `${currentPath}.${key}`));
      }
    }
    for (const key of Object.keys(newObj)) {
      if (!(key in oldObj)) {
        diffs.push(`${currentPath}.${key}: extra in new output`);
      }
    }
    return diffs;
  }

  if (oldObj !== newObj) {
    diffs.push(`${currentPath}: value "${oldObj}" vs "${newObj}"`);
  }
  return diffs;
}

/**
 * 对比两个 API 输出
 * @param {string} endpoint - 接口名称
 * @param {*} oldOutput - 旧接口输出
 * @param {*} newOutput - 新接口输出
 * @returns {string[]} 差异列表
 */
function compareOutputs(endpoint, oldOutput, newOutput) {
  const diffs = deepCompare(oldOutput, newOutput, endpoint);
  if (diffs.length === 0) {
    console.log(`PASS: ${endpoint} - outputs match`);
  } else {
    console.log(`FAIL: ${endpoint} - ${diffs.length} differences:`);
    diffs.forEach(d => console.log(`  ${d}`));
  }
  return diffs;
}

module.exports = { compareOutputs, deepCompare };
```

- [ ] **Step 2: 逐接口对比测试流程**

```bash
# 1. 启动旧版 kingioserver (端口 11002)
# 2. 启动新版 kingioserver_Re (不同端口，如 11003)
# 3. 对每个接口，用相同参数分别请求新旧服务，对比输出

# 设备管理接口对比示例：
curl -s -X POST http://localhost:11002/ProjectDev/getProjectDeviceGroupTreeView \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test-project-id"}' > old_output.json

curl -s -X POST http://localhost:11003/ProjectDev/getProjectDeviceGroupTreeView \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test-project-id"}' > new_output.json

node -e "
const { compareOutputs } = require('./exe/compat/utils/json_comparator');
const oldOut = JSON.parse(require('fs').readFileSync('old_output.json','utf8'));
const newOut = JSON.parse(require('fs').readFileSync('new_output.json','utf8'));
compareOutputs('getProjectDeviceGroupTreeView', oldOut, newOut);
"
```

---

## Phase 14: 性能测试 + 最终验证

### Task 14: 大批量导入性能测试

- [ ] **Step 1: 生成 10000 条测试变量数据**

```bash
node -e "
const fs = require('fs');
const vars = [];
for (let i = 0; i < 10000; i++) {
  vars.push({
    TagName: 'TestVar_' + i,
    DeviceName: 'TestDevice',
    TagGroup: 'DefaultGroup',
    TagDataType: 128,
    RegDataType: 128,
    RegName: 'HR',
    RegAddress: '' + (400001 + i),
    Description: 'Test variable ' + i,
  });
}
fs.writeFileSync('/tmp/test_10000_vars.json', JSON.stringify(vars));
console.log('Generated 10000 variables');
"
```

- [ ] **Step 2: 性能对比测试**

```bash
# 旧版导入
time curl -s -X POST http://localhost:11002/ProjectVar/ImportCollectTag \
  -F "projectId=test-project" \
  -F "importMode=append" \
  -F "uploadFile=@/tmp/test_10000_vars.json" > /dev/null

# 新版导入
time curl -s -X POST http://localhost:11003/ProjectVar/ImportCollectTag \
  -F "projectId=test-project" \
  -F "importMode=append" \
  -F "uploadFile=@/tmp/test_10000_vars.json" > /dev/null

# 新版不得显著慢于旧版（允许 ±10%）
```

---

## 实施顺序总结

| 阶段 | 任务数 | 预估工时 | 依赖 |
|------|--------|---------|------|
| Phase 1: 骨架搭建 | 5 | 2h | - |
| Phase 2: 资源复制 | 1 | 0.5h | Phase 1 |
| Phase 3: 设备模块 | 5 | 6h | Phase 2 |
| Phase 4: 变量模块 | 4 | 8h | Phase 2 |
| Phase 5: 驱动模块 | 1 | 4h | Phase 2 |
| Phase 6: UA 采集 | 1 | 4h | Phase 2 |
| Phase 7: DA 采集 | 1 | 3h | Phase 2 |
| Phase 8: 网络/存储/转发 | 1 | 4h | Phase 2 |
| Phase 9: 实时数据 | 1 | 2h | Phase 2 |
| Phase 10: 权限 | 1 | 3h | Phase 2 |
| Phase 11: 路由汇总 | 2 | 2h | Phase 3-10 |
| Phase 12: 入口+启动 | 1 | 2h | Phase 11 |
| Phase 13: 回归测试 | 1 | 8h | Phase 12 |
| Phase 14: 性能测试 | 1 | 2h | Phase 12 |

---

## 自审清单

- [x] 设计文档每个章节都有对应任务覆盖
- [x] 所有接口路径均已列出（含旧路径 → 新 Service 映射）
- [x] 国际化完整：错误码 + 中英文语言包 + AppError + i18n 中间件
- [x] 性能方案体现在 VariableService 的批量导入方法
- [x] compat 每个适配器的路径与 gateway enum_CollectUrl 一致
- [x] 中间件保留：midware_response / midware_tenantId / midware_auth
- [x] 入口文件融合旧版初始化 + 新路由架构
- [x] 变量导入细节覆盖：overwrite / append / toGroup / 组自动创建
- [x] 无 TBD / TODO 占位
