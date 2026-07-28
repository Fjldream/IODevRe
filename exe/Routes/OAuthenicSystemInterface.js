 var querystring = require("querystring");
var httpRequest = require('request');
var fs = require('fs');
var path = require('path');

var oauthServerInfo = getOAuthServerConfig();
var appRegistInfo= getRegist2OAuthResult();
var oauthServerInfoKF36 = getOAuthServerConfigForKF36();
var commonConfigKF36 = getCommonConfigForKF36();

function UserAuthenticationManager(){
}

/**
 * @method getSupperManagerToken
 * @deprecated Get User Account Token
 * @param grantType {string}
 * @param userInfo  {Object}
 * @note 
 */

UserAuthenticationManager.prototype.checkState = function(token,ip,useragent){
  return new Promise((resolve,reject) =>{
    let stateurl = "http://" + oauthServerInfoKF36.devCenterAddress + ":11001/api/v1/multiLoginStatus";
    httpRequest({
      url:stateurl,
      headers:{"content-type":"application/x-www-form-urlencoded",
      "Authorization":"Bearer " + token,},
      method:"POST",
      json:true,
      body:querystring.stringify({token:token,ip:ip,userAgent:useragent})
    },function(err, res, body){
      if(!err){
        resolve(body)	
      }else{
        let message = new Object();
        message.error = "Failed!";  
        console.log(message.error);
        resolve(message.error);
      }
    })
  })
}

UserAuthenticationManager.prototype.roleVerifivation = function() {
  return new Promise((resolve, reject) => {
    httpRequest({
      url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/roleVerifivation?moduleName=kingio",
      headers:{
        "content-type":"application/JSON;charset=utf-8"
      },
      method:"GET",
    },function(err, res, body) {
      if(!err && res.statusCode == 200) {
        var ret = JSON.parse(body);
        resolve(ret);
      } else {
        if(err) {
          let message = {};
          message.err = err.msg;
          reject(message)
        } else {
          var ret = JSON.parse(body);
          let message = {};
          message.err = ret.msg;
          reject(message);
        }
      }
    })
  })
}

UserAuthenticationManager.prototype.ReloadOrQuit = function(userinfo){
  return new Promise((resolve,reject) =>{
    let stateurl = "http://" + oauthServerInfoKF36.devCenterAddress + ":11006/api/v1/multiChoice";
    httpRequest({
      url:stateurl,
      headers:{"content-type":"application/x-www-form-urlencoded",
      "Authorization":"Bearer " + userinfo.token,},
      method:"POST",
      json:true,
      body:querystring.stringify(userinfo)
    },function(err, res, body){
      if(!err){
        resolve(body);
      }else{
        let message = new Object();
        message.error = "Get State Failed!";  
        console.log(message.error);
        resolve(message.error);
      }
    })
  })
}

UserAuthenticationManager.prototype.getUserAccountToken = function(grantType, userInfo){ 
  return new Promise((resolve, reject) => {
      let queryInfo = {
          "grant_type":grantType,//password
          "client_id":oauthServerInfoKF36.oauthClient.clientId, //appRegistInfo.ClientID,
          "client_secret":oauthServerInfoKF36.oauthClient.clientSecret,//appRegistInfo.ClientSecret,
          "username":userInfo.username,//"KingAdmin",
          "password":userInfo.password,//"admin123"
          "tenantId":userInfo.tenantId
      };

      httpRequest({
      url:"http://" + oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/oauth/token",
      headers:{
          "content-type":"application/x-www-form-urlencoded"
      },
      method:"POST",
      json:true,
      body:querystring.stringify(queryInfo)
      }, function(err, res, body){
          if (!err && res.statusCode == 200){
            if (typeof(body) == "object" && Object.prototype.toString.call(body).toLowerCase() == "[object object]" && !body.length){
              let message = "User Token: " + body.access_token;
              console.log(message);
              resolve(body);
            }else{
              let message = new Object();
              message.error = body;
              console.log(body);
              resolve(message);
            }
          }else{
            let message = new Object();
            message.error = "Get Supper Token Failed!";  
            console.log(message.error);
            resolve(message);
          }
      });
  })
}

