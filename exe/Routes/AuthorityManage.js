var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var router = express.Router();
let formidable = require('formidable');
var path = require('path');
var zipper = require("zip-local");
var iconv = require('iconv-lite');
var userManager = require('./userManager');
var KIOUserManager = new userManager();
var CharacterManager = require('./CharacterInterface');
var KIOCharacterManager = new CharacterManager();
var publicClass = require('./PublicInterface');//公用函数接口
var pubInter = new publicClass();
var AuthenticSystem = require('./OAuthenicSystemInterface');
var userAuthenticSystem = new AuthenticSystem();

var LogManager = require('./LogInterface');
var AuthorLogManagerObj = new LogManager();
var AuthorManagerName = "AuthorityManager";
const xss = require('xss');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:true}));

//工程文件路径
//var projectFileURL = JSON.parse(fs.readFileSync(path.resolve(__dirname,"../../config/externalConfig.json"), 'utf-8'));
var KIO_NOPERMISS = 0; //表示没有任何权限
var KIO_VIEWPERMISS = 1; //表示有查看权限，没有编辑权限
var KIO_EDITPERMISS = 2; //表示有编辑权限（包括既有查看权限又有编辑权限的情况）

//检查客户端信息
router.post('/checkclientinfo',async function(req,res){
  var clientinfo = req.body = pubInter.EscapeAllData(req.body);
  let resdata = await userAuthenticSystem.checkState(clientinfo.token,clientinfo.ip,clientinfo.useragent);
  if (typeof(resdata) == "object" && !resdata.length){
    if(resdata.errorCode == 0){
        res.send(resdata);
        return;
    }else{
      res.send('查询失败');
      console.log('状态查询失败');
      return;
    }
  }else{
  res.send(resdata.error);
  return;
  }
})

//获取客户端信息
router.post('/static_getClientIp',function(req,res){
  let userinfo = {};
  /* let getIP = function(){
    let interfaces = require("os").networkInterfaces();
    for(var devName in interfaces){
      var iface = interfaces[devName];
      for(var i = 0;i < iface.length;i++){
        let alias = iface[i];
        if(
          alias.family === "IPv4" &&
          alias.address !== "127.0.0.1" &&
          !alias.internal
        ){
          if(alias.address){
            return alias.address;
          }
        }
      }
    }
  }
  let realClientIp = getIP(); */
  let clientIp = req.headers['x-forwarded-for']||req.connection.remoteAddress||req.socket.remoteAddress||req.connection.socket.remoteAddress;
  let realClientIp = clientIp.replace("::ffff:","");
  let userAgent = req.headers['user-agent'];
  userinfo.userip = realClientIp;
  userinfo.userAgent = userAgent;
  res.send(userinfo);
  return;
})

//退出登录或者重新载入
router.post('/reloadorquit',async function(req,res){
  global.path = '../../../../config/devconfig.json';
  req.query = pubInter.EscapeAllData(req.query);
  let result = new Object();
  let clientIp = req.headers['x-forwarded-for']||req.connection.remoteAddress||req.socket.remoteAddress||req.connection.socket.remoteAddress;
  let realClientIp = clientIp.replace("::ffff:","");
  let userAgent = req.headers['user-agent'];
  let userinfo = {
    "token":req.query.token,
    "clientId":req.query.clientId,
    "reload":req.query.reload,
    "userAgent":userAgent,
    "ip":realClientIp,
  };
  let resdata = await userAuthenticSystem.ReloadOrQuit(userinfo);
  if(resdata.status == 200){
    try{
      let strJson = fs.readFileSync(global.path, 'utf-8');
      var serverObj = JSON.parse(strJson);
    }catch (error) {
      result.error = error.message;
      res.send(result);
      return;
    }
    result.oauthURL = serverObj.redirectUrl.loginURL;
    result.status = 200;
    res.send(result);
    return;
  }else{
    res.send("操作失败");
    return;
  }
})

//唯一标示函数
function getUUID() { 
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
}

//工程文件路径拼接
function getUrl(ProjectID, ProjectEdition){
  return '/' + ProjectID + '/' + ProjectEdition +  '/project'
}

//增加token，默认 KingAdmin-------------------------------------------------------------------------------------后期删除
router.post('/addToken', function(req, res, next){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post addToken");
  var clientIP = xss(req.headers['x-forwarded-for']) || // 判断是否有反向代理 IP
  xss(req.connection.remoteAddress) || // 判断 connection 的远程 IP
  xss(req.socket.remoteAddress) || // 判断后端的 socket 的 IP
  xss(req.connection.socket.remoteAddress);
  clientIP = clientIP.replace("::ffff:", "");//获取当前用户登陆的IP

  var userInfo = new Object();
  userInfo.UserName = "KingAdmin";
  userInfo.Password = "admin123";
  userInfo.CurrentLoginIP = clientIP;
  userInfo.IpAddr = xss(req.query.IpAddr);

  KIOUserManager.checkUserAccount(res, userInfo);
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post addToken");
})

