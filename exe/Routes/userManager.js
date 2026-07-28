var fs = require('fs');
var path = require('path');

var AuthenticSystem = require('./OAuthenicSystemInterface');
var userAuthenticSystem = new AuthenticSystem();
var pubInterClass = require('./PublicInterface');
var publicInterface = new pubInterClass();
var httpRequest = require('request');
var LogManager = require('./LogInterface');//日志接口
var UserLogManagerObj = new LogManager();
var gws;
// var WebSocketServer = require('ws').Server,wss = new WebSocketServer({ port:9000});
// wss.on('connection',function(ws){
//     gws = ws;
//     console.log('client connected');
//     ws.on('message',function(message){

//     })
// });


//工程文件路径
var delTempPath = path.resolve(__dirname,"../../config/externalConfig.json");
var projectFileURL = JSON.parse(fs.readFileSync(delTempPath, 'utf-8'));

var Mode = getOAuthType();

function userManager(){

}

/* userManager.prototype.ckeckstatus = function(obj){   
    obj.mainSocketIO.on('sendToServer',async function(data1,data2,data3){
        UserLogManagerObj.debugLog("socketio:","enter checkstatus");
        UserLogManagerObj.debugLog("socketio:", "token=" + data1 + ";ip=" + data2 + ";useragent=" + data3);
        let resdata = await userAuthenticSystem.checkState(data1,data2,data3);
        var result = JSON.stringify(resdata);
        UserLogManagerObj.debugLog("checkstatus result:",result);
        if (typeof(resdata) == "object" && !resdata.length){
            if(resdata.errorCode == 0){
                obj.mainSocketIO.emit('sendToClient',resdata);
            }else{
                obj.mainSocketIO.emit('sendToClient','查询失败');
                console.log('状态查询失败');
            }
        }else{
        obj.mainSocketIO.emit('sendToClient',resdata.error)
        }
    })
} */

 
//查看标准权限文件中 工程组是否可写
function checkProjectGroupWritableM(projectGroupName, userName, fileObj){
    if(!fileObj || !projectGroupName || !userName){
        console.log("checkProjectGroupReadable faile, error param");
        return false;
    }
    var hasUser = 0;
    for(var i = 0; i < fileObj.authority.length; i++){
        if(userName == fileObj.authority[i].UserName){
        var hasAuthority = 0;
        for(var j = 0; j < fileObj.authority[i].UserAuthority.length; j++){
            if(fileObj.authority[i].UserAuthority[j].ProjectGroupName == projectGroupName && fileObj.authority[i].UserAuthority[j].ReadAndWrite == 1){
            return true;
            }
        }
        return false;//用户下没有满足条件的权限工程，认为无权限
        }
    }
    //没有找到此用户认为无权限
    return false;
}

//查看标准权限文件中 工程是否可写
function checkProjectWritableM(projectName, userName, fileObj, projectGroupName){
    if(!fileObj || !projectName || !userName ){
        console.log("checkProjectReadable faile, error param");
        return false;
    }
    var hasUser = 0;
    for(var i = 0; i < fileObj.authority.length; i++){
        if(userName == fileObj.authority[i].UserName){
        var hasAuthority = 0;
        for(var j = 0; j < fileObj.authority[i].UserAuthority.length; j++){
            if(projectGroupName != undefined && fileObj.authority[i].UserAuthority[j].ProjectGroupName != undefined && fileObj.authority[i].UserAuthority[j].ProjectGroupName == projectGroupName ){
                var hasProjects = 0;
                for(var k = 0; k < fileObj.authority[i].UserAuthority[j].Projects.length; k++){
                if(fileObj.authority[i].UserAuthority[j].Projects[k].ProjectName == projectName){
                    if( fileObj.authority[i].UserAuthority[j].Projects[k].ReadAndWrite == 1){
                    return true;
                    }else{
                    return false;
                    }
                    hasProjects = 1;
                }
                }
                if(hasProjects == 0){//应该不用判断了
                if( fileObj.authority[i].UserAuthority[j].ReadAndWrite == 1){
                    return true;
                }else{
                    return false;
                }
                }
            }
            if(undefined == projectGroupName && fileObj.authority[i].UserAuthority[j].ProjectName == projectName){//根结点下的工程
            if(fileObj.authority[i].UserAuthority[j].ReadAndWrite == 1){
                return true;
            }else{
                return false;
            }
            }
        }
        return false;//用户下没有满足条件的权限工程，认为无权限
        }
    }
    //没有找到此用户认为无权限
    return false;
}

