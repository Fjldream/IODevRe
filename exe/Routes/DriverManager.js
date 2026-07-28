var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var router = express.Router();
let formidable = require('formidable');
var path = require('path');
var os = require('os');
var xml2js = require("xml2js");
var unzip = require("unzip-stream");
var LogManager = require('./LogInterface');
var LogManagerObj = new LogManager();
var DriverManagerName = "DriverManager";
var publicClass = require('./PublicInterface');//公用函数接口
var pubInter = new publicClass();
var KingConfigClass = require('./KingConfigModule')//校验模块接口
var KingConfigModule = new KingConfigClass();
let tenantManager = require('../lib/services/TenantManager')
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:true}));

var pathSep;
var strPlatFormType = "";
var drivernode;
var strCpuArch = os.arch();
strCpuArch = pubInter.convertObjToUpperCase(strCpuArch);
if( os.type == "Linux"){
  pathSep = "/";
  strPlatFormType = "Linux";
}else if( os.type == "Windows_NT"){
  pathSep = "\\";
  strPlatFormType = "Windows";
  // drivernode = require('../Bin/lib/drivernode.node');
}else{
  pathSep = "/";
  strPlatFormType = "Windows";
}
var nFind = __dirname.lastIndexOf(pathSep);
var strDataPath = __dirname.substring(0, nFind);
var strDriverPath = strDataPath + pathSep+"Driver"+pathSep+"DriverInfo.json";
/*var strProjectDir = global.sdbPath;
 var objExConfig = ReadJson("../config/externalConfig.json");
if (objExConfig != {} && objExConfig.projectDir != undefined) {
    strProjectDir = objExConfig.projectDir;
} */
//读json文件
function ReadJson(strPath) {
  LogManagerObj.traceLog(DriverManagerName, "Enter function ReadJson");
  let objJson = {};
  let strOutPath = pubInter.getFileName(strPath);
  if (fs.existsSync(strPath)) {
    let strJson = "";
    try {
      strJson = fs.readFileSync(strPath);
    } catch (error) {
      objJson.Error = true;
      objJson.ErrorDesc = "读取" + strOutPath + "失败";
      LogManagerObj.traceLog(DriverManagerName, "Leave function ReadJson");
      return objJson;
    }
    
    try {
      objJson = JSON.parse(strJson); 
      objJson.Error = false;
    } catch (error) {
      objJson.Error = true;
      objJson.ErrorDesc = error.message;
      console.log(error.message);
      LogManagerObj.traceLog(DriverManagerName, "Leave function ReadJson");
      return objJson;
    }

  }
  else{
    objJson.Error = true;
    objJson.ErrorDesc = strOutPath + " 不存在";
    LogManagerObj.traceLog(DriverManagerName, "Leave function ReadJson");
    return objJson;
  }
  LogManagerObj.traceLog(DriverManagerName, "Leave function ReadJson");
  return objJson;
}
  
//写json文件
function WriteJson(strPath, objJson) {
  LogManagerObj.traceLog(DriverManagerName, "Enter function WriteJson");
  let strOutPath = pubInter.getFileName(strPath);
  if (objJson.Error != undefined) {
    delete objJson.Error;
  }
  let strJson = JSON.stringify(objJson, "", "\t");
  try {
    fs.writeFileSync(strPath, strJson);
  } catch (error) {
    LogManagerObj.traceLog(DriverManagerName, "Leave function WriteJson");
    return strOutPath + "写入失败";
  } 
  LogManagerObj.traceLog(DriverManagerName, "Leave function WriteJson");
  return "OK";
}

//获取驱动链路类型的字符串
function GetDriverString(nDriverType) {
  LogManagerObj.traceLog(DriverManagerName, "Enter function GetDriverString");
  let strDriverType = "";
  switch (nDriverType) {
    case 0:
        strDriverType = "串口";
      break;
    case 1:
        strDriverType = "TCP";
      break;
    case 2:
        strDriverType = "UDP";
      break; 
    case 3:
        strDriverType = "TCP/UDP";
      break;     
    default:
        strDriverType = "TCP";
      break;
  }
  LogManagerObj.traceLog(DriverManagerName, "Leave function GetDriverString");
  return strDriverType;
}

//获取驱动链路类型的数字
function GetDriverTypeNum(strDriverType) {
  LogManagerObj.traceLog(DriverManagerName, "Enter function GetDriverTypeNum");
  let nDriverType = "";
  switch (strDriverType) {
    case "COM":
        nDriverType = 0;
      break;
    case "TCP":
        nDriverType = 1;
      break;
    case "UDP":
        nDriverType = 2;
      break; 
    case "TCP/UDP":
        nDriverType = 3;
      break;     
    default:
        nDriverType = "TCP";
      break;
  }
  LogManagerObj.traceLog(DriverManagerName, "Leave function GetDriverTypeNum");
  return nDriverType;
}