//验证token
router.post('/mainLogin',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post mainLogin");
  var userInfo = new Object();
  req.query = pubInter.EscapeAllData(req.query);
  userInfo.accessToken = req.query.token;
  userInfo.RefreshToken = req.query.refreshToken;
  userInfo.IpAddr = req.query.IpAddr;
  if (userInfo.accessToken != undefined){
      KIOUserManager.checkUserTokenIsValid(res, userInfo);
  }else{
    try {
      let strJson = fs.readFileSync('../../../../../config/devconfig.json', 'utf-8');
      var serverObj = JSON.parse(strJson);
    } catch (error) {
      result.error = error.message;
      res.send(result);
    }

    let result = new Object();
    result.oauthURL = serverObj.redirectUrl.loginURL;
  //   result.ssoURL = serverObj.SSOServer.LogoutURL;
    result.error = "token is undefined";
    res.send(result);
  }
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post mainLogin");
})

//查询用户列表----------------------------目前没有使用
router.post('/getOauthUserList',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post getOauthUserList");
  var userInfo = new Object;
  // userInfo.UserID = parseInt(req.query.UserID);
  userInfo.accessToken = xss(req.query.token);
  /* userInfo.ID = req.query.ID;
  userInfo.Name = req.query.Name;
  userInfo.Type = req.query.Type;
  userInfo.ParentID = req.query.ParentID;
  userInfo.ParentName = req.query.ParentName;
  userInfo.UserName = req.query.UserName; */

  var arrObj = {};
  KIOUserManager.queryUserAccountForALL(res, userInfo, arrObj);
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post getOauthUserList");
})

//查询用户组列表
router.post('/getOauthUserGroupList',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post getOauthUserGroupList");
  var userInfo = new Object;
  // userInfo.UserID = parseInt(req.query.UserID);
  userInfo.accessToken = xss(req.query.token);
  // userInfo.ProjectID = req.query.ProjectID;
  KIOUserManager.queryUserGroupListForALL(res, userInfo);
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post getOauthUserGroupList");
})

//新建工程，增加单一角色-----------------------------------使用
router.post('/editUserAuthority',function(req,res){ //加工程组
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post editUserAuthority");
  let ProjectGroupListURL = global.sdbPath + '/ProjectGroupList.json';
  if(!fs.existsSync(ProjectGroupListURL)){
    console.log("未找到工程组文件");
    res.send("未找到工程组文件");
    return;
  }
  let ProjectGroupListURLObj = {};
  try {
    ProjectGroupListURLObj = JSON.parse(fs.readFileSync(ProjectGroupListURL, 'utf-8'));
  } catch (error) {
    res.send(error.message);
    return;
  }
  let AuthorityInfoURL = global.sdbPath + '/CharacterInfo.json';
  if(!fs.existsSync(AuthorityInfoURL)){
    console.log("未找到角色文件");
    res.send("未找到角色文件");
    return;
  }
  //let AuthorityInfoObj = JSON.parse(fs.readFileSync(AuthorityInfoURL, 'utf-8'));
  let objReadJson = pubInter.readJson(AuthorityInfoURL);
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  let AuthorityInfoObj = objReadJson.data;

  req.query = pubInter.EscapeAllData(req.query);
  var authority 
  if(req.query.Type == "工程"){
    authority = KIOCharacterManager.createCharacterForNewProject(req.query.ProjectID, req.query.ProjectEdition, req.query.UserInfo, AuthorityInfoObj,ProjectGroupListURLObj);
    AuthorLogManagerObj.traceLog(AuthorManagerName, " createCharacterForNewProject return:" + JSON.stringify(AuthorityInfoObj));
  }
  if(req.query.Type == "工程组"){
    authority = KIOCharacterManager.createCharacterForNewProjectGroup(req.query.ProjectGroupID, req.query.UserInfo, AuthorityInfoObj,ProjectGroupListURLObj);
  }
  
  var writeCharacterStr = JSON.stringify(AuthorityInfoObj, "", "\t");
  try{
    fs.writeFileSync(AuthorityInfoURL,writeCharacterStr);
  } catch (error) {
    console.log(error)
    res.send("写角色文件失败" + error);
    return;
  }

  //更新各个工程权限
  updateProjectSetDataAuthority(AuthorityInfoObj, ProjectGroupListURLObj);
  if(authority){
    res.send("OK");
  }else{
    res.send("Error");
  }
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post editUserAuthority");
})