userManager.prototype.checkUserAccount = async function(res, userInfo){//------------------------------------暂时使用
    let result = new Object();
    if (Mode == 1){
        result = await userAuthenticSystem.checkUserAccount("password", userInfo);
        if (result.error != undefined){
            res.send(result)
            return;
        }

        //从用户系统中获取用户和登录信息
        //KingUserManager.UserLogin(userInfo, loginInfo);
        //result.currentLoginIP = loginInfo.currentLoginIP;
        //result.lastLoginIP = loginInfo.lastLoginIP;
    }

    var loginInfo = new Object();
    loginInfo.CurrentLoginIP = userInfo.CurrentLoginIP;
    // let ret = KingUserManager.UserLogin(userInfo, loginInfo);
    // if (ret != 0){
    //     result.error = "UerName or Password Error!";
    // }else{
    //     result.UserID = userInfo.UserID;
    //     result.UserGroup = userInfo.UserGroup;
    //     result.UserAuth = userInfo.UserAuth;
    //     result.UserName = userInfo.UserName;
    //     result.CurrentLoginIP = loginInfo.CurrentLoginIP;
    //     result.LastLoginIP = loginInfo.LastLoginIP;
    //     result.UserType = userInfo.UserType;
    //     result.LastLoginIP = loginInfo.LastLoginIP;//add by xin.wang 19/11/12
	// 	result.LastLoginTime = loginInfo.LastLoginTime;//add by xin.wang 19/11/12
	// 	result.ErrorCounter = loginInfo.ErrorCounter;//add by xin.wang 19/11/12
    // }
    
    res.send(JSON.stringify(result));
}

userManager.prototype.checkUserTokenIsValid = async function(res, userInfo){//----------------------------------使用，验证token
    let result = new Object();
    if (Mode == 1){
        var currentTimeTicks = new Date().getTime();
        result = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (result.error != undefined){ /* && global.oauthInfo.expires_in <= currentTimeTicks){ */
            let getRefreshToken = await userAuthenticSystem.updateTokenAccount("refresh_token", userInfo);
            if(getRefreshToken.error != undefined){
                let strJson = publicInterface.readJson(path.resolve(__dirname,"../../../../../config/devconfig.json"));
                if (strJson.Error) {
                    result.error = strJson.ErrorDesc;
                    res.send(result);
                    return;
                }
                let serverObj = strJson.data;
                /* let strJson = fs.readFileSync(path.resolve(__dirname,"../../../../../config/devconfig.json"), 'utf-8');
                let serverObj = JSON.parse(strJson); */
                result.oauthURL = serverObj.redirectUrl.loginURL;
                result.error = "token is invaild";
                res.send(result);
                return;
            }else{
                userInfo.accessToken = getRefreshToken.access_token;
                userInfo.RefreshToken = getRefreshToken.refresh_token;
                result = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
                result.CheckType = 'newToken';
                global.oauthInfo.expires_in = result.oauth != undefined ? result.oauth.expires_in : 0;
                console.log("过期时间=" + global.oauthInfo.expires_in);
                global.oauthInfo.checkTokenFlag = true;
                global.oauthInfo.access_token = result.oauth != undefined ? result.oauth.access_token : 0;
                global.oauthInfo.refresh_token = result.oauth != undefined ? result.oauth.refresh_token : 0;
            }//add by xin.wang 0608
            // let strJson = fs.readFileSync(path.resolve(__dirname,"../../../../../config/devconfig.json"), 'utf-8');
            // let serverObj = JSON.parse(strJson);
            // result.oauthURL = serverObj.redirectUrl.loginURL;
            // result.error = "token is invaild";
            // res.send(result);
            // return;
        } /* else if (result.error != undefined && global.oauthInfo.expires_in > currentTimeTicks) {
            global.oauthInfo.access_token = userInfo.accessToken;
            global.oauthInfo.refresh_token = userInfo.RefreshToken;
            global.oauthInfo.checkTokenFlag = true;
            result.CheckType = 'oldToken';
        }  */else{//add by xin.wang 0608
            global.oauthInfo.expires_in = result.oauth != undefined ? result.oauth.expires_in : 0;
            console.log("过期时间=" + global.oauthInfo.expires_in);
            global.oauthInfo.access_token = userInfo.accessToken;
            global.oauthInfo.refresh_token = userInfo.RefreshToken;
            global.oauthInfo.checkTokenFlag = true;
            result.CheckType = 'oldToken';
        }

        //将token和refreshToken写到配置文件里
        let strJsonPath = "../config/externalConfig.json";
        let objReadJson = publicInterface.readJson(strJsonPath);
        if (objReadJson.Error) {
            result.oauthURL = "/login";
            result.error = objReadJson.ErrorDesc;
            res.send(result);
            return;
        }
        let objExternalJson = objReadJson.data;
        objExternalJson.accessToken = global.oauthInfo.access_token;
        objExternalJson.refreshToken = global.oauthInfo.refresh_token;
        objExternalJson.checkTokenFlag = global.oauthInfo.checkTokenFlag
        objExternalJson.expires_in = global.oauthInfo.expires_in;
        let strWrite = publicInterface.writeJson(strJsonPath, objExternalJson);

        //根据token获取租户id和工程文件路径
        let objJson = publicInterface.readJson("../../../../config/devconfig.json");
        if (objJson.Error) {
            result.oauthURL = "/login";
            result.error = "get Tenant failed";
            res.send(result);
            return;
        }
        var authPort = objJson.data.startport + objJson.data.devCenterPortShift.kingoauth;
        //getTenantIDSdb(objJson.data.devCenterAddress, objJson.data.startport + objJson.data.devCenterPortShift.kingoauth, global.oauthInfo.access_token);
        httpRequest({
            url:"http://" + objJson.data.devCenterAddress + ":" + authPort + "/api/v1/loginInfo",
            headers:{
                "content-type":"application/x-www-form-urlencoded",
                "Authorization":"Bearer " + global.oauthInfo.access_token,
            },
            method:"GET",
            json:true,
            // body:querystring.stringify(queryInfo)
            }, 
            function(err, resInfo, body){
                //console.log("/api/v1/loginInfo:" + JSON.stringify(resInfo));
                if (!err && resInfo.statusCode == 200){
                    var strTenantID = body.data.tenantId;
                    let objCommonJson = publicInterface.readJson("../../../../config/common.json");
                    let strSolutionID = "";
                    if (!objCommonJson.Error && objCommonJson.data.tenant && objCommonJson.data.tenant.tenantId) {
                        /* if (objCommonJson.data.tenant.tenantId != strTenantID) {
                            objCommonJson.data.tenant.tenantId = strTenantID;
                            publicInterface.writeJson("../../../../config/common.json", objCommonJson.data);
                        } */
                        strSolutionID = objCommonJson.data.solutions.GUID;
                    }
                    var strProjectDir = "../../../../sdb";
                    let strProjectPath = strProjectDir + "/" + strTenantID + "/" + strSolutionID + "/kingioserver";
                    global.sdbPath = strProjectPath;
                    global.tenantID = strTenantID;//将当前租户ID添加到全局变量中
                    global.solutionID = strSolutionID;//将当前解决方案ID添加到全局变量中
                    let resMake = makePRoPath(strProjectPath);
                    if (resMake != "OK"){
                        result.oauthURL = objJson.data.redirectUrl.loginURL;
                        result.error = resMake;
                    }
                    res.send(result)
                    return;
                } else {
                    result.oauthURL = objJson.data.redirectUrl.loginURL;
                    result.error = body;
                    res.send(result);
                }
            }
        );
    }
}

