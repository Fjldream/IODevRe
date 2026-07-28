var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var router = express.Router();
let formidable = require('formidable');
var path = require('path');
var zipper = require("zip-local");
var iconv = require('iconv-lite');
const Json2csvParser = require('json2csv').Parser;
const csv2Json = require('csvtojson');
const xss = require('xss');
var CheckModuleClass = require('./CheckModule');
var driverConfig;
var os = require('os');
var platform = os.platform();
var drivernode, checknode;
var strPlatFormType = "";
if (/*platform == "win32"*/false) {
  driverConfig = new CheckModuleClass();//require("../Bin/lib/nodeKingConfigModule_win.node"); // 20230529 zjt 此插件不存在
  // drivernode = require('../Bin/lib/drivernode.node'); // 20230529 zjt 驱动安装插件
 //checknode = require('../Bin/lib/checknode.node'); // 20230529 zjt 驱动校验插件
 strPlatFormType = "Windows";
}else{//linux
  driverConfig = new CheckModuleClass();//require("../Bin/lib/nodeKingConfigModule_linux.node");
  strPlatFormType = "Linux";
}
strPlatFormType = "Linux"
var kingConfigModuleClass = require('./KingConfigModule');
var KingConfigModuleJs = new kingConfigModuleClass();

var LogManager = require('./LogInterface');//日志接口
var DevLogManagerObj = new LogManager();

var publicClass = require('./PublicInterface');//公用函数接口
const { fromMapFileSource } = require('convert-source-map');
var pubInter = new publicClass();

var DevManagerName = "DeviceManager";

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:true}));

//工程文件路径
var TempCombinePath = path.resolve(__dirname,"../../config/externalConfig.json");
//var projectFileURL = JSON.parse(fs.readFileSync(TempCombinePath, 'utf-8'));
let tenantManager = require('../lib/services/TenantManager')
//驱动校验错误码
var objConfigErrMsg = driverConfig.Errcode_decode;
/*
{
  32768:"设备地址超出范围",
  32769:"设备地址格式错误",
  32770:"寄存器名称错误",
  32771:"寄存器地址超出范围", 
  32773:"寄存器数据类型错误",
  "-1":"其他错误"
};*/

//系统变量模板
var systemTagTemplate = {
  "TagID": 1,
  "TagName": "$FrequencyValueOfModbusTcp",
  "Description": "",
  "DeviceID": 1,
  "DeviceName": "ModbusTcp",
  "TagGroup": "TagGroup",
  "TagType": 0,
  "TagDataType": 128,
  "RegDataType": 128,
  "AccessType": 0,
  "RegName": null,
  "RegAddress": null,
  "VarPlcInfo": "",
  "CollectTimeInterval": null,
  "DataConvertType": null,
  "MaxRawValue": null,
  "MinRawValue": null,
  "MaxValue": null,
  "MinValue": null,
  "NonLinearName": "",
  "DataCleaningType": null,
  "DataCleaningUpperLimit": null,
  "DataCleaningLowerLimit": null,
  "ChangeRate": null,
  "DeadbandRate": null,
  "AlarmUpperLimit": null,
  "AlarmLowerLimit": null
};

//变量类型
if (global.productType == 1) {
  var KVIO_TAG_TYPE_SYSTEM		=	0;		//系统变量
  var KVIO_TAG_TYPE_ACCOUNT		=	1;		//用户变量
  var KVIO_TAG_TYPE_USER			=	2;		//普通变量
}
else{
  var KVIO_TAG_TYPE_SYSTEM		=	1;		//系统变量
  var KVIO_TAG_TYPE_CHANNEL		=	2;		//链路系统变量
  var KVIO_TAG_TYPE_DEVICE		=	3;		//设备系统变量
  var KVIO_TAG_TYPE_USER			=	4;		//用户变量,KF4.0的用户变量等于KF3.6的普通变量
}


//路径拼接
function getUrl(ProjectID, ProjectEdition){
  return '/' + ProjectID + '/' + ProjectEdition + '/project';
}

//获取 设备组树
router.post('/getProjectDeviceGroupTreeView', function(req, res){
  req.query = pubInter.EscapeAllData(req.query);
  const projectGroupService= tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var proID = req.query.ProjectID;
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getProjectDeviceGroupTreeView");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
   //设备组
   let deviceGroupObj;
   var projectDeviceURL = path.join(tenantDir,proID,'project','DeviceGroupInfo.json');
   let deviceStrJson = pubInter.readJson( projectDeviceURL );
   if( deviceStrJson.Error == false){
     deviceGroupObj = deviceStrJson.data;
   }else{
     console.log(deviceStrJson.ErrorDesc);
     DevLogManagerObj.errorLog(DevManagerName, deviceStrJson.ErrorDesc);
     res.send(deviceStrJson.ErrorDesc);
     return;
   }
   //变量组
   let varGroupObj;
   var projectVarURL =  path.join(tenantDir,proID,'project','VarGroupInfo.json');
   let varStrJson = pubInter.readJson( projectVarURL );
   if( varStrJson.Error == false){
     varGroupObj = varStrJson.data;
   }else{
     console.log(varStrJson.ErrorDesc);
     DevLogManagerObj.errorLog(DevManagerName, varStrJson.ErrorDesc);
     res.send(varStrJson.ErrorDesc);
     return;
   }
   //opc设备
   let opcObj;
   var DeviceURL =  path.join(tenantDir,proID,'project','DeviceInfo.json');
   let deviceObj = pubInter.readJson( DeviceURL );
   if( deviceObj.Error == false){
     opcObj = deviceObj.data;
   }else{
     console.log(deviceObj.ErrorDesc);
     DevLogManagerObj.errorLog(DevManagerName, deviceObj.ErrorDesc);
     res.send(deviceObj.ErrorDesc);
     return;
   }
   //链路组
   let linkData;
   if( global.productType == 2){
    var projectLinkURL = path.join(tenantDir,proID,'project','CollectChannelInfo.json');
    let linkJson = pubInter.readJson( projectLinkURL );
    if( linkJson.Error == false){
      linkData = linkJson.data;
    }else{
      console.log(linkJson.ErrorDesc);
      DevLogManagerObj.errorLog(DevManagerName, linkJson.ErrorDesc);
      res.send(linkJson.ErrorDesc);
      return;
    }
   }   
   //左侧树配置json
   let treeExampleObj;
   let treeExample = pubInter.readJson( global.propertyPath + '/CollectProjectTree.json' );
   if( treeExample.Error == false){
     treeExampleObj = treeExample.data;
   }else{
     console.log(treeExample.ErrorDesc);
     DevLogManagerObj.errorLog(DevManagerName, treeExample.ErrorDesc);
     res.send(treeExample.ErrorDesc);
     return;
   }
   treeExampleObj[0].text = req.query.ProjectName;
   /* if(devtype == 'KF') {
    treeExampleObj[0].children.splice(6, 1);
   } */
   for( var c=0; c<treeExampleObj[0].children.length; c++){
     if( treeExampleObj[0].children[c].text == "设备"){
       if( deviceGroupObj.DeviceGroupList.length > 0){
         recursionDevice(deviceGroupObj.DeviceGroupList, treeExampleObj[0].children[c]);
       }
     }else if( treeExampleObj[0].children[c].text == "变量"){
       if( varGroupObj.TagGroupList.length > 0){
         recursionVar(varGroupObj.TagGroupList, treeExampleObj[0].children[c]);
       }
     }else if( treeExampleObj[0].children[c].text == "链路"){
       if( linkData.CollectChannelList.length > 0){
         recursionLink(linkData.CollectChannelList, treeExampleObj[0].children[c]);
       }
     } else if( treeExampleObj[0].children[c].text == "OPCUA"){
      if( opcObj.DeviceList.length > 0){
        recursionOPC(opcObj.DeviceList, treeExampleObj[0].children[c]);
      }
    }
   }
   //遍历 设备组文件
   function recursionDevice(groupArr, treeObj){
     var tempChildArr = new Array();
     for(var i = 0; i < groupArr.length; i++){
       if(groupArr[i].DeviceGroupID != undefined){
         var tempGroupObj = new Object();
        //  tempGroupObj.id = 1 + groupArr[i].DeviceGroupID/10;
         tempGroupObj.id = 2 + '.' + groupArr[i].DeviceGroupID;//20231110
         tempGroupObj.text = groupArr[i].DeviceGroupName;
         tempGroupObj.iconCls = treeObj.iconCls;
 
         var tempGroupChildrenObj = new Object();
         tempGroupChildrenObj.url = treeObj.attributes.url;
         tempGroupChildrenObj.type = treeObj.attributes.type;
         for(var param in groupArr[i]){
           if(typeof(groupArr[i][param]) != "object"){
             tempGroupChildrenObj[param] = groupArr[i][param];
           }
         }        
         tempGroupObj.attributes = tempGroupChildrenObj;
 
         if(groupArr[i].DeviceObjectList.length != 0){
           recursionDevice(groupArr[i].DeviceObjectList, tempGroupObj)
         }
         tempChildArr.push(tempGroupObj);
       }
     }
     if(tempChildArr.length != 0){
       treeObj.children = tempChildArr;
     }
   }
  //遍历 设备文件
  function recursionOPC(groupArr, treeObj){
    var tempChildArr = new Array();
    for(var i = 0; i < groupArr.length; i++){
      if(groupArr[i].DeviceID != undefined && groupArr[i].DriverName == "OPCUA"){
        var tempGroupObj = new Object();
        tempGroupObj.id = groupArr[i].DeviceID;
        tempGroupObj.text = groupArr[i].DeviceName;
        tempGroupObj.iconCls = treeObj.iconCls;

        var tempGroupChildrenObj = new Object();
        tempGroupChildrenObj.url = treeObj.attributes.url;
        tempGroupChildrenObj.type = treeObj.attributes.type;
        for(var param in groupArr[i]){
          if(typeof(groupArr[i][param]) != "object"){
            tempGroupChildrenObj[param] = groupArr[i][param];
          }
        }        
        tempGroupObj.attributes = tempGroupChildrenObj;

        /* if(groupArr[i].DeviceObjectList.length != 0){
          recursionDevice(groupArr[i].DeviceObjectList, tempGroupObj)
        } */
        tempChildArr.push(tempGroupObj);
      }
    }
    if(tempChildArr.length != 0){
      treeObj.children = tempChildArr;
    }
  }
   //遍历 变量组文件
   function recursionVar(groupArr, treeObj){
     var tempChildArr = new Array();
     for(var i = 0; i < groupArr.length; i++){
       if(groupArr[i].TagGroupID != undefined){
         var tempGroupObj = new Object();
        //  tempGroupObj.id = 2 + groupArr[i].TagGroupID/10;
         tempGroupObj.id = 2 + '.' + groupArr[i].TagGroupID;//20231110
         tempGroupObj.text = groupArr[i].TagGroupName;
         tempGroupObj.iconCls = treeObj.iconCls;
 
         var tempGroupChildrenObj = new Object();
         tempGroupChildrenObj.url = treeObj.attributes.url;
         for(var param in groupArr[i]){
           if(typeof(groupArr[i][param]) != "object"){
             tempGroupChildrenObj[param] = groupArr[i][param];
           }
         }
         tempGroupChildrenObj.type = treeObj.attributes.type;
         tempGroupObj.attributes = tempGroupChildrenObj;
 
         if(groupArr[i].TagObjectList.length != 0){
           recursionVar(groupArr[i].TagObjectList, tempGroupObj)
         }
         tempChildArr.push(tempGroupObj);
       }
     }
     if(tempChildArr.length != 0){
       treeObj.children = tempChildArr;
     }
   }
   //遍历 链路文件
   function recursionLink(groupArr, treeObj){
     var tempChildArr = new Array();
     for(var i = 0; i < groupArr.length; i++){
       if(groupArr[i].ChannelID != undefined){
         var tempGroupObj = new Object();
         tempGroupObj.id = 3 + groupArr[i].ChannelID/10;
         tempGroupObj.text = groupArr[i].ChannelName;
         tempGroupObj.iconCls = treeObj.iconCls;
         tempGroupObj.linkObj = groupArr[i];
 
         var tempGroupChildrenObj = new Object();
         tempGroupChildrenObj.url = treeObj.attributes.url;
         tempGroupChildrenObj.type = treeObj.attributes.type;        
         tempGroupObj.attributes = tempGroupChildrenObj;
 
         tempChildArr.push(tempGroupObj);
       }
     }
     if(tempChildArr.length != 0){
       treeObj.children = tempChildArr;
     }
   }
   res.send(treeExampleObj);
  DevLogManagerObj.traceLog(DevManagerName, "Leave post getProjectDeviceGroupTreeView");
})

//获取 可移动设备组树
router.post('/getDeviceGroupAvailableMove', function(req, res){//------------------------------------删除当前组
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getDeviceGroupAvailableMove");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  var devPath = pubInter.joinPath(xss(req.query.ProjectID), xss(req.query.ProjectEdition), xss(req.query.ProjectName));
  let deviceGroupObj;
  var projectDeviceURL = devPath + '/DeviceGroupInfo.json';
  let devGroupJSON = pubInter.readJson( projectDeviceURL );
  if( devGroupJSON.Error == false){
    deviceGroupObj = devGroupJSON.data;
  }else{
    console.log(devGroupJSON.ErrorDesc);
    DevLogManagerObj.errorLog(DevManagerName, devGroupJSON.ErrorDesc);
    res.send(devGroupJSON.ErrorDesc);
    return;
  }

  function setGroupTree(groupArr){
    for(var i = 0; i < groupArr.length; i ++){
      if(groupArr[i].DeviceID == undefined && groupArr[i].DeviceName == undefined && groupArr[i].DeviceGroupID && groupArr[i].DeviceGroupName){
        groupArr[i].id = groupArr[i].DeviceGroupID;
        groupArr[i].text = groupArr[i].DeviceGroupName;
        groupArr[i].children = groupArr[i].DeviceObjectList;
        groupArr[i].iconCls = "icon-unit-device";
        setGroupTree(groupArr[i].children);
        delete groupArr[i].DeviceObjectList;
      }else{
        groupArr.splice(i,1);
        i--;
      }
    }
  }
  setGroupTree(deviceGroupObj.DeviceGroupList);
  deviceGroupObj.children = deviceGroupObj.DeviceGroupList;
  deviceGroupObj.id = 0;
  deviceGroupObj.text = "设备";
  deviceGroupObj.iconCls = "icon-unit-device";
  var treeArr = new Array()
  treeArr.push(deviceGroupObj);
  res.send(treeArr);
  DevLogManagerObj.traceLog(DevManagerName, "Leave post getDeviceGroupAvailableMove");
})

//新建 设备组
router.post('/submitAddDeviceGroup',function(req, res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post submitAddDeviceGroup");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  var returnObj = new Object();
  returnObj.err = false;
  req.query = pubInter.EscapeAllData(req.query);
  const projectGroupService= tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var proID = req.query.ProjectID;
  // var proVer = req.query.ProjectEdition;
  // var proName =  req.query.ProjectName;
  let projectDeviceURL = path.join(tenantDir,proID,'project','DeviceGroupInfo.json');
  if(!fs.existsSync(projectDeviceURL)){
    returnObj.err = true;
    returnObj.data = "未找到设备文件";
    var returnStr = JSON.stringify(returnObj);
    res.send(returnStr);
    return;
  }

  let deviceStrJson = pubInter.readJson(projectDeviceURL);
  if (deviceStrJson.Error) {
    res.send(deviceStrJson.ErrorDesc);
    return;
  }
  //let deviceGroupObj = JSON.parse(deviceStrJson);
  let deviceGroupObj = deviceStrJson.data;

  let parentDeviceGroupName = req.query.GroupName;
  let parentDeviceGroupID = req.query.GroupID;
  let subDatas = req.body.submitDatas;
  let newDeviceGroupName = "默认组名";
  let newDeviceGroupDesc = "默认描述";
  for(var i = 0; i < subDatas.rows.length; i++){
    if(subDatas.rows[i].code == "GroupName"){
      newDeviceGroupName = subDatas.rows[i].value;
    }
    if(subDatas.rows[i].code == "Description"){
      newDeviceGroupDesc = subDatas.rows[i].value;
    }
  }

  var DeviceGroupResult = new Object();
  DeviceGroupResult.id = 0;
  DeviceGroupResult.nameCompair = "ok";
  function recursionDeviceGroupFindName(groupListArr, newGroupName, DeviceGroupResult){
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupName && groupListArr[i].DeviceGroupName == newGroupName){
        DeviceGroupResult.nameCompair = "error";
      }
      if(groupListArr[i].DeviceGroupID && groupListArr[i].DeviceGroupID > DeviceGroupResult.id){
        DeviceGroupResult.id = groupListArr[i].DeviceGroupID;
      }
      if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
        recursionDeviceGroupFindName(groupListArr[i].DeviceObjectList, newGroupName,DeviceGroupResult);
      }
    }
  }
  recursionDeviceGroupFindName(deviceGroupObj.DeviceGroupList, newDeviceGroupName, DeviceGroupResult);
  
  if(DeviceGroupResult.nameCompair != "ok"){
    returnObj.err = true;
    returnObj.data = "设备组名称重复";
    var returnStr = JSON.stringify(returnObj);
    res.send(returnStr);
    return;
  }

  function recursionDeviceGroupAdd(groupListArr, parentGroupName, parentGroupID, newGroupName, newGroupDesc){//------------------------------需要校验组名重复情况
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupID == parentGroupID || groupListArr[i].DeviceGroupName == parentGroupName ){
        var newGroupObj = new Object();
        newGroupObj.DeviceGroupID = DeviceGroupResult.id + 1;
        newGroupObj.DeviceGroupName = newGroupName;
        newGroupObj.Description = newGroupDesc;
        newGroupObj.DeviceObjectList = [];
        if(groupListArr[i].DeviceObjectList){
          groupListArr[i].DeviceObjectList.push(newGroupObj);
        }
        else{
          groupListArr[i].DeviceObjectList = [];
          groupListArr[i].DeviceObjectList.push(newGroupObj);
        }
        return;//只有一个同名的组名
      }else if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
        recursionDeviceGroupAdd(groupListArr[i].DeviceObjectList, parentGroupName, parentGroupID, newGroupName, newGroupDesc);
      }
    }
  }

  if(parentDeviceGroupID == "-1"){
    let newGroupObj = new Object();
    newGroupObj.DeviceGroupID = DeviceGroupResult.id + 1;
    newGroupObj.DeviceGroupName = newDeviceGroupName;
    newGroupObj.Description = newDeviceGroupDesc;
    newGroupObj.DeviceObjectList = [];
    deviceGroupObj.DeviceGroupList.push(newGroupObj);
  }else{
    recursionDeviceGroupAdd(deviceGroupObj.DeviceGroupList, parentDeviceGroupName, parentDeviceGroupID, newDeviceGroupName, newDeviceGroupDesc);
  }

  var finalStr = JSON.stringify(deviceGroupObj, "", "\t");
  
  fs.writeFile(projectDeviceURL,finalStr,function(err){
    if(err){
      console.error(err);
      returnObj.err = true;
      returnObj.data = err;
    }else{
      returnObj.err = false;
      returnObj.data = "OK";
    }
    var returnStr = JSON.stringify(returnObj);
    DevLogManagerObj.traceLog(DevManagerName, "Async Leave post submitAddDeviceGroup");
    res.send(returnStr);
  })
  DevLogManagerObj.traceLog(DevManagerName, "Leave post submitAddDeviceGroup");
})

//编辑 设备组
router.post('/editDeviceGroup',function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post editDeviceGroup");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  const projectGroupService= tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var devGroupPath = path.join(tenantDir,req.query.ProjectID,'project')
  let projectDeviceGroupURL = devGroupPath + '/DeviceGroupInfo.json';
  if(!fs.existsSync(projectDeviceGroupURL)){
    res.send("未找到设备组文件");
    console.log("未找到设备组文件");
    return;
  }
  let deviceGroupStrJson = pubInter.readJson(projectDeviceGroupURL);
  if (deviceGroupStrJson.Error) {
    res.send(deviceGroupStrJson.ErrorDesc);
    return;
  }
  let deviceGroupObj = deviceGroupStrJson.data;
  let editDeviceGroupID = xss(req.query.DeviceGroupID);

  req.body = pubInter.EscapeAllData(req.body);
  if(req.body.code == "GroupName"){
    if (req.body.value == "设备") {
      res.send("设备组名称不允许命名为 设备");
      return;
    }
    var resultCheck = recursionDeviceGroupNameCheck(deviceGroupObj.DeviceGroupList, req.body.value);
    if(resultCheck){
      res.send("设备组名称重复");
      return;
    }
  }
  function recursionDeviceGroupEdit(groupListArr, editDeviceGroupID, oldGroupName){
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupID == editDeviceGroupID ){
        let strCodeName = ""
        if (req.body.code == "GroupName" ) {
          strCodeName = "Device" + req.body.code;
        }
        else{
          strCodeName = req.body.code;
        }
        oldGroupName.name = groupListArr[i][strCodeName];
        groupListArr[i][strCodeName] = req.body.value;
        return;//只有一个同名的组名
      }else if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
        recursionDeviceGroupEdit(groupListArr[i].DeviceObjectList, editDeviceGroupID, oldGroupName);
      }
    }
  }

  function recursionDeviceGroupNameCheck(groupListArr, newGroupName){
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupName == newGroupName ){
        return true;
      }else if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
        if(recursionDeviceGroupNameCheck(groupListArr[i].DeviceObjectList, newGroupName)){
          return true;
        }
      }
    }
  }
  var oldGroupName = new Object();
  oldGroupName.name = "";
  recursionDeviceGroupEdit(deviceGroupObj.DeviceGroupList,editDeviceGroupID, oldGroupName);

  if(req.body.code == "GroupName"){
    //设备所属组修改
    let projectDeviceInfoURL = devGroupPath + '/DeviceInfo.json';
    if(!fs.existsSync(projectDeviceInfoURL)){
      res.send("没有找到设备文件");
      return;
    }
    let deviceInfoStrJson = pubInter.readJson(projectDeviceInfoURL);
    if (deviceInfoStrJson.Error) {
      res.send(deviceInfoStrJson.ErrorDesc);
      return;
    }
    let deviceInfoObj = deviceInfoStrJson.data;
    //let deviceInfoStrJson = fs.readFileSync(projectDeviceInfoURL, 'utf-8');
    //let deviceInfoObj = JSON.parse(deviceInfoStrJson);

    for(var g = 0; g < deviceInfoObj.DeviceList.length; g++){
      if(oldGroupName.name == deviceInfoObj.DeviceList[g].DeviceGroup){
        deviceInfoObj.DeviceList[g].DeviceGroup = req.body.value
      }
    }
    var writeDevStr = JSON.stringify(deviceInfoObj, "", "\t");
    try{
      fs.writeFileSync(projectDeviceInfoURL,writeDevStr);
    } catch (error) {
      console.log(error)
      res.send("写设备文件失败" + error);
      return;
    }
  }

  var writeDevGroupStr = JSON.stringify(deviceGroupObj, "", "\t");
  try{
    fs.writeFileSync(projectDeviceGroupURL,writeDevGroupStr);
  } catch (error) {
    console.log(error)
    res.send("写设备组文件失败" + error);
    return;
  }
  res.send("OK");
  DevLogManagerObj.traceLog(DevManagerName, "Leave post editDeviceGroup");
})

//删除 设备组
router.post('/deleteDeviceGroup',function(req, res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post deleteDeviceGroup");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  var returnObj = new Object();
  returnObj.err = false;
  req.query = pubInter.EscapeAllData(req.query);
  const projectGroupService= tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var proPath =  path.join(tenantDir,req.query.ProjectID,'project');
  let projectDeviceGroupURL = proPath + '/DeviceGroupInfo.json';
  if(!fs.existsSync(projectDeviceGroupURL)){
    console.log("未找到设备组文件");
    returnObj.err = true;
    returnObj.data = "未找到设备组文件";
    var returnStr = JSON.stringify(returnObj);
    res.send(returnStr);
    return;
  }
  let deviceInfoStrJson = pubInter.readJson(projectDeviceGroupURL);
  if (deviceInfoStrJson.Error) {
    res.send(deviceInfoStrJson.ErrorDesc);
    return;
  }
  let deviceGroupObj = deviceInfoStrJson.data;
  /* let deviceGroupStrJson = fs.readFileSync(projectDeviceGroupURL, 'utf-8');
  let deviceGroupObj = JSON.parse(deviceGroupStrJson); */
  let delDeviceGroupName = req.query.GroupName;
  let delDeviceGroupID = req.query.GroupID;
  
  var delDeviceList = [];
  function recursionFindDevice(groupListArray, delDeviceList){
    for(var i = 0; i < groupListArray.length; i++){
      if(groupListArray[i].DeviceID){
        var newTempObje = new Object();
        newTempObje.DeviceID = groupListArray[i].DeviceID;
        newTempObje.DeviceName = groupListArray[i].DeviceName;
        delDeviceList.push(newTempObje);
      }else if(groupListArray[i].DeviceObjectList && groupListArray[i].DeviceObjectList.length > 0){
        recursionFindDevice(groupListArray[i].DeviceObjectList, delDeviceList);
      }
    }
  }

  function recursionDeviceGroupDel(groupListArr, delDeviceGroupName, delDeviceGroupID){
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupID == delDeviceGroupID || groupListArr[i].DeviceGroupName == delDeviceGroupName ){
        if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length > 0){
          recursionFindDevice(groupListArr[i].DeviceObjectList, delDeviceList);
        }
        groupListArr.splice(i,1);
        return;//只有一个同名的组名
      }else if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
        recursionDeviceGroupDel(groupListArr[i].DeviceObjectList, delDeviceGroupName, delDeviceGroupID);
      }
    }
  }

  recursionDeviceGroupDel(deviceGroupObj.DeviceGroupList, delDeviceGroupName, delDeviceGroupID);
  //需要同时删除包含的变量和设备//---------------------------------------------------------------
  //删除设备
  let projectDeviceURL = proPath + '/DeviceInfo.json';
  if(!fs.existsSync(projectDeviceURL)){
    returnObj.err = true;
    returnObj.data = "未找到设备文件";
    res.send(JSON.stringify(returnObj));
    return;
  }
  let deviceStrJson = pubInter.readJson(projectDeviceURL);
  if (deviceStrJson.Error) {
    res.send(deviceStrJson.ErrorDesc);
    return;
  }
  let deviceObj = deviceStrJson.data;
  /* let deviceStrJson = fs.readFileSync(projectDeviceURL, 'utf-8');
  let deviceObj = JSON.parse(deviceStrJson); */
  for(var i = 0; i < deviceObj.DeviceList.length; i++){
    for(var j = 0; j < delDeviceList.length; j++){
      if(deviceObj.DeviceList[i].DeviceName == delDeviceList[j].DeviceName){
        deviceObj.DeviceList.splice(i,1);
        i--;
        break;
      }
    }
  }
  var writeDevStr = JSON.stringify(deviceObj, "", "\t");
  try{
    fs.writeFileSync(projectDeviceURL, writeDevStr);
  } catch (error) {
    console.log(error)
    returnObj.err = true;
    returnObj.data = "写设备文件失败" + error;
    res.send(JSON.stringify(returnObj));
    return;
  }
  //删除变量
  let projectVarURL = proPath + '/VarInfo.json';
  if(!fs.existsSync(projectVarURL)){
    returnObj.err = true;
    returnObj.data = "未找到变量文件";
    res.send(JSON.stringify(returnObj));
    return;
  }
  let varStrJson = pubInter.readJson(projectVarURL);
  if (varStrJson.Error) {
    res.send(varStrJson.ErrorDesc);
    return;
  }
  let varObj = varStrJson.data;
  /* let varStrJson = fs.readFileSync(projectVarURL, 'utf-8');
  let varObj = JSON.parse(varStrJson); */
  for(var m = 0; m < varObj.TagList.length; m++){
    for(var n = 0; n < delDeviceList.length; n++){
      if(varObj.TagList[m].DeviceName == delDeviceList[n].DeviceName){
        varObj.TagList.splice(m,1);
        m--;
        break;
      }
    }
  }
  var writeVarStr = JSON.stringify(varObj, "", "\t");
  try{
    fs.writeFileSync(projectVarURL,writeVarStr);
  } catch (error) {
    console.log(error)
    returnObj.err = true;
    returnObj.data = "写变量文件失败:" + error;
    res.send(JSON.stringify(returnObj));
    return;
  }

  var finalStr = JSON.stringify(deviceGroupObj, "", "\t");
  
  fs.writeFile(projectDeviceGroupURL,finalStr,function(err){
    if(err){
      console.error(err);
      returnObj.err = true;
      returnObj.data = err;
    }else{
      returnObj.err = false;
      returnObj.data = "OK";
    }
    var returnStr = JSON.stringify(returnObj);
    DevLogManagerObj.traceLog(DevManagerName, "Async Leave post deleteDeviceGroup");
    res.send(returnStr);
  })
  DevLogManagerObj.traceLog(DevManagerName, "Leave post deleteDeviceGroup");
})

