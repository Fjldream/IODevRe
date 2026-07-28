var fs = require('fs');
var path = require('path');

function CharacterInterface(){

}

/**
 * @brief 查看标准权限文件中 工程组是否可读
 * @param projectGroupID {string} 工程组ID
 * @param UserInfo {string} 用户信息 json格式字符串{userName:xxx,userId:xxx}
 * @param fileObj  {Object} 角色文件对象
 * @note  用户唯一标示采用name+id的方式
 * @return true/false
 */
CharacterInterface.prototype.checkProjectGroupReadable = function(projectGroupID, UserInfo, fileObj){
    if(!fileObj || !projectGroupID || !UserInfo){
        console.log("checkProjectGroupReadable faile, error param");
        return false;
    }
    var userInfo = JSON.parse(UserInfo);
    var userName = userInfo.userName;
    var userID = userInfo.userId;
    var userType = userInfo.userType;
    if(userType == "01" && userType == "02"){
        return true;
    }
    var hasAuthority = 0;
    for(var i = 0; i < fileObj.authority.length; i++){
        var userAuthority = checkUserAuthority(fileObj.authority[i].Users, userName, userID, "userName", "userId", "users", "children");
        var projectGroupReadAuthority = checkProjectGroupAuthority(fileObj.authority[i].ProjectAuthority, projectGroupID, "Read");
        var projectGroupReadWriteAuthority = checkProjectGroupAuthority(fileObj.authority[i].ProjectAuthority, projectGroupID, "ReadWrite");
        if(userAuthority && (projectGroupReadAuthority || projectGroupReadWriteAuthority)){
            hasAuthority = 1;
            break;
        }
    }
    if(hasAuthority == 1){
        return true;
    }else{
        return false;
    }
}

/**
 * @brief 查看标准权限文件中 工程是否可读
 * @param projectID {string} 工程ID
 * @param projectVersion {string} 工程版本
 * @param UserInfo {string} 用户信息 json格式字符串{userName:xxx,userId:xxx}
 * @param fileObj  {Object} 角色文件对象
 * @note  用户唯一标示采用name+id的方式
 * @return true/false
 */
CharacterInterface.prototype.checkProjectReadable = function(projectID, projectVersion, UserInfo, fileObj){
    if(!fileObj || !projectID || !UserInfo || !projectVersion){
        console.log("checkProjectReadable faile, error param");
        return false;
    }
    var userInfo = JSON.parse(UserInfo);
    var userName = userInfo.userName;
    var userID = userInfo.userId;
    var userType = userInfo.userType;
    if(userType == "01" && userType == "02"){
        return true;
    }
    var hasAuthority = 0;
    for(var i = 0; i < fileObj.authority.length; i++){
        var userAuthority = checkUserAuthority(fileObj.authority[i].Users, userName, userID, "userName", "userId", "users", "children");
        var projectReadAuthority = checkProjectAuthority(fileObj.authority[i].ProjectAuthority, projectID, projectVersion, "Read");
        var projectReadWriteAuthority = checkProjectAuthority(fileObj.authority[i].ProjectAuthority, projectID, projectVersion, "ReadWrite");
        if(userAuthority && (projectReadAuthority || projectReadWriteAuthority)){
            hasAuthority = 1;
            break;
        }
    }
    if(hasAuthority == 1){
        return true;
    }else{
        return false;
    }
}

/**
 * @brief 查看标准权限文件中 工程组是否可写
 * @param projectGroupID {string} 工程组ID
 * @param UserInfo {string} 用户信息 json格式字符串{userName:xxx,userId:xxx}
 * @param fileObj  {Object} 角色文件对象
 * @note  用户唯一标示采用name+id的方式
 * @return true/false
 */