//根据token获取租户id和工程文件路径
/* function getTenantIDSdb(authIP, authPort, accessToken) {
    httpRequest({
        url:"http://" + authIP + ":" + authPort + "/api/v1/loginInfo",
        headers:{
            "content-type":"application/x-www-form-urlencoded",
            "Authorization":"Bearer " + accessToken,
        },
        method:"GET",
        json:true,
        // body:querystring.stringify(queryInfo)
        }, 
        function(err, res, body){
            if (!err && res.statusCode == 200){
                var strTenantID = body.data.tenantId;
                let objCommonJson = publicInterface.readJson("../../../../config/common.json");
                let strSolutionID = "";
                if (!objCommonJson.Error && objCommonJson.data.tenant && objCommonJson.data.tenant.tenantId) {
                    if (objCommonJson.data.tenant.tenantId != strTenantID) {
                        objCommonJson.data.tenant.tenantId = strTenantID;
                        publicInterface.writeJson("../../../../config/common.json", objCommonJson.data);
                    }
                    strSolutionID = objCommonJson.data.solutions.GUID;
                }
                var strProjectDir = "../../../../sdb";
                let strProjectPath = strProjectDir + "/" + strTenantID + "/" + strSolutionID + "/kingioserver";
                global.sdbPath = strProjectPath;
                makePRoPath(strProjectPath)
            }
        }
    );
} */

//创建工程目录和工程文件
function makePRoPath(strProjectPath) {
    //如果没有的话，就创建工程目录文件
    if (!fs.existsSync(strProjectPath)) {
        if (!publicInterface.recursiveMakeDir(strProjectPath)) {
            return "生成" + strProjectPath + "失败";                    
        }
    }
    if (!fs.existsSync(strProjectPath + "/ProjectGroupList.json")) {
        var objEmptyGroup = {"ProjectGroupList":[]};
        fs.writeFile(strProjectPath + "/ProjectGroupList.json", JSON.stringify(objEmptyGroup, "", "\t"), function (err) {
            if (err) {
                //return err.message;
                throw err;
            }
        })
    }
    
    if (!fs.existsSync(strProjectPath + "/CharacterInfo.json")) {
        var objEmptyAuth = {"authority":[]};
        fs.writeFile(strProjectPath + "/CharacterInfo.json", JSON.stringify(objEmptyAuth, "", "\t"), function (err) {
            if (err) {
                throw err;
            }
        })
    }
    
    if (!fs.existsSync(strProjectPath + "/permissConfig.json")) {
        var objEmptyPermiss = {"permissList":[]};
        fs.writeFile(strProjectPath + "/permissConfig.json", JSON.stringify(objEmptyPermiss, "", "\t"), function (err) {
            if (err) {
                throw err;
            }
        })
    }  

    var objExConfig = publicInterface.readJson("../config/externalConfig.json");
    if (!objExConfig.Error) {
        objExConfig.data.projectDir = strProjectPath;
    }
    else{
        return objExConfig.ErrorDesc;
    }
    let result = publicInterface.writeJson("../config/externalConfig.json", objExConfig.data);
    return result;
}