UserAuthenticationManager.prototype.checkUserTokenIsValid = function(grantType, userInfo){ //------------------------------校验token，使用
  return new Promise((resolve, reject) => {
      httpRequest({
      // url:"http://" + userInfo.IpAddr + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/auth",
      url:"http://" + oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/auth",
      // url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/auth",
      headers:{
          "content-type":"application/x-www-form-urlencoded",
          "Authorization":"Bearer " + userInfo.accessToken,
      },
      method:"GET",
      }, function(err, res, body){
          if (!err && res.statusCode == 200){
            let a = typeof(body);
            let b = Object.prototype.toString.call(body).toLowerCase();
            let c = body.length;
            try{
              let result = JSON.parse(body);
              console.log("Check Token Succeed:%s", result.userName);
              resolve(result);
            }catch(e){
              let message = new Object();
              message.error = body;
              console.log(body);
              resolve(message);
            }
          }else{
              console.log("Check Token Failed!" + err);
              let message = new Object();
              message.error = "Check Token Failed!";
              resolve(message);
          }
      });
  })
}
  
/************************************************************暂时使用
 * @method checkUserAccount
 * @deprecated Check User Account Invaid
 * @param response
 * @param grantType {number}
 * @param userInfo  {Object}
 * @note 生成token
 */
UserAuthenticationManager.prototype.checkUserAccount = function(grantType, userInfo){
    return new Promise((resolve, reject) => {
        let queryInfo = {
            "grant_type":"password",
            "client_id":oauthServerInfoKF36.oauthClient.clientId,
            "client_secret":oauthServerInfoKF36.oauthClient.clientSecret,
            "username":userInfo.UserName,
            "tenantId": 'c71f771f-0c8f-4c75-9d71-3b8c4b6bd190',
            // "userType": '01',
            "password":userInfo.Password
        };

        let result = httpRequest({
          url:"http://" +  oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/oauth/token",
            // url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/oauth/token",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
            },
            method:"POST",
            json:true,
            body:querystring.stringify(queryInfo)
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              if (typeof(body) == "object" && Object.prototype.toString.call(body).toLowerCase() == "[object object]" && !body.length){
                body.UserName = userInfo.UserName;
                console.log("User(%s) Login Succeed!", userInfo.UserName);
                resolve(body);
              }else{
                let message = new Object();
                message.error = body;
                console.log(body);
                resolve(message);
              }
            }else{
                let message = new Object();
                console.log(body);
                message.error = "User Login Failed!";
                resolve(message);
            }
        });
    })
}
  
/**
 * @method creatUserAccount
 * @deprecated Create User Account
 * @param response
 * @param userInfo  {Object}
 */
 UserAuthenticationManager.prototype.createUserAccount =  function(grantType, userInfo){
    return new Promise((resolve, reject) => {
        let queryInfo = {
            "username":userInfo.UserName,
            "password":userInfo.Password,
            "description":userInfo.UserDesc
        };

        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/user",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken,
            },
            method:"POST",
            json:true,
            body:querystring.stringify(queryInfo)
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              try{
                let message = "Check Token Succeed: " + body.username;
                console.log(message);
                resolve(body);
              }catch(e){
                let message = new Object();
                message.error = body;
                console.log(body);
                resolve(message);
              }
            }else{
              let message = new Object();
              if (!err){
                console.log("Create User Account Failed, Reason: %s", JSON.stringify(body));
                message.error = JSON.stringify(body);
                resolve(message);
              }else{
                console.log("Create User Account Failed");
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
          });
    })
}
  
