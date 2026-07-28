var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var session = require('express-session');
var path = require('path');
var os = require('os');
var socketio = require('socket.io');
var pubInterClass = require('./Routes/PublicInterface');
var publicInterface = new pubInterClass();
var AuthenticSystem = require('./Routes/OAuthenicSystemInterface');
var userAuthenticSystem = new AuthenticSystem();
var log4js = require('log4js');
var VERSION = 'wiot-kio-v20250603';
var LogManager = require('./Routes/LogInterface');
var LogManagerObj = new LogManager();
//20240703 
var https = require("https");
var http = require("http");
//20240206 提供版本查询功能
if (process.argv.length > 2) {
  if ('-v' == process.argv[2]) {
    console.log('version: ', VERSION);
    return;
  }
}
process.on('uncaughtException', function (err) {
  console.log(err);
  console.log(err.stack);
  LogManagerObj.errorLog("", err.stack);
});

global.productType = 0; //产品类型
global.propertyPath = ""; //属性配置文件路径
global.sdbPath = ""; //工程文件路径
global.exportPath = ""; //导出文件路径
global.importPath = ""; //导入文件缓存路径
global.drivePath = "./Driver"; //驱动路径
global.oauthInfo = {
  expires_in: 0,
  checkTokenFlag: false,
  access_token: 0,
  refresh_token: 0
}
global.__dir = __dirname;
var envpath = path.resolve(__dir, '../../.env');
let option = {
  'path': envpath
};
// require('dotenv').config(option);
var LogManager = require('./Routes/LogInterface');
var LogManagerObj = new LogManager();
LogManagerObj.useLogger(app);





var userManagers = require('./Routes/userManager');
var KIOUserManagers = new userManagers();

var strConfigPath = "./config/serverconfig.json";

function initial() {
  //global.oauthInfo.expires_in = new Date().getTime() + 1000 * 60 * 60 *24 * 7;//token过期时间 add by xin.wang 2020-06-15
  //读取产品类型（KF3.6或KF4.0）
  var objJson = publicInterface.readJson(strConfigPath);
  if (!objJson.Error && objJson.data.isHttp == false) {
    global.isHttp = false;
  } else {
    global.isHttp = true;
  }
  if (!objJson.Error && objJson.data.ProductTypeRule != undefined && objJson.data.ProductTypeRule.ProductType != undefined) {
    global.productType = objJson.data.ProductTypeRule.ProductType;
    if (objJson.data.ProductTypeRule.Rule != undefined && objJson.data.ProductTypeRule.Rule["KF3.6"] == global.productType) {
      var objExConfig = publicInterface.readJson("../config/externalConfig.json");
      if (objExConfig != {} && objExConfig.data.projectDir != undefined) {
        global.sdbPath = objExConfig.data.projectDir;
      }
      global.propertyPath = "./Data/config/propertyConfigForKF3.6"; //属性配置文件路径
      global.demoPath = "./Data/demo/KF3.6"; //工程文件demo路径
      global.RestfulIP = "";
    } else if (objJson.data.ProductTypeRule.Rule != undefined && objJson.data.ProductTypeRule.Rule["KF4.0"] == global.productType) {
      global.sdbPath = "../sdb";
      global.propertyPath = "./Data/config/propertyConfigForKF4.0";
      global.demoPath = "./Data/demo/KF4.0"; //工程文件demo路径
      global.RestfulIP = "";
    }
    if (objExConfig.data.checkTokenFlag) {
      global.oauthInfo.checkTokenFlag = objExConfig.data.checkTokenFlag;
    }
    if (objExConfig.data.expires_in) {
      global.oauthInfo.expires_in = objExConfig.data.expires_in
    } else {
      global.oauthInfo.expires_in = new Date().getTime(); //token过期时间
    }
  } else {
    //如果读取配置文件失败的话就写个默认值
    global.productType = 2;
    global.sdbPath = "../sdb";
  }

  var strAllProPath = "";
  if (global.productType == 1) {
    strAllProPath = "../../../../sdb";
  } else {
    strAllProPath = global.sdbPath;
  }
  //生成导入导出文件暂存的目录
  let strFileStatPath = path.join(__dirname,'../../../sdb/filestation/kingioserver');
  if (!fs.existsSync(strFileStatPath)) {
    makeDirSync(strFileStatPath + "/export");
    makeDirSync(strFileStatPath + "/import");
  }
  global.exportPath = strFileStatPath + "/export";
  global.importPath = strFileStatPath + "/import";
}
initial();