userManager.prototype.getAccessToken = async function(res, userInfo){
    if (Mode == 1){
        //检查Token是否过期
        /* let result = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (result.error != undefined){
            JSON.stringify(result);
            return result;
        }else{ */
        let result = await userAuthenticSystem.getUserAccountToken("password", userInfo);
        if (result.error != undefined){
            console.log(result.error);
            //res.send(result);
            //return;
            return result;
        }
        //}

        userInfo.accessToken = result.access_token;
        /* if (userInfo.accessToken != undefined){
            res.render("main");
        }else{
            // let strJson = fs.readFileSync('../config/externalConfig.json', 'utf-8');
            // let serverObj = JSON.parse(strJson);
            let strJson = fs.readFileSync('../../../../config/devconfig.json', 'utf-8');//add by xin.wang
            let serverObj = JSON.parse(strJson);
        
            // result.oauthURL = serverObj.oauth.host; 
            result.oauthURL = serverObj.redirectUrl.loginURL;
            result.error = "token is undefined";
            res.redirect(result.oauthURL);
        }*/
        return userInfo; 
    }
}

userManager.prototype.createUserAccount = async function(res, userInfo){
    var result = new Object();
    if (Mode == 1){
        //检查Token是否过期
        let result = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (result.error != undefined){
            JSON.stringify(result)
            return;
        }

        result = await userAuthenticSystem.createUserAccount("password", userInfo);
        if (result.error != undefined){
            res.send(JSON.stringify(result))
            return;
        }

        userInfo.UserID = result.userId;
    }

    // let ret = KingUserManager.CreateUserAccount(userInfo);
    // if (ret != 0){
    //     result.error = userInfo.Error;
    // }else{
    //     // result.UserName = userInfo.UserName;
    //     // result.UserID = userInfo.UserID;
    //     // result.UserType = userInfo.UserType;
    //     // result.UserDesc = userInfo.UserDesc;
    //     // result.UserCreator = userInfo.UserCreator;
    //     // result.UserCreateTime = userInfo.UserCreateTime;
    //     // result.UserAuth = userInfo.UserAuth;
    //     // result.UserAuthScope = userInfo.UserAuthScope;
    //     //result.error = "create user success!";
    // }
    
    res.send(JSON.stringify(result));
}

userManager.prototype.editUserAccount = async function(res, userInfo){
    var result = new Object();
    if (Mode == 1){
        //检查Token是否过期
        let userToken = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (userToken.error != undefined){
           res.send(JSON.stringify(userToken));
           return;
        }

        result = await userAuthenticSystem.editUserAccount("password", userInfo);
        if (result.error != undefined){
            res.send(JSON.stringify(result))
            return;
        }
    }

    // let ret = KingUserManager.EditUserAccount(userInfo, result);
    // if (ret != 0){
    //     result.error = "Edit User Information Failed!";
    // }
    
    res.send(JSON.stringify(result));
    return;
}

userManager.prototype.queryUserAccountForALL = async function(res, userInfo, obj){ //----------------------------使用，获取用户列表
    var result = new Object();
    if (Mode == 1){
        //检查Token是否过期
        // let userToken = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        // if (userToken.error != undefined){
        //     let strJson = fs.readFileSync(path.resolve(__dirname,"../../../../../config/devconfig.json"), 'utf-8');
        //     let serverObj = JSON.parse(strJson);
        //     userToken.oauthURL = serverObj.redirectUrl.loginURL;
        //     res.send(JSON.stringify(userToken));
        //     return;
        //  }


        let userGroupInfo = new Object;
        userGroupInfo = await userAuthenticSystem.queryUserList("password", userInfo);

        function recruiseAddField(newField ,copyField, childrenField, Arr){
            for(var i = 0; i < Arr.length; i++){
                if(Arr[i][childrenField] && Arr[i][childrenField].length != 0){
                    recruiseAddField(newField ,copyField, childrenField, Arr[i][childrenField]);
                }
                if(Arr[i][copyField] != undefined){
                    Arr[i][newField] = Arr[i][copyField];
                }
            }
        }
        recruiseAddField("text" , "userName", "group", userGroupInfo.data);
        recruiseAddField("id" , "userId", "group", userGroupInfo.data);
 
        var authorityValue = false;

        result.data = userGroupInfo.data;
        result.authorityValue = authorityValue;
        result.error = false;

    }else{
        result.data = "Mode config error";
        result.authorityValue = false;
        result.error = true;
    }
    // var tmp = JSON.stringify(result);
    obj.userInfo = result;
    res.send(JSON.stringify(obj));
    
}

userManager.prototype.queryUserAccount = async function(res, userInfo){ 
    var result = new Object();
    if (Mode == 1){
        //检查Token是否过期
        let userToken = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (userToken.error != undefined){
            res.send(JSON.stringify(userToken));
            return;
         }

        // result = await userAuthenticSystem.queryUserAccount("password", userInfo);
        // if (result.username == undefined){
        //     res.send("query user account failed!")
        //     return;
        // }
    }
    
    // let ret = KingUserManager.GetUserGroupInfo(userInfo.UserID, result);
    // if (ret != 0){
    //     result.error = "Query User Information Failed!";
    // }

    for(var i = 0; i< result.total; i++){
        result.rows[i].UserAuthName = "";
        if(result.rows[i].UserAuth & 0x01){
            if(result.rows[i].UserAuthName != ""){
                result.rows[i].UserAuthName += "|"
            }

            result.rows[i].UserAuthName += "查看";
        }
            
        if(result.rows[i].UserAuth & 0x02){
            if(result.rows[i].UserAuthName != ""){
                result.rows[i].UserAuthName += "|"
            }
            result.rows[i].UserAuthName += "采集控制";
        }

        if(result.rows[i].UserAuth & 0x04){
            if(result.rows[i].UserAuthName != ""){
                result.rows[i].UserAuthName += "|"
            }
            result.rows[i].UserAuthName += "工程部署";
        }

        if(result.rows[i].UserAuth & 0x08){
            if(result.rows[i].UserAuthName != ""){
                result.rows[i].UserAuthName += "|"
            }
            result.rows[i].UserAuthName += "工程操作";
        }

        if(result.rows[i].UserAuth & 0x10){
            if(result.rows[i].UserAuthName != ""){
                result.rows[i].UserAuthName += "|"
            }
            result.rows[i].UserAuthName += "授权";
        }
    }

    var tmp = JSON.stringify(result);
    res.send(tmp);
}