CharacterInterface.prototype.checkProjectGroupWritable = function(projectGroupID, UserInfo, fileObj){
    if(!fileObj || !projectGroupID || !UserInfo){
        console.log("checkProjectGroupWritable faile, error param");
        return false;
    }
    var userInfo = JSON.parse(UserInfo);
    var userName = userInfo.userName;
    var userID = userInfo.userId;
    var userType = userInfo.userType;
    if(userType == "01" && userType == "02"){
        return true;
    }
    var hasAuthority = 0;
    for(var i = 0; i < fileObj.authority.length; i++){
        var userAuthority = checkUserAuthority(fileObj.authority[i].Users, userName, userID, "userName", "userId", "users", "children");
        var projectGroupReadWriteAuthority = checkProjectGroupAuthority(fileObj.authority[i].ProjectAuthority, projectGroupID, "ReadWrite");
        if(userAuthority && projectGroupReadWriteAuthority){
            hasAuthority = 1;
            break;
        }
    }
    if(hasAuthority == 1){
        return true;
    }else{
        return false;
    }
}

/**
 * @brief 查看标准权限文件中 工程是否可写
 * @param projectID {string} 工程ID
 * @param projectVersion {string} 工程版本
 * @param UserInfo {string} 用户信息 json格式字符串{userName:xxx,userId:xxx}
 * @param fileObj  {Object} 角色文件对象
 * @note  用户唯一标示采用name+id的方式
 * @return true/false
 */
CharacterInterface.prototype.checkProjectWritable = function(projectID, projectVersion, UserInfo, fileObj){
    if(!fileObj || !projectID || !UserInfo || !projectVersion){
        console.log("checkProjectWritable faile, error param");
        return false;
    }
    var userInfo = JSON.parse(UserInfo);
    var userName = userInfo.userName;
    var userID = userInfo.userId;
    var userType = userInfo.userType;
    if(userType == "01" && userType == "02"){
        return true;
    }
    var hasAuthority = 0;
    for(var i = 0; i < fileObj.authority.length; i++){
        var userAuthority = checkUserAuthority(fileObj.authority[i].Users, userName, userID, "userName", "userId", "users", "children");
        var projectReadWriteAuthority = checkProjectAuthority(fileObj.authority[i].ProjectAuthority, projectID, projectVersion, "ReadWrite");
        if(userAuthority && projectReadWriteAuthority){
            hasAuthority = 1;
            break;
        }
    }
    if(hasAuthority == 1){
        return true;
    }else{
        return false;
    }
}

/**
 * @brief 查找某个工程可读用户集和
 * @param projectID {string} 工程ID
 * @param projectVersion {string} 工程版本
 * @param fileObj  {Object} 角色文件对象
 * @note  用户唯一标示采用name+id的方式
 * @return [{userName:XXX,userID:XXX}]
 */
CharacterInterface.prototype.getUserListReadableByProject = function(projectID, projectVersion, fileObj){
    if(!fileObj || !projectID || !projectVersion){
        console.log("getUserListReadbleByProject faile, error param");
        return false;
    }
    var userList = new Array();
    for(var i = 0; i < fileObj.authority.length; i++){
        var projectReadAuthority = checkProjectAuthority(fileObj.authority[i].ProjectAuthority, projectID, projectVersion, "Read");
        var projectReadWriteAuthority = checkProjectAuthority(fileObj.authority[i].ProjectAuthority, projectID, projectVersion, "ReadWrite");
        if(projectReadAuthority || projectReadWriteAuthority){
            getUserListHasAuthority(fileObj.authority[i].Users, "userName", "userId", "users", "children", userList);
        }
    }
    return userList;
}

/**
 * @brief 查找某个工程可写用户集和
 * @param projectID {string} 工程ID
 * @param projectVersion {string} 工程版本
 * @param fileObj  {Object} 角色文件对象
 * @note  用户唯一标示采用name+id的方式
 * @return [{userName:XXX,userID:XXX}]
 */
CharacterInterface.prototype.getUserListWritableByProject = function(projectID, projectVersion, fileObj){
    if(!fileObj || !projectID || !projectVersion){
        console.log("getUserListWritableByProject faile, error param");
        return false;
    }
    var userList = new Array();
    for(var i = 0; i < fileObj.authority.length; i++){
        var projectReadWriteAuthority = checkProjectAuthority(fileObj.authority[i].ProjectAuthority, projectID, projectVersion, "ReadWrite");
        if(projectReadWriteAuthority){
            getUserListHasAuthority(fileObj.authority[i].Users, "userName", "userId", "users", "children", userList);
        }
    }
    return userList;
}