//获取 设备组 属性
router.post('/getDeviceGroupProperty',function(req, res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getDeviceGroupProperty");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  fs.readFile(global.propertyPath+'/DeviceGroupProperty.json', function(err,data){
    if(err){
      var ErrorMessage = "read DeviceGroupProperty.json fail,post name:getDeviceGroupProperty;err:" + err;
      console.log(ErrorMessage);
      res.send(ErrorMessage);
      return;
    }
    var propertyObj = JSON.parse(data.toString());
    DevLogManagerObj.traceLog(DevManagerName, "Async Leave post getDeviceGroupProperty");
    res.send(data.toString());
  });
  DevLogManagerObj.traceLog(DevManagerName, "Leave post getDeviceGroupProperty");
})

//获取 设备
router.post('/getCollectDeviceProperty',function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getCollectDeviceProperty");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  //设备组下的所有设备名称
  req.query = pubInter.EscapeAllData(req.query);
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var proPath = path.join(tenantDir, req.query.ProjectID, 'project');
  let projectDeviceURL = proPath + '/DeviceGroupInfo.json';
  if(!fs.existsSync(projectDeviceURL)){
    res.send("没有找到设备组文件");
    return;
  }
  let deviceStrJson = pubInter.readJson(projectDeviceURL);
  if (deviceStrJson.Error) {
    res.send(deviceStrJson.ErrorDesc);
    return;
  }
  let deviceGroupObj = deviceStrJson.data;
  /* let deviceStrJson = fs.readFileSync(projectDeviceURL, 'utf-8');
  let deviceGroupObj = JSON.parse(deviceStrJson); */
  let searchGroupName = req.query.DeviceGroup;

  function recursionSearchDeviceByGroupName(groupArr, searchGroupName, resultArr){
    for(var i = 0; i < groupArr.length; i++){
      if(groupArr[i].DeviceGroupID != undefined){
        if(groupArr[i].DeviceGroupName == searchGroupName){
          for(var j = 0; j < groupArr[i].DeviceObjectList.length; j++){
            if(groupArr[i].DeviceObjectList[j].DeviceID){
              var tempDeviceObj = new Object();
              tempDeviceObj.DeviceID = groupArr[i].DeviceObjectList[j].DeviceID;
              tempDeviceObj.DeviceName = groupArr[i].DeviceObjectList[j].DeviceName;
              resultArr.push(tempDeviceObj);
              // resultArr.push(groupArr[i].DeviceObjectList[j].DeviceName);
            } else if (groupArr[i].DeviceObjectList[j].DeviceObjectList && groupArr[i].DeviceObjectList[j].DeviceObjectList.length > 0) {//设备组下的设备组的设备也要能枚举到
              recursionSearchDeviceByGroupName(groupArr[i].DeviceObjectList, groupArr[i].DeviceObjectList[j].DeviceGroupName, resultArr);
            }
          }
          return;
        }
        else if(groupArr[i].DeviceObjectList.length != 0){
          recursionSearchDeviceByGroupName(groupArr[i].DeviceObjectList, searchGroupName, resultArr);
        }
      }
    }
  }

  let returnDeviceArray = new Array();
  if(searchGroupName == "设备"||searchGroupName == "数采设备"){
    var all = "allDevice";
    returnDeviceArray.push(all);
  }
  else if(deviceGroupObj.DeviceGroupList.length != 0){
    recursionSearchDeviceByGroupName(deviceGroupObj.DeviceGroupList, searchGroupName, returnDeviceArray);
  }

  //读deviceInfo 筛选
  let projectDeviceInfoURL = proPath + '/DeviceInfo.json';
  if(!fs.existsSync(projectDeviceInfoURL)){
    res.send("没有找到设备文件");
    return;
  }
  let deviceInfoStrJson = pubInter.readJson(projectDeviceInfoURL);
  if (deviceInfoStrJson.Error) {
    res.send(deviceInfoStrJson.ErrorDesc);
    return;
  }
  let deviceInfoObj = deviceInfoStrJson.data;
 /* let deviceInfoStrJson = fs.readFileSync(projectDeviceInfoURL, 'utf-8');
 let deviceInfoObj = JSON.parse(deviceInfoStrJson); */
  
  let resultObj = new Object();
  let dataRows = new Array();
  for(var g = 0; g < deviceInfoObj.DeviceList.length; g++){
    if(returnDeviceArray.find(function(value){
     if((value.DeviceID == deviceInfoObj.DeviceList[g].DeviceID && value.DeviceName == deviceInfoObj.DeviceList[g].DeviceName) || (value == "allDevice")){
       return true;
     } 
    }))
    {
      /* for (const param in deviceInfoObj.DeviceList[g]) {
        if (deviceInfoObj.DeviceList[g].hasOwnProperty(param) && deviceInfoObj.DeviceList[g][param] === "") {
          deviceInfoObj.DeviceList[g][param] = "--";
        } else if (param == "RedundancyStyle") {
          if (deviceInfoObj.DeviceList[g][param] == 0) {
            deviceInfoObj.DeviceList[g][param] = "无冗余设备";
          } else if (deviceInfoObj.DeviceList[g][param] == 1){
            deviceInfoObj.DeviceList[g][param] = "冗余主设备";
          } else {
            deviceInfoObj.DeviceList[g][param] = "冗余从设备";
          }
        }
      } */
      if(deviceInfoObj.DeviceList[g].DriverName != "OPCUA") 
        dataRows.push(deviceInfoObj.DeviceList[g]);
    }
  }
  resultObj.total = dataRows.length;
  resultObj.rows = dataRows;
  let resultStr = JSON.stringify(resultObj);
  res.send(resultStr);
  DevLogManagerObj.traceLog(DevManagerName, "Leave post getCollectDeviceProperty");
})

//获取 链路 属性
router.post('/getLinkProperty', function(req, res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getLinkProperty");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  fs.readFile(global.propertyPath +'/CollectChannelProperty.json', function(err,data){
    if(err){
      var ErrorMessage = "read CollectChannelInfo.json fail,post name:getLinkProperty;err:" + err;
      console.log(ErrorMessage);
      DevLogManagerObj.errorLog(DevManagerName, ErrorMessage);
      res.send(ErrorMessage);
      return;
    }
    var propertyObj = JSON.parse(data.toString());
    res.send(data.toString());
  });
})

//链路 获取设备
router.post('/getLinkDevInfo',function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getLinkDevInfo");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  //获取链路下的设备信息
  var devPahth = pubInter.joinPath(xss(req.query.ProjectID), xss(req.query.ProjectEdition), xss(req.query.ProjectName));
  let linkDatas;
  var linkURL = devPahth + '/CollectChannelInfo.json';
  let linkJSON = pubInter.readJson( linkURL );
  if( linkJSON.Error == false){
    linkDatas = linkJSON.data.CollectChannelList;
  }else{
    console.log(linkJSON.ErrorDesc);
    res.send(linkJSON.ErrorDesc);
    return;
  }

  var returnDeviceArray = [];
  req.query.linkName = xss(req.query.linkName);
  if( req.query.linkName == "链路"){
    for( var h=0; h<linkDatas.length; h++){
      for( var ld=0; ld<linkDatas[h].DevIDArr.length; ld++){
        returnDeviceArray.push(linkDatas[h].DevIDArr[ld]);
      }
    }
  }else{
    for( var h=0; h<linkDatas.length; h++){
      if( linkDatas[h].ChannelName == req.query.linkName){
        returnDeviceArray = linkDatas[h].DevIDArr;
      }
    }
  }
  
 //读deviceInfo 筛选
  let deviceInfoObj;  
  var projectDeviceInfoURL = devPahth + '/DeviceInfo.json';
  let deviceInfoStrJson = pubInter.readJson( projectDeviceInfoURL );
  if( deviceInfoStrJson.Error == false){
    deviceInfoObj = deviceInfoStrJson.data;
  }else{
    console.log(deviceInfoStrJson.ErrorDesc);
    DevLogManagerObj.errorLog(DevManagerName, deviceInfoStrJson.ErrorDesc);
    res.send(deviceInfoStrJson.ErrorDesc);
    return;
  }
  
  let resultObj = new Object();
  let dataRows = new Array();
  for( var tt=0;tt<returnDeviceArray.length;tt++){
    for(var g = 0; g < deviceInfoObj.DeviceList.length; g++){
      if( returnDeviceArray[tt] == deviceInfoObj.DeviceList[g].DeviceID){
        if( deviceInfoObj.DeviceList[g].LinkName == "COM"){
          deviceInfoObj.DeviceList[g].ChannelName = deviceInfoObj.DeviceList[g].SerialName;
        }else{
          deviceInfoObj.DeviceList[g].ChannelName = deviceInfoObj.DeviceList[g].LinkIP;
        }
        dataRows.push(deviceInfoObj.DeviceList[g])
      }
    }
  }
  resultObj.total = dataRows.length;
  resultObj.rows = dataRows;
  let resultStr = JSON.stringify(resultObj);
  res.send(resultStr);
})

//获取 设备 属性
router.post('/getDeviceProperty',function(req, res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getDeviceProperty");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  fs.readFile(global.propertyPath+'/DeviceProperty.json', function(err,data){
    if(err){
      var ErrorMessage = "read DeviceGroupProperty.json fail,post name:getDeviceProperty;err:" + err;
      console.log(ErrorMessage);
      res.send(ErrorMessage);
      return;
    }
    var propertyObj = JSON.parse(data.toString());
    DevLogManagerObj.traceLog(DevManagerName, "Async Leave post getDeviceProperty");
    res.send(data.toString());
  });
  DevLogManagerObj.traceLog(DevManagerName, "Leave post getDeviceProperty");
})

