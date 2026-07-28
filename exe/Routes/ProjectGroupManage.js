var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var router = express.Router();

var oauthManagers = require('./userManager');//用户oauth接口
var KIOUserManagers = new oauthManagers();

var CharacterManager = require('./CharacterInterface');//角色权限接口
var charaterInter = new CharacterManager();

var publicClass = require('./PublicInterface');//公用函数接口
var pubInter = new publicClass();

var LogManager = require('./LogInterface');//日志接口
var LogManagerObj = new LogManager();
const xss = require('xss');

var PRODUCTKF36 = 1;//表示产品类型是KF3.6
var PRODUCTKF40 = 2;//表示产品类型是KF4.0

var mainURL;
var loginURL;
if( global.productType == PRODUCTKF36){//kf3.6
  try{
    mainURL = JSON.parse(fs.readFileSync('../../../config/devconfig.json'), 'utf-8').redirectUrl.mainURL;
    loginURL = JSON.parse(fs.readFileSync('../../../config/devconfig.json'), 'utf-8').redirectUrl.loginURL;
  }catch(error){
    console.log("ProjectGroupManage externalConfig.json format error");
  }
}
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:true}));
var ProjectGroupManageName = "ProjectGroupManage";
//产品类型
router.post('/getProductType', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter getProductType");
  LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  res.send(''+global.productType);
  LogManagerObj.traceLog(ProjectGroupManageName, "Leave getProductType");
})

//退出
router.post('/exitURL', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter exitURL");
  LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  // res.send(loginURL);
  var userInfo = new Object();
  userInfo.loginURL = loginURL;
  userInfo.AccessToken = xss(req.query.token);
  userInfo.RefreshToken = xss(req.query.refreshToken);
  res.send(userInfo);
  //KIOUserManagers.loginOutOauthAccount(res,userInfo);//oauth更新后使用此函数，注释上一句
  LogManagerObj.traceLog(ProjectGroupManageName, "Leave exitURL");
})

//返回
router.post('/backURL', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter backURL");
  LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  res.send(mainURL);
  LogManagerObj.traceLog(ProjectGroupManageName, "Leave backURL");
})

//工程组 写权限校验
router.post('/proGroupWriteCheck', function (req, res) {
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post proGroupWriteCheck");
	LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  let proData = xss(req.body.id);
  let objCharacter = pubInter.readJson(global.sdbPath+"/CharacterInfo.json");
  if (objCharacter.Error) {
    res.send("-1");
    return;
  }
  let fileObj = objCharacter.data;
  var deleFlag = charaterInter.checkProjectGroupWritable(proData, req.query.userInfo, fileObj);
  res.send(deleFlag);
  LogManagerObj.traceLog(ProjectGroupManageName, "Leave proGroupWriteCheck");
})