var ProjectAuthorityManage = require('./Routes/AuthorityManage'); //wx
var ProjectDeviceManage = require('./Routes/ProjectDeviceManage'); //wx
var ProjectGroupManage = require('./Routes/ProjectGroupManage'); //mgw
var ProjectManage = require('./Routes/ProjectManage'); //mgw
var ProjectVarManage = require('./Routes/ProjectVarManage'); //oybp
var DriverManage = require('./Routes/DriverManager'); //oybp
const {
  createSocket
} = require('dgram');
var RestfulManage = require('./Routes/RestfulManage'); //oybp
var KFRestfulManage = require('./Routes/KFRestfulManage'); //oybp

app.all('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length,Authorization,Accept,X-Requested-With");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  //允许所有跨域
  if (req.method === "OPTIONS") {
    res.status(200);
    res.send();
    return;
  }
  next();
});
app.use('/ProjectVar', function (req, res, next) {
  KIOUserManagers.checkOperationTokenIsValid(req, res, next);
}, ProjectVarManage);

app.use('/Project', function (req, res, next) {
  KIOUserManagers.checkOperationTokenIsValid(req, res, next);
}, ProjectManage);
app.use('/ProjectGroup', function (req, res, next) {
  KIOUserManagers.checkOperationTokenIsValid(req, res, next);
}, ProjectGroupManage); //mgw

app.use('/ProjectDev', function (req, res, next) {
  KIOUserManagers.checkOperationTokenIsValid(req, res, next);
}, ProjectDeviceManage); //wx

app.use('/DriverManage', function (req, res, next) {
  KIOUserManagers.checkOperationTokenIsValid(req, res, next);
}, DriverManage); //oybp

app.use('/Authority', function (req, res, next) {
  KIOUserManagers.checkOperationTokenIsValid(req, res, next);
}, ProjectAuthorityManage); //wx
app.use(log4js.connectLogger(log4js.getLogger('http'), {
  level: log4js.levels.INFO,
  format: 'method:url'
})); //sx


app.use('/api/v1', function (req, res, next) {
  next()
}, RestfulManage); //oybp

app.use('/api/v1', function (req, res, next) {
  next()
}, KFRestfulManage); //oybp



//总体组枚举变量清单
app.get('/api/v1/variables', function (req, res, next) {
  var strProjectDir = "";
  var objExConfig = {};
  var strExConfig = "";
  let strProjectName = "";
  if (req.query.projectInstanceName != undefined) {
    strProjectName = req.query.projectInstanceName;
  } else {
    strProjectName = strCurProject;
  }

  var objEmpty = {
    "sourceName": strProjectName,
    "objectList": []
  }
  strProjectDir = global.sdbPath;

  var obJObjectList = {};
  obJObjectList.sourceName = strProjectName;
  obJObjectList.objectList = [];
  //add by xin.wang 2020-05-09
  var projectListUrl = strProjectDir + "/ProjectGroupList.json";
  var projectListObj;
  try {
    projectListObj = JSON.parse(fs.readFileSync(projectListUrl));
  } catch (error) {
    console.log(error);
    res.send(objEmpty);
    return;
  }
  var ProjectID = "";
  var ProjectVersion = "";
  for (var i = 0; i < projectListObj.ProjectGroupList.length; i++) {
    if (projectListObj.ProjectGroupList[i].ProjectName != undefined && projectListObj.ProjectGroupList[i].ProjectName == strProjectName) {
      ProjectID = projectListObj.ProjectGroupList[i].ProjectID;
      ProjectVersion = projectListObj.ProjectGroupList[i].ProjectVersion;
      break;
    }
    if (projectListObj.ProjectGroupList[i].ProjectObjectList != undefined && projectListObj.ProjectGroupList[i].ProjectObjectList.length > 0) {
      for (var j = 0; j < projectListObj.ProjectGroupList[i].ProjectObjectList.length; j++) {
        if (projectListObj.ProjectGroupList[i].ProjectObjectList[j].ProjectName != undefined && projectListObj.ProjectGroupList[i].ProjectObjectList[j].ProjectName == strProjectName) {
          ProjectID = projectListObj.ProjectGroupList[i].ProjectObjectList[j].ProjectID;
          ProjectVersion = projectListObj.ProjectGroupList[i].ProjectObjectList[j].ProjectVersion;
          break;
        }
      }
      if (ProjectID != "" && ProjectID != undefined && ProjectVersion != "" && ProjectVersion != undefined) {
        break;
      }
    }
  }
  if (ProjectID != "" && ProjectID != undefined && ProjectVersion != "" && ProjectVersion != undefined) {
    var strProVarPath = strProjectDir + "/" + ProjectID + "/" + ProjectVersion + "/project/VarInfo.json";
    let objAllVarInfo = ReadJson(strProVarPath);
    if (objAllVarInfo.Error) {
      res.send(objEmpty);
      console.log(objAllVarInfo.ErrorDesc);
      return;
    }
    for (let j = 0; j < objAllVarInfo.TagList.length; j++) {
      let objTemp = {};
      objTemp.n = objAllVarInfo.TagList[j].TagName;
      objTemp.d = objAllVarInfo.TagList[j].Description;
      objTemp.g = objAllVarInfo.TagList[j].TagGroup;
      objTemp.t = GetDataTypeString(objAllVarInfo.TagList[j].TagDataType);
      objTemp.o = "";
      objTemp.max = objAllVarInfo.TagList[j].MaxValue;
      objTemp.min = objAllVarInfo.TagList[j].MinValue;
      obJObjectList.objectList.push(objTemp);
    }
  } else {
    console.log("文件不存在");
    res.send(objEmpty);
    return;
  }
  res.send(obJObjectList);
})