/**
 * @brief 查找某个工程可下设用户集和
 * @param projectID {string} 工程ID
 * @param projectVersion {string} 工程版本
 * @param fileObj  {Object} 角色文件对象
 * @note  用户唯一标示采用name+id的方式
 * @return [{userName:XXX,userID:XXX}]
 */
CharacterInterface.prototype.getUserListSetDataByProject = function(projectID, projectVersion, fileObj){
    if(!fileObj || !projectID || !projectVersion){
        console.log("getUserListSetDataByProject faile, error param");
        return false;
    }
    var userList = new Array();
    for(var i = 0; i < fileObj.authority.length; i++){
        var projectSetDataAuthority = checkProjectAuthority(fileObj.authority[i].ProjectAuthority, projectID, projectVersion, "SetData");
        if(projectSetDataAuthority){
            getUserListHasAuthority(fileObj.authority[i].Users, "userName", "userId", "users", "children", userList);
        }
    }
    return userList;
}

/**
 * @brief 新建工程，添加只有此工程读写权限，当前用户的一个角色
 * @param projectID {string} 工程ID
 * @param projectVersion {string} 工程版本
 * @param UserInfo {string} 用户信息 json格式字符串{userName:xxx,userId:xxx}
 * @param characterFileObj  {Object} 角色文件对象,执行成功，会添加一个新的角色
 * @param projectFileObj  {Object} 工程组信息文件对象
 * @note  用户唯一标示采用name+id的方式;角色文件中的users中的字段可能会修改
 * @return false/true
 */
CharacterInterface.prototype.createCharacterForNewProject = function(projectID, projectVersion, UserInfo, characterFileObj, projectFileObj){
    if(!projectID || !projectVersion || !UserInfo || !characterFileObj || !projectFileObj){
        console.log("createCharacterForNewProject faile, error param");
        return false;
    }
    var userInfo = JSON.parse(UserInfo);
    var userName = userInfo.userName;
    var userID = userInfo.userId;
    var characterObj = new Object();

    var newCharacterName = "characterFor" + projectID;
    newCharacterName = getNoRepeateCharacterName(newCharacterName, newCharacterName, characterFileObj);
    var characterMaxID = 0;
    for(var i = 0; i < characterFileObj.authority.length; i++){
        if(Number(characterFileObj.authority[i].CharacterID) >= characterMaxID){
            characterMaxID = Number(characterFileObj.authority[i].CharacterID);
        }
        if(characterFileObj.authority[i].CharacterName == newCharacterName){
            console.log("createCharacterForNewProject faile, repeat CharacterName");
            return false;
        }
    }
    characterObj.CharacterName = newCharacterName.replace(/-/g,"");
    characterObj.CharacterID = characterMaxID + 1;
    characterObj.CharacterDesc = "characterForProject_id_" + projectID.replace(/-/g,"");
    characterObj.ProjectAuthority = getCharacterProjectByProjectGroupInfo(projectFileObj,projectID,"Project",projectVersion);
    
    var UserArray = new Array();
    var UserObj = new Object();
    UserObj.userName = userName;
    UserObj.userId = userID;
    UserObj.text = userName;
    UserObj.id = userID;
    UserObj.authority = 1;
    UserArray.push(UserObj);
    characterObj.Users = UserArray;
    characterFileObj.authority.push(characterObj);

    return true;
}

/**
 * @brief 修改工程，修改对应工程的名称
 * @param projectID {string} 工程ID
 * @param projectVersion {string} 工程版本
 * @param characterFileObj  {Object} 角色文件对象
 * @param newProjectInfo  {Object} 修改后工程信息对象{ProjectName:XXXXXX}
 * @note  用户唯一标示采用name+id的方式;
 * @return false/true
 */
CharacterInterface.prototype.modifyCharacterForModifyProject = function(projectID, projectVersion, characterFileObj, newProjectInfo){
    if(!projectID || !projectVersion || !characterFileObj || !newProjectInfo){
        console.log("modifyCharacterForModifyProject faile, error param");
        return false;
    }
    for(var i = 0; i < characterFileObj.authority.length; i++){
        replaceEditProjectName(characterFileObj.authority[i].ProjectAuthority[0].ProjectGroups, projectID,"Project", newProjectInfo.ProjectName, projectVersion)
    }
    
    return true;
}