//获取 所有驱动信息//-------------------------------------------读文件
router.post('/getAllDriverList',function(req, res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getAllDriverList");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
	DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  let projectDriverURL = './Driver/DriverInfo.json';
  if(!fs.existsSync(projectDriverURL)){
    res.send("未找到DriverInfo.json文件");
    return;
  }
  let objDriverJson = pubInter.readJson(projectDriverURL);
  if (objDriverJson.Error) {
    res.send(objDriverJson.ErrorDesc);
    return;
  }
  let DriverObj = JSON.parse(objDriverJson);
  /* let DriverStrJson = fs.readFileSync(projectDriverURL, 'utf-8');
  let DriverObj = JSON.parse(DriverStrJson); */

  var driverInfoObj = new Object();
  driverInfoObj.rows = DriverObj.DriverList;
  driverInfoObj.total = DriverObj.DriverList.length;

  var resultStr = JSON.stringify(driverInfoObj);
  res.send(resultStr);
  DevLogManagerObj.traceLog(DevManagerName, "Leave post getAllDriverList");
})
//新建 设备
router.post('/addNewDevice', async function (req, res) {
  try {
    DevLogManagerObj.traceLog(DevManagerName, "Enter post addNewDevice");
    DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
    DevLogManagerObj.traceLog(DevManagerName + "_body:", req.body);
    let DriverVersion = req.query.DriverVersion;
    const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
    const tenantDir = projectGroupService.dataStore.tenantDir;
    let proPath = path.join(tenantDir, req.query.ProjectID, 'project');
    //20240112 读取工程信息
    let projectInfoPath = proPath + '/ProjectPorpertyInfo.json';
    if (!fs.existsSync(projectInfoPath)) {
      res.send("未找到工程文件");
      return;
    }
    let projectJson = pubInter.readJson(projectInfoPath);
    let OsType = req.body.OsType || projectJson.data.OsType;
    //读取 设备组 json文件
    let projectDeviceGroupURL = proPath + '/DeviceGroupInfo.json';
    if (!fs.existsSync(projectDeviceGroupURL)) {
      res.send("未找到设备组文件");
      return;
    }
    let deviceGroupStrJson = pubInter.readJson(projectDeviceGroupURL);
    if (deviceGroupStrJson.Error) {
      res.send(deviceGroupStrJson.ErrorDesc);
      return;
    }
    let deviceGroupObj = deviceGroupStrJson.data;
    /* let deviceGroupStrJson = fs.readFileSync(projectDeviceGroupURL, 'utf-8');
    let deviceGroupObj = JSON.parse(deviceGroupStrJson); */

    //读取 设备 json文件
    let projectDeviceURL = proPath + '/DeviceInfo.json';
    if (!fs.existsSync(projectDeviceURL)) {
      res.send("未找到设备文件");
      return;
    }
    let deviceStrJson = pubInter.readJson(projectDeviceURL);
    if (deviceStrJson.Error) {
      res.send(deviceStrJson.ErrorDesc);
      return;
    }
    let deviceObj = deviceStrJson.data;
    /*   let deviceStrJson = fs.readFileSync(projectDeviceURL, 'utf-8');
      let deviceObj = JSON.parse(deviceStrJson); */

    //读取 链路 json文件
    let linkData;
    if (global.productType == 2) {
      var linkDataURL = proPath + '/CollectChannelInfo.json';
      let linkJSON = pubInter.readJson(linkDataURL);
      if (linkJSON.Error == false) {
        linkData = linkJSON.data.CollectChannelList;
      } else {
        console.log(linkJSON.ErrorDesc);
        res.send(linkJSON.ErrorDesc);
        return;
      }
    }

  //add by tingting.wang 生成设备ID
    //设备id递增 找出最大设备id+1
    var largestNum = 0;
  largestNum = pubInter.generateDeviceID(deviceObj);
  // for(var k = 0; k < deviceObj.DeviceList.length; k++){
  //   if(Number(deviceObj.DeviceList[k].DeviceID) > largestNum){
  //     largestNum = Number(deviceObj.DeviceList[k].DeviceID);
  //   }
  // }
  //add end by tingting.wang

    //let parentDeviceGroupName = req.query.GroupName;
    let subDatas = JSON.parse(xss(req.body.DeviceInfo));
    //let subDependFile = req.body.DeviceDriverDependFile;
    //写设备-----------------------------------------------------------------
    var tDriverSeries, converDriverSeries;
    let newDeviceObj = new Object();
    for (var i = 0; i < subDatas.rows.length; i++) {
    //add by tingting.wang 对最大重连时间进行限制 
    if(subDatas.rows[i].code == "MaxReconncetInterval")
    {
      if(subDatas.rows[i].value <0 || subDatas.rows[i].value > 604800000) //7天
      {
        res.send("最大重连时间范围为0-604800000");
            return;
          }
        }
    //add end
    if(subDatas.rows[i].code == "DriverSeries")
    {
        tDriverSeries = subDatas.rows[i].value;
        //20240118 适配括号
        converDriverSeries = "";
        for (let j = 0; j < tDriverSeries.length; j++) {
          let e = tDriverSeries[j];
          if (e == "(") {
            converDriverSeries += "LB";
          } else if (e == ")") {
            converDriverSeries += "RB";
          } else {

            converDriverSeries += e;
          }
        }
      }
      if (subDatas.rows[i].code == "RedundancyEnable") {
        continue;
      }
      if (subDatas.rows[i].valueType == "number") {
        newDeviceObj[subDatas.rows[i].code] = Number(subDatas.rows[i].value);
      } else {
        newDeviceObj[subDatas.rows[i].code] = subDatas.rows[i].value;
      }
      if (subDatas.rows[i].code == "FrequencySwitchCondition") {
        newDeviceObj[subDatas.rows[i].code] = JSON.parse(JSON.stringify(subDatas.rows[i].value));
      } else if (subDatas.rows[i].code == "RedunDeviceName") {
        let objFindRow = subDatas.rows[i].editor.options.data.find(function (row) {
          return row.roleid == subDatas.rows[i].value;
        })
        if (objFindRow != undefined) {
          newDeviceObj[subDatas.rows[i].code] = objFindRow.rolename;
        } else {
          newDeviceObj[subDatas.rows[i].code] = subDatas.rows[i].value;
        }
        newDeviceObj["RedunDeviceID"] = subDatas.rows[i].value;
      }
    }

    ///////////////////////
    newDeviceObj.DevAddresss = decodeURI(newDeviceObj.DevAddress);
    newDeviceObj.DriverVersion = DriverVersion;

    var driveJson = global.drivePath + "/DriverInfo.json";
    var checkFlag = false;
    let readFileJSON = pubInter.readJson(driveJson);
    if (readFileJSON.Error == false) {
      var driveData = readFileJSON.data;
      for (var dd = 0; dd < driveData.DriverList.length; dd++) {
        if (driveData.DriverList[dd].SysPlatform == newDeviceObj.SystemPlatform &&
          driveData.DriverList[dd].DriverName == newDeviceObj.DriverName &&
          driveData.DriverList[dd].DriverVersion == newDeviceObj.DriverVersion // 20230529 zjt 增加版本和平台的判断
          &&
          driveData.DriverList[dd].PlatformType == OsType) {
          for (var ii = 0; ii < driveData.DriverList[dd].DeviceSeries.length; ii++) {
            if (driveData.DriverList[dd].DeviceSeries[ii] == converDriverSeries) //20240118
            {
              checkFlag = true;
              break;
            }
          }
          if (checkFlag == false) {
            res.send("没有合适的DeviceSeries");
            return;
          }


        }
      }
    }
    //////////////////////
    //设备名称重复校验
    for (var m = 0; m < deviceObj.DeviceList.length; m++) {
      if (deviceObj.DeviceList[m].DeviceName == newDeviceObj.DeviceName) {
        res.send("设备名称重复");
        return;
      }
    }

    //校验设备选择的链路信息 是否合适
    // var linFlag = [false];
    // var LinkDevID = [];
    var linikObj = {};
    linikObj.linFlag = false;
    if (global.productType == 2) {
      var devLink = checkDevLinkInfo(linkData, newDeviceObj, linikObj);
      if (devLink.err == true) {
        res.send(devLink.des);
        return;
      }
    }

    //设备地址校验 //设置xml地址，校验文件及路径  
    var deviceAddrInfoObj = new Object();
    // 20230529 begin
    var driverPath = "";
    driverPath = global.drivePath + "/" + newDeviceObj.SystemPlatform + "/" + OsType + '/' + newDeviceObj.DeviceProvider + "/" +
      newDeviceObj.DriverName + "/" + DriverVersion;
    // 20241119 filter device address type is string
    let ret = await KingConfigModuleJs.isStringFormat(driverPath + "/" + newDeviceObj.DriverName + ".xml", newDeviceObj.DriverName, true, converDriverSeries);
    if (!ret.isString) {
      // 20230529 end
      var devAddress = checkDevInfoAoutDriverNew(xss(req.body.DeviceDriverDependFile), newDeviceObj, driverPath, deviceAddrInfoObj, DriverVersion, OsType);
      if (devAddress.err == true) {
        res.send(devAddress.des);
        return;
      }
    }

    newDeviceObj.DevNumber = deviceAddrInfoObj.nDevAddr;
  newDeviceObj.DeviceID = largestNum;//md by tingting.wang 不用再进行+1操作
    if (global.productType == 2) {
      if (newDeviceObj.LinkType == 1) {
        newDeviceObj.ChannelName = newDeviceObj.SerialName;
      } else {
        newDeviceObj.ChannelName = newDeviceObj.LinkIP;
      }
    }
    //设备冗余属性
    if (newDeviceObj.RedundancyStyle == 1) {
      let objRedunDev = deviceObj.DeviceList.find(function (device) {
        return newDeviceObj.RedunDeviceName == device.DeviceName;
      })
      objRedunDev.RedundancyStyle = 2;
    }
    // 20230529 判断选择的驱动文件与工程中已存在同名驱动是否是相同平台、版本号 
    newDeviceObj.DriverVersion = DriverVersion;
    newDeviceObj.OsType = OsType; {
      let projectDriverURL = proPath + '/Driver/DriverInfo.json';
      let readFileJSON = pubInter.readJson(projectDriverURL);
      for (let i = 0; i < readFileJSON.data.DriverList.length; i++) {
        if (readFileJSON.data.DriverList[i].DriverName == newDeviceObj.DriverName) {
          if (readFileJSON.data.DriverList[i].DriverVersion != DriverVersion) {
            res.send("同一工程不允许安装不同版本的驱动");
            return;
          }
          if (readFileJSON.data.DriverList[i].PlatformType != OsType) {
            res.send("驱动平台不同");
            return;
          }
        }
      }
    }

    //驱动文件复制
    var drFile = copyDriverAndModfiyFileListNew(driverPath, proPath, newDeviceObj, OsType);
    if (drFile.err == true) {
      res.send(drFile.des);
      return;
    }

    //新建系统变量
    let projectVarURL = proPath + '/VarInfo.json';
    if (!fs.existsSync(projectVarURL)) {
      res.send("未找到工程变量文件");
      return;
    }
    let varStrJson = pubInter.readJson(projectVarURL);
    if (varStrJson.Error) {
      res.send(varStrJson.ErrorDesc);
      return;
    }
    let varObj = varStrJson.data;
    /* let varStrJson = fs.readFileSync(projectVarURL, 'utf-8');
    let varObj = JSON.parse(varStrJson); */
    //设备冗余属性
    if (newDeviceObj.RedundancyStyle == 1) {
      var strRedunDeviceName = newDeviceObj.RedunDeviceName;
      //删除冗余设备下的所有变量
      let strVarGroupPath = proPath + "/VarGroupInfo.json";
      let objReadGroup = pubInter.readJson(strVarGroupPath);
      if (objReadGroup.Error) {
        res.send(objReadGroup.ErrorDesc);
        return;
      }
      let varGroupObj = objReadGroup.data;
      for (i = varObj.TagList.length - 1; i >= 0; i--) {
        if (varObj.TagList[i].DeviceName == strRedunDeviceName) {
          //删除变量组中的变量
          deleteVarInGroup(varGroupObj.TagGroupList, varObj.TagList[i].TagName, varObj.TagList[i].TagID);
          varObj.TagList.splice(i, 1);
        }
      }
      //更新变量组中的信息
      let strWriteGroup = pubInter.writeJson(strVarGroupPath, varGroupObj);
      if (strWriteGroup != "OK") {
        res.send(strWriteGroup);
        return;
      }
    }

    var maxTagID = 0;
    var maxTagID1 = 0;
    var maxTagID2 = 0;
    for (var m = 0; m < varObj.TagList.length; m++) {
      if (maxTagID1 < varObj.TagList[m].TagID) {
        if (global.productType == 2 && varObj.TagList[m].TagType == KVIO_TAG_TYPE_USER) {
          continue;
        }
        maxTagID1 = varObj.TagList[m].TagID;
      }
    }
    for (var m = 0; m < (varObj.OPCVAR && varObj.OPCVAR.length); m++) {
      if (maxTagID2 < varObj.OPCVAR[m].TagID) {
        if (global.productType == 2 && varObj.OPCVAR[m].TagType == KVIO_TAG_TYPE_USER) {
          continue;
        }
        maxTagID2 = varObj.OPCVAR[m].TagID;
      }
    }
    maxTagID = Math.max(maxTagID1, maxTagID2);


    var varStateName = new Object();
    varStateName = JSON.parse(JSON.stringify(systemTagTemplate));
    varStateName.TagName = "$DeviceStatusOf" + newDeviceObj.DeviceName;
    varStateName.DeviceID = newDeviceObj.DeviceID;
    varStateName.DeviceName = newDeviceObj.DeviceName;
    varStateName.TagGroup = "root" //"变量";
    varStateName.TagType = KVIO_TAG_TYPE_SYSTEM;
    varStateName.TagDataType = 4;
    varStateName.AccessType = 2;
    varStateName.TagID = maxTagID + 1;
    varStateName.RegDataType = varStateName.TagDataType;

    var varControlName = new Object();
    varControlName = JSON.parse(JSON.stringify(systemTagTemplate));
    varControlName.TagName = "$DeviceControlOf" + newDeviceObj.DeviceName;
    varControlName.DeviceID = newDeviceObj.DeviceID;
    varControlName.DeviceName = newDeviceObj.DeviceName;
    varControlName.TagGroup = "root" //"变量";
    varControlName.TagType = KVIO_TAG_TYPE_SYSTEM;
    varControlName.TagDataType = 4;
    varControlName.AccessType = 0;
    varControlName.TagID = maxTagID + 2;
    varControlName.RegDataType = varControlName.TagDataType;

    var varFrequencyName = new Object();
    varFrequencyName = JSON.parse(JSON.stringify(systemTagTemplate));
    varFrequencyName.TagName = "$FrequencyValueOf" + newDeviceObj.DeviceName;
    varFrequencyName.DeviceID = newDeviceObj.DeviceID;
    varFrequencyName.DeviceName = newDeviceObj.DeviceName;
    varFrequencyName.TagGroup = "root" //"变量";
    varFrequencyName.TagType = KVIO_TAG_TYPE_SYSTEM;
    varFrequencyName.TagDataType = 128;
    varFrequencyName.AccessType = 0;
    varFrequencyName.TagID = maxTagID + 3;
    varFrequencyName.RegDataType = varFrequencyName.TagDataType;

    if (OsType == "Linux") {
      varObj.TagList.push(varStateName);
      varObj.TagList.push(varControlName);
      varObj.TagList.push(varFrequencyName);
    }


    //写 设备组------------------------------------------名称校验
    function recursionDeviceAdd(groupListArr, parentGroupName, deviceID, deviceName) { //------------------------------需要校验组名重复情况
      for (var i = 0; i < groupListArr.length; i++) {
        if (groupListArr[i].DeviceGroupName == parentGroupName) {
          var newGroupObj = new Object();
          newGroupObj.DeviceID = deviceID;
          newGroupObj.DeviceName = deviceName;
          if (groupListArr[i].DeviceObjectList) {
            groupListArr[i].DeviceObjectList.push(newGroupObj);
          } else {
            groupListArr[i].DeviceObjectList = [];
            groupListArr[i].DeviceObjectList.push(newGroupObj);
          }
          return; //只有一个同名的组名
        } else if (groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0) {
          recursionDeviceAdd(groupListArr[i].DeviceObjectList, parentGroupName, deviceID, deviceName);
        }
      }
    }

    req.query.GroupName = xss(req.query.GroupName);
    if (req.query.GroupName == "设备" && (global.productType == 1)) {
      var newGroupObj = new Object();
      newGroupObj.DeviceID = newDeviceObj.DeviceID;
      newGroupObj.DeviceName = newDeviceObj.DeviceName;
      deviceGroupObj.DeviceGroupList.push(newGroupObj);
    } else {
      recursionDeviceAdd(deviceGroupObj.DeviceGroupList, req.query.GroupName, newDeviceObj.DeviceID, newDeviceObj.DeviceName);
    }
    // 20230529 增加windows情况
    if (strPlatFormType == "Windows") {
      // 02 判断有无xml文件
      let driverPathXml = driverPath + "/" + newDeviceObj.DriverName + ".xml";

      if (fs.existsSync(driverPathXml) == false) { // 无xml文件
        newDeviceObj.isConfig = true; // ,windows 不需要
        newDeviceObj.DriverVersion = DriverVersion;
        deviceObj.DeviceList.push(newDeviceObj);
        //写设备信息
        var writeDevStr = JSON.stringify(deviceObj, "", "\t");
        try {
          fs.writeFileSync(projectDeviceURL, writeDevStr);
        } catch (error) {
          res.send("写设备文件失败" + error);
          return;
        }
        //写变量信息
        var writeVarStr = JSON.stringify(varObj, "", "\t");
        try {
          //fs.writeFileSync(projectVarURL,writeVarStr);
        } catch (error) {
          res.send("写变量文件失败" + error);
          return;
        }
        //写设备组信息
        var writeDevGroupStr = JSON.stringify(deviceGroupObj, "", "\t");
        try {
          fs.writeFileSync(projectDeviceGroupURL, writeDevGroupStr);
        } catch (error) {
          res.send("写设备组文件失败" + error);
          return;
        }
        //20231110 新建设备返回设备id
        //res.send("OK");
        let resObj = {
          "code": "OK",
          "DeviceID": newDeviceObj.DeviceID
        };
        res.send(resObj);
        //将新建设备的链路信息写入到 链路配置文件
        if (global.productType == 2) {
          var linkID = 0
          for (var g = 0; g < linkData.length; g++) {
            if (Number(linkData[g].ChannelID) > linkID) {
              linkID = Number(linkData[g].ChannelID);
            }
          }

          if (linikObj.linFlag == false) { //该链路不存在
            var temLink = {};
            temLink.ChannelID = linkID + 1;
            if (newDeviceObj.LinkType == 1) {
              temLink.ChannelName = newDeviceObj.SerialName;
              temLink.ChannelType = 1;
              temLink.SerialBaudRate = parseInt(newDeviceObj.SerialBaudRate);
              temLink.SerialDataBits = parseInt(newDeviceObj.SerialDataBits);
              temLink.SerialStopBits = parseInt(newDeviceObj.SerialStopBits);
              temLink.SerialParity = parseInt(newDeviceObj.SerialParity);
              temLink.StreamControl = parseInt(newDeviceObj.StreamControl);
              temLink.SerialName = newDeviceObj.SerialName;
            } else {
              temLink.ChannelName = newDeviceObj.LinkIP;
              temLink.ChannelType = 2;
              temLink.SerialBaudRate = 1200; //默认
              temLink.SerialDataBits = 7; //默认
              temLink.SerialStopBits = 1; //默认
              temLink.SerialParity = 1; //默认

              temLink.SerialName = "COM1"; //默认
            }
            temLink.StreamControl = 0; //默认
            temLink.ChannelDescription = "";
            temLink.ChannelDriver = newDeviceObj.DriverName;
            temLink.ChannelUnable = 1;
            temLink.InitTimeOut = 3000;
            temLink.CommunicationTimeOut = 3000;
            temLink.CLSID = newDeviceObj.CLSID;
            temLink.UaServerEndpointUrl = "";
            temLink.MachineName = "";
            temLink.DevIDArr = [newDeviceObj.DeviceID],

              linkData.push(temLink);
          } else {
            for (var h = 0; h < linkData.length; h++) {
              if (linikObj.LinkDevID == linkData[h].ChannelID) {
                linkData[h].DevIDArr.push(newDeviceObj.DeviceID);
              }
            }
          }
          var lastObj = {};
          lastObj.CollectChannelList = linkData;
          pubInter.writeJson(proPath + '/CollectChannelInfo.json', lastObj);
        }
      } else {

      }
      return;
    }
    //获取该驱动是否需要校验
    KingConfigModuleJs.isStringFormat(driverPath + "/" + newDeviceObj.DriverName + ".xml", newDeviceObj.DriverName)
      .then((objRes) => {
        if (objRes.Error) {
          res.send(objRes.ErrorDesc);
          return;
        }
        newDeviceObj.isConfig = !objRes.isString;
        newDeviceObj.DriverVersion = DriverVersion;
        deviceObj.DeviceList.push(newDeviceObj);
        //写设备信息
        var writeDevStr = JSON.stringify(deviceObj, "", "\t");
        try {
          fs.writeFileSync(projectDeviceURL, writeDevStr);
        } catch (error) {
          res.send("写设备文件失败" + error);
          return;
        }
        //写变量信息
        var writeVarStr = JSON.stringify(varObj, "", "\t");
        try {
          fs.writeFileSync(projectVarURL, writeVarStr);
        } catch (error) {
          res.send("写变量文件失败" + error);
          return;
        }
        //写设备组信息
        var writeDevGroupStr = JSON.stringify(deviceGroupObj, "", "\t");
        try {
          fs.writeFileSync(projectDeviceGroupURL, writeDevGroupStr);
        } catch (error) {
          res.send("写设备组文件失败" + error);
          return;
        }
        //20231110 新建设备返回设备id
        //res.send("OK");
        let resObj = {
          "code": "OK",
          "DeviceID": newDeviceObj.DeviceID
        };
        res.send(resObj);
        //将新建设备的链路信息写入到 链路配置文件
        if (global.productType == 2) {
          var linkID = 0
          for (var g = 0; g < linkData.length; g++) {
            if (Number(linkData[g].ChannelID) > linkID) {
              linkID = Number(linkData[g].ChannelID);
            }
          }

          if (linikObj.linFlag == false) { //该链路不存在
            var temLink = {};
            temLink.ChannelID = linkID + 1;
            if (newDeviceObj.LinkType == 1) {
              temLink.ChannelName = newDeviceObj.SerialName;
              temLink.ChannelType = 1;
              temLink.SerialBaudRate = parseInt(newDeviceObj.SerialBaudRate);
              temLink.SerialDataBits = parseInt(newDeviceObj.SerialDataBits);
              temLink.SerialStopBits = parseInt(newDeviceObj.SerialStopBits);
              temLink.SerialParity = parseInt(newDeviceObj.SerialParity);
              temLink.StreamControl = parseInt(newDeviceObj.StreamControl);
              temLink.SerialName = newDeviceObj.SerialName;
            } else {
              temLink.ChannelName = newDeviceObj.LinkIP;
              temLink.ChannelType = 2;
              temLink.SerialBaudRate = 1200; //默认
              temLink.SerialDataBits = 7; //默认
              temLink.SerialStopBits = 1; //默认
              temLink.SerialParity = 1; //默认

              temLink.SerialName = "COM1"; //默认
            }
            temLink.StreamControl = 0; //默认
            temLink.ChannelDescription = "";
            temLink.ChannelDriver = newDeviceObj.DriverName;
            temLink.ChannelUnable = 1;
            temLink.InitTimeOut = 3000;
            temLink.CommunicationTimeOut = 3000;
            temLink.CLSID = newDeviceObj.CLSID;
            temLink.UaServerEndpointUrl = "";
            temLink.MachineName = "";
            temLink.DevIDArr = [newDeviceObj.DeviceID],

              linkData.push(temLink);
          } else {
            for (var h = 0; h < linkData.length; h++) {
              if (linikObj.LinkDevID == linkData[h].ChannelID) {
                linkData[h].DevIDArr.push(newDeviceObj.DeviceID);
              }
            }
          }
          var lastObj = {};
          lastObj.CollectChannelList = linkData;
          pubInter.writeJson(proPath + '/CollectChannelInfo.json', lastObj);
          //fs.writeFileSync(proPath + '/CollectChannelInfo.json',JSON.stringify(lastObj, "", "\t"));
        }
      })
    DevLogManagerObj.traceLog(DevManagerName, "Leave post addNewDevice");
  } catch (error) {
    console.log(error)
  }
})
//批量新建 设备
router.post('/addMultipleNewDevices',function(req,res){
  let objResponse = {"code":0,"message":"OK","data":[]};
  DevLogManagerObj.traceLog(DevManagerName, "Enter post addNewDevice");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  //let DriverVersion = req.query.DriverVersion;
  //读取 设备组 json文件
  let proPath = pubInter.joinPath(xss(req.query.ProjectID), xss(req.query.ProjectEdition), xss(req.query.ProjectName));  
  let projectDeviceGroupURL = proPath + '/DeviceGroupInfo.json';
  if(!fs.existsSync(projectDeviceGroupURL)){
    objResponse.code = -1;
    objResponse.message = "未找到设备组文件";
    res.send(objResponse);
    return;
  }
  let deviceGroupStrJson = pubInter.readJson(projectDeviceGroupURL);
  if (deviceGroupStrJson.Error) {
    objResponse.code = -1;
    objResponse.message = deviceGroupStrJson.ErrorDesc;
    res.send(objResponse);
    return;
  }  
  let deviceGroupObj = deviceGroupStrJson.data;
  /* let deviceGroupStrJson = fs.readFileSync(projectDeviceGroupURL, 'utf-8');
  let deviceGroupObj = JSON.parse(deviceGroupStrJson); */

  //读取 设备 json文件
  let projectDeviceURL = proPath + '/DeviceInfo.json';
  if(!fs.existsSync(projectDeviceURL)){
    objResponse.code = -1;
    objResponse.message = "未找到设备文件";
    res.send(objResponse);
    return;
  }
  let deviceStrJson = pubInter.readJson(projectDeviceURL);
  if (deviceStrJson.Error) {
    objResponse.code = -1;
    objResponse.message = deviceStrJson.ErrorDesc;
    res.send(objResponse);
    return;
  }
  let deviceObj = deviceStrJson.data;
/*   let deviceStrJson = fs.readFileSync(projectDeviceURL, 'utf-8');
  let deviceObj = JSON.parse(deviceStrJson); */

  //读取 链路 json文件
  let linkData;
  if( global.productType == 2 ){
    var linkDataURL = proPath + '/CollectChannelInfo.json';
    let linkJSON = pubInter.readJson( linkDataURL );
    if( linkJSON.Error == false){
      linkData = linkJSON.data.CollectChannelList;
    }else{
      console.log(linkJSON.ErrorDesc);
      objResponse.code = -1;
      objResponse.message = linkJSON.ErrorDesc;
      res.send(objResponse);
      return;
    }
  }

  //设备id递增 找出最大设备id+1
  var largestNum = 0;
  for(var k = 0; k < deviceObj.DeviceList.length; k++){
    if(Number(deviceObj.DeviceList[k].DeviceID) > largestNum){
      largestNum = Number(deviceObj.DeviceList[k].DeviceID);
    }
  }
  //新建系统变量
  let projectVarURL = proPath + '/VarInfo.json';
  if(!fs.existsSync(projectVarURL)){
    objResponse.code = -1;
    objResponse.message = "未找到工程变量文件";
    res.send(objResponse);
    return;
  }
  let varStrJson = pubInter.readJson(projectVarURL);
  if (varStrJson.Error) {
    objResponse.code = -1;
    objResponse.message = varStrJson.ErrorDesc;
    res.send(objResponse);
    return;
  }
  let varObj = varStrJson.data;
  let devicesInfo = req.body;
  let devids = [];//add new device's id
  for(let i=0;i<devicesInfo.length;i++)
  {
    //let parentDeviceGroupName = req.query.GroupName;
    let newDeviceObj = devicesInfo[i];
    let DriverVersion = newDeviceObj.DriverVersion;
    let errorMsg = "设备:'"+newDeviceObj.DeviceName+"' ";   

    //设备名称重复校验
    for(var m = 0; m < deviceObj.DeviceList.length; m++){
      if(deviceObj.DeviceList[m].DeviceName == newDeviceObj.DeviceName){
        errorMsg+="名称重复";
        objResponse.code = -1;
        objResponse.message = errorMsg;
        res.send(objResponse);
        return;
      }
    }
    deviceObj.DeviceList.push(newDeviceObj);
    //校验设备选择的链路信息 是否合适
    // var linFlag = [false];
    // var LinkDevID = [];
    var linikObj = {};
    linikObj.linFlag = false;
    if( global.productType == 2){
      var devLink = checkDevLinkInfo(linkData, newDeviceObj, linikObj);
      if( devLink.err == true){
        errorMsg += devLink.des;
        objResponse.code = -1;
        objResponse.message = errorMsg;
        res.send(objResponse);
        return;
      }
    }
    newDeviceObj["linikObj"] = linikObj;
    //设备地址校验 //设置xml地址，校验文件及路径  
    var deviceAddrInfoObj = new Object();
    var driverPath = global.drivePath + "/" + newDeviceObj.SystemPlatform + "/" + newDeviceObj.OsType + "/" + newDeviceObj.DeviceProvider + "/" + newDeviceObj.DriverName + "/" + DriverVersion;
    //var devAddress = checkDevInfoAoutDriver(xss(req.body.DeviceDriverDependFile), newDeviceObj, driverPath, deviceAddrInfoObj,DriverVersion);
    var devAddress = checkDevInfoAoutDriverNew(xss(""), newDeviceObj, driverPath, deviceAddrInfoObj,DriverVersion, newDeviceObj["OsType"]);
    if( devAddress.err == true){
      errorMsg += devAddress.des;
      objResponse.code = -1;
      objResponse.message = errorMsg;
      res.send(objResponse);
      return;
    }
    newDeviceObj.DevNumber = deviceAddrInfoObj.nDevAddr;
    newDeviceObj.DeviceID = largestNum + 1 + i;
    devids.push(newDeviceObj.DeviceID);
    if( global.productType == 2){
      if( newDeviceObj.LinkType == 1){
        newDeviceObj.ChannelName = newDeviceObj.SerialName;
      }else{
        newDeviceObj.ChannelName = newDeviceObj.LinkIP;
      }
    }
    //设备冗余属性
    if (newDeviceObj.RedundancyStyle == 1){
      let objRedunDev = deviceObj.DeviceList.find(function (device) {
        return newDeviceObj.RedunDeviceName == device.DeviceName;
      })
      objRedunDev.RedundancyStyle = 2;
    }   

  }
  
  for(let i=0;i<devicesInfo.length;i++)
  {
    let newDeviceObj = devicesInfo[i];
    let DriverVersion = newDeviceObj.DriverVersion;
    //let deviceAddrInfoObj = new Object();
    let driverPath = global.drivePath + "/" + newDeviceObj.SystemPlatform + "/" + newDeviceObj.OsType + "/" + newDeviceObj.DeviceProvider + "/" + newDeviceObj.DriverName + "/" + DriverVersion;
    //let devAddress = checkDevInfoAoutDriver(xss(req.body.DeviceDriverDependFile), newDeviceObj, driverPath, deviceAddrInfoObj,DriverVersion);
    //let devAddress = checkDevInfoAoutDriver(xss(""), newDeviceObj, driverPath, deviceAddrInfoObj,DriverVersion);
    //驱动文件复制
    let drFile = copyDriverAndModfiyFileList(driverPath, proPath, newDeviceObj);
    if( drFile.err == true){
      errorMsg += drFile.des;
      objResponse.code = -1;
      objResponse.message = errorMsg;
      res.send(objResponse);
      return;
    }
    //add by tingting.wang 最大重连时间校验
    if(devicesInfo[i]["MaxReconncetInterval"] != undefined)
    {
      let MaxReconncetInterval = devicesInfo[i]["MaxReconncetInterval"];
      if(MaxReconncetInterval <0 || MaxReconncetInterval > 604800000) //7天
      {
        objResponse.code = -1;
        objResponse.message = "最大重连时间范围为0-168小时";
        res.send(objResponse);
        return;
      }
    }
    //add end by tingting.wang
    //设备冗余属性
    if (newDeviceObj.RedundancyStyle == 1) {
      var strRedunDeviceName = newDeviceObj.RedunDeviceName;
      //删除冗余设备下的所有变量
      let strVarGroupPath = proPath + "/VarGroupInfo.json";
      let objReadGroup = pubInter.readJson(strVarGroupPath);
      if (objReadGroup.Error) {
        objResponse.code = -1;
        objResponse.message = objReadGroup.ErrorDesc;
        res.send(objResponse);
        return;
      }
      let varGroupObj = objReadGroup.data;
      for (i = varObj.TagList.length - 1; i >= 0; i--) {
        if(varObj.TagList[i].DeviceName == strRedunDeviceName){
          //删除变量组中的变量
        deleteVarInGroup(varGroupObj.TagGroupList, varObj.TagList[i].TagName, varObj.TagList[i].TagID);
        varObj.TagList.splice(i,1);
      }
      }
      //更新变量组中的信息
      let strWriteGroup = pubInter.writeJson(strVarGroupPath, varGroupObj);
      if (strWriteGroup != "OK") {        
        objResponse.code = -1;
        objResponse.message = strWriteGroup;
        res.send(objResponse);
        return;
      }  

    }
    var maxTagID = 0;
    var maxTagID1 = 0;
    var maxTagID2 = 0;
    for(var m = 0; m < varObj.TagList.length; m++){
      if(maxTagID1 < varObj.TagList[m].TagID){
        if (global.productType == 2 && varObj.TagList[m].TagType == KVIO_TAG_TYPE_USER) {
          continue;
        }
        maxTagID1 = varObj.TagList[m].TagID;
      }
    }
    for(var m = 0; m < varObj.OPCVAR.length; m++){
      if(maxTagID2 < varObj.OPCVAR[m].TagID){
        if (global.productType == 2 && varObj.OPCVAR[m].TagType == KVIO_TAG_TYPE_USER) {
          continue;
        }
        maxTagID2 = varObj.OPCVAR[m].TagID;
      }
    }
    maxTagID = Math.max(maxTagID1, maxTagID2);
    var varStateName = new Object();
    varStateName = JSON.parse(JSON.stringify(systemTagTemplate));
    varStateName.TagName = "$DeviceStatusOf" + newDeviceObj.DeviceName;
    varStateName.DeviceID = newDeviceObj.DeviceID;
    varStateName.DeviceName = newDeviceObj.DeviceName;
    varStateName.TagGroup = "root"//"变量";
    varStateName.TagType = KVIO_TAG_TYPE_SYSTEM;
    varStateName.TagDataType = 4;
    varStateName.AccessType = 2;
    varStateName.TagID = maxTagID + 1;
    varStateName.RegDataType = varStateName.TagDataType;
  
    var varControlName = new Object();
    varControlName = JSON.parse(JSON.stringify(systemTagTemplate));
    varControlName.TagName = "$DeviceControlOf" + newDeviceObj.DeviceName;
    varControlName.DeviceID = newDeviceObj.DeviceID;
    varControlName.DeviceName = newDeviceObj.DeviceName;
    varControlName.TagGroup = "root"//"变量";
    varControlName.TagType = KVIO_TAG_TYPE_SYSTEM;
    varControlName.TagDataType = 4;
    varControlName.AccessType = 0;
    varControlName.TagID = maxTagID + 2;
    varControlName.RegDataType = varControlName.TagDataType;
    
    var varFrequencyName = new Object();
    varFrequencyName = JSON.parse(JSON.stringify(systemTagTemplate));
    varFrequencyName.TagName = "$FrequencyValueOf" + newDeviceObj.DeviceName;
    varFrequencyName.DeviceID = newDeviceObj.DeviceID;
    varFrequencyName.DeviceName = newDeviceObj.DeviceName;
    varFrequencyName.TagGroup = "root"//"变量";
    varFrequencyName.TagType = KVIO_TAG_TYPE_SYSTEM;
    varFrequencyName.TagDataType = 128;
    varFrequencyName.AccessType = 0;
    varFrequencyName.TagID = maxTagID + 3;
    varFrequencyName.RegDataType = varFrequencyName.TagDataType;
  
    varObj.TagList.push(varStateName);
    varObj.TagList.push(varControlName);
    varObj.TagList.push(varFrequencyName);

    
    //req.query.GroupName = xss(req.query.GroupName);
    //if(req.query.GroupName == "设备" && (global.productType == 1)){
    if(newDeviceObj.DeviceGroup == "设备" && (global.productType == 1)){
      var newGroupObj = new Object();
      newGroupObj.DeviceID = newDeviceObj.DeviceID;
      newGroupObj.DeviceName = newDeviceObj.DeviceName;
      deviceGroupObj.DeviceGroupList.push(newGroupObj);
    }else{
      //recursionDeviceAdd(deviceGroupObj.DeviceGroupList, req.query.GroupName, newDeviceObj.DeviceID, newDeviceObj.DeviceName);
      recursionDeviceAdd(deviceGroupObj.DeviceGroupList, newDeviceObj.DeviceGroup, newDeviceObj.DeviceID, newDeviceObj.DeviceName);
    }
  }

  //写 设备组------------------------------------------名称校验
  function recursionDeviceAdd(groupListArr, parentGroupName, deviceID, deviceName){//------------------------------需要校验组名重复情况
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupName == parentGroupName ){
        var newGroupObj = new Object();
        newGroupObj.DeviceID = deviceID;
        newGroupObj.DeviceName = deviceName;
        if(groupListArr[i].DeviceObjectList){
          groupListArr[i].DeviceObjectList.push(newGroupObj);
        }
        else{
          groupListArr[i].DeviceObjectList = [];
          groupListArr[i].DeviceObjectList.push(newGroupObj);
        }
        return;//只有一个同名的组名
      }else if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
        recursionDeviceAdd(groupListArr[i].DeviceObjectList, parentGroupName, deviceID, deviceName);
      }
    }
  }
  //写 
  let param = {
    "newDevIds":devids,//250408
    "deviceObj":deviceObj,
    "devicesInfo":devicesInfo,
    "varObj":varObj,
    "deviceGroupObj":deviceGroupObj,
    "linkData":linkData}
  writeDeviceInfoToConfigJSON(req,res,param);
  DevLogManagerObj.traceLog(DevManagerName, "Leave post addNewDevice");
})
async function writeDeviceInfoToConfigJSON(req,res,param)
{
  let objResponse = {"code":0,"message":"OK","data":[]};
  let deviceObj = param.deviceObj,
  devicesInfo = param.devicesInfo,
  varObj = param.varObj,
  deviceGroupObj = param.deviceGroupObj,
  linkData = param.linkData;
  // linikObj = param.linikObj;
  let propath = pubInter.joinPath(xss(req.query.ProjectID), xss(req.query.ProjectEdition), xss(req.query.ProjectName));
  let projectDeviceURL =  propath + '/DeviceInfo.json',
  projectVarURL = propath + '/VarInfo.json';
  projectDeviceGroupURL = propath + '/DeviceGroupInfo.json';
  for(let i=0;i<devicesInfo.length;i++)
  {
    let newDeviceObj = devicesInfo[i];
    let driverPath = global.drivePath + "/" + 
          newDeviceObj.SystemPlatform + "/" + 
          newDeviceObj.OsType + "/" +
          newDeviceObj.DeviceProvider + "/" + 
          newDeviceObj.DriverName + "/" + 
          newDeviceObj.DriverVersion;
    let errorMsg = "设备: '"+newDeviceObj.DriverName+"' ";
    //let linikObj = newDeviceObj.linikObj;
    delete newDeviceObj.linikObj;
    //获取该驱动是否需要校验
    let objRes = await KingConfigModuleJs.isStringFormat(driverPath + "/" + newDeviceObj.DriverName + ".xml", newDeviceObj.DriverName);
    if (objRes.Error) {
      errorMsg += objRes.ErrorDesc;
      objResponse.code = -1;
      objResponse.message = errorMsg;
      res.send(objResponse);
      return;
    }
    newDeviceObj.isConfig = !objRes.isString; 
    //newDeviceObj.DriverVersion = DriverVersion;
    //deviceObj.DeviceList.push(newDeviceObj);
  }

  //写设备信息  
  var writeDevStr = JSON.stringify(deviceObj, "", "\t");
  try{
    fs.writeFileSync(projectDeviceURL,writeDevStr);
  } catch (error) {
    objResponse.code = -1;
    objResponse.message = "写设备文件失败" + error
    res.send(objResponse);
    return;
  }
  //写变量信息  
  var writeVarStr = JSON.stringify(varObj, "", "\t");
  try{
    fs.writeFileSync(projectVarURL,writeVarStr);
  } catch (error) {
    objResponse.code = -1;
    objResponse.message = "写变量文件失败" + error;
    res.send(objResponse);
    return;
  }
  //写设备组信息
  var writeDevGroupStr = JSON.stringify(deviceGroupObj, "", "\t");
  try{
    fs.writeFileSync(projectDeviceGroupURL,writeDevGroupStr);
  } catch (error) {
    objResponse.code = -1;
    objResponse.message = "写设备组文件失败" + error;
    res.send(objResponse);
    return;
  }
  objResponse.data = param.newDevIds;
  res.send(objResponse);
  for(let i=0;i<devicesInfo.length;i++)
  {
    let newDeviceObj = devicesInfo[i];
    let linikObj = newDeviceObj.linikObj;
    //将新建设备的链路信息写入到 链路配置文件
    if( global.productType == 2){
      var linkID = 0
      for(var g = 0; g < linkData.length; g++){
        if(Number(linkData[g].ChannelID) > linkID){
          linkID = Number(linkData[g].ChannelID);
        }
      }
      
      if( linikObj.linFlag == false){//该链路不存在
        var temLink = {};
        temLink.ChannelID = linkID + 1;
        if( newDeviceObj.LinkType == 1){
          temLink.ChannelName = newDeviceObj.SerialName;
          temLink.ChannelType = 1;
          temLink.SerialBaudRate = parseInt(newDeviceObj.SerialBaudRate);
          temLink.SerialDataBits = parseInt(newDeviceObj.SerialDataBits);
          temLink.SerialStopBits = parseInt(newDeviceObj.SerialStopBits);
          temLink.SerialParity = parseInt(newDeviceObj.SerialParity);
          temLink.StreamControl = parseInt(newDeviceObj.StreamControl);
          temLink.SerialName = newDeviceObj.SerialName;
        }else{
          temLink.ChannelName = newDeviceObj.LinkIP;
          temLink.ChannelType = 2;
          temLink.SerialBaudRate = 1200;//默认
          temLink.SerialDataBits = 7;//默认
          temLink.SerialStopBits = 1;//默认
          temLink.SerialParity = 1;//默认
          
          temLink.SerialName = "COM1";//默认
        }
        temLink.StreamControl = 0;//默认
        temLink.ChannelDescription = "";
        temLink.ChannelDriver = newDeviceObj.DriverName;    
        temLink.ChannelUnable = 1;
        temLink.InitTimeOut = 3000;
        temLink.CommunicationTimeOut = 3000;
        temLink.CLSID = newDeviceObj.CLSID;
        temLink.UaServerEndpointUrl = "";
        temLink.MachineName = "";
        temLink.DevIDArr = [newDeviceObj.DeviceID],

        linkData.push(temLink);
      }else{
          for( var h=0;h<linkData.length;h++){
            if( linikObj.LinkDevID == linkData[h].ChannelID){
              linkData[h].DevIDArr.push(newDeviceObj.DeviceID);
            }
          }
      }
      var lastObj = {};
      lastObj.CollectChannelList = linkData;
      pubInter.writeJson(proPath + '/CollectChannelInfo.json', lastObj);
      //fs.writeFileSync(proPath + '/CollectChannelInfo.json',JSON.stringify(lastObj, "", "\t")); 
    }
  }
}
//校验设备链路
function checkDevLinkInfo( linkData, newDeviceObj, linikObj){
  var resultObj = {};
  resultObj.err = false;
  for( var l=0; l<linkData.length; l++){
    if( newDeviceObj.LinkType == 1){
      if( linkData[l].ChannelName == newDeviceObj.SerialName){
        linikObj.linFlag = true;
        linikObj.LinkDevID = linkData[l].ChannelID;
        if( linkData[l].ChannelDriver != newDeviceObj.DriverName){
          resultObj.err = true;
          resultObj.des = "本链路已经存在，且与本设备驱动不一致；该链路下驱动不支持同一链路创建不同驱动设备，请选择其他链路";
          return resultObj;
        }
      }
    }else{
      if( linkData[l].ChannelName == newDeviceObj.LinkIP){
        linikObj.linFlag = true;
        linikObj.LinkDevID = linkData[l].ChannelID;
        if( linkData[l].ChannelDriver != newDeviceObj.DriverName){
          resultObj.err = true;
          resultObj.des = "新建的网段已经存在，并且与本设备驱动不一致，不可加入本身，请选择其他以太网链路或者新建";
          return resultObj;
        }
      }
    }
  }
  return resultObj;
}
//add by tingting.wang 单链路多设备校验
function singleLinkMulDevCheck(deviceObj, newDeviceObj)
{
  // 只有普通设备会有这个限制
  //1 相同链路下的设备 驱动名称需相同
  //2 每个链路下的设备数量最大为256
  //3 整个工程下的设备数量不超过512
  var resultObj = {};
  resultObj.Error = false;
  var linkInfo = {};
  linkInfo.TotalSize = 0;
  for(var k = 0; k < deviceObj.DeviceList.length; k++)
  {
    let serialName = deviceObj.DeviceList[k].SerialName; //串口名称
    let driverName = deviceObj.DeviceList[k].DriverName;
    if(driverName == 'OPCUA')//opcua设备不参与到设备计数中
    {
      continue;
    }
    if(linkInfo[serialName] == undefined)
    {
      let infoObj = new Object();
      infoObj.DriverName = driverName;
      infoObj.Size = 1;
      linkInfo[serialName] = infoObj;
    }
    else
    {
      linkInfo[serialName].Size +=1;
    }
    linkInfo.TotalSize +=1;
  }
  if(linkInfo.TotalSize + newDeviceObj.length > 512)
  {
    resultObj.Error = true;
    resultObj.data = "当前设备数量:" +linkInfo.TotalSize + ", 本次导入设备数量:" +  newDeviceObj.length + ", 超过工程设备总数限制512!";
    return resultObj;
  }
  for(var i= 0; i < newDeviceObj.length; i++)
  {
    let newSerialName = newDeviceObj[i].SerialName;
    let newDriverName = newDeviceObj[i].DriverName;
    if (linkInfo[newSerialName] != undefined) {
      let curDriverName = linkInfo[newSerialName].DriverName;
      if (newDriverName != curDriverName) {
        resultObj.Error = true;
        resultObj.data = "设备名称:" + newDeviceObj[i].DeviceName + ", 链路名称:" + newSerialName + ",驱动名称:" + newDriverName + ",与当前工程中驱动名称不一致";
        return resultObj;
      } else {
        linkInfo[newSerialName].Size += 1;
        if (linkInfo[newSerialName].Size > 256) {
          resultObj.Error = true;
          resultObj.data = "当前链路:" + newSerialName + ", 超过单链路设备总数限制256!";
          return resultObj;
        }
      }
    }
    else {
      let infoObj = new Object();
      infoObj.DriverName = newDriverName;
      infoObj.Size = 1;
      linkInfo[newSerialName] = infoObj;
    }
    linkInfo.TotalSize += 1;
  }
  return resultObj;
}
//add end
//add by tingting.wang 生成设备ID
function generateDeviceID(deviceObj)
{
  var largestNum = 0;
  if(deviceObj.DeviceList.length == 0)
  {
    return largestNum;
  }
  var numSet = new Set();
  for(var k = 0; k < deviceObj.DeviceList.length; k++)
  {
    numSet.add(deviceObj.DeviceList[k].DeviceID);
  }
  for(var i = 0; i < deviceObj.DeviceList.length; i++)
  {
    if (!numSet.has(i+1))
    {
      largestNum = i;
      return largestNum;
    }
  }
  return Math.max(...numSet);
}
//add end tingting.wang
//校验设备地址
async function checkDevInfoAoutDriver( driverDep, devObj, driverPath, deviceAddrInfoObj,DriverVersion){
  var ruseltObj = {};
  ruseltObj.err = false;
  var depenfiles = [];
  if( driverDep != ""){
    depenfiles = driverDep.split('|');
  }   
  for(var i = 0; i < depenfiles.length; i++){
    var relativePathFile = driverPath + "/" + depenfiles[i];
    // var FilePath = path.resolve(__dirname,relativePathFile);
    if(!fs.existsSync(relativePathFile)){
      ruseltObj.err = true;
      ruseltObj.des = "未找到驱动依赖文件：" + depenfiles[i];
      // res.send("未找到驱动依赖文件：" + depenfiles[i]);
      return ruseltObj;
    }
  }
  var relativePath = driverPath + "/" + devObj['DriverName'] + ".xml";
  var relativePathDes = driverPath + "/" + devObj['DriverName'] + ".des";
  var relativePathSO;
  if(devObj.OsType == "Windows"){
    relativePathSO = driverPath + "/" +  devObj['DriverName'] + ".dll";
  }else{ // Linux
    if(DriverVersion == "66.1.1.1"){
      relativePathSO = driverPath + "/lib" + devObj['DriverName'] + ".so";
    }else{
      relativePathSO = driverPath + "/lib" + devObj['DriverName'] + ".so." + DriverVersion;
    }
  }
  // var xmlPath = path.resolve(__dirname,relativePath);
  // var soPath = path.resolve(__dirname,relativePathSO);
  var xmlPathCheck = fs.existsSync(relativePath);
  var desPathCheck = fs.existsSync(relativePathDes);
  var soPathCheck = fs.existsSync(relativePathSO);
  if((!xmlPathCheck && !desPathCheck) || !soPathCheck){
    ruseltObj.err = true;
    ruseltObj.des = "未找到驱动文件，或驱动文件路径错误";
    return ruseltObj;
  }
  if(strPlatFormType == "Windows"){
    // 1. 注册驱动
    var KIOPath = "./Driver\\WinDriverInstall\\";
    var resSetupSingle = drivernode.DriverSetupSingle(KIOPath, relativePathSO);
    //if(resSetupSingle !=0) 

    if(xmlPathCheck == false){ // 表示不存在xml
      // 调驱动校验插件 checknode
      let clsid = '{' + devObj['CLSID'] + '}';
      var resaddr = checknode.AddrCheck(clsid, devObj['DevAddress']);
      if(resaddr.rc != 0){
        ruseltObj.err = true;
        ruseltObj.des = "设备地址校验失败，错误码：" + resaddr.rc;
        return ruseltObj;
      }
      
      deviceAddrInfoObj.sDevAddr = resaddr.DeviceAddrString;
      deviceAddrInfoObj.nDevAddr = resaddr.DeviceAddressNo;
    }else{  // 20230529 4.0 调前端检查模块 后面实现 
      ruseltObj.err = true;
      ruseltObj.des = "4.0";
      return ruseltObj;
    }
    return ruseltObj;
  }
  // //20250409 start 适配括号
  // let converDriverSeries = "" , tDriverSeries = devObj['DriverSeries'];
  // for(let j=0; j<tDriverSeries.length; j++) {
  //   let e = tDriverSeries[j];
  //   if(e == "(") {
  //     converDriverSeries += "LB";
  //   } else if (e == ")") {
  //     converDriverSeries += "RB";
  //   } else {

  //     converDriverSeries += e;
  //   }
  // }//20250409 end
  //20250409 start 适配设备地址为string
  let ret = await KingConfigModuleJs.isStringFormat(driverPath + "/" + devObj['DriverName'] + ".xml", devObj['DriverName'], true, converDriverSeries);
  if(ret.isString) {
    return ruseltObj;
  }//20250409 end
  var resultNew = driverConfig.getConfigModuleObject();
  driverConfig.setXmlPath(relativePath);
  //设置参数  
  var errorInfoObj = new Object();
  var checkResult = driverConfig.getDeviceInfo(devObj['DevAddress'], deviceAddrInfoObj, errorInfoObj, devObj['DriverSeries'], devObj['DriverName']);//设备地址，返回对象，返回对象，设备系列，设备驱动名称
  var resultDel = driverConfig.releaseConfigModuleObject();
  if(!checkResult){
    var errDesc = "";
    for(var param in objConfigErrMsg){
      if(param == errorInfoObj.nErrCode){
        errDesc = objConfigErrMsg[param];
      }
    }
    ruseltObj.err = true;
    ruseltObj.des = "设备地址校验失败，错误码：" + errorInfoObj.nErrCode + " " + errDesc;
    return ruseltObj;
  }
  return ruseltObj;
}
//校验设备地址
function checkDevInfoAoutDriverNew( driverDep, devObj, driverPath, deviceAddrInfoObj,DriverVersion, OsType){
    var ruseltObj = {};
    ruseltObj.err = false;
    var depenfiles = [];
    if( driverDep != ""){
      depenfiles = driverDep.split('|');
    }   
    for(var i = 0; i < depenfiles.length; i++){
      var relativePathFile = driverPath + "/" + depenfiles[i];
      // var FilePath = path.resolve(__dirname,relativePathFile);
      if(!fs.existsSync(relativePathFile)){
        ruseltObj.err = true;
        ruseltObj.des = "未找到驱动依赖文件：" + depenfiles[i];
        // res.send("未找到驱动依赖文件：" + depenfiles[i]);
        return ruseltObj;
      }
    }
    var relativePath = driverPath + "/" + devObj['DriverName'] + ".xml";
    var relativePathDes = driverPath + "/" + devObj['DriverName'] + ".des";
    var relativePathSO;
    if(OsType == "Windows"){
      relativePathSO = driverPath + "/" +  devObj['DriverName'] + ".dll";
    }else{ // Linux
      if(DriverVersion == "66.1.1.1"){
        relativePathSO = driverPath + "/lib" + devObj['DriverName'] + ".so";
      }else{
        relativePathSO = driverPath + "/lib" + devObj['DriverName'] + ".so." + DriverVersion;
      }
    }
    // var xmlPath = path.resolve(__dirname,relativePath);
    // var soPath = path.resolve(__dirname,relativePathSO);
    var xmlPathCheck = fs.existsSync(relativePath);
    var desPathCheck = fs.existsSync(relativePathDes);
    var soPathCheck = fs.existsSync(relativePathSO);
    if((!xmlPathCheck && !desPathCheck) || !soPathCheck){
      ruseltObj.err = true;
      ruseltObj.des = "未找到驱动文件，或驱动文件路径错误";
      return ruseltObj;
    }
    if(strPlatFormType == "Windows"){//20240111
    // if(OsType == "Windows"){
      // 1. 注册驱动
      var KIOPath = "./Driver\\WinDriverInstall\\";
      var resSetupSingle = drivernode.DriverSetupSingle(KIOPath, relativePathSO);
      //if(resSetupSingle !=0) 
  
      if(xmlPathCheck == false){ // 表示不存在xml
        // 调驱动校验插件 checknode
        let clsid = '{' + devObj['CLSID'] + '}';
        var resaddr = checknode.AddrCheck(clsid, devObj['DevAddress']);
        if(resaddr.rc != 0){
          ruseltObj.err = true;
          ruseltObj.des = "设备地址校验失败，错误码：" + resaddr.rc;
          return ruseltObj;
        }
        
        deviceAddrInfoObj.sDevAddr = resaddr.DeviceAddrString;
        deviceAddrInfoObj.nDevAddr = resaddr.DeviceAddressNo;
      }else{  // 20230529 4.0 调前端检查模块 后面实现 
        ruseltObj.err = true;
        ruseltObj.des = "4.0";
        return ruseltObj;
      }
      return ruseltObj;
    }
    //var resultNew = driverConfig.getConfigModuleObject();
    //driverConfig.setXmlPath(relativePath);
    //设置参数  
    var errorInfoObj = new Object();
    //20240111
    let oldDevAddress = devObj['DevAddress'];
    let newDevAddress = "";
    let specialChars = [':', '/', '|', '_', ','];
    for(let i=0;i<oldDevAddress.length;i++) {
      let c = oldDevAddress[i];
      // if(c == ':' || c == "/" || c == "|" || c == "_") {
      if(specialChars.indexOf(c) != -1){
        newDevAddress += " ";
      } else {
        newDevAddress += c;
      }
    }
    newDevAddress = OsType == "Windows" ? newDevAddress : oldDevAddress;//20251029 兼容Linux
    //20240117    
    let ds = devObj['DriverSeries'], nds = "";
    if(ds.indexOf("(") != -1 && ds.indexOf(")") != -1) {
      for(let i=0; i<ds.length; i++) {
        let e = ds[i];
        if(e == "(") {
          nds += "LB";
        } else if (e == ")") {
          nds += "RB";
        } else {
          nds += e;
        }
      }
    }else {//240322
      nds = ds;
    }
    //20250901 适配opcua js化
    //var checkResult = driverConfig.getDeviceInfo(newDevAddress, deviceAddrInfoObj, errorInfoObj, nds, devObj['DriverName']);//设备地址，返回对象，返回对象，设备系列，设备驱动名称
    //var resultDel = driverConfig.releaseConfigModuleObject();    
    //设置参数  
    let errcode = { "value": 0 };
    let devaddr = { "nDevAddr": -1, "sDevAddr": "" };
    let ret = driverConfig.LoadXmlFile(errcode, relativePath, devObj['DriverName'], nds);
    if(!ret) {
      ruseltObj.err = true;
      ruseltObj.des = "设备地址校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value];
      return ruseltObj;
    }
    let checkResult = driverConfig.checkUserDevAddr(errcode, newDevAddress, devaddr, devObj['DriverName'], nds);
    if(!checkResult) {    
      ruseltObj.err = true;
      ruseltObj.des = "设备地址校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value];
      return ruseltObj;
    }
    deviceAddrInfoObj.nDevAddr = devaddr.nDevAddr; 
    //!20250901
    return ruseltObj;
}