var webServicePort = getWebPort();

app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');
//app.set('view engine', 'ejs');

app.use(express.static("Public"));
app.use(express.static("Data"));
app.use(express.static(global.exportPath)); //导出目录注册为静态资源目录
app.use(express.static(global.importPath));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cookieParser('sessiontest'));
app.use(session({
  secret: 'sessiontest',
  resave: true,
  saveUninitialized: true
}))
/**http or https */
if (global.isHttp) {
  var server = http.createServer(app);
  server.listen(webServicePort, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("应用实例，访问地址为 http://%s:%s", host, port)
    appLogger.system.info("服务启动", {
      "ip": '',
      "tenantId": "",
      "user": "无",
      "addon": {},
      "context":"数采服务启动成功"
    });
  })
} else {
  var ssl_path = __dirname + "/config";
  var credentials = {
    cert: fs.readFileSync(ssl_path + '/server.pem', 'utf8'),
    key: fs.readFileSync(ssl_path + '/server.key', 'utf8')
  }
  var server = https.createServer(credentials, app);
  server.listen(webServicePort, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("应用实例，访问地址为 https://%s:%s", host, port)
    appLogger.system.info("服务启动", {
      "ip": '',
      "tenantId": "",
      "user": "无",
      "addon": {},
      "context":"数采服务启动成功"
    });
  })
}

//读json文件
function ReadJson(strPath) {
  let objJson = {};
  let strOutPath = publicInterface.getFileName(strPath);
  if (fs.existsSync(strPath)) {
    let strJson = "";
    try {
      strJson = fs.readFileSync(strPath);
    } catch (error) {
      objJson.Error = true;
      objJson.ErrorDesc = "读取" + strOutPath + "失败";
      return objJson;
    }

    try {
      objJson = JSON.parse(strJson);
      objJson.Error = false;
    } catch (error) {
      objJson.Error = true;
      objJson.ErrorDesc = error.message;
      console.log(error.message);
      return objJson;
    }

  } else {
    objJson.Error = true;
    objJson.ErrorDesc = strOutPath + " 不存在";
    return objJson;
  }
  return objJson;
}

//写json文件
function WriteJson(strPath, objJson) {
  let strJson = JSON.stringify(objJson, "", "\t");
  try {
    fs.writeFileSync(strPath, strJson);
  } catch (error) {
    return strPath + "写入失败，失败原因：" + error.message;
  }
  return "OK";
}