/**
 * @brief 删除工程时，删除角色中相应的工程
 * @param characterFileObj  {Object} 角色文件对象,
 * @param projectInfo  {Object} 需要删除的工程信息对象[{ProjectID:XXXXXX,ProjectVersion:XXXXXX}]
 * @note  用户唯一标示采用name+id的方式;
 * @return false/true
 */
CharacterInterface.prototype.deleteCharacterProjectForDeleteProject = function( characterFileObj, projectInfo){
    if(!characterFileObj || !projectInfo){
        console.log("deleteCharacterProjectForDeleteProject faile, error param");
        return false;
    }
    if(projectInfo.length > 0){
        for(var i = 0; i < projectInfo.length; i++){
            for(var j = 0; j < characterFileObj.authority.length; j++){
                deleteProjectInCharacter(characterFileObj.authority[j].ProjectAuthority[0].ProjectGroups, projectInfo[i].ProjectID, "Project", projectInfo[i].ProjectVersion);
            }
        }
    }else{
        console.log("deleteCharacterProjectForDeleteProject faile, no delete project");
        return false;
    }
    return true;
}

/**
 * @brief 新建工程组，添加只有此工程组读写权限，当前用户的一个角色
 * @param projectGroupID {string} 工程组ID
 * @param UserInfo {string} 用户信息 json格式字符串{userName:xxx,userId:xxx}
 * @param characterFileObj  {Object} 角色文件对象,执行成功，会添加一个新的角色
 * @param projectFileObj  {Object} 工程组信息文件对象
 * @note  用户唯一标示采用name+id的方式;角色文件中的users中的字段可能会修改
 * @return false/true
 */
CharacterInterface.prototype.createCharacterForNewProjectGroup = function(projectGroupID, UserInfo, characterFileObj, projectFileObj){
    if(!projectGroupID || !UserInfo || !characterFileObj || !projectFileObj){
        console.log("createCharacterForNewProjectGroup faile, error param");
        return false;
    }
    var userInfo = JSON.parse(UserInfo);
    var userName = userInfo.userName;
    var userID = userInfo.userId;
    var characterObj = new Object();

    var newCharacterName = "characterFor" + projectGroupID;
    newCharacterName = getNoRepeateCharacterName(newCharacterName, newCharacterName, characterFileObj);
    var characterMaxID = 0;
    for(var i = 0; i < characterFileObj.authority.length; i++){
        if(Number(characterFileObj.authority[i].CharacterID) >= characterMaxID){
            characterMaxID = Number(characterFileObj.authority[i].CharacterID);
        }
        if(characterFileObj.authority[i].CharacterName == newCharacterName){
            console.log("createCharacterForNewProjectGroup faile, repeat CharacterName");
            return false;
        }
    }
    characterObj.CharacterName = newCharacterName.replace(/-/g,"");
    characterObj.CharacterID = characterMaxID + 1;
    characterObj.CharacterDesc = "characterForProjectGroup,id:" + projectGroupID.replace(/-/g,"");
    characterObj.ProjectAuthority = getCharacterProjectByProjectGroupInfo(projectFileObj,projectGroupID,"ProjectGroup");
    
    var UserArray = new Array();
    var UserObj = new Object();
    UserObj.userName = userName;
    UserObj.userId = userID;
    UserObj.text = userName;
    UserObj.id = userID;
    UserObj.authority = 1;
    UserArray.push(UserObj);
    characterObj.Users = UserArray;
    characterFileObj.authority.push(characterObj);
    return true;
}

/**
 * @brief 修改工程组，修改对应工程组的名称
 * @param projectID {string} 工程组ID
 * @param characterFileObj  {Object} 角色文件对象
 * @param newProjectGroupInfo  {Object} 修改后工程组信息对象{ProjectGroupName:XXXXXX}
 * @note  用户唯一标示采用name+id的方式;
 * @return false/true
 */
CharacterInterface.prototype.modifyCharacterForModifyProjectGroup = function(projecGrouptID, characterFileObj, newProjectGroupInfo){
    if(!projecGrouptID || !characterFileObj || !newProjectGroupInfo){
        console.log("modifyCharacterForModifyProjectGroup faile, error param");
        return false;
    }
    for(var i = 0; i < characterFileObj.authority.length; i++){
        replaceEditProjectName(characterFileObj.authority[i].ProjectAuthority[0].ProjectGroups, projecGrouptID, "ProjectGroup", newProjectGroupInfo.ProjectName)
    }
    return true;
}