userManager.prototype.deleteUserAccount = async function(res, userInfo){
    var result = new Object();
    if (Mode == 1){
        //检查Token是否过期
        let userToken = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (userToken.error != undefined){
            res.send(JSON.stringify(userToken));
            return;
         }

        let result = await userAuthenticSystem.deleteUserAccount("password", userInfo);
        if (result.error != undefined){
            res.send(JSON.stringify(result));
            return;
        }
    }
    
    // let ret = KingUserManager.DeleteUserAccount(userInfo.UserID);
    // if (ret != 0){
    //     result.error = "delete user failed!";
    // }else{
    // }

    res.send(JSON.stringify(result));
}

userManager.prototype.modifyUserPassword = async function(res, oldUserInfo, userInfo){
    var result = new Object();
    if (Mode == 1){
        //检查Token是否过期
        let userToken = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (userToken.error != undefined){
            res.send(JSON.stringify(userToken));
            return;
         }

        let result = await userAuthenticSystem.modifyUserPassword("password", userInfo);
        if (result.username == undefined){
            res.send("delete user account failed!")
            return;
        }
    }
    
    // let ret = KingUserManager.ModifyUserPassword(oldUserInfo, userInfo);
    // if (ret != 0){
    //     result.error = "Modify user password failed!";
    // }else{
    // }

    res.send(JSON.stringify(result));
}

userManager.prototype.resetUserPassword = async function(res, userInfo){
    var result = new Object();
    if (Mode == 1){
        //检查Token是否过期
        let userToken = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (userToken.error != undefined){
            res.send(JSON.stringify(userToken));
            return;
         }

        let result = await userAuthenticSystem.resetUserPassword("password", userInfo);
        if (result.username == undefined){
            res.send("delete user account failed!")
            return;
        }
    }
    
    // let ret = KingUserManager.ResetUserPassword(userInfo);
    // if (ret != 0){
    //     result.error = "Reset user password failed!";
    // }else{
    // }

    res.send(JSON.stringify(result));
}

userManager.prototype.getUserScopeInfo = async function(res, userInfo){
    var result = new Object();
    if (Mode == 1){
        //检查Token是否过期
        let userToken = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (userToken.error != undefined){
            res.send(JSON.stringify(userToken));
            return;
         }
    }
    
    // let ret = KingUserManager.GetUserScopeInfo(userInfo.UserID, result);
    // if (ret != 0){
    //     result.error = "Get user scope failed!";
    // }else{
    // }

    res.send(JSON.stringify(result));
}

userManager.prototype.getUserNumber = function(){
    let userNumber = KingUserManager.GetUserNumber();
    return userNumber;
}

userManager.prototype.logOut = async function(res, userInfo){ 
    var result = new Object();

    // let ret = KingUserManager.UserLogout(userInfo.UserID, result);
    // if (ret != 0){
    //     result.error = "Query User Information Failed!";
    // }
    
    if (Mode == 1){
        let strJson = publicInterface.readJson(path.resolve(__dirname,"../config/serverconfig.json"));
        if (strJson.Error) {
            res.send(JSON.stringify(strJson));
            return;
        }
        let serverObj = strJson.data;
        /* let strJson = fs.readFileSync(path.resolve(__dirname,"../config/serverconfig.json"), 'utf-8');
        let serverObj = JSON.parse(strJson); */

        result.oauthURL = serverObj.OAuthServer.main;
        result.ssoURL = serverObj.SSOServer.LogoutURL;
    }

    return res.send(JSON.stringify(result));
}

function getOAuthType(){
    let strJson = "";
    try {
        strJson = fs.readFileSync(path.resolve(__dirname,"../config/serverconfig.json"), 'utf-8');
    } catch (error) {
        return 0;
    }
    if (strJson != "")
    {
        try {
          return JSON.parse(strJson).AuthType;            
        } catch (e) {
            return 0;
        }
    }else{
      return 0;
    }
}


userManager.prototype.queryUserGroupListForALL = async function(res, userInfo){ 
    var result = new Object();
    if (Mode == 1){
        //检查Token是否过期
        let userToken = await userAuthenticSystem.checkUserTokenIsValid("password", userInfo);
        if (userToken.error != undefined){
            res.send(JSON.stringify(userToken));
            return;
         }

        let userGroupInfo = new Object;
        userGroupInfo = await userAuthenticSystem.queryGroupListAll("password", userInfo);
        
       
        var tmp = JSON.stringify(userGroupInfo);
        res.send(tmp);
    }
}