//将数据类型的数字转化为总体组规定的数字
function GetDataTypeString(MemberDataType) {
  var nDataType = 0;

  if (MemberDataType == 1) {
    nDataType = 1;
  } else if (MemberDataType == 128) {
    nDataType = 3;
  } else if (MemberDataType == 512) {
    nDataType = 4;
  } else if (MemberDataType == 256 || MemberDataType == 4096) {
    nDataType = 5;
  } else {
    nDataType = 2;
  }
  return nDataType;
}

//总体组获取设备和变量清单
app.get('/api/v1/devicevariables', function (req, res) {
  var strProjectDir = "";
  var objExConfig = {};
  var strExConfig = "";
  let strProjectName = "";
  if (req.query.projectInstanceName != undefined) {
    strProjectName = req.query.projectInstanceName;
  } else {
    strProjectName = strCurProject;
  }

  var objEmpty = {
    "sourceName": strProjectName,
    "objectList": []
  }
  //读取配置文件获取工程文件路径
  try {
    strExConfig = fs.readFileSync("../config/externalConfig.json");
  } catch (error) {
    res.send(objEmpty);
    return;
  }

  try {
    objExConfig = JSON.parse(strExConfig);
  } catch (error) {
    res.send(objEmpty);
    return;
  }
  if (objExConfig != {} && objExConfig.projectDir != undefined) {
    strProjectDir = objExConfig.projectDir;
  }

  var obJObjectList = {};
  obJObjectList.sourceName = strProjectName;
  obJObjectList.objectList = [];
  //add by xin.wang 2020-05-09
  var projectListUrl = strProjectDir + "/ProjectGroupList.json";
  var projectListObj;
  try {
    projectListObj = JSON.parse(fs.readFileSync(projectListUrl));
  } catch (error) {
    console.log(error);
    res.send(objEmpty);
    return;
  }
  var ProjectID = "";
  var ProjectVersion = "";
  for (var i = 0; i < projectListObj.ProjectGroupList.length; i++) {
    if (projectListObj.ProjectGroupList[i].ProjectName != undefined && projectListObj.ProjectGroupList[i].ProjectName == strProjectName) {
      ProjectID = projectListObj.ProjectGroupList[i].ProjectID;
      ProjectVersion = projectListObj.ProjectGroupList[i].ProjectVersion;
      break;
    }
    if (projectListObj.ProjectGroupList[i].ProjectObjectList != undefined && projectListObj.ProjectGroupList[i].ProjectObjectList.length > 0) {
      for (var j = 0; j < projectListObj.ProjectGroupList[i].ProjectObjectList.length; j++) {
        if (projectListObj.ProjectGroupList[i].ProjectObjectList[j].ProjectName != undefined && projectListObj.ProjectGroupList[i].ProjectObjectList[j].ProjectName == strProjectName) {
          ProjectID = projectListObj.ProjectGroupList[i].ProjectObjectList[j].ProjectID;
          ProjectVersion = projectListObj.ProjectGroupList[i].ProjectObjectList[j].ProjectVersion;
          break;
        }
      }
      if (ProjectID != "" && ProjectID != undefined && ProjectVersion != "" && ProjectVersion != undefined) {
        break;
      }
    }
  }
  if (ProjectID != "" && ProjectID != undefined && ProjectVersion != "" && ProjectVersion != undefined) {
    var strProVarPath = strProjectDir + "/" + ProjectID + "/" + ProjectVersion + "/project/VarInfo.json";
    let objAllVarInfo = ReadJson(strProVarPath);
    if (objAllVarInfo.Error) {
      res.send(objEmpty);
      console.log(objAllVarInfo.ErrorDesc);
      return;
    }
    var strProDevPath = strProjectDir + "/" + ProjectID + "/" + ProjectVersion + "/project/DeviceInfo.json";
    let objAllDevInfo = ReadJson(strProDevPath);
    if (objAllDevInfo.Error) {
      res.send(objEmpty);
      console.log(objAllDevInfo.ErrorDesc);
      return;
    }
    for (let j = 0; j < objAllDevInfo.DeviceList.length; j++) {
      let objTemp = {};
      objTemp.n = objAllDevInfo.DeviceList[j].DeviceName;
      objTemp.d = objAllDevInfo.DeviceList[j].Description;
      let arrVarInDev = objAllVarInfo.TagList.filter(function (tag) {
        return tag.DeviceName == objTemp.n;
      });
      objTemp.objectList = [];
      for (let k = 0; k < arrVarInDev.length; k++) {
        let objTagTmp = {};
        objTagTmp.n = arrVarInDev[k].TagName;
        objTagTmp.d = arrVarInDev[k].Description;
        objTagTmp.g = arrVarInDev[k].TagGroup;
        objTagTmp.t = GetDataTypeString(arrVarInDev[k].TagDataType);
        objTagTmp.o = "";
        objTemp.objectList.push(objTagTmp);
      }
      obJObjectList.objectList.push(objTemp);
    }
  } else {
    console.log("文件不存在");
    res.send(objEmpty);
    return;
  }
  res.send(obJObjectList);
})