/**
 * @brief 删除工程组时，删除角色中相应的工程组及其子
 * @param characterFileObj  {Object} 角色文件对象,
 * @param projectGroupInfo  {Object} 需要删除的工程组信息对象[{ProjectGroupID:XXXXXX}]
 * @note  用户唯一标示采用name+id的方式;
 * @return false/true
 */
CharacterInterface.prototype.deleteCharacterProjectForDeleteProjectGroup = function( characterFileObj, projectGroupInfo){
    if(!characterFileObj || !projectGroupInfo){
        console.log("deleteCharacterProjectForDeleteProjectGroup faile, error param");
        return false;
    }
    if(projectGroupInfo.length > 0){
        for(var i = 0; i < projectGroupInfo.length; i++){
            for(var j = 0; j < characterFileObj.authority.length; j++){
                deleteProjectInCharacter(characterFileObj.authority[j].ProjectAuthority[0].ProjectGroups, projectGroupInfo[i].ProjectGroupID, "ProjectGroup");
            }
        }
    }else{
        console.log("deleteCharacterProjectForDeleteProjectGroup faile, no delete projectGroup");
        return false;
    }
    return true;
}

/**
 * @brief 获取当前时间
 * @note  ;
 * @return 当前时间字符串 //2020-04-03 09:06:23
 */
CharacterInterface.prototype.getCurrentTime = function(){
    var currentDate=new Date();
    var currentDay=("0"+currentDate.getDate()).slice(-2);
    var currentMonth=("0"+(currentDate.getMonth()+1)).slice(-2);
    var currentHour=("0"+currentDate.getHours()).slice(-2);
    var currentMinute=("0"+currentDate.getMinutes()).slice(-2);
    var currentSecond=("0"+currentDate.getSeconds()).slice(-2);
    var currentTime=currentDate.getFullYear()+"-"+(currentMonth)+"-"+(currentDay)+" "+(currentHour)+":"+(currentMinute)+":"+(currentSecond);
    return currentTime;
}

//查看权限用户列表中指定用户是否有权限//返回false，undefined无权限
function checkUserAuthority(usersArr, userNameStr, userIDNum, userNameField, userIDField, userChildrenField, groupChildrenField){
    for(var i = 0; i < usersArr.length; i++){
        if(usersArr[i][userNameField] != undefined && usersArr[i][userIDField] != undefined && 
            usersArr[i][userNameField] == userNameStr && usersArr[i][userIDField] == userIDNum){//每个用户
                if(usersArr[i].authority == 1){
                    return true;
                }else{
                    return false;
                }
        }
        if(usersArr[i][userChildrenField] != undefined && usersArr[i][userChildrenField].length > 0){//每个用户组的用户子
            var findMatch = checkUserAuthority(usersArr[i][userChildrenField], userNameStr, userIDNum, userNameField, userIDField, userChildrenField, groupChildrenField);
            if(findMatch != undefined){
                return findMatch;
            }
        }
        if(usersArr[i][groupChildrenField] != undefined && usersArr[i][groupChildrenField].length > 0){//每个用户组的用户组子
            var findMatch = checkUserAuthority(usersArr[i][groupChildrenField], userNameStr, userIDNum, userNameField, userIDField, userChildrenField, groupChildrenField);
            if(findMatch != undefined){
                return findMatch;
            }
        }
    }
}

//查看权限工程列表中指定工程是否有权限//返回false，undefined无权限
function checkProjectAuthority(projectArr, projectIDStr, projectVersionStr, authorityTypeStr){
    for(var i = 0; i < projectArr.length;i++){
        if(projectArr[i].ProjectID != undefined && projectArr[i].ProjectVersion != undefined &&
            projectArr[i].ProjectID == projectIDStr && projectArr[i].ProjectVersion == projectVersionStr){
                if(projectArr[i][authorityTypeStr] == 1){
                    return true;
                }else{
                    return false;
                }
            }
        if(projectArr[i].ProjectGroups != undefined && projectArr[i].ProjectGroups.length > 0){
            var findMatch = checkProjectAuthority(projectArr[i].ProjectGroups, projectIDStr, projectVersionStr, authorityTypeStr);
            if(findMatch != undefined){
                return findMatch;
            }
        }
        if(projectArr[i].Projects != undefined && projectArr[i].Projects.length > 0){
            var findMatch = checkProjectAuthority(projectArr[i].Projects, projectIDStr, projectVersionStr, authorityTypeStr);
            if(findMatch != undefined){
                return findMatch;
            }
        }
    }
}