//加载工程组列表 树形节点视图
router.post('/getProjectGroupList', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post getProjectGroupList");
	LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  //let userInfo = pubInter.EscapeAllData(req.query.userInfo);
  let strJson = fs.readFile( global.sdbPath+'/ProjectGroupList.json', 'utf-8', function(err, data){
    if(err){
      console.log("Load ProjectGroupList Failed.");
      LogManagerObj.debugLog(ProjectGroupManageName, "getProjectGroupList->Load ProjectGroupList Failed");
      console.error(err);
      res.send(err)
      return;
    }
    let objTree = pubInter.readJson(global.propertyPath+'/mainMenu.json');
    if (objTree.Error) {
      res.send(objTree);
      return;
    }
    let treeJSON = objTree.data;
    if(req.query.type == 'KSS') {
      treeJSON.datarows[0].children.splice(2, 1);
    }
    //let treeJSON = JSON.parse( fs.readFileSync(global.propertyPath+'/mainMenu.json', 'utf-8'));
    let proGroupList = JSON.parse(data);    
    let newGroupList = proGroupList.ProjectGroupList;
  
    var progroupJson = treeJSON.datarows[0].children[0].children;
    var count = 0;

    let objCharacter = pubInter.readJson(global.sdbPath+"/CharacterInfo.json");
    if (objCharacter.Error) {
      res.send(objCharacter);
      return;
    }
    let charaInfo = objCharacter.data;
    //let charaInfo = JSON.parse( fs.readFileSync( global.sdbPath+"/CharacterInfo.json"));
    traverseGroupJSONToTree(newGroupList, progroupJson, count,charaInfo);
    LogManagerObj.traceLog(ProjectGroupManageName, "Async Leave post getProjectGroupList");
    res.send(treeJSON.datarows);
  });
  LogManagerObj.traceLog(ProjectGroupManageName, "Leave getProjectGroupList");
})
function traverseGroupJSONToTree(JsonList, reaArry, count,charaInfo){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post traverseGroupJSONToTree");
  LogManagerObj.traceLog(ProjectGroupManageName, "Function traverseGroupJSONToTree param1:" + typeof JsonList == 'object'?(JSON.stringify(JsonList)):JsonList);
  //LogManagerObj.traceLog(ProjectGroupManageName, "Function traverseGroupJSONToTree param4:" + typeof userInfo == 'object'?(JSON.stringify(userInfo)):userInfo);
  for(var i=0;i<JsonList.length;i++){
    if( JsonList[i].ProjectGroupName == undefined ){
      continue;
    }else{
      //权限 工程组是否显示：工程组可写接口返回true || 工程可读接口返回true
      /* var groupFlag = charaterInter.checkProjectGroupWritable(JsonList[i].ProjectGroupID , userInfo, charaInfo);
      if( groupFlag == false){
        groupFlag = charaterInter.checkProjectGroupReadable(JsonList[i].ProjectGroupID , userInfo, charaInfo);
      }
      var proFlag = 0;
      if( JsonList[i].ProjectObjectList != undefined && JsonList[i].ProjectObjectList.length>0){
        var proData = JsonList[i].ProjectObjectList;
        for(var p=0;p<proData.length;p++){
          proFlag = charaterInter.checkProjectReadable(proData[p].ProjectID, proData[p].ProjectVersion, userInfo, charaInfo);
          if( proFlag == true){
            break;
          }
        }
      } */
      var groupFlag = true, proFlag = true;
      LogManagerObj.traceLog(ProjectGroupManageName, "function traverseGroupJSONToTree groupFlag:" + groupFlag + " proFlag" + proFlag);
      if( groupFlag == true || proFlag == true){      
        var treeObj = new Object();
        treeObj.id = count + 1;
        count ++;
        treeObj.text = JsonList[i].ProjectGroupName;
        treeObj.iconCls = "icon-blank";
        treeObj.url = "collectprojectgroup.html"; 
        treeObj.groupID = JsonList[i].ProjectGroupID;
        treeObj.groupData = JsonList[i];
        if( JsonList[i].ProjectObjectList == undefined ){
          reaArry.push(treeObj);
        }else{
          treeObj.children = [];
          reaArry.push(treeObj);
          traverseGroupJSONToTree(JsonList[i].ProjectObjectList, reaArry[reaArry.length-1].children, count,charaInfo);
        }  
      }    
    }
  }
  LogManagerObj.traceLog(ProjectGroupManageName, "Leave traverseGroupJSONToTree");
  return reaArry;  
}

//moveProject  获得所有工程组 树
router.post('/getAllGroupTree', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post getAllGroupTree");
	LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  let userInfo = pubInter.EscapeAllData(req.query.userInfo);
  let strJson = fs.readFile( global.sdbPath+'/ProjectGroupList.json', 'utf-8', function(err, data){
    if(err){
      console.log("Load ProjectGroupList Failed.");
      console.error(err);
      return;
    }
    let proGroupList = {};
    try {
      proGroupList = JSON.parse(data);
    } catch (error) {
      res.send(error);
      return;
    }
    
    let objTree = pubInter.readJson(global.propertyPath+'/mainMenu.json');
    if (objTree.Error) {
      res.send(objTree);
      return;
    }
    let treeJSON = objTree.data;
    //let treeJSON = JSON.parse( fs.readFileSync(global.propertyPath+'/mainMenu.json', 'utf-8'));
    
    let newGroupList = proGroupList.ProjectGroupList;  
    var progroupJson = treeJSON.datarows[0].children[0].children;
    var count = 0;

    let objCharacter = pubInter.readJson(global.sdbPath+"/CharacterInfo.json");
    if (objCharacter.Error) {
      res.send(objCharacter);
      return;
    }
    let charaInfo = objCharacter.data;
    //let charaInfo = JSON.parse( fs.readFileSync( global.sdbPath+"/CharacterInfo.json"));
    traverseGroupJSONToTree(newGroupList, progroupJson, count, userInfo, charaInfo);
    treeJSON.datarows[0].children[0].id = 0;
    res.send([treeJSON.datarows[0].children[0]]);
    LogManagerObj.traceLog(ProjectGroupManageName, "Leave getAllGroupTree");
  })
})