//删除角色-------------------------------------------shiyong
router.post('/deleteCharacter',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post deleteCharacter");
  let ProjectGroupListURL = global.sdbPath + '/ProjectGroupList.json';
  if(!fs.existsSync(ProjectGroupListURL)){
    console.log("未找到工程组文件");
    res.send("未找到工程组文件");
    return;
  }

  let objReadGroup = pubInter.readJson(ProjectGroupListURL);
  if (objReadGroup.Error) {
    res.send(objReadGroup.ErrorDesc);
    return;
  }
  let ProjectGroupListURLObj = objReadGroup.data;
  //let ProjectGroupListURLObj = JSON.parse(fs.readFileSync(ProjectGroupListURL, 'utf-8'));
  let CharacterInfoURL = global.sdbPath + '/CharacterInfo.json';
  if(!fs.existsSync(CharacterInfoURL)){
    console.log("未找到角色文件");
    res.send("未找到角色文件");
    return;
  }
  let objReadCharacter = pubInter.readJson(CharacterInfoURL);
  if (objReadCharacter.Error) {
    res.send(objReadCharacter.ErrorDesc);
    return;
  }
  let CharacterInfoObj = objReadCharacter.data;
  //let CharacterInfoObj = JSON.parse(fs.readFileSync(CharacterInfoURL, 'utf-8'));
  var CharacterIDs = xss(req.query.CharacterIDs).split(',');

  for(var i = 0; i < CharacterInfoObj.authority.length; i++ ){
    if(CharacterIDs.find(function(value){
      return CharacterInfoObj.authority[i].CharacterID == value;
    })){
      CharacterInfoObj.authority.splice(i,1);
      i--;
    }
  }

  var writeCharacterStr = JSON.stringify(CharacterInfoObj, "", "\t");
  try{
    fs.writeFileSync(CharacterInfoURL,writeCharacterStr);
  } catch (error) {
    console.log(error)
    res.send("写角色文件失败" + error);
    return;
  }
  //更新各个工程权限
  updateProjectSetDataAuthority(CharacterInfoObj, ProjectGroupListURLObj);
  res.send("OK");
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post deleteCharacter");
})

//编辑角色---------------------------------------------------使用
router.post('/editeCharacter',function(req, res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post editeCharacter");
  let ProjectGroupListURL = global.sdbPath + '/ProjectGroupList.json';
  if(!fs.existsSync(ProjectGroupListURL)){
    console.log("未找到工程组文件");
    res.send("未找到工程组文件");
    return;
  }
  let objReadGroup = pubInter.readJson(ProjectGroupListURL);
  if (objReadGroup.Error) {
    res.send(objReadGroup.ErrorDesc);
    return;
  }
  let ProjectGroupListURLObj = objReadGroup.data;
  //let ProjectGroupListURLObj = JSON.parse(fs.readFileSync(ProjectGroupListURL, 'utf-8'));
  let CharacterInfoURL = global.sdbPath + '/CharacterInfo.json';
  if(!fs.existsSync(CharacterInfoURL)){
    console.log("未找到角色文件");
    res.send("未找到角色文件");
    return;
  }
  let objReadCharacter = pubInter.readJson(CharacterInfoURL);
  if (objReadCharacter.Error) {
    res.send(objReadCharacter.ErrorDesc);
    return;
  }
  let CharacterInfoObj = objReadCharacter.data;
  //let CharacterInfoObj = JSON.parse(fs.readFileSync(CharacterInfoURL, 'utf-8'));
  var rowData = pubInter.EscapeAllData(req.body);
  //根据id和code定位
  for(var i = 0; i < CharacterInfoObj.authority.length; i++){
    if(CharacterInfoObj.authority[i].CharacterID == xss(req.query.CharacterID)){
      if(rowData.code == "ProjectAuthority"){
        var allProjectAuthorityData = rowData.editor.options.data;
        var ProjectAuthorityValue = rowData.value.split(',');
        var ProjectAuthorityObj = new Array();//组合后的工程权限对象
        findAuthorityByChildrenIDValue( allProjectAuthorityData, ProjectAuthorityValue, ProjectAuthorityObj);
        CharacterInfoObj.authority[i].ProjectAuthority = ProjectAuthorityObj;
      }else if(rowData.code == "Users"){
        var allUserData = rowData.editor.options.data;
        var userAuthorityValue = rowData.value.split(',');
        var UserAuthorityObj = new Array();
        findUserAuthorityByIDValue(allUserData, userAuthorityValue, CharacterInfoObj.authority[i].Users, UserAuthorityObj);
        //CharacterInfoObj.authority[i].Users = UserAuthorityObj;//allUserData;
      }else{
        if(rowData.code == "CharacterName"){//修改角色名称时，校验重复
          for(var s = 0; s < CharacterInfoObj.authority.length; s++){
            if(CharacterInfoObj.authority[s].CharacterName == rowData.value){
              res.send("角色名称重复");
              return;
            }
          }
        }
        for(var param in CharacterInfoObj.authority[i]){
          if(param == rowData.code){
            CharacterInfoObj.authority[i][param] = rowData.value;
            break;//此属性只有一个
          }
        }
      }
      break;//id不重复
    }
  }

  var writeCharacterStr = JSON.stringify(CharacterInfoObj, "", "\t");
  try{
    fs.writeFileSync(CharacterInfoURL,writeCharacterStr);
  } catch (error) {
    console.log(error)
    res.send("写角色文件失败" + error);
    return;
  }
  //更新各个工程权限
  updateProjectSetDataAuthority(CharacterInfoObj, ProjectGroupListURLObj);
  res.send("OK");
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post editeCharacter");
})