//查看权限工程列表中指定工程组是否有权限//返回false，undefined无权限
function checkProjectGroupAuthority(projectArr, projectGroupIDStr, authorityTypeStr){
    for(var i = 0; i < projectArr.length;i++){
        if(projectArr[i].ProjectGroupID != undefined  && projectArr[i].ProjectGroupID == projectGroupIDStr ){
                if(projectArr[i][authorityTypeStr] == 1){
                    return true;
                }else{
                    return false;
                }
            }
        if(projectArr[i].ProjectGroups != undefined && projectArr[i].ProjectGroups.length > 0){
            var findMatch = checkProjectGroupAuthority(projectArr[i].ProjectGroups, projectGroupIDStr, authorityTypeStr);
            if(findMatch != undefined){
                return findMatch;
            }
        }
        if(projectArr[i].Projects != undefined && projectArr[i].Projects.length > 0){
            var findMatch = checkProjectGroupAuthority(projectArr[i].Projects, projectGroupIDStr, authorityTypeStr);
            if(findMatch != undefined){
                return findMatch;
            }
        }
    }
}

//获取角色中用户中具有权限的用户列表[{userName:XXX,userID:XXX}]
function getUserListHasAuthority(userArr, userNameField, userIDField, userChildrenField, groupChildrenField, resultArr){
    for(var i = 0; i < userArr.length; i++){
        if(userArr[i].authority != undefined && userArr[i].authority == 1 && userArr[i][userNameField] != undefined && userArr[i][userIDField] != undefined){
            var tempObj = new Object()
            tempObj.userName = userArr[i][userNameField];
            tempObj.userID = userArr[i][userIDField];
            resultArr.push(tempObj);
        }
        if(userArr[i][userChildrenField] != undefined && userArr[i][userChildrenField].length > 0){
            getUserListHasAuthority(userArr[i][userChildrenField], userNameField, userIDField, userChildrenField, groupChildrenField, resultArr);
        }
        if(userArr[i][groupChildrenField] != undefined && userArr[i][groupChildrenField].length > 0){
            getUserListHasAuthority(userArr[i][groupChildrenField], userNameField, userIDField, userChildrenField, groupChildrenField, resultArr);
        }
    }
}

//根据工程组文件生成角色工程权限对象
function getCharacterProjectByProjectGroupInfo(projectObj,projectIDStr, Type, projectVersion){
    var returnArray = new Array();
    var ProjectAuthorityObj = new Object();
    ProjectAuthorityObj.ProjectGroupName = "工程管理";
    ProjectAuthorityObj.ProjectGroupID = "0";
    ProjectAuthorityObj.ReadWrite = 0;
    ProjectAuthorityObj.ProjectGroups = getProjectAuthrityInfo(projectObj.ProjectGroupList, projectIDStr, Type, projectVersion);
    returnArray.push(ProjectAuthorityObj);
    return returnArray;
}