//获取驱动列表 restful
router.post('/getDriverListRestful', function (req, res) {
  LogManagerObj.traceLog(DriverManagerName, "Enter Post getDriverList");
  let strSysPlatform = "", strOsType = "";
  req.query = pubInter.EscapeAllData(req.query);
  if (req.query.ProSysPlatform != undefined) {
    strSysPlatform = req.query.ProSysPlatform;//不传，返回所有
  }
  if (req.query.OsType != undefined) {
    strOsType = req.query.OsType;//不传，返回所有
  }
  var objDriverInfo = ReadJson(strDriverPath);
  var objReturn = {};
  objReturn.total = 0;
  objReturn.rows = [];
  objReturn.Error = false;
  if (objDriverInfo.Error) {
      objReturn.Error = true;
      objReturn.ErrorDesc = "读取" + strDriverPath + "失败。错误原因：" + objDriverInfo.ErrorDesc;
      res.send(objReturn);
      return;
  }
  if (objDriverInfo.DriverList == undefined) {
      objReturn.Error = true;
      objReturn.ErrorDesc = strDriverPath + "文件格式错误：缺少\"DriverList\"";
      res.send(objReturn);
      return;
  }
  
  objReturn.rows = [];
  objReturn.Error = false;
  for (let i = 0; i < objDriverInfo.DriverList.length; i++) {     
    if (strSysPlatform != "" && strSysPlatform != objDriverInfo.DriverList[i].SysPlatform) {
      continue;
    }
    if (strOsType != "" && strOsType != objDriverInfo.DriverList[i].OsType) {
      continue;
    }
    objReturn.rows.push(JSON.parse(JSON.stringify(objDriverInfo.DriverList[i])));
  }
  objReturn.total = objReturn.rows.length;
  res.send(objReturn);
  LogManagerObj.traceLog(DriverManagerName, "Leave Post getDriverList");
})

//获取驱动列表
router.post('/getDriverList', function (req, res) {
  LogManagerObj.traceLog(DriverManagerName, "Enter Post getDriverList");
  let strSysPlatform = "", osType;
  req.query = pubInter.EscapeAllData(req.query);
  if (req.query.ProSysPlatform != undefined) {
    strSysPlatform = req.query.ProSysPlatform;
  }
  osType = req.query.OsType;
  var objDriverInfo = ReadJson(strDriverPath);
  var objReturn = {};
  objReturn.total = 0;
  objReturn.rows = [];
  objReturn.Error = false;
  if (objDriverInfo.Error) {
      objReturn.Error = true;
      objReturn.ErrorDesc = "读取" + strDriverPath + "失败。错误原因：" + objDriverInfo.ErrorDesc;
      res.send(objReturn);
      return;
  }
  if (objDriverInfo.DriverList == undefined) {
      objReturn.Error = true;
      objReturn.ErrorDesc = strDriverPath + "文件格式错误：缺少\"DriverList\"";
      res.send(objReturn);
      return;
  }
  
  /* objReturn.rows = objDriverInfo.DriverList;
  objReturn.total = objDriverInfo.DriverList.length; */
  objReturn.rows = [];
  objReturn.Error = false;
  for (let i = 0; i < objDriverInfo.DriverList.length; i++) {     
    if (strSysPlatform && strSysPlatform != objDriverInfo.DriverList[i].SysPlatform) {
      continue;
    }
    if (osType && osType != objDriverInfo.DriverList[i].PlatformType) {//驱动DriverInfo中PlatformType 即OsType
      continue;
    }
    for (let j = 0; j < objDriverInfo.DriverList[i].DeviceSeries.length; j++) {
      let objTemp = JSON.parse(JSON.stringify(objDriverInfo.DriverList[i]));
      if (objDriverInfo.DriverList[i].DeviceSeries.length > 1) {
        objTemp.TreeID = Number(objTemp.DriverID + "." + (j + 1));
        if (j == 0) {
          var nParentTreeID = objTemp.TreeID;
          //objTemp.state = "closed";
        } else {
          objTemp._parentId = nParentTreeID;
          objTemp.DriverID = "--";
          objTemp.DriverName = "--";
        }
      }
      else{
        objTemp.TreeID = objTemp.DriverID;
      }
      objTemp.DriverType = GetDriverString(objDriverInfo.DriverList[i].DriverType[j]);
      objTemp.DeviceSeries = objDriverInfo.DriverList[i].DeviceSeries[j];
      objTemp.iconCls = "icon-blank";
      objTemp.OsType = objDriverInfo.DriverList[i].PlatformType;
      objReturn.rows.push(objTemp);
    }
  }
  objReturn.total = objReturn.rows.length;
  res.send(objReturn);
  LogManagerObj.traceLog(DriverManagerName, "Leave Post getDriverList");
})