var strCurProject = ""; //当前打开的工程名称
//获取当前编辑的工程
app.get('/getProName', function (req, res) {
  strCurProject = req.query.ProjectName;
  let strCurProjectID = req.query.ProjectID;
  let strCurProjectVersion = req.query.ProjectVersion;
  res.send("OK");
})

//递归创建目录
function makeDirSync(pathname) {
  if (fs.existsSync(pathname)) {
    return true;
  } else {
    if (makeDirSync(path.dirname(pathname))) {
      try {
        fs.mkdirSync(pathname);
      } catch (error) {
        return false;
      }

      return true;
    } else {
      return false;
    }
  }
}

function getWebPort() {
  let objJson = ReadJson('../../../../config/devconfig.json');
  if (objJson.Error || objJson.startport == undefined || objJson.devCenterPortShift == undefined || objJson.devCenterPortShift.kingio == undefined) {
    return 11002;
  } else {
    return objJson.startport + objJson.devCenterPortShift.kingio;
  }
}
// 公共模块目录
global.commonDir = path.resolve(`${__dirname}/../../../common/`);
global.__DIR = __dirname;
function initLogger() {
    let LoggerInstance = require(`${global.commonDir}/log-utils`).getInstance();
    LoggerInstance.init(`../../../sdb/logs/kingioserver`);
    global.logger = LoggerInstance;
}

// 初始化日志数据库
function initLogDB() {
    const logUtilPath = path.resolve(`${global.commonDir}/sqlitelog-utils`);
    const DbLoggerUtil = require(logUtilPath);
    let kfCenterPath = path.resolve(`${global.commonDir}/../`);
    let logConfig = require(path.resolve(`${global.commonDir}/../config/common.json`));
    const dbLoggerUtil = new DbLoggerUtil({
        kfPath: kfCenterPath, // KF安装目录
        dbType: 'center', // 数据库类型："node"或"center"
        tableName: `kingioserver`, // sqlite中生成的表名
        batchSize: 50, // 每50条批量写入
        flushInterval: 2000, // 最多2秒刷新一次
        // 按天保留日志：保留1天的日志，每12小时清理一次
        retentionUnit: "day",
        retention: logConfig.logConfig.retainTime,
        cleanupInterval: 12 * 60 * 60 * 1000,
        level: 'info', // 只记录info及以上级别的日志，日志级别："silly" < "debug" < "verbose" < "http" < "info" < "warn" < "error"
    });
    global.appLogger = {
        system: dbLoggerUtil.getLogger('system', 'kingioserver'), // 系统日志
        operation: dbLoggerUtil.getLogger('opration', 'kingioserver'), // 系统日志
        script: dbLoggerUtil.getLogger('script', 'kingioserver'), // 系统日志
    };
}

// 注册路由
function registerRouter() {
  let routes = require(`${__dirname}/lib/routers`);
  // 设置跨域访问
  app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,Authorization,datasourcename,Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Content-Type', 'application/json;charset=utf-8');
    if (req.method === 'OPTIONS') {
      res.status(200);
      res.send();
      return;
    }
    if (req.url !== '/favicon.ico') {
      logger.log('debug', `-----------------收到连接请求,客户端地址:${req.ip} ${req.originalUrl}`);
      next();
    } else {
      res.status(200);
      res.send();
      return;
    }
  });

  app.use('/', routes);
  logger.log('info', `注册路由完成`);
}
initLogger();
initLogDB();
registerRouter()