//新建角色--------------------------------------------------------------shiyong
router.post('/addNewCharacter',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post addNewCharacter");
  let ProjectGroupListURL = global.sdbPath + '/ProjectGroupList.json';
  if(!fs.existsSync(ProjectGroupListURL)){
    console.log("未找到工程组文件");
    res.send("未找到工程组文件");
    return;
  }
  let objReadGroup = pubInter.readJson(ProjectGroupListURL);
  if (objReadGroup.Error) {
    res.send(objReadGroup.ErrorDesc);
    return;
  }
  let ProjectGroupListURLObj = objReadGroup.data;
  //let ProjectGroupListURLObj = JSON.parse(fs.readFileSync(ProjectGroupListURL, 'utf-8'));

  let CharacterInfoURL = global.sdbPath + '/CharacterInfo.json';
  if(!fs.existsSync(CharacterInfoURL)){
    console.log("未找到角色文件");
    res.send("未找到角色文件");
    return;
  }
  let objReadCharacter = pubInter.readJson(CharacterInfoURL);
  if (objReadCharacter.Error) {
    res.send(objReadCharacter.ErrorDesc);
    return;
  }
  let CharacterInfoObj = objReadCharacter.data;
  //let CharacterInfoObj = JSON.parse(fs.readFileSync(CharacterInfoURL, 'utf-8'));
  var newCharacerObj = new Object();

  var submitObj = JSON.parse(xss(req.body.body));
  var allProjectAuthorityData = new Array();//工程管理权限的所有数据
  var ProjectAuthorityValue = new Array();
  for(var i = 0; i < submitObj.rows.length; i++){
    if(submitObj.rows[i].code == "ProjectAuthority"){
      allProjectAuthorityData = submitObj.rows[i].editor.options.data;
      ProjectAuthorityValue = submitObj.rows[i].value.split(',');
    }
    if(submitObj.rows[i].code == "CharacterName"){
      newCharacerObj.CharacterName = submitObj.rows[i].value
    }
    if(submitObj.rows[i].code == "CharacterDesc"){
      newCharacerObj.CharacterDesc = submitObj.rows[i].value
    }
  }
  var allUserData = new Array();//用户选择的所有数据
  var userAuthorityValue = new Array();
  for(var i = 0; i < submitObj.rows.length; i++){
    if(submitObj.rows[i].code == "Users"){
      allUserData = submitObj.rows[i].editor.options.data;
      userAuthorityValue = submitObj.rows[i].value.split(',');
    }
  }

  //最大ID//名字重复校验
  var characterMaxID = 0;
  for(var i = 0; i < CharacterInfoObj.authority.length; i++){
    if(Number(CharacterInfoObj.authority[i].CharacterID) >= characterMaxID){
      characterMaxID = Number(CharacterInfoObj.authority[i].CharacterID);
    }
    if(CharacterInfoObj.authority[i].CharacterName == newCharacerObj.CharacterName){
      res.send("角色名称重复");
      return;
    }
  }

  var ProjectAuthorityObj = new Array();//组合后的工程权限对象
  findAuthorityByChildrenIDValue( allProjectAuthorityData, ProjectAuthorityValue, ProjectAuthorityObj);

  var UserAuthorityObj = new Array();
  var originUsers = new Array();
  findUserAuthorityByIDValue(allUserData, userAuthorityValue, originUsers, UserAuthorityObj);

  newCharacerObj.CharacterID = characterMaxID + 1;
  newCharacerObj.ProjectAuthority = ProjectAuthorityObj;
  newCharacerObj.ProjectConfigAuthority = [];
  newCharacerObj.Users = originUsers;//allUserData;
  
  CharacterInfoObj.authority.push(newCharacerObj);
  var writeCharacterStr = JSON.stringify(CharacterInfoObj, "", "\t");
  try{
    fs.writeFileSync(CharacterInfoURL,writeCharacterStr);
  } catch (error) {
    console.log(error)
    res.send("写角色文件失败" + error);
    return;
  }
  //更新各个工程权限
  updateProjectSetDataAuthority(CharacterInfoObj, ProjectGroupListURLObj);
  res.send("OK");
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post addNewCharacter");
})