userManager.prototype.roleVerifivation = async function() {
    try{
        let result = await userAuthenticSystem.roleVerifivation();
    } catch (error) {
        return false;
    }
        return true;
}


//操作中的token校验处理
userManager.prototype.checkOperationTokenIsValid = async function(req, res, next){
	next();
    return;
	
	//---------------------------------使用，验证token，add by xin.wang 2020-06-15
    // if(req.path == '/getDriverConfig')
    if(global.oauthInfo.checkTokenFlag == true && req.path != '/getProductType' && req.path != '/mainLogin' && req.path != '/exitURL'&& req.path != '/backURL' && 
        global.productType == 1){
        var currentTimeTicks = new Date().getTime();
        //currentTimeTicks += 1000*60*60*24*10;///////////////////////////////////////////////
        if(global.oauthInfo.expires_in < currentTimeTicks){//token时间过期
            var infoObj = new Object();
            infoObj.accessToken = global.oauthInfo.access_token;
            infoObj.RefreshToken = global.oauthInfo.refresh_token;
            var tokenResult = await userAuthenticSystem.checkUserTokenIsValid("password", infoObj);
            //tokenResult.error = "undefined"/////////////////////////////////////////////////////////////
            if( tokenResult.error != undefined ){//token过期
                var refreshtokenResult = await userAuthenticSystem.updateTokenAccount("refresh_token", infoObj);
                // refreshtokenResult.error = "rrrrrrrrrrrrrrrrrr"////////////////////////////////////////////////////
                if(  refreshtokenResult.error != undefined ){//refresh_token过期
                    let strJson = publicInterface.readJson(path.resolve(__dirname,"../../../../../config/devconfig.json"));
                    if (strJson.Error) {
                        result.error = strJson.ErrorDesc;
                        res.send(result);
                        return;
                    }
                    let serverObj = strJson.data;
                    /* let strJson = fs.readFileSync(path.resolve(__dirname,"../../../../../config/devconfig.json"), 'utf-8');
                    let serverObj = JSON.parse(strJson); */
                    var result = new Object();
                    result.oauthURL = serverObj.redirectUrl.loginURL;
                    result.error = "token is invaild";
                    result.rows = [{}];
                    result.total = 404;
                    console.log("token is invaild:" + req.path);
                    res.send(result);
                    return;
                }else{
                    console.log("updateToken:" + req.path);
                    gws.send(refreshtokenResult);
                    // oauthInfo.mainSocketIO.emit('updateToken',refreshtokenResult);
                    global.oauthInfo.expires_in = Number(refreshtokenResult.expires_in) * 1000 + new Date().getTime();
                    console.log("过期时间=" + global.oauthInfo.expires_in);
                    global.oauthInfo.access_token = refreshtokenResult.access_token;
                    global.oauthInfo.refresh_token = refreshtokenResult.refresh_token;
                    //将refreshtoken写到配置文件中
                    let strJsonPath = "../config/externalConfig.json";
                    let objReadJson = publicInterface.readJson(strJsonPath);
                    if (!objReadJson.Error) {
                        let objExternalJson = objReadJson.data;
                        objExternalJson.accessToken = global.oauthInfo.access_token;
                        objExternalJson.refreshToken = global.oauthInfo.refresh_token;
                        let strWrite = publicInterface.writeJson(strJsonPath, objExternalJson);
                    }
                }
            }
        }
    }
    next();
}