//加载工程组属性，赋初值
router.post('/getProjectGroupProperty', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post getProjectGroupProperty");
	LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  let strJson = fs.readFile(global.propertyPath+'/proGroupProperty.json', 'utf-8', function(err, data){
    if(err){
      console.log("Load proGroupProperty Failed.");
      console.error(err);
      return;
    }
    var timestr = "proGroup01"; 
    let groupPropertyList = JSON.parse(data).rows;
    let groupList = new Array();
    for(var i=0;i<groupPropertyList.length;i++){
      var tempList = new Object();
      tempList.field = groupPropertyList[i].field;
      tempList.name = groupPropertyList[i].name;
      tempList.group = groupPropertyList[i].group;
      tempList.editor = groupPropertyList[i].editor;
      tempList.value = groupPropertyList[i].value;
      if( tempList.field == "ProjectGroupID"){
        tempList.value = pubInter.getUUID();
      }
      if( tempList.field == "ProjectGroupName"){
        tempList.value = timestr;
      }
      if( tempList.field == "ProjectGroupCreatTime"){
        tempList.value = pubInter.getCurrentTime();
      }
      groupList.push(tempList);
    }
    LogManagerObj.traceLog(ProjectGroupManageName, "Async Leave post getProjectGroupProperty");
    res.send(groupList);
  })
})