//工程列表信息 及 所有用户信息-------------------------------------------使用
router.post('/getAllProjectInfo',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post getAllProjectInfo");
  var proDir = '../' + global.sdbPath + '/ProjectGroupList.json';
  let strJson = fs.readFile(path.resolve(__dirname,proDir), 'utf-8', function(err, data){
    if(err){
      console.log("Load getAllProjectInfo Failed.");
      console.error(err);
      res.send("Load getAllProjectInfo Failed: " + err)
      return;
    }

    let proGroupList = JSON.parse(data);
    var treeObj = new Object();
    treeObj.id = 0;
    treeObj.text = "工程管理";
    treeObj.Type = "工程管理";
    var authorityCheck = new Array();
    var arr = ['数据下设', '读', '读写'];
    var code = ['SetData', 'Read', 'ReadWrite'];
    var arrNodeGroup = ['读写'];
    var codeNodeGroup = ['ReadWrite'];
    var arrGroup = ['读', '读写'];
    var codeGroup = ['Read','ReadWrite'];
    for(var m = 0; m < arrNodeGroup.length; m++){
      var DataObj = {};
      DataObj.id = getUUID();
      DataObj.text = arrNodeGroup[m];
      DataObj.code = codeNodeGroup[m];
      DataObj.Type = "authority";
      authorityCheck.push(DataObj)
    }

    for(var i = 0; i < proGroupList.ProjectGroupList.length; i++ ){
      if(proGroupList.ProjectGroupList[i].ProjectGroupName){
        var tempGroupObj = new Object();
        tempGroupObj.text = proGroupList.ProjectGroupList[i].ProjectGroupName;
        tempGroupObj.id = proGroupList.ProjectGroupList[i].ProjectGroupID;
        tempGroupObj.Type = "工程组";
        var tempGroupChildren = new Array();
        // tempGroupChildren = JSON.parse(JSON.stringify(authorityCheck));
        for(var m = 0; m < arrGroup.length; m++){
          var DataObj = {};
          DataObj.id = getUUID();
          DataObj.text = arrGroup[m];
          DataObj.code = codeGroup[m];
          DataObj.Type = "authority";
          tempGroupChildren.push(DataObj)
        }
        if(proGroupList.ProjectGroupList[i].ProjectObjectList){
          for(var j = 0; j < proGroupList.ProjectGroupList[i].ProjectObjectList.length; j++ ){
            var authorityTempCheck = new Array();
            for(var m = 0; m < arr.length; m++){
              var DataObj = {};
              DataObj.id = getUUID();
              DataObj.text = arr[m];
              DataObj.code = code[m];
              DataObj.Type = "authority";
              authorityTempCheck.unshift(DataObj)
            }
            var projectTempObj = new Object();
            projectTempObj.children = authorityTempCheck;
            projectTempObj.text = proGroupList.ProjectGroupList[i].ProjectObjectList[j].ProjectName;
            projectTempObj.id = proGroupList.ProjectGroupList[i].ProjectObjectList[j].ProjectID;
            projectTempObj.Version = proGroupList.ProjectGroupList[i].ProjectObjectList[j].ProjectVersion;
            projectTempObj.Type = "工程";
            tempGroupChildren.push(projectTempObj);
          }
        }
        tempGroupObj.children = tempGroupChildren;
        authorityCheck.push(tempGroupObj)
      }else{
        var tempGroupObj = new Object();
        tempGroupObj.text = proGroupList.ProjectGroupList[i].ProjectName;
        tempGroupObj.id = proGroupList.ProjectGroupList[i].ProjectID;
        tempGroupObj.Version = proGroupList.ProjectGroupList[i].ProjectVersion;
        tempGroupObj.Type = "工程";
        var authorityTempCheck = new Array();
        for(var m = 0; m < arr.length; m++){
          var DataObj = {};
          DataObj.id = getUUID();
          DataObj.text = arr[m];
          DataObj.code = code[m];
          DataObj.Type = "authority";
          authorityTempCheck.unshift(DataObj)
        }
        tempGroupObj.children = authorityTempCheck;
        authorityCheck.push(tempGroupObj)
      }
    } 
    treeObj.children = authorityCheck;
    var resultArr = [];
    resultArr.push(treeObj);
    var allObj = {};
    allObj.projectInfo = resultArr;

    var userInfo = new Object;
    userInfo.accessToken = xss(req.query.token);
    userInfo.IpAddr = xss(req.query.IpAddr);

    KIOUserManager.queryUserAccountForALL(res, userInfo, allObj);
  });
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post getAllProjectInfo");
})

//获取所有角色信息---------------------------------------------------shiyong
router.post('/getAllCharacterInfo',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post getAllCharacterInfo");
  let CharacterInfoURL = global.sdbPath + '/CharacterInfo.json';
  if(!fs.existsSync(CharacterInfoURL)){
    console.log("未找到角色文件");
    res.send("未找到角色文件");
    return;
  }
  let objReadCharacter = pubInter.readJson(CharacterInfoURL);
  if (objReadCharacter.Error) {
    res.send(objReadCharacter.ErrorDesc);
    return;
  }
  let CharacterInfoObj = objReadCharacter.data;
  //let CharacterInfoObj = JSON.parse(fs.readFileSync(CharacterInfoURL, 'utf-8'));
  res.send(JSON.stringify(CharacterInfoObj.authority));
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post getAllCharacterInfo");
})

//获取角色属性-------------------------------------------------------------shiyong
router.post('/getCharacterProperty',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post getCharacterProperty");
  fs.readFile(global.propertyPath+'/CharacterProperty.json', function(err,data){
    if(err){
      var ErrorMessage = "read CharacterProperty.json fail,post name:getCharacterProperty;err:" + err;
      console.log(ErrorMessage);
      res.send(ErrorMessage);
      return;
    }
    AuthorLogManagerObj.traceLog(AuthorManagerName, "Async Leave post getCharacterProperty");
    res.send(data.toString());
  });
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post getCharacterProperty");
})

