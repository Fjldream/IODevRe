/**
 * kingioserver 入口文件
 *
 * 是 IO 开发态的主服务入口，提供：
 * - 工程管理（project / projectGroup / script）→ lib/
 * - 设备/变量/驱动/UA/DA/网络/实时/权限 → app/
 * - gateway 兼容适配层（可剥离）→ compat/
 * - 总体组枚举变量/设备清单（遗留接口）
 *
 * 启动方式：node index.js [-v]
 * 端口：从 devconfig.json 的 startport + devCenterPortShift.kingio 读取，默认 11002
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const https = require('https');
const http = require('http');

const app = express();
const VERSION = 'wiot-kio-v20250728';

// ---- 版本查询 ----
if (process.argv.length > 2 && process.argv[2] === '-v') {
  console.log('version:', VERSION);
  return;
}

// ---- 初始化（bootstrap 统一管理全局变量和路径）----
const { initial, initLogger, initLogDB, getWebPort } = require('./core/bootstrap');
initial();

// ---- 全局异常处理 ----
process.on('uncaughtException', function (err) {
  console.error('[uncaughtException]', err.message);
  console.error(err.stack);
  if (global.appLogger && global.appLogger.system) {
    global.appLogger.system.error('未捕获异常', {
      ip: '', tenantId: '', user: '无', addon: {}, context: err.stack,
    });
  }
});

process.on('unhandledRejection', function (reason, p) {
  console.error('[unhandledRejection]', reason);
  if (global.logger) global.logger.log('fatal', `unhandledRejection: ${reason}`);
});

// ---- 日志系统 ----
initLogger();
initLogDB();

// ---- 加载旧版辅助模块（保留兼容性）----
const pubInterClass = require('./Routes/PublicInterface');
global.publicInterface = new pubInterClass();
const userManagers = require('./Routes/userManager');
const KIOUserManagers = new userManagers();

// ---- CORS 跨域 ----
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type,Content-Length,Authorization,Accept,X-Requested-With,datasourcename,tenant_id,user_id,user_name,category_id'
  );
  res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }
  next();
});

// ---- 请求体解析 ----
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser('sessiontest'));
app.use(session({ secret: 'sessiontest', resave: true, saveUninitialized: true }));

// ---- 静态资源 ----
app.use(express.static('Public'));
app.use(express.static('Data'));
if (global.exportPath) app.use(express.static(global.exportPath));
if (global.importPath) app.use(express.static(global.importPath));

// ---- 日志中间件 ----
const LogManager = require('./Routes/LogInterface');
new LogManager().useLogger(app);

// ==================== 路由注册 ====================

// 1. 新版 lib 路由 → / (project, projectGroup, script)
app.use('/', require('./lib/routers'));
global.logger && global.logger.log('info', 'lib routes registered');

// 2. 新版 app 路由 → /api/v1 (device, variable, driver, ua, da, network, realtime, authority)
app.use('/api/v1', require('./app/routers'));
global.logger && global.logger.log('info', 'app routes registered at /api/v1');

// 3. compat 兼容适配层 → 旧路径（/ProjectDev, /ProjectVar, /DriverManage, /Authority, /Project, /api/v1）
//    删除下面一行即可剥离兼容层
app.use('/', require('./compat')());
global.logger && global.logger.log('info', 'compat adapters registered');

// 4. 旧版路由已由 compat/ 层完全替代，不再注册旧 Routes。
//    旧文件保留在 exe/Routes/ 下仅作参考，不影响运行。

// 5. 总体组枚举变量清单（遗留，保持旧格式输出）
let strCurProject = '';
app.get('/getProName', function (req, res) {
  strCurProject = req.query.ProjectName;
  res.send('OK');
});

app.get('/api/v1/variables', function (req, res) {
  /** @see 旧 index.js 总体组枚举变量清单 - 保持 JSON 产物一致 */
  const projectName = req.query.projectInstanceName || strCurProject;
  const empty = { sourceName: projectName, objectList: [] };
  const projectDir = global.sdbPath;
  const projectListUrl = path.join(projectDir, 'ProjectGroupList.json');

  let projectListObj;
  try { projectListObj = JSON.parse(fs.readFileSync(projectListUrl, 'utf8')); }
  catch (e) { return res.send(empty); }

  let projectID = '', projectVersion = '';
  for (const group of projectListObj.ProjectGroupList || []) {
    if (group.ProjectName === projectName) { projectID = group.ProjectID; projectVersion = group.ProjectVersion; break; }
    for (const proj of group.ProjectObjectList || []) {
      if (proj.ProjectName === projectName) { projectID = proj.ProjectID; projectVersion = proj.ProjectVersion; break; }
    }
    if (projectID) break;
  }

  if (!projectID) return res.send(empty);

  const varPath = path.join(projectDir, projectID, projectVersion, 'project', 'VarInfo.json');
  let varInfo;
  try { varInfo = JSON.parse(fs.readFileSync(varPath, 'utf8')); }
  catch (e) { return res.send(empty); }

  const result = { sourceName: projectName, objectList: [] };
  const getDataTypeString = (t) => [0, 1, 2, 3, 4, 5][[null, 1, 2, 128, 512, 256].indexOf(t)] || 2;

  for (const tag of varInfo.TagList || []) {
    result.objectList.push({
      n: tag.TagName, d: tag.Description, g: tag.TagGroup,
      t: getDataTypeString(tag.TagDataType), o: '',
      max: tag.MaxValue, min: tag.MinValue,
    });
  }
  res.send(result);
});

