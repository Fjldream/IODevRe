var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var router = express.Router();
let formidable = require('formidable');
var path = require('path');
var zipper = require("zip-local");
var uuid = require('node-uuid');
var iconv = require('iconv-lite');
var unzip = require("unzip-stream");
var os = require('os');
var varCheckClass = require('./ObjectCheckInterface');
var varCheckObj = new varCheckClass();

var WebSocketServer = require('ws').Server;
const Json2csvParser = require('json2csv').Parser;
const xss = require('xss');
var net = require('net');
//var opcConfig = require('../Bin/lib/opcConfigModule.node');
var platform = os.platform();
var strPlatFormType = "";
if (/*platform == "win32"*/ false) {
  //driverConfig = require("../Bin/lib/nodeKingConfigModule_win.node"); // 
  strPlatFormType = "Windows";
} else { //linux
  // driverConfig = require("../Bin/lib/nodeKingConfigModule_linux.node");
  // opcConfig = require('../Bin/lib/opcConfigModule.node');//20231113 kiot整包初次部署出现内存释放问题。
  strPlatFormType = "Linux";
}
var OPCUAConfig = require('./OpcUaConfig');
var opcConfigNew = new OPCUAConfig();
var gateWayInterface = require('./RestfulAPIGateWay');
let tenantManager = require('../lib/services/TenantManager')

//变量类型
if (global.productType == PRODUCTKF36) {
  var KVIO_TAG_TYPE_SYSTEM = 0; //系统变量
  var KVIO_TAG_TYPE_ACCOUNT = 1; //用户变量
  var KVIO_TAG_TYPE_USER = 2; //普通变量
} else {
  var KVIO_TAG_TYPE_SYSTEM = 1; //系统变量
  var KVIO_TAG_TYPE_CHANNEL = 2; //链路系统变量
  var KVIO_TAG_TYPE_DEVICE = 3; //设备系统变量
  var KVIO_TAG_TYPE_USER = 4; //用户变量,KF4.0的用户变量等于KF3.6的普通变量
}
console.log('productType=', global.productType)
var PRODUCTKF36 = 1; //表示产品类型是KF3.6
var PRODUCTKF40 = 2; //表示产品类型是KF4.0

var publicClass = require('./PublicInterface'); //公用函数接口
var pubInter = new publicClass();

var proPublishConnect;
if (global.productType == PRODUCTKF36) {
  proPublishConnect = require('../../common/projectClient/routes/projectClient'); //KF3.6发布更新接口
} else if (global.productType == PRODUCTKF40) {
  gateWayInterface = require('./RestfulAPIGateWay');
  //读取配置文件获取网关地址
  let objJson = pubInter.readJson('./config/serverconfig.json');
  var strRestfulIP = "";
  if (objJson.Error) {
    strRestfulIP = "127.0.0.1"; //默认值
  } else {
    strRestfulIP = objJson.data.RestfulIP;
  }
  var restfulInter = new gateWayInterface(strRestfulIP, '/api/v1', true);
}

var CharacterManager = require('./CharacterInterface'); //角色权限接口
var publicInten = new CharacterManager();

var LogManager = require('./LogInterface'); //日志接口

const {
  post
} = require('request');
const {
  glob
} = require('glob');
var LogManagerObj = new LogManager();

var projectManagerName = "projectManagerName";
var ManagerName = "ProjectManage"
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
  extended: true
}));
var pubInfo;
var opsCenterIP;
var opsCenterFilePort;
var opsCenterPort;
var solutionInfo;
var nodeInfo;

if (global.productType == PRODUCTKF36) {
  try {
    // var projectPath = JSON.parse(fs.readFileSync('../config/externalConfig.json'), 'utf-8').projectDir;
    pubInfo = JSON.parse(fs.readFileSync('../config/externalConfig.json', 'utf-8')).PublishProjectInfo;
    opsCenterIP = JSON.parse(fs.readFileSync('../../../config/devconfig.json', 'utf-8')).opsCenterAddress;
    opsCenterFilePort = JSON.parse(fs.readFileSync('../../../config/devconfig.json', 'utf-8')).opsCenterPort.kingfile;
    opsCenterPort = JSON.parse(fs.readFileSync('../../../config/devconfig.json', 'utf-8')).opsCenterPort.kingops;
    solutionInfo = JSON.parse(fs.readFileSync('../../../config/common.json', 'utf-8')).solutions;
    nodeInfo = JSON.parse(fs.readFileSync('../config/nodeRegister.json', 'utf-8')).nodeInfo;
  } catch (error) {
    console.log("externalConfig.json format error, not a json format.");
  }
}
 
var opsHost = opsCenterIP + ":" + opsCenterPort;
var opsCenterFileHost = opsCenterIP + ":" + opsCenterFilePort;

if (global.productType == PRODUCTKF40) {
  //获取当前工程名
  var strCurProName = ""
  var proFiles = fs.readdirSync(global.sdbPath, 'utf-8');
  for (let index = 0; index < proFiles.length; index++) {
    if (proFiles[index].indexOf(".") == -1) {
      strCurProName = proFiles[index];
      break;
    }
  }

  var bUpload = false; //表示是否上传
  var ppp = null;
  var lastModifyTime = new Date();
  console.log("当前时间为：" + lastModifyTime.getFullYear() + "-" + (lastModifyTime.getMonth() + 1) + "-" + lastModifyTime.getDate() + " " + lastModifyTime.getHours() + ":" + lastModifyTime.getMinutes() + ":" + lastModifyTime.getSeconds() + "." + lastModifyTime.getMilliseconds());
  var nUpChange = 0; //用于得知本次修改是否是上传的变量
  var nNowVersion = 1; //当前工程的版本
  var nLastVersion = 1; //上次修改时的工程版本
  var nTiming = 0; //表示进入定时器的次数，以确保只调用一次定时器
  var gws;
  //var wss = new WebSocketServer({ port: 9000 });
  //wss.on('connection', function (ws) {
  //gws = ws;
  //console.log('client connected');
  //uploadRegulary();
  /* ws.on('message', function (message) {
    console.log(message);
  }); */
  //});

  //4.0定时上传工程
  function uploadRegulary() {
    LogManagerObj.traceLog(projectManagerName, "Enter post uploadRegulary");
    var strProjectName = strCurProName;
    if (nTiming == 0) {
      nTiming++;
      fs.watch(global.sdbPath + "/" + strProjectName, (eventType, filename) => {
        if ((nNowVersion != nLastVersion && nUpChange == 0) || filename == "ProjectFileList.json") { //表示这是上传而不是修改文件
          nUpChange = 1;
          nLastVersion = nNowVersion;
        } else if (nUpChange == 1 && os.type == "Windows_NT") { //由于Windows下一次修改会调两次回调函数，因此增加这个判断
          nUpChange = 0;
        } else {
          bUpload = false; //表示还未上传
          nUpChange = 0;
          let nowTime = new Date();
          let strCurtime = nowTime.getFullYear() + "-" + (nowTime.getMonth() + 1) + "-" + nowTime.getDate() + " " + nowTime.getHours() + ":" + nowTime.getMinutes() + ":" + nowTime.getSeconds() + "." + nowTime.getMilliseconds();
          console.log("修改时间为：" + strCurtime + ";修改文件为：" + filename + ";修改类型为：" + eventType);
          if (ppp != null && nowTime.getTime() - lastModifyTime.getTime() < 5 * 60 * 1000) {
            clearTimeout(ppp);
            ppp = null;
          }
          lastModifyTime = nowTime;
          ppp = setTimeout(() => {
            //console.log("过了一分钟,nowTime=" + (nowTime.getTime() + 60000));
            let uploadTime = new Date();
            let strUptime = uploadTime.getFullYear() + "-" + (uploadTime.getMonth() + 1) + "-" + uploadTime.getDate() + " " + uploadTime.getHours() + ":" + uploadTime.getMinutes() + ":" + uploadTime.getSeconds() + "." + uploadTime.getMilliseconds();
            bFirst = false;
            var result = "";
            if (!bUpload) {
              bUpload = true;
              //result = comprePro(strProjectName, "")//压缩工程文件，输入参数为工程名和版本描述，版本描述在自动上传时为空
              console.log("上传,时间：" + strUptime);
              //result = upLoadProjectFileZip(strProjectName, "")//上传工程文件，输入参数是工程名称和工作区名称，工作区名称当前还无法获取
              //result = "OK";
            } else {
              console.log("无需上传,时间：" + strUptime);
              result = "No need";
              //return;
            }
            gws.send(result);
          }, 5 * 60 * 1000);
        }
      });
    }
    LogManagerObj.traceLog(projectManagerName, "Leave post uploadRegulary");
  }
}

//创建工作区
router.post('/createWorkSpace', function (req, res) {
  restfulInter.ProcessAsy('post', '/models/workspace', {
    "workSpace": {
      "meta": {
        "name": "project01",
        "description": "",
        "id": 0
      },
      "changeInfo": {
        "creatorName": "admin",
        "createTime": "2020-06-30T03:12:01.792Z",
        "modifierName": "",
        "modifyTime": "2020-06-30T03:12:01.792Z"
      },
      "companyInfo": "",
      "auditOperation": 0
    }
  }, function (data) {
    console.log(data)
    res.send(data)
  });
  LogManagerObj.traceLog(projectManagerName, "Leave post createWorkSpace ");
})

//获取当前工作区名称
router.post('/getWorkSpace', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getWorkSpace");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  restfulInter.ProcessAsy('get', '/models/currentuserworkspaces', {}, function (data) {
    res.send(JSON.parse(data));
  })
})


//4.0查询 模型成员
router.post('/queryModelMember', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post queryModelMember");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  restfulInter.ProcessAsy('get', '/models/modelmembers', {
    'workSpaceName': req.query.areaName,
    'modelName': req.query.modelName,
    'memberNames': ['KIOResource']
  }, function (data) {
    console.log('查询模型成员=', data);
    res.send(data);
  });
  LogManagerObj.traceLog(projectManagerName, "Leave post queryModelMember");
})

//4.0从资源库 下载工程文件zip  获取资源对象，自动保存到本地？
router.post('/downLoadProjectFile', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post downLoadProjectFile");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var reObjName = 'KIO_' + req.query.ProjectName
  restfulInter.ProcessAsy('get', '/models/workspaceresourceobjects', {
    'containerName': req.query.areaName,
    'resourceObjectNames': [reObjName]
  }, function (data) {
    console.log('查询资源对象=', data);
    var resObj = JSON.parse(data);
    if (resObj.data.resourceObjectList.length > 0 && resObj.data.resourceObjectList[0].size > 0) { //如果资源对象中的资源文件 大于0，把现有的删除，下载新的覆盖，如果等于0，不做处理
      var path = pubInter.joinPath(req.query.modelName);
      if (fs.existsSync(path)) {
        pubInter.delFileAndDir(path);
      } //删除本地服务中的工程文件夹
      path += ".zip";
      if (fs.existsSync(path)) {
        pubInter.delFileAndDir(path);
      } //删除本地服务中的工程文件zip
      //打开资源对象数据流
      openResourceObjectData(req.query.areaName, resObj, res);
    } else {
      console.log('空资源：' + data);
      resObj.errcode = 1;
      /* res.msg = '空资源：' + data; */
      resObj.msg = '空资源';
      res.send(resObj);
    }
    // openResourceObjectData( req.query.areaName, resObj ,res);
  });
  LogManagerObj.traceLog(projectManagerName, "Leave post downLoadProjectFile");
})

function openResourceObjectData(areaName, resObj, res) { //打开资源对象数据流
  restfulInter.ProcessAsy('post', '/models/workspaceresourceobjectdatastream', {
    'containerName': areaName,
    'objectName': resObj.data.resourceObjectList[0].meta.name,
    'option': '0'
  }, function (data) {
    console.log('打开资源对象数据流=', data);
    if (JSON.parse(data).errcode == 0) {
      //读取资源对象数据流
      readResourceObjectData(areaName, data, res);
    }
  });
}

function readResourceObjectData(areaName, resData, res) { //读取资源对象数据流
  restfulInter.ProcessAsy('get', '/models/workspaceresourceobjectdatastream', {
    'containerName': areaName,
    'streamHandle ': resData.data.streamHandle,
    'resourceDataPos ': 0,
    'readSize ': resData.data.resourceDataSize
  }, function (data) {
    //关闭资源对象数据流
    if (JSON.parse(data).errcode == 0) {
      console.log('读取资源对象数据流=', data);
      coloseResourceObjectData(areaName, resData.data.streamHandle, res);
      // coloseResourceObjectData( areaName, 1, res);
    }
  });
}

function coloseResourceObjectData(areaName, streamHandle, res) { //关闭资源对象数据流
  restfulInter.ProcessAsy('delete', '/models/workspaceresourceobjectdatastream', {
    'containerName': areaName,
    'streamHandle ': streamHandle
  }, function (data) {
    console.log('关闭资源对象数据流=', data);
    res.send(data);
  });
}

//4.0解压zip工程文件
router.post('/unzipProjectFiles', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post unzipProjectFiles");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var proPath = pubInter.joinPath(req.query.projectName) + ".zip";
  let readStream = fs.createReadStream(proPath);
  let writeStream = unzip.Extract({
    path: '../sdb/' + req.query.projectName + "/"
  });
  readStream.pipe(writeStream);
  writeStream.on('close', () => {
    var resCode = {
      'errcode': 0
    };
    res.send(resCode);
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post unzipProjectFiles");
})

//4.0若资源库中无，新创建工程文件
router.post('/creatProjectFiles', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post creatProjectFiles");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var projectName = req.query.projectName;
  var proPath = pubInter.joinPath('', '', projectName);
  var resCode = {
    'errcode': 0,
    'msg': "创建成功"
  };
  if (!fs.existsSync(proPath)) {
    //新创建文件
    if (pubInter.recursiveMakeDir(proPath)) {
      var copyFileName = [];
      pubInter.proFileCopy(global.demoPath, proPath, copyFileName);
    } else {
      resCode.errcode = 2;
      resCode.msg = "创建新工程文件失败";
      res.send(resCode);
      return;
    }
  }

  res.send(resCode);
  LogManagerObj.traceLog(projectManagerName, "Leave post creatProjectFiles");
})

//4.0在工作区 创建资源对象
router.post('/creatResourceObject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post creatResourceObject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var lastModifyTime = new Date();
  var strNowTime = lastModifyTime.getFullYear() + "-" + (lastModifyTime.getMonth() + 1) + "-" + lastModifyTime.getDate() + " " + lastModifyTime.getHours() + ":" + lastModifyTime.getMinutes() + ":" + lastModifyTime.getSeconds() + "." + lastModifyTime.getMilliseconds();
  restfulInter.ProcessAsy('post', '/models/workspaceresourceobjects', {
    'containerName': req.query.areaName,
    'resourceObjectList': [{
      'meta': {
        'name': 'KIO_' + req.query.ProjectName,
        'descriptipon': 'the projectFileInfo of KingIOServer',
        'id': 0
      },
      "changeInfo": {
        "creatorName": "",
        "createTime": strNowTime,
        "modifierName": "",
        "modifyTime": strNowTime
      },
      "namespaceName": "",
      "type": "0",
      "format": "",
      "devRoleNameList": [
        ""
      ],
      "size": 0,
      "md5": "",
      "smallObjectData": "",
      "status": "0",
      "dataStorgeBucket": ""
    }]
  }, function (data) {
    console.log(data)
    res.send(data);
  });
  LogManagerObj.traceLog(projectManagerName, "Leave post creatResourceObject");
})

//4.0给模型创建 资源成员,并关联 工程文件的资源对象名称
router.post('/creatModelMember', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post creatModelMember");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var memValue = 'KIO_' + req.query.ProjectName;
  restfulInter.ProcessAsy('post', '/models/modelmembers', {
    "workSpaceName": req.query.areaName,
    "modelName": req.query.modelName,
    "members": [{
      "name": "KIOResource",
      "description": "the resourceObj name about KIO projectFile",
      "id": 0,
      "dataType": "0",
      "unit": "0x00",
      "value": {
        memValue
      },
      "maxValue": {},
      "minValue": {}
    }]
  }, function (data) {
    res.send(data);
  });
  LogManagerObj.traceLog(projectManagerName, "Leave post creatModelMember");
})

//4.0工程属性 初始化
router.post('/getProjectInfo', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getProjectInfo");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var propertyPath = global.propertyPath + '/ProjectPorpertyInfo.json';
  if (!fs.existsSync(propertyPath)) {
    return;
  }
  let objProJson = pubInter.readJson(propertyPath);
  if (objProJson.Error) {
    res.send(objProJson);
    return;
  }
  let pertyData = objProJson.data;
  //let pertyData = JSON.parse(fs.readFileSync(propertyPath,'utf-8'));

  var jsonPath = pubInter.joinPath('', '', req.query.ProjectName) + "/ProjectPorpertyInfo.json";
  if (!fs.existsSync(jsonPath)) {
    return;
  }
  let objProInfo = pubInter.readJson(jsonPath);
  if (objProInfo.Error) {
    res.send(objProInfo);
    return;
  }
  let projectInfo = objProInfo.data;
  //let projectInfo = fs.readFileSync(jsonPath,'utf-8');

  if (projectInfo == "") {
    let prodata = new Array();
    let proPropertyList = pertyData.rows;
    let proList = new Array();
    for (var i = 0; i < proPropertyList.length; i++) {
      var tempList = new Object();
      tempList.field = proPropertyList[i].field;
      tempList.name = proPropertyList[i].name;
      tempList.group = proPropertyList[i].group;
      tempList.types = proPropertyList[i].types;
      tempList.editor = proPropertyList[i].editor;
      if (proPropertyList[i].types == 'Number') {
        tempList.value = parseInt(proPropertyList[i].value);
      } else {
        tempList.value = proPropertyList[i].value;
      }
      if (tempList.field == "ProjectID") {
        tempList.value = pubInter.getUUID();
      }
      if (tempList.field == "ProjectName") {
        tempList.value = req.query.ProjectName;
      }
      if (tempList.field == "CreateTime") {
        tempList.value = pubInter.getCurrentTime();
      }
      if (tempList.field == "ConfigFilePath") {
        var strDataPath = path.resolve(__dirname, "../" + global.sdbPath + "/" + req.query.ProjectName);
        tempList.value = strDataPath;
      }
      if (tempList.field == "FullFileName" || tempList.field == "BasePath") {
        tempList.value = path.resolve(__dirname, "../index.js");
      }
      if (tempList.field == "SysPlatform") {
        if (os.type == 'Windows_NT') {
          tempList.value = 'Windows';
        } else {
          tempList.value = 'Linux';
        }
      }
      prodata.push(tempList);
    }
    writeProInfoToJSON(prodata, jsonPath);
    res.send(prodata);
  } else {
    var proData = JSON.parse(projectInfo);
    for (var m = 0; m < pertyData.rows.length; m++) {
      pertyData.rows[m].value = proData[pertyData.rows[m].field];
    }
    res.send(pertyData);
  }
  LogManagerObj.traceLog(projectManagerName, "Leave post getProjectInfo");
})

function writeProInfoToJSON(prodata, jsonPath) {
  LogManagerObj.traceLog(projectManagerName, "Enter post writeProInfoToJSON");
  var lastJSON = {};
  for (var i = 0; i < prodata.length; i++) {
    var index = prodata[i].field;
    lastJSON[index] = prodata[i].value;
  }
  lastJSON.SetdataAuthority = [{
    "AuthorityUserName": "admin",
    "AuthorityUserID": 1
  }];
  //fs.writeFileSync(jsonPath, JSON.stringify(lastJSON, '', "\t"));
  pubInter.writeJson(jsonPath, lastJSON);
  LogManagerObj.traceLog(projectManagerName, "Leave post writeProInfoToJSON");
}

//4.0工程属性 修改
router.post('/editProjectInfo', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post editProjectInfo");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let changeField = req.query.changeField;
  let changeValue = req.query.changeValue;
  let rowData = req.body;

  var proPath = pubInter.joinPath(req.query.ProjectID, req.query.ProjectEdition, req.query.ProjectName);
  let projectInfo;
  var projectPath = proPath + '/ProjectPorpertyInfo.json';
  let proStrJson = pubInter.readJson(projectPath);
  if (proStrJson.Error == false) {
    projectInfo = proStrJson.data;
  } else {
    console.log(proStrJson.ErrorDesc);
    res.send(proStrJson.ErrorDesc);
    return;
  }
  if (rowData.types == "Number") {
    projectInfo[changeField] = parseInt(changeValue);
  } else {
    projectInfo[changeField] = changeValue;
  }
  projectInfo.Modifier = req.query.userName;
  projectInfo.ModifyTime = pubInter.getCurrentTime();
  //fs.writeFileSync(projectPath, JSON.stringify(projectInfo, '', "\t"));
  res.send(pubInter.writeJson(projectPath, projectInfo));
  LogManagerObj.traceLog(projectManagerName, "Leave post editProjectInfo");
})

//4.0工程压缩上传
router.post('/setPathForResourceObject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post setPathForResourceObject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var strDataPath = path.resolve(__dirname, global.sdbPath);
  var proPath = global.sdbPath + "/" + req.query.ProjectName;
  zipper.sync.zip(proPath).compress().save(proPath + ".zip");
  strDataPath += "/" + req.query.ProjectName + ".zip";
  restfulInter.ProcessAsy('post', '/models/workspaceresourceobjectdatauploadpath', {
    'containerName': req.query.areaName,
    'objectName': 'KIO_' + req.query.ProjectName,
    'uploadDataPath': strDataPath
  }, function (data) {
    res.send(data);
  });

  LogManagerObj.traceLog(projectManagerName, "Leave post setPathForResourceObject");
})

//工程写权限校验
router.post('/proWriteCheck', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter proWriteCheck");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let proData = req.body;
  let objCharacter = pubInter.readJson(global.sdbPath + "/CharacterInfo.json");
  if (objCharacter.Error) {
    res.send(objCharacter.ErrorDesc);
    return;
  }
  let fileObj = objCharacter.data;
  //let fileObj = JSON.parse(fs.readFileSync(global.sdbPath+"/CharacterInfo.json", 'utf-8'));
  var paramterLogStr = "checkProjectWritable parameter1:" + proData.ProjectID + " parameter2:" + proData.ProjectVersion + " parameter3:" + req.query.userInfo;
  LogManagerObj.traceLog(projectManagerName, paramterLogStr);
  var deleFlag = publicInten.checkProjectWritable(proData.ProjectID, proData.ProjectVersion, req.query.userInfo, fileObj);
  res.send(deleFlag);
  LogManagerObj.traceLog(projectManagerName, "Leave proWriteCheck");
})

//加载工程属性，赋初值 工程新建
router.post('/getProjectProperty', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter getProjectProperty");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let strJson = fs.readFile(global.propertyPath + '/proProperty.json', 'utf-8', function (err, data) {
    if (err) {
      LogManagerObj.errorLog(projectManagerName, "getProjectProperty,readFile error");
      console.log("Load proProperty Failed.");
      console.error(err);
      return;
    }
    /* if (req.query.ProjectGroupName != "工程管理") {
      let objCharacter = pubInter.readJson(global.sdbPath + "/CharacterInfo.json");
      if (objCharacter.Error) {
        res.send(objCharacter.ErrorDesc);
        return;
      }
      let fileObj = objCharacter.data;
      //let fileObj = JSON.parse(fs.readFileSync(global.sdbPath + "/CharacterInfo.json", 'utf-8'));
      var deleFlag = publicInten.checkProjectGroupWritable(req.query.ProjectGroupID, req.query.userInfo, fileObj);
      if (deleFlag == false) {
        res.send('没有权限');
        return;
      }
    } */
    let prodata = new Array();
    var timestr = "project01";
    let proPropertyList = JSON.parse(data).rows;
    let proList = new Array();
    for (var i = 0; i < proPropertyList.length; i++) {
      var tempList = new Object();
      tempList.field = proPropertyList[i].field;
      tempList.name = proPropertyList[i].name;
      tempList.group = proPropertyList[i].group;
      tempList.editor = proPropertyList[i].editor;
      tempList.value = proPropertyList[i].value;
      if (tempList.field == "ProjectID") {
        tempList.value = pubInter.getUUID();
      }
      if (tempList.field == "ProjectName") {
        tempList.value = timestr;
      }
      if (tempList.field == "ProjectVersion") {
        tempList.value = "1.0.0.1";
      }
      if (tempList.field == "ProjectTypeVersion") {
        tempList.value = "1.0.0.1";
      }
      if (tempList.field == "CreateTime") {
        tempList.value = pubInter.getCurrentTime();;
      }
      if (tempList.field == "SysPlatform") {
        if (os.type == "Windows_NT") {
          tempList.value = "X86";
        } else {
          var arch = os.arch();
          var archlow = arch.toLowerCase();
          if (archlow.indexOf("x64") != -1 || archlow.indexOf("x86") != -1 || archlow.indexOf("ia32") != -1 || archlow.indexOf("amd64") != -1) {
            tempList.value = "X86";
          } else if (archlow.indexOf("arm") != -1) {
            tempList.value = "Arm";
          } else if (archlow.indexOf("mips") != -1) {
            tempList.value = "Mips";
          } else {
            res.send('不支持当前系统');
            return;
          }
        }
      }
      prodata.push(tempList);
    }
    res.send(prodata);
  })
  LogManagerObj.traceLog(projectManagerName, "Leave getProjectProperty");
})