/**
 * @method editUserAccount
 * @deprecated Modify User Account
 * @param response
 * @param userInfo  {Object}
 */
  UserAuthenticationManager.prototype.editUserAccount = function(grantType, userInfo){
    return new Promise((resolve, reject) => {
        let queryInfo = {
            "userId":userInfo.UserID,
            "username":userInfo.UserName,
            "createBy":userInfo.UserCreator,
            "description":userInfo.UserDesc
        };

        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/user",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken,
            },
            method:"PUT",
            json:true,
            body:querystring.stringify(queryInfo)
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              try{
                console.log("Edit User(%s) Succeed.", body.username);
                resolve(body);
              }catch(e){
                let message = new Object();
                message.error = body;
                console.log(body);
                resolve(message);
              }
            }else{
              let message = new Object();
              if (!err){
                console.log("Modify User Account Failed, Reason: %s", body);
                message.error = body;
                resolve(message);
              }else{
                console.log("Modify User Account Failed");
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
  }
  
/**
 * @method RemoveUserAccount
 * @deprecated Delete User Account
 * @param response
 * @param userInfo  {Object}
 */
  UserAuthenticationManager.prototype.deleteUserAccount = function(grantType, userInfo){
    return new Promise((resolve, reject) => {
        let queryInfo = {
            "userId":userInfo.UserID
        };

        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/user",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken,//supperToken
            },
            method:"DELETE",
            json:true,
            body:querystring.stringify(queryInfo)
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              try{
                console.log("Delete User(%s) Succeed.", body.username);
                resolve(body);
              }catch(e){
                let message = new Object();
                message.error = body;
                console.log(body);
                resolve(message);
              }
            }else{
              let message = new Object();
              if (!err){
                console.log("Delete User Account Failed, Reason: %s", body);
                message.error = body;
                resolve(message);
              }else{
                console.log("Delete User Account Failed");
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
}
  
/**
 * @method queryUserAccount
 * @deprecated Query User Account
 * @param response
 * @param userInfo  {object}
 */
  UserAuthenticationManager.prototype.queryUserAccount = function(grantType, userInfo){
    return new Promise((resolve, reject) => {
        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/user?userid=" + userInfo.UserID,
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken,
            },
            method:"GET",
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              try{
                let result = JSON.parse(body);
                let message = "Check Token Succeed: " + result.username;
                console.log(message);
                resolve(result);
              }catch(e){
                let message = new Object();
                message.error = body;
                console.log(body);
                resolve(message);
              }
            }else{
              let message = new Object();
              if (!err){
                console.log("Query User Account Failed, Reason: %s", body); 
                message.error = body;
                resolve(message);
              }else{
                console.log("Query User Account Failed, Reason: %s", JSON.stringify(err));
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
}
  
UserAuthenticationManager.prototype.resetUserPassword = function(grantType, userInfo){
  return new Promise((resolve, reject) => {
    let result = httpRequest({
        url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/userResetPassword?userId=" + userInfo.UserID + "&password=" + userInfo.Password,
        headers:{
          "content-type":"application/x-www-form-urlencoded",
          "Authorization":"Bearer " + userInfo.accessToken,
        },
        method:"POST",
      }, function(err, res, body){
        if (!err && res.statusCode == 200){
          try{
            let result = JSON.parse(body);
            console.log("Modify User Password Succeed.");
            resolve(result);
          }catch(e){
            let message = new Object();
            message.error = body;
            console.log(body);
            resolve(message);
          }
        }else{
          let message = new Object();
          if (!err){
            console.log("Reset User Account Password Failed, Reason: %s", body); 
            message.error = body;
            resolve(message);
          }else{
            console.log("Reset User Account Password Failed, Reason: %s", JSON.stringify(err));
            message.error = JSON.stringify(err);
            resolve(message);
          }
        }
    });
  })
}

UserAuthenticationManager.prototype.modifyUserPassword = function(grantType, userInfo){
  return new Promise((resolve, reject) => {
    let result = httpRequest({
        url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/userPassword?userId=" + userInfo.UserID + "&password=" + userInfo.Password,
        headers:{
          "content-type":"application/x-www-form-urlencoded",
          "Authorization":"Bearer " + userInfo.accessToken,
        },
        method:"POST",
      }, function(err, res, body){
        if (!err && res.statusCode == 200){
          try{
            let result = JSON.parse(body);
            console.log("Modify User Password Succeed.");
            resolve(result);
          }catch(e){
            let message = new Object();
            message.error = body;
            console.log(body);
            resolve(message);
          }
        }else{
          let message = new Object();
          if (!err){
            console.log("Modify User Account Password Failed, Reason: %s", body); 
            message.error = body;
            resolve(message);
          }else{
            console.log("Modify User Account Password Failed, Reason: %s", JSON.stringify(err));
            message.error = JSON.stringify(err);
            resolve(message);
          }
        }
    });
  })
}

/**
 * @method creatUserGroup
 * @description Create User Group
 * @param userGroupInfo {object}
 */
UserAuthenticationManager.prototype.creatUserGroup =  function(grantType, userGroupInfo){
	  return new Promise((resolve, reject) => {
		let queryInfo = {
            "groupname":userGroupInfo.groupName,
            "description":userGroupInfo.description
        };

        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/group",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken,
            },
            method:"POST",
            json:true,
            body:querystring.stringify(queryInfo)
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
                //response.send(JSON.stringify(body));
                resolve(body);
                console.log("Create User Group Succeed, UserInfo: " + JSON.stringify(body));
            }else{
              let message = new Object();
              if (!err){
                console.log("Create User Group Failed, Reason: " + JSON.stringify(body));
                
                message.error = JSON.stringify(body);
                resolve(message);
                //response.send(JSON.stringify(message));
              }else{
                console.log("Create User Group Failed, Reason: " + JSON.stringify(err));
                
                message.error = JSON.stringify(err);
                //response.send(JSON.stringify(message));
                resolve(message);
              }
            }
          });
	  })
}
  
/**
 * @method editUserGroup
 * @description Modidy User Group
 * @param userGroupInfo {object}
 */
UserAuthenticationManager.prototype.editUserGroup = function(grantType, userGroupInfo){
    return new Promise((resolve, reject) => {
        let queryInfo = {
            "groupid":userGroupInfo.groupID,
            "groupname":userGroupInfo.groupName,
            "ownerid":userGroupInfo.ownerid,
            "description":userGroupInfo.description
        };

        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/group",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken,
            },
            method:"PUT",
            json:true,
            body:querystring.stringify(queryInfo)
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              //response.send(JSON.stringify(body));
              resolve(body);
              console.log("Modify User Account Succeed, Information: " + JSON.stringify(body));
            }else{
              let message = new Object();
              if (!err){
                console.log("Modify User Account Failed, Reason: " + JSON.stringify(body));
                
                message.error = JSON.stringify(body);
                resolve(message);
              }else{
                console.log("Modify User Account Failed, Reason: " + JSON.stringify(err));
                
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
}
  
/**
 * @method RemoveUserGroup
 * @description Delete User Group
 * @param groupId {string}
 */
UserAuthenticationManager.prototype.deleteUserGroup = function(grantType, groupId){
    return new Promise((resolve, reject) => {
        let queryInfo = {
            "groupid":groupId
        };

        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/group",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken,//supperToken
            },
            method:"DELETE",
            json:true,
            body:querystring.stringify(queryInfo)
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              resolve(body);
              //Node插件删除SQLite数据库中数据
        
              console.log("Delete User Account Succeed, Information: " + JSON.stringify(body));
            }else{
              let message = new Object();
              if (!err){
                console.log("Delete User Account Failed, Reason: " + JSON.stringify(body));
                
                message.error = JSON.stringify(body);
                resolve(message);
              }else{
                console.log("Delete User Account Failed, Reason: " + JSON.stringify(err));
                
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
}
  
/**
 * @method queryUserGroup
 * @description Query User Group
 * @param groupId {string}
 */
  UserAuthenticationManager.prototype.queryUserGroup = function(grantType, groupId){
    return new Promise((resolve, reject) => {
        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/user?groupid=" + groupId,
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken,//supperToken
            },
            method:"GET",
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              resolve(body);
        
              console.log("Query User Account Succeed, Information: " + JSON.stringify(body));
            }else{
              let message = new Object();
              if (!err){
                console.log("Query User Account Failed, Reason: " + JSON.stringify(body));
                
                message.error = JSON.stringify(body);
                resolve(message);
              }else{
                console.log("Query User Account Failed, Reason: " + JSON.stringify(err));
                
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
}
  
/**
 * @method queryUserInfo
 * @description Query User Information
 * @param token {string}
 */
  UserAuthenticationManager.prototype.queryUserInfo = function(grantType, userInfo){
    return new Promise((resolve, reject) => {
        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/info",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken,
            },
            method:"GET",
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              resolve(body);
        
              console.log("Query User Information Succeed, Information: " + JSON.stringify(body));
            }else{
              let message = new Object();
              if (!err){
                console.log("Query User Information Failed, Reason: " + JSON.stringify(body));
                
                message.error = JSON.stringify(body);
                resolve(message);
              }else{
                console.log("Query User Information Failed, Reason: " + JSON.stringify(err));
                
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
}
  
/**************************************************************使用，获取用户列表
 * @method queryUserList
 * @description Query User List
 * @param userGroupId {string}
 */
  UserAuthenticationManager.prototype.queryUserList = function(grantType, userGroupInfo){
    return new Promise((resolve, reject) => {
        let result = httpRequest({
            url:"http://" + oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/api/v1/userList",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userGroupInfo.accessToken
            },
            method:"GET",
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              let result = JSON.parse(body);
              resolve(result);
              // console.log(body);
              //  console.log("Query Userlist Succeed, Information: " + JSON.stringify(body));
            }else{
              let message = new Object();
              if (!err){
                console.log("Query Userlist Failed, Reason: " + JSON.stringify(body));
                
                message.error = JSON.stringify(body);
                resolve(message);
              }else{
                console.log("Query Userlist Failed, Reason: " + JSON.stringify(err));
                
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
}
  
/**
 * @method queryGroupList
 * @description Query Group List
 * @param userGroupId {string}
 */
  UserAuthenticationManager.prototype.queryGroupList = function(grantType, userInfo){
    return new Promise((resolve, reject) => {
        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/groupList?groupId=" + userInfo.userId,
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken
            },
            method:"GET",
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              resolve(body);
        
              console.log("Query Grouplist Succeed, Information: " + JSON.stringify(body));
            }else{
              let message = new Object();
              if (!err){
                console.log("Query Grouplist Failed, Reason: " + JSON.stringify(body));
                
                message.error = JSON.stringify(body);
                resolve(message);
              }else{
                console.log("Query Grouplist Failed, Reason: " + JSON.stringify(err));
                
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
}
  
/**
 * @method queryClientList
 * @description Query Client List
 * @param userGroupId {string}
 */
  UserAuthenticationManager.prototype.queryClientList = function(grantType, userInfo){
    return new Promise((resolve, reject) => {
        let result = httpRequest({
            url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/api/v1/clientList",
            headers:{
              "content-type":"application/x-www-form-urlencoded",
              "Authorization":"Bearer " + userInfo.accessToken
            },
            method:"GET",
          }, function(err, res, body){
            if (!err && res.statusCode == 200){
              resolve(body);
        
              console.log("Query Clientlist Succeed, Information: " + JSON.stringify(body));
            }else{
              let message = new Object();
              if (!err){
                console.log("Query Clientlist Failed, Reason: " + JSON.stringify(body));
                
                message.error = JSON.stringify(body);
                resolve(message);
              }else{
                console.log("Query Clientlist Failed, Reason: " + JSON.stringify(err));
                
                message.error = JSON.stringify(err);
                resolve(message);
              }
            }
        });
    })
}

function getRegist2OAuthResult(){
  try {
    var strJson = fs.readFileSync(path.resolve(__dirname,"../config/serverconfig.json"), 'utf-8');
  } catch (error) {
    return {};
  }
    
  if (strJson != "")
  {
      try {
        return JSON.parse(strJson).AppRegesterInfo;
      } catch (e) {
        
      }
  }else{
    var result = new Object;
    result.ClientID = "";
    result.ClientSecret = "",
    result.RedirectURL = "http://127.0.0.1:8888";
    result.Router = "/code";
    return result;
  }
}

function getOAuthServerConfig(){
  try {
    var strJson = fs.readFileSync(path.resolve(__dirname,"../config/serverconfig.json"), 'utf-8');
  } catch (error) {
    var result = new Object;
    result.ip = "127.0.0.1";
    result.port = 9000;
    result.OauthMode = 0;
    return result;
  }  
  if (strJson != "")
  {
      try {
        return JSON.parse(strJson).OAuthServer;            
      } catch (e) {
          var result = new Object;
          result.ip = "127.0.0.1";
          result.port = 9000;
          result.OauthMode = 0;
          return result;
      }
  }else{
    var result = new Object;
    result.ip = "127.0.0.1";
    result.port = 9000;
    result.OauthMode = 0;
    return result;
  }
}

function getOAuthServerConfigForKF36(){
   let strJson;
  try {
    strJson = fs.readFileSync(path.resolve(__dirname,"../../../../../config/devconfig.json"), 'utf-8');
  } catch (e) {
    var result = new Object;
    var devCenterPortShift = new Object();
    devCenterPortShift.kingoauth = 5;
    result.devCenterPortShift = devCenterPortShift;
    result.devCenterAddress = "127.0.0.1";
    result.opsCenterAddress = "127.0.0.1";
    result.startport = 11001;
    result.OauthMode = 0;
    return result;
  }
  if (strJson != "")
  {
      try {
        var oauthInfo = JSON.parse(strJson);
        return oauthInfo;            
      } catch (e) {
          var result = new Object;
          var devCenterPortShift = new Object();
          devCenterPortShift.kingoauth = 5;
          result.devCenterPortShift = devCenterPortShift;
          result.devCenterAddress = "127.0.0.1";
          result.opsCenterAddress = "127.0.0.1";
          result.startport = 11001;
          result.OauthMode = 0;
          return result;
      }
  }else{
    var result = new Object;
    var devCenterPortShift = new Object();
    devCenterPortShift.kingoauth = 5;
    result.devCenterPortShift = devCenterPortShift;
    result.devCenterAddress = "127.0.0.1";
    result.opsCenterAddress = "127.0.0.1";
    result.startport = 11001;
    result.OauthMode = 0;
    return result;
  }
}//add by xin.wang

function getCommonConfigForKF36(){
  let strJson;
 try {
   strJson = fs.readFileSync(path.resolve(__dirname,"../../../../../config/common.json"), 'utf-8');
 } catch (e) {
   var commonObj = {
        solutions:{
            solutionName:"Demo",
            GUID:"c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190",
            createTime:"2019-11-01 10:17:45",
            description:""
        },
        tenant:{
            tenantId:"c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
        }
      }
   return commonObj;
 }
 if (strJson != "")
 {
     try {
       var oauthInfo = JSON.parse(strJson);
       return oauthInfo;            
     } catch (e) {
          var commonObj = {
            solutions:{
                solutionName:"Demo",
                GUID:"c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190",
                createTime:"2019-11-01 10:17:45",
                description:""
            },
            tenant:{
                tenantId:"c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
            }
          }
        return commonObj;
     }
 }else{
      var commonObj = {
        solutions:{
            solutionName:"Demo",
            GUID:"c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190",
            createTime:"2019-11-01 10:17:45",
            description:""
        },
        tenant:{
            tenantId:"c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
        }
      }
    return commonObj;
 }
}//add by xin.wang
/**
 * @method queryGroupListAll
 * @description Query All Group List
 * @param 
 */
UserAuthenticationManager.prototype.queryGroupListAll = function(grantType, userInfo){
  return new Promise((resolve, reject) => {
      let result = httpRequest({
          url:"http://" + oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/api/v1/grouplist",
          headers:{
            "content-type":"application/x-www-form-urlencoded",
            "Authorization":"Bearer " + userInfo.accessToken
          },
          method:"GET",
        }, function(err, res, body){
          if (!err && res.statusCode == 200){
            resolve(body);
      
            console.log("Query Grouplist Succeed"); //, Information: " + JSON.stringify(body));
          }else{
            let message = new Object();
            if (!err){
              console.log("Query Grouplist Failed, Reason: " + JSON.stringify(body));
              
              message.error = JSON.stringify(body);
              resolve(message);
            }else{
              console.log("Query Grouplist Failed, Reason: " + JSON.stringify(err));
              
              message.error = JSON.stringify(err);
              resolve(message);
            }
          }
      });
  })
}

/************************************************************获取refresh token
 * @method updateTokenAccount
 * @deprecated Check User Account Invaid
 * @param response
 * @param grantType {number}
 * @param userInfo  {Object}
 * @note 生成token
 */
UserAuthenticationManager.prototype.updateTokenAccount = function(grantType, userInfo){
  return new Promise((resolve, reject) => {
      let queryInfo = {
          "grant_type":"refresh_token",
          "client_id":oauthServerInfoKF36.oauthClient.clientId,
          "client_secret":oauthServerInfoKF36.oauthClient.clientSecret,
          "refresh_token":userInfo.RefreshToken,
          "tenantId": commonConfigKF36.tenant.tenantId
      };

      let result = httpRequest({
        url:"http://" +  oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/oauth/token",
          // url:"http://" + oauthServerInfo.ip + ":" + oauthServerInfo.port + "/oauth/token",
          headers:{
            "content-type":"application/x-www-form-urlencoded",
          },
          method:"POST",
          json:true,
          body:querystring.stringify(queryInfo)
        }, function(err, res, body){
          if (!err && res.statusCode == 200){
            if (typeof(body) == "object" && Object.prototype.toString.call(body).toLowerCase() == "[object object]" && !body.length){
              // body.UserName = userInfo.UserName;
              console.log("User(%s) updateTokenAccount Succeed!");
              resolve(body);
            }else{
              let message = new Object();
              message.error = body;
              console.log(body);
              resolve(message);
            }
          }else{
              let message = new Object();
              console.log(body);
              message.error = "User updateTokenAccount Failed!";
              resolve(message);
          }
      });
  })
}

/************************************************************注销token
 * @method loginOutTokenAccount
 * @deprecated Check User Account Invaid
 * @param response
 * @param grantType {number}
 * @param userInfo  {Object}
 * @note 生成token
 */
UserAuthenticationManager.prototype.loginOutTokenAccount = function(grantType, userInfo){
  return new Promise((resolve, reject) => {
      let queryInfo = {
          "access_token":userInfo.AccessToken,
          "refresh_token":userInfo.RefreshToken,
      };
      let result = httpRequest({
        url:"http://" +  oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/loginOut",
          headers:{
            "content-type":"application/x-www-form-urlencoded",
          },
          method:"POST",
          json:true,
          body:querystring.stringify(queryInfo)
        }, function(err, res, body){
          if (!err && res.statusCode == 200){
            if (typeof(body) == "object" && Object.prototype.toString.call(body).toLowerCase() == "[object object]" && !body.length){
              console.log("User(%s) loginOutTokenAccount Succeed!");
              resolve(body);
            }else{
              let message = new Object();
              message.error = body;
              console.log(body);
              resolve(message);
            }
          }else{
              let message = new Object();
              console.log(body);
              message.error = "User loginOutTokenAccount Failed!";
              resolve(message);
          }
      });
  })
}

/************************************************************获取用户资源树
 * @method queryUserTree
 * @deprecated Query user resources tree
 * @param response
 * @param grantType {number}
 * @param userInfo  {Object}
 * @note 获取用户资源树
 */
UserAuthenticationManager.prototype.queryUserTree = function (grantType, userInfo) {
  return new Promise((resolve, reject) => {
      let result = httpRequest({
        url:"http://" +  oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/api/v1/organizationTree",
          headers:{
            "content-type":"application/x-www-form-urlencoded",
            "Authorization":"Bearer " + userInfo.accessToken
          },
          method:"GET",
          json:true
        }, function(err, res, body){
          if (!err && res.statusCode == 200){
            if (typeof(body) == "object" && Object.prototype.toString.call(body).toLowerCase() == "[object object]" && !body.length){
              console.log("User(%s) queryUserTree Succeed!");
              resolve(body);
            }else{
              let message = new Object();
              message.error = body;
              console.log(body);
              resolve(message);
            }
          }else{
              let message = new Object();
              console.log(body);
              message.error = "User queryUserTree Failed!";
              resolve(message);
          }
      });
  })
}

/************************************************************获取用户类别树
* @method queryUserCatagoryTree
* @deprecated Query user catagory tree
* @param response
* @param grantType {number}
* @param userInfo  {Object}
* @note 获取用户类别树
*/
UserAuthenticationManager.prototype.queryUserCatagoryTree = function (grantType, userInfo) {
  return new Promise((resolve, reject) => {
    let result = httpRequest(
      {
        url:"http://" +  oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/api/v1/categoryList",
        headers:{
          "content-type":"application/x-www-form-urlencoded",
          "Authorization":"Bearer " + userInfo.accessToken
        },
        method:"GET",
        json:true
      }, 
      function(err, res, body){
        if (!err && res.statusCode == 200){
          //console.log(JSON.stringify(body, "", "\t"));
          if (typeof(body) == "object" && Object.prototype.toString.call(body).toLowerCase() == "[object object]" && !body.length){
            console.log("queryUserCatagoryTree Succeed!");
            // 先写个假的结果
            /* var objFakeRes = {
              "status": 200,
              "msg": "success",
              "data": [
                  {
                      "categoryId": 1,
                      "categoryName": "A",
                      "tenantId": "c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
                  },
                  {
                      "categoryId": 2,
                      "categoryName": "B",
                      "tenantId": "c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
                  },
                  {
                      "categoryId": 3,
                      "categoryName": "C",
                      "tenantId": "c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
                  },
                  {
                      "categoryId": 4,
                      "categoryName": "D",
                      "tenantId": "c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
                  },
                  {
                      "categoryId": 5,
                      "categoryName": "E",
                      "tenantId": "c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
                  },
                  {
                      "categoryId": 6,
                      "categoryName": "F",
                      "tenantId": "c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
                  },
                  {
                      "categoryId": 7,
                      "categoryName": "J",
                      "tenantId": "c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
                  },
                  {
                      "categoryId": 8,
                      "categoryName": "H",
                      "tenantId": "c7f1771f-0c8f-4c75-9d71-3b8c4b6bd190"
                  }
              ]
            };
            resolve(objFakeRes); */
            resolve(body);
          }else{
            let message = new Object();
            message.error = body;
            console.log(body);
            resolve(message);
          }
        }else{
            let message = new Object();
            console.log(body);
            message.error = "User queryUserCatagoryTree Failed!";
            resolve(message);
        }
      }
    )
  })
}

/************************************************************获取auth工程权限
* @method getProjectAuth
* @deprecated get project authority
* @param response
* @param userInfo  {Object}
* @note 获取auth工程权限
*/
UserAuthenticationManager.prototype.getProjectAuth = function (userInfo) {
  return new Promise((resolve, reject) => {
    let result = httpRequest(
      {
        url:"http://" + oauthServerInfoKF36.devCenterAddress + ":" + (Number(oauthServerInfoKF36.startport) + Number(oauthServerInfoKF36.devCenterPortShift.kingoauth)) + "/api/v1/authority",
        headers:{
          "content-type":"application/x-www-form-urlencoded",
          "Authorization":"Bearer " + userInfo.oauth.access_token
        },
        method:"GET",
        json:true,
        rejectUnauthorized:false
      }, 
      function(err, res, body){
        if (!err && res.statusCode == 200){
          //console.log(JSON.stringify(body, "", "\t"));
          if (typeof(body) == "object" && Object.prototype.toString.call(body).toLowerCase() == "[object object]" && !body.length){
            resolve(body);
          }else{
            let message = new Object();
            message.error = body;
            console.log(body);
            resolve(message);
          }
        }else{
            let message = new Object();
            console.log(body);
            message.error = "User getProjectAuth Failed!";
            message.msg = (err != null) ? err.message:body;
            message.statusCode = res.statusCode;
            resolve(message);
        }
      }
    )
  })
}

module.exports = UserAuthenticationManager