//第归获取工程树
function getProjectAuthrityInfo(projectArr, projectIDStr,Type, projectVersion){
    var returnArr = new Array();
    for(var i = 0; i < projectArr.length; i++){
        var tempObject = new Object();
        if(projectArr[i].ProjectObjectList != undefined && projectArr[i].ProjectObjectList.length > 0){
            var ProjectsArray = getProjectAuthrityInfo(projectArr[i].ProjectObjectList, projectIDStr, Type, projectVersion);
            tempObject.Projects = ProjectsArray;
        }
        if(projectArr[i].ProjectGroupID != undefined){
            tempObject.ProjectGroupName = projectArr[i].ProjectGroupName;
            tempObject.ProjectGroupID = projectArr[i].ProjectGroupID;
            tempObject.ReadWrite = 0;
            tempObject.Read = 0;
            if(Type == "ProjectGroup" && projectArr[i].ProjectGroupID == projectIDStr){
                tempObject.ReadWrite = 1;
                tempObject.Read = 1;
            }
        }
        if(projectArr[i].ProjectID != undefined){
            tempObject.ProjectName = projectArr[i].ProjectName;
            tempObject.ProjectVersion = projectArr[i].ProjectVersion;
            tempObject.ProjectID = projectArr[i].ProjectID;
            tempObject.ReadWrite = 0;
            tempObject.Read = 0;
            tempObject.SetData = 0;
            if(Type == "Project" && projectArr[i].ProjectID == projectIDStr && projectArr[i].ProjectVersion == projectVersion){
                tempObject.ReadWrite = 1;
                tempObject.Read = 1;
            }
        }
        returnArr.push(tempObject);
    }
    return returnArr;
}

//第归替换工程名称
function replaceEditProjectName(ProjectListArr, ProjectID, Type, NewProjectName, ProjectVersion){
    for(var i = 0; i < ProjectListArr.length; i++){
        if(Type == "Project" && ProjectListArr[i].ProjectID != undefined && ProjectListArr[i].ProjectVersion != undefined && ProjectListArr[i].ProjectName != undefined &&
            ProjectListArr[i].ProjectID == ProjectID && ProjectListArr[i].ProjectVersion == ProjectVersion){
                ProjectListArr[i].ProjectName = NewProjectName;
                return;
            }
        if(Type == "ProjectGroup" && ProjectListArr[i].ProjectGroupID != undefined && ProjectListArr[i].ProjectGroupName != undefined &&
            ProjectListArr[i].ProjectGroupID == ProjectID ){
                ProjectListArr[i].ProjectGroupName = NewProjectName;
                return;
            }
        if(ProjectListArr[i].Projects != undefined && ProjectListArr[i].Projects.length > 0){
            replaceEditProjectName(ProjectListArr[i].Projects, ProjectID, Type, NewProjectName, ProjectVersion)
        }
        if(ProjectListArr[i].ProjectGroups != undefined && ProjectListArr[i].ProjectGroups.length > 0){
            replaceEditProjectName(ProjectListArr[i].ProjectGroups, ProjectID, Type, NewProjectName, ProjectVersion)
        }
    }
}

//第归删除工程
function deleteProjectInCharacter(ProjectListArr, ProjectID, Type, ProjectVersion){
    for(var i = 0; i < ProjectListArr.length; i++){
        if(Type == "Project" && ProjectListArr[i].ProjectID != undefined && ProjectListArr[i].ProjectVersion != undefined  &&
            ProjectListArr[i].ProjectID == ProjectID && ProjectListArr[i].ProjectVersion == ProjectVersion){
                ProjectListArr.splice(i,1);
                return;//只有一个
            }
        if(Type == "ProjectGroup" && ProjectListArr[i].ProjectGroupID != undefined   &&
            ProjectListArr[i].ProjectGroupID == ProjectID){
                ProjectListArr.splice(i,1);
                return;//只有一个
            }
        if(ProjectListArr[i].Projects != undefined && ProjectListArr[i].Projects.length > 0){
            deleteProjectInCharacter(ProjectListArr[i].Projects, ProjectID, Type, ProjectVersion)
        }
        if(ProjectListArr[i].ProjectGroups != undefined && ProjectListArr[i].ProjectGroups.length > 0){
            deleteProjectInCharacter(ProjectListArr[i].ProjectGroups, ProjectID, Type, ProjectVersion)
        }
    }
}

//创建不重复角色名称
function getNoRepeateCharacterName(OriginalName, CharacterName, characterFileObj){
    for(var i = 0; i < characterFileObj.authority.length; i++){
        if(characterFileObj.authority[i].CharacterName == CharacterName){
            var nameNumber = CharacterName.replace(OriginalName,'');
            var newNumber = Number(nameNumber) + 1;
            CharacterName = OriginalName + newNumber;
            return getNoRepeateCharacterName(OriginalName,CharacterName, characterFileObj);
        }
    }
    return CharacterName;
}

module.exports = CharacterInterface