//获取用户是否对工程可写-------------------------------使用
router.post('/getProjectWriteAuthority',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post getProjectWriteAuthority");
  let AuthorityInfoURL = global.sdbPath + '/CharacterInfo.json';
  let objReadAuth = pubInter.readJson(AuthorityInfoURL);
  if (objReadAuth.Error) {
    res.send(objReadAuth.ErrorDesc);
    return;
  }
  let AuthorityInfoObj = objReadAuth.data;
  //let AuthorityInfoObj = JSON.parse(fs.readFileSync(AuthorityInfoURL, 'utf-8'));
  req.query = pubInter.EscapeAllData(req.query);
  var authority = KIOCharacterManager.checkProjectWritable(req.query.ProjectID, req.query.ProjectEdition, req.query.UserInfo, AuthorityInfoObj);

  if(authority){
    res.send("true");
  }else{
    res.send("false");
  }
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post getProjectWriteAuthority");
})

//测试 增加 用户
router.post('/createUserAccount',function(req,res){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post createUserAccount");
  var userInfo = new Object;
  // userInfo.UserID = parseInt(req.query.UserID);
  req.query = pubInter.EscapeAllData(req.query);
  userInfo.UserName = req.query.UserName;
  userInfo.Password = req.query.Password;
  userInfo.UserDesc = req.query.UserDesc;
  userInfo.accessToken = req.query.Token;

  KIOUserManager.createUserAccount(res, userInfo);
})

//获取用户树
router.post('/getUserTree', function (req,res) {
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post createUserAccount");
  var userInfo = new Object;
  // userInfo.UserID = parseInt(req.query.UserID);
  userInfo.accessToken = xss(req.query.Token);
  userInfo.ProjectID = xss(req.query.ProjectID);//用户所选的工程ID
  KIOUserManager.getUserResourceTree(res, userInfo);
})

//获取用户类别树
router.post('/getUserTypeTree', function (req,res) {
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post getUserTypeTree");
  var userInfo = new Object;
  userInfo.accessToken = xss(req.query.Token);
  userInfo.ProjectID = xss(req.query.ProjectID);//用户所选的工程ID
  KIOUserManager.getUserTypeTree(res, userInfo);
})

//给工程配置权限
router.post('/setProjetAuth', function (req,res) {
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post setProjetAuth");
  let strPermissPath = global.sdbPath + "/permissConfig.json";
  let objReadJson = pubInter.readJson(strPermissPath);
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  var arrPermissList = objReadJson.data;
  var objSetAuth = pubInter.EscapeAllData(req.body);

  for (let n = 0; n < objSetAuth.ProIDList.length; n++) {
    var objOneProAuth = {};
    objOneProAuth.projectId = objSetAuth.ProIDList[n];
    
    //配置该工程的查看权限
    objOneProAuth.showList = {};
    objOneProAuth.showList.userGroupId = [];
    objOneProAuth.showList.userCategory = [];
    if (objSetAuth.ViewGroup) {
      for (let i = 0; i < objSetAuth.ViewGroup.length; i++) {
        objOneProAuth.showList.userGroupId.push(objSetAuth.ViewGroup[i].id);
      }
    }
    if (objSetAuth.ViewCatagory) {
      for (let i = 0; i < objSetAuth.ViewCatagory.length; i++) {
        if (objSetAuth.ViewCatagory[i].children == undefined) {
          objOneProAuth.showList.userCategory.push(objSetAuth.ViewCatagory[i].id);
        }
      }
    }   

    //配置该工程的编辑权限
    objOneProAuth.editList = {};
    objOneProAuth.editList.userGroupId = [];
    objOneProAuth.editList.userCategory = [];
    if (objSetAuth.EditGroup) {
      for (let i = 0; i < objSetAuth.EditGroup.length; i++) {
        objOneProAuth.editList.userGroupId.push(objSetAuth.EditGroup[i].id);
      }
    }
    if (objSetAuth.EditCatagory) {
      for (let i = 0; i < objSetAuth.EditCatagory.length; i++) {
        if (objSetAuth.EditCatagory[i].children == undefined) {
          objOneProAuth.editList.userCategory.push(objSetAuth.EditCatagory[i].id);
        }
      }
    }   

    //查看工程权限文件中是否有该工程
    var nIndex = -1;
    var objFindProject = arrPermissList.permissList.find(function (project, index) {
      nIndex = index
      return project.projectId == objOneProAuth.projectId;
    })
    if (objFindProject == undefined) {//表示是新增工程的权限
      arrPermissList.permissList.push(objOneProAuth);
    } else {//表示是修改工程的权限
      arrPermissList.permissList[nIndex] = objOneProAuth;
    }
  }

  let resWrite = pubInter.writeJson(strPermissPath, arrPermissList);
  res.send(resWrite);
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave post setProjetAuth");
})

router.post('/roleVerifivation', async function(req, res) {
  let result = {
    err:false,
    oauthURL:""
  }
  var ret = await KIOUserManager.roleVerifivation();
  if(ret == false) {
    try {
      let strJson = fs.readFileSync('../../../../config/devconfig.json', 'utf-8');
      var serverObj = JSON.parse(strJson);
    } catch(error) {
      result.error = error.message;
      res.send(result);
      return;
    }
    result.err = true;
    result.oauthURL = serverObj.redirectUrl.loginURL;
    res.send(result);
    return;
  } else {
    res.send(result);
    return;
  }
})