userManager.prototype.checkRestfulTokenIsValid = async function(req, res, next){
    /*
    if (req.headers.authorization == undefined) {
        var result = new Object();
        result.error = "token is missing";
        result.rows = [{}];
        result.total = 404;
        console.log("token is invaild:" + req.path);
        res.send(result);
        return;
    }
    var strAuthorization = req.headers.authorization.split(" ");
    if (strAuthorization.length < 2) {
        var result = new Object();
        result.error = "token is missing";
        result.rows = [{}];
        result.total = 404;
        console.log("token is invaild:" + req.path);
        res.send(result);
        return;
    }
    var strToken = strAuthorization[1];
    var infoObj = new Object();
    infoObj.accessToken = strToken;
    var tokenResult = await userAuthenticSystem.checkUserTokenIsValid("password", infoObj);
    if( tokenResult.error != undefined ){//token过期
        var result = new Object();
        result.error = "token is invaild";
        result.rows = [{}];
        result.total = 404;
        console.log("token is invaild:" + req.path);
        res.send(result);
        return;
    }*/
    next();
}
//Restful中的token校验处理
/* userManager.prototype.checkRestfulTokenIsValid = async function(req, res, next, oauthInfo){//---------------------------------使用，验证token，add by xin.wang 2020-06-15
    // if(req.path == '/getDriverConfig')
    //校验token
    if (req.headers.authorization == undefined) {
        res.send(codeMessage.TOKEN_IS_MISSING);
        return;
    }
    var strAuthorization = req.headers.authorization.split(" ");
    if (strAuthorization.length < 2) {
        res.send(codeMessage.TOKEN_IS_MISSING);
        return;
    }
    var strToken = strAuthorization[1];
    var objUserInfo = {
        accessToken:strToken,
        RefreshToken:global.oauthInfo.refresh_token
    };
    var strJsonPath = "../config/externalConfig.json";
    if (global.oauthInfo.refresh_token == 0) {
        //读取refreshToken的配置
        let objReadJson = publicInterface.readJson(strJsonPath);
        if (!objReadJson.Error && objReadJson.data.refreshToken) {
            global.oauthInfo.refresh_token = objReadJson.data.refreshToken;
            objUserInfo.RefreshToken = objReadJson.data.refreshToken;
        } else {
            console.log("配置文件中不存在refreshToken");
        }
    }
    var tokenResult = await userAuthenticSystem.checkUserTokenIsValid("password", objUserInfo);
    // tokenResult.error = "undefined"/////////////////////////////////////////////////////////////
    if( tokenResult.error != undefined ){//token过期
        var refreshtokenResult = await userAuthenticSystem.updateTokenAccount("refresh_token", objUserInfo);
        // refreshtokenResult.error = "rrrrrrrrrrrrrrrrrr"////////////////////////////////////////////////////
        if(  refreshtokenResult.error != undefined ){//refresh_token过期
            let strJson = publicInterface.readJson(path.resolve(__dirname,"../../../../../config/devconfig.json"));
            if (strJson.Error) {
                result.error = strJson.ErrorDesc;
                res.send(result);
                return;
            }
            let serverObj = strJson.data;
            res.send(codeMessage.TOKEN_HAS_EXPIRED);
            return;
        }else{
            console.log("updateToken");
            oauthInfo.mainSocketIO.emit('updateToken',refreshtokenResult);
            global.oauthInfo.expires_in = Number(refreshtokenResult.expires_in) * 1000 + new Date().getTime();
            console.log("过期时间=" + global.oauthInfo.expires_in);
            global.oauthInfo.access_token = refreshtokenResult.access_token;
            global.oauthInfo.refresh_token = refreshtokenResult.refresh_token;
            //将token信息写到配置文件中
            let objReadJson = publicInterface.readJson(strJsonPath);
            if (!objReadJson.Error) {
                let objExternalJson = objReadJson.data;
                objExternalJson.accessToken = global.oauthInfo.access_token;
                objExternalJson.refreshToken = global.oauthInfo.refresh_token;
                let strWrite = publicInterface.writeJson(strJsonPath, objExternalJson);
            }
        }
    } else {
        req.userInfo = tokenResult;
    }
    next();
} */

//登出注销
userManager.prototype.loginOutOauthAccount = async function(res, userInfo){ //add by xin.wang 2020-06-17
    let userGroupInfo = new Object;
    userGroupInfo = await userAuthenticSystem.loginOutTokenAccount("password", userInfo);
    userGroupInfo.loginURL = userInfo.loginURL;
    res.send(userGroupInfo);
}

//获取用户资源树
userManager.prototype.getUserResourceTree = async function (res, userInfo) {
    let userGroupInfo = new Object;
    userGroupInfo.accessToken = global.oauthInfo.access_token;
    userGroupInfo.RefreshToken = global.oauthInfo.refresh_token;
    userGroupInfo = await userAuthenticSystem.queryUserTree("password", userInfo);
    if (userGroupInfo.status == 200) {
        //获取工程权限信息
        let strPermissPath = global.sdbPath + "/permissConfig.json";
        let objJson = publicInterface.readJson(strPermissPath);
        if (objJson.Error) {
            objUserCatagory.status = -1;
            objUserCatagory.msg = objJson.ErrorDesc;
            res.send(objUserCatagory);
            return;
        }
        var objProAuth = objJson.data.permissList.find(function (project) {
            return project.projectId == userInfo.ProjectID
        })
        if (objProAuth != undefined) {
            var arrShowList = objProAuth.showList.userGroupId;
            var arrEditList = objProAuth.editList.userGroupId;
        } else {
            var arrShowList = [];
            var arrEditList = [];
        }
        
        var objUserGroupTree = {};
        var arrShowUserGroupTree = [];
        var arrEditUserGroupTree = [];
        let objTemp = {};
        objTemp.id = 0;
        objTemp.text = "用户系统";
        objTemp.children = [];
        objTemp.state = "open";
        objTemp.iconCls = "icon-blank";
        arrShowUserGroupTree.push(JSON.parse(JSON.stringify(objTemp)));
        arrEditUserGroupTree.push(JSON.parse(JSON.stringify(objTemp)));
        getUserGroupTree(arrShowUserGroupTree[0].children, arrShowList, userGroupInfo.data);//获取查看用户组树
        getUserGroupTree(arrEditUserGroupTree[0].children, arrEditList, userGroupInfo.data);//获取查看用户组树
        objUserGroupTree.ShowTree = arrShowUserGroupTree;
        objUserGroupTree.EditTree = arrEditUserGroupTree;
        userGroupInfo.data = objUserGroupTree;
    }
    res.send(userGroupInfo);
}