//新建工程 提交
router.post('/addNewProject', async function (req, res) {
  try {
    LogManagerObj.traceLog(projectManagerName, "Enter addNewProject");
    LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
    LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
    let groupData = req.body; //工程属性
    const tenantId = req.headers.tenant_id;
    const tenantDir = tenantManager.getProjectGroupService(tenantId).dataStore.tenantDir;
    let projectService = tenantManager.getProjectGroupService(tenantId).projectService;
    let projectGroupService = tenantManager.getProjectGroupService(tenantId);
    let projectData = await projectService.createProject(req.body.newData)
    let groupInfo = await projectGroupService.getProjectGroupById(projectData.projectGroupId)
    let proGroup = xss(groupInfo.name); //工程组名称
    let newProData = groupData.body;
    // var proID = global.sdbPath + "/";
    // var proVer;
    var groupObj = new Object();
    var proObj = new Object();
    for (var k = 0; k < newProData.length; k++) {
      if (newProData[k].field == "ProjectID") {
        groupObj.ProjectID = newProData[k].value;
        proObj.ProjectID = newProData[k].value;
      }
      if (newProData[k].field == "ProjectName") {
        groupObj.ProjectName = newProData[k].value;
        proObj.ProjectName = newProData[k].value;
      }
      if (newProData[k].field == "Description") {
        groupObj.Description = newProData[k].value;
        proObj.Description = newProData[k].value;
      }
      if (newProData[k].field == "ProjectVersion") {
        groupObj.ProjectVersion = newProData[k].value;
        proObj.ProjectVersion = newProData[k].value;
      }
      if (newProData[k].field == "ProjectTypeVersion") {
        groupObj.ProjectTypeVersion = newProData[k].value;
        proObj.ProjectTypeVersion = newProData[k].value;
      }
      if (newProData[k].field == "Modifier") {
        groupObj.Modifier = newProData[k].value;
        proObj.Modifier = newProData[k].value;
      }
      if (newProData[k].field == "ModifyTime") {
        groupObj.ModifyTime = newProData[k].value;
        proObj.ModifyTime = newProData[k].value;
      }
      // if (newProData[k].field == "PlatformType") {
      //   groupObj.PlatformType = newProData[k].value;
      //   proObj.PlatformType = newProData[k].value;
      // }
      if (newProData[k].field == "OsType") {
        groupObj.OsType = newProData[k].value;
        proObj.OsType = newProData[k].value;
      }
      if (newProData[k].field == "SysPlatform") {
        groupObj.SysPlatform = newProData[k].value;
        proObj.SysPlatform = newProData[k].value;
      }
      if (newProData[k].field == "Creator") {
        var userName = "";
        try {
          userName = JSON.parse(groupData.userInfo).userName;
        } catch (e) {
          console.log("create project, get userName error:" + e);
        }
        groupObj.Creator = userName;
        proObj.Creator = userName;
      }
      if (newProData[k].field == "CreateTime") {
        groupObj.CreateTime = newProData[k].value;
        proObj.CreateTime = newProData[k].value;
      }
      if (newProData[k].field == "StorEnable") {
        groupObj.StorEnable = 1;
        proObj.StorEnable = 1;
      }
      if (newProData[k].field == "ListenPort") {
        groupObj.ListenPort = parseInt(newProData[k].value);
        proObj.ListenPort = parseInt(newProData[k].value);
      }
    }
    groupObj.AutoEnable = 1;
    groupObj.TransMode = 0;
    groupObj.TransInterval = 1000;
    groupObj.HistoryDataMode = 0;
    groupObj.HistoryDataCacheNumber = 1024;
    groupObj.HistoryDataCacheTime = 24;
    groupObj.FileCacheMode = 0;
    groupObj.CacheFileSize = 1024;
    groupObj.CacheFilePeriod = 24;
    groupObj.UserName = "";
    groupObj.Password = "";
    groupObj.ProjectID = projectData.guid;
    proObj.ProjectID = projectData.guid;
    groupObj.ProjectName = projectData.name;
    proObj.ProjectName = projectData.name;
    groupObj.Creator = projectData.createByName;
    proObj.Creator = projectData.createByName;
    groupObj.Description = projectData.description;
    proObj.Description = projectData.description;
    groupObj.SetdataUsers = []
    proObj.SetdataUsers = []
    // proID += groupObj.ProjectID;
    // proVer = groupObj.ProjectVersion;

    // proVer = proID + "/" + proVer + "/project";
    // var proVer = pubInter.joinPath(groupObj.ProjectID, groupObj.ProjectVersion, groupObj.ProjectName);
    // let proVer = path.join(tenantDir,groupObj.ProjectID,groupObj.ProjectName)
    let proVer = path.join(tenantDir, groupObj.ProjectID, 'project')
    // pubInter.recursiveMakeDir(proVer);
    fs.mkdirSync(proVer)
    //工程文件拷贝
    proFileCopy(global.demoPath, proVer);
    //写入到文件
    let projectPorpertyInfoPath = proVer + "/ProjectPorpertyInfo.json";
    fs.writeFile(projectPorpertyInfoPath, JSON.stringify(groupObj, '', "\t"), function (err) {
      if (err) {
        res.send(err.message);
        LogManagerObj.errorLog(projectManagerName, err.message)
        return console.error(err);
      } else {
        // 写interalconfig文件
        let strInteralPath = path.join(proVer, "interalconfig.json");
        let objReadJson = pubInter.readJson(strInteralPath);
        if (objReadJson.Error) {
          res.send(objReadJson.ErrorDesc);
          return;
        }
        if (groupObj.OsType == "Windows") {
          objReadJson.data.osPlatform.push("win32");
        } else {
          objReadJson.data.osPlatform.push("linux");
        }
        objReadJson.data.osArch = os.arch();
        let strResWrite = pubInter.writeJson(strInteralPath, objReadJson.data);
        if (strResWrite != "OK") {
          res.send(strResWrite);
          LogManagerObj.errorLog(projectManagerName, strResWrite)
          return;
        }
        return res.send("OK")
      }
    });
  } catch (error) {
    res.send(error.message);
  }
})
//工程文件拷贝
function proFileCopy(sourPath, desPaht) {
  LogManagerObj.traceLog(projectManagerName, "Enter function proFileCopy");
  var dirs = fs.readdirSync(sourPath);
  dirs.forEach(function (item) {
    var item_path = path.join(sourPath, item);
    var temp = fs.statSync(item_path);
    if (temp.isDirectory() == false) {
      var filePaht = desPaht + "/" + item;
      fs.copyFileSync(item_path, filePaht);
    } else {
      var foludPath = desPaht + "/" + item;
      if (!fs.existsSync(foludPath)) {
        fs.mkdirSync(foludPath);
      }
      proFileCopy(sourPath + "/" + item, foludPath);
    }
  });
  LogManagerObj.traceLog(projectManagerName, "Leave function proFileCopy");
}
//遍历工程组JSON文件，找到工程组,添加工程  groupJSON:工程组json文件  selectTreeText:工程组名  proObj:新增的工程
function traverseGroupJSONFindGroupName(groupJSON, selectTreeText, proObj) {
  LogManagerObj.traceLog(projectManagerName, "Enter function traverseGroupJSONFindGroupName");
  var flag = 0
  for (var i = 0; i < groupJSON.length; i++) {
    if (groupJSON[i].ProjectGroupName == undefined) {
      continue;
    }
    if (groupJSON[i].ProjectGroupName == selectTreeText) {
      if (groupJSON[i].ProjectObjectList == undefined) {
        groupJSON[i].ProjectObjectList = new Array();
      }
      proObj.GroupName = selectTreeText;
      groupJSON[i].ProjectObjectList.push(proObj);
      flag = 1;
      break;
    } else {
      if (groupJSON[i].ProjectID != undefined) {
        continue;
      }
      if (groupJSON[i].ProjectObjectList != undefined && groupJSON[i].ProjectObjectList.length > 0) {
        traverseGroupJSONFindGroupName(groupJSON[i].ProjectObjectList, selectTreeText, proObj);
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function traverseGroupJSONFindGroupName");
  return groupJSON;
}
//工程重名校验
function checkProjectName(proName) {
  LogManagerObj.traceLog(projectManagerName, "Enter function checkProjectName");
  var groupPath = global.sdbPath + "/ProjectGroupList.json";
  let proJSON = pubInter.readJson(groupPath);
  if (proJSON.Error) {
    console.log(proJSON.ErrorDesc);
    return true;
  }
  let proData = proJSON.data.ProjectGroupList;
  //let proJSON = fs.readFileSync(groupPath);
  //let proData = JSON.parse(proJSON).ProjectGroupList;
  for (var i = 0; i < proData.length; i++) {
    for (var index in proData[i]) {
      if (index == 'ProjectName') {
        if (proData[i][index] == proName) {
          LogManagerObj.traceLog(projectManagerName, "Leave function checkProjectName");
          return true; //重名
        }
      } else if (index == 'ProjectObjectList') {
        var childObj = proData[i][index];
        for (var j = 0; j < childObj.length; j++) {
          for (var chidIndex in childObj[j]) {
            if (chidIndex == 'ProjectName') {
              if (childObj[j][chidIndex] == proName) {
                LogManagerObj.traceLog(projectManagerName, "Leave function checkProjectName");
                return true; //重名
              }
            }
          }
        }
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function checkProjectName");
  return false;
}

//查询工程
router.post('/queryProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post queryProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var proGroupName = xss(req.query.ProjectGroupName);
  //var userInfo = pubInter.EscapeAllData(req.query.userInfo);
  var strRes = "";
  let strJson = fs.readFile(global.sdbPath + '/ProjectGroupList.json', 'utf-8', function (err, data) {
    if (err) {
      console.log("Load proGroupProperty Failed.");
      console.error(err);
      res.send({
        Error: true,
        ErrorDesc: err.message
      });
      return;
    }
    let groupList = JSON.parse(data).ProjectGroupList;
    let objCharJson = pubInter.readJson(global.sdbPath + "/CharacterInfo.json");
    if (objCharJson.Error) {
      res.send(objCharJson);
      return;
    }
    let fileObj = objCharJson.data;
    var proArray = new Array();
    if (proGroupName == "工程管理") {
      strRes = traverseGroupJSONToProject(groupList, proArray, fileObj);
    } else {
      var proArr = new Array();
      FindGroupName(groupList, proGroupName, proArr);
      if (proArr.length > 0) {
        strRes = traverseGroupJSONToProject(proArr[0], proArray, fileObj, req.query.proGroupID);
      } else {
        strRes = "OK";
      }
    }
    let objRes = {
      Error: false,
      ErrorDesc: strRes,
      total: proArray.length,
      rows: JSON.parse(JSON.stringify(proArray))
    }
    if (strRes != "OK") {
      objRes.Error = true;
    }
    res.send(objRes);
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post queryProject");
})

function traverseGroupJSONToProject(JsonList, reaArry, fileObj, groupID) {
  LogManagerObj.traceLog(projectManagerName, "Enter function traverseGroupJSONToProject");
  var strRes = "OK";
  for (var i = 0; i < JsonList.length; i++) {
    if (JsonList[i].ProjectName == undefined) {
      if ((JsonList[i].ProjectObjectList) && (JsonList[i].ProjectObjectList.length > 0)) {
        strRes = traverseGroupJSONToProject(JsonList[i].ProjectObjectList, reaArry, fileObj, groupID);
      }
    } else {
      /* var rFlag = publicInten.checkProjectReadable(JsonList[i].ProjectID, JsonList[i].ProjectVersion, userInfo, fileObj);
      var wFlag = publicInten.checkProjectWritable(JsonList[i].ProjectID, JsonList[i].ProjectVersion, userInfo, fileObj); */
      var rFlag = true,
        wFlag = true;
      if (rFlag == true || wFlag == true) {
        // var tempath = global.sdbPath + "/" + JsonList[i].ProjectID + "/" + JsonList[i].ProjectVersion + "/project";
        var tempath = pubInter.joinPath(JsonList[i].ProjectID, JsonList[i].ProjectVersion, JsonList[i].ProjectName);
        var ppp = tempath + "/ProjectPorpertyInfo.json";
        let objReadJson = pubInter.readJson(ppp);
        if (objReadJson.Error) {
          strRes = objReadJson.ErrorDesc;
          continue;
        }
        var proData = objReadJson.data;
        if (proData.publicFlag == 1) {
          JsonList[i].ProState = "已发布 未更新";
          JsonList[i].publicTime = proData.publicTime;
        } else {
          JsonList[i].ProState = "未发布 未更新";
        }
        if (proData.publicFlag == 1 && proData.updateFlag == 1) {
          JsonList[i].ProState = "已发布 已更新";
        }
        JsonList[i].ProjectGroupID = groupID;
        /* for (let strProperty in JsonList[i]) {
          if (JsonList[i][strProperty] == "") {
            JsonList[i][strProperty] = "--";
          }
        } */
        reaArry.push(JsonList[i]);
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function traverseGroupJSONToProject");
  return strRes;
}

function FindGroupName(groupJSON, selectTreeText, proArr) {
  LogManagerObj.traceLog(projectManagerName, "Enter function FindGroupName");
  var flag = 0
  for (var i = 0; i < groupJSON.length; i++) {
    if (groupJSON[i].ProjectGroupName == undefined) {
      continue;
    }
    if (groupJSON[i].ProjectGroupName == selectTreeText) {
      if (groupJSON[i].ProjectObjectList != undefined && groupJSON[i].ProjectObjectList.length > 0) {
        proArr.push(groupJSON[i].ProjectObjectList);
      }
      flag = 1;
      break;
    } else {
      if (groupJSON[i].ProjectID != undefined) {
        continue;
      }
      if (groupJSON[i].ProjectObjectList != undefined && groupJSON[i].ProjectObjectList.length > 0) {
        FindGroupName(groupJSON[i].ProjectObjectList, selectTreeText, proArr);
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function FindGroupName");
  return groupJSON;
}

//搜索工程
router.post('/searchProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post searchProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var proGroupName = xss(req.query.ProjectGroupName);
  var userInfo = pubInter.EscapeAllData(req.query.userInfo);
  //var groupID = req.query.proGroupID;
  var searchValue = xss(req.query.searchValue);
  let strJson = fs.readFile(global.sdbPath + '/ProjectGroupList.json', 'utf-8', function (err, data) {
    if (err) {
      console.log("Load proGroupProperty Failed.");
      console.error(err);
      return;
    }
    let groupList = JSON.parse(data).ProjectGroupList;

    let objCharJson = pubInter.readJson(global.sdbPath + "/CharacterInfo.json");
    if (objCharJson.Error) {
      res.send(objCharJson);
      return;
    }
    let authJSON = objCharJson.data;

    var proArray = new Array();
    if (proGroupName == "工程管理") {
      findAccordProject(groupList, proArray, searchValue, userInfo, authJSON);
    } else {
      var proArr = new Array();
      FindGroupName(groupList, proGroupName, proArr);
      if (proArr.length > 0) {
        findAccordProject(proArr[0], proArray, searchValue, userInfo, authJSON);
      }
    }
    res.send(proArray);
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post searchProject");
})

function findAccordProject(gropuList, lastArry, searchValue, userInfo, fileObj) {
  LogManagerObj.traceLog(projectManagerName, "Enter function findAccordProject");
  for (var i = 0; i < gropuList.length; i++) {
    if (gropuList[i].ProjectName == undefined) {
      findAccordProject(gropuList[i].ProjectObjectList, lastArry, searchValue, userInfo, fileObj)
    } else {
      /* var rFlag = publicInten.checkProjectReadable(gropuList[i].ProjectID, gropuList[i].ProjectVersion, userInfo, fileObj);
      var wFlag = publicInten.checkProjectWritable(gropuList[i].ProjectID, gropuList[i].ProjectVersion, userInfo, fileObj); */
      var rFlag = true;
      var wFlag = true;
      if (rFlag == true || wFlag == true) {
        // add by xin.wang 0608
        var tempath = pubInter.joinPath(gropuList[i].ProjectID, gropuList[i].ProjectVersion, gropuList[i].ProjectName);
        var ppp = tempath + "/ProjectPorpertyInfo.json";
        let objProPerJson = pubInter.readJson(tempath + "/ProjectPorpertyInfo.json");
        if (objProPerJson.Error) {
          res.send(objProPerJson);
          return;
        }
        let proJson = pubInter.readJson(ppp);
        if (proJson.Error) {
          res.send(proJson);
          return;
        }
        var proData = proJson.data;
        //var proData = JSON.parse(fs.readFileSync(ppp));
        if (proData.publicFlag == 1) {
          gropuList[i].ProState = "已发布 未更新";
          gropuList[i].publicTime = proData.publicTime;
        } else {
          gropuList[i].ProState = "未发布 未更新";
        }
        if (proData.publicFlag == 1 && proData.updateFlag == 1) {
          gropuList[i].ProState = "已发布 已更新";
        }
        // add end
        /* if (gropuList[i].ProjectName.indexOf(searchValue) != -1 || gropuList[i].ProjectName.indexOf(searchValue) != -1
          || gropuList[i].Description.indexOf(searchValue) != -1 || gropuList[i].ProjectVersion.indexOf(searchValue) != -1
          || gropuList[i].ProjectTypeVersion.indexOf(searchValue) != -1 || gropuList[i].Modifier.indexOf(searchValue) != -1
          || gropuList[i].Creator.indexOf(searchValue) != -1 ||  (gropuList[i].ProState!=undefined && gropuList[i].ProState.indexOf(searchValue) != -1)) {

          lastArry.push(gropuList[i]);
        } */
        for (const key in gropuList[i]) {
          if (gropuList[i].hasOwnProperty(key)) {
            if (gropuList[i][key].indexOf(searchValue) != -1 || searchValue == "") {
              lastArry.push(gropuList[i]);
              break;
            }
          }
        }
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function findAccordProject");
  return gropuList;
}

//查询单个工程信息
router.post('/queryOneProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post queryOneProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var projectName = req.query.ProjectName;
  var sdbPath = pubInter.joinPath(req.query.proID, req.query.proVer, req.query.ProjectName);
  let strJson = fs.readFile(global.sdbPath + '/ProjectGroupList.json', 'utf-8', function (err, data) {
    if (err) {
      console.log("Load ProjectGroupList Failed.");
      console.error(err);
      res.send(err);
      return;
    }
    let proGroupList = JSON.parse(data);
    let newGroupList = proGroupList.ProjectGroupList;
    let strJson = fs.readFile(global.propertyPath + '/proProperty.json', 'utf-8', function (err, data) {
      if (err) {
        console.log("Load proProperty Failed.");
        console.error(err);
        res.send(err);
        return;
      }
      let groupPropertyList = JSON.parse(data).rows;
      let groupList = new Array();
      findProjectInfo(groupPropertyList, newGroupList, projectName, groupList);
      for (var i = 0; i < groupList.length; i++) {
        if (groupList[i].field == "SysPlatform" || groupList[i].field == "PlatformType") {
          groupList[i].editor = "";
        }
      } //add by xin.wang 2020-05-06
      let objDevJson = pubInter.readJson(sdbPath + "/DeviceGroupInfo.json");
      if (objDevJson.Error) {
        res.send(objDevJson);
        return;
      }
      let devData = objDevJson.data.DeviceGroupList;
      //let devData = JSON.parse(fs.readFileSync(sdbPath + "/DeviceGroupInfo.json")).DeviceGroupList;
      let devGroupNum = new Array();
      traDevVarJSON(devData, devGroupNum);
      let objVarJson = pubInter.readJson(sdbPath + "/VarGroupInfo.json");
      if (objVarJson.Error) {
        res.send(objVarJson);
        return;
      }
      let varData = objVarJson.data.TagGroupList;
      //let varData = JSON.parse(fs.readFileSync(sdbPath + "/VarGroupInfo.json")).TagGroupList;
      let varGroupNum = new Array();
      traDevVarJSON(varData, varGroupNum);

      objDevJson = pubInter.readJson(sdbPath + "/DeviceInfo.json");
      if (objDevJson.Error) {
        res.send(objDevJson);
        return;
      }
      var devNum = objDevJson.data.DeviceList.length;

      objVarJson = pubInter.readJson(sdbPath + "/VarInfo.json");
      if (objVarJson.Error) {
        res.send(objVarJson);
        return;
      }
      var varNum = objVarJson.data.TagList.length;
      /* var devNum = (JSON.parse(fs.readFileSync(sdbPath + "/DeviceInfo.json")).DeviceList).length;
      var varNum = (JSON.parse(fs.readFileSync(sdbPath + "/VarInfo.json")).TagList).length; */
      for (var g = 0; g < groupList.length; g++) {
        if (groupList[g].field == "DevGroupNUm") {
          groupList[g].value = devGroupNum.length;
        }
        if (groupList[g].field == "DevNum") {
          groupList[g].value = devNum;
        }
        if (groupList[g].field == "VarGroupNum") {
          groupList[g].value = varGroupNum.length;
        }
        if (groupList[g].field == "VarNum") {
          groupList[g].value = varNum;
        }
      }
      res.send(groupList);
    })
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post queryOneProject");
})

function findProjectInfo(propertyList, proGroupList, selectTreeText, groupList) {
  LogManagerObj.traceLog(projectManagerName, "Enter function findProjectInfo");
  for (var i = 0; i < proGroupList.length; i++) {
    if (proGroupList[i].ProjectGroupName == undefined) {
      if (proGroupList[i].ProjectName == selectTreeText) {
        for (var k = 0; k < propertyList.length; k++) {
          var tempList = new Object();
          tempList.field = propertyList[k].field;
          tempList.name = propertyList[k].name;
          tempList.group = propertyList[k].group;
          tempList.editor = propertyList[k].editor;
          tempList.value = propertyList[k].value;
          if (tempList.field == "ProjectID") {
            tempList.value = proGroupList[i].ProjectID;
          }
          if (tempList.field == "ProjectName") {
            tempList.value = proGroupList[i].ProjectName;
          }
          if (tempList.field == "Description") {
            tempList.value = proGroupList[i].Description;
          }
          if (tempList.field == "ProjectVersion") {
            tempList.value = proGroupList[i].ProjectVersion;
          }
          if (tempList.field == "ProjectTypeVersion") {
            tempList.value = proGroupList[i].ProjectTypeVersion;
          }
          if (tempList.field == "Modifier") {
            tempList.value = proGroupList[i].Modifier;
          }
          if (tempList.field == "ModifyTime") {
            tempList.value = proGroupList[i].ModifyTime;
          }
          if (tempList.field == "Creator") {
            tempList.value = proGroupList[i].Creator;
          }
          if (tempList.field == "CreateTime") {
            tempList.value = proGroupList[i].CreateTime;
          }
          if (tempList.field == "SysPlatform") {
            tempList.value = proGroupList[i].SysPlatform;
          }
          // if (tempList.field == "PlatformType") {
          //   tempList.value = proGroupList[i].PlatformType;
          // }
          if (tempList.field == "OsType") {
            tempList.value = proGroupList[i].OsType;
          }
          if (tempList.field == "StorEnable") {
            if (proGroupList[i].StorEnable == 1) {
              tempList.value = "否";
            } else {
              tempList.value = "是";
            }

          }
          if (tempList.field == "ListenPort") {
            tempList.value = proGroupList[i].ListenPort;
          }
          groupList.push(tempList);
        }
        break;
      }
    } else {
      if (proGroupList[i].ProjectObjectList != undefined && proGroupList[i].ProjectObjectList.length > 0) {
        findProjectInfo(propertyList, proGroupList[i].ProjectObjectList, selectTreeText, groupList);
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function findProjectInfo");
  return proGroupList;
}

function traDevVarJSON(data, devGroupNum) {
  LogManagerObj.traceLog(projectManagerName, "Enter function traDevVarJSON");
  for (var i = 0; i < data.length; i++) {
    for (var index in data[i]) {
      if (index == "DeviceGroupID" || index == "TagGroupID") {
        devGroupNum.push(1);
      } else if (index == "DeviceObjectList") {
        traDevVarJSON(data[i].DeviceObjectList, devGroupNum);
      } else if (index == "TagObjectList") {
        traDevVarJSON(data[i].TagObjectList, devGroupNum);
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function traDevVarJSON");
  return data;
}

//删除工程
router.post('/deletProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post deletProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var projetArrName = new Array();
  if (typeof (req.body.array) == "string") {
    req.body.array = JSON.parse(req.body.array);
  }
  projetArrName = pubInter.EscapeAllData(req.body.array);
  var objUserInfo = JSON.parse(xss(req.body.userInfo));
  let strJson = fs.readFile(global.sdbPath + '/ProjectGroupList.json', 'utf-8', function (err, data) {
    if (err) {
      console.log("Load ProjectGroupList Failed.");
      console.error(err);
      return;
    }
    let proGroupList = JSON.parse(data).ProjectGroupList;
    let proData = new Object();
    var delePro = [];
    for (var i = 0; i < projetArrName.length; i++) {
      findProToDeleFromJson(proGroupList, projetArrName[i], proData, delePro);
    }
    let lastJson = new Object();
    lastJson.ProjectGroupList = proGroupList;
    //LogManagerObj.debugLog(projectManagerName, "proGroupList=" + JSON.stringify(proGroupList, "", "\t"))
    //LogManagerObj.debugLog(projectManagerName, "proGroupList.length=" + proGroupList.length);
    //写入到文件
    fs.writeFile(global.sdbPath + '/ProjectGroupList.json', JSON.stringify(lastJson, '', "\t"), function (err) {
      if (err) {
        res.send(err);
        return console.error(err);
      }
      LogManagerObj.debugLog(projectManagerName, "在ProjectGroupList.json中写入成功");
      //删除权限文件的工程名称
      /* let objReadJson = pubInter.readJson(global.sdbPath + "/CharacterInfo.json");
      if (objReadJson.Error) {
        res.send(objReadJson.ErrorDesc);
        return;
      }   */
      //let fileObj = JSON.parse(fs.readFileSync(global.sdbPath + "/CharacterInfo.json", 'utf-8'));
      /* let fileObj = objReadJson.data;
      publicInten.deleteCharacterProjectForDeleteProject( fileObj, delePro);
      fs.writeFileSync(global.sdbPath + "/CharacterInfo.json", JSON.stringify(fileObj, "", "\t")); */
      //LogManagerObj.debugLog(projectManagerName, "在CharacterInfo.json中写入成功");
      //删除权限文件中的工程
      let strPerJsonPath = global.sdbPath + "/permissConfig.json";
      let objResRead = pubInter.readJson(strPerJsonPath);

      //先在文件中删除，再删除文件
      for (let j = 0; j < projetArrName.length; j++) {
        let objOneProject = {
          "ProjectID": projetArrName[j].ProjectID,
          "ProjectVersion": projetArrName[j].ProjectVersion
        }
        LogManagerObj.debugLog(projectManagerName, "删除工程文件：" + projetArrName[j].ProjectID + "/" + projetArrName[j].ProjectVersion);
        let strDelRes = findProDeleFile(objOneProject);
        if (strDelRes != "OK") {
          res.send(strDelRes);
          return;
        }
        if (!objResRead.Error) {
          let nFind = -1;
          let objFindInPer = objResRead.data.permissList.find(function (project, index) {
            nFind = index;
            return project.projectId == objOneProject.ProjectID;
          })
          if (objFindInPer != undefined) {
            objResRead.data.permissList.splice(nFind, 1);
          }
        }
        //在运维中心里删除该工程(KF3.6) //20231221 解除屏蔽，删除开发态工程同时删除运维中心 /*
        var objFindProject = {};
        // proPublishConnect.getAllProjects(0, opsCenterFileHost, objUserInfo.oauth.access_token)//先查找该工程是否在已发布的工程中
        proPublishConnect.getAllProjects(0, opsCenterFileHost, undefined)
          .then((flag) => {
            LogManagerObj.debugLog(projectManagerName, "deletProject--> getAllProjects return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
            //console.log("运维中心 查询flag=", flag);
            if (flag.code == 0) {
              for (var h = 0; h < flag.data.length; h++) {
                for (var g = 0; g < flag.data[h].projectList.length; g++) {
                  let objTmpProjectInfo = flag.data[h].projectList[g];
                  if (objTmpProjectInfo.projectId == objOneProject.ProjectID && objTmpProjectInfo.projectVersion == objOneProject.ProjectVersion && objTmpProjectInfo.projectType == 5) {
                    objFindProject = JSON.parse(JSON.stringify(objTmpProjectInfo));
                    break;
                  }
                }
              }

              //在发布工程中删除该工程
              if (JSON.stringify(objFindProject) != "{}") {
                //objFindProject.solutionId = objUserInfo
                // proPublishConnect.deleteProject(0, opsCenterFileHost, objUserInfo.oauth.access_token, objFindProject)
                proPublishConnect.deleteProject(0, opsCenterFileHost, undefined, objFindProject)
                  .then((flag) => {
                    LogManagerObj.debugLog(projectManagerName, "deletProject--> deleteProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
                    console.log("实例 删除flag=", flag);
                    if (flag.code != 0) {
                      res.send(flag.message);
                      return;
                    }
                  })
                  .catch( // 记录失败原因
                    (reason) => {
                      LogManagerObj.errorLog(projectManagerName, "deletProject--> deleteProjects return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
                      res.send('err_' + reason);
                      return;
                    });
              }
            }
          })
          .catch( // 记录失败原因
            (reason) => {
              LogManagerObj.errorLog(projectManagerName, "deletProject--> getAllProjects return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
              res.send('err_' + reason);
              return;
            }); //*/
      }
      /*  if (global.productType == PRODUCTKF36) {
         deleteProInOps(projetArrName);
       } */
      if (objResRead.data) {
        res.send(pubInter.writeJson(strPerJsonPath, objResRead.data));
      } else {
        res.send("OK");
      }
    });
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post deletProject");
})

function findProToDeleFromJson(groupJSON, proName, proArr, delePro) {
  LogManagerObj.traceLog(projectManagerName, "Enter function findProToDeleFromJson");
  for (var i = 0; i < groupJSON.length; i++) {
    if (groupJSON[i].ProjectName == undefined) {
      if (groupJSON[i].ProjectObjectList != undefined && groupJSON[i].ProjectObjectList.length > 0) {
        findProToDeleFromJson(groupJSON[i].ProjectObjectList, proName, proArr, delePro);
      }
    } else if (groupJSON[i].ProjectName == proName.ProjectName || groupJSON[i].ProjectID == proName.ProjectID) {
      proArr.ProjectID = groupJSON[i].ProjectID;
      proArr.ProjectVersion = groupJSON[i].ProjectVersion;
      delePro.push(proArr);
      groupJSON.splice(i, 1);
      i--;
      // break;
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function findProToDeleFromJson");
  return groupJSON;
}

function findProDeleFile(proData) {
  LogManagerObj.traceLog(projectManagerName, "Enter function findProDeleFile");
  var path = global.sdbPath + "/" + proData.ProjectID;
  if (fs.existsSync(path)) { //判断文件夹是否存在
    path = global.sdbPath + "/" + proData.ProjectID + "/" + proData.ProjectVersion;
    if (fs.existsSync(path)) {
      let strResDel = deleteFolderRecursive(path);
      if (strResDel != "OK") {
        return strResDel;
      }
    }
  } else {
    return path + "不存在";
  }
  path = global.sdbPath + "/" + proData.ProjectID;
  let strResDel = deleteFolderRecursive(path);
  if (strResDel != "OK") {
    return strResDel;
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function findProDeleFile");
  return "OK";
}

function deleteFolderRecursive(path) {
  LogManagerObj.traceLog(projectManagerName, "Enter function deleteFolderRecursive");
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file) {
      var curPath = path + "/" + file;
      try {
        var bDirectory = fs.statSync(curPath).isDirectory()
      } catch (error) {
        LogManagerObj.debugLog(projectManagerName, error.message);
        return error.message;
      }
      if (bDirectory == true) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        try {
          fs.unlinkSync(curPath);
        } catch (error) {
          LogManagerObj.debugLog(projectManagerName, error.message);
          return error.message;
        }
      }
    });

    try {
      fs.rmdirSync(path);
    } catch (error) {
      LogManagerObj.debugLog(projectManagerName, error.message);
      return error.message;
    }
  } else {
    return path + "不存在";
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function deleteFolderRecursive");
  return "OK";
};

//在运维中心里删除该工程(KF3.6)
function deleteProInOps(arrDelProject) {
  let resOpscenter = pubInter.readJson("../../kingfileserver/exe/data/project_manage.json");
  if (!resOpscenter.Error) {
    let objProManage = resOpscenter.data;
    let nFindInd = -1;
    if (objProManage.projectHome != undefined && objProManage.projectHome.projects != undefined) {
      for (let i = 0; i < arrDelProject.length; i++) {
        let objFind = objProManage.projectHome.projects.find(function (project, index) {
          nFindInd = index;
          return project.projectId == arrDelProject[i].ProjectID && project.projectName == arrDelProject[i].ProjectName;
        })
        if (objFind != undefined) {
          objProManage.projectHome.projects.splice(nFindInd, 1);
        }
      }
      pubInter.writeJson("../../kingfileserver/exe/data/project_manage.json", objProManage);
    }
  }
}

//密码校验 查询一个工程的信息
router.post('/checkProPSW', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post checkProPSW");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var proID = req.query.proID;
  var proVer = req.query.proVer;
  // var filePath = global.sdbPath + "/" + proID + "/" + proVer + "/project/ProjectPorpertyInfo.json";
  var filePath = pubInter.joinPath(req.query.proID, req.query.proVer, req.query.proName) + "/ProjectPorpertyInfo.json";
  let objProperJson = pubInter.readJson(filePath);
  if (objProperJson.Error) {
    res.send(objProperJson);
    return;
  }
  let proData = objProperJson.data;
  //let proData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  res.send(proData);
  LogManagerObj.traceLog(projectManagerName, "Leave post checkProPSW");
})

//工程属性修改 提交
router.post('/editProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post editProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let proID = xss(req.query.proID);
  let proVer = xss(req.query.proVer);
  let changeField = xss(req.query.changeField);
  let changeValue = xss(req.query.changeValue);
  // var filePath = global.sdbPath + "/" + proID + "/" + proVer + "/project";
  var filePath = pubInter.joinPath(proID, proVer, xss(req.query.proName));
  if (changeField == "ProjectName") {
    if (checkProjectName(changeValue)) {
      res.send("重名");
      return;
    }
  }
  var path = filePath + "/ProjectPorpertyInfo.json";
  var strOldProjectName;
  let strJson = fs.readFile(path, 'utf-8', function (err, data) {
    if (err) {
      console.log("editProject Load ProjectPorpertyInfo.json Failed.");
      console.error(err);
      res.send(err.message);
      return;
    }
    let proInfo = JSON.parse(data);
    strOldProjectName = proInfo.ProjectName;
    var tempArry = new Array();
    tempArry.push(proInfo);
    for (var index in tempArry[0]) {
      if (index == changeField) {
        tempArry[0][index] = changeValue;
        break;
      }
    }
    tempArry[0].Modifier = JSON.parse(xss(req.body.UserInfo)).userName;
    tempArry[0].ModifyTime = pubInter.getCurrentTime();
    tempArry[0].updateFlag = 0;
    fs.writeFile(path, JSON.stringify(tempArry[0], '', "\t"), function (err) {
      if (err) {
        return console.error(err);
      }
      var groupPath = global.sdbPath + "/ProjectGroupList.json";
      fs.readFile(groupPath, 'utf-8', function (err, data) {
        if (err) {
          console.log("editProject Load ProjectGroupList.json Failed.");
          console.error(err);
          return;
        }
        let groupInfo = JSON.parse(data).ProjectGroupList;
        editProGroupJSON(groupInfo, proID, changeField, changeValue, tempArry[0].Modifier, tempArry[0].ModifyTime);
        let lastJson = new Object();
        lastJson.ProjectGroupList = groupInfo;
        fs.writeFile(groupPath, JSON.stringify(lastJson, '', "\t"), function (err) {
          if (err) {
            return console.error(err);
          }
          //修改权限文件的工程名称
          if (changeField == "ProjectName") {
            let objCharacter = pubInter.readJson(global.sdbPath + "/CharacterInfo.json");
            if (objCharacter.Error) {
              res.send(objCharacter.ErrorDesc);
              return;
            }
            let fileObj = objCharacter.data;
            //let fileObj = JSON.parse(fs.readFileSync(global.sdbPath+"/CharacterInfo.json", 'utf-8'));
            publicInten.modifyCharacterForModifyProject(proID, proVer, fileObj, {
              "ProjectName": changeValue
            });
            fs.writeFileSync(global.sdbPath + "/CharacterInfo.json", JSON.stringify(fileObj, "", "\t"));

            let strResEdit = editProjectInObject(proID, proVer, strOldProjectName, changeValue);
            if (strResEdit != "OK") {
              res.send(strResEdit);
              return;
            }
          }
          if (changeField == "StorEnable") {
            var varPath = global.sdbPath + "/" + proID + "/1.0.0.1/project/VarInfo.json";
            var varObj = pubInter.readJson(varPath);
            for (let i = 0; i < varObj.data.TagList.length; i++) {
              if (varObj.data.TagList[i].TagType != 0) {
                varObj.data.TagList[i].StorEnable = changeValue;
              }
            }
            for (let i = 0; i < varObj.data.OPCVAR.length; i++) {
              if (varObj.data.OPCVAR[i].TagType != 0) {
                varObj.data.OPCVAR[i].StorEnable = changeValue;
              }
            }
            var wrErr = pubInter.writeJson(varPath, varObj.data)
            if (wrErr != "OK") {
              res.send(wrErr);
              return;
            }
          }
          res.send('OK');
          return;
        })
      })
    })
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post editProject");
})

function editProGroupJSON(proGroupList, selectTreeText, changeField, changeValue, Modifier, ModifyTime) {
  LogManagerObj.traceLog(projectManagerName, "Enter function editProGroupJSON");
  for (var i = 0; i < proGroupList.length; i++) {
    if (proGroupList[i].ProjectGroupName == undefined) {
      if (proGroupList[i].ProjectID == selectTreeText) {
        proGroupList[i][changeField] = changeValue;
        proGroupList[i].Modifier = Modifier;
        proGroupList[i].ModifyTime = ModifyTime;
        break;
      }
    } else {
      if (proGroupList[i].ProjectObjectList != undefined && proGroupList[i].ProjectObjectList.length > 0) {
        editProGroupJSON(proGroupList[i].ProjectObjectList, selectTreeText, changeField, changeValue, Modifier, ModifyTime);
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function editProGroupJSON");
  return proGroupList;
}

//当修改工程名称时，在对象配置中也修改一下工程的名称
function editProjectInObject(strProjectID, strProjectVersion, strOldProName, strNewProName) {
  //修改对象配置中的工程名称
  let strObjectPath = pubInter.joinPath(strProjectID, strProjectVersion, "") + "/ObjectTemplateInfo.json";
  if (!fs.existsSync(strObjectPath)) { //主线版本中没有ObjectTemplateInfo.json
    return "OK";
  }
  var objReadObject = pubInter.readJson(strObjectPath);
  if (objReadObject.Error) {
    return objReadObject.ErrorDesc;
  }
  var arrTemplate = objReadObject.data.ObjectTemplateList;
  for (let i = 0; i < arrTemplate.length; i++) {
    for (let j = 0; j < arrTemplate[i].ObjectList.length; j++) {
      if (arrTemplate[i].ObjectList[j].ProjectName == strOldProName) {
        arrTemplate[i].ObjectList[j].ProjectName = strNewProName;
      }
    }
  }
  let strWrObject = pubInter.writeJson(strObjectPath, objReadObject.data);
  if (strWrObject != "OK") {
    return strWrObject;
  }
  //将存储配置中的工程名称也修改了
  let strDBConfigPath = pubInter.joinPath(strProjectID, strProjectVersion, "") + "/DataBaseConfig.json";
  var objReadStorage = pubInter.readJson(strDBConfigPath);
  if (objReadStorage.Error) {
    return objReadStorage.ErrorDesc;
  }
  for (let i = 0; i < objReadStorage.data.length; i++) {
    if (objReadStorage.data[i].DBType == 7) { //目前只有TDengine存储会用到这种配置
      let arrObjectTempList = objReadStorage.data[i].ObjectTemplateList;
      for (let j = 0; j < arrObjectTempList.length; j++) {
        for (let k = 0; k < arrObjectTempList[j].ObjectList.length; k++) {
          if (arrObjectTempList[j].ObjectList[k].ProjectName == strOldProName) {
            arrObjectTempList[j].ObjectList[k].ProjectName = strNewProName
          }
        }
      }
      let strWrStorage = pubInter.writeJson(strDBConfigPath, objReadStorage.data);
      if (strWrStorage != "OK") {
        return strWrStorage;
      }
      break;
    }
  }
  return "OK";
}

//复制工程 提交
router.post('/addCopyNewProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post addCopyNewProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let groupData = pubInter.EscapeAllData(req.body);
  let proGroup = groupData.node; //工程组名称
  var newProName = groupData.proname; //新工程名称

  // var oldProID = groupData.oldProID;
  // var oldProVer = groupData.oldProVer;
  // var oldProName = groupData.oldProName;

  // var proPath = global.sdbPath + "/";
  // var proVer = "1.0.0.1";

  if (checkProjectName(newProName)) {
    res.send("重名");
    return;
  }

  // var oldSrc = global.sdbPath + "/" + groupData.oldProID + "/" + groupData.oldProVer + "/project";
  //读 被复制工程的工程信息
  var tempList = new Object();
  var oldSrc = pubInter.joinPath(groupData.oldProID, groupData.oldProVer, groupData.oldProName);
  var oldProIfnoPath = oldSrc + '/ProjectPorpertyInfo.json';
  let oldInfoJson = pubInter.readJson(oldProIfnoPath);
  if (oldInfoJson.Error == false) {
    tempList = oldInfoJson.data;
  } else {
    console.log(oldInfoJson.ErrorDesc);
    res.send(oldInfoJson.ErrorDesc);
    return;
  }
  tempList.ProjectID = pubInter.getUUID();
  tempList.ProjectName = newProName;
  tempList.Modifier = JSON.parse(groupData.userInfo).userName;
  tempList.Creator = JSON.parse(groupData.userInfo).userName;
  tempList.CreateTime = pubInter.getCurrentTime();
  tempList.ModifyTime = pubInter.getCurrentTime();
  tempList.publicFlag = 0;
  tempList.publicTime = '';
  //网络配置没有复制？
  // tempList.AutoEnable = 1;
  // tempList.TransMode = 0;
  // tempList.TransInterval = 1000;
  // tempList.HistoryDataMode = 0;
  // tempList.HistoryDataCacheNumber = 1000;
  // tempList.HistoryDataCacheTime = 24;
  // tempList.FileCacheMode = 0;
  // tempList.CacheFileSize = 1024;
  // tempList.CacheFilePeriod = 24;
  // tempList.UserName = 0;
  // tempList.Password = 0;

  var proO = new Object();
  proO.ProjectID = tempList.ProjectID;
  proO.ProjectName = tempList.ProjectName;
  proO.Description = tempList.Description;
  proO.ProjectVersion = tempList.ProjectVersion;
  proO.ProjectTypeVersion = tempList.ProjectTypeVersion;
  proO.Modifier = tempList.Modifier;
  proO.ModifyTime = tempList.ModifyTime;
  proO.Creator = tempList.Creator;
  proO.CreateTime = tempList.CreateTime;
  proO.SysPlatform = tempList.SysPlatform;
  proO.PlatformType = tempList.PlatformType;
  if (proGroup == "工程管理") {
    proO.GroupName = "null";
  } else {
    proO.GroupName = proGroup;
  }

  // proPath += tempList.ProjectID;
  // proVer = proPath + "/" + proVer + "/project";
  var proVer = pubInter.joinPath(tempList.ProjectID, tempList.ProjectVersion, tempList.ProjectName);
  pubInter.recursiveMakeDir(proVer);
  proFileCopy(oldSrc, proVer);
  //写入到文件
  proVer += "/ProjectPorpertyInfo.json";
  //console.log('proVer=',proVer);
  fs.writeFile(proVer, JSON.stringify(tempList, '', "\t"), function (err) {
    if (err) {
      return console.error(err);
    }
    let strJson = fs.readFile(global.sdbPath + '/ProjectGroupList.json', 'utf-8', function (err, data) {
      if (err) {
        console.log("Load ProjectGroupList Failed.");
        console.error(err);
        return;
      }
      let groupJSON = JSON.parse(data).ProjectGroupList;
      let lastJson = new Object();

      if (proGroup == "工程管理") {
        groupJSON.push(proO);
      } else {
        groupJSON = traverseGroupJSONFindGroupName(groupJSON, proGroup, proO);
      }
      lastJson.ProjectGroupList = groupJSON;
      fs.writeFile(global.sdbPath + '/ProjectGroupList.json', JSON.stringify(lastJson, '', "\t"), function (err) {
        if (err) {
          return console.error(err);
        }
        res.send('OK_' + tempList.ProjectID);
      });
    });
  });
  LogManagerObj.traceLog(projectManagerName, "Leave post addCopyNewProject");
})

//工程移动 提交
router.post('/moveProjectToGroup', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post moveProjectToGroup");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  //let oldGroup = req.query.oldGroup;
  if (typeof (req.body.proObj) == "string") {
    req.body.proObj = JSON.parse(req.body.proObj);
  }
  let newGroup = xss(req.query.newGroup);
  let userInfo = pubInter.EscapeAllData(req.query.userInfo);
  let moveObj = pubInter.EscapeAllData(req.body.proObj);

  let objGroup = pubInter.readJson(global.sdbPath + '/ProjectGroupList.json');
  if (objGroup.Error) {
    res.send(objGroup.ErrorDesc);
    return;
  }
  let groupJSON = objGroup.data.ProjectGroupList;
  //let groupJSON = JSON.parse(fs.readFileSync(global.sdbPath + '/ProjectGroupList.json')).ProjectGroupList;

  for (var i = 0; i < moveObj.length; i++) {
    var oldGroup = moveObj[i].GroupName;
    if (oldGroup == newGroup) continue;
    if (oldGroup == "null") {
      for (var j = 0; j < groupJSON.length; j++) {
        if (moveObj[i].ProjectID == groupJSON[j].ProjectID) {
          var temObj = groupJSON[j];
          groupJSON.splice(j, 1);
          temObj.Modifier = JSON.parse(userInfo).userName;
          temObj.ModifyTime = pubInter.getCurrentTime();
          temObj.GroupName = newGroup;
          traverseGroupJSONFindGroupName(groupJSON, newGroup, temObj);
          break;
        }
      }
    } else {
      var proObjList = [];
      for (var m = 0; m < groupJSON.length; m++) {
        if (oldGroup == groupJSON[m].ProjectGroupName) {
          if (groupJSON[m].ProjectObjectList != undefined) {
            proObjList = groupJSON[m].ProjectObjectList;
            break;
          }
        }
      }
      for (var k = 0; k < proObjList.length; k++) {
        if (moveObj[i].ProjectID == proObjList[k].ProjectID) {
          var tempOBj = proObjList[k];
          proObjList.splice(k, 1);
          tempOBj.Modifier = JSON.parse(userInfo).userName;
          tempOBj.ModifyTime = pubInter.getCurrentTime();
          if (newGroup == "null") {
            tempOBj.GroupName = "null";
            groupJSON.push(tempOBj);
          } else {
            tempOBj.GroupName = newGroup;
            traverseGroupJSONFindGroupName(groupJSON, newGroup, tempOBj);
          }
          break;
        }
      }
    }
  }

  let lastJson = {};
  lastJson.ProjectGroupList = groupJSON;
  let strResWrite = pubInter.writeJson(global.sdbPath + '/ProjectGroupList.json', lastJson);
  //fs.writeFileSync(global.sdbPath + '/ProjectGroupList.json', JSON.stringify(lastJson, '', "\t"));

  //权限文件
  // var writeAuth = new Object();
  // writeAuth.authority = aujson;
  // fs.writeFileSync(global.sdbPath + "/CharacterInfo.json", JSON.stringify(writeAuth, "", "\t"));

  res.send(strResWrite);
  LogManagerObj.traceLog(projectManagerName, "Leave post moveProjectToGroup");
})

//工程导出
router.post('/exportProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post exportProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let projectNames = new Array();
  projectNames = pubInter.EscapeAllData(req.body.array);
  if (typeof (projectNames) == "string") {
    projectNames = JSON.parse(projectNames);
  }
  let szFileType = xss(req.query.Type);
  // var proPath = "Data/exportProTemp";
  let tempPath = global.exportPath + "/Pro";
  pubInter.delFileAndDir(tempPath);
  let createFile = pubInter.recursiveMakeDir(tempPath);
  let resultPaths = "";
  // if (createFile && szFileType == "zip") {
  //   for (var i = 0; i < projectNames.length; i++) {
  //     var pp = tempPath + "/" + projectNames[i].ProjectName;
  //     let createSFile = makDirSync(tempPath + "/" + projectNames[i].ProjectName);
  //     let result = projectExportInfo(projectNames[i], pp, Number(req.query.SystemType));
  //   }
  //   zipper.sync.zip(tempPath).compress().save(tempPath + "/project.zip");
  //   let pathTemp = "exportProjectTemp/project/project.zip";
  //   resultPaths = pathTemp;
  // } else 
  if (createFile && szFileType == "json") {
    for (var j = 0; j < projectNames.length; j++) {
      var dest = tempPath + "/" + projectNames[j].ProjectName;
      pubInter.recursiveMakeDir(dest);
      var src = pubInter.joinPath(projectNames[j].ProjectID, projectNames[j].ProjectVersion, projectNames[j].ProjectName);
      //global.sdbPath + "/" + projectNames[j].ProjectID + "/" + projectNames[j].ProjectVersion + "/project";
      try {
        proFileCopy(src, dest);
      } catch (e) {
        res.send("The " + (j + 1) + "th" + " ProjectID ProjectVersion or ProjectName is not found.");
        return;
      }
    }
    zipper.sync.zip(tempPath).compress().save(tempPath + "/project.zip");
    //let pathTemp = "export/Pro/project.zip";
    let pathTemp = "Pro/project.zip";
    resultPaths = pathTemp;
  }
  res.send(resultPaths);
  LogManagerObj.traceLog(projectManagerName, "Leave post exportProject");
})

function projectExportInfo(proObject, proPath, sysType) {
  LogManagerObj.traceLog(projectManagerName, "Enter function projectExportInfo");
  var fieldsPahr = global.propertyPath + '/projectConfig/';
  // var src = global.sdbPath + "/" + proObject.ProjectID + "/" + proObject.ProjectVersion;
  var src = pubInter.joinPath(proObject.ProjectID, proObject.ProjectVersion, proObject.ProjectName);
  var dirs = fs.readdirSync(src);
  dirs.forEach(function (item) {
    if (item != "DeviceGroupInfo.json" && item != "ProjectFileList.json" && item != "VarGroupInfo.json") {
      var item_path = path.join(src, item);
      var temp = fs.statSync(item_path);
      if (temp.isDirectory() == false) {
        var pp_path = fieldsPahr + item;
        var fields = new Array();
        let fieldsBuf = pubInter.readJson(pp_path);
        if (fieldsBuf.Error) {
          return fieldsBuf.ErrorDesc;
        }
        let fieldsData = fieldsBuf.data;
        /* let fieldsBuf = fs.readFileSync(pp_path);
        let fieldsData = JSON.parse(fieldsBuf); */
        for (var f = 0; f < fieldsData.length; f++) {
          fields[f] = fieldsData[f].field;
        }
        let myData = "";
        try {
          myData = fs.readFileSync(item_path);
        } catch (error) {
          return error.message;
        }
        var array = new Array();
        if (item == "DataBaseConfig.json") {
          array = JSON.parse(myData);
        } else if (item == "DataTransConfig.json") {
          array = JSON.parse(myData).CloudPlatform;
        } else if (item == "DeviceGroupInfo.json") {
          array = JSON.parse(myData).DeviceGroupList;
        } else if (item == "DeviceInfo.json") {
          array = JSON.parse(myData).DeviceList;
        } else if (item == "HighAvailabilityConfig.json") {
          array.push(JSON.parse(myData).RedundanceConfig);
        } else if (item == "NonlinearInfo.json") {
          array = JSON.parse(myData).NonlinearTableList;
        } else if (item == "ProjectFileList.json") {
          array = JSON.parse(myData).FileList;
        } else if (item == "ProjectPorpertyInfo.json") {
          array = JSON.parse(myData).TagList;
        } else if (item == "VarGroupInfo.json") {
          array = JSON.parse(myData).TagGroupList;
        } else if (item == "VarInfo.json") {
          array = JSON.parse(myData).TagList;
        }

        var resAyry = new Array();
        console.log('item=', item);
        if (item != "NonlinearInfo.json") {
          unidimensionalJson(array, resAyry);
        } else if (item == "NonlinearInfo.json") {
          nonlineInfoJson(array, resAyry);
        } else if (item == "DeviceGroupInfo.json") {
          devVarGroup(array, resAyry);
        }
        const json2csvParser = new Json2csvParser({
          fields
        });
        const csv = json2csvParser.parse(resAyry);
        var respath = proPath + "/" + item.split(".")[0] + ".csv";
        var newCsv;
        if (sysType == 1) {
          newCsv = iconv.encode(csv, 'GBK');
        } else {
          newCsv = csv;
        }
        try {
          fs.writeFileSync(respath, newCsv);
        } catch (error) {
          res.send(error.message);
        }
      }
    }
  });
  LogManagerObj.traceLog(projectManagerName, "Leave function projectExportInfo");
  return "OK";
}

function unidimensionalJson(array, resultArry) {
  LogManagerObj.traceLog(projectManagerName, "Enter function unidimensionalJson");
  for (var i = 0; i < array.length; i++) {
    if (array[i].TagType != undefined) {
      if (array[i].TagType == 0) {
        continue;
      }
    }
    var tempObj = new Object();
    for (var index in array[i]) {
      if (typeof (array[i][index]) == 'object') {
        doEachJSON(array[i][index], tempObj);
      } else {
        var aa = array[i][index];
        tempObj[index] = aa;
      }
    }
    resultArry.push(tempObj);
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function unidimensionalJson");
  return array;
}

function doEachJSON(tempA, tempO) {
  LogManagerObj.traceLog(projectManagerName, "Enter function doEachJSON");
  for (var i = 0; i < tempA.length; i++) {
    for (var index in tempA[i]) {
      if (typeof (tempA[i][index]) == 'object') {
        doEachJSON(tempA[i][index], tempO);
      } else {
        tempO[index] = tempA[i][index];
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function doEachJSON");
  return tempA;
}

function nonlineInfoJson(array, resAyry) {
  LogManagerObj.traceLog(projectManagerName, "Enter function nonlineInfoJson");
  for (var k = 0; k < array.length; k++) {
    var count = array[k].DecimalNum;
    for (var m = 0; m < count; m++) {
      var temOBj = new Object();
      temOBj.TableName = array[k].TableName;
      temOBj.TableDescription = array[k].TableDescription;
      temOBj.DecimalNum = array[k].DecimalNum;
      temOBj.RawValue = array[k].Map[m].RawValue;
      temOBj.Value = array[k].Map[m].Value;
      resAyry.push(temOBj);
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function nonlineInfoJson");
}

function devVarGroup(array, resAyry) {
  LogManagerObj.traceLog(projectManagerName, "Enter function devVarGroup");
  for (var i = 0; i < array.length; i++) {
    if (array[i].DeviceID != undefined) {
      var tempObj = new Object();
      tempObj.ParentID = 0;
      tempObj.DeviceID = array[i].DeviceID0;
      tempObj.DeviceName = array[i].DeviceName;
      tempObj.Description = array[i].Description;
      resAyry.push(tempObj);
    } else {

    }
    LogManagerObj.traceLog(projectManagerName, "Leave function devVarGroup");
    return array;
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function devVarGroup");
}

//导入工程
router.post('/importProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post importProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  const form = new formidable.IncomingForm();
  form.keepExtensions = true; //保存扩展名
  form.maxFieldsSize = 500 * 1024 * 1024; //上传文件的最大大小
  form.parse(req, (err, fields, files) => {
    if (err) {
      throw err;
    }
    //判断文件后缀，分开处理
    //判断目录文件是否存在
    //判断文件内容
    //上传成功后删除
    //处理错误信息打印；传回前台？
    //递归创建目录
    var proGroup = xss(req.query.groupName);
    if (files.uploadDatas == undefined) {
      res.send({
        err: true,
        data: ["输入信息里没有导入的文件"]
      })
      return;
    }
    // var dirPaht = "Data/improtProjectTemp/";
    pubInter.delFileAndDir(global.importPath);
    let result = new Object();
    result.Error = false;
    result.data = "";
    if (req.query.Type == "ZIP") {
      let strFileName = files.uploadDatas.path;
      let projectName = files.uploadDatas.name.substring(0, files.uploadDatas.name.indexOf(".zip"));
      let writeFile = global.importPath + "/" + projectName;
      pubInter.recursiveMakeDir(writeFile);

      let readStream = fs.createReadStream(strFileName);
      let writeStream = unzip.Extract({
        path: writeFile
      });
      readStream.pipe(writeStream);
      writeStream.on('close', () => {
        var proObj = {};
        proObj.err = false;
        proObj.data = [];
        var dirs = fs.readdirSync(writeFile);
        for (var dr = 0; dr < dirs.length; dr++) {
          var newwriteFile = writeFile + "/" + dirs[dr];
          try {
            var newdirs = fs.readdirSync(newwriteFile);
            if (newdirs.length == 0) {
              var ErrorDesc = "导入文件为空";
              proObj.err = true;
              proObj.data.push(ErrorDesc);
              res.send(proObj);
              return;
            }
          } catch (e) {
            var ErrorDesc = "导入目标工程文件目录层级有误!";
            proObj.err = true;
            proObj.data.push(ErrorDesc);
            res.send(proObj);
            return;
          }

          //如果是发布下载的工程，会嵌套多层文件夹，因此需要再往下几层
          var newdirs = [];
          let bFirst = true
          do {
            if (!bFirst) {
              newwriteFile = newwriteFile + "/" + newdirs[0];
            }
            bFirst = false;
            if (!fs.statSync(newwriteFile).isDirectory()) { //如果不是文件夹，说明导入的文件肯定不对
              var ErrorDesc = "不是工程文件";
              proObj.err = true;
              proObj.data.push(ErrorDesc);
              res.send(proObj);
              //delFileAndDir(dirPaht);
              pubInter.delFileAndDir(writeFile);
              LogManagerObj.errorLog(projectManagerName, ErrorDesc + ";");
              return;
            }
            newdirs = fs.readdirSync(newwriteFile);
          } while (newdirs.length == 1);
          if (newdirs.length == 0) {
            var ErrorDesc = "导入文件为空";
            proObj.err = true;
            proObj.data.push(ErrorDesc);
            res.send(proObj);
            return;
          }

          // var listPath = newwriteFile + '/ProjectFileList.json';
          // let listJson = pubInter.readJson( listPath );
          // if( listJson.Error == false){
          //   var listData = listJson.data.FileList;
          // }else{
          //   console.log(listJson.ErrorDesc);
          //   var ErrorDesc = "ProjectFileList.json 不存在";       
          //   proObj.err = true;
          //   proObj.data.push(ErrorDesc);
          //   res.send(proObj);
          //   return;
          // }

          var count = 0;
          var fileName = new Array();
          newdirs.forEach(function (item) {
            count++;
            if (item != "DataBaseConfig.json" && item != "DataTransConfig.json" && item != "DeviceGroupInfo.json" &&
              item != "DeviceInfo.json" && item != "HighAvailabilityConfig.json" && item != "NonlinearInfo.json" &&
              item != "ProjectFileList.json" && item != "ProjectPorpertyInfo.json" && item != "VarGroupInfo.json" &&
              item != "VarInfo.json" && item != "Cert" && item != "Driver" && item != "interalconfig.json" && item != "externalconfig.json") {
              fileName.push(item);
            }
          });
          if (fileName.length > 0 || count < 14) {
            // res.send("导入的文件数量、名称不对");
            let objFindExter = newdirs.find(function (file) {
              return file == "externalconfig.json"
            })
            if (objFindExter != undefined) {
              //老版本的工程文件中不存在externalconfig.json，因此只是没有externalconfig.json是不算错的
            } else {
              var ErrorDesc = "不是工程文件";
              proObj.err = true;
              proObj.data.push(ErrorDesc);
              res.send(proObj);
              //delFileAndDir(dirPaht);
              pubInter.delFileAndDir(writeFile);
              LogManagerObj.errorLog(projectManagerName, ErrorDesc + ";fileName.length=" + fileName.length + ";fileName=" + JSON.stringify(fileName) + ";count=" + count);
              return;
            }
          }
          let temp = newwriteFile + "/ProjectPorpertyInfo.json"; //重名
          let proData = pubInter.readJson(temp);
          if (proData.Error) {
            res.send(proData);
            LogManagerObj.errorLog(projectManagerName, proData.ErrorDesc);
            return;
          }
          proData = proData.data;
          if (req.query.ProjectName != undefined) {
            proData.ProjectName = req.query.ProjectName;
          }
          if (req.query.Description != undefined) {
            proData.Description = req.query.Description;
          }
          var proName = proData.ProjectName;
          /* var proData = JSON.parse(fs.readFileSync(temp));
          var proName = proData.ProjectName; */
          let checkName = checkProjectName(proName);
          if (checkName == true) {
            var ErrorDesc = "工程重名";
            proObj.err = true;
            proObj.data.push(ErrorDesc);
            res.send(proObj);
            pubInter.delFileAndDir(writeFile);
            LogManagerObj.errorLog(projectManagerName, ErrorDesc);
            return;
          }

          let devPa = newwriteFile + "/DeviceInfo.json"; //驱动是否存在
          var drivePath = new Array();
          let objDevJson = pubInter.readJson(devPa);
          if (objDevJson.Error) {
            proObj.err = true;
            proObj.data.push(objDevJson.ErrorDesc);
            res.send(proObj);
            pubInter.delFileAndDir(writeFile);
            LogManagerObj.errorLog(projectManagerName, objDevJson.ErrorDesc);
            return;
          }
          var devData = objDevJson.data.DeviceList;
          //var devData = JSON.parse(fs.readFileSync(devPa)).DeviceList;
          var drvpa = global.drivePath + "/DriverInfo.json";
          let objVarJson = pubInter.readJson(drvpa);
          if (objVarJson.Error) {
            res.send(objVarJson);
            pubInter.delFileAndDir(writeFile);
            LogManagerObj.errorLog(projectManagerName, objVarJson.ErrorDesc);
            return;
          }
          var drvData = objVarJson.data.DriverList;
          //var drvData = JSON.parse(fs.readFileSync(drvpa)).DriverList;
          var drvFlag = 0;
          var devFlag = 0;
          for (var d = 0; d < devData.length; d++) {
            if (devData[d].DriverName == "OPCUA") {
              continue;
            }
            for (var r = 0; r < drvData.length; r++) {
              devFlag = 0;
              let strSysPlatform = "";
              if (devData[d].SystemPlatform != undefined) {
                strSysPlatform = "SystemPlatform";
              } else if (devData[d].Company != undefined) {
                strSysPlatform = "Company";
              } else {
                var ErrorDesc = "设备属性信息不全";
                proObj.err = true;
                proObj.data.push(ErrorDesc);
                res.send(proObj);
                pubInter.delFileAndDir(writeFile);
                LogManagerObj.errorLog(projectManagerName, ErrorDesc);
                return;
              }
              if (devData[d][strSysPlatform] == drvData[r].SysPlatform && devData[d].DeviceProvider == drvData[r].DriverCompany) {
                devFlag = 1;
                if (devData[d].DriverName == drvData[r].DriverName) {
                  var tem = devData[d].DeviceProvider + "/" + devData[d].DriverName;
                  drivePath.push(tem);
                  drvFlag = 0;
                  break;
                } else {
                  devFlag = 0;
                  drvFlag = 1;
                }
              }
            }
            if (drvFlag == 1 || devFlag == 0) {
              break;
            }
          }
          if ((drvFlag == 1 || devFlag == 0) && devData.length > 0) {
            // res.send("设备驱动未安装，请安装驱动后导入工程！");
            var ErrorDesc = "设备驱动未安装，请安装驱动后导入工程！";
            proObj.err = true;
            proObj.data.push(ErrorDesc);
            res.send(proObj);
            pubInter.delFileAndDir(writeFile);
            LogManagerObj.errorLog(projectManagerName, ErrorDesc);
            return;
          }
          var varpath = newwriteFile + '/VarInfo.json';
          var varinfo = pubInter.readJson(varpath).data;
          if (varinfo.OPCVAR == undefined) {
            varinfo.OPCVAR = [];
          }
          pubInter.writeJson(varpath, varinfo);

          var proID = pubInter.getUUID();
          // var proID = proData.ProjectVersion;
          var proPath = pubInter.joinPath(proID, proData.ProjectVersion, proData.ProjectName); //global.sdbPath + "/" + proID;
          pubInter.recursiveMakeDir(proPath); //project file          
          proFileCopy(newwriteFile, proPath); //文件复制

          //拷贝驱动
          // var drvPath = global.drivePath + "/" + proData.SysPlatform;          
          // proFileCopy(newwriteFile, drvPath);

          // for (var dr = 0; dr < drivePath.length; dr++) {
          //   var drP = drvPath + drivePath[dr];
          //   var drvdirs = fs.readdirSync(drP);
          //   drvdirs.forEach(function (item) {
          //     var item_path = path.join(drP, item);
          //     var temp = fs.statSync(item_path);
          //     if (temp.isDirectory() == false) {
          //       var tepath = drP + "/" + item;
          //       var destpath = drvPath + "/" + item;
          //       fs.copyFileSync(tepath, destpath);
          //     }
          //   });
          // }

          //写入到文件
          var temobj = {};
          temobj.ProjectName = proData.ProjectName;
          temobj.ProjectID = proID;
          temobj.ProjectVersion = proData.ProjectVersion;
          proObj.data.push(temobj);

          proData.ProjectID = proID;
          proData.CreateTime = pubInter.getCurrentTime();
          let objUserInfo = pubInter.EscapeAllData(req.query.userInfo);
          // proData.Creator = typeof objUserInfo == 'object' ? objUserInfo.userName : JSON.parse(objUserInfo).userName;//modify UserName-->username
          proData.Creator = (objUserInfo == undefined ? proData.Creator : objUserInfo);
          proData.publicFlag = 0;
          proData.updateFlag = 0;

          proPath += "/ProjectPorpertyInfo.json";
          //fs.writeFileSync( proPath, JSON.stringify(proData, '', "\t") );
          let strWrPro = pubInter.writeJson(proPath, proData);
          if (strWrPro != "OK") {
            proObj.err = true;
            proObj.data.push(strWrPro);
            res.send(proObj);
            LogManagerObj.errorLog(projectManagerName, strWrPro);
            return;
          }

          var proGroupDATA = pubInter.readJson(global.sdbPath + '/ProjectGroupList.json');
          if (proGroupDATA.Error) {
            proObj.err = true;
            proObj.data.push(proGroupDATA.ErrorDesc);
            res.send(proObj);
            LogManagerObj.errorLog(projectManagerName, proGroupDATA.ErrorDesc);
            return;
          }
          let groupJSON = proGroupDATA.data.ProjectGroupList;
          /* var proGroupDATA = fs.readFileSync(global.sdbPath + '/ProjectGroupList.json');
          let groupJSON = JSON.parse(proGroupDATA).ProjectGroupList; */
          let lastJson = new Object();
          var temPro = new Object();
          temPro.ProjectName = proData.ProjectName;
          temPro.Description = proData.Description;
          temPro.ProjectID = proData.ProjectID;
          temPro.ProjectVersion = proData.ProjectVersion;
          temPro.ProjectTypeVersion = proData.ProjectTypeVersion;
          temPro.Modifier = proData.Modifier;
          temPro.ModifyTime = proData.ModifyTime;
          temPro.Creator = proData.Creator;
          temPro.CreateTime = proData.CreateTime;
          temPro.GroupName = proData.CreateTime;
          temPro.SysPlatform = proData.SysPlatform;
          // temPro.PlatformType = proData.PlatformType;
          temPro.OsType = proData.OsType;
          if (proGroup == "工程管理") {
            temPro.GroupName = "null";
            groupJSON.push(temPro);
          } else {
            temPro.GroupName = proGroup;
            groupJSON = traverseGroupJSONFindGroupName(groupJSON, proGroup, temPro);
          }
          lastJson.ProjectGroupList = groupJSON;
          //fs.writeFileSync(global.sdbPath + '/ProjectGroupList.json', JSON.stringify(lastJson, '', "\t"));
          let strWrProGroup = pubInter.writeJson(global.sdbPath + '/ProjectGroupList.json', lastJson);
          if (strWrProGroup != "OK") {
            proObj.err = true;
            proObj.data.push(strWrProGroup);
            res.send(proObj);
            LogManagerObj.errorLog(projectManagerName, strWrProGroup);
          }
        }
        pubInter.delFileAndDir(writeFile);
        res.send(proObj);
      });
    }
  })
  LogManagerObj.traceLog(projectManagerName, "leave post importProject");
})

//工程密码查询
router.post('/encryptProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post encryptProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let proID = xss(req.body.ProjectID);
  let proVer = xss(req.body.ProjectVersion);
  // var path = global.sdbPath + "/" + proID + "/" + proVer + "/project/ProjectPorpertyInfo.json";
  var path = pubInter.joinPath(proID, proVer, "") + "/ProjectPorpertyInfo.json";
  let strJson = fs.readFile(path, 'utf-8', function (err, data) {
    if (err) {
      console.log("encryptProject Load ProjectPorpertyInfo.json Failed.");
      console.error(err);
      res.send(err.message);
      LogManagerObj.errorLog(projectManagerName, err.message);
      return;
    }
    let proInfo = JSON.parse(data);
    let usrPSW = new Object();
    // usrPSW.UserName = JSON.parse(proInfo).userInfo.userName;
    usrPSW.Password = proInfo.Password;
    res.send(usrPSW);
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post encryptProject");
})
//工程加密  修改密码
router.post('/addProjectPSW', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post addProjectPSW");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let proID = xss(req.body.proID);
  let proVer = xss(req.body.proVer);
  let proUserName = JSON.parse(xss(req.body.userInfo)).userName;
  let proPassword = xss(req.body.proPassword);
  // var path = global.sdbPath + "/" + proID + "/" + proVer + "/project/ProjectPorpertyInfo.json";
  var path = pubInter.joinPath(proID, proVer, "") + "/ProjectPorpertyInfo.json";
  let strJson = fs.readFile(path, 'utf-8', function (err, data) {
    if (err) {
      console.log("addProjectPSW Load ProjectPorpertyInfo.json Failed.");
      console.error(err);
      return;
    }
    let proInfo = JSON.parse(data);
    proInfo.UserName = proUserName;
    proInfo.Password = proPassword;
    fs.writeFile(path, JSON.stringify(proInfo, '', "\t"), function (err) {
      if (err) {
        console.error(err);
        return err.message;
      }
      res.send('OK');
    })
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post addProjectPSW");
})

//网络配置属性 初始化
router.post('/getNetWorkProperty', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getNetWorkProperty");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;

  var proPath = path.join(tenantDir, req.query.ProjectID, 'project');
  //读取 网络属性 json
  let netCinfigList;
  var netPath = global.propertyPath + '/netWorkProperty.json';
  let netStrJson = pubInter.readJson(netPath);
  if (netStrJson.Error == false) {
    netCinfigList = netStrJson.data;
  } else {
    console.log(netStrJson.ErrorDesc);
    res.send(netStrJson.ErrorDesc);
    return;
  }
  //读取 冗余 json文件
  var higPerty;
  var HigPath = proPath + '/HighAvailabilityConfig.json';
  let higStrJson = pubInter.readJson(HigPath);
  if (higStrJson.Error == false) {
    higPerty = higStrJson.data;
  } else {
    console.log(higStrJson.ErrorDesc);
    res.send(higStrJson.ErrorDesc);
    return;
  }
  if (higPerty.RedundanceConfig !== "{}") {
    for (var indx in higPerty.RedundanceConfig) {
      for (var m = 0; m < netCinfigList.rows.length; m++) {
        if (indx == netCinfigList.rows[m].field) {
          netCinfigList.rows[m].value = higPerty.RedundanceConfig[indx];
        }
      }
    }
  }

  if (global.productType == PRODUCTKF36) {
    let proPerty;
    let proStrJson = pubInter.readJson(proPath + '/ProjectPorpertyInfo.json');
    if (proStrJson.Error == false) {
      proPerty = proStrJson.data;
    } else {
      console.log(proStrJson.ErrorDesc);
      res.send(proStrJson.ErrorDesc);
      return;
    }
    for (var index in proPerty) {
      for (var n = 0; n < netCinfigList.rows.length; n++) {
        if (index == netCinfigList.rows[n].field) {
          netCinfigList.rows[n].value = proPerty[index];
        }
      }
    }

    //读端口开放文件
    let interalConfigURL = proPath + '/interalconfig.json';
    if (!fs.existsSync(interalConfigURL)) {
      console.log("没有找到开放端口配置文件.");
      res.send("没有找到开放端口配置文件");
      LogManagerObj.errorLog(projectManagerName, "没有找到开放端口配置文件");
      return;
    }
    let objInternalJson = pubInter.readJson(interalConfigURL);
    if (objInternalJson.Error) {
      res.send(objInternalJson.ErrorDesc);
      LogManagerObj.errorLog(projectManagerName, objInternalJson.ErrorDesc);
      return;
    }
    let interalConfigObj = objInternalJson.data;
    //let interalConfigObj = JSON.parse(fs.readFileSync(interalConfigURL, 'utf-8'));

    for (var n = 0; n < netCinfigList.rows.length; n++) {
      if (netCinfigList.rows[n].field == "uncontained") {
        netCinfigList.rows[n].value = interalConfigObj.uncontained;
      }
      if (netCinfigList.rows[n].field == "exposedPorts") {
        netCinfigList.rows[n].value = interalConfigObj.exposedPorts;
      }
    }
  }

  res.send(netCinfigList);
  LogManagerObj.traceLog(projectManagerName, "Leave post getNetWorkProperty");
})

//网络配置 提交
router.post('/addProNetWork', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post addProNetWork");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var proPath = path.join(tenantDir, req.body.ProjectID, 'project');
  var netData = req.body.netData;
  var HighAvaObj = {};
  for (var n = 0; n < netData.rows.length; n++) {
    if (netData.rows[n].group == "冗余属性") {
      if (netData.rows[n].types == "number") {
        HighAvaObj[netData.rows[n].field] = parseInt(netData.rows[n].value);
      } else {
        HighAvaObj[netData.rows[n].field] = netData.rows[n].value;
      }
    }
  }
  var redObj = new Object();
  redObj.RedundanceConfig = HighAvaObj;
  try {
    fs.writeFileSync(proPath + "/HighAvailabilityConfig.json", JSON.stringify(redObj, '', "\t"));
  } catch (error) {
    console.log(error)
    res.send("写冗余配置失败:" + error);
    return;
  }

  if (global.productType == PRODUCTKF36) {
    //读取 工程文件 json
    let projectObj;
    var projectPath = proPath + '/ProjectPorpertyInfo.json';
    let proStrJson = pubInter.readJson(projectPath);
    if (proStrJson.Error == false) {
      projectObj = proStrJson.data;
    } else {
      console.log(proStrJson.ErrorDesc);
      res.send(proStrJson.ErrorDesc);
      return;
    }
    for (var p = 0; p < netData.rows.length; p++) {
      if (netData.rows[p].group == "基本属性") {
        if (netData.rows[p].types == "number") {
          projectObj[netData.rows[p].field] = parseInt(netData.rows[p].value);
        } else {
          projectObj[netData.rows[p].field] = netData.rows[p].value;
        }
      }
    }
    try {
      fs.writeFileSync(projectPath, JSON.stringify(projectObj, '', "\t"));
    } catch (error) {
      console.log(error)
      res.send("写工程文件配置失败:" + error);
      return;
    }

    //写端口开放文件
    let interalConfigURL = proPath + '/interalconfig.json';
    if (!fs.existsSync(interalConfigURL)) {
      res.send("没有找到开放端口配置文件");
      return;
    }
    let objInternalJson = pubInter.readJson(interalConfigURL);
    if (objInternalJson.Error) {
      res.send(objInternalJson.ErrorDesc);
      return;
    }
    let interalConfigObj = objInternalJson.data;
    //let interalConfigObj = JSON.parse(fs.readFileSync(interalConfigURL, 'utf-8'));
    for (var i = 0; i < netData.rows.length; i++) {
      if (netData.rows[i].field == "uncontained") {
        if (netData.rows[i].value == "true") {
          interalConfigObj.uncontained = true;
        } else {
          interalConfigObj.uncontained = false;
        }
      }
      if (netData.rows[i].field == "exposedPorts") {
        interalConfigObj.exposedPorts = netData.rows[i].value;
      }
    }
    try {
      fs.writeFileSync(interalConfigURL, JSON.stringify(interalConfigObj, "", "\t"));
    } catch (error) {
      console.log(error)
      res.send("写设备开放端口配置失败:" + error);
      return;
    }
  }
  res.send('OK');
  LogManagerObj.traceLog(projectManagerName, "Leave post addProNetWork");
})

//存储配置 下拉框初始化
router.post('/initCombox', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post initCombox");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let comboxData;
  var comboxPath = global.propertyPath + '/selectConfig.json';
  let deviceStrJson = pubInter.readJson(comboxPath);
  if (deviceStrJson.Error == false) {
    comboxData = deviceStrJson.data.storageConfig;
  } else {
    console.log(deviceStrJson.ErrorDesc);
    res.send(deviceStrJson.ErrorDesc);
    return;
  }
  var dbvale = [];
  // var redisColony = [];
  if (global.productType == 1) {
    dbvale = [{
      "name": "数据库类型",
      "field": "db_tyoe",
      "value": "6",
      "group": "选择",
      "editor": {
        "type": "combobox",
        "options": {
          "data": comboxData,
          "valueField": "id",
          "editable": false,
          "textField": "text",
          "panelHeight": "auto"
        }
      }
    }]
  } else if (global.productType == 2) {
    dbvale = [{
      "name": "数据库类型",
      "field": "db_tyoe",
      "value": "9",
      "group": "选择",
      "editor": {
        "type": "combobox",
        "options": {
          "data": comboxData,
          "valueField": "id",
          "editable": false,
          "textField": "text",
          "panelHeight": "auto"
        }
      }
    }]
  }

  res.send(dbvale);
  LogManagerObj.traceLog(projectManagerName, "Leave post getStorageList");
})

//存储配置 查询
router.post('/getStorageList', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getStorageList");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var comboxData;
  var comboxPath = global.propertyPath + "/selectConfig.json";
  let deviceStrJson = pubInter.readJson(comboxPath);
  if (deviceStrJson.Error == false) {
    comboxData = deviceStrJson.data.storageConfig;
  } else {
    console.log(deviceStrJson.ErrorDesc);
    res.send(deviceStrJson.ErrorDesc);
    return;
  }
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var proPertyPath = path.join(tenantDir,req.query.proID,'project');
  var dbArry = new Array();
  var storagePath = proPertyPath + '/DataBaseConfig.json';
  if (fs.existsSync(storagePath)) {
    fs.readFile(storagePath, 'utf-8', function (err, data) {
      if (err) {
        console.log("getStorageList Load DataBaseConfig.json Failed.");
        console.error(err);
        return;
      }
      if (data == "") {
        res.send(dbArry);
        return;
      }
      try {
        var storageList = JSON.parse(data);
      } catch (error) {
        console.error(error);
        res.send(dbArry);
        return
      }
      for (var i = 0; i < storageList.length; i++) {
        var dbObj = new Object();
        if (storageList[i].DBType != 100) {
          dbObj.appDB = "数据库";
        } else {
          dbObj.appDB = "APP";
        }
        for (var c = 0; c < comboxData.length; c++) {
          if (storageList[i].DBType == comboxData[c].id) {
            dbObj.ConifgName = comboxData[c].text;
            break;
          }
        }
        for (var index in storageList[i]) {
          dbObj[index] = storageList[i][index];
        }
        if (dbObj.Active == 1) {
          dbObj.States = "激活";
        } else {
          dbObj.States = "未激活";
        }
        dbArry.push(dbObj);
      }
      res.send(dbArry);
    })
  } else {
    res.send(dbArry);
  }
  LogManagerObj.traceLog(projectManagerName, "Leave post getStorageList");
})

//存储配置 新建
router.post('/getDBAPPpropety', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getDBAPPpropety");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var dbtype = xss(req.query.dbtype);
  var dbPath = global.propertyPath + '/';
  if (dbtype == "100") {
    dbPath += "appConfig.json";
  } else if (dbtype == "6") {
    dbPath += "redisConfig.json";
  } else if (dbtype == "9") { //KF3.6不支持KH和KDL
    dbPath += "KHDbConfig.json";
  } else if (dbtype == "10") {
    dbPath += "KDLDbConfig.json";
  } else if (dbtype == "7") {
    dbPath += "TDEngine.json";
  } else if (dbtype == "12") {
    dbPath += "KHDbWindowsConfig.json";
  } else {
    dbPath += "otherDBConfig.json";
  }
  fs.readFile(dbPath, 'utf-8', function (err, data) {
    if (err) {
      console.log("getDBAPPpropety Failed.");
      console.error(err);
      return;
    }
    let storageList = JSON.parse(data);
    for (var s = 0; s < storageList.rows.length; s++) {
      for (var index in storageList.rows[s]) {
        if (index == 'field') {
          if (storageList.rows[s][index] == "Port") {
            if (dbtype == "1") {
              storageList.rows[s].value = 1433;
            }
            if (dbtype == "2") {
              storageList.rows[s].value = 3306;
            }
            if (dbtype == "3" || dbtype == "8") {
              storageList.rows[s].value = 5432;
            }
          }
        }
      }
    }
    res.send(storageList);
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post getDBAPPpropety");
})

//存储配置 提交
router.post('/addStorageConfig', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post addStorageConfig");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var proID = xss(req.body.proID);
  var proVer = xss(req.body.proVer);
  var stoDB = req.body.body;
  var dbtype = xss(req.body.dbtype);
  var structDB;
  var tabNameDB;
  var tagGroupDB;
  if (dbtype == '100' || dbtype == "6" || dbtype == "12") {
    tagGroupDB = req.body.tagGroup;
  } else if (dbtype == '9' || dbtype == "10") { //KF3.6不支持KH和KDL
    tagGroupDB = "";
  } 
  //Add by lu.sun [2026/05/20] 增加存储PG库TSDB
  else if(dbtype == '3')
  {
    tagGroupDB = "";  //没用到这条
  }
  // End lu.sun [2026/05/20]  
  else {
    tabNameDB = req.body.tabName;
    structDB = req.body.tabStrc;
    tagGroupDB = req.body.tagGroup;
  }
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  let jsonPath = path.join(tenantDir,proID,'project');
  var proPath = jsonPath + "/DataBaseConfig.json";
  var storageJSON = new Array();
  var sdb = new Object();
  sdb.DBType = parseInt(dbtype);
  for (var i = 0; i < stoDB.length; i++) {
    if (stoDB[i].field == "TableStructrue") {
      sdb[stoDB[i].field] = new Array();
      for (var s = 0; structDB&&s < structDB.length; s++) {
        var strDb = new Object();
        strDb.DataVersion = structDB[s].DataVersion;
        strDb.ProjectName = structDB[s].ProjectName;
        strDb.GroupName = structDB[s].GroupName;
        strDb.AlarmGroupName = structDB[s].AlarmGroupName;
        sdb[stoDB[i].field].push(strDb);
      }
    } else if (stoDB[i].field == "TableNames") {
      sdb[stoDB[i].field] = new Array();
      for (var t = 0; tabNameDB&&t < tabNameDB.length; t++) {
        var strDb = new Object();
        strDb.bool = tabNameDB[t].bool;
        strDb.int = tabNameDB[t].int;
        strDb.float = tabNameDB[t].float;
        strDb.double = tabNameDB[t].double;
        strDb.char = tabNameDB[t].char;
        sdb[stoDB[i].field].push(strDb);
      }
    } else if (stoDB[i].field == "TagGroup") {
      sdb[stoDB[i].field] = new Array();
      if (stoDB[14].value == 1) { //是否按变量组存储TagGroupActive
        for (var g = 0; g < tagGroupDB.length; g++) {
          sdb[stoDB[i].field].push(tagGroupDB[g].VarGroupName);
        }
      }
    } else if (stoDB[i].field == "ObjectTemplateList") {
      var arrTreeID = stoDB[i].value.split(",");
      //读取对象模板信息
      let strObjTempPath = pubInter.joinPath(proID, proVer, "") + "/ObjectTemplateInfo.json";
      let objReadJson = pubInter.readJson(strObjTempPath);
      if (objReadJson.Error) {
        res.send(objReadJson.ErrorDesc);
        return;
      }
      let arrTemplateList = objReadJson.data.ObjectTemplateList;
      sdb[stoDB[i].field] = getTDengineSelect(arrTreeID, arrTemplateList);
    }
    /* else if (stoDB[i].field == "StorageVarList") {
          continue;
        } else if (stoDB[i].field == "StorageDevList") {
          var arrTemp = stoDB[i].value;
          for (let j = 0; j < arrTemp.length; j++) {
            if (arrTemp[j].StorageVarList.length > 0) {
              for (let k = 0; k < arrTemp[j].StorageVarList.length; k++) {
                arrTemp[j].StorageVarList[k].TagDataType = pubInter.GetDataTypeNum(arrTemp[j].StorageVarList[k].TagDataType);
              }
            }
          }
          sdb[stoDB[i].field] = arrTemp;
        } */
    else {
      if (stoDB[i].valueType == "number") {
        sdb[stoDB[i].field] = parseInt(stoDB[i].value);
      } else {
        sdb[stoDB[i].field] = stoDB[i].value;
      }
    }
  }
  var exist = fs.existsSync(proPath);
  if (exist) {
    var strJSON;
    try {
      strJSON = fs.readFileSync(proPath, 'utf-8');
    } catch (error) {
      res.send(error.message);
      return;
    }
    if (strJSON == "" || JSON.parse(strJSON).length == 0) {
      sdb.id = 1;
    } else {
      strJSON = JSON.parse(fs.readFileSync(proPath, 'utf-8'));
      //查看是否有完全相同的存储配置
      let objFind = strJSON.find(function (objStorage) {
        return objStorage.DBType == sdb.DBType && objStorage.HostName == sdb.HostName && objStorage.Port == sdb.Port;
      });
      if (objFind != undefined) {
        res.send("已经存在相同的存储配置");
        return;
      }
      //TDengine对象式和散点式在一个工程中只能有一个
      var nOtherType = 0;
      if (sdb.DBType == 7 || sdb.DBType == 11) {
        if (sdb.DBType == 7) {
          sdb.TagGroup = []; //增加一个TagGroup的字段，否则采集可能采不到数据
          nOtherType = 11;
        } else if (sdb.DBType == 11) {
          nOtherType = 7
        }
        let objFindOther = strJSON.find(function (objStorage) {
          return objStorage.DBType == nOtherType;
        });
        if (objFindOther != undefined) {
          res.send("同一个工程TDengine散点式和对象式存储只能选择一个");
          return;
        }
      }

      if (strJSON.length > 0) {
        sdb.id = parseInt(strJSON[strJSON.length - 1].id) + 1;
      } else {
        sdb.id = 1;
      }
      for (var j = 0; j < strJSON.length; j++) {
        storageJSON.push(strJSON[j]);
      }
    }
    storageJSON.push(sdb);
  } else {
    sdb.id = 1;
    storageJSON.push(sdb);
  }
  //var lastJson = JSON.stringify(storageJSON, '', "\t");

  //fs.writeFileSync(proPath, lastJson);
  res.send(pubInter.writeJson(proPath, storageJSON));
  LogManagerObj.traceLog(projectManagerName, "Leave post addStorageConfig");
})

function getTDengineSelect(arrTreeID, arrTemplateList) {
  var arrTemplateIDs = []; //对象模板ID数组
  var arrObjectIDs = []; //对象ID数组
  for (let j = 0; j < arrTreeID.length; j++) {
    let nTreeID = arrTreeID[j];
    if (Number(nTreeID) % 1 != 0) { //说明不是整数，也就是说是对象
      nTreeID = nTreeID.split(".")[1]; //该对象的ID
      let nParentID = parseInt(arrTreeID[j]); //该对象属于的对象模板ID
      arrObjectIDs.push({
        ObjectID: nTreeID,
        TemplateID: nParentID
      });
    } else { //说明是整数，也就是说是对象模板
      arrTemplateIDs.push(nTreeID);
    }
  }
  var arrSelectTemplateList = [];
  for (let j = 0; j < arrTemplateList.length; j++) {
    let objTemp = JSON.parse(JSON.stringify(arrTemplateList[j]));
    let k = 0;
    for (k = 0; k < arrTemplateIDs.length; k++) {
      if (arrTemplateList[j].TemplateID == arrTemplateIDs[k]) { //如果是对象模板ID，就说明这个对象模板的节点都被选择了
        objTemp = changeTemplateDataType(objTemp);
        arrSelectTemplateList.push(objTemp);
        break;
      }
    }
    if (k == arrTemplateIDs.length) { //说明这个对象模板没有整个节点都被选择
      for (let l = 0; l < arrObjectIDs.length; l++) {
        if (arrObjectIDs[l].TemplateID == arrTemplateList[j].TemplateID) {
          let nIndex = -1;
          let objFind = arrSelectTemplateList.find(function (params, index) {
            if (params.TemplateID == arrObjectIDs[l].TemplateID) {
              nIndex = index;
              return true;
            }
          })
          let objSelectObject = arrTemplateList[j].ObjectList.find(function (params) {
            return params.ObjectID == arrObjectIDs[l].ObjectID;
          }) //应该不会有没找到的情况吧？
          if (objFind == undefined) {
            //表明之前也没有这个对象模板下的对象被选择
            let objTmpTemplate = JSON.parse(JSON.stringify(arrTemplateList[j]));
            objTmpTemplate.ObjectList = [];
            objTmpTemplate.ObjectList.push(objSelectObject);
            objTmpTemplate = changeTemplateDataType(objTmpTemplate);
            arrSelectTemplateList.push(objTmpTemplate);
          } else {
            //表明之前有这个对象模板下的对象被选择
            arrSelectTemplateList[nIndex].ObjectList.push(objSelectObject);
          }
        }
      }
    }
  }
  return arrSelectTemplateList;
}

//将一个对象模板的数据类型由IOserver的数据类型转化为TDengine的数据类型
function changeTemplateDataType(objTemplateInfo) {
  for (let i = 0; i < objTemplateInfo.FieldList.length; i++) {
    objTemplateInfo.FieldList[i].DataType = ConvertIOtoTD(objTemplateInfo.FieldList[i].DataType);
  }
  for (let j = 0; j < objTemplateInfo.LabelList.length; j++) {
    objTemplateInfo.LabelList[j].LabelDataType = ConvertIOtoTD(objTemplateInfo.LabelList[j].LabelDataType);
  }
  return objTemplateInfo;
}

//存储配置 取消
router.post('/cancelStorage', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post cancelStorage");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let strProjectID = req.query.ProjectID;
  let strProjectVersion = req.query.ProjectVersion;
  let strProjectName = req.query.ProjectName;
  let strDBConfigPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/DataBaseConfig.json";
  let objReadJson = pubInter.readJson(strDBConfigPath);
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  let arrDBConfig = objReadJson.data;
  var bDelete = false;
  for (var i = 0; i < arrDBConfig.length; i++) {
    if (arrDBConfig[i].DBType == 7 && arrDBConfig[i].Temp == true) { //当
      arrDBConfig.splice(i, 1);
      bDelete = true;
      break;
    }
  }
  if (bDelete) {
    res.send(pubInter.writeJson(strDBConfigPath, arrDBConfig));
  } else {
    res.send("OK");
  }

})

//存储配置 删除
router.post('/reduceStroage', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post reduceStroage");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var proID = req.query.proID;
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  let basePath = path.join(tenantDir, proID, 'project');
  var configID = JSON.parse(xss(req.query.configID));
  // var basePath = pubInter.joinPath(xss(req.query.proID), xss(req.query.proVer), xss(req.query.proName));
  var proPath = basePath + "/DataBaseConfig.json";
  var storageJSON = new Array();
  let objReadJson = pubInter.readJson(proPath);
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  var strJSON = objReadJson.data;
  //var strJSON = JSON.parse(fs.readFileSync(proPath, 'utf-8'));
  strJSON = strJSON.filter(item=>!configID.includes(item.id))
  for (var j = 0; j < strJSON.length; j++) {
    storageJSON.push(strJSON[j]);
  }
  //var lastJson = JSON.stringify(storageJSON, '', "\t");
  //fs.writeFileSync(proPath, lastJson);
  res.send(pubInter.writeJson(proPath, storageJSON));
  LogManagerObj.traceLog(projectManagerName, "Leave post reduceStroage");
})

//查询单个存储配置 
router.post('/queryOneStorage', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post queryOneStorage");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var comboxData;
  var comboxPath = global.propertyPath + "/selectConfig.json";
  let deviceStrJson = pubInter.readJson(comboxPath); //好像没用到？
  if (deviceStrJson.Error == false) {
    comboxData = deviceStrJson.data.storageConfig;
  } else {
    console.log(deviceStrJson.ErrorDesc);
    res.send(deviceStrJson);
    LogManagerObj.errorLog(projectManagerName, deviceStrJson.ErrorDesc);
    return;
  }
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  let proPath = path.join(tenantDir, req.query.proID, 'project');
  var stID = xss(req.query.StorageID);
  // var proPath = pubInter.joinPath(xss(req.query.proID), xss(req.query.proVer), xss(req.query.proName));
  var stPath = proPath + "/DataBaseConfig.json";
  let strJson = fs.readFile(stPath, function (err, data) {
    if (err) {
      console.log("Load queryOneStorage Failed.");
      console.error(err);
      return;
    }
    let storageList = JSON.parse(data);
    var stType;
    var i = 0;
    for (i; i < storageList.length; i++) {
      if (storageList[i].id == stID) {
        stType = storageList[i].DBType;
        break;
      }
    }
    var propertyPath = global.propertyPath + '/';
    if (stType == 100) {
      propertyPath += 'appConfig.json';
    } else if (stType == 6) {
      propertyPath += 'redisConfig.json';
    } else if (stType == 7) {
      propertyPath += 'TDEngine.json';
    } else if (stType == "9") { //KF3.6不支持KH和KDL
      propertyPath += "KHDbConfig.json";
    } else if (stType == "10") {
      propertyPath += "KDLDbConfig.json";
    } else if (stType == "12") {
      propertyPath += "KHDbWindowsConfig.json";
    } else {
      propertyPath += 'otherDBConfig.json';
    }
    let strJson = fs.readFile(propertyPath, function (err, data) {
      if (err) {
        console.log("Load propertyPath Failed.");
        console.error(err);
        res.send({
          Error: true,
          ErrorDesc: err.message
        })
        return;
      }
      let storageProList = JSON.parse(data).rows;
      if (stType != 100) {
        var obj = {
          "field": "ConifgName",
          "name": "名称",
          "value": "",
          "group": "基本属性"
        };
        storageProList.splice(0, 0, obj);
      }
      for (var m = 0; m < storageProList.length; m++) {
        for (var index in storageProList[m]) {
          if (index == "field") {
            var tem = storageProList[m][index];
            if (tem == "ConifgName") {
              for (var c = 0; c < comboxData.length; c++) {
                if (stType == comboxData[c].id) {
                  storageProList[m].value = comboxData[c].text;
                }
              }
            } else if (tem == "Active" || tem == "Cache" || tem == "TagGroupActive") {
              if (storageList[i][tem] == 1) {
                storageProList[m].value = "是";
              } else {
                storageProList[m].value = "否";
              }
            } else if (tem == "ObjectTemplateList") {
              let strObjPath = pubInter.joinPath(xss(req.query.proID), xss(req.query.proVer), xss(req.query.proName)) + "/ObjectTemplateInfo.json";
              let objReadJson = pubInter.readJson(strObjPath);
              if (objReadJson.Error) {
                res.send(objReadJson);
                return;
              }
              var arrTemplateList = objReadJson.data.ObjectTemplateList; //所有对象模板的列表
              let objTreeInfo = getTemplateTree(arrTemplateList, storageList[i]);
              storageProList[m].editor.options.data = objTreeInfo.Tree;
              storageProList[m].value = objTreeInfo.value;
            } else {
              storageProList[m].value = storageList[i][tem];
            }
          }
        }
      }
      res.send(storageProList);
    })
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post queryOneStorage");
})

//存储配置修改 提交
router.post('/editStorageConfig', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post editStorageConfig");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let proID = xss(req.query.proID);
  let proVer = xss(req.query.proVer);
  var stID = xss(req.query.StorageID);

  let changeRows = pubInter.EscapeAllData(req.body);
  let changeValue = pubInter.EscapeAllData(req.query.changeValue);
  const projectGroupService= tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  let pathA = require("path")
  let proPath = pathA.join(tenantDir,proID,'project');
  // var proPath = pubInter.joinPath(proID, proVer, xss(req.query.proName));
  var path = proPath + "/DataBaseConfig.json";
  let strJson = fs.readFile(path, 'utf-8', function (err, data) {
    if (err) {
      console.log("editStorageConfig Load DataBaseConfig.json Failed.");
      console.error(err);
      return;
    }
    let proInfo = JSON.parse(data);
    for (var i = 0; i < proInfo.length; i++) {
      if (stID == proInfo[i].id) {
        // if (changeValue == "是") {
        //   proInfo[i][changeField] = 1;
        // } else if (changeValue == "否") {
        //   proInfo[i][changeField] = 0;
        // } else {
        //   if (changeField == "Port" || changeField == "StorageInterval" || changeField == "TimeOut"
        //     || changeField == "CacheFileSize") {
        //     proInfo[i][changeField] = parseInt(changeValue);
        //   } else {
        //     proInfo[i][changeField] = changeValue;
        //   }
        // }
        for (let j = 0; j < changeRows.length; j++) {
          let changeRow = changeRows[j];
          if (changeRow.field == "ObjectTemplateList") {
            var arrTreeID = changeRow.value.split(",");
            //读取对象模板信息
            let strObjTempPath = pubInter.joinPath(proID, proVer, "") + "/ObjectTemplateInfo.json";
            let objReadJson = pubInter.readJson(strObjTempPath);
            if (objReadJson.Error) {
              res.send(objReadJson.ErrorDesc);
              return;
            }
            let arrTemplateList = objReadJson.data.ObjectTemplateList;
            proInfo[i][changeRow.field] = getTDengineSelect(arrTreeID, arrTemplateList);
            proInfo[i].TagGroup = ["root"]; //不写TagGroup这个参数
          } else if (changeRow.valueType && changeRow.valueType == "number") {
            proInfo[i][changeRow.field] = parseInt(changeRow.value);
          } else {
            proInfo[i][changeRow.field] = changeRow.value;
          }
          if (proInfo[i].TagGroupActive == 0) {
            proInfo[i].TagGroup = [];
          }
        }
      }
    }
    //fs.writeFileSync(path, JSON.stringify(proInfo, '', "\t"));
    res.send(pubInter.writeJson(path, proInfo));
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post editStorageConfig");
})

//属性修改表结构 表名称 变量组
router.post('/editPropertyTable', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post editPropertyTable");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var stID = xss(req.query.StorageID);
  let tabType = xss(req.query.tabType);
  let modyData = pubInter.EscapeAllData(req.body.array);
  var proPath = pubInter.joinPath(xss(req.query.proID), xss(req.query.proVer), xss(req.query.proName));
  var path = proPath + "/DataBaseConfig.json";
  let strJson = fs.readFile(path, 'utf-8', function (err, data) {
    if (err) {
      console.log("editPropertyTable Load DataBaseConfig.json Failed.");
      console.error(err);
      return;
    }
    let proInfo = JSON.parse(data);
    var i = 0;
    for (i; i < proInfo.length; i++) {
      if (stID == proInfo[i].id) {
        if (tabType == "tabStructrue") {
          proInfo[i].TableStructrue.splice(0, proInfo[i].TableStructrue.length);
        }
        if (tabType == "tabNames") {
          proInfo[i].TableNames.splice(0, proInfo[i].TableNames.length);
        }
        if (tabType == "tagGroup") {
          proInfo[i].TagGroup.splice(0, proInfo[i].TagGroup.length);
        }
        break;
      }
    }

    if (tabType == "tabStructrue") {
      for (var m = 0; m < modyData.length; m++) {
        var temp = new Object();
        temp.DataVersion = modyData[m].DataVersion;
        temp.ProjectName = modyData[m].ProjectName;
        temp.GroupName = modyData[m].GroupName;
        temp.AlarmGroupName = modyData[m].AlarmGroupName;
        proInfo[i].TableStructrue.push(temp);
      }
    }
    if (tabType == "tabNames") {
      for (var n = 0; n < modyData.length; n++) {
        var temp = new Object();
        temp.bool = modyData[n].bool;
        temp.int = modyData[n].int;
        temp.float = modyData[n].float;
        temp.double = modyData[n].double;
        temp.char = modyData[n].char;
        proInfo[i].TableNames.push(temp);
      }
    }
    if (tabType == "tagGroup") {
      for (var t = 0; t < modyData.length; t++) {
        proInfo[i].TagGroup.push(modyData[t].VarGroupName);
      }
    }
    //var lastJson = JSON.stringify(proInfo, '', "\t");
    //fs.writeFileSync(path, lastJson);
    res.send(pubInter.writeJson(path, proInfo));
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post editPropertyTable");
})

//存储配置 变量组树 初始化
router.post('/getVarGroupList', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getVarGroupList");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var proPath = pubInter.joinPath(xss(req.query.proID), xss(req.query.proVer), xss(req.query.proName));
  var path = proPath + "/VarGroupInfo.json";
  let strJson = fs.readFile(path, 'utf-8', function (err, data) {
    if (err) {
      console.log("getVarGroupList Load VarGroupInfo.json Failed.");
      console.error(err);
      return;
    }
    let proInfo = JSON.parse(data).TagGroupList;
    var treeArry = new Array();

    var count = 0;
    traveVarGroupToTree(proInfo, treeArry, count);
    ///*
    var treeObj = new Object();
    treeObj.id = 0;
    treeObj.text = 'root';
    treeArry.unshift(treeObj);
    //*///add by xin.wang 2020-04-15
    res.send(treeArry);
  });
  LogManagerObj.traceLog(projectManagerName, "Leave post getVarGroupList");
})

function traveVarGroupToTree(JsonList, reaArry, count) {
  LogManagerObj.traceLog(projectManagerName, "Enter function traveVarGroupToTree");
  for (var i = 0; i < JsonList.length; i++) {
    if (JsonList[i].TagGroupName == undefined) {
      continue;
    } else {
      var treeObj = new Object();
      treeObj.id = count + 1;
      count++;
      treeObj.text = JsonList[i].TagGroupName;
      if (JsonList[i].TagObjectList == undefined) {
        reaArry.push(treeObj);
      } else {
        treeObj.children = [];
        reaArry.push(treeObj);
        traveVarGroupToTree(JsonList[i].TagObjectList, reaArry[reaArry.length - 1].children, count);
      }
    }
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function traveVarGroupToTree");
  return reaArry;
}

//获取对象模板（超级表）列表
router.post('/getObjectTemplist', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getObjectTemplist");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  req.query = pubInter.EscapeAllData(req.query);
  let strObjPath = pubInter.joinPath(req.query.ProjectID, req.query.ProjectVersion, req.query.ProjectName) + "/ObjectTemplateInfo.json";
  let strDataBaseJson = "";
  var objErrOut = {
    Error: false,
    ErrorDesc: ""
  }

  //由于之前没有ObjectTemplateInfo.json这个文件，所以这里进行一下判断并新建一个
  if (!fs.existsSync(strObjPath)) {
    var objEmptyData = {
      ObjectTemplateList: []
    }
    let strWr = pubInter.writeJson(strObjPath, objEmptyData);
    if (strWr != "OK") {
      objErrOut.ErrorDesc = strWr;
      objErrOut.Error = true;
      res.send(objErrOut);
      return;
    }
  }
  try {
    strDataBaseJson = fs.readFileSync(strObjPath);
  } catch (error) {
    objErrOut.ErrorDesc = error.message;
    objErrOut.Error = true;
    res.send(objErrOut);
    return;
  }
  if (strDataBaseJson == "") { //由于原始的DataBaseConfig.json可能为空，因此有此判断。后续可能删掉
    objErrOut.total = 0;
    objErrOut.rows = [];
    res.send(objErrOut);
    return;
  }
  let objDataBaseJson = {};
  try {
    objDataBaseJson = JSON.parse(strDataBaseJson);
  } catch (error) {
    objErrOut.ErrorDesc = error.message;
    objErrOut.Error = true;
    res.send(objErrOut);
    return;
  }

  objErrOut.total = objDataBaseJson.ObjectTemplateList.length;
  objErrOut.rows = objDataBaseJson.ObjectTemplateList;
  res.send(objErrOut);
})

//获取一个存储配置的对象模板树
router.post('/getObjectTree', function (req, res) {
  req.query = pubInter.EscapeAllData(req.query);
  let strObjPath = pubInter.joinPath(req.query.ProjectID, req.query.ProjectVersion, req.query.ProjectName) + "/ObjectTemplateInfo.json";
  var objErrOut = {
    Error: false,
    ErrorDesc: ""
  }
  let objReadJson = pubInter.readJson(strObjPath);
  if (objReadJson.Error) {
    res.send(objReadJson);
    return;
  }
  var arrTemplateList = objReadJson.data.ObjectTemplateList; //所有对象模板的列表

  //读取数据库配置
  let strDBConfigPath = pubInter.joinPath(req.query.ProjectID, req.query.ProjectVersion, req.query.ProjectName) + "/DataBaseConfig.json";
  let strDBJson = "";
  try {
    strDBJson = fs.readFileSync(strDBConfigPath);
  } catch (error) {
    objErrOut.Error = true;
    objErrOut.ErrorDesc = error.message;
    res.send(objErrOut);
    return;
  }
  let arrDBConfig = [];
  if (strDBJson != "") {
    try {
      arrDBConfig = JSON.parse(strDBJson);
    } catch (error) {
      objErrOut.Error = true;
      objErrOut.ErrorDesc = error.message;
      res.send(objErrOut);
      return;
    }
  }
  let objTDengine = arrDBConfig.find(function (params) {
    return params.DBType == 7;
  })

  //构建对象模板树
  var objTemplateTree = getTemplateTree(arrTemplateList, objTDengine);
  objErrOut.rows = objTemplateTree.Tree;
  objErrOut.total = objTemplateTree.Tree.length;
  res.send(objErrOut)
})

//构建对象模板树
function getTemplateTree(arrTemplateList, objTDengine) {
  var objTreeInfo = {}
  var arrTree = [];
  var strTreeValue = "";
  var arrTDengineTemp = [];
  if (objTDengine != undefined) {
    arrTDengineTemp = objTDengine.ObjectTemplateList; //TDengine存储配置中的对象模板列表
  }
  for (let i = 0; i < arrTemplateList.length; i++) {
    let objTreeNode = {
      id: arrTemplateList[i].TemplateID,
      text: arrTemplateList[i].TemplateName,
      state: "open",
      checked: false,
      children: []
    }
    if (arrTemplateList[i].ObjectList.length > 0) {
      let objFindTemplate = arrTDengineTemp.find(function (template) {
        return template.TemplateID == arrTemplateList[i].TemplateID;
      })
      if (objFindTemplate != undefined && objFindTemplate.ObjectList.length == arrTemplateList[i].ObjectList.length) {
        strTreeValue += (objFindTemplate.TemplateID + ",");
      }
      for (let j = 0; j < arrTemplateList[i].ObjectList.length; j++) {
        let objObjTreeNode = {
          id: arrTemplateList[i].TemplateID + "." + arrTemplateList[i].ObjectList[j].ObjectID,
          text: arrTemplateList[i].ObjectList[j].ObjectName,
          state: "open",
          checked: false,
          children: []
        }
        if (objFindTemplate != undefined) {
          let objFindObject = objFindTemplate.ObjectList.find(function (object) {
            return object.ObjectID == arrTemplateList[i].ObjectList[j].ObjectID;
          })
          if (objFindObject != undefined) {
            objObjTreeNode.checked = true;
            strTreeValue += (objFindTemplate.TemplateID + "." + objFindObject.ObjectID + ",");
          }
        }
        objTreeNode.children.push(objObjTreeNode)
      }
    }
    arrTree.push(objTreeNode);
  }
  objTreeInfo.Tree = arrTree;
  if (strTreeValue[strTreeValue.length - 1] == ",") {
    strTreeValue = strTreeValue.substring(0, strTreeValue.length - 1);
  }
  objTreeInfo.value = strTreeValue;
  return objTreeInfo;
}

//初始化新建对象模板
router.post('/initObjectTemplate', function (req, res) {
  let strObjTempJsonPath = global.propertyPath + "/objectTemplate.json";
  let objReadJson = pubInter.readJson(strObjTempJsonPath);
  if (objReadJson.Error) {
    res.send(objReadJson);
    return;
  }
  var objOutput = {
    Error: false,
    rows: objReadJson.data.rows,
    total: objReadJson.data.rows.length,
  }
  res.send(objOutput);
})

//新建对象模板
router.post('/addNewTemplate', function (req, res) {
  let strProjectID = xss(req.query.ProjectID);
  let strProjectVersion = xss(req.query.ProjectVersion);
  let strObjPath = pubInter.joinPath(strProjectID, strProjectVersion, "") + "/ObjectTemplateInfo.json";
  if (!fs.existsSync(strObjPath)) {
    var objReadJson = {
      data: {
        ObjectTemplateList: []
      }
    };
    let strWr = pubInter.writeJson(strObjPath, objReadJson.data);
    if (strWr != "OK") {
      res.send(strWr);
      return;
    }
  } else {
    var objReadJson = pubInter.readJson(strObjPath);
    if (objReadJson.Error) {
      res.send(objReadJson.ErrorDesc);
      return;
    }
  }

  //读取对象配置
  var objTemplateInfo = JSON.parse(xss(req.body.TemplateInfo));
  let arrTemplateList = objReadJson.data.ObjectTemplateList;;
  let objTemplate = {};
  for (let j = 0; j < objTemplateInfo.rows.length; j++) {
    if (objTemplateInfo.rows[j].valueType == "object" && typeof (objTemplateInfo.rows[j].value) == "string") {
      objTemplateInfo.rows[j].value = JSON.parse(objTemplateInfo.rows[j].value);
    }
    objTemplate[objTemplateInfo.rows[j].field] = objTemplateInfo.rows[j].value;
  }
  //确保ObjectList字段是数组不是字符串
  /* if (typeof(objTemplate.ObjectList) == "string") {
    objTemplate.ObjectList = JSON.parse(objTemplate.ObjectList);
  } */
  //查找是否有重名的对象模板
  let objFindDuplicate = arrTemplateList.find(function (template) {
    return template.TemplateName == objTemplate.TemplateName;
  })
  if (objFindDuplicate != undefined) {
    res.send("对象模板重名");
    return;
  }

  //生成对象模板ID
  if (arrTemplateList.length > 0) {
    objTemplate.TemplateID = Number(arrTemplateList[arrTemplateList.length - 1].TemplateID) + 1;
  } else {
    objTemplate.TemplateID = 1;
  }
  arrTemplateList.push(objTemplate);
  res.send(pubInter.writeJson(strObjPath, objReadJson.data));
})

//删除对象模板
router.post("/deleteTemplate", function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post deleteTemplate");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let strProjectID = req.query.ProjectID;
  let strProjectVersion = req.query.ProjectVersion;
  let strProjectName = req.query.ProjectName;
  let strObjConfigPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/ObjectTemplateInfo.json";
  let objReadJson = pubInter.readJson(strObjConfigPath);
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  var arrTemplateList = objReadJson.data.ObjectTemplateList;
  var arrDeleteTemplate = req.body.DeleteList;
  for (let i = arrTemplateList.length - 1; i >= 0; i--) {
    for (let j = 0; j < arrDeleteTemplate.length; j++) {
      if (arrTemplateList[i].TemplateID == arrDeleteTemplate[j].TemplateID) {
        arrTemplateList.splice(i, 1);
        break;
      }
    }
  }

  //删除存储配置中的对象模板
  let strDBConfigPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/DataBaseConfig.json";
  let objReadDB = pubInter.readJson(strDBConfigPath);
  if (objReadDB.Error) {
    res.send(objReadDB.ErrorDesc);
    return;
  }
  var arrDBConfig = objReadDB.data;
  for (let i = 0; i < arrDBConfig.length; i++) {
    if (arrDBConfig[i].DBType == 7) {
      var arrTemplate = arrDBConfig[i].ObjectTemplateList;
      for (let j = arrTemplate.length - 1; j >= 0; j--) {
        for (let k = 0; k < arrDeleteTemplate.length; k++) {
          if (arrDeleteTemplate[k].TemplateName == arrTemplate[j].TemplateName) {
            arrTemplate.splice(j, 1);
            break;
          }
        }
      }
    }
  }
  let strWrite = pubInter.writeJson(strObjConfigPath, objReadJson.data);
  if (strWrite != "OK") {
    res.send(strWrite);
    return;
  }
  res.send(pubInter.writeJson(strDBConfigPath, arrDBConfig));
})

//编辑对象模板
router.post("/editTemplate", function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post deleteTemplate");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let strProjectID = req.query.ProjectID;
  let strProjectVersion = req.query.ProjectVersion;
  let strProjectName = req.query.ProjectName;
  let strObjPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/ObjectTemplateInfo.json";
  let objReadJson = pubInter.readJson(strObjPath);
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  var arrObjConfig = objReadJson.data.ObjectTemplateList;
  var arrEditTemplate = req.body.TemplateInfo;
  var objEditTemplate = {};
  let strChangeField = req.body.ChangeField;
  for (let i = 0; i < arrEditTemplate.length; i++) {
    if (arrEditTemplate[i].value) {
      if (arrEditTemplate[i].valueType == "object" && typeof (arrEditTemplate[i].value) == "string") {
        arrEditTemplate[i].value = JSON.parse(arrEditTemplate[i].value);
      }
      objEditTemplate[arrEditTemplate[i].field] = arrEditTemplate[i].value;
    } else if (arrEditTemplate[i].valueType == "string") {
      objEditTemplate[arrEditTemplate[i].field] = "";
    } else {
      objEditTemplate[arrEditTemplate[i].field] = [];
    }

  }
  /* if (typeof(objEditTemplate.ObjectList) == "string") {
    objEditTemplate.ObjectList = JSON.parse(objEditTemplate.ObjectList);
  } */
  for (let i = 0; i < arrObjConfig.length; i++) {
    if (arrObjConfig[i].TemplateID == objEditTemplate.TemplateID) {
      //获取修改的信息，如果修改的是字段属性（成员属性）或者标签属性（属性）那么还需要修改模板下的对象
      if (strChangeField == "FieldList" || strChangeField == "LabelList") {
        var arrObjectList = objEditTemplate.ObjectList;
        if (strChangeField == "FieldList") {
          //读取变量数据
          let strVarPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/VarInfo.json";
          let objReadVar = pubInter.readJson(strVarPath);
          if (objReadVar.Error) {
            res.send(objReadVar.ErrorDesc);
            return;
          }
          let arrVarList = objReadVar.data.TagList;
          let objVarDataType = {};
          for (let j = 0; j < arrVarList.length; j++) {
            objVarDataType[arrVarList[j].TagName] = arrVarList[j].TagDataType; //判断修改后的对象模板的字段的数据类型是否还能匹配原来对象关联的变量的数据类型
          }
          for (let j = 0; j < arrObjectList.length; j++) {
            var nOldLength = arrObjectList[j].TagList.length; //原来的字段列表长度
            for (let k = 0; k < objEditTemplate.FieldList.length; k++) {
              arrObjectList[j].TagList.push({
                FieldName: objEditTemplate.FieldList[k].FieldName,
                TagName: (k < nOldLength && isMatchDataType(objVarDataType[arrObjectList[j].TagList[k].TagName], objEditTemplate.FieldList[k].DataType)) ? arrObjectList[j].TagList[k].TagName : ""
              })
            }
            arrObjectList[j].TagList.splice(0, nOldLength);
          }
        } else if (strChangeField == "LabelList") {
          //前3个标签（属性）不能修改
          var arrOldObjectList = arrObjConfig[i].ObjectList;
          var arrOldLabelList = arrObjConfig[i].LabelList;
          for (let k = 0; k < objEditTemplate.ObjectList.length; k++) {
            let j = 0;
            for (j = 3; j < objEditTemplate.LabelList.length; j++) {
              if (j < arrOldLabelList.length && objEditTemplate.LabelList[j].LabelName != arrOldLabelList[j].LabelName) {
                objEditTemplate.ObjectList[k][objEditTemplate.LabelList[j].LabelName] = arrOldObjectList[k][arrOldLabelList[j].LabelName];
                delete objEditTemplate.ObjectList[k][arrOldLabelList[j].LabelName];
              } else if (j >= arrOldLabelList.length) {
                if (objEditTemplate.LabelList[j].LabelDataType == "String") {
                  objEditTemplate.ObjectList[k][objEditTemplate.LabelList[j].LabelName] = "";
                } else {
                  objEditTemplate.ObjectList[k][objEditTemplate.LabelList[j].LabelName] = 0;
                }
              }
            }
            if (objEditTemplate.LabelList.length < arrOldLabelList.length) {
              for (j = objEditTemplate.LabelList.length; j < arrOldLabelList.length; j++) {
                delete objEditTemplate.ObjectList[k][arrOldLabelList[j].LabelName];
              }
            }
          }

        }
      } else if (strChangeField == "ObjectList" && typeof (objEditTemplate.ObjectList) != "object") {
        objEditTemplate.ObjectList = JSON.parse(objEditTemplate.ObjectList);
      }
      arrObjConfig[i] = objEditTemplate;
    } else if (arrObjConfig[i].TemplateName == objEditTemplate.TemplateName) {
      res.send("对象模板重名");
      return;
    }
  }

  //修改存储配置中对应的对象配置
  let strDBConfigPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/DataBaseConfig.json";
  let objReadDB = pubInter.readJson(strDBConfigPath);
  if (objReadDB.Error) {
    res.send(objReadDB.ErrorDesc);
    return;
  }
  var arrDBConfig = objReadDB.data;
  for (let i = 0; i < arrDBConfig.length; i++) {
    if (arrDBConfig[i].DBType == 7) { //目前只有TDengine存储支持对象存储
      let arrDBtemplate = arrDBConfig[i].ObjectTemplateList;
      for (let j = 0; j < arrDBtemplate.length; j++) {
        if (arrDBtemplate[j].TemplateID == objEditTemplate.TemplateID) {
          arrDBtemplate[j] = changeTemplateDataType(JSON.parse(JSON.stringify(objEditTemplate)));
          break;
        }
      }
      break;
    }
  }

  let strWrite = pubInter.writeJson(strObjPath, objReadJson.data);
  if (strWrite != "OK") {
    res.send(strWrite);
    return
  }
  res.send(pubInter.writeJson(strDBConfigPath, arrDBConfig));
})

//将数据类型从IOserver的数据类型转化为TDengine的数据类型
function ConvertIOtoTD(strDataType) {
  var strTDengineDataType = "";
  switch (strDataType) {
    case "Bool":
      strTDengineDataType = "Bool";
      break;
    case "Char":
      strTDengineDataType = "TINYINT";
      break;
    case "Byte":
      strTDengineDataType = "SMALLINT";
      break;
    case "Short":
      strTDengineDataType = "SMALLINT";
      break;
    case "Ushort":
      strTDengineDataType = "INT";
      break;
    case "BCD":
      strTDengineDataType = "INT";
      break;
    case "LongBCD":
      strTDengineDataType = "BIGINT";
      break;
    case "Int64":
      strTDengineDataType = "BIGINT";
      break;
    case "Long":
      strTDengineDataType = "INT";
      break;
    case "Ulong":
      strTDengineDataType = "BIGINT";
      break;
    case "Float":
      strTDengineDataType = "FLOAT";
      break;
    case "Double":
      strTDengineDataType = "DOUBLE";
      break;
    case "String":
      strTDengineDataType = "BINARY";
      break;
    default:
      strTDengineDataType = strDataType;
      break;
  }
  return strTDengineDataType;
}

//将数据类型的数字转化为字符
function GetDataTypeString(MemberDataType) {
  //VarLogManagerObj.traceLog(VarManagerName, "Enter function GetDataTypeString");
  var strDataType = "";
  switch (MemberDataType) {
    case 1:
      strDataType = "Bool";
      break;
    case 2:
      strDataType = "Byte";
      break;
    case 4:
      strDataType = "Short";
      break;
    case 8:
      strDataType = "Ushort";
      break;
    case 16:
      strDataType = "BCD";
      break;
    case 32:
      strDataType = "Long";
      break;
    case 64:
      strDataType = "LongBCD";
      break;
    case 128:
      strDataType = "Float";
      break;
    case 256:
      strDataType = "String";
      break;
    case 512:
      strDataType = "Double";
      break;
    case 1024:
      strDataType = "BLOB";
      break;
    case 2048:
      strDataType = "Int64";
      break;
    case 4096:
      strDataType = "Char";
      break;
    case 8192:
      strDataType = "Ulong";
      break;
    case 16384:
      strDataType = "Struct";
      break;
  }
  return strDataType;
}

//判断字段数据类型和变量数据类型是否匹配，strIODataType：变量数据类型，strTDDataType：字段数据类型
function isMatchDataType(strIODataType, strTDDataType) {
  strIODataType = GetDataTypeString(strIODataType);
  if (strIODataType == strTDDataType) {
    return true
  } else if (strIODataType == "String" && (strTDDataType == "String")) { //均为字符串类型
    return true
  } else if (strTDDataType == "Int64" && (strIODataType != "Bool" && strIODataType != "Char" && strIODataType != "Float" && strIODataType != "Double" && strIODataType != "String" && strIODataType != "Struct")) { //TDengine数据类型为长整形的时候可以兼容所有整形
    return true;
  } else if (strTDDataType == "Long" && (strIODataType == "Long" || strIODataType == "Short" || strIODataType == "Ushort" || strIODataType == "Byte")) { //TDengine数据类型为4字节整形的时候可以兼容long、byte和short类型
    return true;
  } else if (strTDDataType == "Ulong" && (strIODataType == "Ulong" || strIODataType == "Short" || strIODataType == "Ushort" || strIODataType == "Byte")) {
    return true;
  } else if (strTDDataType == "Short" && (strIODataType == "Short" || strIODataType == "Byte")) { ////TDengine数据类型为2字节整形的时候可以兼容byte和short类型
    return true;
  } else if (strTDDataType == "Ushort" && (strIODataType == "Ushort" || strIODataType == "Byte")) { ////TDengine数据类型为2字节整形的时候可以兼容byte和short类型
    return true;
  } else {
    return false;
  }
}

//获取对象（普通表）列表
router.post('/getObjectList', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getObjectList");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let strProjectID = req.query.ProjectID;
  let strProjectVersion = req.query.ProjectVersion;
  let strObjectTemplate = req.query.ObjectTemplateName;
  let strObjPath = pubInter.joinPath(strProjectID, strProjectVersion, "") + "/ObjectTemplateInfo.json";
  var objReturn = {
    Error: false,
    ErrorDesc: ""
  }
  let strReadJson = "";
  if (!fs.existsSync(strObjPath)) {
    objReturn.total = 0;
    objReturn.rows = [];
    res.send(objReturn);
    return;
  }
  try {
    strReadJson = fs.readFileSync(strObjPath);
  } catch (error) {
    objReturn.Error = true;
    objReturn.ErrorDesc = error.message;
    res.send(objReturn);
    return;
  }

  //读取数据库配置，若json文件为空则表示没有配置过
  var objDBConfig = [];
  if (strReadJson != "") {
    try {
      objDBConfig = JSON.parse(strReadJson);
    } catch (error) {
      objReturn.Error = true;
      objReturn.ErrorDesc = error.message;
      res.send(objReturn);
      return;
    }
  }

  objReturn.total = 0;
  objReturn.rows = [];
  if (objDBConfig.ObjectTemplateList) {
    for (let j = 0; j < objDBConfig.ObjectTemplateList.length; j++) {
      if (objDBConfig.ObjectTemplateList[j].TemplateName == strObjectTemplate) {
        for (let k = 0; k < objDBConfig.ObjectTemplateList[j].length; k++) {
          let strRelationType = objDBConfig.ObjectTemplateList[j][k].RelationType;
          strRelationType = (objDBConfig.ObjectTemplateList[j].RelationType == 0) ? "关联设备" : "关联变量组"
          objDBConfig.ObjectTemplateList[j].RelationType = strRelationType;
        }
        objReturn.total = objDBConfig.ObjectTemplateList[j].ObjectList.length;
        objReturn.rows = objDBConfig.ObjectTemplateList[j].ObjectList;
        break;
      }
    }
  }
  res.send(objReturn);
})

//新建对象
router.post('/addNewObject', function (req, res) {
  let strProjectID = req.query.ProjectID;
  let strProjectVersion = req.query.ProjectVersion;
  let strProjectName = req.query.ProjectName;
  var strTemplateName = req.query.TemplateName; //对象模板名称
  let strObjConfigPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/ObjectTemplateInfo.json";
  let objReadJson = pubInter.readJson(strObjConfigPath); //读取数据库存储配置
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  var arrNewObjectInfo = JSON.parse(req.body.ObjectInfo);
  var objNewObject = {};
  for (let i = 0; i < arrNewObjectInfo.length; i++) {
    if (arrNewObjectInfo[i].group != "成员属性") {
      if (arrNewObjectInfo[i].valueType == "number") {
        objNewObject[arrNewObjectInfo[i].field] = Number(arrNewObjectInfo[i].value);
      } else {
        objNewObject[arrNewObjectInfo[i].field] = arrNewObjectInfo[i].value;
      }

    } else {
      if (!objNewObject.TagList) {
        objNewObject.TagList = [];
      }
      objNewObject.TagList.push({
        FieldName: arrNewObjectInfo[i].field,
        TagName: arrNewObjectInfo[i].value
      })
    }
  }
  var arrDBConfig = objReadJson.data.ObjectTemplateList;
  let objTemplate = arrDBConfig.find(function (template) {
    return template.TemplateName == strTemplateName;
  })
  if (objTemplate == undefined) {
    res.send("对象模板不存在");
    return;
  }
  let objFindObject = objTemplate.ObjectList.find(function (object) {
    return object.ObjectName == objNewObject.ObjectName;
  })
  if (objFindObject != undefined) {
    res.send("存在相同名称的对象");
    return;
  }
  objTemplate.ObjectList.push(objNewObject);
  let strWrite = pubInter.writeJson(strObjConfigPath, objReadJson.data);
  res.send(strWrite);
})

//编辑对象（普通表）
router.post("/editObject", function (req, res) {
  let strProjectID = req.query.ProjectID;
  let strProjectVersion = req.query.ProjectVersion;
  let strProjectName = req.query.ProjectName;
  var strTemplateName = req.query.TemplateName; //对象模板名称
  let strObjPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/ObjectTemplateInfo.json";
  let objReadJson = pubInter.readJson(strObjPath); //读取数据库存储配置
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  var arrObjTemplate = objReadJson.data.ObjectTemplateList;

  var arrEditObjectInfo = req.body.ObjectInfo;
  var objEditObject = {};
  for (let i = 0; i < arrEditObjectInfo.length; i++) {
    if (arrEditObjectInfo[i].group != "成员属性") {
      objEditObject[arrEditObjectInfo[i].field] = arrEditObjectInfo[i].value;
    } else {
      if (!objEditObject.TagList) {
        objEditObject.TagList = [];
      }
      objEditObject.TagList.push({
        FieldName: arrEditObjectInfo[i].field,
        TagName: arrEditObjectInfo[i].value
      })
    }
  }

  for (let i = 0; i < arrObjTemplate.length; i++) {
    if (arrObjTemplate[i].TemplateName == strTemplateName) {
      for (let j = 0; j < arrObjTemplate[i].ObjectList.length; j++) {
        if (objEditObject.ObjectID == arrObjTemplate[i].ObjectList[j].ObjectID) {
          arrObjTemplate[i].ObjectList[j] = objEditObject;
        } else if (objEditObject.ObjectName == arrObjTemplate[i].ObjectList[j].ObjectName) {
          res.send("存在相同名称的对象");
          return;
        }
      }
      break;
    }
  }

  //修改存储配置中的对象信息
  let strDBConfigPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/DataBaseConfig.json";
  let objReadDB = pubInter.readJson(strDBConfigPath);
  if (objReadDB.Error) {
    res.send(objReadDB.ErrorDesc);
    return;
  }
  var arrDBConfig = objReadDB.data;
  for (let i = 0; i < arrDBConfig.length; i++) {
    if (arrDBConfig[i].DBType == 7) {
      for (let j = 0; j < arrDBConfig[i].ObjectTemplateList.length; j++) {
        if (arrDBConfig[i].ObjectTemplateList[j].TemplateName == strTemplateName) {
          let arrObjectList = arrDBConfig[i].ObjectTemplateList[j].ObjectList;
          for (let k = 0; k < arrObjectList.length; k++) {
            if (objEditObject.ObjectID == arrObjectList[k].ObjectID) {
              arrObjectList[k] = objEditObject;
            }
          }
          break;
        }
      }
      break;
    }
  }

  let strWrite = pubInter.writeJson(strObjPath, objReadJson.data);
  if (strWrite != "OK") {
    res.send(strWrite);
    return;
  }
  res.send(pubInter.writeJson(strDBConfigPath, arrDBConfig));
})

//删除对象（普通表）
router.post("/deleteObject", function (req, res) {
  let strProjectID = req.query.ProjectID;
  let strProjectVersion = req.query.ProjectVersion;
  let strProjectName = req.query.ProjectName;
  var strTemplateName = req.query.TemplateName; //对象模板名称
  let strObjPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/ObjectTemplateInfo.json";
  let objReadJson = pubInter.readJson(strObjPath); //读取数据库存储配置
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  var arrObjTemplate = objReadJson.data.ObjectTemplateList;

  //查找指定的对象
  var arrDeleteObject = req.body.DeleteList;
  for (let j = 0; j < arrObjTemplate.length; j++) {
    if (arrObjTemplate[j].TemplateName == strTemplateName) {
      let arrObjectList = arrObjTemplate[j].ObjectList;
      for (let k = arrObjectList.length - 1; k >= 0; k--) {
        for (let l = 0; l < arrDeleteObject.length; l++) {
          if (arrDeleteObject[l].ObjectID == arrObjectList[k].ObjectID) {
            arrObjectList.splice(k, 1);
            break;
          }
        }
      }
      break;
    }
  }

  //删除存储配置中的对象
  let strDBConfigPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/DataBaseConfig.json";
  let objReadDB = pubInter.readJson(strDBConfigPath);
  if (objReadDB.Error) {
    res.send(objReadDB.ErrorDesc);
    return;
  }
  var arrDBConfig = objReadDB.data;
  for (let i = 0; i < arrDBConfig.length; i++) {
    if (arrDBConfig[i].DBType == 7) {
      for (let j = 0; j < arrDBConfig[i].ObjectTemplateList.length; j++) {
        if (arrDBConfig[i].ObjectTemplateList[j].TemplateName == strTemplateName) {
          let arrObjectList = arrDBConfig[i].ObjectTemplateList[j].ObjectList;
          for (let k = arrObjectList.length - 1; k >= 0; k--) {
            for (let l = 0; l < arrDeleteObject.length; l++) {
              if (arrDeleteObject[l].ObjectID == arrObjectList[k].ObjectID) {
                arrObjectList.splice(k, 1);
                break;
              }
            }
          }
          break;
        }
      }
      break;
    }
  }

  let strWrite = pubInter.writeJson(strObjPath, objReadJson.data);
  if (strWrite != "OK") {
    res.send(strWrite);
    return;
  }
  res.send(pubInter.writeJson(strDBConfigPath, arrDBConfig));
})

//转发配置 下拉框
router.post('/getTransCom', function (req, res) {
  let objCom = pubInter.readJson(global.propertyPath + '/selectConfig.json');
  if (objCom.Error) {
    res.send(objCom);
    return;
  }
  let comData = objCom.data.transConfig;
  //let comData = JSON.parse(fs.readFileSync(global.propertyPath + '/selectConfig.json','utf-8')).transConfig;
  var transValue = [{
    "name": "云平台类型",
    "field": "transType",
    "value": "5",
    "group": "选择",
    "editor": {
      "type": "combobox",
      "options": {
        "data": comData,
        "editable": false,
        "valueField": "id",
        "textField": "text",
        "panelHeight": "auto"
      }
    }
  }];
  res.send(transValue);
  LogManagerObj.traceLog(projectManagerName, "Leave post getTransCom");
})

//转发配置 查询
router.post('/getTransDBConfig', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getTransDBConfig");
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  let proPertyPath = path.join(tenantDir, req.query.proID, 'project');
  var dbArry = new Array();
  var transPath = proPertyPath + '/DataTransConfig.json';
  if (fs.existsSync(transPath)) {
    fs.readFile(transPath, 'utf-8', function (err, data) {
      if (err) {
        console.log("getTransDBConfig Load DataTransConfig.json Failed.");
        console.error(err);
        return;
      }
      if (data == "") {
        res.send(dbArry);
        return;
      }
      let storageList = JSON.parse(data); //.CloudPlatform;
      if (storageList.CloudPlatform) {
        storageList = storageList.CloudPlatform;
      }
      for (var i = 0; i < storageList.length; i++) {
        var dbObj = new Object();
        dbObj.ID = storageList[i].ID;
        dbObj.Name = storageList[i].Name;
        dbObj.Type = storageList[i].Type;
        dbObj.Provider = storageList[i].Provider;
        if (storageList[i].HostName) {
          dbObj.HostName = storageList[i].HostName;
        } else {
          dbObj.HostName = storageList[i].BrokerAddr;
          dbObj.BackHostName = storageList[i].BackupBrokerAddr;
        }
        dbObj.ClientID = storageList[i].ClientID;
        dbObj.TopicID = storageList[i].TopicID;
        dbObj.Qos = storageList[i].Qos;
        if (storageList[i].Active != undefined) {
          if (storageList[i].Active == 1) {
            dbObj.States = "激活";
          } else {
            dbObj.States = "未激活";
          }
        } else {
          if (storageList[i].PUBEnable != undefined) {
            if (storageList[i].PUBEnable == 1) {
              dbObj.States = "发布";
            } else {
              dbObj.States = "不发布";
            }
          }
        }

        dbArry.push(dbObj);
      }
      res.send(dbArry);
    })
  } else {
    res.send(dbArry);
  }
  LogManagerObj.traceLog(projectManagerName, "Leave post getTransDBConfig");
})

//转发配置 新建
router.post('/getTransPropety', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getTransPropety");
  var type = xss(req.query.type);
  var strProjectName = xss(req.query.ProjectName);
  var dbPath = global.propertyPath + "/transConfig.json";
  let objTrans = pubInter.readJson(global.propertyPath + "/transConfig.json");
  if (objTrans.Error) {
    res.send(objTrans.ErrorDesc);
    return;
  }
  var transData = objTrans.data;
  //var transData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  if (type < 5) {
    if (type == 2) {
      let storageList = transData.Amazon;
      storageList.rows.splice(storageList.rows.length - 3, 3);
      res.send(storageList);
    } else if (type == 0) {
      let storageList = transData.DataCenter;
      storageList.rows[3].value = strProjectName;
      res.send(storageList);
    } else {
      transData.commonPlatform.rows[0].value = type;
      let storageList = transData.commonPlatform;
      storageList.rows.splice(storageList.rows.length - 3, 3);
      res.send(storageList);
    }
  } else {
    let storageList = transData.MQTTInterface;
    storageList.rows.splice(storageList.rows.length - 3, 3);
    res.send(storageList);
  }
  LogManagerObj.traceLog(projectManagerName, "Leave post getTransPropety");
})

//转发配置 提交
router.post('/addTransConfig', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post addTransConfig");
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) {
      throw err;
    }
    //console.log(files);
    var transName;
    // var comData = JSON.parse( fs.readFileSync(global.propertyPath + "/selectConfig.json") ).transConfig;
    var conJSon = JSON.parse(xss(fields.transType));
    for (var c = 0; c < conJSon.editor.options.data.length; c++) {
      if (conJSon.editor.options.data[c].id == conJSon.value) {
        transName = conJSon.editor.options.data[c].text;
        break;
      }
    }

    var proID = xss(fields.proID);
    let projectPath = path.join(tenantDir, proID, 'project');
    var transDB = JSON.parse(xss(fields.body));
    var tras = new Object();
    tras.ID = 0;
    tras.Name = transName;
    tras.Type = parseInt(conJSon.value);
    for (var i = 0; i < transDB.length; i++) {
      if (transDB[i].valueType == "number") {
        tras[transDB[i].field] = parseInt(transDB[i].value);
      } else {
        tras[transDB[i].field] = transDB[i].value;
      }
    }
    if (parseInt(conJSon.value) < 5) {
      tras.CAFile = files.CAFile == undefined ? '' : files.CAFile.name;
      tras.PublicKeyFile = files.PublicKeyFile == undefined ? '' : files.PublicKeyFile.name;
      tras.PrivateKeyFile = files.PrivateKeyFile == undefined ? '' : files.PrivateKeyFile.name;
    } else {
      tras.CACertificate = files.CACertificate == undefined ? '' : files.CACertificate.name;
      tras.ClientCert = files.ClientCert == undefined ? '' : files.ClientCert.name;
      tras.ClientPrivateKey = files.ClientPrivateKey == undefined ? '' : files.ClientPrivateKey.name;
    }
    var transConfigJSON = new Array();

    var proPath = path.join(projectPath, "DataTransConfig.json");
    var exist = fs.existsSync(proPath);
    if (exist) {
      var strJSON;
      try {
        strJSON = fs.readFileSync(proPath, 'utf-8');
      } catch (error) {
        res.send(error.message);
        return;
      }
      if (strJSON == "" || (JSON.parse(strJSON).CloudPlatform).length == 0) {
        tras.ID = 1;

      } else {
        strJSON = JSON.parse(fs.readFileSync(proPath, 'utf-8')).CloudPlatform;
        for (var kk = 0; kk < strJSON.length; kk++) {
          if (transName == strJSON[kk].Name) {
            console.log('重名')
            res.send("重名");
            return;
          }
        }
        tras.ID = parseInt(strJSON[strJSON.length - 1].ID) + 1;
        for (var j = 0; j < strJSON.length; j++) {
          transConfigJSON.push(strJSON[j]);
        }
      }
      transConfigJSON.push(tras);
    } else {
      tras.ID = 1;
      transConfigJSON.push(tras);
    }
    var lastJson = new Object();
    lastJson.CloudPlatform = transConfigJSON;
    //fs.writeFileSync(proPath, JSON.stringify(lastJson, '', "\t"));
    let strWrPro = pubInter.writeJson(proPath, lastJson);
    if (strWrPro != "OK") {
      res.send(strWrPro);
      return; //20231106
    }

    var filePath = projectPath;
    filePath += '/Cert/' + transName;
    if (!pubInter.recursiveMakeDir(filePath)) {
      res.send("新建" + filePath + "失败");
      return;
    }
    if (parseInt(conJSon.value) < 5) {
      if (files.CAFile != undefined && files.CAFile.name != "") {
        let caStream = fs.createReadStream(files.CAFile.path);
        var caPath = filePath + "/" + files.CAFile.name;
        let caFileName = fs.createWriteStream(caPath);
        caStream.pipe(caFileName);
        caFileName.on('close', () => {})
      }

      if (files.PublicKeyFile != undefined && files.PublicKeyFile.name != "") {
        let pubKeyStream = fs.createReadStream(files.PublicKeyFile.path);
        var pubPath = filePath + "/" + files.PublicKeyFile.name;
        let pubFileName = fs.createWriteStream(pubPath);
        pubKeyStream.pipe(pubFileName);
        pubFileName.on('close', () => {})
      }

      if (files.PrivateKeyFile != undefined && files.PrivateKeyFile.name != "") {
        let priKeyStream = fs.createReadStream(files.PrivateKeyFile.path);
        var priPath = filePath + "/" + files.PrivateKeyFile.name;
        let priFileName = fs.createWriteStream(priPath);
        priKeyStream.pipe(priFileName);
        priFileName.on('close', () => {})
      }
    } else {
      if (files.CACertificate != undefined && files.CACertificate.name != "") {
        let caStream = fs.createReadStream(files.CACertificate.path);
        var caPath = filePath + "/" + files.CACertificate.name;
        let caFileName = fs.createWriteStream(caPath);
        caStream.pipe(caFileName);
        caFileName.on('close', () => {})
      }

      if (files.ClientCert != undefined && files.ClientCert.name != "") {
        let pubKeyStream = fs.createReadStream(files.ClientCert.path);
        var pubPath = filePath + "/" + files.ClientCert.name;
        let pubFileName = fs.createWriteStream(pubPath);
        pubKeyStream.pipe(pubFileName);
        pubFileName.on('close', () => {})
      }

      if (files.ClientPrivateKey != undefined && files.ClientPrivateKey.name != "") {
        let priKeyStream = fs.createReadStream(files.ClientPrivateKey.path);
        var priPath = filePath + "/" + files.ClientPrivateKey.name;
        let priFileName = fs.createWriteStream(priPath);
        priKeyStream.pipe(priFileName);
        priFileName.on('close', () => {})
      }
    }

    // var proFilePath = global.sdbPath + "/" + proID + "/" + proVer + "/project/ProjectFileList.json";
    var proFilePath = path.join(projectPath, "ProjectFileList.json");
    let fileJSON = pubInter.readJson(proFilePath);
    if (fileJSON.Error) {
      res.send(fileJSON.ErrorDesc);
      return;
    }
    let fileData = fileJSON.data.FileList;
    /* let fileJSON = fs.readFileSync(proFilePath, 'utf-8');
    let fileData = JSON.parse(fileJSON).FileList; */
    for (var kk = 0; kk < fileData.length; kk++) {
      for (var fileIndex in fileData[kk]) {
        if (fileData[kk][fileIndex] == "Cert") {
          var fileObj = new Object();
          fileObj.FolderName = transName;
          fileObj.FileList = new Array();
          if (global.productType == PRODUCTKF36) {
            if (parseInt(conJSon.value) < 5) {
              if (files.CAFile != undefined && files.CAFile.name != "") {
                fileObj.FileList.push(files.CAFile.name);
              }
              if (files.PublicKeyFile != undefined && files.PublicKeyFile.name != "") {
                fileObj.FileList.push(files.PublicKeyFile.name);
              }
              if (files.PrivateKeyFile != undefined && files.PrivateKeyFile.name != "") {
                fileObj.FileList.push(files.PrivateKeyFile.name);
              }
            } else {
              if (files.CACertificate != undefined && files.CACertificate.name != "") {
                fileObj.FileList.push(files.CACertificate.name);
              }
              if (files.ClientCert != undefined && files.ClientCert.name != "") {
                fileObj.FileList.push(files.ClientCert.name);
              }
              if (files.ClientPrivateKey != undefined && files.ClientPrivateKey.name != "") {
                fileObj.FileList.push(files.ClientPrivateKey.name);
              }
            }
          } else if (global.productType == PRODUCTKF40) {
            if (parseInt(conJSon.value) < 5) {
              var cafileObj = {};
              cafileObj.FileName = files.CAFile == undefined ? '' : files.CAFile.name;
              cafileObj.FileMD5Code = '';
              if (files.CAFile != undefined && files.CAFile.name != "") {
                fileObj.FileList.push(cafileObj);
              }
              var PubObj = {};
              PubObj.FileName = files.PublicKeyFile == undefined ? '' : files.PublicKeyFile.name;
              PubObj.FileMD5Code = '';
              if (files.PublicKeyFile != undefined && files.PublicKeyFile.name != "") {
                fileObj.FileList.push(PubObj);
              }
              var PrieObj = {};
              PrieObj.FileName = files.PrivateKeyFile == undefined ? '' : files.PrivateKeyFile.name;
              PrieObj.FileMD5Code = '';
              if (files.PrivateKeyFile != undefined && files.PrivateKeyFile.name != "") {
                fileObj.FileList.push(PrieObj);
              }

            } else {
              var cafileObj = {};
              cafileObj.FileName = files.CACertificate == undefined ? '' : files.CACertificate.name;
              cafileObj.FileMD5Code = '';
              if (files.CACertificate != undefined && files.CACertificate.name != "") {
                fileObj.FileList.push(cafileObj);
              }

              var PubObj = {};
              PubObj.FileName = files.ClientCert == undefined ? '' : files.ClientCert.name;
              PubObj.FileMD5Code = '';
              if (files.ClientCert != undefined && files.ClientCert.name != "") {
                fileObj.FileList.push(PubObj);
              }

              var PrieObj = {};
              PrieObj.FileName = files.ClientPrivateKey == undefined ? '' : files.ClientPrivateKey.name;
              PrieObj.FileMD5Code = '';
              if (files.ClientPrivateKey != undefined && files.ClientPrivateKey.name != "") {
                fileObj.FileList.push(PrieObj);
              }

            }
          }
          fileData[kk].FileList.push(fileObj);
        }
      }
    }
    var lastJson = new Object();
    lastJson.FileList = fileData;
    //fs.writeFileSync(proFilePath, JSON.stringify(lastJson, '', "\t"));
    res.send(pubInter.writeJson(proFilePath, lastJson));
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post addTransConfig");
})

//转发配置 删除
router.post('/reduceTrans', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post reduceTrans");
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var proID = xss(req.query.proID);
  var configID = xss(req.query.configID);
  let projectPath = path.join(tenantDir,proID,'project');
  var proPath = path.join(projectPath,'DataTransConfig.json')
  var storageJSON = new Array();
  let objPro = pubInter.readJson(proPath);
  if (objPro.Error) {
    res.send(objPro.ErrorDesc);
    return;
  }
  var strJSON = objPro.data.CloudPlatform;
  //var strJSON = JSON.parse(fs.readFileSync(proPath, 'utf-8')).CloudPlatform;
  var fileName;
  for (var i = 0; i < strJSON.length; i++) {
    if (strJSON[i].ID == configID) {
      fileName = strJSON[i].Name;
      strJSON.splice(i, 1);
      break;
    }
  }
  for (var j = 0; j < strJSON.length; j++) {
    storageJSON.push(strJSON[j]);
  }
  var lastJson = new Object();
  lastJson.CloudPlatform = storageJSON;
  //fs.writeFileSync(proPath, JSON.stringify(lastJson, '', "\t"));
  let strWrPro = pubInter.writeJson(proPath, lastJson);
  if (strWrPro != "OK") {
    res.send(strWrPro);
    return;
  }

  var filePath = path.join(projectPath,'Cert',fileName)
  pubInter.delFileAndDir(filePath);

  var proFilePath = path.join(projectPath,'ProjectFileList.json')
  let fileJSON = pubInter.readJson(proFilePath);
  if (fileJSON.Error) {
    res.send(fileJSON.ErrorDesc);
    return;
  }
  let fileData = fileJSON.data.FileList;
  /* let fileJSON = fs.readFileSync(proFilePath, 'utf-8');
  let fileData = JSON.parse(fileJSON).FileList; */
  for (var kk = 0; kk < fileData.length; kk++) {
    if (fileData[kk].FolderName != undefined && fileData[kk].FolderName == "Cert") {
      for (var mm = 0; mm < fileData[kk].FileList.length; mm++) {
        if (fileData[kk].FileList[mm].FolderName == fileName) {
          fileData[kk].FileList.splice(mm, 1);
        }
      }
    }
  }
  var lastJson = new Object();
  lastJson.FileList = fileData;
  //fs.writeFileSync(proFilePath, JSON.stringify(lastJson, '', "\t"));
  res.send(pubInter.writeJson(proFilePath, lastJson));
  LogManagerObj.traceLog(projectManagerName, "Leave post reduceTrans");
})

//查询单个转发配置 
router.post('/queryOneTrans', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post queryOneTrans");
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var proID = xss(req.query.proID);
  var stID = xss(req.query.StorageID);
  var stPath = path.join(tenantDir,proID,'project',"DataTransConfig.json");
  let strJson = fs.readFile(stPath, function (err, data) {
    if (err) {
      console.log("Load queryOneStorage Failed.");
      console.error(err);
      let resObj = {};
      resObj.code = -1;
      resObj.message = "proID proVer or proName is not found.";
      resObj.data = [];
      res.send(resObj);
      return;
    }
    var i = 0;
    var transType;
    let allTransList = JSON.parse(data).CloudPlatform;
    for (i; i < allTransList.length; i++) {
      if (stID == allTransList[i].ID) {
        transType = allTransList[i].Type;
        break;
      }
    }
    if (transType == undefined) {
      console.log("StorageID is not found.");
      let resObj = {};
      resObj.code = -1;
      resObj.message = "StorageID is not found.";
      resObj.data = [];
      res.send(resObj);
      return;
    }
    fs.readFile(global.propertyPath + "/transConfig.json", function (err, data) {
      if (err) {
        console.log("Load transConfig Failed.");
        console.error(err);
        return;
      }
      let transProList;
      if (transType == 5) {
        transProList = JSON.parse(data).MQTTInterface.rows;
      } else {
        transProList = JSON.parse(data).Amazon.rows;
      }

      for (var m = 0; m < transProList.length; m++) {
        transProList[m].value = allTransList[i][transProList[m].field]
      }
      var cafile = new Object();

      if (transType < 5) {
        cafile.CAFile = allTransList[i].CAFile;
        cafile.PublicKeyFile = allTransList[i].PublicKeyFile;
        cafile.PrivateKeyFile = allTransList[i].PrivateKeyFile;
      } else {
        cafile.CACertificate = allTransList[i].CACertificate;
        cafile.ClientCert = allTransList[i].ClientCert;
        cafile.ClientPrivateKey = allTransList[i].ClientPrivateKey;
      }
      transProList.push(cafile);
      res.send(transProList);
    })
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post queryOneTrans");
})

//转发配置修改 提交
router.post('/editTransConfig', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post editTransConfig");
  let pathFunc = require("path");
  let proID = xss(req.query.proID);
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  let projectPath = pathFunc.join(tenantDir,proID,'project')
  var stID = xss(req.query.StorageID);
  let bodyJSONArray = req.body;
  let rows;
  if (JSON.stringify(bodyJSONArray) == "{}") {
    bodyJSONArray = [];
    rows = JSON.parse(xss(req.query.rows));
    bodyJSONArray.push(rows);
  } else {
    bodyJSONArray = bodyJSONArray;
  }
  //let rows = JSON.parse(xss(req.query.rows));
  //let changeValue = xss(req.query.changeValue);
  var path = pathFunc.join(projectPath,'DataTransConfig.json')
  let strJson = fs.readFile(path, 'utf-8', function (err, data) {
    if (err) {
      console.log("editTransConfig Load DataTransConfig.json Failed.");
      console.error(err);
      let resObj = {};
      resObj.code = -1;
      resObj.message = "proID proVer or proName is not found.";
      resObj.data = [];
      res.send(resObj);
      return;
    }
    let proInfo = JSON.parse(data).CloudPlatform;
    let hasID = false;
    for (let j = 0; j < bodyJSONArray.length; j++) {
      rows = bodyJSONArray[j];
      for (var i = 0; i < proInfo.length; i++) {
        if (stID == proInfo[i].ID) {
          if (!hasID) hasID = true;
          if (rows.valueType == "number") {
            //proInfo[i][rows.field] = parseInt( changeValue);
            proInfo[i][rows.field] = parseInt(rows.value);
          } else {
            proInfo[i][rows.field] = rows.value;
          }
        }
      }

    }
    if (!hasID) {
      let resObj = {};
      resObj.code = -1;
      resObj.message = "StorageID is not found.";
      resObj.data = [];
      res.send(resObj);
      return;
    }

    var lastJson = new Object();
    lastJson.CloudPlatform = proInfo;
    //fs.writeFileSync(path, JSON.stringify(lastJson, '', "\t"));
    res.send(pubInter.writeJson(path, lastJson));
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post editTransConfig");
})

//证书修改 提交editPropertyTable
router.post('/editTransCAFile', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post editTransCAFile");
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) {
      throw err;
    }
    //console.log(files);
    var proID = xss(fields.proID);
    var proVer = xss(fields.proVer);
    var ID = xss(fields.id);
    var proData = JSON.parse(xss(fields.body));

    var proName = req.query.ProjectName;
    var proPath = pubInter.joinPath(proID, proVer, proName) + "/DataTransConfig.json";
    let objProJson = pubInter.readJson(proPath);
    if (objProJson.Error) {
      res.send(objProJson.ErrorDesc);
      return;
    }
    var strJSON = objProJson.data.CloudPlatform;
    //var strJSON = JSON.parse(fs.readFileSync(proPath, 'utf-8')).CloudPlatform;
    var m = 0;
    var fileJsonname, transType;
    for (m; m < strJSON.length; m++) {
      if (ID == strJSON[m].ID) {
        fileJsonname = strJSON[m].Name;
        transType = strJSON[m].Type;
        break;
      }
    }
    var fileName = []; //更改后删除原来的
    if (transType == 2) {
      if (files.modyCAFile != undefined && files.modyCAFile.name != "") {
        if ('_restfulInerface' in fields) files.modyCAFile.name = fields['modyCAFile_filename'];
        if (strJSON[m].CAFile != "") {
          fileName.push(strJSON[m].CAFile);
        }
        strJSON[m].CAFile = files.modyCAFile.name;
      }
      if (files.modyPublicKeyFile != undefined && files.modyPublicKeyFile.name != "") {
        if ('_restfulInerface' in fields) files.modyPublicKeyFile.name = fields['modyPublicKeyFile_filename'];
        if (strJSON[m].PublicKeyFile != "") {

          fileName.push(strJSON[m].PublicKeyFile);
        }
        strJSON[m].PublicKeyFile = files.modyPublicKeyFile.name;
      }
      if (files.modyPrivateKeyFile != undefined && files.modyPrivateKeyFile.name != "") {
        if ('_restfulInerface' in fields) files.modyPrivateKeyFile.name = fields['modyPrivateKeyFile_filename'];
        if (strJSON[m].PrivateKeyFile != "") {
          fileName.push(strJSON[m].PrivateKeyFile);
        }
        strJSON[m].PrivateKeyFile = files.modyPrivateKeyFile.name;
      }

    } else if (transType == 5) {
      if (files.modyCAFile != undefined && files.modyCAFile.name != "") {
        if ('_restfulInerface' in fields) files.modyCAFile.name = fields['modyCAFile_filename'];
        if (strJSON[m].CACertificate != "") {
          fileName.push(strJSON[m].CACertificate);
        }
        strJSON[m].CACertificate = files.modyCAFile.name;
      }
      if (files.modyPublicKeyFile != undefined && files.modyPublicKeyFile.name != "") {
        if ('_restfulInerface' in fields) files.modyPublicKeyFile.name = fields['modyPublicKeyFile_filename'];
        if (strJSON[m].ClientCert != "") {
          fileName.push(strJSON[m].ClientCert);
        }
        strJSON[m].ClientCert = files.modyPublicKeyFile.name;
      }
      if (files.modyPrivateKeyFile != undefined && files.modyPrivateKeyFile.name != "") {
        if ('_restfulInerface' in fields) files.modyPrivateKeyFile.name = fields['modyPrivateKeyFile_filename'];
        if (strJSON[m].ClientPrivateKey != "") {
          fileName.push(strJSON[m].ClientPrivateKey);
        }
        strJSON[m].ClientPrivateKey = files.modyPrivateKeyFile.name;
      }
    }
    var lastJson = new Object();
    lastJson.CloudPlatform = strJSON;
    //fs.writeFileSync(proPath, JSON.stringify(lastJson, '', "\t"));
    let strWrPro = pubInter.writeJson(proPath, lastJson);
    if (strWrPro != "OK") {
      res.send(strWrPro);
      return;
    }

    var filePath = pubInter.joinPath(proID, proVer, proName) + "/Cert/" + fileJsonname;
    //删除原来的证书文件
    for (var f = 0; f < fileName.length; f++) {
      var tempPP = filePath + "/" + fileName[f];
      if (fs.existsSync(tempPP)) {
        fs.unlinkSync(tempPP);
      }
    }
    //增加新的证书文件
    if (files.modyCAFile != undefined && files.modyCAFile.name != "") {
      if ('_restfulInerface' in fields) files.modyCAFile.name = fields['modyCAFile_filename'];
      let caStream = fs.createReadStream(files.modyCAFile.path);
      var caPath = filePath + "/" + files.modyCAFile.name;

      let caFileName = fs.createWriteStream(caPath);
      caStream.pipe(caFileName);
      caFileName.on('close', () => {
        //console.log('CAFile');
      })
    }
    if (files.modyPublicKeyFile != undefined && files.modyPublicKeyFile.name != "") {
      if ('_restfulInerface' in fields) files.modyPublicKeyFile.name = fields['modyPublicKeyFile_filename'];
      let pubKeyStream = fs.createReadStream(files.modyPublicKeyFile.path);
      var pubPath = filePath + "/" + files.modyPublicKeyFile.name;
      let pubFileName = fs.createWriteStream(pubPath);
      pubKeyStream.pipe(pubFileName);
      pubFileName.on('close', () => {
        //console.log('PublicKeyFile');
      })
    }
    if (files.modyPrivateKeyFile != undefined && files.modyPrivateKeyFile.name != "") {
      if ('_restfulInerface' in fields) files.modyPrivateKeyFile.name = fields['modyPrivateKeyFile_filename'];
      let priKeyStream = fs.createReadStream(files.modyPrivateKeyFile.path);
      var priPath = filePath + "/" + files.modyPrivateKeyFile.name;
      let priFileName = fs.createWriteStream(priPath);
      priKeyStream.pipe(priFileName);
      priFileName.on('close', () => {
        //console.log('PrivateKeyFile')
      })
    }
    var proFilePath = pubInter.joinPath(proID, proVer, proName) + "/ProjectFileList.json"

    let fileJSON = pubInter.readJson(proFilePath);
    if (fileJSON.Error) {
      res.send(fileJSON.ErrorDesc);
      return;
    }
    let fileData = fileJSON.data.FileList;
    /* let fileJSON = fs.readFileSync(proFilePath, 'utf-8');
    let fileData = JSON.parse(fileJSON).FileList; */
    for (var kk = 0; kk < fileData.length; kk++) {
      if (fileData[kk].FolderName != undefined && fileData[kk].FolderName == "Cert") {
        for (var mm = 0; mm < fileData[kk].FileList.length; mm++) {
          if (fileData[kk].FileList[mm].FolderName == fileJsonname) {
            if (global.productType == PRODUCTKF36) {
              fileData[kk].FileList[mm].FileList = [];
              fileData[kk].FileList[mm].FileList.push(files.modyCAFile == undefined ? '' : files.modyCAFile.name);
              fileData[kk].FileList[mm].FileList.push(files.modyPublicKeyFile == undefined ? '' : files.modyPublicKeyFile.name);
              fileData[kk].FileList[mm].FileList.push(files.modyPrivateKeyFile == undefined ? '' : files.modyPrivateKeyFile.name);
            } else if (global.productType == PRODUCTKF40) {
              fileData[kk].FileList[mm].FileList = [];
              var temCAFile = {};
              temCAFile.FileName = files.modyCAFile.name;
              temCAFile.FileMD5Code = "";
              fileData[kk].FileList[mm].FileList.push(temCAFile);

              var temPublicKey = {};
              temPublicKey.FileName = files.modyPublicKeyFile.name;
              temPublicKey.FileMD5Code = "";
              fileData[kk].FileList[mm].FileList.push(temPublicKey);

              var temPrivateKey = {};
              temPrivateKey.FileName = files.modyPrivateKeyFile.name;
              temPrivateKey.FileMD5Code = "";
              fileData[kk].FileList[mm].FileList.push(temPrivateKey);
            }
          }
        }
      }
    }
    var lastJson = new Object();
    lastJson.FileList = fileData;
    //fs.writeFileSync(proFilePath, JSON.stringify(lastJson, '', "\t"));
    res.send(pubInter.writeJson(proFilePath, lastJson));
  })
  LogManagerObj.traceLog(projectManagerName, "Leave post editTransCAFile");
})

//发布
router.post('/publishProjectInfo', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post publishProjectInfo");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var nFind = __dirname.lastIndexOf("Routes");
  if (nFind != -1) {
    var strDataPath = __dirname.substring(0, nFind - 1);
  } else {
    var strDataPath = __dirname;
  }
  /* var str = global.sdbPath.split("\/");
  for (var s = 0; s < str.length; s++) {
    if (str[s] != "..") {
      strDataPath += "/" + str[s];
    }
  } */
  req.body = pubInter.EscapeAllData(req.body);
  var proPath = pubInter.joinPath(req.body.ProjectID, req.body.ProjectVersion, "");
  var strDataPath = path.resolve(strDataPath, proPath); //注意路径是否正确？
  var ProJsonData = new Object();
  ProJsonData.projectId = req.body.ProjectID;

  ProJsonData.projectGroupName = req.query.proGroupName;
  ProJsonData.solutionId = solutionInfo.GUID;
  ProJsonData.solutionName = solutionInfo.solutionName;
  ProJsonData.creator = req.body.Creator;

  ProJsonData.createTime = req.body.CreateTime;
  ProJsonData.modifyTime = req.body.ModifyTime;
  ProJsonData.projectName = req.body.ProjectName;
  ProJsonData.projectType = pubInfo.projectType;

  ProJsonData.projectTypeVersion = [req.body.ProjectTypeVersion];

  ProJsonData.publishTime = pubInter.getCurrentTime();
  ProJsonData.projectDescription = req.body.Description;
  ProJsonData.projectVersion = req.body.ProjectVersion;
  //获取当前用户的租户id
  // let objUserInfo = JSON.parse(xss(req.query.userInfo));
  let objUserInfo = req.query.userInfo;
  ProJsonData.tenantId = objUserInfo

  LogManagerObj.debugLog(projectManagerName, "global.sdbpath=" + global.sdbPath + "; __dirname=" + __dirname + "; proPath=" + proPath);
  var printInfo = "publishProjectInfo-->uploadProject: parameter 1:0, parameter 2:" + opsCenterFileHost + " parameter 3:" + req.query.token + " parameter 4:" + JSON.stringify(ProJsonData) + " parameter 5:" + strDataPath;
  LogManagerObj.debugLog(projectManagerName, printInfo);
  uploadProjectAsync(0, opsCenterFileHost, xss(req.query.token), ProJsonData, strDataPath, res, req);

  /*proPublishConnect.uploadProject(0, opsCenterFileHost, req.query.token, ProJsonData, strDataPath)
    .then((result) => {
      console.log("发布result=", result);
      LogManagerObj.debugLog(projectManagerName, "publishProjectInfo-->uploadProject return:" +  typeof result == 'object' ? JSON.stringify( result ):result );
      res.send("" + result);
      if (result == 0) {
        var proPP = pubInter.joinPath(req.body.ProjectID, req.body.ProjectVersion, "") + "/ProjectPorpertyInfo.json";
        let proData = JSON.parse(fs.readFileSync(proPP, "utf8"));
        proData.publicFlag = 1;
        proData.publicTime = pubInter.getCurrentTime();
        proData.publicPerson = req.query.userName;
        fs.writeFileSync(proPP, JSON.stringify(proData, '', "\t"));
      }
    })
    .catch(  // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "uploadProject return deal Error:" +  typeof reason == 'object' ? JSON.stringify( reason ):reason);
        res.send('err_' + reason);
      });*/
  LogManagerObj.traceLog(projectManagerName, "Leave post publishProjectInfo");
})

//发布进度
router.post('/getPropressSpeed', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getPropressSpeed");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var aa = proPublishConnect.getUploadProjectProgress(xss(req.query.proID));
  LogManagerObj.debugLog(projectManagerName, "getPropressSpeed-->getUploadProjectProgress return:" + aa);
  res.send("" + aa);
  LogManagerObj.traceLog(projectManagerName, "Leave post getPropressSpeed");
})
//发布 取消发布
router.post('/concelPublishProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post concelPublishProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var code = proPublishConnect.cancelUploadProject(xss(req.query.proID));
  LogManagerObj.debugLog(projectManagerName, "concelPublishProject-->cancelUploadProject return:" + typeof code == 'object' ? JSON.stringify(code) : code);
  //.then((code)=>{
  console.log('取消发布code=', code);
  res.send('ok');
  LogManagerObj.traceLog(projectManagerName, "Leave post concelPublishProject");
  //});  
})

//获取 运行节点的工程树
router.post('/getRunProjectExam', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getRunProjectExam");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  proPublishConnect.getAllNodeProjects(0, opsHost, xss(req.query.token))
    .then((treeJSon) => {
      LogManagerObj.debugLog(projectManagerName, "getRunProjectExam--> getAllNodeProjects return:" + typeof treeJSon == 'object' ? JSON.stringify(treeJSon) : treeJSon);
      console.log("运行节点treeJSon=", treeJSon);
      if (treeJSon.code == 0) {
        for (var h = 0; h < treeJSon.data.apps.length; h++) {
          if (treeJSon.data.apps[h].projectType != pubInfo.projectType) {
            treeJSon.data.apps.splice(h, 1);
          }
        }
      }
      res.send(treeJSon);
    })
    .catch((reason) => { // 记录失败原因
      LogManagerObj.errorLog(projectManagerName, "getRunProjectExam--> getAllNodeProjects return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
      console.log("getRunProjectExam: ", reason);
      res.send('err_' + reason);
    });
  LogManagerObj.traceLog(projectManagerName, "Leave post getRunProjectExam");
})

//判断某个工程实例是否运行
router.post('/getAppState', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getAppState");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  proPublishConnect.getProjectStatus(0, opsHost, xss(req.query.token), xss(req.body.appId))
    .then((runjson) => {
      LogManagerObj.debugLog(projectManagerName, "getAppState--> getProjectStatus return:" + typeof runjson == 'object' ? JSON.stringify(runjson) : runjson);
      console.log("是否运行runjson=", runjson);
      res.send(runjson);
    })
    .catch( // 记录失败原因
      (reason) => {
        res.send('err_' + reason);
        LogManagerObj.errorLog(projectManagerName, "getAppState--> getProjectStatus return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post getAppState");
})

//更新工程
router.post('/updateProjectToApp', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post updateProjectToApp");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  // var nFind = __dirname.lastIndexOf("kingdevcenter");
  /*
  var nFind = __dirname.lastIndexOf("kingdevopscenter");
  var strDataPath = __dirname.substring(0, nFind - 1);
  var str = global.sdbPath.split("\/");
  for (var s = 0; s < str.length; s++) {
    if (str[s] != "..") {
      strDataPath += "/" + str[s];
    }
  }
  strDataPath += "/" + req.body.upDate[0].projectId + "/" + req.body.upDate[0].projectVersion + "/project";
  */
  req.body = pubInter.EscapeAllData(req.body);
  try {
    var pathTemp = "../" + global.sdbPath + "/" + req.body.upDate[0].projectId + "/" + req.body.upDate[0].projectVersion + "/project";
    var strDataPath = path.resolve(__dirname, pathTemp);

    var sourPro = req.body.upDate[0];
    sourPro.solutionName = solutionInfo.solutionName;
    sourPro.solutionId = solutionInfo.GUID;
    sourPro.projectType = parseInt(pubInfo.projectType);

    var josnDestProject = {};

    josnDestProject.projectName = req.body.upDate[0].projectName;
    josnDestProject.projectVersion = req.body.upDate[0].projectVersion;
    josnDestProject.nodeId = req.body.upDate[1].nodeId;
    josnDestProject.projectId = req.body.upDate[1].projectId;
    josnDestProject.projectType = parseInt(req.body.upDate[1].projectType);
    josnDestProject.execFileName = req.body.upDate[1].execFileName;
    josnDestProject.execVersion = req.body.upDate[1].execVersion;
    josnDestProject.port = parseInt(req.body.upDate[1].port);
    josnDestProject.wsPort = parseInt(req.body.upDate[1].wsPort);
    josnDestProject.appId = req.body.upDate[1].appId;
  } catch (e) {
    res.send("报错：" + JSON.stringify(req.body));
    return;
  }
  proPublishConnect.updateProject(0, opsCenterFileHost, xss(req.query.token), sourPro, strDataPath, josnDestProject)
    // proPublishConnect.updateProject(0, opsHost, req.query.token, sourPro, strDataPath, josnDestProject)
    .then((flag) => {
      LogManagerObj.debugLog(projectManagerName, "updateProjectToApp--> updateProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
      console.log("更新工程flag=", flag);
      res.send(flag + ""); //(flag);
      if (flag == true || flag == 0) {
        // var proPP = global.sdbPath + "/" + sourPro.projectId + "/" + sourPro.projectVersion + "/project/ProjectPorpertyInfo.json";
        var proPP = pubInter.joinPath(sourPro.projectId, sourPro.projectVersion, "") + "/ProjectPorpertyInfo.json";

        let objProJson = pubInter.readJson(proPP);
        if (objProJson.Error) {
          //res.send(objProJson.ErrorDesc);
          return;
        }
        let proData = objProJson.data;
        //let proData = JSON.parse(fs.readFileSync(proPP, "utf8"));
        proData.updateFlag = 1;
        proData.updateTime = pubInter.getCurrentTime();
        proData.updatePerson = xss(req.query.userName);
        //fs.writeFileSync(proPP, JSON.stringify(proData, '', "\t"));
        let strWrProPer = pubInter.writeJson(proPP, proData);
        if (strWrProPer != "OK") {
          return;
        }
      }
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "updateProjectToApp--> updateProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post updateProjectToApp");
})

//更新 启动工程
router.post('/startProjectAppExam', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post startProjectAppExam");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var jsonPara = pubInter.EscapeAllData(req.body);
  jsonPara.debug = false;
  jsonPara.nodeId = nodeInfo.nodeId;
  jsonPara.solutionId = solutionInfo.GUID;
  jsonPara.solutionName = solutionInfo.solutionName;
  LogManagerObj.debugLog(projectManagerName, "startProjectAppExam--> startProject param2:" + opsHost);
  LogManagerObj.debugLog(projectManagerName, "startProjectAppExam--> startProject param3:" + req.query.token);
  LogManagerObj.debugLog(projectManagerName, "startProjectAppExam--> startProject param4:" + JSON.stringify(jsonPara));
  proPublishConnect.startProject(0, opsHost, xss(req.query.token), jsonPara)
    .then((flag) => {
      LogManagerObj.debugLog(projectManagerName, "startProjectAppExam--> startProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
      console.log("更新 启动工程flag=", flag);
      res.send(flag);
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "startProjectAppExam--> startProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post startProjectAppExam");
})

//更新 停止工程
router.post('/stopProjectAppExam', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post stopProjectAppExam");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var jsonPara = pubInter.EscapeAllData(req.body);
  jsonPara.debug = false;
  jsonPara.nodeId = nodeInfo.nodeId;
  jsonPara.solutionId = solutionInfo.GUID;
  jsonPara.solutionName = solutionInfo.solutionName;
  proPublishConnect.stopProject(0, opsHost, xss(req.query.token), jsonPara)
    .then((flag) => {
      LogManagerObj.debugLog(projectManagerName, "stopProjectAppExam--> stopProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
      console.log("更新 停止工程flag=", flag);
      res.send(flag);
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "stopProjectAppExam--> stopProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post stopProjectAppExam");
})

//更新 重启工程
router.post('/restartProjectAppExam', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post restartProjectAppExam");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var jsonPara = pubInter.EscapeAllData(req.body);
  jsonPara.debug = false;
  jsonPara.nodeId = nodeInfo.nodeId;
  jsonPara.solutionId = solutionInfo.GUID;
  jsonPara.solutionName = solutionInfo.solutionName;
  proPublishConnect.restartProject(0, opsHost, xss(req.query.token), jsonPara)
    .then((flag) => {
      LogManagerObj.debugLog(projectManagerName, "restartProjectAppExam--> restartProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
      console.log("更新 重启工程flag=", flag);
      res.send(flag);
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "restartProjectAppExam--> restartProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post restartProjectAppExam");
})

//查询命令执行结果
router.post('/queryCmd', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post queryCmd");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  proPublishConnect.getCmdStatus(0, opsHost, xss(req.query.token), pubInter.EscapeAllData(req.body))
    .then((flag) => {
      LogManagerObj.debugLog(projectManagerName, "queryCmd--> getCmdStatus return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
      console.log("执行结果flag=", flag);
      res.send(flag);
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "queryCmd--> getCmdStatus return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post queryCmd");
})

//获取运行节点中是否有该工程
async function getProInNode(strNodeID, strToken, strProjectID) {
  var objRes = {
    code: 0,
    message: "success",
    data: [],
    isExist: false
  }
  var objNode = await proPublishConnect.getAllNodeProjects(0, opsHost, strToken);
  console.log(objNode);
  if (objNode.code != 0) {
    return objNode;
  } else {
    var arrAppList = objNode.data.apps;
    for (let i = 0; i < arrAppList.length; i++) {
      if (arrAppList[i].projectId == strProjectID && strNodeID == arrAppList[i].nodeId) {
        objRes.data = arrAppList[i];
        objRes.isExist = true;
        return objRes;
      }
    }
    objRes.message = "运行节点中不存在该工程";
    objRes.code = -1;
    return objRes;
  }

}

//调试  部署
router.post('/debugDeployProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post debugDeployProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);

  //获取运行节点中是否有该工程
  getProInNode(nodeInfo.nodeId, req.query.token, xss(req.body.projectId))
    .then((objNode) => {
      if (objNode.code != 0) {
        res.send(objNode);
      } else if (!objNode.isExist) {
        res.send(objNode);
      } else {
        var jsonPara = pubInter.EscapeAllData(req.body);
        jsonPara.appId = objNode.data.appId;
        jsonPara.debug = true;
        jsonPara.nodeId = nodeInfo.nodeId; //节点ID
        jsonPara.nodeName = nodeInfo.nodeName; //节点名称
        jsonPara.projectType = pubInfo.projectType; //工程类型
        jsonPara.execFileName = pubInfo.execFileName; //工程产品名称（kingioserver）
        jsonPara.execVersion = pubInfo.execVersion; //工程版本
        jsonPara.port = objNode.data.port + ""; //parseInt(jsonPara.port);
        jsonPara.wsport = 0; //parseInt(jsonPara.wsport);
        var printInfo = "debugDeployProject-->deployProject: parameter 1:0, parameter 2:" + opsHost + " parameter 3:" + req.query.token + " parameter 4:" + JSON.stringify(jsonPara);
        LogManagerObj.debugLog(projectManagerName, printInfo);
        proPublishConnect.deployProject(0, opsHost, xss(req.query.token), jsonPara)
          .then((flag) => {
            LogManagerObj.debugLog(projectManagerName, "debugDeployProject--> deployProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
            console.log("调试 部署flag=", flag);
            res.send(flag);
          })
          .catch( // 记录失败原因
            (reason) => {
              LogManagerObj.errorLog(projectManagerName, "debugDeployProject--> deployProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
              res.send('err_' + reason);
            });
        LogManagerObj.traceLog(projectManagerName, "Leave post debugDeployProject");
      }
    })
    .catch((reason) => {
      LogManagerObj.errorLog(projectManagerName, "debugDeployProject--> deployProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
      res.send('err_' + reason);
    })

})

//取消调试部署
router.post('/concleDebugDeployProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post concleDebugDeployProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  //获取运行节点中是否有该工程
  getProInNode(nodeInfo.nodeId, req.query.token, req.body.projectId)
    .then((objNode) => {
      if (objNode.code != 0) {
        res.send(objNode);
      } else if (!objNode.isExist) {
        res.send(objNode);
      } else {
        //获取工程是否
        var jsonPara = pubInter.EscapeAllData(req.body);
        jsonPara.debug = true;
        jsonPara.nodeId = nodeInfo.nodeId;
        jsonPara.nodeName = nodeInfo.nodeName;

        var printInfo = "concleDebugDeployProject-->undeployProject: parameter 1:0, parameter 2:" + opsHost + " parameter 3:" + req.query.token + " parameter 4:" + JSON.stringify(jsonPara);
        LogManagerObj.debugLog(projectManagerName, printInfo);
        proPublishConnect.undeployProject(0, opsHost, xss(req.query.token), jsonPara)
          .then((flag) => {
            LogManagerObj.debugLog(projectManagerName, "concleDebugDeployProject--> undeployProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
            console.log("取消部署flag=", flag);
            res.send(flag);
          })
          .catch( // 记录失败原因
            (reason) => {
              LogManagerObj.errorLog(projectManagerName, "concleDebugDeployProject--> undeployProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
              res.send('err_' + reason);
            });
        LogManagerObj.traceLog(projectManagerName, "Leave post concleDebugDeployProject");
      }
    })
    .catch((reason) => {
      LogManagerObj.errorLog(projectManagerName, "debugDeployProject--> deployProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
      res.send('err_' + reason);
    })
})

//调试 启动工程
router.post('/debugStartProjectAppExam', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post debugStartProjectAppExam");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  //获取运行节点中是否有该工程
  getProInNode(nodeInfo.nodeId, req.query.token, req.body.projectId)
    .then((objNode) => {
      if (objNode.code != 0) {
        res.send(objNode);
      } else if (!objNode.isExist) {
        res.send(objNode);
      } else {
        var printInfo = "debugStartProjectAppExam-->startProject: parameter 1:0, parameter 2:" + opsHost + " parameter 3:" + req.query.token + " parameter 4:" + JSON.stringify(jsonPara);
        LogManagerObj.debugLog(projectManagerName, printInfo);
        var jsonPara = pubInter.EscapeAllData(req.body);
        jsonPara.debug = true;
        jsonPara.nodeId = nodeInfo.nodeId;
        jsonPara.solutionId = solutionInfo.GUID;
        jsonPara.solutionName = solutionInfo.solutionName;
        jsonPara.appId = objNode.data.appId;
        proPublishConnect.startProject(0, opsHost, xss(req.query.token), jsonPara)
          .then((flag) => {
            LogManagerObj.debugLog(projectManagerName, "debugStartProjectAppExam--> startProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
            console.log("调试 启动flag=", flag);
            res.send(flag);
          })
          .catch( // 记录失败原因
            (reason) => {
              LogManagerObj.errorLog(projectManagerName, "debugStartProjectAppExam--> startProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
              res.send('err_' + reason);
            });
        LogManagerObj.traceLog(projectManagerName, "Leave post debugStartProjectAppExam");
      }
    })
    .catch((reason) => {
      LogManagerObj.errorLog(projectManagerName, "debugDeployProject--> deployProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
      res.send('err_' + reason);
    })
})

//调试 停止工程
router.post('/debugStopProjectAppExam', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post debugStopProjectAppExam");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  //获取运行节点中是否有该工程
  getProInNode(nodeInfo.nodeId, req.query.token, req.body.projectId)
    .then((objNode) => {
      if (objNode.code != 0) {
        res.send(objNode);
      } else if (!objNode.isExist) {
        res.send(objNode);
      } else {
        var printInfo = "debugStopProjectAppExam-->stopProject: parameter 1:0, parameter 2:" + opsHost + " parameter 3:" + req.query.token + " parameter 4:" + JSON.stringify(jsonPara);
        LogManagerObj.debugLog(projectManagerName, printInfo);
        var jsonPara = pubInter.EscapeAllData(req.body);
        jsonPara.debug = true;
        jsonPara.nodeId = nodeInfo.nodeId;
        jsonPara.solutionId = solutionInfo.GUID;
        jsonPara.solutionName = solutionInfo.solutionName;
        jsonPara.appId = objNode.data.appId;
        proPublishConnect.stopProject(0, opsHost, xss(req.query.token), jsonPara)
          .then((flag) => {
            LogManagerObj.debugLog(projectManagerName, "debugStopProjectAppExam--> stopProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
            console.log("调试 停止flag=", flag);
            res.send(flag);
          })
          .catch( // 记录失败原因
            (reason) => {
              LogManagerObj.errorLog(projectManagerName, "debugStopProjectAppExam--> stopProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
              res.send('err_' + reason);
            });
        LogManagerObj.traceLog(projectManagerName, "Leave post debugStopProjectAppExam");
      }
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "debugStopProjectAppExam--> stopProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post debugStopProjectAppExam");
})

//调试 重启工程
router.post('/debugrestartProjectAppExam', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post debugrestartProjectAppExam");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  //获取运行节点中是否有该工程
  getProInNode(nodeInfo.nodeId, req.query.token, req.body.projectId)
    .then((objNode) => {
      if (objNode.code != 0) {
        res.send(objNode);
      } else if (!objNode.isExist) {
        res.send(objNode);
      } else {
        var jsonPara = pubInter.EscapeAllData(req.body);
        jsonPara.debug = true;
        jsonPara.nodeId = nodeInfo.nodeId;
        jsonPara.solutionId = solutionInfo.GUID;
        jsonPara.solutionName = solutionInfo.solutionName;
        var printInfo = "debugrestartProjectAppExam-->restartProject: parameter 1:0, parameter 2:" + opsHost + " parameter 3:" + req.query.token + " parameter 4:" + JSON.stringify(jsonPara);
        LogManagerObj.debugLog(projectManagerName, printInfo);
        proPublishConnect.restartProject(0, opsHost, xss(req.query.token), jsonPara)
          .then((flag) => {
            LogManagerObj.debugLog(projectManagerName, "debugrestartProjectAppExam--> restartProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
            console.log("调试 重启flag=", flag);
            res.send(flag);
          })
          .catch( // 记录失败原因
            (reason) => {
              LogManagerObj.errorLog(projectManagerName, "debugrestartProjectAppExam--> restartProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
              res.send('err_' + reason);
            });
        LogManagerObj.traceLog(projectManagerName, "Leave post debugrestartProjectAppExam");
      }
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "debugStopProjectAppExam--> stopProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post debugStopProjectAppExam");
})

//运维中心工程 查询
router.post('/getPublishProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getPublishProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  proPublishConnect.getAllProjects(0, opsCenterFileHost, xss(req.query.token))
    .then((flag) => {
      LogManagerObj.debugLog(projectManagerName, "getPublishProject--> getAllProjects return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
      console.log("运维中心 查询flag=", flag);
      if (flag.code == 0) {
        // for (var h = 0; h < flag.data.projects.length; h++) {
        //   for (var g = 0; g < flag.data.projects[h].projectArr.length; g++) {
        //     if (flag.data.projects[h].projectArr[g].projectType != pubInfo.projectType) {
        //       flag.data.projects[h].projectArr.splice(g, 1);
        //     }
        //   }
        // }
        for (var h = 0; h < flag.data.length; h++) {
          for (var g = 0; g < flag.data[h].projectList.length; g++) {
            if (flag.data[h].projectList[g].projectType != pubInfo.projectType) {
              flag.data[h].projectList.splice(g, 1);
              g--;
            }
          }
        }
      }
      res.send(flag);
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "getPublishProject--> getAllProjects return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post getPublishProject");
})

//运维中心工程 搜索
router.post('/searchPublishProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post searchPublishProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var searchValue = xss(req.query.searchValue);
  proPublishConnect.getAllProjects(0, opsCenterFileHost, xss(req.query.token))
    .then((flag) => {
      LogManagerObj.debugLog(projectManagerName, "searchPublishProject--> getAllProjects return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
      var datagridData = [];
      if (flag.code == 0) {
        for (var h = 0; h < flag.data.length; h++) {
          for (var g = 0; g < flag.data[h].projectList.length; g++) {
            if (flag.data[h].projectList[g].projectType == pubInfo.projectType) {
              if (flag.data[h].projectList[g].projectName.indexOf(searchValue) != -1 ||
                flag.data[h].projectList[g].projectGroupName.indexOf(searchValue) != -1 ||
                flag.data[h].projectList[g].solutionName.indexOf(searchValue) != -1 ||
                flag.data[h].projectList[g].projectDescription.indexOf(searchValue) != -1) {
                datagridData.push(flag.data[h].projectList[g]);
              }
            }
          }
        }
      }
      res.send(datagridData);
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "searchPublishProject--> getAllProjects return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post searchPublishProject");
})

//运维中心工程 下载
router.post('/exportPublicProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post exportPublicProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  /*
  var nFind = __dirname.lastIndexOf("Routes");
  var strDataPath = __dirname.substring(0, nFind);
  deleteFolderRecursive(strDataPath + "Data/publishProTemp");
  */
  req.body = pubInter.EscapeAllData(req.body);
  console.log(JSON.stringify(req.body, "", "\t"));
  var tempPublishPath = "../" + global.exportPath + "/publishProTemp";
  var strDataPath = path.resolve(__dirname, tempPublishPath);
  pubInter.delFileAndDir(strDataPath);
  var ProjectPath = path.join(strDataPath, req.body.projectId);
  pubInter.recursiveMakeDir(ProjectPath);
  req.body.projectType = pubInfo.projectType;
  LogManagerObj.debugLog(projectManagerName, "exportPublicProject--> downloadProject param5:" + ProjectPath);
  proPublishConnect.downloadProject(0, opsCenterFileHost, xss(req.query.token), req.body, ProjectPath).then((flag) => {
      LogManagerObj.debugLog(projectManagerName, "exportPublicProject--> downloadProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
      console.log("实例 下载flag=", flag);
      if (flag == true) {
        zipper.sync.zip(strDataPath).compress().save(strDataPath + "/publishPro_" + req.body.projectName + ".zip");
        let pathTemp = "/publishProTemp/publishPro_" + req.body.projectName + ".zip";
        res.send(pathTemp);
      } else {
        res.send("" + false)
      }
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "exportPublicProject--> downloadProject return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post exportPublicProject");
})

//运维中心工程 删除
router.post('/deletPublicProject', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post deletPublicProject");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var jsonPara = pubInter.EscapeAllData(req.body);
  jsonPara.solutionName = solutionInfo.solutionName;
  jsonPara.solutionId = solutionInfo.GUID; //"c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
  console.log(jsonPara);
  proPublishConnect.deleteProject(0, opsCenterFileHost, xss(req.query.token), jsonPara)
    .then((flag) => {
      LogManagerObj.debugLog(projectManagerName, "deletPublicProject--> deleteProject return:" + typeof flag == 'object' ? JSON.stringify(flag) : flag);
      console.log("实例 删除flag=", flag);
      res.send(flag);
    })
    .catch( // 记录失败原因
      (reason) => {
        LogManagerObj.errorLog(projectManagerName, "deletPublicProject--> deleteProjects return deal Error:" + typeof reason == 'object' ? JSON.stringify(reason) : reason);
        res.send('err_' + reason);
      });
  LogManagerObj.traceLog(projectManagerName, "Leave post deletPublicProject");
})

//非线性表 查询
router.post('/getNonLineList', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getNonLineList");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var proPath = pubInter.joinPath(xss(req.query.ProjectID), xss(req.query.ProjectEdition), xss(req.query.ProjectName));
  let nonlineData;
  var nonlinePath = proPath + '/NonlinearInfo.json';
  let nonLineJSON = pubInter.readJson(nonlinePath);
  if (nonLineJSON.Error == false) {
    nonlineData = nonLineJSON.data;
    res.send(nonlineData.NonlinearTableList);
  } else {
    console.log(nonLineJSON.ErrorDesc);
    res.send(nonLineJSON.ErrorDesc);
    return;
  }
  LogManagerObj.traceLog(projectManagerName, "Leave post getNonLineList");
})

//非线性表 新建属性初始化
router.post('/getNonLineProperty', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getNonLineProperty");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  var nonlinePath = global.propertyPath + '/NonlinearInfo.json';
  let nonLineJSON = pubInter.readJson(nonlinePath);
  if (nonLineJSON.Error == false) {
    res.send(nonLineJSON.data);
  } else {
    console.log(nonLineJSON.ErrorDesc);
    res.send(nonLineJSON.ErrorDesc);
    return;
  }
  LogManagerObj.traceLog(projectManagerName, "Leave post getNonLineProperty");
})

//非线性表 新建提交
router.post('/addNewNonlineTable', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post addNewNonlineTable");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  req.body = pubInter.EscapeAllData(req.body);
  var proPath = pubInter.joinPath(req.body.ProjectID, req.body.ProjectEdition, req.body.ProjectName);
  var baseInfo = JSON.parse(req.body.baseInfo);
  var mapData = JSON.parse(req.body.mapData);
  var nonlinePath = proPath + '/NonlinearInfo.json'; //读取非线性表json
  let nonlineJSON = pubInter.readJson(nonlinePath);
  if (nonlineJSON.Error == false) {
    let nonlineData = nonlineJSON.data;
    var largestNum = 0;
    for (var n = 0; n < nonlineData.NonlinearTableList.length; n++) {
      if (Number(nonlineData.NonlinearTableList[n].TableID) > largestNum) {
        largestNum = Number(nonlineData.NonlinearTableList[n].TableID);
      }
      if (baseInfo[0].value == nonlineData.NonlinearTableList[n].TableName) {
        res.send('重名');
        return;
      }
    }
    var newNonlineInfo = {};
    newNonlineInfo.TableID = largestNum + 1;
    newNonlineInfo.TableName = baseInfo[0].value;
    newNonlineInfo.GroupName = "";
    newNonlineInfo.TableDescription = baseInfo[1].value;
    newNonlineInfo.DecimalNum = parseInt(baseInfo[2].value);
    newNonlineInfo.Map = [];
    for (var m = 0; m < mapData.length; m++) {
      var temobj = {};
      for (var index in mapData[m]) {
        temobj[index] = (mapData[m][index]) * 1;
      }
      newNonlineInfo.Map.push(temobj);
    }
    nonlineData.NonlinearTableList.push(newNonlineInfo);
    //fs.writeFileSync(nonlinePath, JSON.stringify(nonlineData, '', "\t"));
    res.send(pubInter.writeJson(nonlinePath, nonlineData));
  } else {
    console.log(nonlineJSON.ErrorDesc);
    res.send(nonlineJSON.ErrorDesc);
    return;
  }
  LogManagerObj.traceLog(projectManagerName, "Leave post addNewNonlineTable");
})

//删除 非线性表
router.post('/deleteNonLine', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post deleteNonLine");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  req.query = pubInter.EscapeAllData(req.query);
  req.body = pubInter.EscapeAllData(req.body);
  var proPath = pubInter.joinPath(req.query.ProjectID, req.query.ProjectEdition, req.query.ProjectName);
  var nonlinePath = proPath + '/NonlinearInfo.json'; //读取非线性表json
  let nonlineJSON = pubInter.readJson(nonlinePath);
  if (nonlineJSON.Error == false) {
    let nonlineObj = nonlineJSON.data;
    let nonlieArr = req.body.nonlines;
    for (var i = 0; i < nonlineObj.NonlinearTableList.length; i++) {
      for (var j = 0; j < nonlieArr.length; j++) {
        if (nonlineObj.NonlinearTableList[i].TableID == nonlieArr[j].TableID) {
          nonlineObj.NonlinearTableList.splice(i, 1);
          i--;
          break;
        }
      }
    }
    try {
      fs.writeFileSync(nonlinePath, JSON.stringify(nonlineObj, "", "\t"));
    } catch (error) {
      console.log(error)
      res.send("删除失败:" + error);
      return;
    }
    res.send("OK");
  } else {
    console.log(nonlineJSON.ErrorDesc);
    res.send(nonlineJSON.ErrorDesc);
    return;
  }
  LogManagerObj.traceLog(projectManagerName, "Leave post deleteNonLine");
})

//非线性表 编辑提交
router.post('/editOneNonlineTable', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post editOneNonlineTable");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  req.body = pubInter.EscapeAllData(req.body);
  var proPath = pubInter.joinPath(req.body.ProjectID, req.body.ProjectEdition, req.body.ProjectName);
  var baseInfo = JSON.parse(req.body.baseInfo);
  var mapData = JSON.parse(req.body.mapData);
  var nonlinePath = proPath + '/NonlinearInfo.json'; //读取非线性表json
  let nonlineJSON = pubInter.readJson(nonlinePath);
  if (nonlineJSON.Error == false) {
    let nonlineData = nonlineJSON.data;
    for (var n = 0; n < nonlineData.NonlinearTableList.length; n++) {
      if (req.body.TableID == nonlineData.NonlinearTableList[n].TableID) {
        nonlineData.NonlinearTableList[n].TableName = baseInfo[0].value;
        nonlineData.NonlinearTableList[n].TableDescription = baseInfo[1].value;
        nonlineData.NonlinearTableList[n].DecimalNum = parseInt(baseInfo[2].value);
        nonlineData.NonlinearTableList[n].Map = [];
        for (var m = 0; m < mapData.length; m++) {
          var temobj = {};
          for (var index in mapData[m]) {
            temobj[index] = (mapData[m][index]) * 1;
          }
          nonlineData.NonlinearTableList[n].Map.push(temobj);
        }
        break;
      }
    }
    //fs.writeFileSync(nonlinePath, JSON.stringify(nonlineData, '', "\t"));
    res.send(pubInter.writeJson(nonlinePath, nonlineData));
  } else {
    console.log(nonlineJSON.ErrorDesc);
    res.send(nonlineJSON.ErrorDesc);
    return;
  }
  LogManagerObj.traceLog(projectManagerName, "Leave post editOneNonlineTable");
})

async function uploadProjectAsync(port, opsCenterFileHost, token, ProJsonData, strDataPath, res, req) {
  LogManagerObj.debugLog(projectManagerName, "Enter function uploadProjectAsync");
  var ret = await proPublishConnect.uploadProject(port, opsCenterFileHost, token, ProJsonData, strDataPath);
  console.log("发布result=", ret);
  LogManagerObj.debugLog(projectManagerName, "uploadProjectAsync-->uploadProject return:" + typeof ret == 'object' ? JSON.stringify(ret) : ret);
  res.send("" + ret);
  if (ret == 0) {
    var proPP = pubInter.joinPath(req.body.ProjectID, req.body.ProjectVersion, "") + "/ProjectPorpertyInfo.json";
    let objProPerJson = pubInter.readJson(proPP);
    if (objProPerJson.Error) {
      return;
    }
    let proData = objProPerJson.data;
    //let proData = JSON.parse(fs.readFileSync(proPP, "utf8"));
    proData.publicFlag = 1;
    proData.publicTime = pubInter.getCurrentTime();
    proData.publicPerson = req.query.userName;
    //fs.writeFileSync(proPP, JSON.stringify(proData, '', "\t"));
    pubInter.writeJson(proPP, proData);
  }
  LogManagerObj.debugLog(projectManagerName, "Leave function uploadProjectAsync");
}

//部署工程
router.post('/deployProjectforKss', async function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post deployProjectforKss");
  LogManagerObj.traceLog(projectManagerName + "_query:", req.query);
  LogManagerObj.traceLog(projectManagerName + "_body:", req.body);
  let strProjectID = req.query.ProjectID;
  let strProjectVersion = req.query.ProjectVersion;
  let strProjectName = req.query.ProjectName;
  var proPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName);
  var strCollectPath = "../../../../CollectExe/project";
  var objRes = {
    errcode: 0,
    msg: "部署成功"
  }
  var flag = await portIsOccupied(9433)
  if (!flag) {
    objRes.errcode = 1;
    objRes.msg = "采集服务正在运行,不允许部署工程";
    res.send(objRes);
    return;
  }
  if (!fs.existsSync(proPath)) {
    objRes.errcode = 1;
    objRes.msg = "文件不存在";
    res.send(objRes);
    return;
  }
  if (!fs.existsSync(strCollectPath)) {
    if (!pubInter.recursiveMakeDir(strCollectPath)) {
      objRes.errcode = 1;
      objRes.msg = "创建CollectExe文件失败";
      res.send(objRes);
      return;
    }
  }
  var arrFileList = [];
  let strCoptRes = pubInter.proFileCopy(proPath, strCollectPath, arrFileList);
  if (strCoptRes != "OK") {
    objRes.errcode = 1;
    objRes.msg = strCoptRes;
    res.send(objRes);
    return;
  }
  res.send(objRes);
})

//判断端口是否被占用
function portIsOccupied(port) {
  return new Promise((resolve, reject) => {
    // 创建服务并监听该端口
    var server = net.createServer().listen(port)
    server.on('listening', function () { // 执行这块代码说明端口未被占用
      server.close() // 关闭服务
      resolve(true);
    })
    server.on('error', function (err) {
      if (err.code === 'EADDRINUSE') { // 端口已经被使用
        resolve(false);
      }
    })
  })
}

//获取OPC属性
router.post('/getOPCServerProperty', function (req, res) {
  LogManagerObj.traceLog(projectManagerName, "Enter post getOPCServerProperty");
  var objOPCServerInfo = pubInter.readJson(global.propertyPath + '/OPCConfig.json');
  if (objOPCServerInfo.Error) {
    res.send("读取Data/config/OPCConfig.json失败，错误原因：" + objOPCServerInfo.ErrorDesc);
    LogManagerObj.traceLog(projectManagerName, "Leave post getOPCServerProperty");
    return;
  }
  delete objOPCServerInfo.Error;
  LogManagerObj.traceLog(projectManagerName, "Leave post getOPCServerProperty");
  res.send(JSON.stringify(objOPCServerInfo.data.OPCUAConfig));
  return;
})

//生成opc设备
router.post('/submitOPCUAServer', function (req, res) {
  var retObj = {
    err: false,
    data: ""
  }
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) {
      throw err;
    } {
      const tenantId = req.headers.tenant_id;
      const tenantDir = tenantManager.getProjectGroupService(tenantId).dataStore.tenantDir;
      var proID = req.query.ProjectID;
      let projectPath = path.join(tenantDir, proID,'project')
      
      var devPath = path.join(projectPath,'DeviceInfo.json');
      var devInfo = pubInter.readJson(devPath).data;
      var devConfigPath = "./Data/config/propertyConfigForKF3.6/DeviceProperty.json"
      var devConfigObj = pubInter.readJson(devConfigPath).data;
      var largestNum = 0;
      if (!devInfo || !devInfo.DeviceList) {
        retObj.err = true;
        retObj.data = "路径：" + devPath + " 不存在或文件缺少必要项！";
        res.send(retObj);
        return;
      }
      //add by tingting.wang  生成设备ID
      //设备id递增  
      largestNum = pubInter.generateDeviceID(devInfo, true);
      //md by tingting.wang  屏蔽当前生成设备ID的规则
      // for (var k = 0; k < devInfo.DeviceList.length; k++) {
      //   if (Number(devInfo.DeviceList[k].DeviceID) > largestNum) {
      //     largestNum = Number(devInfo.DeviceList[k].DeviceID);//新建ua设备的deviceID tingting.wang---
      //   }
      // }
      //md end by tingting.wang
      let subDatas = JSON.parse(xss(fields.submitDatas));
      let newDeviceObj = new Object();
      for (let i = 0; i < devConfigObj.rows.length; i++) {
        for (let j = 0; j < subDatas.rows.length; j++) {
          if (devConfigObj.rows[i].code == "MaxReconncetInterval") {
            if (subDatas.rows[j].field != "RecoveryTime") continue;
            //add by tingting.wang 对最大重连时间进行限制
            let MaxReconncetInterval = subDatas.rows[j].value;
            if (MaxReconncetInterval < 0 || MaxReconncetInterval > 604800000) //7天
            {
              retObj.err = true;
              retObj.data = "最大重连时间范围为0-604800000";
              res.send(retObj);
              return;
            }
          //add end
            newDeviceObj[devConfigObj.rows[i].code] = subDatas.rows[j].value;
            break;
          } else if (devConfigObj.rows[i].code == "ReconnectInterval") {
            if (subDatas.rows[j].field != "reconnectTime") continue;
            newDeviceObj[devConfigObj.rows[i].code] = subDatas.rows[j].value;
            break;
          } else if (devConfigObj.rows[i].code == "DeviceName") {
            if (subDatas.rows[j].field != "OPCServerName") continue;
            newDeviceObj[devConfigObj.rows[i].code] = subDatas.rows[j].value;
            break;
          } else if (devConfigObj.rows[i].code == "DevAddress") {
            if (subDatas.rows[j].field != "URL") continue;
            newDeviceObj[devConfigObj.rows[i].code] = subDatas.rows[j].value;
            break;
          } else if (devConfigObj.rows[i].code == "DriverName") {
            newDeviceObj[devConfigObj.rows[i].code] = "OPCUA";
            break;
          } else if (devConfigObj.rows[i].code == "DriverSeries") {
            newDeviceObj[devConfigObj.rows[i].code] = "OPCUA";
            break;
          } else {
            if (devConfigObj.rows[i].valueType == "number") {
              if (devConfigObj.rows[i].code == "Active") {
                newDeviceObj[devConfigObj.rows[i].code] = 1;
                break;
              }
              newDeviceObj[devConfigObj.rows[i].code] = 0;
              break;
            } else {
              newDeviceObj[devConfigObj.rows[i].code] = "";
              break;
            }
          }
        }
      }
      //20240110 追加 PublishInterval、CollectInterval、TriggerType
      //20230111 追加 
      subDatas.rows.forEach(v => {
        let field = "";
        switch (v.field) {
          case "username":
            field = "UserName";
            break;
          case "password":
            field = "PassWord";
            break;
          case "RecoveryTime":
          case "reconnectTime":
          case "OPCServerName":
          case "URL":
            break;
          default:
            field = v.field.slice(0, 1).toUpperCase() + v.field.slice(1);
        }
        if (field) {
          newDeviceObj[field] = v.value;
        }
      })
      //设备名称重复校验
      for (var m = 0; m < devInfo.DeviceList.length; m++) {
        if (devInfo.DeviceList[m].DeviceName == newDeviceObj.DeviceName) {
          retObj.err = true;
          retObj.data = "设备名称重复"
          res.send(retObj);
          return;
        }
      }
      newDeviceObj.DeviceID = largestNum;//md by tingting.wang 不用再进行+1操作
      devInfo.DeviceList.push(newDeviceObj);
      pubInter.writeJson(devPath, devInfo);


      var filePath = projectPath;
      filePath += '/Cert/' + newDeviceObj.DeviceName + "opcuacerts";
      if (!pubInter.recursiveMakeDir(filePath)) {
        res.send("新建" + filePath + "失败");
        return;
      }
      if (files.OPCCACertificate != undefined && files.OPCCACertificate.name != "") {
        let caStream = fs.createReadStream(files.OPCCACertificate.path);
        var caPath = filePath + "/" + files.OPCCACertificate.name;
        let caFileName = fs.createWriteStream(caPath);
        caStream.pipe(caFileName);
        caFileName.on('close', () => {})
      }

      if (files.OPCClientCert != undefined && files.OPCClientCert.name != "") {
        let pubKeyStream = fs.createReadStream(files.OPCClientCert.path);
        var pubPath = filePath + "/" + files.OPCClientCert.name;
        let pubFileName = fs.createWriteStream(pubPath);
        pubKeyStream.pipe(pubFileName);
        pubFileName.on('close', () => {})
      }

      if (files.OPCClientPrivateKey != undefined && files.OPCClientPrivateKey.name != "") {
        let priKeyStream = fs.createReadStream(files.OPCClientPrivateKey.path);
        var priPath = filePath + "/" + files.OPCClientPrivateKey.name;
        let priFileName = fs.createWriteStream(priPath);
        priKeyStream.pipe(priFileName);
        priFileName.on('close', () => {})
      }

      //20240110
      retObj.data = [newDeviceObj.DeviceID];
      // var proFilePath = pubInter.joinPath(proID, proVer, proName) + "/ProjectFileList.json";
      // let fileJSON = pubInter.readJson(proFilePath);
      // if (fileJSON.Error) {
      //   res.send(fileJSON.ErrorDesc);
      //   return;
      // }
      // let fileData = fileJSON.data.FileList;

      // for (var kk = 0; kk < fileData.length; kk++) {
      //   for (var fileIndex in fileData[kk]) {
      //     if (fileData[kk][fileIndex] == "Cert") {
      //       var fileObj = new Object();
      //       fileObj.FolderName = transName;
      //       fileObj.FileList = new Array();
      //       if(global.productType == PRODUCTKF36){
      //           if( files.CACertificate.name != ""){
      //             fileObj.FileList.push(files.CACertificate.name);
      //           }
      //           if( files.ClientCert.name != ""){
      //             fileObj.FileList.push(files.ClientCert.name);
      //           }
      //           if( files.ClientPrivateKey.name != ""){
      //             fileObj.FileList.push(files.ClientPrivateKey.name);
      //           }
      //       }  
      //       fileData[kk].FileList.push(fileObj);
      //     }
      //   }
      // }
      // var lastJson = new Object();
      // lastJson.FileList = fileData;
      //fs.writeFileSync(proFilePath, JSON.stringify(lastJson, '', "\t"));
      res.send(retObj);
      return;
    }
  })
})

//连接测试
router.post('/testConnect', async function (req, res) {
  var retObj = {
    err: false,
    resDesc: ""
  }
  var opcConnectName, opcServerURL, username, password, RecoveryTime, reconnectTime;
  var opcConfigObj = req.body.rows;
  for (let i = 0; i < opcConfigObj.length; i++) {
    let field = opcConfigObj[i].field,
      value = opcConfigObj[i].value;
    switch (field) {
      case "OPCServerName":
        opcConnectName = value;
        break;
      case "URL":
        opcServerURL = value;
        break;
      case "username":
        username = value;
        break;
      case "password":
        password = value;
        break;
      case "RecoveryTime":
        RecoveryTime = value;
        break;
      case "reconnectTime":
        reconnectTime = value;
        break;
    }
    // if(opcConfigObj[i].field == "URL") opcServerURL = opcConfigObj[i].value;
    // else if(opcConfigObj[i].field == "RecoveryTime") RecoveryTime = opcConfigObj[i].value;
    // else if(opcConfigObj[i].field = "reconnectTime") reconnectTime = opcConfigObj[i].value;
    // else 
  }
  reconnectTime = Number(reconnectTime);
  RecoveryTime = Number(RecoveryTime);
  var capath = path.resolve("../../../../sdb/c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190/c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190/kingioserver", req.query.ProID, "1.0.0.1/project")
  //20250901 适配opcua js实现
  //var result = opcConfig.testConnect(opcServerURL, reconnectTime, RecoveryTime, username, password, opcConfigObj[0].value, capath);
  //var serverCertPath = capath + "/Cert/" + opcConnectName + "opcuacerts";
  let OPCinfo = {
    "opcName": opcConnectName,
    "url": opcServerURL,
    "userName": username,
    "passWord": password,
    "maxeconnectimeRT": reconnectTime,
    "recoveryTime": RecoveryTime,
    "securityPolicy": "None",
    "securityMode": "None",
    "serverCertPath": "",
  };
  var result = await opcConfigNew.testConnect(OPCinfo);
  //!20250901

  if (result == 0) {
    retObj.err = false;
  } else {
    retObj.err = true;
    retObj.resDesc = "";
  }
  res.send(retObj);
  return;
})
//删除OPC设备
router.post("/deleteOPC", function (req, res) {
  var retObj = {
    err: false,
    data: ""
  }
  const tenantId = req.headers.tenant_id;
  const tenantDir = tenantManager.getProjectGroupService(tenantId).dataStore.tenantDir;
  var proID = req.query.ProjectID;
  var devPath = path.join(tenantDir, proID,'project','DeviceInfo.json');
  var varPath = path.join(tenantDir, proID,'project','VarInfo.json') ;
  var devInfo = pubInter.readJson(devPath).data;
  var varInfo = pubInter.readJson(varPath).data;
  let data = [];
  if (req.body.length) {
    data = req.body;
  } else {
    data.push(Number(req.query.deivceID));
  }
  let OPCServerName = "";
  //删除OPCServer
  for (let i = 0; i < devInfo.DeviceList.length; i++) {
    // if(deviceID == devInfo.DeviceList[i].DeviceID) {
    if (data.indexOf(devInfo.DeviceList[i].DeviceID) != -1) {
      OPCServerName = devInfo.DeviceList[i].DeviceName;
      devInfo.DeviceList.splice(i, 1);
      let objOneProject = {
        "ProjectID": proID,
        "ProjectVersion": "1.0.0.1",
        "DeviceName": OPCServerName
      }
      findCertDeleFile(objOneProject);
    }
  }
  //删除其下变量
  for (let i = 0; i < varInfo.OPCVAR.length; i++) {
    // if(varInfo.OPCVAR[i].DeviceID == deviceID) {
    if (data.indexOf(varInfo.OPCVAR[i].DeviceID) != -1) {
      varInfo.OPCVAR.splice(i, 1);
      i--;
    }
  }
  pubInter.writeJson(devPath, devInfo);
  pubInter.writeJson(varPath, varInfo);
  res.send(retObj);
  return;
})

function findCertDeleFile(proData) {
  LogManagerObj.traceLog(projectManagerName, "Enter function findProDeleFile");
  var path = global.sdbPath + "/" + proData.ProjectID;
  if (fs.existsSync(path)) { //判断文件夹是否存在
    path = global.sdbPath + "/" + proData.ProjectID + "/" + proData.ProjectVersion + "/project/Cert/" + proData.DeviceName + "Cert";
    if (fs.existsSync(path)) {
      let strResDel = deleteFolderRecursive(path);
      if (strResDel != "OK") {
        return strResDel;
      }
    }
  } else {
    return path + "不存在";
  }
  LogManagerObj.traceLog(projectManagerName, "Leave function findProDeleFile");
  return "OK";
}

//点击变量配置按钮后初始化数据源树
router.post('/InitOPCTree', async function (req, res) {
  var retObj = {
    err: false,
    resDesc: "",
    data: []
  };
  const tenantId = req.headers.tenant_id;
  const tenantDir = tenantManager.getProjectGroupService(tenantId).dataStore.tenantDir;
  var opcServerURL, RecoveryTime, reconnectTime, username, password, capath = "";
  var projectID = req.query.projectID;
  var projectPath = path.join(tenantDir, projectID,'project');
  var selectNode = req.query.OPCnode;
  var OPCpath =path.join(projectPath,'DeviceInfo.json')
  var OPCInfo = pubInter.readJson(OPCpath).data;
  for (let i = 0; i < OPCInfo.DeviceList.length; i++) {
    if (OPCInfo.DeviceList[i].DriverName == "OPCUA" && OPCInfo.DeviceList[i].DeviceName == selectNode) {
      opcServerURL = OPCInfo.DeviceList[i].DevAddress;
      RecoveryTime = OPCInfo.DeviceList[i].MaxReconncetInterval;
      reconnectTime = OPCInfo.DeviceList[i].ReconnectInterval;
      username = OPCInfo.DeviceList[i].UserName;
      password = OPCInfo.DeviceList[i].PassWrod || '';
      break;
    }
  }
  // var result = opcConfig.testConnect(opcServerURL, reconnectTime, RecoveryTime, "", "", selectNode, "NULL");
  // if(result != 0) {
  //   retObj.err = true;
  //   retObj.resDesc = "OPCServer连接失败";
  //   res.send(retObj);
  //   return;
  // }
  capath = projectPath;
  //调接口获取根节点
  //20250901 适配opcua js化
  //var tt = opcConfig.getInitTree(opcServerURL, reconnectTime, RecoveryTime, username, password, selectNode, capath);
  let OPCInfoObj = {
    "opcName": selectNode,
    "url": opcServerURL,
    "userName": username,
    "passWord": password,
    "maxeconnectimeRT": reconnectTime,
    "recoveryTime": RecoveryTime,
    "securityMode": "None",
    "securityPolicy": "Node",
    "serverCertPath": ""
  };
  let tt = await opcConfigNew.getInitTree(OPCInfoObj);
  //
  if (tt.length == 0) {
    retObj.err = true;
    retObj.resDesc = "获取失败";
    res.send(retObj);
    return;
  }
  if (tt.length == 1 && tt[0] == "fault") {
    retObj.err = true;
    retObj.resDesc = "会话失效，请重新打开变量配置";
    res.send(retObj);
    return;
  }

  var arr = [];

  //解析初次数据
  for (let i = 0; i < tt.length; i++) {
    //arr = tt[i].split('#*$!'); //插件版本
    arr = tt[i].split('##&&!!'); //opcau js模块版本
    let eachNode = new Object;
    eachNode.nodeID = arr[0];

    // eachNode.text = arr[3] + '|' + arr[1];
    // eachNode.text = arr[3];
    eachNode.text = arr[0].replace(/\|/g, '_') + '_' + arr[3];
    if (Number(arr[2]) == 1) {
      eachNode.type = "object";
    } else {
      continue;
    }
    eachNode.iconCls = 'icon-opcdevice';
    eachNode.children = [];
    eachNode.state = "close";
    retObj.data.push(eachNode);
  }
  res.send(retObj.data);
  return;
})

//点击对象节点返回内部信息
router.post('/getNodeList', async function (req, res) {
  var retObj = {
    err: false,
    resDesc: "",
    data: []
  };
  var nodeInfo = decodeURIComponent(req.query.displayName);
  // var param = nodeInfo.split('|');
  //20250901 适配upcua js化
  //var tt = opcConfig.getObjInfo(nodeInfo);
  var tt = await opcConfigNew.getObjInfo(nodeInfo);
  //!20250901
  if (tt.length == 1 && tt[0] == "fault") {
    retObj.err = true;
    retObj.resDesc = "会话失效，请重新打开变量配置";
    res.send(retObj);
    return;
  }
  for (let i = 0; i < tt.length; i++) {
    //var arr = tt[i].split('#*$!'); //插件版本
    let arr = tt[i].split('##**##**');
    let eachNode = new Object;
    if (Number(arr[2]) == 1) {
      eachNode.type = "object";
      eachNode.iconCls = 'icon-opcdevice'
    } else if (Number(arr[2]) == 2) {
      let addrobj = [];
      let fIndex = arr[0].indexOf("|");
      let subStr = arr[0].substr(fIndex + 1);
      let sIndex = subStr.indexOf("|");
      addrobj.push(arr[0].substr(0, fIndex));
      addrobj.push(subStr.substr(0, sIndex));
      addrobj.push(subStr.substr(sIndex + 1));

      if (addrobj[1] == "Numeric") {
        eachNode.RegAddress = "ns=" + addrobj[0] + ';i=' + addrobj[2];
      } else eachNode.RegAddress = "ns=" + addrobj[0] + ';s=' + addrobj[2];
      eachNode.type = "var";
      eachNode.iconCls = 'icon-opcvar'
    } else {
      continue;
    }
    eachNode.nodeID = arr[0];
    // eachNode.text = arr[3] + '|' + arr[1];
    eachNode.text = arr[0].replace(/\|/g, '_') + '_' + arr[3];
    // eachNode.text = arr[3];
    eachNode.children = [];
    eachNode.state = "close";
    retObj.data.push(eachNode);
  }
  res.send(retObj.data);
  return;
})

//变量模板
var VarTemplate = {
  "TagName": "",
  "Description": "",
  "TagGroup": "",
  "DeviceName": "",
  "RegName": "",
  "RegAddress": "",
  "RegDataType": 0,
  "TagDataType": 0,
  "AccessType": 0,
  "CollectTimeInterval": 0,
  "DataConvertType": 0,
  "MaxRawValue": 0,
  "MinRawValue": 0,
  "MaxValue": 0,
  "MinValue": 0,
  "NonLinearName": "",
  "DataConvertCoefficient": 0,
  "DataConvertDeviation": 0,
  "DataCleaningType": 0,
  "ValueRangeType": 0,
  "DataCleaningUpperLimit": 0,
  "DataCleaningLowerLimit": 0,
  "ChangeRate": 0,
  "DeadbandRate": 0,
  "TagType": 2,
  "DeviceID": 0,
  "ChannelDriver": "",
  "DeviceSeries": "OPCUA",
  "RedunDeviceID": 0,
  "TagID": 0,
  "VarPlcInfo": "",
  "StorEnable": 1,
  "Enable": 0,
  "HisRecordMode": 0,
  "HisInterval": 0,
  "StorMode": 0,
  "StorCycle": 0,
  "UaTrans": 0,
  "DaTrans": 0,
  "MqTrans": 0,
  "MqInter": 1000
}

async function createUAVarForRestful(varInfo, opcVar, req, res, proPath) {
  let retObj = {
    err: false,
    ErrorDesc: "",
    data: []
  }
  let DeviceID = Number(req.query.DeviceID);
  let DeviceName = req.query.DeviceName;
  let projectID = req.query.ProjectID;
  let projectName = req.query.projectName;
  let devPath = path.join(proPath,'DeviceInfo.json');
  let varPath = path.join(proPath,'VarInfo.json');
  //判断设备是否存在
  var devInfo = pubInter.readJson(devPath).data;
  let findObj = devInfo.DeviceList.find(v => v.DeviceID == DeviceID && v.DeviceName == DeviceName)
  if (!findObj) {
    retObj.err = true;
    retObj.ErrorDesc = "设备不存在，请检查设备ID和设备名称！";
    res.send(retObj);
    return;
  }
  //判断变量名称是否重复
  let param = [];
  for (let i = 0; i < opcVar.length; i++) {
    let e = opcVar[i];
    for (let j = 0; j < varInfo.OPCVAR.length; j++) {
      let v = varInfo.OPCVAR[j];
      if (v.TagName == e.name && v.DeviceID == DeviceID && v.DeviceName == DeviceName) {
        retObj.err = true;
        retObj.ErrorDesc = "变量：" + v.TagName + " 已存在！";
        res.send(retObj);
        return;
      }
    }
    param.push(e.text);
  }
  //通过text获取ua变量信息
  let VarInfo = [];
  if (param.length != 0) {
    //VarInfo = opcConfig.getSubVar(param);//插件版本
    VarInfo = await opcConfigNew.getSubVar(param); //适配opcua js化
  }
  /*
  if(VarInfo.length == 0) {
    res.send("获取ua点属性值失败.");
    return;
  }*/
  let nVarID;
  let nVarID1 = MakeVarID(proPath);
  let nVarID2 = MakeVarID1(proPath);
  let nVarID3 = MakeVarID2(proPath);
  nVarID = Math.max(nVarID1, nVarID2, nVarID3);
  if (nVarID <= 0) {
    res.send("生成变量ID失败");
    LogManagerObj.errorLog(ManagerName, "生成变量ID失败");
    return;
  }
  for (let i = 0; i < VarInfo.length; i++) {
    var s1 = VarInfo[i].split("#*$!"); //A#*$!B|
    var s2 = [];
    let fIndex = s1[0].indexOf("|");
    let subStr = s1[0].substr(fIndex + 1);
    let sIndex = subStr.indexOf("|");
    s2.push(s1[0].substr(0, fIndex));
    s2.push(subStr.substr(0, sIndex));
    s2.push(subStr.substr(sIndex + 1));

    var s3 = s1[1].split("|");
    let TagInfo = {};
    if (s2[0].indexOf('readfailed') == 0) {
      res.send("获取ua点属性值失败." + VarInfo[i]);
      LogManagerObj.errorLog(ManagerName, "获取ua点属性值失败." + VarInfo[i]);
      return;
    }
    for (let j = 0; j < opcVar.length; j++) {
      if (opcVar[j].text == s1[0]) {
        for (x in VarTemplate) {
          if (x == "TagName") {
            TagInfo[x] = opcVar[j].name;
          } else if (x == "RegAddress") {
            if (s2[1] == "Numeric") {
              TagInfo[x] = "ns=" + s2[0] + ';i=' + s2[2];
            } else TagInfo[x] = "ns=" + s2[0] + ';s=' + s2[2];
          }
          // TagInfo[x] = s1[0];
          else if (x == "TagDataType") {
            let DataType = GetDataTypeNum(s3[0]);
            TagInfo[x] = DataType;
          } else if (x == "CollectTimeInterval") TagInfo[x] = 1000;
          else if (x == "AccessType") {
            if (s3.length > 1) {
              TagInfo[x] = 2;
            } else if (s3[0] == "read") {
              TagInfo[x] = 0;
            } else {
              TagInfo[x] = 1;
            }
          } else if (x == "TagID") TagInfo[x] = nVarID++;
          else if (x == "DeviceName") TagInfo[x] = DeviceName;
          else if (x == "DeviceID") TagInfo[x] = Number(DeviceID);
          else if (x == "UaTrans") TagInfo[x] = opcVar[j].UaTrans ? 1 : 0;
          else if (x == "DaTrans") TagInfo[x] = opcVar[j].DaTrans ? 1 : 0;
          else if (x == "MqTrans") {
            if (opcVar[j].MqTrans == undefined) TagInfo[x] = 0;
            else {
              let k = Number(opcVar[j].MqTrans);
              if (k < 0 || k > 3) {
                retObj.err = true;
                retObj.ErrorDesc = "MqTrans is wrong, MqTrans=0,1,2,3";
                res.send(retObj);
                return;
              }
              TagInfo[x] = k;
            }

          } else if (x == "MqInter") {
            if (opcVar[j].MqInter == undefined) {
              TagInfo[x] = 1000;
            } else {
              TagInfo[x] = Number(opcVar[j].MqInter);
            }
          } else TagInfo[x] = VarTemplate[x];
        }
        retObj.data.push(TagInfo);
        //向varInfo中添加变量信息
        varInfo.OPCVAR.push(TagInfo);
        break;
      } else {
        continue;
      }
    }

  }
  //写文件
  pubInter.writeJson(varPath, varInfo);
  res.send(retObj);
  return;
}
//提交变量
router.post('/subVar', async function (req, res) {
  var retObj = {
    err: false,
    ErrorDesc: ""
  }
  var param = [];
  var VarInfo = [];
  var retOPC = [];
  var exitObj = {};
  var DeviceID = Number(req.query.DeviceID);
  var DeviceName = req.query.DeviceName;
  var projectID = req.query.ProjectID;
  const tenantId = req.headers.tenant_id;
  const tenantDir = tenantManager.getProjectGroupService(tenantId).dataStore.tenantDir;
  var proPath = path.join(tenantDir, projectID,'project');
  var projectPath = path.join(proPath,'VarInfo.json');
  var varInfo = pubInter.readJson(projectPath).data;
  var OPCVar = JSON.parse(req.body.data);
  if (varInfo.OPCVAR == undefined) {
    varInfo.OPCVAR = [];
  }
  if (req.query.restful) {
    await createUAVarForRestful(varInfo, OPCVar, req, res ,proPath);
    return;
  }
  //筛选已存在的变量
  /*   for(let i = 0; i < OPCVar.length; i++) {
      for(let j = 0; j < varInfo.OPCVAR.length; j++) {
        if(varInfo.OPCVAR[j].RegAddress == OPCVar[i].RegAddress) {
          retOPC.push(varInfo.OPCVAR[j]);
          exitObj[OPCVar[i].text] = 1;
        }
      }
    } */
  let count = varInfo.DAVAR.length+varInfo.OPCVAR.length+varInfo.TagList.length;
  if(count + OPCVar.length > 20000){
    return res.send('工程变量数量超出点数限制');
  }
  for (let i = 0; i < varInfo.OPCVAR.length; i++) {
    if (varInfo.OPCVAR[i].DeviceID != DeviceID) {
      retOPC.push(varInfo.OPCVAR[i]);
      // exitObj[OPCVar[i].text] = 1;
    }
  }
  for (let i = 0; i < varInfo.OPCVAR.length; i++) {
    for (let j = 0; j < OPCVar.length; j++) {
      if (varInfo.OPCVAR[i].DeviceID == DeviceID && varInfo.OPCVAR[i].RegAddress == OPCVar[j].RegAddress) {
        retOPC.push(varInfo.OPCVAR[i]);
        exitObj[OPCVar[j].text] = 1;
      }
    }
  }
  for (let i = 0; i < OPCVar.length; i++) {
    if (exitObj[OPCVar[i].text] == 1) {
      continue;
    } else {
      param.push(OPCVar[i].text);
    }
  }

  varInfo.OPCVAR = retOPC;
  //20240110
  if (param.length != 0) {
    VarInfo = opcConfig.getSubVar(param);
  }
  let nVarID;
  let nVarID1 = MakeVarID(proPath);
  let nVarID2 = MakeVarID1(proPath);
  let nVarID3 = MakeVarID2(proPath);
  nVarID = Math.max(nVarID1, nVarID2, nVarID3);
  if (nVarID <= 0) {
    res.send("生成变量ID失败");
    VarLogManagerObj.errorLog(VarManagerName, "生成变量ID失败");
    return;
  }

  for (let i = 0; i < VarInfo.length; i++) {
    var s1 = VarInfo[i].split("#*$!");
    var s2 = s1[0].split("|");
    var s3 = s1[1].split("|");
    let TagInfo = {};
    for (let j = 0; j < OPCVar.length; j++) {
      if (OPCVar[j].text == s1[0]) {
        for (x in VarTemplate) {
          if (x == "TagName") {
            TagInfo[x] = OPCVar[j].name;
          } else if (x == "RegAddress") {
            if (s2[1] == "Numeric") {
              TagInfo[x] = "ns=" + s2[0] + ';i=' + s2[2];
            } else TagInfo[x] = "ns=" + s2[0] + ';s=' + s2[2];
          }
          // TagInfo[x] = s1[0];
          else if (x == "TagDataType") {
            let DataType = GetDataTypeNum(s3[0]);
            TagInfo[x] = DataType;
          } else if (x == "CollectTimeInterval") TagInfo[x] = 1000;
          else if (x == "AccessType") {
            if (s3.length > 1) {
              TagInfo[x] = 2;
            } else if (s3[0] == "read") {
              TagInfo[x] = 0;
            } else {
              TagInfo[x] = 1;
            }
          } else if (x == "TagID") TagInfo[x] = nVarID++;
          else if (x == "DeviceName") TagInfo[x] = DeviceName;
          else if (x == "DeviceID") TagInfo[x] = Number(DeviceID);
          else TagInfo[x] = VarTemplate[x];
        }
        // TagInfo["nodeID"] = s1[0];
        varInfo.OPCVAR.push(TagInfo);
        break;
      } else {
        continue;
      }
    }

  }
  pubInter.writeJson(projectPath, varInfo);
  res.send(retObj);
  return;
})


//生成变量ID1
function MakeVarID(proPath) {
  let strJsonPath = "";
  if (global.productType == PRODUCTKF36) {
    strJsonPath = path.join(proPath,'VarInfo.json')
  } else {
    strJsonPath = path.join(proPath,'VarInfo.json')
  }
  var objTagList = {};
  var nStartNum = 0;
  if (platform == "win32" && global.productType == PRODUCTKF40) {
    nStartNum = 5001;
  } else {
    nStartNum = 1;
  }
  objTagList = ReadJson(strJsonPath);
  if (objTagList.Error) {
    console.log(objTagList.ErrorDesc);
    return -1;
  }

  let arrUserTagList = objTagList.TagList.filter(function (tag) {
    return tag.TagType == KVIO_TAG_TYPE_USER;
  })
  let nTagLen = arrUserTagList.length;
  let nVarLen = objTagList.TagList.length;
  if (nTagLen > 0 && arrUserTagList[nTagLen - 1].TagID != undefined && global.productType == PRODUCTKF40) {
    return arrUserTagList[nTagLen - 1].TagID + 1;
  } else if (objTagList.TagList.length > 0 && global.productType == PRODUCTKF36) {
    return objTagList.TagList[nVarLen - 1].TagID + 1;
  } else {
    return nStartNum;
  }
}

//生成变量ID2
function MakeVarID1(proPath) {
  let strJsonPath = "";
  if (global.productType == PRODUCTKF36) {
    strJsonPath = path.join(proPath,'VarInfo.json')
  } else {
    strJsonPath = path.join(proPath,'VarInfo.json')
  }
  var objTagList = {};
  var nStartNum = 0;
  if (platform == "win32" && global.productType == PRODUCTKF40) {
    nStartNum = 5001;
  } else {
    nStartNum = 1;
  }
  objTagList = ReadJson(strJsonPath);
  if (objTagList.Error) {
    console.log(objTagList.ErrorDesc);
    return -1;
  }
  if (objTagList.OPCVAR == undefined) {
    objTagList.OPCVAR = [];
  }
  let arrUserTagList = objTagList.OPCVAR.filter(function (tag) {
    return tag.TagType == KVIO_TAG_TYPE_USER;
  })
  let nTagLen = arrUserTagList.length;
  let nVarLen = objTagList.OPCVAR.length;
  if (nTagLen > 0 && arrUserTagList[nTagLen - 1].TagID != undefined && global.productType == PRODUCTKF40) {
    return arrUserTagList[nTagLen - 1].TagID + 1;
  } else if (objTagList.OPCVAR.length > 0 && global.productType == PRODUCTKF36) {
    return objTagList.OPCVAR[nVarLen - 1].TagID + 1;
  } else {
    return nStartNum;
  }
}
//生成ID3
function MakeVarID2(proPath) {
  let strJsonPath = "";
  if (global.productType == PRODUCTKF36) {
    strJsonPath = path.join(proPath,'VarInfo.json')
  } else {
    strJsonPath = path.join(proPath,'VarInfo.json')
  }
  var objTagList = {};
  var nStartNum = 0;
  if (platform == "win32" && global.productType == PRODUCTKF40) {
    nStartNum = 5001;
  } else {
    nStartNum = 1;
  }
  objTagList = ReadJson(strJsonPath);
  if (objTagList.Error) {
    console.log(objTagList.ErrorDesc);
    return -1;
  }
  objTagList.DAVAR = objTagList.DAVAR || [];
  nStartNum = objTagList.DAVAR.length ? (objTagList.DAVAR[objTagList.DAVAR.length - 1].TagID + 1) : nStartNum;
  return nStartNum
}
router.post('/getOPCTagList', function (req, res) {
  req.query = pubInter.EscapeAllData(req.query);
  let strProjectID = req.query.ProjectID; //获取工程的ID
  const tenantId = req.headers.tenant_id;
  const tenantDir = tenantManager.getProjectGroupService(tenantId).dataStore.tenantDir;
  var projectPath = path.join(tenantDir, strProjectID,'project');
  let DeviceID = req.query.DeviceID;

  if (global.productType == PRODUCTKF36) {
    var strVarJsonPath = path.join(projectPath,"VarInfo.json")
  } else {
    var strVarJsonPath = path.join(projectPath,"VarInfo.json")
  }
  var objTagList = {};
  var objOutTagList = {};
  objTagList = ReadJson(strVarJsonPath);
  if (objTagList.Error == undefined) {
    objOutTagList.Error = true;
    objOutTagList.rows = [];
    objOutTagList.ErrorDesc = "ReadJson错误，缺少Error属性";
  }
  if (objTagList.Error || objTagList.OPCVAR == undefined) {
    objOutTagList.Error = true;
    objOutTagList.rows = [];
    objOutTagList.ErrorDesc = objTagList.ErrorDesc;
  } else {
    objOutTagList.Error = false;
    objOutTagList.ErrorDesc = "";
    objOutTagList.rows = [];
    for (var i = 0; i < objTagList.OPCVAR.length; i++) {
      if (objTagList.OPCVAR[i].DeviceID == DeviceID || DeviceID=='-1') {
        objTagList.OPCVAR[i].tagDataType = objTagList.OPCVAR[i].TagDataType;
        objTagList.OPCVAR[i].TagDataType = GetDataTypeString1(objTagList.OPCVAR[i].tagDataType); //转换数据类型
        objOutTagList.rows.push(objTagList.OPCVAR[i]);
      }
    }
  }
  objOutTagList.total = objOutTagList.rows.length;
  res.send(JSON.stringify(objOutTagList));
  return;
})

//将读写的数组转化为字符串
function GetAccessString(MemberAccexxType) {
  var strAccessType = "";
  switch (MemberAccexxType) {
    case 0:
      strAccessType = "只读";
      break;
    case 1:
      strAccessType = "只写";
      break;
    case 2:
      strAccessType = "读写";
      break;
    default:
      strAccessType = "只读";
      break;
  }
  return strAccessType;
}

//读json文件
function ReadJson(strPath) {
  let objJson = {};
  let strOutPath = pubInter.getFileName(strPath);
  if (fs.existsSync(strPath)) {
    let strJson = "";
    try {
      strJson = fs.readFileSync(strPath);
    } catch (error) {
      objJson.Error = true;
      objJson.ErrorDesc = "读取" + strOutPath + "失败";
      //console.log(strPath + "：" + error.message);
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
router.post('/editCollectTime', function (req, res) {
  //20240121 支持restful批量修改
  let strProjectID = req.query.ProjectID; //获取工程的ID
  const tenantId = req.headers.tenant_id;
  const tenantDir = tenantManager.getProjectGroupService(tenantId).dataStore.tenantDir;
  const projectPath = path.join(tenantDir, strProjectID,'project/VarInfo.json');
  let varInfo = pubInter.readJson(projectPath).data;
  let data = [];
  if (req.body && req.body.length > 0) {
    data = req.body;
  }
  for (let j = 0; j < data.length; j++) {
    // 接口原因需要将小驼峰变为大驼峰
    let e = pubInter.convertObjToUpperCase(data[j])
    let tagID = e.TagID;
    const objResponse = {}
    //根据TagID 查找变量
    let varObj = varInfo.OPCVAR.find(v=>{
        return v.TagID == tagID;
    })
    if(varObj == undefined) {
        objResponse.code = -1;
        objResponse.message = "变量ID：" + tagID + "不存在!";
        res.send(objResponse);
        return;
    }
    //判断编辑的变量名是否重复
    let var0 = varInfo.OPCVAR.find(v=>{
        return v.TagName == e.TagName;
    })
    if(var0 && var0.TagID != tagID) {
        objResponse.code = -1;
        objResponse.message = "变量名：" + var0.TagName + " 重复!";
        res.send(objResponse);
        return;
    }
    for (let i = 0; i < varInfo.OPCVAR.length; i++) {
      if (varInfo.OPCVAR[i].TagID == tagID) {
        Object.keys(e).forEach(v=>{
          varInfo.OPCVAR[i][v] = e[v] == undefined ? varObj[v]:e[v];
        })
        if (e.CollectTimeInterval != undefined) {
          let collectTime = e.CollectTimeInterval;
          if (collectTime < 100 || collectTime > 86400000) {
            objResponse.code = -1;
            objResponse.message = "请输入100-86400000之间的数字"
            res.send(objResponse);
            return;
          }
          varInfo.OPCVAR[i].CollectTimeInterval = collectTime;
        }
        if (e.storEnable != undefined) {
          let storEn = e.storEnable;
          if (storEn != 0 && storEn != 1) {
            objResponse.code = -1;
            objResponse.message = "value of storEable is wrong. 0 or 1"
            res.send(objResponse);
            return;
          }
          varInfo.OPCVAR[i].StorEnable = e.storEnable;
        }
        if (e.UaTrans != undefined) {
          varInfo.OPCVAR[i].UaTrans = Number(e.UaTrans) ? Number(e.UaTrans) : 0;
        }
        if (e.DaTrans != undefined) {
          varInfo.OPCVAR[i].DaTrans = Number(e.DaTrans) ? Number(e.DaTrans) : 0;
        }
        if (e.MqTrans != undefined) {
          let k = Number(e.MqTrans);
          if (k < 0 || k > 3) k = 0;
          varInfo.OPCVAR[i].MqTrans = k;
        }
        if (e.MqInter != undefined) {
          let k = Number(e.MqInter);
          varInfo.OPCVAR[i].MqInter = (k >= 0) ? k : 1000;
        }
        //add by tingting.wang ua变量编辑接口增加存储 
        if(e.StorMode != undefined) {
          let k = Number(e.StorMode);
          varInfo.OPCVAR[i].StorMode = k;
        }
        if(e.StorCycle != undefined) {
          let k = Number(e.StorCycle);
          varInfo.OPCVAR[i].StorCycle = k;
        }
        if(e.AccessType != undefined) {
          let k = Number(e.AccessType);
          varInfo.OPCVAR[i].AccessType = k;
        }
        //add end by tingting.wang
      }
    }
  }
  pubInter.writeJson(projectPath, varInfo);
  res.send("OK");
  return;
})

router.post('/existTag', function (req, res) {
  var retObj = {
    err: false,
    resDesc: "",
    data: []
  };
  var projectID = req.query.projectID;
  var varPath = global.sdbPath + '/' + projectID + '/1.0.0.1/project/VarInfo.json';
  var varInfo = pubInter.readJson(varPath).data;
  if (varInfo.OPCVAR == undefined) {
    varInfo.OPCVAR = [];
  }
  for (let i = 0; i < varInfo.OPCVAR.length; i++) {
    if (varInfo.OPCVAR[i].DeviceID == req.query.deviceID) {
      let eachNode = new Object;
      eachNode.type = "var";
      eachNode.text = varInfo.OPCVAR[i].TagName;
      eachNode.children = [];
      eachNode.state = "close";
      eachNode.RegAddress = varInfo.OPCVAR[i].RegAddress;
      eachNode.iconCls = 'icon-opcvar';
      retObj.data.push(eachNode);
    }
  }
  res.send(retObj.data);
  return;
})

//将数据类型的字符转化为数字
function GetDataTypeNum(MemberDataType) {

  if (MemberDataType == "boolean") {
    return 1;
  } else if (MemberDataType == "Char") {
    //预留一下
    return 4096;
  } else if (MemberDataType == "byte") {
    return 2;
  } else if (MemberDataType == "int16") {
    return 4;
  } else if (MemberDataType == "uint16") {
    return 8;
  } else if (MemberDataType == "BCD") {
    return 16;
  } else if (MemberDataType == "int32") {
    return 32;
  } else if (MemberDataType == "uint32") {
    return 8192;
  } else if (MemberDataType == "LongBCD") {
    return 64;
  } else if (MemberDataType == "int64") {
    return 2048;
  } else if (MemberDataType == "float") {
    return 128;
  } else if (MemberDataType == "double") {
    return 512;
  } else if (MemberDataType == "string") {
    return 256;
  } else if (MemberDataType == "Blob") {
    return 1024;
  } else if (MemberDataType == "uint64") {
    return 16384;
  } else {
    return 0;
  }
}

//将数据类型的数字转化为字符
function GetDataTypeString1(MemberDataType) {
  //VarLogManagerObj.traceLog(VarManagerName, "Enter function GetDataTypeString");
  var strDataType = "";
  switch (MemberDataType) {
    case 1:
      strDataType = "Bool";
      break;
    case 2:
      strDataType = "Byte";
      break;
    case 4:
      strDataType = "Int16";
      break;
    case 8:
      strDataType = "Uint16";
      break;
    case 16:
      strDataType = "BCD";
      break;
    case 32:
      strDataType = "Int32";
      break;
    case 64:
      strDataType = "LongBCD";
      break;
    case 128:
      strDataType = "Float";
      break;
    case 256:
      strDataType = "String";
      break;
    case 512:
      strDataType = "Double";
      break;
    case 1024:
      strDataType = "BLOB";
      break;
    case 2048:
      strDataType = "Int64";
      break;
    case 4096:
      strDataType = "Char";
      break;
    case 8192:
      strDataType = "Uint32";
      break;
    case 16384:
      strDataType = "Uint64";
      break;
  }
  return strDataType;
}

//判断端口是否被占用
function portIsOccupied(port) {
  return new Promise((resolve, reject) => {
    // 创建服务并监听该端口
    var server = net.createServer().listen(port)
    server.on('listening', function () { // 执行这块代码说明端口未被占用
      server.close() // 关闭服务
      resolve(true);
    })
    server.on('error', function (err) {
      if (err.code === 'EADDRINUSE') { // 端口已经被使用
        resolve(false);
      }
    })
  })
}

//监视变量
router.post('/monitorPro', async function (req, res) {
  var objRealTimeList = {
    Error: false,
    ErrorDesc: "",
    rows: [],
    total: 0
  }
  var isRun = await portIsOccupied(9433);
  if (isRun) {
    objRealTimeList.Error = true;
    objRealTimeList.ErrorDesc = '工程没有启动,请启动工程';
    res.send(objRealTimeList);
    return;
  }
  LogManagerObj.debugLog(projectManagerName, "Enter function getRealTimeData");
  let strProVarPath = pubInter.joinPath(req.query.ProjectID, req.query.ProjectVersion, "") + "/VarInfo.json";
  let objReadJson = pubInter.readJson(strProVarPath);
  if (objReadJson.Error) {
    res.send(objReadJson);
    return;
  }
  var arrTagList = objReadJson.data.TagList;


  var restfulVarInfo = new gateWayInterface('127.0.0.1:9433', '/api/v1', true);
  restfulVarInfo.ProcessAsy("post", "/realtimeVarInfo", {}, function (result) {
    if (typeof (result) == "string") {
      result = JSON.parse(result);
    }
    if (result.projectID != req.query.ProjectID) {
      objRealTimeList.Error = true;
      objRealTimeList.ErrorDesc = "该工程没有启动"
      res.send(objRealTimeList);
      return;
    }
    if (result.code != 7) {

      objRealTimeList.Error = true;
      objRealTimeList.ErrorDesc = "接口获取数据失败"
      res.send(objRealTimeList);
      return;
    }
    for (let i = 0; i < result.data.length; i++) {
      let objTemp = JSON.parse(JSON.stringify(result.data[i]));
      let objFind = arrTagList.find(function (tag) {
        return tag.TagID == objTemp.tagID
      })
      objTemp.TagName = objFind.TagName;
      objTemp.TagDataType = pubInter.GetDataTypeString(objFind.TagDataType);
      objTemp.AccessType = pubInter.GetAccessString(objFind.AccessType);
      objTemp.DeviceName = objFind.DeviceName;
      objTemp.quality = pubInter.getQualityString(objTemp.quality);
      objRealTimeList.rows.push(objTemp);
      objRealTimeList.total++;
    }
    res.send(objRealTimeList);
    return;
  })
})
//导出OPC变量
router.post('/exportCollectTag', function (req, res) {
  req.query = pubInter.EscapeAllData(req.query);
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;

  var projectPath = path.join(tenantDir, req.query.ProjectID, 'project');
  let strProjectID = req.query.ProjectID;
  let strProjectVersion = req.query.ProjectVersion;
  let strProjectName = req.query.ProjectName;
  let strProPath = "";
  if (global.productType == PRODUCTKF36) {
    strProPath = path.join(projectPath,'VarInfo.json');
  } else {
    strProPath = path.join(projectPath,'VarInfo.json');
  }
  let strSysType = req.query.SystemType;
  let strFileType = req.query.Type;
  delFileAndDir(global.exportPath + "/var"); //如果存在的话就删除目录
  let tempPath = global.exportPath + "/var";
  var objRes = {};
  objRes.Error = false;
  let createFile = makeDirSync(tempPath); //创建目录
  if (!createFile) {
    objRes.Error = true;
    objRes.data = "创建" + tempPath + "目录失败"
    res.send(objRes);
    return;
  }
  var arrExportVarInfo = [];
  var objAllVarInfo = ReadJson(strProPath);
  if (objAllVarInfo.Error) {
    objRes.Error = true;
    objRes.data = "读取" + strProPath + "失败。错误原因：" + objAllVarInfo.ErrorDesc;
    res.send(objRes);

    return;
  }

  //判断是否是全部导出
  if (req.query.AllExportFlag == "true") {
    var arrExportTags = [];
    for (let i = 0; i < objAllVarInfo.OPCVAR.length; i++) {
      if (objAllVarInfo.OPCVAR[i].TagType == 2) {
        arrExportTags.push(objAllVarInfo.OPCVAR[i].TagName);
      }
    }
  } else {
    var arrExportTags = pubInter.EscapeAllData(req.body.ExportTagList); //导出变量名称的列表
  }

  //获取所有要被导出的变量的信息
  for (let i = 0; i < objAllVarInfo.OPCVAR.length; i++) {
    for (let j = 0; j < arrExportTags.length; j++) {
      if (objAllVarInfo.OPCVAR[i].TagName == arrExportTags[j]) {
        //获取设备的驱动
        let objDevice = getOneDevInfo(strProjectName, strProjectID, projectPath, objAllVarInfo.OPCVAR[i].DeviceName);
        if (objDevice.ErrMsg != "") {
          objRes.Error = true;
          objRes.data = objDevice.ErrMsg;
          res.send(objRes);
          return;
        }
        objAllVarInfo.OPCVAR[i].DriverName = objDevice.DeviceInfo.DriverName;
        objAllVarInfo.OPCVAR[i].DeviceSeries = objDevice.DeviceInfo.DriverSeries;
        objAllVarInfo.OPCVAR[i].SystemPlatform = objDevice.DeviceInfo.SystemPlatform;
        arrExportVarInfo.push(objAllVarInfo.OPCVAR[i]);
        break;
      }
    }
  }

  if (strFileType == "csv") {
    if (!WriteCsv(arrExportVarInfo, tempPath + "/Tag.csv", strSysType)) {
      objRes.Error = true;
      objRes.data = "写入csv出错";
      res.send(objRes);
      return;
    }
    objRes.data = "var/Tag.csv";
  } else {
    //表示是导出json格式的文件
    var objExportJson = {};
    objExportJson.OPCVAR = arrExportVarInfo;
    let resWrite = WriteJson(tempPath + "/Tag.json", objExportJson);
    if (resWrite != "OK") {
      objRes.Error = true;
      objRes.data = "写入json出错,错误原因：" + resWrite;
      res.send(objRes);
      return;
    }
    objRes.data = "var/Tag.json";
  }
  res.send(objRes);
})

//获取一个设备的所有信息
function getOneDevInfo(strProjectName, strProjectID, projectPath, DeviceName) {
  if (global.productType == PRODUCTKF36) {
    var strDevJsonPath = path.join(projectPath,"DeviceInfo.json")
  } else {
    var strDevJsonPath = path.join(projectPath,"DeviceInfo.json")
  }
  let objDeviceInfo = ReadJson(strDevJsonPath);
  let objOneDev = {};
  objOneDev.ErrMsg = "";
  objOneDev.DeviceInfo = {};
  if (objDeviceInfo.Error) {
    objOneDev.ErrMsg = strDevJsonPath + ": " + objDeviceInfo.ErrorDesc;
    return objOneDev;
  } else if (objDeviceInfo.DeviceList == undefined) {
    objOneDev.ErrMsg = strDevJsonPath + ":文件格式错误，缺少DeviceList";
    return objOneDev;
  }
  let objDevice = objDeviceInfo.DeviceList.filter(function (device) {
    return device.DeviceName == DeviceName;
  });

  if (objDevice.length == 0) {
    objOneDev.ErrMsg = "该变量所属的设备(" + DeviceName + ")不存在";
    return objOneDev;
  } else if (objDevice.length > 1) {
    objOneDev.ErrMsg = "该变量所属的设备(" + DeviceName + ")有不止一个";
    return objOneDev;
  }
  objOneDev.DeviceInfo = objDevice[0];
  return objOneDev;
}
//递归删除
function delFileAndDir(pathOfFile) {
  var files = [];
  if (fs.existsSync(pathOfFile)) {
    files = fs.readdirSync(pathOfFile);
    files.forEach(function (file, index) {
      var curPath = pathOfFile + '/' + file;
      if (fs.statSync(curPath).isDirectory()) {
        delFileAndDir(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(pathOfFile);
  }
};

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

function WriteJson(strPath, objJson) {
  let strOutPath = pubInter.getFileName(strPath);
  let strJson = JSON.stringify(objJson, "", "\t");
  try {
    fs.writeFileSync(strPath, strJson);
  } catch (error) {
    console.log(error.message);
    return strOutPath + "写入失败";
  }
  return "OK";
}

//将变量信息写入csv文件
function WriteCsv(arrExportVarInfo, strCsvPath, sysType) {
  if (typeof arrExportVarInfo != "object" || arrExportVarInfo.length == 0) {
    return false;
  }
  let fields = Object.keys(arrExportVarInfo[0]); //获取对象的所有属性
  const json2csvParser = new Json2csvParser({
    fields
  });
  const csv = json2csvParser.parse(arrExportVarInfo);
  var newCsv;
  if (sysType == 1) {
    newCsv = iconv.encode(csv, 'GBK');
  } else {
    newCsv = csv;
  }
  try {
    fs.writeFileSync(strCsvPath, newCsv);
  } catch (error) {
    console.error(error.message);
    return false;
  }
  return true;
}

//导入OPC变量
router.post("/ImportCollectTag", function (req, res) {
  const form = new formidable.IncomingForm();
  form.keepExtensions = true; //保存扩展名
  form.maxFieldsSize = 500 * 1024 * 1024; //上传文件的最大大小
  req.query = pubInter.EscapeAllData(req.query);
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var projectPath = path.join(tenantDir, req.query.ProjectID, 'project');
  form.parse(req, (err, fields, files) => {
    if (err) {
      throw err;
    }
    let strFileName = files.uploadDatas.path;
    let readFile = fs.readFileSync(strFileName);
    //读取当前变量信息
    let strProVarPath = "";
    if (global.productType == PRODUCTKF36) {
      strProVarPath = path.join(projectPath,"VarInfo.json")
    } else {
      strProVarPath = path.join(projectPath,"VarInfo.json")
    }
    var objVarData = ReadJson(strProVarPath);
    let proVarTotal = objVarData.DAVAR.length+objVarData.OPCVAR.length+objVarData.TagList.length;
    if (objVarData.Error) {
      res.send(strProVarPath + "读取失败，原因：" + objVarData.ErrorDesc);
      return;
    }
    if (objVarData.TagList == undefined) {
      res.send(strProVarPath + "格式错误，缺少\"TagList\"");
      return;
    }
    delete objVarData.Error;
    if (objVarData.OPCVAR == undefined) {
      objVarData.OPCVAR = [];
    }

    //开始导入
    var objReadFile = {};
    if (req.query.Type == "csv") {
      objReadFile.OPCVAR = [];
      // modified by  jinlong.feng at 0727 CSV导入编码兼容修改
      readFile = pubInter.decodeImportCsvFile(readFile);
      // end
      let strEnter = "\n";
      if (readFile.indexOf("\r\n") != -1) {
        strEnter = "\r\n";
      }
      let objRow = readFile.split(strEnter);
      var arrField = [];
      for (let i = 0; i < objRow.length; i++) {
        let arrRowData = objRow[i].split(",");
        let objTemp = {};
        if (arrRowData[0] != "") {
          for (let j = 0; j < arrRowData.length; j++) {
            if (i == 0) {
              if (arrRowData[j].charAt(0) == "\"" && arrRowData[j].charAt(arrRowData[j].length - 1) == "\"") {
                arrRowData[j] = arrRowData[j].substring(1, arrRowData[j].length - 1);
              }
              if (arrRowData[j].trim() == '') {
                res.send('数据格式校验错误，不允许列标题为空');
                return;
              }
              arrField.push(arrRowData[j]);
            } else {
              if (arrRowData[j].charAt(0) == "\"" && arrRowData[j].charAt(arrRowData[j].length - 1) == "\"") {
                arrRowData[j] = arrRowData[j].substring(1, arrRowData[j].length - 1);
              }
              objTemp[arrField[j]] = arrRowData[j];
            }
          }
          if (i > 0) {
            objReadFile.OPCVAR.push(objTemp);
          }
        }
      }
    } else { //表示是json
      objReadFile = JSON.parse(readFile.toString());
      if (objReadFile.OPCVAR == undefined) {
        res.send("导入文件的格式不正确，缺少\"OPCVAR\"");
        return;
      }

    }
    if(proVarTotal+objReadFile.OPCVAR.length>20000){
      return res.send('工程变量数量超出点数限制');
    }
    for (let i = 0; i < objReadFile.OPCVAR.length; i++) {
      let t_Name = objReadFile.OPCVAR[i].TagName;
      for (let j = 0; j < objReadFile.OPCVAR.length; j++) {
        if (j == i) continue;
        else if (t_Name == objReadFile.OPCVAR[j].TagName) {
          let ErrorDesc = "失败，文件中含有名称重复设备，请修改！";
          res.send(ErrorDesc);
          return;
        }
      }
    }

    //读取设备信息
    let strDevPath = "";
    if (global.productType == PRODUCTKF36) {
      strDevPath = path.join(projectPath,"DeviceInfo.json")
    } else {
      strDevPath = path.join(projectPath,"DeviceInfo.json")
    }
    var objDevInfo = ReadJson(strDevPath);
    if (objDevInfo.Error) {
      res.send(strDevPath + "读取失败，失败原因：" + objDevInfo.ErrorDesc);
      return;
    }

    var strErrOut = "";
    //生成新的变量ID
    let nVarID1 = MakeVarID(projectPath);
    let nVarID2 = MakeVarID1(projectPath);
    let nVarID3 = MakeVarID2(projectPath);
    let nVarID = Math.max(nVarID1, nVarID2, nVarID3);

    //获取当前工程是属于哪个平台
    let strProInfoPath = "";
    if (global.productType == PRODUCTKF36) {
      strProInfoPath = path.join(projectPath,"ProjectPorpertyInfo.json")
    } else {
      strProInfoPath = path.join(projectPath,"ProjectPorpertyInfo.json")
    }
    let objProInfo = ReadJson(strProInfoPath);
    if (objProInfo.Error) {
      res.send(strProInfoPath + "文件格式错误");
      return;
    }
    //导入文件应有的字段 //md by tingting.wang productType == PRODUCTKF36 去掉deviceID的限制（for成都云图需求)
    if (global.productType == PRODUCTKF36) {
      var arrRequiredField = ["TagID", "TagName", "Description", "DeviceName", "RegName", "RegAddress", "RegDataType", "TagDataType", "AccessType", "CollectTimeInterval",
        "DataConvertType", "MaxRawValue", "MinRawValue", "MaxValue", "MinValue", "DataCleaningType", "DataCleaningUpperLimit", "DataCleaningLowerLimit", "ChangeRate", "DeadbandRate", "TagType",
      /*"DeviceID",*/"ChannelDriver","DriverName","DeviceSeries","SystemPlatform","NonLinearName","DataConvertDeviation","DataConvertCoefficient","RedunDeviceID","StorEnable","Enable",
        "HisRecordMode", "HisInterval", "StorMode", "StorCycle", "UaTrans", "DaTrans", "MqTrans", "MqInter"
      ]; //add by xin.wang ,"NonLinearName" 2020-06-10
    } else {
      var arrRequiredField = ["TagName", "Description", "DeviceName", "RegName", "RegAddress", "TagDataType", "RegDataType", "AccessType", "CollectTimeInterval", "CollectControl",
        "Enable", "CollectOffect", "ForceWrite", "DataConvertType", "MaxRawValue", "MinRawValue", "MaxValue", "MinValue", "NonLinearName", "Unit", "DataFilterEnable", "DeadbandRate",
        "HisRecordMode", "HisInterval", "TagType", "DeviceID", "ChannelDriver", "ChannelName", "DeviceSeries", "DeviceSeriesType", "TagID", "TagExtID"
      ];
    }
    for (let i = 0; i < objReadFile.OPCVAR.length; i++) {
      //检查字段是否齐全
      let j = 0;
      for (j = 0; j < arrRequiredField.length; j++) {
        if (objReadFile.OPCVAR[i][arrRequiredField[j]] == undefined) {
          if (["UaTrans", "DaTrans", "MqTrans", "MqInter"].indexOf(arrRequiredField[j]) != -1) {
            objReadFile.OPCVAR[i][arrRequiredField[j]] = 0;
          } else {
            strErrOut += objReadFile.OPCVAR[i].TagName + "字段不全，缺少" + arrRequiredField[j] + "; ";
            break;
          }
        }
        //将某些字段的字符串转化为数字
        else if (arrRequiredField[j] != "TagName" && arrRequiredField[j] != "Description" && arrRequiredField[j] != "DeviceName" &&
          arrRequiredField[j] != "TagGroup" && arrRequiredField[j] != "RegName" && arrRequiredField[j] != "RegAddress" &&
          arrRequiredField[j] != "NonLinearName" && arrRequiredField[j] != "ChannelDriver" && arrRequiredField[j] != "DriverName" && arrRequiredField[j] != "ChannelName" &&
          arrRequiredField[j] != "DeviceSeries" && arrRequiredField[j] != "Unit" && arrRequiredField[j] != "SystemPlatform" && typeof objReadFile.OPCVAR[i][arrRequiredField[j]] == "string") {
          objReadFile.OPCVAR[i][arrRequiredField[j]] = Number(objReadFile.OPCVAR[i][arrRequiredField[j]]);
        } else if (typeof objReadFile.OPCVAR[i][arrRequiredField[j]] == "string" && objReadFile.OPCVAR[i][arrRequiredField[j]].charAt(0) == "\"" && objReadFile.OPCVAR[i][arrRequiredField[j]].charAt(objReadFile.OPCVAR[i][arrRequiredField[j]].length - 1) == "\"") {
          objReadFile.OPCVAR[i][arrRequiredField[j]] = objReadFile.OPCVAR[i][arrRequiredField[j]].substring(1, objReadFile.OPCVAR[i][arrRequiredField[j]].length - 1);
        }
      }
      if (j < arrRequiredField.length && req.query.Type == "csv") {
        break;
      }
      //名称非法字符校验
      /* if(/[^\w\u4e00-\u9fa5#]+/g.test(objReadFile.TagList[i].TagName)){
        strErrOut += " 第" + Number(i + 1) + "个变量名称含有非法字符; ";
        continue;
      } */

      //字段校验//add by xin.wang 2020/06/10
      /* var proCheck = varCheckObj.varSingleCheck(objReadFile.OPCVAR[i], req.query.SystemPlatform);
      if(proCheck.error){
        strErrOut += " 第" + Number(i + 1) + "个变量" + proCheck.info + " ";
        continue;
      } */
      //检查导入变量的所属设备和驱动是否存在
      let strDeviceName = objReadFile.OPCVAR[i].DeviceName;

      var objFIndDev = objDevInfo.DeviceList.find(function (dev) {
        return (dev.DeviceName == strDeviceName && objReadFile.OPCVAR[i].DeviceID == req.query.DeviceID);
      })
      if (objFIndDev == undefined) {
        strErrOut += objReadFile.OPCVAR[i].TagName + "的设备不存在\n";
        continue;
      }
      //add by tingting.wang 给tag赋值deviceID
      objReadFile.OPCVAR[i].DeviceID = objFIndDev.DeviceID;
      //add end by tingting.wang 
      /*       if(objReadFile.OPCVAR[i].DeviceID != req.query.DeviceID) {
              strErrOut += objReadFile.OPCVAR[i].TagName + "不是该实例的变量\n";
              continue;
            } */

      //检查是否有重名
      var objFindDup = objVarData.OPCVAR.find(function (tag) {
        return tag.TagName == objReadFile.OPCVAR[i].TagName;
      })
      if (objFindDup != undefined) {
        strErrOut += objReadFile.OPCVAR[i].TagName + "已经存在; ";
        continue;
      }

      objReadFile.OPCVAR[i].TagID = nVarID + i;
      objReadFile.OPCVAR[i].TagGroup = req.query.TagGroup;

      objVarData.OPCVAR.push(objReadFile.OPCVAR[i]);
      console.log("已经导入" + (i + 1) + "个变量");
    }

    //写入json文件
    let resWrite = WriteJson(strProVarPath, objVarData);
    if (resWrite != "OK") {
      res.send(resWrite);
      return;
    }
    if (strErrOut != '') {
      res.send(strErrOut);
      return;
    }
    res.send("OK");
    return;
  })
})
module.exports = router;