//新建工程组 提交
router.post('/addNewProjectGroup', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post addNewProjectGroup");
	LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  let groupData = pubInter.EscapeAllData(req.body);//工程组属性
  let strJson = fs.readFile( global.sdbPath+'/ProjectGroupList.json', 'utf-8', function(err, data){
    if(err){
      console.log("Load proGroupProperty Failed.");
      console.error(err);
      return;
    }
    var newProperty = JSON.parse(groupData.body);
    var groupObj = new Object();
    
    let groupList = JSON.parse(data).ProjectGroupList;
    //groupObj.ProjectGroupID = new Date().getTime();
    for( var k=0;k<newProperty.length;k++ ){
      if( newProperty[k].field == "ProjectGroupName"){
        groupObj.ProjectGroupName = xss(newProperty[k].value);
      }
      if( newProperty[k].field == "Description"){
        groupObj.Description = xss(newProperty[k].value);
      }
      if( newProperty[k].field == "ProjectGroupCreatTime"){
        groupObj.ProjectGroupCreatTime = xss(newProperty[k].value);
      }
      if( newProperty[k].field == "ProjectGroupID"){
        groupObj.ProjectGroupID = xss(newProperty[k].value);
      }
      if( newProperty[k].field == "ProjectGroupCreatPerson"){
        groupObj.ProjectGroupCreatPerson = xss(req.query.UserName);//newProperty[k].value;//"user";//
      }
    }  
    //校验重名
    for(var j=0; j<groupList.length; j++){
      var tempgroupName = traverseJSON(groupList[j]);
      for(var m=0; m<tempgroupName.length; m++){
        if( tempgroupName[m] == groupObj.ProjectGroupName){
          res.send("工程组重名");
          return;
        }
      }
    }  

    if( groupData.node == "工程管理"){      
      var tempObj = new Object();
      tempObj.ProjectGroupID = groupObj.ProjectGroupID;
      tempObj.ProjectGroupName = groupObj.ProjectGroupName;
      tempObj.Description = groupObj.Description;
      tempObj.ProjectGroupCreatTime = groupObj.ProjectGroupCreatTime;
      tempObj.ProjectGroupCreatPerson = groupObj.ProjectGroupCreatPerson;
      tempObj.ProjectObjectList = new Array();
      groupList.push(tempObj);
    }else{
      addGroupToJSON(groupList, groupObj, groupData.node);
    }   
    let lastJson = new Object();
    lastJson.ProjectGroupList = groupList;
    //写入到文件
    fs.writeFile( global.sdbPath+'/ProjectGroupList.json', JSON.stringify(lastJson, '', "\t"), function (err) {
      if (err) {
        return console.error(err);
      }
      res.send('OK');
      LogManagerObj.traceLog(ProjectGroupManageName, "Leave addNewProjectGroup");
    });
  });
})
function traverseJSON(node){
  var tempProGroup = new Array();
  var child = node.ProjectObjectList;
  tempProGroup.push(node.ProjectGroupName);
  if( tempProGroup != undefined ){
    if( child ){
      child.forEach(function(node) {       
        tempProGroup = tempProGroup.concat(traverseJSON(node));
      });
    }
  }  
  return tempProGroup;
}
function addGroupToJSON(ProjectGroupList, newGroupName, selectTreeText){
  var flag = 0  
  for(var i=0; i<ProjectGroupList.length;i++){
    if( ProjectGroupList[i].ProjectGroupName == undefined){
      continue;
    }
    if( ProjectGroupList[i].ProjectGroupName == selectTreeText){
      if( ProjectGroupList[i].ProjectObjectList == undefined){
        ProjectGroupList[i].ProjectObjectList = new Array();
      }
      var tempObj = new Object();
      tempObj.ProjectGroupID = newGroupName.ProjectGroupID;
      tempObj.ProjectGroupName = newGroupName.ProjectGroupName;
      tempObj.Description = newGroupName.Description;
      tempObj.ProjectGroupCreatTime = newGroupName.ProjectGroupCreatTime;
      tempObj.ProjectGroupCreatPerson = newGroupName.ProjectGroupCreatPerson;
      ProjectGroupList[i].ProjectObjectList.push(tempObj);
      flag = 1;
      break;
    }else{
      if( ProjectGroupList[i].ProjectID != undefined ){
        continue;
      }
      if( ProjectGroupList[i].ProjectObjectList != undefined && ProjectGroupList[i].ProjectObjectList.length > 0){
        addGroupToJSON(ProjectGroupList[i].ProjectObjectList, newGroupName, selectTreeText);
      }
    }
  }
  return ProjectGroupList;
}