//删除文件夹中的文件
function deleteall(path) {
  LogManagerObj.traceLog(DriverManagerName, "Enter function deleteall");
	var files = [];
	if (fs.existsSync(path)) {
		files = fs.readdirSync(path);
		files.forEach(function (file, index) {
			var curPath = path + "/" + file;
			if (fs.statSync(curPath).isDirectory()) { // recurse  
				deleteall(curPath);
			} else { // delete file  
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
  }
  LogManagerObj.traceLog(DriverManagerName, "Leave function deleteall");
};

//递归创建目录
function makeDirSync(pathname){
  LogManagerObj.traceLog(DriverManagerName, "Enter function makeDirSync");
  if(fs.existsSync(pathname)){
    LogManagerObj.traceLog(DriverManagerName, "Leave function makeDirSync");
    return true;
  }else{
    if(makeDirSync(path.dirname(pathname))){
      try {
        fs.mkdirSync(pathname);
      } catch (error) {
        LogManagerObj.traceLog(DriverManagerName, "Leave function makeDirSync");
        return false;
      }
      LogManagerObj.traceLog(DriverManagerName, "Leave function makeDirSync");
      return true;
    }
    else{
      LogManagerObj.traceLog(DriverManagerName, "Leave function makeDirSync");
      return false;
    }
  }
  LogManagerObj.traceLog(DriverManagerName, "Leave function makeDirSync");
}

//安装驱动
router.post('/AddDriverInfo', function(req,res){
  //读取驱动json文件
  LogManagerObj.traceLog(DriverManagerName, "Enter post AddDriverInfo");
  var objDriverInfo = ReadJson(strDriverPath);
  if (objDriverInfo.Error) {
    res.send(objDriverInfo.ErrorDesc);
    return;
  }
  if (objDriverInfo.DriverList == undefined) {
    res.send(strDriverPath + "文件格式错误，缺少\"DriverList\"");
    return;
  }
  if (objDriverInfo.SysPlatformInfo == undefined) {
    res.send(strDriverPath + "文件格式错误，缺少\"SysPlatformInfo\"");
    return;
  }
  req.query = pubInter.EscapeAllData(req.query);
  var strProjectName = req.query.ProjectName;
  const form = new formidable.IncomingForm();

	//form.uploadDir = __dirname + "/Data/Project/Driver";//上传文件的保存路径
	form.keepExtensions = true;//保存扩展名
  form.maxFieldsSize = 200 * 1024 * 1024;//上传文件的最大大小

  form.parse(req, async function (err, fields, files) {
    if (err) {
      console.error(err);
      res.send(err.message);
      return;
    }
    //fields = pubInter.EscapeAllData(fields);
    var nCount = 0;
    
    let strDel = pubInter.delFileAndDir(strDataPath + pathSep + "Driver" + pathSep + "Temp");//先删除temp文件夹
    /* if (strDel != "OK") {
      res.send(strDel);
      return;
    } */
    for (let fileName in files) {
      if (files[fileName].name.indexOf('.zip') ==  -1) {
        res.send(files[fileName].name + "的文件类型不是zip");
        return;
      }
      nCount++;
      var objNewDriver = {};
      let objInput = JSON.parse(req.query.DriverInfo);
      for (let i = 0; i < objInput.length; i++) {
        if (objInput[i].key != "DriverFile") {
          objNewDriver[objInput[i].key] = objInput[i].value;
        }        
      }
      objNewDriver.DriverCreator = req.query.Creator;
  
      //创建临时存放驱动文件的目录
      if(!makeDirSync(strDataPath + pathSep + "Driver" + pathSep + "Temp")){
        res.send('创建Temp文件夹失败');
        return;
      }
      // makeDirSync(strDataPath+ "/Driver/Temp");
      let strFileName = files[fileName].path;
      let readStream = fs.createReadStream(strFileName);
      let writeStream = unzip.Extract({ path:strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName });
      readStream.pipe(writeStream);
      //如果只有一个驱动，那么zip里直接放驱动文件或者放在一个文件夹里都行，如果是多个驱动（批量安装），那么必须要把每个驱动放在一个文件夹里，同时批量安装的驱动必须都是同样的平台下的
      //注：zip中要么都是文件，要么都是文件夹，不能既有文件又有文件夹
      let newDriverInfo = [];//20240131
      let resUnzip = await unzipFile(objNewDriver, strDataPath, fileName, writeStream, objDriverInfo,strFileName, newDriverInfo);
      if (resUnzip != "OK") {
        res.send(resUnzip);
        return;
      }
      //在系统临时文件中删除该zip文件
      try {
        fs.unlinkSync(strFileName);
      } catch (error) {
        console.error(error);
        res.send(error.message);
        return;
      }
      if (nCount == Object.getOwnPropertyNames(files).length) {
        let resWrite = WriteJson(strDriverPath, objDriverInfo);
        if (resWrite != "OK") {
          res.send(strDriverPath + "写入失败，原因：" + resWrite);
          return;
        }
        res.send({code:"OK", data:newDriverInfo});
      }
    }
  })
  LogManagerObj.traceLog(DriverManagerName, "Leave post AddDriverInfo");
})

// 判断驱动文件是Linux平台还是Windows
function judgingPlatform(strDataPath) {
  let Driverfiles = fs.readdirSync(strDataPath);

  var hasStr1 = Driverfiles.some(item => item.includes('.dll'));
  var hasStr2 = Driverfiles.some(item => item.includes('.so'));

  if(hasStr1 && !hasStr2){
    return "Windows";
  }else if(!hasStr1 && hasStr2){
    return "Linux";
  }else{
    return "-1";
  }
  return "-1";
}

var SOPath;
var DriverPath;
// 异步解压文件
async function unzipFile(objNewDriver, strDataPath, fileName, writeStream, objDriverInfo, strFileName, newDriverInfo) {
  return new Promise((resolve, reject) => {
    let strXmlName = "";
    let strDesName = "";
    let strDriverSoName = "";
    let strDriverDependName = "";
    let strDriverFileType = "";
    
    writeStream.on('close', () => {
      var strPlatFormTypeLine = judgingPlatform(strDataPath + pathSep +"Driver" + pathSep + "Temp" + pathSep + fileName);
      if(strPlatFormType == "-1"){
        resolve("zip中的文件内容非法");
        return;
      }
      //let tempSysType = os.type;
      // if(strPlatFormType !== strPlatFormTypeLine){
      //   resolve(strPlatFormType + "系统中不允许安装" + strPlatFormTypeLine + "驱动");
      //   return;
      // }

      let strDriverName = "";
      //先检查zip中是否只有文件夹
      let Driverfiles = fs.readdirSync(strDataPath + pathSep +"Driver" + pathSep + "Temp" + pathSep + fileName);
      let arrFiles = Driverfiles.filter(function (file) {
        let stat = fs.statSync(strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName + pathSep + file);
        return !stat.isDirectory();
      })
      
      if (arrFiles.length == 0) {//表示全是文件夹，即为批量安装驱动
        resolve("zip中的文件内容非法");
        return;
      }
      //260409 gxx delete

      let arrOneDriverFiles = fs.readdirSync(strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName);
      let objOneNewDriver = JSON.parse(JSON.stringify(objNewDriver));//当前该驱动信息
      delete objOneNewDriver.OsType;
      for (let i = 0; i < arrOneDriverFiles.length; i++) {
        if (arrOneDriverFiles[i].indexOf(".xml")!=-1) {
          strXmlName = arrOneDriverFiles[i];
          strDriverName = strXmlName.substring(0, strXmlName.indexOf(".xml"));
        }else if (arrOneDriverFiles[i].indexOf(".des")!=-1) {
          strDesName = arrOneDriverFiles[i];
          strDriverName = strDesName.substring(0, strDesName.indexOf(".des"));
        }
        else if ((arrOneDriverFiles[i].indexOf(".dll")!=-1 || arrOneDriverFiles[i].indexOf(".so")!=-1) && arrOneDriverFiles[i].toLowerCase().indexOf(strDriverName.toLowerCase())!=-1) {
          strDriverSoName = arrOneDriverFiles[i];
        }else{
          if (strDriverDependName == "") {
            strDriverDependName += arrOneDriverFiles[i];
          }else{
            strDriverDependName += "|" + arrOneDriverFiles[i];
          }
        }
      }
      if(objNewDriver.OsType == "Windows"){
        if (strXmlName =="" || strDesName == "" || strDriverSoName == ""){
          fs.unlinkSync(strFileName);	
          deleteall(strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName);
          resolve("zip中的文件不全");
          return;
        }
      }else{
        if ((strXmlName =="" && strDesName == "" ) || strDriverSoName == ""){//检验该zip文件中是否有驱动的xml文件
          fs.unlinkSync(strFileName);	
          deleteall(strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName);
          resolve("zip中的文件不全");
          return;
        }
      }
      
      let strXmlPath =	strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName + pathSep + strXmlName;//xml文件路径
      let strSoPath = strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName + pathSep + strDriverSoName;//so文件路径
      let strDesPath =	strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName + pathSep + strDesName;//des文件路径
      var arrNewDriver = [];
      objOneNewDriver.DriverName = strDriverName;
      objOneNewDriver.DependFile = strDriverDependName;
    
      var myDate = new Date();
      objOneNewDriver.LastDriverModifyTime = myDate.toLocaleDateString() + " " + myDate.getHours() + ":" + 
      myDate.getMinutes() + ":" + myDate.getSeconds();  
      objOneNewDriver.PlatformType = strPlatFormTypeLine;
      // 有xml文件读xml，没有xml调驱动
      if(strXmlName == "" && strSoPath != "" && strDesPath != ""){ // 没有xml文件的情况
        var resInfoLoad = drivernode.DriverInfoLoad(strSoPath);
        if(resInfoLoad.rc == 0){
          resolve("驱动文件读取失败");
        return;
        }

        objOneNewDriver.DeviceSeries = [];
        objOneNewDriver.DriverType = [];
        objOneNewDriver.DriverVersion = resInfoLoad.rarr[0].Version;
        let str = resInfoLoad.rarr[0].DevCLSID;
        objOneNewDriver.CLSID = str.replace(/({|})/g, ""); // 去掉{}
        objOneNewDriver.DriverCompany = resInfoLoad.rarr[0].Manufacturer;
        objOneNewDriver.DriverDevelopmentVersion = 3;//表示是3.0开发包开发的驱动   没xml文件即为3.0开发包 已和竹工确认

        var deriverInfos = resInfoLoad.rarr;
        for(const item of deriverInfos){
          objOneNewDriver.DriverType.push(GetDriverTypeNum(item.Commode));
          objOneNewDriver.DeviceSeries.push(item.Devseries);
        }

      }else{
        //读驱动的xml文件
        try {
          var buf = fs.readFileSync(strXmlPath, "utf-8");
        } catch (error) {
          resolve(strXmlPath + "读取失败，失败原因：" + error.message);
          return;
        }
        xml2js.parseString(buf, { explicitArray: false }, function (err, json) {
          if (err) {
            console.log(err.message);
            objReturn.Error = true;
            objReturn.ErrorDesc = strXmlPath + "读取失败，失败原因：" + err.message;
            resolve(objReturn);
            return;
          }
          if (typeof (json["XML"]) == 'object') {
            strXmlName = "XML";
          }
          objOneNewDriver.DeviceSeries = [];
          objOneNewDriver.DriverType = [];
          
          for (x in json[strXmlName][strDriverName]) {
            if (x == "DriveVersion") {
              objOneNewDriver.DriverVersion = json[strXmlName][strDriverName][x];
            }
            if (x == "CLSID") {
              objOneNewDriver.CLSID = json[strXmlName][strDriverName][x];
            }
            if (typeof (json[strXmlName][strDriverName][x]) == 'object') {
              var objXmlDriverInfo = json[strXmlName][strDriverName][x];
              if(objXmlDriverInfo.hasOwnProperty('DeviceInfo') && objXmlDriverInfo.hasOwnProperty('AddressInfo') && objXmlDriverInfo.hasOwnProperty('RegisterInfo') )
              {
                objOneNewDriver.DeviceSeries.push(x);
              }
              if (objXmlDriverInfo.DeviceInfo) {
                if (objXmlDriverInfo.DeviceInfo.TransType) {
                  objOneNewDriver.DriverType.push(GetDriverTypeNum(objXmlDriverInfo.DeviceInfo.TransType));
                }
                if (objXmlDriverInfo.DeviceInfo.Company) {
                  objOneNewDriver.DriverCompany = objXmlDriverInfo.DeviceInfo.Company;
                }
                /*if (objXmlDriverInfo.DeviceInfo.name) {
                  objOneNewDriver.DeviceSeries.push(objXmlDriverInfo.DeviceInfo.name);
                }*/
              } else {
                resolve("xml文件格式不正确");
                return;
              }
              if (objXmlDriverInfo.RegisterInfo) {
                let nRuleCount = 1;
                let nStringRule = 0;
                for (let key in objXmlDriverInfo.RegisterInfo) {
                  var objRegisterInfo = objXmlDriverInfo.RegisterInfo[key];
                  while (objRegisterInfo["RegisterRule" + nRuleCount] != undefined) {
                      if (objRegisterInfo["RegisterRule" + nRuleCount].RegFormat == "STRING1") {
                          nStringRule++;
                      }
                      nRuleCount++;
                  }
                  if (nStringRule == nRuleCount - 1 && nStringRule != 0) {
                    objOneNewDriver.DriverDevelopmentVersion = 3;//表示是3.0开发包开发的驱动
                    break;
                  }
                }
                if (objOneNewDriver.DriverDevelopmentVersion != 3) {
                  objOneNewDriver.DriverDevelopmentVersion = 4;//表示是4.0开发包开发的驱动
                }
              } else {
                resolve("xml文件格式不正确");
                return;
              }
              arrNewDriver.push(JSON.parse(JSON.stringify(objOneNewDriver)));
            }
          }   
        })
      }
      //判断安装的驱动原来是否已经存在
      let nIndex = -3;
      for (let i = 0; i <  objDriverInfo.DriverList.length; i++) {
        var arrFindDev = [];
        for (let j = 0; j < objOneNewDriver.DeviceSeries.length; j++) {
          var objFindDev = objDriverInfo.DriverList[i].DeviceSeries.find(function (driver) {
            return driver == objOneNewDriver.DeviceSeries[j];
          })
          if (objFindDev != undefined) {
            arrFindDev.push(objFindDev);
          }
        }
        if (objDriverInfo.DriverList[i].DriverName == strDriverName && arrFindDev.length != 0 && objDriverInfo.DriverList[i].PlatformType == objOneNewDriver.PlatformType && objDriverInfo.DriverList[i].SysPlatform == objOneNewDriver.SysPlatform && objDriverInfo.DriverList[i].DriverVersion == objOneNewDriver.DriverVersion) {
          nIndex = i;
          objOneNewDriver.DriverID =  objDriverInfo.DriverList[i].DriverID;
          break;
        } else if(objDriverInfo.DriverList[i].DriverName == strDriverName && arrFindDev.length != 0 && objDriverInfo.DriverList[i].SysPlatform == objOneNewDriver.SysPlatform && objDriverInfo.DriverList[i].DriverVersion != objOneNewDriver.DriverVersion) {
          //表示更新驱动版本
          nIndex = -2;          
        } else{
          if(nIndex == -3) {
            nIndex = -1;
          }
        }
      }
        
      if (nIndex != -1 && nIndex != -2 && nIndex >= 0) {
        //表明原来存在该驱动，现在属于更新驱动
         objDriverInfo.DriverList[nIndex] = objOneNewDriver;
      } else {
        //表明原来不存在该驱动，现在属于新增驱动
        if (objDriverInfo.DriverList.length > 0) {
          objOneNewDriver.DriverID = objDriverInfo.DriverList[objDriverInfo.DriverList.length - 1].DriverID + 1;
        } else {
          objOneNewDriver.DriverID = 1;
        }
        objDriverInfo.DriverList.push(objOneNewDriver);
      }
      //20250612 表示新版本驱动安装，替换工程中所有旧版驱动文件 
      if(nIndex == -2){
        //替换工程文件中的低版本驱动
        let strProDriverPath = "";
        let arrProjectPath = fs.readdirSync(global.sdbPath);
        for (let i = 0; i < arrProjectPath.length; i++) {
          if (arrProjectPath[i].indexOf(".") == -1) {//表示是一个目录
            if (global.productType == 1) {//表示是KF3.6
              let strProjectVersion = fs.readdirSync(global.sdbPath + "/" + arrProjectPath[i])[0];//目前所有工程只有一个版本
              strProDriverPath = global.sdbPath + "/" + arrProjectPath[i] + "/" + strProjectVersion + "/project/Driver";
            } else {
              strProDriverPath = global.sdbPath + "/" + arrProjectPath[i] + "/Driver";
            }
            //删除工程文件中旧版本驱动
            var ProDriverInfo = pubInter.readJson(strProDriverPath + "/DriverInfo.json").data;
            let DriverSoName = strDriverSoName, XMLName;
            for(let k = 0;k < ProDriverInfo.DriverList.length;k++) {
              if(ProDriverInfo.DriverList[k].DriverName == strDriverName &&ProDriverInfo.DriverList[k].SysPlatform == objNewDriver.SysPlatform) {
                // if(ProDriverInfo.DriverList[k].DriverVersion == "66.1.1.1") {
                //   DriverSoName = "lib" + strDriverName + ".so"
                // } else DriverSoName = "lib" + strDriverName + ".so." + ProDriverInfo.DriverList[k].DriverVersion;  
                XMLName = strDriverName + ".xml";
                ProDriverInfo.DriverList[k].DriverVersion = objOneNewDriver.DriverVersion;
                break;
              }
            }
            if(DriverSoName == undefined && XMLName == undefined) continue;

            if(DriverSoName != undefined && XMLName != undefined) {
              //删除旧版本驱动
              fs.unlinkSync(strProDriverPath + "/" + DriverSoName);
              fs.unlinkSync(strProDriverPath + "/" + XMLName);
            }
            
            //将文件复制到工程文件中
            for (let j = 0; j < arrOneDriverFiles.length; j++) {
              // if (fs.existsSync(strProDriverPath + "/" + arrOneDriverFiles[j]) == false) {
                fs.copyFileSync(strDataPath + "/Driver/Temp/" + fileName + "/" + arrOneDriverFiles[j], strProDriverPath + "/" + arrOneDriverFiles[j])
              // }
            }
            //写驱动文件
            pubInter.writeJson(strProDriverPath + "/DriverInfo.json",ProDriverInfo);
            //写设备文件
            var DevPath = path.resolve(strProDriverPath,"../");
            DevPath = DevPath + "/DeviceInfo.json";
            var DevInfo = pubInter.readJson(DevPath).data;
            for(let m = 0;m < DevInfo.DeviceList.length;m++){
              if(DevInfo.DeviceList[m].DriverName == strDriverName){
                DevInfo.DeviceList[m].DriverVersion = objOneNewDriver.DriverVersion;
              }
            }
            pubInter.writeJson(DevPath,DevInfo);
          }
        }
      }
      //20250612 end
      newDriverInfo.push(objOneNewDriver);//20240131
      let strNewFolder = "";
      // if(strPlatFormType == "Linux"){
      //   strNewFolder = strDataPath + pathSep + "Driver" + pathSep + objOneNewDriver.SysPlatform + pathSep + objOneNewDriver.DriverCompany + pathSep + strDriverName + pathSep + objOneNewDriver.DriverVersion;//驱动文件夹路径
      // }else
      // {
      //   strNewFolder = strDataPath + pathSep + "Driver" + pathSep + objOneNewDriver.SysPlatform + pathSep + objOneNewDriver.DriverCompany + pathSep + "Windows" + pathSep + strDriverName + pathSep + objOneNewDriver.DriverVersion;//驱动文件夹路径
      // }
      strNewFolder = strDataPath + pathSep + "Driver" + pathSep + objOneNewDriver.SysPlatform + pathSep + objOneNewDriver.PlatformType + pathSep + objOneNewDriver.DriverCompany + pathSep + strDriverName + pathSep + objOneNewDriver.DriverVersion;//驱动文件夹路径
      SOPath = strNewFolder + pathSep + strDriverSoName;
      DriverPath = strNewFolder;
      if (!fs.existsSync(strNewFolder)) {
        pubInter.recursiveMakeDir(strNewFolder);
      }
      let arrCopyList = [];
      let strResCopy = pubInter.proFileCopy(strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName, strNewFolder, arrCopyList);
      if (strResCopy != "OK") {
        resolve(strResCopy);
        return;
      }

      pubInter.delFileAndDir(strDataPath + pathSep + "Driver" + pathSep + "Temp" + pathSep + fileName);
      resolve("OK")
    })
  })
}


//递归删除
function delFileAndDir(pathOfFile){
  LogManagerObj.traceLog(DriverManagerName, "Enter function delFileAndDir");
  var files = [];
  if(fs.existsSync(pathOfFile)){
    files = fs.readdirSync(pathOfFile);
    files.forEach(function(file, index){
      var curPath = pathOfFile + '/' + file;
      if(fs.statSync(curPath).isDirectory()){
        delFileAndDir(curPath);
      }else{
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(pathOfFile);
  }
  LogManagerObj.traceLog(DriverManagerName, "Leave function delFileAndDir");
};
//卸载驱动
router.post('/deleteDriverInforestful',function (req, res) {
  LogManagerObj.traceLog(DriverManagerName, "Enter post deleteDriverInfo");
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  req.query = pubInter.EscapeAllData(req.query);
  let strPlatformType = req.query.PlatformType;  // 20230518
  let strDriverName = req.query.DriverName;
  let strDeviceSeries = req.query.DeviceSeries;
  let strProvider = req.query.ProviderName;
  let strSysPlatform = req.query.SysPlatform;
  let strDriverVersion = req.query.DriverVersion;
  var objDriverInfo = ReadJson(strDriverPath);
  if (objDriverInfo.Error) {
    res.send(objDriverInfo.ErrorDesc);
    return;
  }
  //确认该驱动没有被使用
  var objReadPro = ReadJson(tenantDir + "/projectGroupInfo.json");
  if (objReadPro.Error) {
    res.send(objReadPro.ErrorDesc);
    return;
  }
  let strErr = ""
  let nResFind = findDriverInProjectRestful(objReadPro, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType, strErr,projectGroupService.dataStore); // 20230509
  if (nResFind == -1) {
    res.send(strErr);
    return;
  } else if (nResFind == 1) {
    res.send(strDriverName + "正在使用，无法删除");
    return;
  }

  for (let i = 0; i < objDriverInfo.DriverList.length; i++) {
    let flag = 0;
    if (strDriverName == objDriverInfo.DriverList[i].DriverName && strProvider == objDriverInfo.DriverList[i].DriverCompany 
      && strSysPlatform == objDriverInfo.DriverList[i].SysPlatform && strDriverVersion == objDriverInfo.DriverList[i].DriverVersion
      && strPlatformType == objDriverInfo.DriverList[i].PlatformType) {
        
    

      
        let strDelDriverPath = "";
        // if(objDriverInfo.DriverList[i].PlatformType == "Windows")
        // {
        //   strDelDriverPath = strDataPath + "/Driver/" + strSysPlatform + "/" + strProvider + "/" + "Windows/" + strDriverName + "/" + strDriverVersion;
        // }else
        // {
        //   strDelDriverPath = strDataPath + "/Driver/" + strSysPlatform + "/" + strProvider + "/" + strDriverName + "/" + strDriverVersion;
        // }
        strDelDriverPath = strDataPath + "/Driver/" + strSysPlatform + "/" + objDriverInfo.DriverList[i].PlatformType + "/" + strProvider + "/" + strDriverName + "/" + strDriverVersion;
        objDriverInfo.DriverList.splice(i, 1);
        let arrDriverFiles = fs.readdirSync(strDelDriverPath);//获取该驱动到底有哪些文件
        delFileAndDir(strDelDriverPath);
      
      //break;
      flag = 1;
    }
    if(flag == 1 && i != objDriverInfo.DriverList.length){
      objDriverInfo.DriverList[i].DriverID = objDriverInfo.DriverList[i].DriverID - 1;
    }
  }

  let resWrite = WriteJson(strDriverPath, objDriverInfo);
  res.send(resWrite);
  LogManagerObj.traceLog(DriverManagerName, "Leave post deleteDriverInfo");
})

//在所有工程文件中查找是否有某个正在使用的驱动
function findDriverInProjectRestful(groupList, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType, strErr,dataStore) { // 20230509
  let arrGroupList = [];
  let tenantDir = dataStore.tenantDir;
  for(let i=0;i<groupList.length;i++){
    let data = dataStore.find('projects', { projectGroupId: groupList[i].guid})
    arrGroupList = [...arrGroupList,...data]
  }
  for (let i = 0; i < arrGroupList.length; i++) {
    // if (arrGroupList[i].guid && arrGroupList[i].ProjectObjectList) {//表示是个工程组
    //   if (findDriverInProjectRestful(arrGroupList[i].ProjectObjectList, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType, strErr) == 1) { // 20230509
    //     return 1;
    //   }
    // } else {
      let strProjectID = arrGroupList[i].guid;
      // 20230509 检查PlatformType
      
      let strDriverInfoPath = path.join(tenantDir,strProjectID,"/project/Driver/DriverInfo.json");
      let objDriverInfo = ReadJson(strDriverInfoPath);
      if(objDriverInfo.DriverList.length > 0){
        if(objDriverInfo.DriverList[0].PlatformType != strPlatformType){
          continue;
        }
      }else{
        continue;
      }
      let strDevPath = path.join(tenantDir,strProjectID,"/project/DeviceInfo.json");
      let objDevInfo = ReadJson(strDevPath);
      if (objDevInfo.Error) {
        strErr = objDevInfo.ErrorDesc;
        return -1;
      }
      for (let j = 0; j < objDevInfo.DeviceList.length; j++) { // 20230509
        if (objDevInfo.DeviceList[j].DriverName == strDriverName && objDevInfo.DeviceList[j].SystemPlatform == strSysPlatform && objDevInfo.DeviceList[j].DeviceProvider == strProvider && objDevInfo.DeviceList[j].DriverVersion == strDriverVersion) {
          return 1;
        }
      // }
    }
  }
  return 0;
}

//卸载驱动
router.post('/deleteDriverInfo',function (req, res) {
  LogManagerObj.traceLog(DriverManagerName, "Enter post deleteDriverInfo");
  req.query = pubInter.EscapeAllData(req.query);
  let strPlatformType = req.query.OsType;  // 20240112
  let strDriverName = req.query.DriverName;
  let strDeviceSeries = req.query.DeviceSeries;
  let strProvider = req.query.ProviderName;
  let strSysPlatform = req.query.SysPlatform;
  let strDriverVersion = req.query.DriverVersion;
  var objDriverInfo = ReadJson(strDriverPath);
  if (objDriverInfo.Error) {
    res.send(objDriverInfo.ErrorDesc);
    return;
  }
  //确认该驱动没有被使用
  var objReadPro = ReadJson(global.sdbPath + "/ProjectGroupList.json");
  if (objReadPro.Error) {
    res.send(objReadPro.ErrorDesc);
    return;
  }
  let strErr = ""
  let nResFind = findDriverInProject(objReadPro.ProjectGroupList, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType, strErr); // 20230509
  if (nResFind == -1) {
    res.send(strErr);
    return;
  } else if (nResFind == 1) {
    res.send(strDriverName + "正在使用，无法删除");
    return;
  }

  for (let i = 0; i < objDriverInfo.DriverList.length; i++) {
    let flag = 0;
    if (strDriverName == objDriverInfo.DriverList[i].DriverName && strProvider == objDriverInfo.DriverList[i].DriverCompany 
      && strSysPlatform == objDriverInfo.DriverList[i].SysPlatform && strDriverVersion == objDriverInfo.DriverList[i].DriverVersion
      && strPlatformType == objDriverInfo.DriverList[i].PlatformType) {
        let delFlag = 0;
      for (let j = 0; j < objDriverInfo.DriverList[i].DeviceSeries.length; j++) {
        if (objDriverInfo.DriverList[i].DeviceSeries[j] == strDeviceSeries) {
          objDriverInfo.DriverList[i].DeviceSeries.splice(j, 1);
          objDriverInfo.DriverList[i].DriverType.splice(j, 1);
          delFlag = 1;
        }
      }

      if (objDriverInfo.DriverList[i].DeviceSeries.length == 0 || delFlag == 1) {
        let strDelDriverPath = "";
        if(objDriverInfo.DriverList[i].PlatformType == "Windows")
        {
          strDelDriverPath = strDataPath + "/Driver/" + strSysPlatform + "/" + strPlatformType + "/" + strProvider + "/"  + strDriverName + "/" + strDriverVersion;
        }else
        {
          strDelDriverPath = strDataPath + "/Driver/" + strSysPlatform + "/" + strPlatformType + "/" + strProvider + "/" + strDriverName + "/" + strDriverVersion;
        }
        objDriverInfo.DriverList.splice(i, 1);
        let arrDriverFiles = fs.readdirSync(strDelDriverPath);//获取该驱动到底有哪些文件
        delFileAndDir(strDelDriverPath);
      }
      //break;
      flag = 1;
    }
    if(flag == 1 && i != objDriverInfo.DriverList.length){
      objDriverInfo.DriverList[i].DriverID = objDriverInfo.DriverList[i].DriverID - 1;
    }
  }

  let resWrite = WriteJson(strDriverPath, objDriverInfo);
  res.send(resWrite);
  LogManagerObj.traceLog(DriverManagerName, "Leave post deleteDriverInfo");
})

//在所有工程文件中查找是否有某个正在使用的驱动
function findDriverInProject(arrGroupList, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType, strErr) { // 20230509
  for (let i = 0; i < arrGroupList.length; i++) {
    if (arrGroupList[i].ProjectGroupID && arrGroupList[i].ProjectObjectList) {//表示是个工程组
      if (findDriverInProject(arrGroupList[i].ProjectObjectList, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType, strErr) == 1) { // 20230509
        return 1;
      }
    } else {
      let strProjectID = arrGroupList[i].ProjectID;
      let strProjectVersion = arrGroupList[i].ProjectVersion;
      // 20230509 检查PlatformType
      let strDriverInfoPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion+ "/project/Driver/DriverInfo.json";
      let objDriverInfo = ReadJson(strDriverInfoPath);
      if(objDriverInfo.DriverList.length > 0){
        if(objDriverInfo.DriverList[0].PlatformType != strPlatformType){
          continue;
        }
      }else{
        continue;
      }
      let strDevPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion+ "/project/DeviceInfo.json";
      let objDevInfo = ReadJson(strDevPath);
      if (objDevInfo.Error) {
        strErr = objDevInfo.ErrorDesc;
        return -1;
      }
      for (let j = 0; j < objDevInfo.DeviceList.length; j++) { // 20230509
        if (objDevInfo.DeviceList[j].DriverName == strDriverName && objDevInfo.DeviceList[j].SystemPlatform == strSysPlatform && objDevInfo.DeviceList[j].DeviceProvider == strProvider && objDevInfo.DeviceList[j].DriverVersion == strDriverVersion) {
          return 1;
        }
      }
    }
  }
  return 0;
}

router.post('/getDriverConfig', function (req, res) {
	LogManagerObj.traceLog(DriverManagerName, "Enter post getDriverConfig");
  var objDriverData = ReadJson(global.propertyPath + "/DriverConfig.json");
  if (objDriverData.Error) {
    res.send(objDriverData.ErrorDesc);
    return;
  }

  for (let i = 0; i < objDriverData.rows.length; i++) {
    if (objDriverData.rows[i].name == "系统平台") {
      if (strPlatFormType == "Windows") {
        objDriverData.rows[i].value = "Windows";
      } else if (strCpuArch != "X64" && strCpuArch != "X86") {
        objDriverData.rows[i].value = strCpuArch;
      } else {
        objDriverData.rows[i].value = "CentOS";
      }
      break;
    }
  }
  res.send(objDriverData);
  LogManagerObj.traceLog(DriverManagerName, "Leave post getDriverConfig");
})

//返回帮助文档地址
router.post("/CheckHelpFile",function(req,res){
  var objDocRes = {
    "Error":false,
    "ErrorDesc":""
  };
  var DriverName = req.query.name;
  var DriverCompany = req.query.company;
  var DriverVersion = req.query.version;
  var SystemPlatform = req.query.systemplatform;
  var DocPath = path.resolve(__dirname,'../Driver/' + SystemPlatform + "/" + DriverCompany + "/" + DriverName + "/" + DriverVersion + "/");
  var AllFile = fs.readdirSync(DocPath);
  var pdfFlag = false;
  for(let i = 0;i < AllFile.length;i++){
    //获取最后一个.的位置
    var index= AllFile[i].lastIndexOf(".");
    //获取后缀
    var ext = AllFile[i].substr(index+1);
    if(ext == 'pdf') pdfFlag = true;
  }
  if(pdfFlag){
    res.send(objDocRes);
    return;
  }else{
    objDocRes.Error = true;
    objDocRes.ErrorDesc = "该驱动帮助文档不存在";
    res.send(objDocRes);
    return;
  }
})

module.exports = router;