//获取用户类别树
userManager.prototype.getUserTypeTree = async function (res, userInfo) {
    if (Mode == 1){
        //检查Token是否过期
        let objUserCatagory = await userAuthenticSystem.queryUserCatagoryTree("password", userInfo);
        if (objUserCatagory.status == 200) {
            //获取工程权限信息
            //console.log(JSON.stringify(objUserCatagory, "", "\t"));
            let strPermissPath = global.sdbPath + "/permissConfig.json";
            let objJson = publicInterface.readJson(strPermissPath);
            if (objJson.Error) {
                objUserCatagory.status = -1;
                objUserCatagory.msg = objJson.ErrorDesc;
                res.send(objUserCatagory);
                return;
            }
            var objProAuth = objJson.data.permissList.find(function (project) {
                return project.projectId == userInfo.ProjectID
            })
            if (objProAuth != undefined) {
                var arrShowList = objProAuth.showList.userCategory;
                var arrEditList = objProAuth.editList.userCategory;
            } else {
                var arrShowList = [];
                var arrEditList = [];
            }
            
            let objTemp = {};
            objTemp.id = 0;
            objTemp.text = "用户类别";
            objTemp.children = [];
            objTemp.state = "open";
            objTemp.iconCls = "icon-blank";
            var arrShowUserCatagoryTree = [];
            var arrEditUserCatagoryTree = [];
            arrShowUserCatagoryTree.push(JSON.parse(JSON.stringify(objTemp)));
            arrEditUserCatagoryTree.push(JSON.parse(JSON.stringify(objTemp)));
            getUserCatagoryTree(objUserCatagory.data, arrShowList, arrShowUserCatagoryTree[0].children);
            getUserCatagoryTree(objUserCatagory.data, arrEditList, arrEditUserCatagoryTree[0].children);
            var objCatagoryTree = {
                ShowTree:arrShowUserCatagoryTree,
                EditTree:arrEditUserCatagoryTree
            };
            objUserCatagory.data = objCatagoryTree;
        }
        res.send(objUserCatagory);
    }
}

//根据用户组信息组成用户组树
function getUserGroupTree(arrUserGroupTree, arrCondition, arrGroupList) {
    for (let i = 0; i < arrGroupList.length; i++) {
        if (arrGroupList[i].groupId) {
            let objTmp = {};
            objTmp.id = arrGroupList[i].groupId;
            objTmp.text = arrGroupList[i] .groupName;
            let objFind = arrCondition.find(function (params) {
                return params == arrGroupList[i].groupId;
            })
            if (objFind != undefined) {
                objTmp.checked = true;
            }
            else{
                objTmp.checked = false;
            }
            if (arrGroupList[i].children) {
                objTmp.iconCls = "icon-blank";
                objTmp.children = [];
                getUserGroupTree(objTmp.children, arrCondition, arrGroupList[i].children);
            }
            else{
                objTmp.iconCls = "icon-blank";
            }
            arrUserGroupTree.push(objTmp);
        }       
    }
}

//根据用户类别信息组成用户类别树
function getUserCatagoryTree(objUserCatagory, arrCondition, arrCatagoryList) {
    for (let i = 0; i < objUserCatagory.length; i++) {
        if ((objUserCatagory[i].categoryId != undefined && objUserCatagory[i].categoryName != undefined) || (objUserCatagory[i].categoryAttrId != undefined && objUserCatagory[i].categoryAttrName != undefined)) {
        //if (objUserCatagory[i].id && objUserCatagory[i].text) {
            let objTemp = {};
            if (objUserCatagory[i].categoryAttrId != undefined) {
                objTemp.id = objUserCatagory[i].categoryAttrId;
                objTemp.text = objUserCatagory[i].categoryAttrName;
            } else {
                objTemp.id = objUserCatagory[i].categoryId;
                objTemp.text = objUserCatagory[i].categoryName;
            }
            /* objTemp.id = objUserCatagory[i].id;
            objTemp.text = objUserCatagory[i].text; */
            objTemp.children = [];
            objTemp.state = "open";
            let strFindField = "";
            if (objUserCatagory[i].categoryAttrId != undefined) {
                strFindField = "categoryAttrId";
            } else if (objUserCatagory[i].categoryId != undefined && objUserCatagory[i].children == undefined) {
                strFindField = "categoryId";
            } else {
                strFindField = "categoryAttrId";
            }
            let objFind = arrCondition.find(function (params) {
                return params == objUserCatagory[i][strFindField];
            })
            if (objFind != undefined) {
                objTemp.checked = true;
            }
            else{
                objTemp.checked = false;
            }
            objTemp.iconCls = "icon-blank";
            if (objUserCatagory[i].children) {
                objTemp.children = [];
                getUserCatagoryTree(objUserCatagory[i].children, arrCondition, objTemp.children);
            }
            arrCatagoryList.push(objTemp);
        }
    }
}

//获取用户是否有新建工程的权限
userManager.prototype.getCreateAuth = async function (res, userInfo) {
    var objOut = {
        Error:false,
        ErrorDesc:"",
        data:{}
    }
    //获取用户工程权限
    let objResAuth = await userAuthenticSystem.getProjectAuth(userInfo);
    if (objResAuth.status == 200) {
        var arrCreateList = objResAuth.data.createList;
        let nFind = arrCreateList.find(function (params) {
            return params == userInfo.groupId;
        })
        if (nFind == undefined) {
            objOut.data.isCreate = 0;
        } else {
            objOut.data.isCreate = 1;
        }
        res.send(objOut);
    } else {
        objOut.Error = true;
        objOut.ErrorDesc = objResAuth.msg;
        res.send(objOut);
    }
}

module.exports = userManager