//驱动拷贝，修改清单文件
function copyDriverAndModfiyFileList(copyDrivePath, proPath, newDeviceObj){
  var resultObj = {};
  resultObj.err = false;
  var driveJson = global.drivePath + "/DriverInfo.json";//拷贝DriveInfo.json
  let projectDriverURL = proPath + '/Driver';
  var checkFlag = false;
  let readFileJSON = pubInter.readJson(driveJson);
  if( readFileJSON.Error == false){
    var driveData = readFileJSON.data;
    // if( global.productType == 2){
      for(var dd=0; dd<driveData.DriverList.length; dd++ ){
        if( driveData.DriverList[dd].SysPlatform == newDeviceObj.SystemPlatform 
            && driveData.DriverList[dd].DriverName == newDeviceObj.DriverName
            && driveData.DriverList[dd].DriverVersion == newDeviceObj.DriverVersion  // 20230529 zjt 增加版本和平台的判断
            && driveData.DriverList[dd].PlatformType == strPlatFormType){
          let objDriverJson = pubInter.readJson(projectDriverURL+'/DriverInfo.json');
          if (objDriverJson.Error) {
            res.send(objDriverJson.ErrorDesc);
            return;
          }
          let proDriver = objDriverJson.data;
          //let proDriver =JSON.parse( fs.readFileSync(projectDriverURL+'/DriverInfo.json') );            
          for( var pd=0; pd<proDriver.DriverList.length; pd++){
            if(proDriver.DriverList[pd].SysPlatform == newDeviceObj.SystemPlatform  
                && proDriver.DriverList[pd].DriverName == newDeviceObj.DriverName
                && proDriver.DriverList[pd].DriverVersion == newDeviceObj.DriverVersion // 20230529 zjt 增加版本和平台的判断
                && proDriver.DriverList[pd].PlatformType == strPlatFormType){
              checkFlag = true;
            }
          }
          if( checkFlag == false){
            driveData.DriverList[dd].DriverUpdate = 0; // 20230529 zjt 增加驱动更新字段，0：需要安装，1：不需要安装
            proDriver.DriverList.push(driveData.DriverList[dd]);
          }
          //fs.writeFileSync(projectDriverURL + '/DriverInfo.json',JSON.stringify(proDriver, "", "\t"));

          pubInter.writeJson(projectDriverURL + '/DriverInfo.json', proDriver);    
          break;
        }
      // } 
    }   
  }else{
    console.log(readFileJSON.ErrorDesc);
    resultObj.err = true;
    resultObj.des = readFileJSON.ErrorDesc;
    return resultObj;
  }
  var driveFileName = [];
  pubInter.proFileCopy(copyDrivePath, projectDriverURL, driveFileName);//拷贝驱动 xml 依赖文件等
  if( checkFlag == false ){
    let projectFileObj;  
    var projectFileList = proPath + '/ProjectFileList.json';
    let proFileJSON = pubInter.readJson( projectFileList );
    if( proFileJSON.Error == false){
      projectFileObj = proFileJSON.data;
    }else{
      console.log(proFileJSON.ErrorDesc);
      resultObj.err = true;
      resultObj.des = proFileJSON.ErrorDesc;
      return resultObj;
    }
    if(projectFileObj.FileList){
      for(var i = 0; i < projectFileObj.FileList.length; i++){        
        if(typeof(projectFileObj.FileList[i]) == "object" && projectFileObj.FileList[i].FolderName == "Driver"){
          if( global.productType == 2){
            for( var df=0; df<driveFileName.length; df++){
              var temFile = {};
              temFile.FileName = driveFileName[df];
              temFile.FileMD5Code = "";
              projectFileObj.FileList[i].FileList.push(( temFile ));
            }
          }else if( global.productType == 1){
            for(var j = 0; j < driveFileName.length; j++){
              if(!projectFileObj.FileList[i].FileList.find(function(value){
                return value == driveFileName[j]
              })){
                projectFileObj.FileList[i].FileList.push(driveFileName[j]);
              }
            }
          }
          break;
        }
      }
    }
    var writeProjectFileStr = JSON.stringify(projectFileObj, "", "\t");
    try{
    fs.writeFileSync(projectFileList,writeProjectFileStr);
    } catch (error) {
      resultObj.err = true;
      resultObj.des = "写文件列表失败" + error;
      return resultObj;
    }
  }
  return resultObj;
}

//驱动拷贝，修改清单文件
function copyDriverAndModfiyFileListNew(copyDrivePath, proPath, newDeviceObj,OsType){
  var resultObj = {};
  resultObj.err = false;
  var driveJson = global.drivePath + "/DriverInfo.json";//拷贝DriveInfo.json
  let projectDriverURL = proPath + '/Driver';
  var checkFlag = false;
  let readFileJSON = pubInter.readJson(driveJson);
  if( readFileJSON.Error == false){
    var driveData = readFileJSON.data;
    // if( global.productType == 2){
      for(var dd=0; dd<driveData.DriverList.length; dd++ ){
        if( driveData.DriverList[dd].SysPlatform == newDeviceObj.SystemPlatform 
            && driveData.DriverList[dd].DriverName == newDeviceObj.DriverName
            && driveData.DriverList[dd].DriverVersion == newDeviceObj.DriverVersion  // 20230529 zjt 增加版本和平台的判断
            && driveData.DriverList[dd].PlatformType == OsType){
          let objDriverJson = pubInter.readJson(projectDriverURL+'/DriverInfo.json');
          if (objDriverJson.Error) {
            res.send(objDriverJson.ErrorDesc);
            return;
          }
          let proDriver = objDriverJson.data;
          //let proDriver =JSON.parse( fs.readFileSync(projectDriverURL+'/DriverInfo.json') );            
          for( var pd=0; pd<proDriver.DriverList.length; pd++){
            if(proDriver.DriverList[pd].SysPlatform == newDeviceObj.SystemPlatform  
                && proDriver.DriverList[pd].DriverName == newDeviceObj.DriverName
                && proDriver.DriverList[pd].DriverVersion == newDeviceObj.DriverVersion // 20230529 zjt 增加版本和平台的判断
                && proDriver.DriverList[pd].PlatformType == OsType){
              checkFlag = true;
            }
          }
          if( checkFlag == false){
            driveData.DriverList[dd].DriverUpdate = 0; // 20230529 zjt 增加驱动更新字段，0：需要安装，1：不需要安装
            proDriver.DriverList.push(driveData.DriverList[dd]);
          }
          //fs.writeFileSync(projectDriverURL + '/DriverInfo.json',JSON.stringify(proDriver, "", "\t"));

          pubInter.writeJson(projectDriverURL + '/DriverInfo.json', proDriver);    
          break;
        }
      // } 
    }   
  }else{
    console.log(readFileJSON.ErrorDesc);
    resultObj.err = true;
    resultObj.des = readFileJSON.ErrorDesc;
    return resultObj;
  }
  var driveFileName = [];
  pubInter.proFileCopy(copyDrivePath, projectDriverURL, driveFileName);//拷贝驱动 xml 依赖文件等
  if( checkFlag == false ){
    let projectFileObj;  
    var projectFileList = proPath + '/ProjectFileList.json';
    let proFileJSON = pubInter.readJson( projectFileList );
    if( proFileJSON.Error == false){
      projectFileObj = proFileJSON.data;
    }else{
      console.log(proFileJSON.ErrorDesc);
      resultObj.err = true;
      resultObj.des = proFileJSON.ErrorDesc;
      return resultObj;
    }
    if(projectFileObj.FileList){
      for(var i = 0; i < projectFileObj.FileList.length; i++){        
        if(typeof(projectFileObj.FileList[i]) == "object" && projectFileObj.FileList[i].FolderName == "Driver"){
          if( global.productType == 2){
            for( var df=0; df<driveFileName.length; df++){
              var temFile = {};
              temFile.FileName = driveFileName[df];
              temFile.FileMD5Code = "";
              projectFileObj.FileList[i].FileList.push(( temFile ));
            }
          }else if( global.productType == 1){
            for(var j = 0; j < driveFileName.length; j++){
              if(!projectFileObj.FileList[i].FileList.find(function(value){
                return value == driveFileName[j]
              })){
                projectFileObj.FileList[i].FileList.push(driveFileName[j]);
              }
            }
          }
          break;
        }
      }
    }
    var writeProjectFileStr = JSON.stringify(projectFileObj, "", "\t");
    try{
    fs.writeFileSync(projectFileList,writeProjectFileStr);
    } catch (error) {
      resultObj.err = true;
      resultObj.des = "写文件列表失败" + error;
      return resultObj;
    }
  }
  return resultObj;
}

function recursionDeviceDel(groupListArr, deviceName){
  for(var i = 0; i < groupListArr.length; i++){
    if (groupListArr[i].DeviceName) {
      for (let j = 0; j < deviceName.length; j++) {
        if (groupListArr[i].DeviceName == deviceName[j]) {
          groupListArr.splice(i, 1);
          i--;
          break;
        }
      }
    } else if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
      recursionDeviceDel(groupListArr[i].DeviceObjectList, deviceName);
    } 
  }
}