//获取当前用户对该工程的权限
router.post('/getProjectAuth', function (req, res) {
  var strProjectID = xss(req.query.ProjectID);
  var objRes = {
    status:200,
    msg:"",
  };//返回值
  let strPermissPath = global.sdbPath + "/permissConfig.json";
  let objReadJson = pubInter.readJson(strPermissPath);
  if (objReadJson.Error) {
    objRes.msg = objReadJson.ErrorDesc;
    res.send(objRes);
    return;
  }
  var arrPermissList = objReadJson.data;
  let objProjectPer = arrPermissList.permissList.find(function (params) {
    return params.projectId == strProjectID;
  })
  if (objProjectPer == undefined) {
    //表示该工程没有配置过权限
    objRes.msg = KIO_NOPERMISS;
    res.send(objRes);
    return;
  }

  var objUserInfo = pubInter.EscapeAllData(req.body);
  //先看是否有编辑权限
  //看该用户组有没有编辑权限
  let objFindGroup = objProjectPer.editList.userGroupId.find(function (userGroup) {
    return userGroup == objUserInfo.groupId;
  })
  if (objFindGroup != undefined) {
    objRes.msg = KIO_EDITPERMISS;
    res.send(objRes);
    return;
  } else {
    //再看该用户类别有没有编辑权限
    if (objUserInfo.category) {
      for (let i = 0; i < objProjectPer.editList.userCategory.length; i++) {
        for (let j = 0; j < objUserInfo.category.length; j++) {
          for (let k = 0; k < objUserInfo.category[j].list.length; k++) {
            if (objProjectPer.editList.userCategory[i] == objUserInfo.category[j].list[k].categoryAttrId) {
              objRes.msg = KIO_EDITPERMISS;
              res.send(objRes);
              return;
            }
          }
        }
      }
    } 
    //如果objUserInfo.category == undefined，那么相当于该用户没有配置用户类别
  }

  //看是否有查看权限
  objFindGroup = objProjectPer.showList.userGroupId.find(function (userGroup) {
    return userGroup == objUserInfo.groupId;
  });
  if (objFindGroup != undefined) {
    objRes.msg = KIO_VIEWPERMISS;
    res.send(objRes);
    return;
  } else {
    //再看该用户类别有没有查看权限
    if (objUserInfo.category) {
      for (let i = 0; i < objProjectPer.showList.userCategory.length; i++) {
        for (let j = 0; j < objUserInfo.category.length; j++) {
          for (let k = 0; k < objUserInfo.category[j].list.length; k++) {
            if (objProjectPer.showList.userCategory[i] == objUserInfo.category[j].list[k].categoryAttrId) {
              objRes.msg = KIO_VIEWPERMISS;
              res.send(objRes);
              return;
            }
          }
        }
      }
    }
    
  }
  objRes.msg = KIO_NOPERMISS;
  res.send(objRes);
})

//组合工程权限对象
function findAuthorityByChildrenIDValue(srcData, idValueArr, targetArr){
  for(var i = 0; i < srcData.length; i++){
    if(srcData[i].Type == "authority"){
      continue;
    }
    var tempObj = new Object();
    if(srcData[i].Type == "工程管理" || srcData[i].Type == "工程组"){
      tempObj.ProjectGroupName = srcData[i].text;
      tempObj.ProjectGroupID = srcData[i].id;
    }
    if(srcData[i].Type == "工程"){
      tempObj.ProjectName = srcData[i].text;
      tempObj.ProjectVersion = srcData[i].Version;
      tempObj.ProjectID = srcData[i].id;
    }
    if(srcData[i].children && srcData[i].children.length != 0){
      for(var j = 0; j < srcData[i].children.length; j++){//循环每一个子节点，查看其权限是否勾选
        if(srcData[i].children[j].Type == "authority"){
          if(idValueArr.find(function(value){
            return value == srcData[i].children[j].id;
          })){
            tempObj[srcData[i].children[j].code] = 1;
          }else{
            tempObj[srcData[i].children[j].code] = 0;
          }
        }
      }
    }
    if(srcData[i].Type == "工程管理" ){
      tempObj.ProjectGroups = new Array();
      if(srcData[i].children && srcData[i].children.length != 0){
        findAuthorityByChildrenIDValue( srcData[i].children, idValueArr, tempObj.ProjectGroups)
      }
    }
    if(srcData[i].Type == "工程组"){
      tempObj.Projects = new Array();
      if(srcData[i].children && srcData[i].children.length != 0){
        findAuthorityByChildrenIDValue( srcData[i].children, idValueArr, tempObj.Projects)
      }
    }
    targetArr.push(tempObj);
  }
}