app.get('/api/v1/devicevariables', function (req, res) {
  /** @see 旧 index.js 总体组获取设备和变量清单 */
  const projectName = req.query.projectInstanceName || strCurProject;
  const empty = { sourceName: projectName, objectList: [] };
  const projectDir = global.sdbPath;
  const projectListUrl = path.join(projectDir, 'ProjectGroupList.json');

  let projectListObj;
  try { projectListObj = JSON.parse(fs.readFileSync(projectListUrl, 'utf8')); }
  catch (e) { return res.send(empty); }

  let projectID = '', projectVersion = '';
  for (const group of projectListObj.ProjectGroupList || []) {
    if (group.ProjectName === projectName) { projectID = group.ProjectID; projectVersion = group.ProjectVersion; break; }
    for (const proj of group.ProjectObjectList || []) {
      if (proj.ProjectName === projectName) { projectID = proj.ProjectID; projectVersion = proj.ProjectVersion; break; }
    }
    if (projectID) break;
  }

  if (!projectID) return res.send(empty);

  const varPath = path.join(projectDir, projectID, projectVersion, 'project', 'VarInfo.json');
  const devPath = path.join(projectDir, projectID, projectVersion, 'project', 'DeviceInfo.json');
  let varInfo, devInfo;
  try { varInfo = JSON.parse(fs.readFileSync(varPath, 'utf8')); devInfo = JSON.parse(fs.readFileSync(devPath, 'utf8')); }
  catch (e) { return res.send(empty); }

  const result = { sourceName: projectName, objectList: [] };
  const getDataTypeString = (t) => [0, 1, 2, 3, 4, 5][[null, 1, 2, 128, 512, 256].indexOf(t)] || 2;

  for (const dev of devInfo.DeviceList || []) {
    const devVars = (varInfo.TagList || []).filter(t => t.DeviceName === dev.DeviceName);
    result.objectList.push({
      n: dev.DeviceName, d: dev.Description,
      objectList: devVars.map(v => ({
        n: v.TagName, d: v.Description, g: v.TagGroup,
        t: getDataTypeString(v.TagDataType), o: '',
      })),
    });
  }
  res.send(result);
});

// ==================== 启动服务 ====================
const webServicePort = getWebPort();

if (global.isHttp) {
  const server = http.createServer(app);
  server.listen(webServicePort, function () {
    console.log(`kingioserver (HTTP) 启动成功，端口 ${webServicePort}`);
    if (global.appLogger && global.appLogger.system) {
      global.appLogger.system.info('服务启动', {
        ip: '', tenantId: '', user: '无', addon: {}, context: '数采服务启动成功',
      });
    }
  });
} else {
  const sslPath = path.join(__dirname, 'config');
  const credentials = {
    cert: fs.readFileSync(path.join(sslPath, 'server.pem'), 'utf8'),
    key: fs.readFileSync(path.join(sslPath, 'server.key'), 'utf8'),
  };
  const server = https.createServer(credentials, app);
  server.listen(webServicePort, function () {
    console.log(`kingioserver (HTTPS) 启动成功，端口 ${webServicePort}`);
    if (global.appLogger && global.appLogger.system) {
      global.appLogger.system.info('服务启动', {
        ip: '', tenantId: '', user: '无', addon: {}, context: '数采服务启动成功',
      });
    }
  });
}

module.exports = app;