//删除 设备
router.post('/deleteDevice',function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post deleteDevice");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
	DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  let deviceObj;
  var proPath = path.join(tenantDir, req.query.ProjectID, 'project');
  var projectDeviceURL = proPath + '/DeviceInfo.json';
  let deviceStrJson = pubInter.readJson( projectDeviceURL );
  if( deviceStrJson.Error == false){
    deviceObj = deviceStrJson.data;
  }else{
    console.log(deviceStrJson.ErrorDesc);
    res.send(deviceStrJson.ErrorDesc);
    return;
  }

  let devArr = JSON.parse(xss(req.body.DeviceName));//JSON.parse(req.query.DeviceName);
  let driverArr = [];//驱动

  let devIDArr = [];//删除设备的ID
  //删除设备
  for(var i = 0; i < deviceObj.DeviceList.length; i++){
    for(var j = 0; j < devArr.length; j++){
      if(deviceObj.DeviceList[i].DeviceName == devArr[j]){
        var DriverVersion = deviceObj.DeviceList[i].DriverVersion;
        if(!driverArr.find(function(value){
          return (value.DriverName == deviceObj.DeviceList[i].DriverName && value.SystemPlatform == deviceObj.DeviceList[i].SystemPlatform && value.DeviceProvider == deviceObj.DeviceList[i].DeviceProvider);
        })){
          var tempDriverInfo = new Object();
          tempDriverInfo.DriverName = deviceObj.DeviceList[i].DriverName;
          tempDriverInfo.SystemPlatform = deviceObj.DeviceList[i].SystemPlatform;
          tempDriverInfo.DeviceProvider = deviceObj.DeviceList[i].DeviceProvider;
          tempDriverInfo.OsType = deviceObj.DeviceList[i].OsType;
          driverArr.push( tempDriverInfo );
        }
        devIDArr.push(deviceObj.DeviceList[i].DeviceID);
        deviceObj.DeviceList.splice(i,1);
        i--;
        break;
      }
    }
  }
  //删除 设备组 中的设备
  let deviceGroupObj;  
  var projectDeviceGroupURL = proPath + '/DeviceGroupInfo.json';
  let deviceGroupStrJson = pubInter.readJson( projectDeviceGroupURL );
  if( deviceGroupStrJson.Error == false){
    deviceGroupObj = deviceGroupStrJson.data;
  }else{
    console.log(deviceGroupStrJson.ErrorDesc);
    res.send(deviceGroupStrJson.ErrorDesc);
    return;
  }

  /* if(xss(req.query.DeviceGroup) == "设备"){
    for(var i = 0; i < deviceGroupObj.DeviceGroupList.length; i++){
      for(var j = 0; j < devArr.length; j++){
        if(deviceGroupObj.DeviceGroupList[i].DeviceName == devArr[j]){
          deviceGroupObj.DeviceGroupList.splice(i,1);
          i--;break;
          // devArr.splice(j,1);//同名设备应该只存在一个//可能会影响数组长度
        }
      }
    }
  }else{
    
  } */
  recursionDeviceDel(deviceGroupObj.DeviceGroupList, devArr);
  var writeDevGroupStr = JSON.stringify(deviceGroupObj, "", "\t");
  try{
    fs.writeFileSync(projectDeviceGroupURL,writeDevGroupStr);
  } catch (error) {
    console.log(error)
    res.send("写设备组文件失败:" + error);
    return;
  }
  //删除链路中的设备
  if( global.productType == 2){
    let linkObj;  
    var linkPath = proPath + '/CollectChannelInfo.json';
    let linkStrJson = pubInter.readJson( linkPath );
    if( linkStrJson.Error == false){
      linkObj = linkStrJson.data.CollectChannelList;
    }else{
      console.log(linkStrJson.ErrorDesc);
      res.send(linkStrJson.ErrorDesc);
      return;
    }
    let deltLing = [];
    for( var ll=0; ll<linkObj.length; ll++){
      for( var hh=0;hh<linkObj[ll].DevIDArr.length;hh++){
        for( var dd=0; dd<devIDArr.length; dd++){
          if( linkObj[ll].DevIDArr[hh] == devIDArr[dd] ){
            linkObj[ll].DevIDArr.splice(hh, 1);
            if( linkObj[ll].DevIDArr.length == 0){
              deltLing.push(ll);
            }
          }
        }
      }
    }
    for( var g=0;g<deltLing.length;g++){
      linkObj.splice(deltLing[g], 1);
      for( var t=0;t<deltLing.length;t++){
        deltLing[t] --;
      }
    }
    var linkJson = {};
    linkJson.CollectChannelList = linkObj;
    try{
      fs.writeFileSync(linkPath,JSON.stringify(linkJson, "", "\t"));
    } catch (error) {
      console.log(error)
      res.send("写CollectChannelInfo文件失败:" + error);
      return;
    }
  }
  
  //删除变量
  let varGroupObj;  
  var proVarGroupURLXML = proPath + '/VarGroupInfo.json';
  let vargroupJson = pubInter.readJson( proVarGroupURLXML );
  if( vargroupJson.Error == false){
    varGroupObj = vargroupJson.data;
  }else{
    console.log(vargroupJson.ErrorDesc);
    res.send(vargroupJson.ErrorDesc);
    return;
  }

  let varObj;  
  var projectVarURL = proPath + '/VarInfo.json';
  let varStrJson = pubInter.readJson( projectVarURL );
  if( varStrJson.Error == false){
    varObj = varStrJson.data;
  }else{
    console.log(varStrJson.ErrorDesc);
    res.send(varStrJson.ErrorDesc);
    return;
  }

  for(var m = 0; m < varObj.TagList.length; m++){
    for(var n = 0; n < devArr.length; n++){
      if(varObj.TagList[m].DeviceName == devArr[n]){
         //删除变量组中的变量
        deleteVarInGroup(varGroupObj.TagGroupList, varObj.TagList[m].TagName, varObj.TagList[m].TagID);
        varObj.TagList.splice(m,1);
        m--;
        break;
      }
    }
  }
  var writeVarGroupStr = JSON.stringify(varGroupObj, "", "\t");
  try{
    fs.writeFileSync(proVarGroupURLXML,writeVarGroupStr);
  } catch (error) {
    console.log(error)
    res.send("写变量组文件失败:" + error);
    return;
  }

  var writeVarStr = JSON.stringify(varObj, "", "\t");
  try{
    fs.writeFileSync(projectVarURL,writeVarStr);
  } catch (error) {
    console.log(error)
    res.send("写变量文件失败:" + error);
    return;
  }

  //删除驱动
  for(var r = 0; r < driverArr.length; r++){
    for(var s = 0; s < deviceObj.DeviceList.length; s++){
      if(driverArr[r].DriverName == deviceObj.DeviceList[s].DriverName && driverArr[r].SystemPlatform == deviceObj.DeviceList[s].SystemPlatform && driverArr[r].DeviceProvider == deviceObj.DeviceList[s].DeviceProvider){
        driverArr.splice(r,1);
        r--;
        break;
      }
    }
  }
  //同时删除文件列表中的文件
  let projectFileObj;  
  var projectFileList = proPath + '/ProjectFileList.json';
  let projectFileJson = pubInter.readJson( projectFileList );
  if( projectFileJson.Error == false){
    projectFileObj = projectFileJson.data;
  }else{
    console.log(projectFileJson.ErrorDesc);
    res.send(projectFileJson.ErrorDesc);
    return;
  }
  
  let driverObj;
  var drivePath;
  // if( global.productType == 1){
  //   let driverURL = path.resolve(__dirname,"../Driver/DriverInfo.json");
  //   if(!fs.existsSync(driverURL)){
  //     res.send("未找到驱动列表文件");
  //     return;
  //   }
  //   driverObj = JSON.parse(fs.readFileSync(driverURL, 'utf-8'));
  // }else if( global.productType == 2){
    drivePath = proPath + '/Driver/DriverInfo.json';
    let driveJsonInfo = pubInter.readJson( drivePath );
    if( driveJsonInfo.Error == false){
      driverObj = driveJsonInfo.data;
    }else{
      console.log(driveJsonInfo.ErrorDesc);
      res.send(driveJsonInfo.ErrorDesc);
      return;
    }
  // }

  for(var r = 0; r < driverArr.length; r++){
    let proDriverURLXML = proPath + '/Driver/' + driverArr[r].DriverName + ".xml";
    if(!fs.existsSync(proDriverURLXML)){
      continue;//260413 gxx
      // res.send("未找到驱动文件:" + driverArr[r].DriverName + ".xml");
      // return;
      
    }
    if(DriverVersion == "66.1.1.1"){
      var proDriverURLSO = proPath + '/Driver/lib' + driverArr[r].DriverName + ".so";
    }else{
      var proDriverURLSO = proPath + '/Driver/lib' + driverArr[r].DriverName + ".so." + DriverVersion;
    }
    if(driverArr[r].OsType == "Windows"){
      proDriverURLSO = proPath + '/Driver/' + driverArr[r].DriverName + ".dll";
    }
    if(!fs.existsSync(proDriverURLSO)){
      continue;//260413 gxx
      res.send("未找到驱动文件:" + proDriverURLSO);
      return;
    }
    try {
        fs.unlinkSync(proDriverURLXML);
        fs.unlinkSync(proDriverURLSO);
    } catch (error) {
        console.log(error)
    }
    var fileListPtr;
    if(projectFileObj.FileList){
      for(var i = 0; i < projectFileObj.FileList.length; i++){
        if(typeof(projectFileObj.FileList[i]) == "object" && projectFileObj.FileList[i].FolderName == "Driver"){
          fileListPtr = projectFileObj.FileList[i];
          var driverNameTemp = "lib" + driverArr[r].DriverName + ".so";
          if( driverArr[r].SystemPlatform == "Windows"){
            driverNameTemp = driverArr[r].DriverName + ".dll";
          }
          for(var j = 0; j < projectFileObj.FileList[i].FileList.length; j++){
            var drTempName;
            if( global.productType == 1){
              drTempName = projectFileObj.FileList[i].FileList[j];
            }else if( global.productType == 2){
              drTempName = projectFileObj.FileList[i].FileList[j].FileName;
            }
            if( drTempName == (driverNameTemp)){
              projectFileObj.FileList[i].FileList.splice(j,1);
              j--;
              continue;
            }
            if( drTempName == (driverArr[r].DriverName + ".xml")){
              projectFileObj.FileList[i].FileList.splice(j,1);
              j--;
            }
          }
        }
      }
    }
    //删除依赖文件
    for( var s = 0; s < driverObj.DriverList.length; s++){
      if( driverObj.DriverList[s].DriverName == driverArr[r].DriverName && driverObj.DriverList[s].SysPlatform == driverArr[r].SystemPlatform &&  driverObj.DriverList[s].
        DriverCompany == driverArr[r].DeviceProvider ){
        var tempDepenFiles = driverObj.DriverList[s].DependFile.split("|");
        for(var q = 0; q < tempDepenFiles.length; q++){
          if(tempDepenFiles[q] == ""){
            continue;
          }
          var tempDelPath = proPath + '/Driver/' + tempDepenFiles[q];
          if(!fs.existsSync(tempDelPath)){
            res.send("未找到驱动依赖文件:" + tempDelPath);
            return;
          }
          fs.unlinkSync(tempDelPath);
          for(var x = 0; x < fileListPtr.FileList.length; x++){
            var dfName;
            if( global.productType == 1){
              dfName = fileListPtr.FileList[x];
            }else if( global.productType == 2){
              dfName = fileListPtr.FileList[x].FileName;
            }
            if( dfName ==  tempDepenFiles[q]){
              fileListPtr.FileList.splice(x,1);
              x--;
            }
          }
        }
      }
    }

  }

  // if(global.productType == 2){
    for(var dd=0; dd<driverObj.DriverList.length;dd++){
      for( var mm=0; mm<driverArr.length; mm++){
        if( driverObj.DriverList[dd].SysPlatform == driverArr[mm].SystemPlatform && 
            driverObj.DriverList[dd].DriverName == driverArr[mm].DriverName &&
            driverObj.DriverList[dd].DriverCompany == driverArr[mm].DeviceProvider){
          driverObj.DriverList.splice(dd,1)
          dd--;
          break;
        }
      }
    // }
    var result = pubInter.writeJson(drivePath, driverObj);
    if( result != "OK"){
      console.log('result=',result);
      res.send("写文件列表失败" + result);
      return;
    }
  }
  var writeProjectFileStr = JSON.stringify(projectFileObj, "", "\t");
  try{
   fs.writeFileSync(projectFileList,writeProjectFileStr);
  } catch (error) {
    res.send("写文件列表失败" + error);
    return;
  }
  var writeDevStr = JSON.stringify(deviceObj, "", "\t");
  try{
    fs.writeFileSync(projectDeviceURL, writeDevStr);
  } catch (error) {
    console.log(error)
    res.send("写设备文件失败:" + error);
    return;
  }
  res.send("OK");
  DevLogManagerObj.traceLog(DevManagerName, "Leave post deleteDevice");
})

//编辑 设备
router.post('/editDevice',async function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post editDevice");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
	DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  //修改 设备------------------------------------------------------------
  req.query = pubInter.EscapeAllData(req.query);
  var proPath = path.join(tenantDir, req.query.ProjectID, 'project');
  let deviceObj;  
  var projectDeviceURL = proPath + '/DeviceInfo.json';
  let deviceStrJson = pubInter.readJson( projectDeviceURL );
  if( deviceStrJson.Error == false){
    deviceObj = deviceStrJson.data;
  }else{
    console.log(deviceStrJson.ErrorDesc);
    res.send(deviceStrJson.ErrorDesc);
    return;
  }

  let editDeviceID = req.query.DeviceID;
  let parentDeviceGroupName = req.query.DeviceGroup;
  let DriverVersion, OsType, DriverSeries="";//20231208
  for(var i = 0; i < deviceObj.DeviceList.length; i++){
    if(deviceObj.DeviceList[i].DeviceID == editDeviceID){
      DriverVersion = deviceObj.DeviceList[i].DriverVersion;
      OsType = deviceObj.DeviceList[i].OsType;
      let tDriverSeries = deviceObj.DeviceList[i].DriverSeries;
      for(let j=0; j<tDriverSeries.length; j++) {
        let e = tDriverSeries[j];
        if(e == "(") {
          DriverSeries += "LB";
        } else if (e == ")") {
          DriverSeries += "RB";
        } else {
          DriverSeries += e;
        }
      }
    }
  }

  //设备名称重复校验
  req.body = pubInter.EscapeAllData(req.body);
  if(req.body.code == "DeviceName"){
    for(var m = 0; m < deviceObj.DeviceList.length; m++){
      if(deviceObj.DeviceList[m].DeviceName == req.body.value){
        res.send("设备名称重复");
        return;
      }
    }
  }
  var nDevNumber = 0;
  //设备地址校验
  if(req.body.code == "DevAddress"){
    req.body.value = decodeURI(req.body.value);
    //设备地址校验
    //设置xml地址
    var relativePath =  proPath + "/Driver/" + req.query.DriverName + ".xml";
    if(DriverVersion == "66.1.1.1") {
      var relativePathSO = proPath + "/Driver/lib" + req.query.DriverName + ".so";
    } else {
      var relativePathSO = proPath + "/Driver/lib" + req.query.DriverName + ".so." + DriverVersion;
    }
    
    if( OsType == "Windows"){
      relativePathSO =  proPath + "/Driver/" + req.query.DriverName + ".dll";
    }
    var xmlPathCheck = fs.existsSync(relativePath);
    var soPathCheck = fs.existsSync(relativePathSO);
    if(!xmlPathCheck || !soPathCheck){
      res.send("未找到驱动文件，错误的驱动路径");
      return;
    }
    //var resultNew = driverConfig.getConfigModuleObject();
    //driverConfig.setXmlPath(relativePath);
    //设置参数
    var deviceAddrInfoObj = new Object();
    var errorInfoObj = new Object();
    //20240205
    let oldDevAddress = req.body.value;
    let newDevAddress = "";
    let specialChars = [':', '/', '|', '_', ','];
    for(let i=0;i<oldDevAddress.length;i++) {
      let c = oldDevAddress[i];
      // if(c == ':' || c == "/" || c == "|" || c == "_") {
      if(specialChars.indexOf(c) != -1){
        newDevAddress += " ";
      } else {
        newDevAddress += c;
      }
    }
    newDevAddress = OsType == "Windows" ? newDevAddress : oldDevAddress;
    //var checkResult = driverConfig.getDeviceInfo(newDevAddress, deviceAddrInfoObj, errorInfoObj, DriverSeries, req.query.DriverName);
    // var resultDel = driverConfig.releaseConfigModuleObject();  
    //20250901 适配opcua js化
    let errcode = { "value": 0 };
    let devaddr = { "nDevAddr": -1, "sDevAddr": "" };
    let ret = driverConfig.LoadXmlFile(errcode, relativePath, req.query.DriverName, DriverSeries);
    if(!ret) {
      res.send("加载xml失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value] + " 路径：" + relativePath);
      return ;
    }
    let checkResult = driverConfig.checkUserDevAddr(errcode, newDevAddress, devaddr, req.query.DriverName, DriverSeries);
    if(!checkResult) {    
      res.send("设备地址校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value]);
      return ;
    }  
    //!20250901
   // 20241119 filter device address type is string
    //let ret = await KingConfigModuleJs.isStringFormat(driverPath + "/" + newDeviceObj.DriverName + ".xml", newDeviceObj.DriverName, true, newDeviceObj.DriverSeries);
    ret = await KingConfigModuleJs.isStringFormat(relativePath, req.query.DriverName, true, DriverSeries);
    if(!ret.isString) {
      if(!checkResult){
        var errDesc = "";
        for(var param in objConfigErrMsg){
          if(param == errorInfoObj.nErrCode){
            errDesc = objConfigErrMsg[param];
          }
        }
        res.send("设备地址校验失败，错误码：" + errorInfoObj.nErrCode + " " + errDesc);
        return;
      }
      nDevNumber = devaddr.nDevAddr;
    }
    
  }

  let varObj;  
  var projectVarURL = proPath + '/VarInfo.json';
  let varStrJson = pubInter.readJson( projectVarURL );
  if( varStrJson.Error == false){
    varObj = varStrJson.data;
  }else{
    console.log(varStrJson.ErrorDesc);
    //logger.formatErrorLog(req, varStrJson.ErrorDesc, pubInter.getCurrentTime());
    res.send(varStrJson.ErrorDesc);
    return;
  }

  //写 设备组
  let deviceGroupObj;  
  var projectDeviceGroupURL = proPath + '/DeviceGroupInfo.json';
  let deviceGroupStrJson = pubInter.readJson( projectDeviceGroupURL );
  if( deviceGroupStrJson.Error == false){
    deviceGroupObj = deviceGroupStrJson.data;
  }else{
    console.log(deviceGroupStrJson.ErrorDesc);
    //logger.formatErrorLog(req, deviceGroupStrJson.ErrorDesc, pubInter.getCurrentTime());
    res.send(deviceGroupStrJson.ErrorDesc);
    return;
  }
  
  let nDelDevName = "";//删除设备的名称；
  for(var i = 0; i < deviceObj.DeviceList.length; i++){
    if( deviceObj.DeviceList[i].DeviceID == editDeviceID){
      var bDelete = false;//是否需要删除设备
      var nDelIndex = -1;//删除设备的索引
      if(req.body.valueType == "number"){
        if(req.body.code == "RedundancyEnable" && req.body.value == 0){
          //取消冗余使能之后会令冗余设备变成空
          let strRedunDeviceName = deviceObj.DeviceList[i].RedunDeviceName;
          let objFindRedunDev = deviceObj.DeviceList.find(function (params, index) {
            if (params.DeviceName == strRedunDeviceName) {
              nDelIndex = index;
              return true;
            }
          })
          if (objFindRedunDev) {
            nDelDevName = objFindRedunDev.DeviceName;
            bDelete = true;
            //objFindRedunDev.RedundancyStyle = 0;//将原来的从冗余设备变成无冗余设备
          }          
          deviceObj.DeviceList[i].RedunDeviceName = "";
          deviceObj.DeviceList[i].RedundancyStyle = 0;
          deviceObj.DeviceList[i].RedunDeviceID = "";
          //将变量中的冗余设备ID变为空
          for (let j = 0; j < varObj.TagList.length; j++) {
            if (varObj.TagList[j].DeviceName == deviceObj.DeviceList[i].DeviceName) {
              varObj.TagList[j].RedunDeviceID = "";
            }
          }
        } else {
          deviceObj.DeviceList[i][req.body.code] = Number(req.body.value);
        }        
      } else {
        if( req.body.code == "RedunDeviceName"){
          //修改后指定的冗余设备
          let objModifyDev = deviceObj.DeviceList.find(function (device) {
            return device.DeviceName == req.body.value;
          })
          //修改前指定的冗余设备
          let objRawDev = deviceObj.DeviceList.find(function (device, index) {
            if (device.DeviceName == deviceObj.DeviceList[i].RedunDeviceName) {
              nDelIndex = index;
              return true;
            }
          })
          if (objRawDev == undefined || objModifyDev.DeviceName != objRawDev.DeviceName) {
            objModifyDev.RedundancyStyle = 2;
            deviceObj.DeviceList[i].RedunDeviceName = req.body.value;
            deviceObj.DeviceList[i].RedunDeviceID = objModifyDev.DeviceID;
            deviceObj.DeviceList[i].RedundancyStyle = 1;
            if (objRawDev) {
              //objRawDev.RedundancyStyle = 0;
              bDelete = true;
              nDelDevName = objRawDev.DeviceName;
            }
            //删除冗余设备下的变量
            let strVarGroupPath = proPath + "/VarGroupInfo.json";
            let objReadGroup = pubInter.readJson(strVarGroupPath);
            if (objReadGroup.Error) {
              res.send(objReadGroup.ErrorDesc);
              return;
            }
            let varGroupObj = objReadGroup.data;
            for (let j = varObj.TagList.length - 1; j >= 0; j--) {
              if(varObj.TagList[j].DeviceName == req.body.value){
                //删除变量组中的变量
                deleteVarInGroup(varGroupObj.TagGroupList, varObj.TagList[j].TagName, varObj.TagList[j].TagID);
                varObj.TagList.splice(j,1);
              } else if (deviceObj.DeviceList[i].DeviceName == varObj.TagList[j].DeviceName && objModifyDev != undefined) {
                //修改该设备原来的变量中指定的冗余设备
                varObj.TagList[j].RedunDeviceID = objModifyDev.DeviceID;
              }
            }
            //恢复原冗余设备的系统变量
            /* let nMaxTagID = varObj.TagList[varObj.TagList.length - 1].TagID;
            if (objRawDev) {
              addSystemVar(objRawDev, varObj.TagList, nMaxTagID);
            } */
            //更新变量组中的信息
            let strWriteGroup = pubInter.writeJson(strVarGroupPath, varGroupObj);
            if (strWriteGroup != "OK") {
              res.send(strWriteGroup);
              return;
            }
            /* for( var hh=0;hh<req.body.editor.options.data.length; hh++){
              if( req.body.value == req.body.editor.options.data[hh].rolename ){
                deviceObj.DeviceList[i]["RedunDeviceID"] = parseInt(req.body.editor.options.data[hh].devData.DeviceID)
                deviceObj.DeviceList[i]["RedundanceDevChannelID"] = parseInt(req.body.editor.options.data[hh].devData.channelData.ChannelID);
                deviceObj.DeviceList[i]["RedundanceChannelName"] = req.body.editor.options.data[hh].devData.channelData.ChannelName;
                break;
              }
            } */
          }
        }
        deviceObj.DeviceList[i][req.body.code] = req.body.value;
        if (req.body.code == "DevAddress") {
          deviceObj.DeviceList[i].DevNumber = nDevNumber; 
        }
      }
      if(req.body.code == "FrequencySwitchCondition"){
        if(undefined == req.body.value){
          deviceObj.DeviceList[i][req.body.code] = [];
        }
        for(let j = 0; j < deviceObj.DeviceList[i][req.body.code].length; j++){
          for(var paramters in deviceObj.DeviceList[i][req.body.code][j]){
            deviceObj.DeviceList[i][req.body.code][j][paramters] = Number(deviceObj.DeviceList[i][req.body.code][j][paramters]);
          }
        }
      }
      //将原设备删除
      if (bDelete && nDelIndex != -1) {
        deviceObj.DeviceList.splice(nDelIndex, 1);
      }
      if (nDelDevName != "") {
        recursionDeviceDel(deviceGroupObj.DeviceGroupList, [nDelDevName]);
      }
      break;
    }
  }

  var writeDevStr = JSON.stringify(deviceObj, "", "\t");
  try{
    fs.writeFileSync(projectDeviceURL,writeDevStr);
  } catch (error) {
    res.send("写设备文件失败" + error);
    return;
  }
 
  if(req.body.code == "DeviceName"){
    function recursionDeviceEdit(groupListArr, parentGroupName, deviceID, deviceName){
      for(var i = 0; i < groupListArr.length; i++){
        if(groupListArr[i].DeviceGroupName == parentGroupName ){
          for(var j = 0; j < groupListArr[i].DeviceObjectList.length; j++){
            if(groupListArr[i].DeviceObjectList[j].DeviceID && groupListArr[i].DeviceObjectList[j].DeviceID == deviceID){
              groupListArr[i].DeviceObjectList[j].DeviceName = deviceName;
            }
          }
          return;//只有一个同名的组名
        }else if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
          recursionDeviceEdit(groupListArr[i].DeviceObjectList, parentGroupName, deviceID, deviceName);
        }
      }
    }

    if(req.query.DeviceGroup == "设备"){
      for(var j = 0; j < deviceGroupObj.DeviceGroupList.length; j++){
        if(deviceGroupObj.DeviceGroupList[j].DeviceID && deviceGroupObj.DeviceGroupList[j].DeviceID == editDeviceID){
          deviceGroupObj.DeviceGroupList[j].DeviceName = req.body.value;
        }
      }
    }else{
      recursionDeviceEdit(deviceGroupObj.DeviceGroupList, parentDeviceGroupName, editDeviceID, req.body.value);
    }
    //写 变量
    for(var i = 0; i < varObj.TagList.length; i++){
      if( varObj.TagList[i].DeviceID == editDeviceID){
        varObj.TagList[i].DeviceName= req.body.value;
        if(varObj.TagList[i].TagName.indexOf("$DeviceStatusOf") != -1){
          varObj.TagList[i].TagName = "$DeviceStatusOf" + req.body.value;
        }
        if(varObj.TagList[i].TagName.indexOf("$DeviceControlOf") != -1){
          varObj.TagList[i].TagName = "$DeviceControlOf" + req.body.value;
        }
        if(varObj.TagList[i].TagName.indexOf("$FrequencyValueOf") != -1){
          varObj.TagList[i].TagName = "$FrequencyValueOf" + req.body.value;
        }
      }
    }

  }
  var varObjStr = JSON.stringify(varObj, "", "\t");
  try{
    fs.writeFileSync(projectVarURL,varObjStr);
  } catch (error) {
    res.send("写变量文件失败" + error);
    return;
  }
  var writeDevGroupStr = JSON.stringify(deviceGroupObj, "", "\t");
  try{
    fs.writeFileSync(projectDeviceGroupURL,writeDevGroupStr);
  } catch (error) {
    res.send("写设备组文件失败" + error);
    return;
  }
  DevLogManagerObj.traceLog(DevManagerName, "Leave post editDevice");
  res.send("OK");
})

//创建系统变量
function addSystemVar(objDeviceInfo, arrTagList, maxTagID) {
  var varStateName = new Object();
  varStateName = JSON.parse(JSON.stringify(systemTagTemplate));
  varStateName.TagName = "$DeviceStatusOf" + objDeviceInfo.DeviceName;
  varStateName.DeviceID = objDeviceInfo.DeviceID;
  varStateName.DeviceName = objDeviceInfo.DeviceName;
  varStateName.TagGroup = "root"//"变量";
  varStateName.TagType = KVIO_TAG_TYPE_SYSTEM;
  varStateName.TagDataType = 4;
  varStateName.AccessType = 2;
  varStateName.TagID = maxTagID + 1;
  varStateName.RegDataType = varStateName.TagDataType;

  var varControlName = new Object();
  varControlName = JSON.parse(JSON.stringify(systemTagTemplate));
  varControlName.TagName = "$DeviceControlOf" + objDeviceInfo.DeviceName;
  varControlName.DeviceID = objDeviceInfo.DeviceID;
  varControlName.DeviceName = objDeviceInfo.DeviceName;
  varControlName.TagGroup = "root"//"变量";
  varControlName.TagType = KVIO_TAG_TYPE_SYSTEM;
  varControlName.TagDataType = 4;
  varControlName.AccessType = 0;
  varControlName.TagID = maxTagID + 2;
  varControlName.RegDataType = varControlName.TagDataType;
  
  var varFrequencyName = new Object();
  varFrequencyName = JSON.parse(JSON.stringify(systemTagTemplate));
  varFrequencyName.TagName = "$FrequencyValueOf" + objDeviceInfo.DeviceName;
  varFrequencyName.DeviceID = objDeviceInfo.DeviceID;
  varFrequencyName.DeviceName = objDeviceInfo.DeviceName;
  varFrequencyName.TagGroup = "root"//"变量";
  varFrequencyName.TagType = KVIO_TAG_TYPE_SYSTEM;
  varFrequencyName.TagDataType = 128;
  varFrequencyName.AccessType = 0;
  varFrequencyName.TagID = maxTagID + 3;
  varFrequencyName.RegDataType = varFrequencyName.TagDataType;

  arrTagList.push(varStateName);
  arrTagList.push(varControlName);
  arrTagList.push(varFrequencyName);
}