//组合用户对象
function findUserAuthorityByIDValue(allUserData, userAuthorityValue, origianUsers, UserAuthorityObj){
  for(var i = 0; i < allUserData.length; i++){
    var authority = 0;
    if(userAuthorityValue.find(function(value){
      return (value == allUserData[i].userId && allUserData[i].userId != undefined);
    })){
      authority = 1;
    }
    var findUserFlag = false;
    for(var j = 0; j < origianUsers.length; j++){//遍历素有用户，有则改
      if(origianUsers[j].userId == allUserData[i].userId ){
        findUserFlag = true;
        origianUsers[j].authority = authority;
        break;//假设userId是用户唯一标示
      }
    }
    if(findUserFlag == false){//无则加，push到最后
      allUserData[i].authority = authority;
      //取出group/；children属性
      var tempObject = new Object();
      for(var property in allUserData[i]){
        if(typeof allUserData[i][property] != 'object'){
          tempObject[property] = allUserData[i][property];
        }
      }
      origianUsers.push(tempObject);
    }

    if(allUserData[i].groupId){
      if(allUserData[i].users != undefined && allUserData[i].users.length != 0){
        findUserAuthorityByIDValue(allUserData[i].users, userAuthorityValue, origianUsers, UserAuthorityObj);
      }
      if(allUserData[i].children != undefined && allUserData[i].children.length != 0){
        findUserAuthorityByIDValue(allUserData[i].children, userAuthorityValue, origianUsers, UserAuthorityObj);
      }
    }
  }
}

//更新每个工程的工程下设权限
function updateProjectSetDataAuthority(characterFileObj, projectGroupFileObj){
  for(var i = 0; i < projectGroupFileObj.ProjectGroupList.length; i++){
    if( projectGroupFileObj.ProjectGroupList[i].ProjectID != undefined ){
      updateProjectSetDataAuthorityByIDVersion(projectGroupFileObj.ProjectGroupList[i].ProjectID, projectGroupFileObj.ProjectGroupList[i].ProjectVersion, characterFileObj)
    }
    if(projectGroupFileObj.ProjectGroupList[i].ProjectGroupID != undefined && projectGroupFileObj.ProjectGroupList[i].ProjectObjectList != undefined &&
      projectGroupFileObj.ProjectGroupList[i].ProjectObjectList.length > 0){
        for(var j = 0; j < projectGroupFileObj.ProjectGroupList[i].ProjectObjectList.length; j++){
          if( projectGroupFileObj.ProjectGroupList[i].ProjectObjectList[j].ProjectID != undefined ){
            updateProjectSetDataAuthorityByIDVersion(projectGroupFileObj.ProjectGroupList[i].ProjectObjectList[j].ProjectID,projectGroupFileObj.ProjectGroupList[i].ProjectObjectList[j].ProjectVersion, characterFileObj)
          }
        }
      }
  }  
}

//更新单个工程的数据下设权限
function updateProjectSetDataAuthorityByIDVersion(ProjectID, ProjectEdition, characterFileObj){
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter function updateProjectSetDataAuthorityByIDVersion");
  let projectPropertyURL = global.sdbPath + getUrl(ProjectID, ProjectEdition) + '/ProjectPorpertyInfo.json';
  if(!fs.existsSync(projectPropertyURL)){
    console.log("updateProjectSetDataAuthorityByIDVersion Error:未找到工程属性文件");
    return false;
  }
  let objProJson = pubInter.readJson(projectPropertyURL);
  if (objProJson.Error) {
    res.send(objProJson.ErrorDesc);
    return;
  }
  let projectPropertyObj = objProJson.data;
  //let projectPropertyObj =JSON.parse( fs.readFileSync(projectPropertyURL,'utf-8') );
  var userList = KIOCharacterManager.getUserListSetDataByProject(ProjectID, ProjectEdition, characterFileObj);
  var userlistArr = new Array();
  for(var i = 0; i < userList.length; i++){
    var tempObj = new Object();
    tempObj.UserName = userList[i].userName;
    tempObj.UserID = userList[i].userID;
    tempObj.Authority = 1;
    userlistArr.push(tempObj);
  }
  projectPropertyObj.SetdataUsers = userlistArr;

  var writeFileStr = JSON.stringify(projectPropertyObj,'','\t');
  try{
    fs.writeFileSync(projectPropertyURL,writeFileStr);
  }catch(error){
    console.log("updateProjectSetDataAuthorityByIDVersion 写文件错误：" + error);
    AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave function updateProjectSetDataAuthorityByIDVersion");
    return false;
  }
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Leave function updateProjectSetDataAuthorityByIDVersion");
  return true;
}

//获取当前用户是否具有新建工程的权限
router.post('/getCreateAuth', function (req, res) {
  AuthorLogManagerObj.traceLog(AuthorManagerName, "Enter post getCreateAuth");
  var userInfo = new Object;
  // userInfo.UserID = parseInt(req.query.UserID);
  req.body = pubInter.EscapeAllData(req.body);
  userInfo = JSON.parse(req.body.UserInfo);
  KIOUserManager.getCreateAuth(res, userInfo);
})

//退出浏览器的时候将checkTokenFlag置为false
router.post('/setCheckFlag', function (req, res) {
  AuthorLogManagerObj.traceLog(AuthorManagerName, "setCheckFlag");
  let strExternalPath = "../config/externalConfig.json";
  let objReadJson = pubInter.readJson(strExternalPath);
  if (objReadJson.Error) {
    res.send(objReadJson.ErrorDesc);
    return;
  }
  objReadJson.data.checkTokenFlag = false;
  let strWrite = pubInter.writeJson(strExternalPath, objReadJson.data);
  console.log(strWrite);
  res.send(strWrite);
})

module.exports = router;