//删除工程组 确认
router.post('/deletProjectGroup', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post deletProjectGroup");
	LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  var proGroupName = xss(req.query.ProjectGroupName);
  var proGroupID = xss(req.query.ProjectGroupID);

  let strJson = fs.readFile( global.sdbPath+'/ProjectGroupList.json', 'utf-8', function(err, data){
    if(err){
      console.log("Load proGroupProperty Failed.");
      console.error(err);
      res.send(err.message);
      return;
    }
    let groupList = JSON.parse(data).ProjectGroupList;
    
    let lastJson = new Object();
    
    //lastJson.ProjectGroupList = deletGroupToJSON(groupList, proGroupName);
    //只有没有工程的工程组才能删除
    var nIndex = 0;
    let objFindGroup = groupList.find(function (group, index) {
      nIndex = index;
      return group.ProjectGroupID == proGroupID;
    })
    if (objFindGroup.ProjectObjectList.length == 0) {
      groupList.splice(nIndex, 1);
    } else {
      res.send("该工程组中还有工程，不允许删除");
      return;
    }
    lastJson.ProjectGroupList = JSON.parse(JSON.stringify(groupList));
    //写入到文件
    fs.writeFile( global.sdbPath+'/ProjectGroupList.json', JSON.stringify(lastJson, '', "\t"), function (err) {
      if (err) {
        return console.error(err);
      }      
      //删除权限文件的工程组名称
      /* let fileObj = JSON.parse(fs.readFileSync( global.sdbPath+"/CharacterInfo.json", 'utf-8'));
      charaterInter.deleteCharacterProjectForDeleteProjectGroup(fileObj, [{"ProjectGroupID":proGroupID}]);
      fs.writeFileSync( global.sdbPath+"/CharacterInfo.json", JSON.stringify(fileObj, "", "\t")); */
      res.send('OK');
      LogManagerObj.traceLog(ProjectGroupManageName, "Leave deletProjectGroup");
    });
  })
})
function deletGroupToJSON(ProjectGroupList, proGroupName){
  for(var i=0; i<ProjectGroupList.length;i++){
    if( ProjectGroupList[i].ProjectGroupName == undefined){
      continue;
    }
    if( ProjectGroupList[i].ProjectGroupName == proGroupName){
      if( ProjectGroupList[i].ProjectObjectList ){
        var proLen = ProjectGroupList[i].ProjectObjectList.length;
        for( var p=0;p<proLen;p++){
          var temPaht =  global.sdbPath + "/" + ProjectGroupList[i].ProjectObjectList[p].ProjectID;
          deleteProjectFolder(temPaht);
        }
        delete  ProjectGroupList[i].ProjectObjectList;
      }
      ProjectGroupList.splice(i,1);
      // ProjectGroupList = deletJSON(ProjectGroupList, i);
      break;
    }else{
      if( ProjectGroupList[i].ProjectID != undefined ){
        continue;
      }
      if( ProjectGroupList[i].ProjectObjectList != undefined && ProjectGroupList[i].ProjectObjectList.length > 0){
        deletGroupToJSON(ProjectGroupList[i].ProjectObjectList, proGroupName);
      }
    }
  }
  return ProjectGroupList;
}
function deleteProjectFolder(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file) {
      var curPath = path + "/" + file;
      if(fs.statSync(curPath).isDirectory()) { // recurse
        deleteProjectFolder(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

//查询单个工程组信息
router.post('/queryOneProjectGroup', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post queryOneProjectGroup");
	LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  var proGroupName = xss(req.query.ProjectGroupName);
  let strJson = fs.readFile( global.sdbPath+'/ProjectGroupList.json', 'utf-8', function(err, data){
    if(err){
      console.log("Load ProjectGroupList Failed.");
      console.error(err);
      return;
    }
    let proGroupList = JSON.parse(data);
    let newGroupList = proGroupList.ProjectGroupList;
    let strJson = fs.readFile(global.propertyPath+'/proGroupProperty.json', 'utf-8', function(err, data){
      if(err){
        console.log("Load proGroupProperty Failed.");
        console.error(err);
        return;
      }  
      let groupPropertyList = JSON.parse(data).rows;
      let groupList = new Array();
      findGroupInfo(groupPropertyList, newGroupList, proGroupName, groupList);      
      res.send(groupList);
      LogManagerObj.traceLog(ProjectGroupManageName, "Leave queryOneProjectGroup");
    })
  })
})

function findGroupInfo(propertyList, proGroupList, selectTreeText, groupList){
  var flag = 0  
  for(var i=0; i<proGroupList.length;i++){
    if( proGroupList[i].ProjectGroupName == undefined){
      continue;
    }
    if( proGroupList[i].ProjectGroupName == selectTreeText){      
      for(var k=0;k<propertyList.length;k++){
        var tempList = new Object();
        tempList.field = propertyList[k].field;
        tempList.name = propertyList[k].name;
        tempList.group = propertyList[k].group;
        tempList.editor = propertyList[k].editor;
        tempList.value = propertyList[k].value;
        if( tempList.field == "ProjectGroupID"){
          //console.log(proGroupList[i].ProjectGroupID);
          tempList.value = proGroupList[i].ProjectGroupID;
        }
        if( tempList.field == "ProjectGroupName"){
          //console.log(proGroupList[i].ProjectGroupName);
          tempList.value = proGroupList[i].ProjectGroupName;
        }
        if( tempList.field == "ProjectGroupCreatTime"){
          tempList.value = proGroupList[i].ProjectGroupCreatTime;
        }
        if( tempList.field == "ProjectGroupCreatPerson"){
          tempList.value = proGroupList[i].ProjectGroupCreatPerson;
        }
        if( tempList.field == "Description"){
          tempList.value = proGroupList[i].Description;
        }
        groupList.push(tempList);
      }
      flag = 1;
      break;
    }else{
      if( proGroupList[i].ProjectID != undefined ){
        continue;
      }
      if( proGroupList[i].ProjectObjectList != undefined && proGroupList[i].ProjectObjectList.length > 0){
        findGroupInfo(propertyList, proGroupList[i].ProjectObjectList, selectTreeText, groupList);
      }
    }
  }
  return proGroupList;
}

//工程组属性修改 提交
router.post('/editProjectGroup', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post editProjectGroup");
	LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  let proID = xss(req.query.proID);

  let changeField = xss(req.query.changeField);
  let changeValue = xss(req.query.changeValue);
  
  var groupPath =  global.sdbPath + "/ProjectGroupList.json";
  fs.readFile(groupPath, 'utf-8', function(err, data){
    if(err){
      console.log("editProjectGroup Load ProjectGroupList.json Failed.");
      console.error(err);
      return;
    }
    let groupInfo = JSON.parse(data).ProjectGroupList;
    var proGroupName;
    for( var mm=0;mm<groupInfo.length;mm++){
      if( groupInfo[mm].ProjectGroupName != undefined){
        if( groupInfo[mm].ProjectGroupName == changeValue){
          res.send("工程组重名");
          return;
        }
      }
    }
    for( var g=0;g<groupInfo.length;g++){      
      if( groupInfo[g].ProjectGroupID == proID){
        proGroupName = groupInfo[g].ProjectGroupName;
        break;
      }
    }
    editProGroup(groupInfo, proID, changeField, changeValue);
    let lastJson = new Object();
    lastJson.ProjectGroupList = groupInfo;
    fs.writeFile(groupPath, JSON.stringify(lastJson, '', "\t"), function (err) {
      if (err) {
        return console.error(err);
      }
      res.send('OK');
      LogManagerObj.traceLog(ProjectGroupManageName, "Leave editProjectGroup");
      //修改权限文件的工程组名称
      // if( changeField == "ProjectGroupName"){
      //   let charaInfo = JSON.parse(fs.readFileSync( global.sdbPath+"/CharacterInfo.json", 'utf-8'));
      //   charaterInter.modifyCharacterForModifyProjectGroup(proID, charaInfo, {"ProjectGroupName":changeValue});
      //   fs.writeFileSync( global.sdbPath+"/CharacterInfo.json", JSON.stringify(charaInfo, "", "\t"));
      // }
    })        
  })
})
function editProGroup( proGroupList, selectTreeText, changeField, changeValue){
  for(var i=0; i<proGroupList.length; i++){
    if( proGroupList[i].ProjectGroupID == selectTreeText){
        proGroupList[i][changeField] = changeValue;
        if( changeField == "ProjectGroupName"){
          if( proGroupList[i].ProjectObjectList ){
            var temObj = proGroupList[i].ProjectObjectList;
            for( var kk=0;kk<temObj.length;kk++){
              temObj[kk].GroupName = changeValue;
            }
          }
        }
        break;
    }   
    else{
      if( proGroupList[i].ProjectObjectList != undefined && proGroupList[i].ProjectObjectList.length > 0){
        editProGroup(proGroupList[i].ProjectObjectList, selectTreeText, changeField, changeValue);
      }
    } 
  } 
  return proGroupList;
}

//获得系统中 工程组 工程 设备组 设备 变量组 变量 的数量
router.post('/getSystemEveryThings', function(req, res){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter post getSystemEveryThings");
	LogManagerObj.traceLog(ProjectGroupManageName + "_query:", req.query);
	LogManagerObj.traceLog(ProjectGroupManageName+ "_body:", req.body);
  var lastObj = new Object();
  lastObj.proGroupNum = 0;
  lastObj.proNum = 0;

  lastObj.devGroupNum = 0;
  lastObj.devNum = 0;

  lastObj.varGroupNum = 0;
  lastObj.varNum = 0;

  if( !fs.existsSync( global.sdbPath+"/ProjectGroupList.json") ){
    res.send({Error:true, ErrorDesc:"ProjectGroupList.json 不存在"});
    return;
  }

  let objGroupRes = pubInter.readJson(global.sdbPath+"/ProjectGroupList.json", 'utf-8');
  if (objGroupRes.Error) {
    res.send(objGroupRes);
    return;
  }
  let groupJSON = objGroupRes.data.ProjectGroupList;
  for( var i=0; i<groupJSON.length; i++){
    if( groupJSON[i].ProjectGroupID ){
      lastObj.proGroupNum += 1;
      if( groupJSON[i].ProjectObjectList){
        lastObj.proNum += groupJSON[i].ProjectObjectList.length;
        let resCount = countProjectInfo(groupJSON[i].ProjectObjectList, lastObj);
        if (resCount.Error) {
          res.send(resCount);
          return;
        }
      }
    }else{
      lastObj.proNum += 1;
      var tempArr = new Array();
      tempArr.push(groupJSON[i]);
      let resCount = countProjectInfo(tempArr, lastObj);
      if (resCount.Error) {
        res.send(resCount);
        return;
      }
     }
  }
  let objJson = pubInter.readJson("Driver/DriverInfo.json");
  if (objJson.Error) {
    res.send(objJson);
    return;
  }
  let driveJSON = objJson.data.DriverList;
  // let driveJSON = JSON.parse( fs.readFileSync("Driver/DriverInfo.json", 'utf-8')).DriverList;
  lastObj.driveNum = driveJSON.length;
  res.send(lastObj);
  LogManagerObj.traceLog(ProjectGroupManageName, "Leave getSystemEveryThings");
})
function countProjectInfo(proArr, lastObj){
  LogManagerObj.traceLog(ProjectGroupManageName, "Enter function countProjectInfo");
  for( var y=0;y<proArr.length;y++){
    // var dg_path =  global.sdbPath+"/"+proArr[y].ProjectID+"/"+proArr[y].ProjectVersion+"/project/DeviceGroupInfo.json";
    var temPath = pubInter.joinPath(proArr[y].ProjectID, proArr[y].ProjectVersion, proArr[y].ProjectName);
    
    var dg_path = temPath + "/DeviceGroupInfo.json";
    let db_Json = pubInter.readJson(dg_path);
    if (db_Json.Error) {
      return db_Json;
    }    
    traverseGroupInfo( db_Json.data.DeviceGroupList, lastObj);

    var d_path = temPath +"/DeviceInfo.json";
    let d_Json = pubInter.readJson(d_path);
    if (d_Json.Error) {
      return d_Json;
    }  
    lastObj.devNum += d_Json.data.DeviceList.length;
    
    var vg_path = temPath +"/VarGroupInfo.json";
    let  vg_Json = pubInter.readJson(vg_path);
    if (vg_Json.Error) {
      return vg_Json;
    }
    traverseGroupInfo(vg_Json.data.TagGroupList, lastObj);

    var v_path = temPath +"/VarInfo.json";
    let  v_Json = pubInter.readJson(v_path);
    if (v_Json.Error) {
      return v_Json;
    }
    lastObj.varNum += v_Json.data.TagList.length;
  }
  var objRes = {
    Error:false,
  }
  LogManagerObj.traceLog(ProjectGroupManageName, "Leave function countProjectInfo");
  return objRes;
}
function traverseGroupInfo(arr, lastObj){
  for( var t=0; t<arr.length; t++){
    for(var index in arr[t]){
      if( index == "DeviceGroupID"){
        lastObj.devGroupNum += 1;
      }
      if( index == "TagGroupID"){
        lastObj.varGroupNum += 1;
      }
      if( index == "DeviceObjectList"){
        traverseGroupInfo(arr[t].DeviceObjectList, lastObj);
      }
      if( index == "TagObjectList"){
        traverseGroupInfo(arr[t].TagObjectList, lastObj);
      }
    }
  }
  return arr;
}

module.exports = router;