//编辑 链路
router.post('/editLinkInfo', function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post editLinkInfo");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  req.query = pubInter.EscapeAllData(req.query);
  var devPath = pubInter.joinPath(req.query.ProjectID,req.query.ProjectEdition,req.query.ProjectName);
  let changeData = pubInter.EscapeAllData(req.body);
  let linkData;
  var linkPath = devPath + '/CollectChannelInfo.json';
  let lkStrJson = pubInter.readJson( linkPath );
  if( lkStrJson.Error == false){
    linkData = lkStrJson.data.CollectChannelList;
  }else{
    console.log(lkStrJson.ErrorDesc);
    res.send(lkStrJson.ErrorDesc);
    return;
  }
  if( changeData.code == "ChannelName" ){
    for( var c=0; c<linkData.length; c++){
      if( changeData.value == linkData[c].ChannelName){
        res.send('重名');
        return;
      }
    }
  }

  let devInfo;  
  var devIfnoPath = devPath + '/DeviceInfo.json';
  let devInfoJson = pubInter.readJson( devIfnoPath );
  if( devInfoJson.Error == false){
    devInfo = devInfoJson.data.DeviceList;
  }else{
    console.log(devInfoJson.ErrorDesc);
    res.send(devInfoJson.ErrorDesc);
    return;
  }

  let varInfo;  
  var varIfnoPath = devPath + '/VarInfo.json';
  let varInfoJson = pubInter.readJson( varIfnoPath );
  if( varInfoJson.Error == false){
    varInfo = varInfoJson.data.TagList;
  }else{
    console.log(varInfoJson.ErrorDesc);
    res.send(varInfoJson.ErrorDesc);
    return;
  }
  var linkName = "";
  for( var l=0; l<linkData.length; l++){
    if( linkData[l].ChannelID == req.query.linkID){
      linkName = linkData[l].ChannelName;
      if( changeData.valueType == "number"){
        linkData[l][changeData.code] = parseInt(changeData.value);
      }else{
        linkData[l][changeData.code] = changeData.value;
      }

      //修改 设备和变量 中的链路 信息
      if( changeData.code != "ChannelDescription" && changeData.code != "ChannelUnable" 
                  && changeData.code != "InitTimeOut" && changeData.code != "CommunicationTimeOut"){
        if( linkData[l].ChannelType == 1 ){//COM
          if( changeData.code == "ChannelName" ){
            for(var d1=0;d1<linkData[l].DevIDArr.length;d1++){
              for( var dj=0;dj<devInfo.length;dj++){
                if( linkData[l].DevIDArr[d1] == devInfo[dj].DeviceID ){
                  devInfo[dj].SerialName = changeData.value;//修改设备中的链路名称
                  devInfo[dj].ChannelName = changeData.value;//修改设备中的链路名称
                }
              }

              for( var vj=0;vj<varInfo.length;vj++){
                if( linkData[l].DevIDArr[d1] == varInfo[vj].DeviceID ){
                  varInfo[vj].ChannelName = changeData.value;//修改变量中的链路名称
                }
              }
              
            }
          }else{
            for(var d1=0;d1<linkData[l].DevIDArr.length;d1++){
              for( var dj=0;dj<devInfo.length;dj++){
                if( linkData[l].DevIDArr[d1] == devInfo[dj].DeviceID ){
                  devInfo[dj][changeData.code] = parseInt(changeData.value);//修改设备中的链路 COM波特率等信息
                }
              }              
            }
          }
        }else if(  linkData[l].ChannelType == 2){//以太网
          if( changeData.code == "ChannelName" ){
            for(var d1=0;d1<linkData[l].DevIDArr.length;d1++){
              for( var dj=0;dj<devInfo.length;dj++){
                if( linkData[l].DevIDArr[d1] == devInfo[dj].DeviceID ){
                  devInfo[dj].LinkIP = changeData.value;//修改设备中的链路名称
                  devInfo[dj].ChannelName = changeData.value;//修改设备中的链路名称
                }
              }

              for( var vj=0;vj<varInfo.length;vj++){
                if( linkData[l].DevIDArr[d1] == varInfo[vj].DeviceID ){
                  varInfo[vj].ChannelName = changeData.value;//修改变量中的链路名称
                }
              }
              
            }
          }
        }
      }
      break;
    }
  }
  let devObj = {};
  devObj.DeviceList = devInfo;
  let strWriteDev = pubInter.writeJson(devIfnoPath, devObj);
  if (strWriteDev != "OK") {
    res.send(strWriteDev);
    return;
  }
  //fs.writeFileSync(devIfnoPath, JSON.stringify(devObj, '', "\t"));

  let varObj = {};
  varObj.TagList = varInfo;
  let strWriteVar = pubInter.writeJson(varIfnoPath, varObj);
  if (strWriteVar != "OK") {
    res.send(strWriteVar);
    return;
  }
  //fs.writeFileSync(varIfnoPath, JSON.stringify(varObj, '', "\t"));

  let lastObj = {};
  lastObj.CollectChannelList = linkData;
  res.send(pubInter.writeJson(linkPath, lastObj));
  /* fs.writeFileSync(linkPath, JSON.stringify(lastObj, '', "\t"));
  res.send("OK"); */
})

//导出 设备
router.post('/exportDevice',function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post exportDevice");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
	DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var resultInfo = new Object();
  resultInfo.Error = false;
  var relativePath =  global.exportPath + "/Dev";
  pubInter.delFileAndDir(relativePath);
  let createFile = pubInter.recursiveMakeDir(relativePath);
  //筛选需要导出的设备
  req.query = pubInter.EscapeAllData(req.query);
  let devPath  = path.join(tenantDir, req.query.ProjectID, 'project');;
  let projectDeviceURL = devPath + '/DeviceInfo.json';
  if(!fs.existsSync(projectDeviceURL)){
    resultInfo.Error = true;
    resultInfo.data = "未找到设备文件";
    res.send(JSON.stringify(resultInfo));
    return;
  }
  let deviceStrJson = pubInter.readJson(projectDeviceURL);
  if (deviceStrJson.Error) {
    deviceStrJson.data = deviceStrJson.ErrorDesc
    res.send(JSON.stringify(deviceStrJson));
    return;
  }
  let deviceObj = deviceStrJson.data;
  /* let deviceStrJson = fs.readFileSync(projectDeviceURL, 'utf-8');
  let deviceObj = JSON.parse(deviceStrJson); */
  let exportDevArr = req.query.DeviceName.split(',');
  let DriverName = new Array();
  for(var i = 0; i < deviceObj.DeviceList.length; i++){
    var findResult = false;
    for(var j = 0; j < exportDevArr.length; j++){
      if(exportDevArr[j] == deviceObj.DeviceList[i].DeviceName){
        DriverName[j] = deviceObj.DeviceList[i].DriverName;
        findResult = true;
        break;
      }
    }
    if(findResult == false){
      deviceObj.DeviceList.splice(i,1);
      i--;
    }
  }
  //if project have zero device or target devices are not found in project.
  if(deviceObj.DeviceList.length == 0 || deviceObj.DeviceList.length != exportDevArr.length)
  {
    let error = {};
    error.Error = true;
    error.data = "The number of project devices is 0 Or one of target devices is not found in project.";
    res.send(JSON.stringify(error));
    return;
  }
  //筛选需要导出的变量
 { /*
  let projectVarURL = global.sdbPath + getUrl(req.query.ProjectID, req.query.ProjectEdition) + '/VarInfo.json';
  if(!fs.existsSync(projectVarURL)){
    resultInfo.Error = true;
    resultInfo.data = "未找到变量文件";
    res.send(JSON.stringify(resultInfo));
    return;
  }
  let varObj = JSON.parse(fs.readFileSync(projectVarURL, 'utf-8'));
  for(var i = 0; i < varObj.TagList.length; i++){
    var findResult = false;
    for(var j = 0; j < exportDevArr.length; j++){
      if(exportDevArr[j] == varObj.TagList[i].DeviceName){
        varObj.TagList[i].DriverName = DriverName[j];
        findResult = true;
        break;
      }
    }
    if(findResult == false){
      varObj.TagList.splice(i,1);
      i--;
    }
  }
*/}
  //csv列名
  var fieldsDevice = new Array();
  if(deviceObj.DeviceList.length > 0){
    for(var param in deviceObj.DeviceList[0]){
      fieldsDevice.push(param);
    }
  }
  /*
  var fieldsVar = new Array();
  if(varObj.TagList.length > 0){
    for(var param in varObj.TagList[0]){
      fieldsVar.push(param);
    }
  }
  */
  //写设备csv文件
  if(req.query.Type == "csv"){
    const json2csvParser = new Json2csvParser({ fieldsDevice });
    const csvDev = json2csvParser.parse(deviceObj.DeviceList);
    if(req.query.SystemType == 1){//windows
      var newCsv = iconv.encode(csvDev, 'GBK');
      try {
        fs.writeFileSync(relativePath+"/DeviceInfo.csv",newCsv);
      } catch (error) {
        error.Error = true;
        error.data = error.message;
        res.send(JSON.stringify(error));
        return;
      } 
    }else{
      try {
        fs.writeFileSync(relativePath+"/DeviceInfo.csv",csvDev);
      } catch (error) {
        error.Error = true;
        error.data = error.message;
        res.send(JSON.stringify(error));
        return;
      }
      //fs.writeFileSync(relativePath+"/DeviceInfo.csv",csvDev);
    }
    /*
    const json2csvParserVar = new Json2csvParser({ fieldsVar });
    const csvVar = json2csvParserVar.parse(varObj.TagList);
    if(req.query.SystemType == 1){//windows
      var newCsv = iconv.encode(csvVar, 'GBK');
      fs.writeFileSync(tempPath+"/VarInfo.csv",newCsv);
    }else{
      fs.writeFileSync(tempPath+"/VarInfo.csv",csvVar);
    }*/
    /*
    var compressPath =  "../Public/exportTemp";
    var tempcompressPath = path.resolve(__dirname,compressPath);
    zipper.sync.zip(tempcompressPath + "/Dev").compress().save(tempcompressPath + "/device.zip");
    */    
    resultInfo.data = "Dev/DeviceInfo.csv";
    // resultInfo.data = "/kingio/exportTemp/device.zip";
    // res.send(JSON.stringify(resultInfo));
  }else if(req.query.Type == "json"){
    // res.send("支持csv");
    //写文件
    var writeDevStr = JSON.stringify(deviceObj, "", "\t");
    try {
      fs.writeFileSync(relativePath+"/DeviceInfo.json",writeDevStr);
    } catch (error) {
      error.Error = true;
      error.data = error.message;
      res.send(JSON.stringify(error));
      return;
    }   
    /*
    var writeVarStr = JSON.stringify(varObj, "", "\t");
    fs.writeFileSync(tempPath+"/VarInfo.json",writeVarStr);
    */
    //压缩
    /*
    var compressPath =  "../Public/exportTemp";
    var tempcompressPath = path.resolve(__dirname,compressPath);
    zipper.sync.zip(tempcompressPath + "/Dev").compress().save(tempcompressPath + "/device.zip");
    */
   resultInfo.data = "Dev/DeviceInfo.json";
  }else{
    let objReturn = {
      Error:true,
      data:"只支持csv、json"
    }
    res.send(JSON.stringify(objReturn));
    return;
  }
  resultInfo.Error = false;
  res.send(JSON.stringify(resultInfo));
  DevLogManagerObj.traceLog(DevManagerName, "Leave post exportDevice");
})

//导入 设备
router.post('/importDevice',function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post importDevice");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
	DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  let projectPath = path.join(tenantDir, req.query.ProjectID, 'project');
  const form = new formidable.IncomingForm();
  // let userName = req.query.UserName;//暂时没有创建人
  form.keepExtensions = true;//保存扩展名
  form.maxFieldsSize = 500 * 1024 * 1024;//上传文件的最大大小
  req.query = pubInter.EscapeAllData(req.query);
  form.parse(req, async (err, fields, files) =>{
    if (err) {
			throw err;
    }
    pubInter.delFileAndDir(global.importPath + "/Dev");
    let result = new Object();
    result.Error = false;
    result.data = "";
    if(req.query.Type == "ZIP"){
      result.Error = true;
      result.data = "暂不支持zip类型文件";
      // let strFileName = files.uploadDatas.path;
      // let readFile = fs.readFileSync(strFileName);
      // let writeFile = __dirname+ "/importTemp/" + files.uploadDatas.name;
      // let writeDir = __dirname+ "/importTemp";
      // let createFile = pubInter.recursiveMakeDir(writeFileDir);
      // fs.writeFileSync(writeFile,readFile);
      // let imZIPR = projectManager.Project_ImportInfo(writeFile,"zip", userName, Number(req.query.SystemType));
      // result.data = imZIPR;
      // if(imZIPR != "OK"){
      //   result.Error = true;
      //   console.log("projectManager.Project_ImportInfo执行错误：" + imZIPR)
      // }
      // if(imZIPR != "This project already exist."){
      //  delFileAndDir(writeDir);
      // }
      res.send(result);
    }
    if(req.query.Type == "JSON" || req.query.Type == "json"){
      result.Error = true;
      result.data = "初始错误";
      // let readTagFile = fs.readFileSync(files.VarInfo.path);
      let readDevFile = pubInter.readJson(files.DeviceInfo.path);
      if (readDevFile.Error) {
        res.send(readDevFile.ErrorDesc);
        return;
      }
      let deviceObj = readDevFile.data;
      if(deviceObj.DeviceList == undefined){
        result.Error = true;
        result.data = "错误：不是设备文件";
        res.send(JSON.stringify(result));
        return;
      }
      /* let readDevFile = fs.readFileSync(files.DeviceInfo.path);
      let deviceObj = JSON.parse(readDevFile); */
      // let varObj = JSON.parse(readTagFile);
      var devPath = projectPath;
      var resultImportDev = await newDevice(devPath, deviceObj.DeviceList, req.query.DeviceGroup);
      if(resultImportDev != "OK"){
        result.Error = true;
        result.data = resultImportDev;
      }else{
        // var resultImportVar = newVariable(req.query.ProjectID, req.query.ProjectEdition, varObj.TagList);
        // if(resultImportVar != ""){
        //   result.Error = true;
        //   result.data = resultImportVar;
        // }else{
          result.Error = false;
          result.data = "OK";
        // }
      }
      DevLogManagerObj.traceLog(DevManagerName, "Async Leave post importDevice");
      res.send(JSON.stringify(result));
      return;
    }
    if(req.query.Type == "CSV" || req.query.Type == "csv"){
      var writeFileDir = global.importPath + "/Dev";
      let resultDir = pubInter.recursiveMakeDir(writeFileDir);
      //写文件到临时目录
      let writeDevDir = global.importPath+ "/Dev/"  + files.DeviceInfo.name;
      // let readTagFile = fs.readFileSync(files.VarInfo.path);
      try {
        var readDevFile = fs.readFileSync(files.DeviceInfo.path);
      } catch (error) {
        result.Error = true;
        result.data = error.message;
        res.send(JSON.stringify(result));
        return;
      }
      // modified by  jinlong.feng at 0727 CSV导入编码兼容修改
      let fileutf8 = pubInter.decodeImportCsvFile(readDevFile);
      try {
        fs.writeFileSync(writeDevDir,fileutf8);
      } catch (error) {
        result.Error = true;
        result.data = error.message;
        res.send(JSON.stringify(result));
        return;
      }
      // end
      csv2Json()
          .fromFile(writeDevDir)
          .then(async (jsonObj)=>{
              var newjsonObj = JSON.stringify(jsonObj);

              // var TagList = new Array();
              // readTagFile = readTagFile.replace(/[\r]/g,"");
              // let objRow = readTagFile.split("\n");
              // for(var h = 0; h < objRow.length; h++){
              //   objRow[h] =  objRow[h].replace(/\"/g,"");
              // }
              // var arrField = [];
              // for (let i = 0; i < objRow.length; i++) {
              //   let arrRowData = objRow[i].split(",");
              //   let objTemp = {};
              //   if (i == 0) {
              //     arrField = arrRowData;
              //   } 
              //   else if (arrRowData[0] != ""){            
              //     for (let j = 0; j < arrRowData.length; j++) {
              //       objTemp[arrField[j]] = arrRowData[j];
              //     }
              //     TagList.push(objTemp);
              //   }
              // }
              var devPath = projectPath;
              var resultImportDev = await newDevice(devPath, jsonObj, req.query.DeviceGroup);
              if(resultImportDev != "OK"){
                result.Error = true;
                result.data = resultImportDev;
              }else{
                // var resultImportVar = newVariable(req.query.ProjectID, req.query.ProjectEdition, TagList);
                // if(resultImportVar != ""){
                //   result.Error = true;
                //   result.data = resultImportVar;
                // }else{
                  result.Error = false;
                  result.data = "OK";
                // }
              }
              res.send(JSON.stringify(result));
              DevLogManagerObj.traceLog(DevManagerName, "Async Leave post importDevice");
              pubInter.delFileAndDir(writeFileDir);
          })
          .error((reason) => {
            result.Error = true;
            result.data = "reason";
          })
    }
  })
  DevLogManagerObj.traceLog(DevManagerName, "Leave post importDevice");
})

//导入 新建 设备
async function newDevice(devPath, DeviceInfo, GroupName){
  DevLogManagerObj.traceLog(DevManagerName, "Enter function newDevice");
  //读取 设备组 json文件
  let projectDeviceGroupURL = devPath + '/DeviceGroupInfo.json';
  let deviceGroupStrJson = pubInter.readJson(projectDeviceGroupURL);
  if (deviceGroupStrJson.Error) {
   // res.send(deviceGroupStrJson.ErrorDesc);
    return deviceGroupStrJson.ErrorDesc;
  }  
  let deviceGroupObj = deviceGroupStrJson.data;
  /* let deviceGroupStrJson = fs.readFileSync(projectDeviceGroupURL, 'utf-8');
  let deviceGroupObj = JSON.parse(deviceGroupStrJson); */
  //读取 设备 json文件
  let projectDeviceURL = devPath + '/DeviceInfo.json';
  let deviceStrJson = pubInter.readJson(projectDeviceURL);
  if (deviceStrJson.Error) {
    //res.send(deviceStrJson.ErrorDesc);
    return deviceStrJson.ErrorDesc;
  }

  for(let i = 0; i < DeviceInfo.length; i++) {
    let t_Name = DeviceInfo[i].DeviceName;
    for(let j = 0; j < DeviceInfo.length; j++) {
      if(j == i) continue;
      else if(t_Name == DeviceInfo[j].DeviceName) {
        let ErrorDesc = "失败，文件中含有名称重复设备，请修改！";
        return ErrorDesc;
      }
    }
  }
  
  let deviceObj = deviceStrJson.data;
   /*let deviceStrJson = fs.readFileSync(projectDeviceURL, 'utf-8'); 
  let deviceObj = JSON.parse(deviceStrJson);*/
  //读取 链路 json文件
  let linkData;
  if( global.productType == 2 ){
    var linkDataURL = devPath + '/CollectChannelInfo.json';
    let linkJSON = pubInter.readJson( linkDataURL );
    if( linkJSON.Error == false){
      linkData = linkJSON.data.CollectChannelList;
    }else{
      console.log(linkJSON.ErrorDesc);
      //res.send(linkJSON.ErrorDesc);
      return linkJSON.ErrorDesc;
    }
  }

  //add by tingting.wang 单链路多设备校验
  var checkRet = singleLinkMulDevCheck(deviceObj, DeviceInfo);
  if( checkRet.Error == true){
    return checkRet.data;
  }
  //add end by tingting.wang
  //add by tingting.wang  生成设备ID
  //设备id递增
  var largestNum = 0;
  largestNum = pubInter.generateDeviceID(deviceObj);
  //md by tingting.wang  屏蔽当前生成设备ID的规则
  // for(var k = 0; k < deviceObj.DeviceList.length; k++){
  //   if(Number(deviceObj.DeviceList[k].DeviceID) > largestNum){
  //     largestNum = Number(deviceObj.DeviceList[k].DeviceID);
  //   }
  // }
  //md end by tingting.wang
  //迭代写 设备组
  function recursionDeviceAdd(groupListArr, parentGroupName, deviceID, deviceName){//------------------------------需要校验组名重复情况
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupName == parentGroupName ){
        var newGroupObj = new Object();
        newGroupObj.DeviceID = deviceID;
        newGroupObj.DeviceName = deviceName;
        if(groupListArr[i].DeviceObjectList){
          groupListArr[i].DeviceObjectList.push(newGroupObj);
        }
        else{
          groupListArr[i].DeviceObjectList = [];
          groupListArr[i].DeviceObjectList.push(newGroupObj);
        }
        return "OK";//只有一个同名的组名
      }else if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
        if(recursionDeviceAdd(groupListArr[i].DeviceObjectList, parentGroupName, deviceID, deviceName) == "OK"){
          return "OK";
        }
      }
    }
    return "Not found";
  }

  // modified by  jinlong.feng at 0727 设备导入组存在性校验
  function isDeviceGroupExist(groupListArr, groupName){
    if(groupName == "设备"){
      return true;
    }
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupName == groupName){
        return true;
      }
      if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
        if(isDeviceGroupExist(groupListArr[i].DeviceObjectList, groupName)){
          return true;
        }
      }
    }
    return false;
  }
  // end
  
  let subDatas = DeviceInfo;
  let ErrorInfo = "";
  var newDriverVersion;
  // modified by  jinlong.feng at 0727 设备导入组存在性校验
  let missingDeviceGroupSet = new Set();
  for(var groupCheckIndex = 0; groupCheckIndex < subDatas.length; groupCheckIndex++){
    let checkDeviceGroup = subDatas[groupCheckIndex].DeviceGroup;
    if(checkDeviceGroup === undefined || checkDeviceGroup === ""){
      checkDeviceGroup = GroupName;
    }
    if(checkDeviceGroup === undefined || checkDeviceGroup === ""){
      checkDeviceGroup = "设备";
    }
    subDatas[groupCheckIndex].DeviceGroup = checkDeviceGroup;
    if(!isDeviceGroupExist(deviceGroupObj.DeviceGroupList, checkDeviceGroup)){
      missingDeviceGroupSet.add(checkDeviceGroup);
    }
  }
  if(missingDeviceGroupSet.size > 0){
    return "设备组不存在：" + Array.from(missingDeviceGroupSet).join("、") + "，请先创建设备组或修改导入文件";
  }
  // end
  //写设备(每个设备只校验首个错误，且只要有错误即不会导入)
  //只做校验
  for(var i = 0; i < subDatas.length; i++){
    let newDeviceObj = subDatas[i];
    let newDeviceName = subDatas[i].DeviceName;
    let newDeviceAddress = subDatas[i].DevAddress;
    let newDeviceSeries = subDatas[i].DriverSeries;
    let newDeviceSysPlatForm = subDatas[i].SystemPlatform;
    let newDeviceProvider = subDatas[i].DeviceProvider;
    let newDeviceDriver = subDatas[i].DriverName;
    let newDeviceOsType = subDatas[i].OsType;
    newDriverVersion = subDatas[i].DriverVersion;
    // let newDeviceCompany = subDatas[i].SystemPlatform;
    if(newDeviceName == "" || newDeviceName == undefined){
      ErrorInfo += "\n 第" + i + "个设备的设备名称异常";
      continue;
    }
    if(/[^\w\u4e00-\u9fa5]+/g.test(newDeviceName)){
      ErrorInfo += "\n 第" + i + "个设备的设备名称含有非法字符";
      continue;
    }
    //设备名称其他校验---------------------------------------------
    //设备名称重复校验
    var checkNameRepeat = false;
    for(var m = 0; m < deviceObj.DeviceList.length; m++){
      if(deviceObj.DeviceList[m].DeviceName == newDeviceName){
        checkNameRepeat = true;
        break;
      }
    }
    if(checkNameRepeat == true){
      ErrorInfo += "\n" + newDeviceName + " 设备名称重复";
      continue;
    }
    //add by tingting.wang 最大重连时间校验
    let MaxReconncetInterval = subDatas[i].MaxReconncetInterval;
    if(Number(MaxReconncetInterval) <0 || Number(MaxReconncetInterval) > 604800000) //7天
    {
      ErrorInfo += "\n" + newDeviceName + "最大重连时间(MaxReconncetInterval)范围为0-604800000";
      continue;
    }
    //add end by tingting.wang
    //校验设备选择的链路信息 是否合适
    // var linFlag = [false];
    // var LinkDevID = [];
    var linikObj = {};
    linikObj.linFlag = false;
    if( global.productType == 2){
      var devLink = checkDevLinkInfo(linkData, newDeviceObj, linikObj);
      if( devLink.err == true){
        res.send(devLink.des);
        ErrorInfo += "\n" + newDeviceName + devLink.des;
        continue;
      }
    }
    //设备地址校验
    //设置xml地址
    var relativePath =  "../Driver/" + newDeviceSysPlatForm + "/" + newDeviceOsType + "/" +  newDeviceProvider + "/" + newDeviceDriver + "/" + newDriverVersion + "/" + newDeviceDriver + ".xml";
    if(newDriverVersion == "66.1.1.1"){
      var relativePathSO =  "../Driver/" + newDeviceSysPlatForm + "/" + newDeviceOsType + "/" +  newDeviceProvider + "/" + newDeviceDriver  + "/" + newDriverVersion + "/lib" + newDeviceDriver + ".so";
    }else{
      var relativePathSO =  "../Driver/" + newDeviceSysPlatForm + "/" + newDeviceOsType + "/" +  newDeviceProvider + "/" + newDeviceDriver  + "/" + newDriverVersion + "/lib" + newDeviceDriver + ".so." + newDriverVersion;
    }
    //var relativePathSO =  "../Driver/" + newDeviceSysPlatForm + "/" +  newDeviceProvider + "/" + newDeviceDriver  + "/" + newDriverVersion + "/lib" + newDeviceDriver + ".so." + newDriverVersion;
    if( newDeviceOsType == "Windows"){
      relativePathSO =  "../Driver/" + newDeviceSysPlatForm + "/" + newDeviceOsType + "/" +  newDeviceProvider + "/" + newDeviceDriver + "/" + newDriverVersion + "/" + newDeviceDriver + ".dll";
    }
    
    var xmlPath = path.resolve(__dirname,relativePath);
    var soPath = path.resolve(__dirname,relativePathSO);
    var driverPath = path.resolve(__dirname, "../Driver/DriverInfo.json");
    var depenfiles = checkDriverDepends(driverPath, newDeviceDriver, newDeviceSysPlatForm, newDeviceOsType, newDeviceProvider,newDriverVersion);
    if(depenfiles.error){
      ErrorInfo += "\n" + newDeviceName + depenfiles.info;
      continue;
    }
    //获取该设备是否需要校验
    let objReadDriver = pubInter.readJson(driverPath);
    if (objReadDriver.Error) {
      ErrorInfo += "\n" + objReadDriver.ErrorDesc;
      continue;
    }
    let objFind = objReadDriver.data.DriverList.find(function (driver) {
      return driver.DriverName == newDeviceDriver;
    })
    if (objFind == undefined) {
      ErrorInfo += "\n驱动" + newDeviceDriver + "不存在";
      continue;
    }
    // subDatas[i].isConfig = (objFind.DriverDevelopmentVersion === 3) ? false : true;//260413 gxx

    var xmlPathCheck = fs.existsSync(xmlPath);
    var soPathCheck = fs.existsSync(soPath);
    if(!xmlPathCheck || !soPathCheck){
      ErrorInfo += "\n" + newDeviceName + " 未找到驱动文件，错误的驱动路径";
      continue;
    }
    //var resultNew = driverConfig.getConfigModuleObject();
    //driverConfig.setXmlPath(xmlPath);
    //设置参数
    var deviceAddrInfoObj = new Object();
    var errorInfoObj = new Object();
    //20241224
    let oldDevAddress = newDeviceAddress;
    let newDevAddress = "";
    let specialChars = [':', '/', '|', '_', ','];
    for(let i=0;i<oldDevAddress.length;i++) {
      let c = oldDevAddress[i];
      // if(c == ':' || c == "/" || c == "|" || c == "_") {
      if(specialChars.indexOf(c) != -1){
        newDevAddress += " ";
      } else {
        newDevAddress += c;
      }
    }

    newDevAddress = newDeviceOsType == 'Windows'?newDevAddress:oldDevAddress;


    //20241224
    let tDriverSeries = newDeviceSeries;
    //20240118 适配括号
    let converDriverSeries = "";
    for(let j=0; j<tDriverSeries.length; j++) {
      let e = tDriverSeries[j];
      if(e == "(") {
        converDriverSeries += "LB";
      } else if (e == ")") {
        converDriverSeries += "RB";
      } else {

        converDriverSeries += e;
      }
    }
    //20250901 适配校验模块 js化
    //var checkResult = driverConfig.getDeviceInfo(newDevAddress, deviceAddrInfoObj, errorInfoObj, converDriverSeries, newDeviceDriver);
    //var resultDel = driverConfig.releaseConfigModuleObject();
    var ruseltObj = {};
    var errcode = { "value": 0 };
    var devaddr = { "nDevAddr": -1, "sDevAddr": "" };
    let rett = driverConfig.LoadXmlFile(errcode, xmlPath, newDeviceDriver, converDriverSeries);
    if(!rett) {
      ruseltObj.err = true;
      ruseltObj.des = "设备地址校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value];
      return ruseltObj;
    }
    var checkResult = driverConfig.checkUserDevAddr(errcode, newDevAddress, devaddr, newDeviceDriver, converDriverSeries);
    if(!checkResult) {    
      ruseltObj.err = true;
      ruseltObj.des = "设备地址校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value];
      return ruseltObj;
    }    
    let ret = await KingConfigModuleJs.isStringFormat(xmlPath, newDeviceDriver, true, converDriverSeries);
    if(!ret.isString) { 
      if(!checkResult){
        var errDesc = "";
        for(var param in objConfigErrMsg){
          if(param == errorInfoObj.nErrCode){
            errDesc = objConfigErrMsg[param];
          }
        }
        ErrorInfo += "\n" + newDeviceName + "设备地址校验失败，错误码：" + errorInfoObj.nErrCode + " " + errDesc;
        continue;
      }
    }
    
    //驱动文件复制
    let projectDriverURL = devPath + '/Driver';
    if(!fs.existsSync(projectDriverURL)){
      ErrorInfo += "\n" + newDeviceName + "未找到工程驱动路径" ;
      continue;
    }
    //修改文件列表
    let projectFileList = devPath + '/ProjectFileList.json';
    if(!fs.existsSync(projectFileList)){
      ErrorInfo += "\n" + newDeviceName + "未找到工程文件列表文件" ;
      continue;
    }
  }
  if(ErrorInfo == ""){
    //文件操作
    for(var i = 0; i < subDatas.length; i++){
      let newDriverVersion = subDatas[i].DriverVersion;//20230523 
      let newDeviceObj = subDatas[i];
      //number类型的属性
      let numberPropList = ['Active','LinkType','SerialBaudRate','SerialParity','SerialDataBits','SerialStopBits','Timeout','FrequencyControlMode',
      'ReconnectInterval','MaxReconncetInterval','DeviceCollectTime','RedundancyStyle'];
      for(var prompt in newDeviceObj){
        if(numberPropList.indexOf(prompt) != -1){
          newDeviceObj[prompt] = Number(newDeviceObj[prompt]);
        }
      }
      if(typeof newDeviceObj.FrequencySwitchCondition != "object" && global.productType == 1){
        newDeviceObj.FrequencySwitchCondition = JSON.parse(newDeviceObj.FrequencySwitchCondition);
      }
      
      let newDeviceName = subDatas[i].DeviceName;
      let newDeviceAddress = subDatas[i].DevAddress;
      let newDeviceDriver = subDatas[i].DriverName;
      let newDeviceProvider = subDatas[i].DeviceProvider;
      let newDeviceSeries = subDatas[i].DriverSeries;
      let newDeviceSysPlatForm = subDatas[i].SystemPlatform;
      let newDeviceOsType = subDatas[i].OsType;
      //设备地址校验
      //设置xml地址
      var relativePath =  "../Driver/" + newDeviceSysPlatForm + "/" + newDeviceOsType + "/" + newDeviceProvider + "/" + newDeviceDriver + "/" + newDriverVersion + "/" + newDeviceDriver + ".xml";
      var relativePathSO =  "../Driver/" + newDeviceSysPlatForm + "/" + newDeviceOsType + "/" +  newDeviceProvider + "/" + newDeviceDriver + "/" + newDriverVersion + "/lib" + newDeviceDriver + ".so";
      if( newDeviceSysPlatForm == "Windows"){
        relativePathSO =  "../Driver/" + newDeviceSysPlatForm + "/" + newDeviceOsType + "/" +  newDeviceProvider + "/" + newDeviceDriver + "/" + newDeviceDriver + ".dll";
      }
      var xmlPath = path.resolve(__dirname,relativePath);
      var soPath = path.resolve(__dirname,relativePathSO);
      //var resultNew = driverConfig.getConfigModuleObject();
      //driverConfig.setXmlPath(xmlPath);
      //设置参数
      var deviceAddrInfoObj = new Object();
      var errorInfoObj = new Object();
      //20241224
      let oldDevAddress = newDeviceAddress;
      let newDevAddress = "";
      let specialChars = [':', '/', '|', '_', ','];
      for(let i=0;i<oldDevAddress.length;i++) {
        let c = oldDevAddress[i];
        // if(c == ':' || c == "/" || c == "|" || c == "_") {
        if(specialChars.indexOf(c) != -1){
          newDevAddress += " ";
        } else {
          newDevAddress += c;
        }
      }
      newDevAddress = newDeviceOsType =='Windows'?newDevAddress:oldDevAddress;
      //20241224
      let tDriverSeries = newDeviceSeries;
      //20240118 适配括号
      let converDriverSeries = "";
      for(let j=0; j<tDriverSeries.length; j++) {
        let e = tDriverSeries[j];
        if(e == "(") {
          converDriverSeries += "LB";
        } else if (e == ")") {
          converDriverSeries += "RB";
        } else {

          converDriverSeries += e;
        }
      }
      //20250901 适配校验 js化
      //var checkResult = driverConfig.getDeviceInfo(newDevAddress, deviceAddrInfoObj, errorInfoObj, converDriverSeries, newDeviceDriver);
      //var resultDel = driverConfig.releaseConfigModuleObject();
      var errcode = { "value": 0 };
      var devaddr = { "nDevAddr": -1, "sDevAddr": "" };
      var ret = driverConfig.LoadXmlFile(errcode, xmlPath, newDeviceDriver, converDriverSeries);
      if(!ret) {
        ruseltObj.err = true;
        ruseltObj.des = "设备地址校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value];
        return ruseltObj;
      }
      var checkResult = driverConfig.checkUserDevAddr(errcode, newDevAddress, devaddr, newDeviceDriver, converDriverSeries);
      if(!checkResult) {    
        ruseltObj.err = true;
        ruseltObj.des = "设备地址校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value];
        return ruseltObj;
      }   
      deviceAddrInfoObj.nDevAddr = devaddr.nDevAddr;
      //!20250901
      newDeviceObj.DevNumber = deviceAddrInfoObj.nDevAddr;
      newDeviceObj.DeviceID = largestNum++;//md by tingting.wang 导入设备时，需对返回的设备ID每次进行后置+1处理
      //驱动文件复制
      var copyDrivePath = global.drivePath + "/" + newDeviceObj.SystemPlatform + "/" + newDeviceObj.OsType+ "/" + newDeviceObj.DeviceProvider + "/" + newDeviceObj.DriverName + "/" + newDriverVersion;//260413 gxx
      // copyDriverAndModfiyFileList(copyDrivePath, devPath, newDeviceObj);
      copyDriverAndModfiyFileListNew(copyDrivePath, devPath, newDeviceObj, newDeviceOsType);

      // modified by  jinlong.feng at 0714 设备无法导入到组问题
      let targetDeviceGroup = newDeviceObj.DeviceGroup;
      if (targetDeviceGroup === undefined || targetDeviceGroup === "") {
        targetDeviceGroup = GroupName;
      }
      newDeviceObj.DeviceGroup = targetDeviceGroup;
      //写设备组
      if (targetDeviceGroup == "设备") {
        var newGroupObj = new Object();
        newGroupObj.DeviceID = newDeviceObj.DeviceID;
        newGroupObj.DeviceName = newDeviceName;
        deviceGroupObj.DeviceGroupList.push(newGroupObj);
      } else {
        if(recursionDeviceAdd(deviceGroupObj.DeviceGroupList, targetDeviceGroup, newDeviceObj.DeviceID, newDeviceName) != "OK"){
          return "设备组不存在：" + targetDeviceGroup + "，请先创建设备组或修改导入文件";
        }
      }
      // end
      //var writeDevGroupStr = JSON.stringify(deviceGroupObj, "", "\t");
      let strWrite = pubInter.writeJson(projectDeviceGroupURL, deviceGroupObj);
      if (strWrite != "OK") {
        return strWrite;
      }
      //fs.writeFileSync(projectDeviceGroupURL,writeDevGroupStr);
      deviceObj.DeviceList.push(newDeviceObj);

      //新建系统变量
      let projectVarURL = devPath + '/VarInfo.json';
      if(!fs.existsSync(projectVarURL)){
        DevLogManagerObj.traceLog(DevManagerName, "Leave function newDevice");
        return "未找到工程变量文件";
      }
      let varStrJson = pubInter.readJson(projectVarURL);
      if (varStrJson.Error) {
        return varStrJson.ErrorDesc;
      }
      let varObj = varStrJson.data;
      /* let varStrJson = fs.readFileSync(projectVarURL, 'utf-8');
      let varObj = JSON.parse(varStrJson); */

      var maxTagID = 0;
      var maxTagID1 = 0;
      var maxTagID2 = 0;
      for(var m = 0; m < varObj.TagList.length; m++){
        if(maxTagID1 < varObj.TagList[m].TagID){
          maxTagID1 = varObj.TagList[m].TagID;
        }
      }
      for(var m = 0; m < varObj.OPCVAR.length; m++){
        if(maxTagID2 < varObj.OPCVAR[m].TagID){
          if (global.productType == 2 && varObj.OPCVAR[m].TagType == KVIO_TAG_TYPE_USER) {
            continue;
          }
          maxTagID2 = varObj.OPCVAR[m].TagID;
        }
      }
      maxTagID = Math.max(maxTagID1, maxTagID2);
      var varStateName = new Object();
      varStateName = JSON.parse(JSON.stringify(systemTagTemplate));
      varStateName.TagName = "$DeviceStatusOf" + newDeviceName;
      varStateName.DeviceID = newDeviceObj.DeviceID ;
      varStateName.DeviceName = newDeviceName;
      varStateName.TagGroup = "root"//"变量";
      varStateName.TagType = 0;
      varStateName.TagDataType = 4;
      varStateName.AccessType = 2;
      varStateName.TagID = maxTagID + 1;

      var varControlName = new Object();
      varControlName = JSON.parse(JSON.stringify(systemTagTemplate));
      varControlName.TagName = "$DeviceControlOf" + newDeviceName;
      varControlName.DeviceID = newDeviceObj.DeviceID ;
      varControlName.DeviceName = newDeviceName;
      varControlName.TagGroup = "root"//"变量";
      varControlName.TagType = 0;
      varControlName.TagDataType = 4;
      varControlName.AccessType = 0;
      varControlName.TagID = maxTagID + 2;
      
      var varFrequencyName = new Object();
      varFrequencyName = JSON.parse(JSON.stringify(systemTagTemplate));
      varFrequencyName.TagName = "$FrequencyValueOf" + newDeviceName;
      varFrequencyName.DeviceID = newDeviceObj.DeviceID ;
      varFrequencyName.DeviceName = newDeviceName;
      varFrequencyName.TagGroup = "root"//"变量";
      varFrequencyName.TagType = 0;
      varFrequencyName.TagDataType = 128;
      varFrequencyName.AccessType = 0;
      varFrequencyName.TagID = maxTagID + 3;

      // modified by  jinlong.feng at 0723 导入设备Windows不生成系统变量
      if (newDeviceOsType != "Windows") {
        varObj.TagList.push(varStateName);
        varObj.TagList.push(varControlName);
        varObj.TagList.push(varFrequencyName);
      }
      // end
      var writeVarStr = JSON.stringify(varObj, "", "\t");
      try{
        fs.writeFileSync(projectVarURL,writeVarStr);
      } catch (error) {
        DevLogManagerObj.traceLog(DevManagerName, "Leave function newDevice");
        return ("写变量文件失败" + error);
      }

      //将新建设备的链路信息写入到 链路配置文件
      if( global.productType == 2){
        var linikObj = {};
        linikObj.linFlag = false;
        if( global.productType == 2){
          var devLink = checkDevLinkInfo(linkData, newDeviceObj, linikObj);
          if( devLink.err == true){
            //res.send(devLink.des);
            return devLink.des;
          }
        }
        var linkID = 0
        for(var g = 0; g < linkData.length; g++){
          if(Number(linkData[g].ChannelID) > linkID){
            linkID = Number(linkData[g].ChannelID);
          }
        }
        
        if( linikObj.linFlag == false){//该链路不存在
          var temLink = {};
          temLink.ChannelID = linkID + 1;
          if( newDeviceObj.LinkType == 1){
            temLink.ChannelName = newDeviceObj.SerialName;
            temLink.ChannelType = 1;
            temLink.SerialBaudRate = parseInt(newDeviceObj.SerialBaudRate);
            temLink.SerialDataBits = parseInt(newDeviceObj.SerialDataBits);
            temLink.SerialStopBits = parseInt(newDeviceObj.SerialStopBits);
            temLink.SerialParity = parseInt(newDeviceObj.SerialParity);
            temLink.StreamControl = parseInt(newDeviceObj.StreamControl);
            temLink.SerialName = newDeviceObj.SerialName;
          }else{
            temLink.ChannelName = newDeviceObj.LinkIP;
            temLink.ChannelType = 2;
            temLink.SerialBaudRate = 1200;//默认
            temLink.SerialDataBits = 7;//默认
            temLink.SerialStopBits = 1;//默认
            temLink.SerialParity = 1;//默认
            
            temLink.SerialName = "COM1";//默认
          }
          temLink.StreamControl = 0;//默认
          temLink.ChannelDescription = "";
          temLink.ChannelDriver = newDeviceObj.DriverName;    
          temLink.ChannelUnable = 1;
          temLink.InitTimeOut = 3000;
          temLink.CommunicationTimeOut = 3000;
          temLink.CLSID = newDeviceObj.CLSID;
          temLink.UaServerEndpointUrl = "";
          temLink.MachineName = "";
          temLink.DevIDArr = [newDeviceObj.DeviceID],

          linkData.push(temLink);
        }else{
            for( var h=0;h<linkData.length;h++){
              if( linikObj.LinkDevID == linkData[h].ChannelID){
                linkData[h].DevIDArr.push(newDeviceObj.DeviceID);
              }
            }
        }
        var lastObj = {};
        lastObj.CollectChannelList = linkData;
        let strWriteChannel = pubInter.writeJson(devPath + '/CollectChannelInfo.json', lastObj);
        if (strWriteChannel != "OK") {
          return strWriteChannel;
        }
        //fs.writeFileSync(devPath + '/CollectChannelInfo.json',JSON.stringify(lastObj, "", "\t"));
      }
    }
    //写设备列表文件
    /* var writeDevStr = JSON.stringify(deviceObj, "", "\t");
    fs.writeFileSync(projectDeviceURL,writeDevStr); */
    let strWrDev = pubInter.writeJson(projectDeviceURL, deviceObj);
    if (strWrDev != "OK") {
      return strWrDev;
    }
    DevLogManagerObj.traceLog(DevManagerName, "Leave function newDevice");

    return "OK";
  }else{
    DevLogManagerObj.traceLog(DevManagerName, "Leave function newDevice");
    return ErrorInfo;
  }
}

//导入 新建 变量
function newVariable(strProjectID, strProjectVersion, TagList){
  DevLogManagerObj.traceLog(DevManagerName, "Enter function newVariable");
    //读取变量信息
    var strProVarPath = global.sdbPath + getUrl(strProjectID, strProjectVersion) + "/VarInfo.json";
    if(!fs.existsSync(strProVarPath)){
      var resultInfo = "未找到变量文件";
      return resultInfo;
    }
    let objVarJson = pubInter.readJson(strProVarPath);
    if (objVarJson.Error) {
      res.send(objVarJson.ErrorDesc);
      return;
    }
    var objVarData = objVarJson.data;
    //var objVarData = JSON.parse(fs.readFileSync(strProVarPath, 'utf-8'));
    //生成新的变量ID
    let nTagLen = objVarData.TagList.length;
    var nVarID = 1;
    if (nTagLen > 0 && objVarData.TagList[nTagLen - 1].TagID != undefined) {
      nVarID = objVarData.TagList[nTagLen - 1].TagID + 1;
    }
   
    //读取设备信息
    let strDevPath = global.sdbPath + getUrl(strProjectID, strProjectVersion) + "/DeviceInfo.json";
    if(!fs.existsSync(strDevPath)){
      var resultInfo = "未找到设备文件";
      return resultInfo;
    }
    let objDevJson = pubInter.readJson(strDevPath);
    if (objDevJson.Error) {
      res.send(objDevJson.ErrorDesc);
      return;
    }
    var objDevInfo = objDevJson.data;
    //var objDevInfo = JSON.parse(fs.readFileSync(strDevPath, 'utf-8'));;

    //读取变量组信息
    // let strVarGroupPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/VarGroupInfo.json";
    // if(!fs.existsSync(strVarGroupPath)){
    //   var resultInfo = "未找到变量组文件";
    //   return resultInfo;
    // }
    // var objTagGroupInfo = JSON.parse(fs.readFileSync(strVarGroupPath, 'utf-8'));;

    var strErrOut = "";
    //导入文件应有的字段
    var arrRequiredField = ["TagName","Description","TagGroup", "DeviceName","TagDataType","TagConvertDataType",
    "RegName","RegAddress","AccessType","CollectTimeInterval","DataConvertType","MaxRawValue","MinRawValue",
    "MaxValue","MinValue","NonLinearName","DataCleaningType","DataCleaningUpperLimit","DataCleaningLowerLimit",
    "ChangeRate","DeadbandRate","TagType","DeviceID","DriverName"];
    for (let i = 0; i < TagList.length; i++) {
      //检查字段是否齐全
      var checkField = true;
      for (let j = 0; j < arrRequiredField.length; j++) {
        var listObj = TagList[i];
        var listName = arrRequiredField[j];
        var propName = listObj[listName];
        var tagname = listObj.TagName;
        // for(var ii in listObj){
        //   console.log(ii);
        // }
        if (TagList[i][arrRequiredField[j]] == undefined && typeof(TagList[i][arrRequiredField[j]]) == "undefined") {
          strErrOut += TagList[i].TagName + ",";
          console.log(TagList[i].TagName + "字段不全，缺少" + arrRequiredField[j]);
          checkField = false;
          continue;
        }
        //将某些字段的字符串转化为数字
        else if (arrRequiredField[j] != "TagName" && arrRequiredField[j] != "Description" && arrRequiredField[j] != "DeviceName" && 
        arrRequiredField[j] != "TagGroup" && arrRequiredField[j] != "RegName" && arrRequiredField[j] != "RegAddress" && 
        arrRequiredField[j] != "NonLinearName" && arrRequiredField[j] != "DriverName" && 
        typeof TagList[i][arrRequiredField[j]] == "string") {
          TagList[i][arrRequiredField[j]] = Number(TagList[i][arrRequiredField[j]]);
        }
      }
      if(checkField == false){
        continue;
      }
      //检查是否有重名
      var objFindDup = objVarData.TagList.find(function (tag) {
        return tag.TagName == TagList[i].TagName;
      })
      if (objFindDup != undefined) {
        strErrOut += TagList[i].TagName + ",";
        console.log("变量" + TagList[i].TagName + "已经存在");
        continue;
      }
      //检查导入变量的所属设备和驱动是否存在
      let strDriverName = TagList[i].DriverName;
      let strDeviceName = TagList[i].DeviceName;
      var objFIndDev = objDevInfo.DeviceList.find(function (dev) {
        return (dev.DeviceName == strDeviceName );
      })
      if (objFIndDev == undefined) {
        strErrOut += TagList[i].TagName + ",";
        console.log(TagList[i].TagName + "的设备不存在");
        continue;
      }
      //检查非系统变量的驱动文件是否存在
      if(TagList[i].TagType == 2){
        let strDriverXmlPath = global.sdbPath + getUrl(strProjectID, strProjectVersion) + "/Driver/" + strDriverName + ".xml";
        let strDriverSoPath = global.sdbPath + getUrl(strProjectID, strProjectVersion) + "/Driver/lib" + strDriverName + ".so";
        if (!fs.existsSync(strDriverXmlPath) || !fs.existsSync(strDriverSoPath) ) {
          strErrOut += TagList[i].TagName + "的驱动文件不存在,";
          console.log(strDriverName + "的驱动文件不存在" )
          continue;
        }
      }
      
      //对该变量进行校验
      // driverConfig.getConfigModuleObject();
      // driverConfig.setXmlPath(strDriverXmlPath);
      // //第一个参数
      // var objDbItem = {};
      // objDbItem.nAccessMode = TagList[i].AccessType;
      // objDbItem.nDataType = TagList[i].TagDataType;
      // objDbItem.reserved = new Array();
      // objDbItem.reserved[0] = 0;
      // objDbItem.reserved[1] = 0;
      // //第二个参数（传出参数）
      // var objPlcVar = {};
      // //第三个参数：错误码
      // var nErr = {};
      // objDbItem.szRegister = TagList[i].RegAddress;
      // objDbItem.szDevName = TagList[i].DeviceName;
      // let nRes = driverConfig.getVarInfo(objDbItem, objPlcVar, nErr, strDriverName, strDriverName);
      // driverConfig.releaseConfigModuleObject();
      // if (nRes == 0) {
      //   //校验失败
      //   strErrOut += TagList[i].TagName + ",";
      //   console,log("该变量(" + strTagName + ")校验失败，错误码：" + nErr.nErrCode);
      //   continue;
      // }

      TagList[i].TagID = nVarID + i;
      // TagList[i].VarPlcInfo = objPlcVar.nNo + ";" + objPlcVar.nSubType1 + ";" + objPlcVar.nSubType2 + ";" + 
      // TagList[i].RegName + ";" + objPlcVar.nRegType;
      TagList[i].TagGroup = "变量";
      objVarData.TagList.push(TagList[i]);
    }
    //var writeVarStr = JSON.stringify(objVarData, "", "\t");
    //fs.writeFileSync(strProVarPath,writeVarStr);
    let strWrVar = pubInter.writeJson(strProVarPath, objVarData);
    if (strWrVar != "OK") {
      strErrOut += strWrVar;
    }
    //delFileAndDir(writeDir);
    return strErrOut;
}

//在变量组中删除指定的变量
function deleteVarInGroup(groupListArr, strTagName, strTagID){
  DevLogManagerObj.traceLog(DevManagerName, "Enter function deleteVarInGroup");
  for(var i = 0; i < groupListArr.length; i++){
    if(groupListArr[i].TagID != undefined && groupListArr[i].TagName != undefined && groupListArr[i].TagID == strTagID 
      && groupListArr[i].TagName == strTagName){
        groupListArr.splice(i, 1);
        DevLogManagerObj.traceLog(DevManagerName, "Leave function deleteVarInGroup");
        return "OK";
    }else if(groupListArr[i].TagObjectList && groupListArr[i].TagObjectList.length != 0){
      var resAdd = deleteVarInGroup(groupListArr[i].TagObjectList, strTagName, strTagID);
      if (resAdd == "OK") {
        DevLogManagerObj.traceLog(DevManagerName, "Leave function deleteVarInGroup");
        return resAdd;
      }
    }
  }
  DevLogManagerObj.traceLog(DevManagerName, "Leave function deleteVarInGroup");
  return "Not found";
}

//移动 设备
router.post('/moveDevice',function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post moveDevice");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  req.query = pubInter.EscapeAllData(req.query);
  // modified by  jinlong.feng at 0722 移动设备到组问题
  const projectID = req.query.ProjectID || req.query.projectID;
  if (!projectID) {
    res.send("工程ID不能为空");
    return;
  }
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id);
  const tenantDir = projectGroupService.dataStore.tenantDir;
  var devPath = path.join(tenantDir, projectID, 'project');
  let deviceGroupObj;
  var projectDevicGroupURL = devPath + '/DeviceGroupInfo.json';
  let proDevGroupJSON = pubInter.readJson( projectDevicGroupURL );
  if( proDevGroupJSON.Error == false){
    deviceGroupObj = proDevGroupJSON.data;
  }else{
    console.log(proDevGroupJSON.ErrorDesc);
    res.send(proDevGroupJSON.ErrorDesc);
    return;
  }
  const moveRequestBody = pubInter.EscapeAllData(req.body || {});
  //修改设备文件
  let projectDevicURL = devPath + '/DeviceInfo.json';
  if(!fs.existsSync(projectDevicURL)){
    res.send("未找到设备文件");
    return;
  }
  let objDevJson = pubInter.readJson(projectDevicURL);
  if (objDevJson.Error) {
    res.send(objDevJson.ErrorDesc);
    return;
  }
  let deviceObj = objDevJson.data;
  if (!deviceObj.DeviceList || !Array.isArray(deviceObj.DeviceList)) {
    res.send("设备文件格式错误");
    return;
  }

  /**
   * @function parseMoveDeviceJson
   * @description 解析移动设备接口中可能为JSON字符串的入参字段
   * @param {Array|string} requestData 移动设备入参字段
   * @returns {Array|string|null} 解析后的入参字段，解析失败返回null
   */
  function parseMoveDeviceJson(requestData) {
    if (typeof(requestData) != "string") return requestData;
    try {
      return JSON.parse(requestData);
    } catch (error) {
      return null;
    }
  }

  /**
   * @function isRootDeviceGroup
   * @description 判断设备组ID或名称是否表示根设备组
   * @param {string|number} deviceGroupValue 设备组ID或名称
   * @returns {boolean} 是否为根设备组
   */
  function isRootDeviceGroup(deviceGroupValue) {
    return ["-1", "0", "root", "deviceRoot", "设备", "数采设备"].indexOf(String(deviceGroupValue)) != -1;
  }

  /**
   * @function findDeviceGroupById
   * @description 根据设备组ID从设备组树中查找设备组
   * @param {Array} groupListArr 设备组树节点列表
   * @param {string|number} deviceGroupID 设备组ID
   * @returns {Object|null} 匹配到的设备组节点，未匹配返回null
   */
  function findDeviceGroupById(groupListArr, deviceGroupID) {
    if (!Array.isArray(groupListArr)) return null;
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupID != undefined && String(groupListArr[i].DeviceGroupID) == String(deviceGroupID)){
        return groupListArr[i];
      }
      var matchedGroup = findDeviceGroupById(groupListArr[i].DeviceObjectList, deviceGroupID);
      if(matchedGroup) return matchedGroup;
    }
    return null;
  }

  /**
   * @function findDeviceGroupByName
   * @description 根据设备组名称从设备组树中查找设备组，兼容旧移动设备入参
   * @param {Array} groupListArr 设备组树节点列表
   * @param {string} deviceGroupName 设备组名称
   * @returns {Object|null} 匹配到的设备组节点，未匹配返回null
   */
  function findDeviceGroupByName(groupListArr, deviceGroupName) {
    if (!Array.isArray(groupListArr)) return null;
    for(var i = 0; i < groupListArr.length; i++){
      if(groupListArr[i].DeviceGroupName == deviceGroupName){
        return groupListArr[i];
      }
      var matchedGroup = findDeviceGroupByName(groupListArr[i].DeviceObjectList, deviceGroupName);
      if(matchedGroup) return matchedGroup;
    }
    return null;
  }

  /**
   * @function findDeviceInfoById
   * @description 根据设备ID从设备列表中查找设备信息
   * @param {Array} deviceList 设备列表
   * @param {string|number} deviceID 设备ID
   * @returns {Object|null} 匹配到的设备信息，未匹配返回null
   */
  function findDeviceInfoById(deviceList, deviceID) {
    for(var i = 0; i < deviceList.length; i++){
      if(String(deviceList[i].DeviceID) == String(deviceID)){
        return deviceList[i];
      }
    }
    return null;
  }

  /**
   * @function removeDeviceFromGroupTree
   * @description 从整棵设备组树中删除设备引用
   * @param {Array} groupListArr 设备组树节点列表
   * @param {string|number} deviceID 设备ID
   * @returns {boolean} 是否删除成功
   */
  function removeDeviceFromGroupTree(groupListArr, deviceID) {
    if (!Array.isArray(groupListArr)) return false;
    var isRemoved = false;
    for(var i = groupListArr.length - 1; i >= 0; i--){
      if(groupListArr[i].DeviceID != undefined && String(groupListArr[i].DeviceID) == String(deviceID)){
        groupListArr.splice(i, 1);
        isRemoved = true;
        continue;
      }
      if(groupListArr[i].DeviceObjectList && groupListArr[i].DeviceObjectList.length != 0){
        var childRemoved = removeDeviceFromGroupTree(groupListArr[i].DeviceObjectList, deviceID);
        isRemoved = isRemoved || childRemoved;
      }
    }
    return isRemoved;
  }

  /**
   * @function addDeviceToTargetGroup
   * @description 将设备引用添加到目标设备组
   * @param {Array} targetDeviceList 目标设备组下的设备列表
   * @param {string|number} deviceID 设备ID
   * @param {string} deviceName 设备名称
   * @returns {void} 无返回值
   */
  function addDeviceToTargetGroup(targetDeviceList, deviceID, deviceName) {
    for(var i = 0; i < targetDeviceList.length; i++){
      if(targetDeviceList[i].DeviceID != undefined && String(targetDeviceList[i].DeviceID) == String(deviceID)){
        return;
      }
    }
    var newGroupObj = new Object();
    newGroupObj.DeviceID = deviceID;
    newGroupObj.DeviceName = deviceName;
    targetDeviceList.push(newGroupObj);
  }

  const requestDeviceIds = parseMoveDeviceJson(moveRequestBody.deviceIds || moveRequestBody.deviceIDs || moveRequestBody.DeviceIDs);
  const targetDeviceGroupIdArr = [
    moveRequestBody.targetDeviceGroupId,
    moveRequestBody.targetDeviceGroupID,
    moveRequestBody.DesDeviceGroupID,
    req.query.targetDeviceGroupId,
    req.query.targetDeviceGroupID,
    req.query.DesDeviceGroupID
  ];
  let targetDeviceGroupId;
  for (var targetDeviceGroupIndex = 0; targetDeviceGroupIndex < targetDeviceGroupIdArr.length; targetDeviceGroupIndex++) {
    if (targetDeviceGroupIdArr[targetDeviceGroupIndex] !== undefined && targetDeviceGroupIdArr[targetDeviceGroupIndex] !== "") {
      targetDeviceGroupId = targetDeviceGroupIdArr[targetDeviceGroupIndex];
      break;
    }
  }
  const isNewMoveDeviceParams = Array.isArray(requestDeviceIds) && targetDeviceGroupId !== undefined && targetDeviceGroupId !== "";
  let movDeviceArr = [];
  let targetDeviceGroupName = req.query.DesDeviceGroup;
  let targetDeviceObjectList = null;

  if (isNewMoveDeviceParams) {
    if (isRootDeviceGroup(targetDeviceGroupId)) {
      targetDeviceGroupName = "设备";
      targetDeviceObjectList = deviceGroupObj.DeviceGroupList;
    } else {
      const targetDeviceGroupNode = findDeviceGroupById(deviceGroupObj.DeviceGroupList, targetDeviceGroupId);
      if (!targetDeviceGroupNode) {
        res.send("目标设备组不存在:" + targetDeviceGroupId);
        return;
      }
      if (!targetDeviceGroupNode.DeviceObjectList) targetDeviceGroupNode.DeviceObjectList = [];
      targetDeviceGroupName = targetDeviceGroupNode.DeviceGroupName;
      targetDeviceObjectList = targetDeviceGroupNode.DeviceObjectList;
    }

    for(var s = 0; s < requestDeviceIds.length; s++){
      const deviceInfo = findDeviceInfoById(deviceObj.DeviceList, requestDeviceIds[s]);
      if (!deviceInfo) {
        res.send("设备不存在:" + requestDeviceIds[s]);
        return;
      }
      movDeviceArr.push({
        DeviceID: deviceInfo.DeviceID,
        DeviceName: deviceInfo.DeviceName,
        DeviceGroup: deviceInfo.DeviceGroup,
      });
    }
  } else {
    movDeviceArr = parseMoveDeviceJson(moveRequestBody.data);
    if (movDeviceArr == null) {
      res.send("移动设备参数错误");
      return;
    }
    if (!Array.isArray(movDeviceArr) || movDeviceArr.length == 0) {
      res.send("移动设备参数错误");
      return;
    }

    if (isRootDeviceGroup(targetDeviceGroupName)) {
      targetDeviceGroupName = "设备";
      targetDeviceObjectList = deviceGroupObj.DeviceGroupList;
    } else {
      const targetDeviceGroupNode = findDeviceGroupByName(deviceGroupObj.DeviceGroupList, targetDeviceGroupName);
      if (!targetDeviceGroupNode) {
        res.send("目标设备组不存在:" + targetDeviceGroupName);
        return;
      }
      if (!targetDeviceGroupNode.DeviceObjectList) targetDeviceGroupNode.DeviceObjectList = [];
      targetDeviceObjectList = targetDeviceGroupNode.DeviceObjectList;
    }

    for(var s = 0; s < movDeviceArr.length; s++){
      const deviceInfo = findDeviceInfoById(deviceObj.DeviceList, movDeviceArr[s].DeviceID);
      if (!deviceInfo) {
        res.send("设备不存在:" + movDeviceArr[s].DeviceName);
        return;
      }
      movDeviceArr[s].DeviceName = movDeviceArr[s].DeviceName || deviceInfo.DeviceName;
      movDeviceArr[s].DeviceGroup = movDeviceArr[s].DeviceGroup || deviceInfo.DeviceGroup;
    }
  }

  const movedDeviceIdSet = new Set();
  for(var s = 0; s < movDeviceArr.length; s++){
    const normalizedDeviceID = String(movDeviceArr[s].DeviceID);
    if (movedDeviceIdSet.has(normalizedDeviceID)) continue;
    movedDeviceIdSet.add(normalizedDeviceID);
    const removeDeviceResult = removeDeviceFromGroupTree(deviceGroupObj.DeviceGroupList, movDeviceArr[s].DeviceID);
    if (!removeDeviceResult) {
      res.send("原设备组中未找到设备:" + movDeviceArr[s].DeviceName);
      return;
    }
    addDeviceToTargetGroup(targetDeviceObjectList, movDeviceArr[s].DeviceID, movDeviceArr[s].DeviceName);
    const deviceInfo = findDeviceInfoById(deviceObj.DeviceList, movDeviceArr[s].DeviceID);
    deviceInfo.DeviceGroup = targetDeviceGroupName;
  }

  var writeDevGroupStr = JSON.stringify(deviceGroupObj, "", "\t");
  try{
    fs.writeFileSync(projectDevicGroupURL,writeDevGroupStr);
  } catch (error) {
    res.send("写设备组文件失败" + error);
    return;
  }
  var writeDevStr = JSON.stringify(deviceObj, "", "\t");
  try{
    fs.writeFileSync(projectDevicURL,writeDevStr);
  } catch (error) {
    res.send("写设备文件失败" + error);
    return;
  }
  // end
  DevLogManagerObj.traceLog(DevManagerName, "Leave post moveDevice");
  res.send("OK");
})

//获取驱动依赖文件
function checkDriverDepends(url, driverName, SysPlatform, deviceOsType, deviceProvider,DriverVersion){
  DevLogManagerObj.traceLog(DevManagerName, "Enter function checkDriverDepends");
  var returnObj = new Object();
  returnObj.error = false;
  returnObj.info = ""
  if(!fs.existsSync(url)){
    returnObj.error = true;
    returnObj.info = "路径错误或不存在";
    DevLogManagerObj.traceLog(DevManagerName, "Leave function checkDriverDepends");
    return returnObj;
  }
  if(driverName == undefined || SysPlatform  == undefined || deviceProvider == undefined || deviceOsType == undefined){
    returnObj.error = true;
    returnObj.info = "驱动名称、运行系统、设备厂商或操作系统参数未定义";
    DevLogManagerObj.traceLog(DevManagerName, "Leave function checkDriverDepends");
    return returnObj;
  }
  let driverStrJson = "";
  let driverObj = {};
  try {
    driverStrJson = fs.readFileSync(url, 'utf-8');
    driverObj = JSON.parse(driverStrJson);
  } catch (error) {
    res.send(error.massage);
    return;
  }
  /* let driverStrJson = fs.readFileSync(url, 'utf-8');
  let driverObj = JSON.parse(driverStrJson); */
  var depenfiles = "";
  for(var i = 0; i < driverObj.DriverList.length; i++){
    if(driverObj.DriverList[i].SysPlatform == SysPlatform && driverObj.DriverList[i].DriverName == driverName && driverObj.DriverList[i].DriverCompany == deviceProvider){
      depenfiles = driverObj.DriverList[i].DependFile != "" ? (driverObj.DriverList[i].DependFile.split('|')) : driverObj.DriverList[i].DependFile;
    }
  }

  if(depenfiles != ""){
    for(var i = 0; i < depenfiles.length; i++){
      var relativePathFile = "../Driver/" + SysPlatform + "/" + deviceOsType + "/" + deviceProvider + "/" + driverName + "/" + DriverVersion +"/" + depenfiles[i];
      var FilePath = path.resolve(__dirname,relativePathFile);
      if(!fs.existsSync(FilePath)){
        returnObj.error = true;
        returnObj.info = "未找到驱动依赖文件：" + depenfiles[i];
        DevLogManagerObj.traceLog(DevManagerName, "Leave function checkDriverDepends");
        return returnObj;
      }
    }
    returnObj.error = false;
    returnObj.info = "依赖文件无缺失";
    DevLogManagerObj.traceLog(DevManagerName, "Leave function checkDriverDepends");
    return returnObj;
  }else{
    returnObj.error = false;
    returnObj.info = "该无所需依赖文件";
    DevLogManagerObj.traceLog(DevManagerName, "Leave function checkDriverDepends");
    return returnObj;
  }
}

//获取工程中的所有设备
router.post('/getAllDevice', function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getAllDevice");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
	DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  let devInfo;  
  req.query = pubInter.EscapeAllData(req.query);
  var devIfnoPath = pubInter.joinPath(req.query.ProjectID, req.query.Version, req.query.ProjectName) + '/DeviceInfo.json';
  let devInfJson = pubInter.readJson( devIfnoPath );
  if( devInfJson.Error == false){
    devInfo = devInfJson.data.DeviceList;
  }else{
    console.log(devInfJson.ErrorDesc);
    res.send(devInfJson);
    return;
  }

  if (global.productType == 2) {
    let linkInfo;  
    var linkInfoPath = pubInter.joinPath(req.query.ProjectID, req.query.Version, req.query.ProjectName) + '/CollectChannelInfo.json';
    let linkInJson = pubInter.readJson( linkInfoPath );
    if( linkInJson.Error == false){
      linkInfo = linkInJson.data.CollectChannelList;
    }else{
      console.log(linkInJson.ErrorDesc);
      res.send(linkInJson);
      return;
    }

    for( var i=0; i<devInfo.length; i++){
      for(var j=0; j<linkInfo.length; j++){
        if( devInfo[i].ChannelName == linkInfo[j].ChannelName){
          devInfo[i].channelData = linkInfo[j];
        }
      }
    }
  }  
  var lastObj = [];
  for( var c=0; c<devInfo.length; c++){
    var tempObj = {};
    tempObj.roleid = c+1;
    tempObj.rolename = devInfo[c].DeviceName;
    tempObj.devData = devInfo[c];
    lastObj.push(tempObj);
  }
  var objRes ={
    Error:false,
    ErrorDesc:"",
    data:lastObj
  }
  res.send(objRes);
})

//编辑 设备链路信息
router.post('/editDevLink', function(req,res){
  DevLogManagerObj.traceLog(DevManagerName, "Enter post editDevLink");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
	DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  let devInfo;
  req.query = pubInter.EscapeAllData(req.query);
  var devPath = pubInter.joinPath(req.query.ProjectID,req.query.ProjectEdition,req.query.ProjectName);
  var devIfnoPath = devPath + '/DeviceInfo.json';
  let devInfoJson = pubInter.readJson( devIfnoPath );
  if( devInfoJson.Error == false){
    devInfo = devInfoJson.data.DeviceList;
  }else{
    console.log(devInfoJson.ErrorDesc);
    res.send(devInfoJson.ErrorDesc);
    return;
  }

  let linkInfo;  
  var linkInfoPath = devPath + '/CollectChannelInfo.json';
  let linkInfJson = pubInter.readJson( linkInfoPath );
  if( linkInfJson.Error == false){
    linkInfo = linkInfJson.data.CollectChannelList;
  }else{
    console.log(linkInfJson.ErrorDesc);
    res.send(linkInfJson.ErrorDesc);
    return;
  }

  let varInfo;  
  var varInfoPath = devPath+ '/VarInfo.json';
  let varIJson = pubInter.readJson( varInfoPath );
  if( varIJson.Error == false){
    varInfo = varIJson.data.TagList;
  }else{
    console.log(varIJson.ErrorDesc);
    res.send(varIJson.ErrorDesc);
    return;
  }

  var devPos = 0;
  var linPos = undefined;
  for(var d=0; d<devInfo.length; d++){
    if( devInfo[d].DeviceID == req.query.devID){
      devPos = d;
      break;
    }
  }
  for(var l=0; l<linkInfo.length; l++){
    if( linkInfo[l].ChannelName == devInfo[devPos].ChannelName){
      linPos = l;
      break;
    }
  }
  let oldChannleName = devInfo[devPos].ChannelName;
  if( req.query.type == 1){//某一个设备 更改 链路名称
    //先判断新链路名称是否存在，不存在生成新的链路，判断原链路是否还存在设备，不存在时删除链路
    //新链路存在 需要判断 驱动是否相同，不同时不允许修改，驱动相同时，更改设备链路名，并将设备移动到该链路下
    //同时修改设备下所有变量的链路信息
    req.body = pubInter.EscapeAllData(req.body);
    devInfo[devPos][req.body.code] = req.body.value;//更改设备的链路名称
    devInfo[devPos].ChannelName = req.body.value;//更改设备的链路名称

    var linkFlag = false;
    for( var ll=0; ll<linkInfo.length; ll++){
      if( req.body.value == linkInfo[ll].ChannelName){//新链路存在
        linkFlag = true;
       if( devInfo[devPos].DriverSeries == linkInfo[ll].ChannelDriver){
         linkInfo[ll].DevIDArr.push(parseInt(req.query.devID));//将设备id添加到新链路中
         for(var w=0;w<linkInfo.length;w++){
           if( oldChannleName == linkInfo[w].ChannelName){
             for( var y=0; y<linkInfo[w].DevIDArr.length; y++){
               if( req.query.devID == linkInfo[w].DevIDArr[y]){
                linkInfo[w].DevIDArr.splice(y,1);//原链路中删除设备id
                if( linkInfo[w].DevIDArr.length == 0){
                  linkInfo.splice(w,1)//如果链路中不存在设备了，删除该链路
                }
                break;
               }
             }
             break;
           }
         }
       }else{
         res.send("驱动系列不同，不允许修改！");
         return;
       }
      }
      break;
    }
    if( linkFlag == false){//新链路不存在
      var linid = 0
      for(var w=0;w<linkInfo.length;w++){
        if( oldChannleName == linkInfo[w].ChannelName){
          for( var y=0; y<linkInfo[w].DevIDArr.length; y++){
            if( req.query.devID == linkInfo[w].DevIDArr[y]){
              linkInfo[w].DevIDArr.splice(y,1);//原链路中删除设备id
              if( linkInfo[w].DevIDArr.length == 0){
                linkInfo.splice(w,1)//如果链路中不存在设备了，删除该链路
              }
              break;
            }
          }
          break;
        }
      }
      for(var k = 0; k < linkInfo.length; k++){//最大通道号
        if(Number(linkInfo[k].ChannelID) > linid){
          linid = Number(linkInfo[k].ChannelID);
        }
      }
      var tenmLink = {};
      if( req.body.code == "LinkIP"){
        tenmLink.ChannelType = 2;          
      }else{          
        tenmLink.ChannelType = 1;
      }
      tenmLink.ChannelID = linid + 1;
      tenmLink.ChannelName = req.body.value;
      tenmLink.SerialBaudRate = devInfo[devPos].SerialBaudRate;
      tenmLink.SerialDataBits = devInfo[devPos].SerialDataBits;
      tenmLink.SerialStopBits = devInfo[devPos].SerialStopBits;
      tenmLink.SerialParity = devInfo[devPos].SerialParity;
      tenmLink.StreamControl = devInfo[devPos].StreamControl;
      tenmLink.SerialName = devInfo[devPos].SerialName;
      tenmLink.ChannelDescription = "";
      tenmLink.ChannelDriver = devInfo[devPos].DriverSeries;
      tenmLink.ChannelUnable = 1;
      tenmLink.InitTimeOut = 3000;
      tenmLink.CommunicationTimeOut = 3000;
      tenmLink.CLSID =  devInfo[devPos].CLSID;
      tenmLink.UaServerEndpointUrl = "";
      tenmLink.MachineName = "";
      tenmLink.DevIDArr = [parseInt(req.query.devID)];
      linkInfo.push(tenmLink);
    }

  }else if( req.query.type == 2){//某一个设备 更改 波特率等信息
    linkInfo[linPos][req.body.code] = parseInt(req.body.value);//先更改 该设备的链路中的 波特率信息
    for( var ll=0; ll<linkInfo[linPos].DevIDArr.length; ll++){//再更改该通道下所有设备的 波特率等信息
      for( var dd=0; dd<devInfo.length; dd++ ){
        if( devInfo[dd].DeviceID == linkInfo[linPos].DevIDArr[ll]){
          devInfo[dd][req.body.code] = parseInt(req.body.value);
        }
      }
    }
  }

  //更该冗余设备的 链路信息
  for( var u=0;u<linkInfo.length;u++){
    for( var p=0; p<linkInfo[u].DevIDArr.length; p++){
      if( devInfo[devPos].DeviceID == linkInfo[u].DevIDArr[p] ){
        for( var q=0; q<devInfo.length; q++){
          if( devInfo[q].RedundanceDevName == devInfo[devPos].DeviceName){
            devInfo[q].RedundanceDevChannelID = linkInfo[u].ChannelID;
            devInfo[q].RedundanceChannelName = linkInfo[u].ChannelName;
          }
        }
      }
    }
  }

  //更改设备下 所有变量的 链路名称
  for( var v=0; v<varInfo.length; v++){
    if( varInfo[v].DeviceID == devInfo[devPos].DeviceID){
      varInfo[v].ChannelName = devInfo[devPos].ChannelName;
    }
  }


  let devObj = {};
  devObj.DeviceList = devInfo;
  let strWrDev = pubInter.writeJson(devIfnoPath, devObj);
  if (strWrDev != "OK") {
    res.send(strWrDev);
    return;
  }
  //fs.writeFileSync(devIfnoPath, JSON.stringify(devObj, '', "\t"));

  let varObj = {};
  varObj.TagList = varInfo;
  let strWrVar = pubInter.writeJson(varInfoPath, varObj);
  if (strWrVar != "OK") {
    res.send(strWrVar);
    return;
  }
  //fs.writeFileSync(varInfoPath, JSON.stringify(varObj, '', "\t"));

  let lastObj = {};
  lastObj.CollectChannelList = linkInfo;
  let strWrLink = pubInter.writeJson(linkInfoPath, lastObj);
  if (strWrLink != "OK") {
    res.send(strWrLink);
    return;
  }
  //fs.writeFileSync(linkInfoPath, JSON.stringify(lastObj, '', "\t"));
  res.send("OK");

})

router.post('/getOPCProperty', function(req, res) {
  DevLogManagerObj.traceLog(DevManagerName, "Enter post getDeviceGroupProperty");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
  DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  fs.readFile(global.propertyPath+'/OPCProperty.json', function(err,data){
    if(err){
      var ErrorMessage = "read DeviceGroupProperty.json fail,post name:getDeviceGroupProperty;err:" + err;
      console.log(ErrorMessage);
      res.send(ErrorMessage);
      return;
    }
    var propertyObj = JSON.parse(data.toString());
    DevLogManagerObj.traceLog(DevManagerName, "Async Leave post getDeviceGroupProperty");
    res.send(data.toString());
  });
  DevLogManagerObj.traceLog(DevManagerName, "Leave post getDeviceGroupProperty");
})


router.post('/editOPC', function(req, res) {
  DevLogManagerObj.traceLog(DevManagerName, "Enter post editDevice");
  DevLogManagerObj.traceLog(DevManagerName + "_query:", req.query);
	DevLogManagerObj.traceLog(DevManagerName+ "_body:", req.body);
  const tenantId = req.headers.tenant_id;
  const tenantDir = tenantManager.getProjectGroupService(tenantId).dataStore.tenantDir;
  //修改 设备------------------------------------------------------------  
  let data = [];
  if(Object.keys(req.query).length){
    data.push(req.query);     
  }else if(req.body && req.body.length > 0) {    
    data = req.body;
  } 
  if(!data.length) {
    res.send("Faild");
    return;
  }
  // var proPath = pubInter.joinPath(data[0].ProjectID, data[0].ProjectEdition, data[0].ProjectName);
  var proPath = path.join(tenantDir, data[0].ProjectID,'project')
  let deviceObj, VarObj;  
  var projectDeviceURL = proPath + '/DeviceInfo.json';
  var projectVarURL = proPath + '/VarInfo.json';
  let deviceStrJson = pubInter.readJson( projectDeviceURL );
  if( deviceStrJson.Error == false){
    deviceObj = deviceStrJson.data;
  }else{
    console.log(deviceStrJson.ErrorDesc);
    res.send(deviceStrJson.ErrorDesc);
    return;
  }
  let VarStrJson = pubInter.readJson( projectVarURL );
  if( VarStrJson.Error == false){
    VarObj = VarStrJson.data;
  }else{
    console.log(VarStrJson.ErrorDesc);
    res.send(VarStrJson.ErrorDesc);
    return;
  }
  for(let j=0; j< data.length;j++) {
    let e = data[j];  
    e = pubInter.EscapeAllData(e);
    var field = e.field;
    var editValue = e.value;
    var id = e.id;
    for(let i = 0; i < deviceObj.DeviceList.length; i++) {
      if(deviceObj.DeviceList[i].DeviceID == id) {
        for(x in deviceObj.DeviceList[i]) {
          if(x == field) {
            //add by tingting.wang 编辑ua设备时对最大重连间隔时间进行限制
            if(field == "MaxReconncetInterval" && (editValue <0 || editValue > 604800000))
            {
              res.send("最大重连时间限制为0-604800000");
              return;
            }
            //add end by tingting.wang
            deviceObj.DeviceList[i][field] = editValue;
            break;
          }
        }
        break;
      } else if(field == "DeviceName" && deviceObj.DeviceList[i].DeviceName == editValue){
        res.send("该设备名称已存在");
        return;
      }
    } 
  
    for(let i = 0;i < VarObj.OPCVAR.length; i++) {
      if(VarObj.OPCVAR[i].DeviceID == id && field == "DeviceName") {
        VarObj.OPCVAR[i].DeviceName = editValue;
      }
    }
  }
  pubInter.writeJson(projectVarURL, VarObj);
  pubInter.writeJson(projectDeviceURL, deviceObj);
  res.send('OK');
  return;
})

module.exports = router;
