var fs = require('fs')
var bodyParser = require('body-parser')
var express = require('express')
var router = express.Router()
let formidable = require('formidable')
var path = require('path')
let pathFunc = require("path")
var zipper = require("zip-local")
var xml2js = require("xml2js")
var strPlatFormType // 20230529
var CheckModuleClass = require('./CheckModule')
var nanoid = require('nanoid')//202501009
var KingConfigModule
var os = require('os')
var platform = os.platform()
var drivernode, checknode
let tenantManager = require('../lib/services/TenantManager')
if (/*platform == "win32"*/ false) {
  //drivernode = require('../Bin/lib/drivernode.node'); // 20230529 zjt 驱动安装插件
  //checknode = require('../Bin/lib/checknode.node'); // 20230529 zjt 驱动校验插件
} else //linux
{
  KingConfigModule = new CheckModuleClass()//require("../Bin/lib/nodeKingConfigModule_linux.node");
  strPlatFormType = "Linux" // 20230529
}
const xss = require('xss')

var LogManager = require('./LogInterface')
var VarLogManagerObj = new LogManager()
var VarManagerName = "VarManager"

var varCheckClass = require('./ObjectCheckInterface')
var varCheckObj = new varCheckClass()

const Json2csvParser = require('json2csv').Parser
var iconv = require('iconv-lite')
const csv2Json = require('csvtojson')

var publicClass = require('./PublicInterface')//公用函数接口
var pubInter = new publicClass()
var kingConfigModuleClass = require('./KingConfigModule')
var KingConfigModuleJs = new kingConfigModuleClass()

/* var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 9001 }); */
const {
  isMainThread,
  parentPort,
  workerData,
  threadId,
  MessageChannel,
  MessagePort,
  Worker
} = require('worker_threads')//启用多线程的接口

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

var PRODUCTKF36 = 1//表示产品类型是KF3.6
var PRODUCTKF40 = 2//表示产品类型是KF4.0
//变量类型
if (global.productType == PRODUCTKF36) {
  var KVIO_TAG_TYPE_SYSTEM = 0		//系统变量
  var KVIO_TAG_TYPE_ACCOUNT = 1		//用户变量
  var KVIO_TAG_TYPE_USER = 2		//普通变量
}
else {
  var KVIO_TAG_TYPE_SYSTEM = 1		//系统变量
  var KVIO_TAG_TYPE_CHANNEL = 2		//链路系统变量
  var KVIO_TAG_TYPE_DEVICE = 3		//设备系统变量
  var KVIO_TAG_TYPE_USER = 4		//用户变量,KF4.0的用户变量等于KF3.6的普通变量
}
var pathSep
if (platform == "linux") {
  pathSep = "/"
} else if (platform == "win32") {
  pathSep = "\\"
}
else {
  pathSep = "/"
}

var objConfigErrMsg = KingConfigModule.Errcode_decode
/*{
  32768:"设备地址超出范围",
  32769:"设备地址格式错误",
  32770:"寄存器名称错误",
  32771:"寄存器地址超出范围", 
  32773:"寄存器数据类型错误",
  "-1":"其他错误"
};*/

//一些耗时较长的操作的执行进度
var nSchedule = 0

//读json文件
function ReadJson (strPath) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function ReadJson")
  let objJson = {}
  let strOutPath = pubInter.getFileName(strPath)
  if (fs.existsSync(strPath)) {
    let strJson = ""
    try {
      strJson = fs.readFileSync(strPath)
    } catch (error) {
      objJson.Error = true
      objJson.ErrorDesc = "读取" + strOutPath + "失败"
      //console.log(strPath + "：" + error.message);
      VarLogManagerObj.traceLog(VarManagerName, "Leave function ReadJson")
      return objJson
    }

    try {
      objJson = JSON.parse(strJson)
      objJson.Error = false
    } catch (error) {
      objJson.Error = true
      objJson.ErrorDesc = error.message
      console.log(error.message)
      VarLogManagerObj.traceLog(VarManagerName, "Leave function ReadJson")
      return objJson
    }

  }
  else {
    objJson.Error = true
    objJson.ErrorDesc = strOutPath + " 不存在"
    VarLogManagerObj.traceLog(VarManagerName, "Leave function ReadJson")
    return objJson
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function ReadJson")
  return objJson
}

//写json文件
function WriteJson (strPath, objJson) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function WriteJson")
  let strOutPath = pubInter.getFileName(strPath)
  let strJson = JSON.stringify(objJson, "", "\t")
  try {
    fs.writeFileSync(strPath, strJson)
  } catch (error) {
    VarLogManagerObj.traceLog(VarManagerName, "Leave function WriteJson")
    console.log(error.message)
    return strOutPath + "写入失败"
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function WriteJson")
  return "OK"
}

/* var strProjectDir = global.sdbPath;
var objExConfig = ReadJson("../config/externalConfig.json");
if (objExConfig != {} && objExConfig.projectDir != undefined) {
    strProjectDir = objExConfig.projectDir;
} */

//将数据类型的数字转化为字符
function GetDataTypeString (MemberDataType) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function GetDataTypeString")
  var strDataType = ""
  switch (MemberDataType) {
    case 1:
      strDataType = "Bool"
      break
    case 2:
      strDataType = "Byte"
      break
    case 4:
      strDataType = "Short"
      break
    case 8:
      strDataType = "Ushort"
      break
    case 16:
      strDataType = "BCD"
      break
    case 32:
      strDataType = "Long"
      break
    case 64:
      strDataType = "LongBCD"
      break
    case 128:
      strDataType = "Float"
      break
    case 256:
      strDataType = "String"
      break
    case 512:
      strDataType = "Double"
      break
    case 1024:
      strDataType = "BLOB"
      break
    case 2048:
      strDataType = "Int64"
      break
    case 4096:
      strDataType = "Char"
      break
    case 8192:
      strDataType = "Ulong"
      break
    case 16384:
      strDataType = "Struct"
      break
  }

  if (strDataType == "") {
    //说明可能是寄存器的数据类型,即有多种类型
    let arrMemberDataType = []
    let nDataTypeArr = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
    let strDataTypeArr = ["Bool", "Byte", "Short", "Ushort", "BCD", "Long", "LongBCD", "Float", "String", "Double", "Blob", "Int64"]
    for (let i = 0; i < nDataTypeArr.length; i++) {
      if ((MemberDataType & nDataTypeArr[i]) != 0) {
        arrMemberDataType.push(strDataTypeArr[i])
      }
    }
    strDataType = JSON.stringify(arrMemberDataType)
  }
  return strDataType
}

//将数据类型数字转化为总体组规定的格式
function GetDataType2 (MemberDataType) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function GetDataType2")
  var nDataType = 0

  if (MemberDataType == 1) {
    nDataType = 1
  }
  else if (MemberDataType == 128) {
    nDataType = 3
  }
  else if (MemberDataType == 512) {
    nDataType = 4
  }
  else if (MemberDataType == 256 || MemberDataType == 4096) {
    nDataType = 5
  }
  else {
    nDataType = 2
  }
  return nDataType
}

//将读写的数组转化为字符串
function GetAccessString (MemberAccexxType) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function GetAccessString")
  var strAccessType = ""
  switch (MemberAccexxType) {
    case 0:
      strAccessType = "只读"
      break
    case 1:
      strAccessType = "只写"
      break
    case 2:
      strAccessType = "读写"
      break
    default:
      strAccessType = "只读"
      break
  }
  return strAccessType
}

//将转换类型数字转化为字符串
function GetConvertTypeString (nConvertType) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function nConvertType")
  let strDataConvertType = 0
  switch (nConvertType) {
    case 0:
      strDataConvertType = "无"
      break
    case 1:
      strDataConvertType = "线性转换"
      break
    case 2:
      strDataConvertType = "平方根转换"
      break
    case 3:
      strDataConvertType = "差值累计"
      break
    case 4:
      strDataConvertType = "直接累计"
      break
    default:
      strDataConvertType = "无"
      break
  }
  return strDataConvertType
}

//将数据类型的字符转化为数字
function GetDataTypeNum (MemberDataType) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function GetDataTypeNum")
  if (MemberDataType == "Bool") {
    return 1
  }
  else if (MemberDataType == "Char") {
    //预留一下
    return 4096
  }
  else if (MemberDataType == "Byte") {
    return 2
  }
  else if (MemberDataType == "Short") {
    return 4
  }
  else if (MemberDataType == "Ushort") {
    return 8
  }
  else if (MemberDataType == "BCD") {
    return 16
  }
  else if (MemberDataType == "Long") {
    return 32
  }
  else if (MemberDataType == "ULong") {
    return 8192
  }
  else if (MemberDataType == "LongBCD") {
    return 64
  }
  else if (MemberDataType == "Int64") {
    return 2048
  }
  else if (MemberDataType == "Float") {
    return 128
  }
  else if (MemberDataType == "Double") {
    return 512
  }
  else if (MemberDataType == "String") {
    return 256
  }
  else if (MemberDataType == "Blob") {
    return 1024
  }
  else {
    return 0
  }
}

//将清洗模式转化为数字
function GetDataCleanTypeNum (strDataCleanType, strValueRangeType) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function GetDataCleanTypeNum")
  let nDataCleanType = 0
  if (strDataCleanType == "9") {
    nDataCleanType = Number(strValueRangeType)
  }
  else {
    nDataCleanType = Number(strDataCleanType)
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function GetDataCleanTypeNum")
  return nDataCleanType
}

//将清洗模式数字转化为字符串
function GetDataCleanTypeString (nDataCleanType) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function nDataCleanType")
  let objDataClenType = {}
  objDataClenType.DataCleaningType = ""
  objDataClenType.ValueRangeType = ""
  switch (nDataCleanType) {
    case 0:
      objDataClenType.DataCleaningType = "无"
      break
    case 1:
      objDataClenType.DataCleaningType = "值范围"
      objDataClenType.ValueRangeType = "大于等于最小值 且 小于等于最大值"
      break
    case 2:
      objDataClenType.DataCleaningType = "值范围"
      objDataClenType.ValueRangeType = "大于最大值 或 小于最小值"
      break
    case 3:
      objDataClenType.DataCleaningType = "值范围"
      objDataClenType.ValueRangeType = "大于等于最小值"
      break
    case 4:
      objDataClenType.DataCleaningType = "值范围"
      objDataClenType.ValueRangeType = "小于等于最大值"
      break
    case 5:
      objDataClenType.DataCleaningType = "变化率"
      break
    case 6:
      objDataClenType.DataCleaningType = "死区"
      break
    case 7:
      objDataClenType.DataCleaningType = "值范围"
      objDataClenType.ValueRangeType = "大于等于最大值"
      break
    case 8:
      objDataClenType.DataCleaningType = "值范围"
      objDataClenType.ValueRangeType = "小于等于最大值"
      break
    default:
      objDataClenType.DataCleaningType = "无"
      break
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function nDataCleanType")
  return objDataClenType
}
function MakeVarID (strProjectName, strProjectID, projectPath) {
  let strJsonPath = ""
  if (global.productType == PRODUCTKF36) {
    strJsonPath = path.join(projectPath, "VarInfo.json")
  }
  else {
    strJsonPath = path.join(projectPath, "VarInfo.json")
  }
  var objTagList = {}
  var nStartNum = 0
  if (platform == "win32" && global.productType == PRODUCTKF40) {
    nStartNum = 5001
  } else {
    nStartNum = 1
  }
  objTagList = ReadJson(strJsonPath)
  if (objTagList.Error) {
    console.log(objTagList.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "Leave function MakeVarID")
    return -1
  }
  //TagList
  let nStartNum0 = nStartNum
  let arrUserTagList = objTagList.TagList.filter(function (tag) {
    return tag.TagType == KVIO_TAG_TYPE_USER
  })
  let nTagLen = arrUserTagList.length
  let nVarLen = objTagList.TagList.length
  if (nTagLen > 0 && arrUserTagList[nTagLen - 1].TagID != undefined && global.productType == PRODUCTKF40) {
    nStartNum0 = arrUserTagList[nTagLen - 1].TagID + 1
  }
  else if (objTagList.TagList.length > 0 && global.productType == PRODUCTKF36) {
    nStartNum0 = objTagList.TagList[nVarLen - 1].TagID + 1
  }
  //OPCUA
  let nStartNum1 = nStartNum
  let arrUserOpcuaList = objTagList.OPCVAR.filter(function (tag) {
    return tag.TagType == KVIO_TAG_TYPE_USER
  })
  nTagLen = arrUserOpcuaList.length
  nVarLen = objTagList.OPCVAR.length
  if (nTagLen > 0 && arrUserOpcuaList[nTagLen - 1].TagID != undefined && global.productType == PRODUCTKF40) {
    nStartNum1 = arrUserOpcuaList[nTagLen - 1].TagID + 1
  }
  else if (objTagList.OPCVAR.length > 0 && global.productType == PRODUCTKF36) {
    nStartNum1 = objTagList.OPCVAR[nVarLen - 1].TagID + 1
  }
  //OPCDA
  let nStartNum2 = nStartNum
  objTagList.DAVAR = objTagList.DAVAR || []
  nStartNum2 = objTagList.DAVAR.length ? (objTagList.DAVAR[objTagList.DAVAR.length - 1].TagID + 1) : nStartNum

  nStartNum = Math.max(nStartNum0, nStartNum1, nStartNum2)

  return nStartNum
}
//生成变量ID1
function MakeVarID0 (strProjectName, strProjectID, strProjectVersion) {
  let strJsonPath = ""
  if (global.productType == PRODUCTKF36) {
    strJsonPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/VarInfo.json"
  }
  else {
    strJsonPath = global.sdbPath + "/" + strProjectName + "/VarInfo.json"
  }
  var objTagList = {}
  var nStartNum = 0
  if (platform == "win32" && global.productType == PRODUCTKF40) {
    nStartNum = 5001
  } else {
    nStartNum = 1
  }
  objTagList = ReadJson(strJsonPath)
  if (objTagList.Error) {
    console.log(objTagList.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "Leave function MakeVarID")
    return -1
  }

  let arrUserTagList = objTagList.TagList.filter(function (tag) {
    return tag.TagType == KVIO_TAG_TYPE_USER
  })
  let nTagLen = arrUserTagList.length
  let nVarLen = objTagList.TagList.length
  if (nTagLen > 0 && arrUserTagList[nTagLen - 1].TagID != undefined && global.productType == PRODUCTKF40) {
    return arrUserTagList[nTagLen - 1].TagID + 1
  }
  else if (objTagList.TagList.length > 0 && global.productType == PRODUCTKF36) {
    return objTagList.TagList[nVarLen - 1].TagID + 1
  }
  else {
    VarLogManagerObj.traceLog(VarManagerName, "Leave function MakeVarID")
    return nStartNum
  }
}

//生成变量ID2
function MakeVarID1 (strProjectName, strProjectID, projectPath) {
  let strJsonPath = ""
  if (global.productType == PRODUCTKF36) {
    strJsonPath = path.join(projectPath, "VarInfo.json")
  }
  else {
    strJsonPath = path.join(projectPath, "VarInfo.json")
  }
  var objTagList = {}
  var nStartNum = 0
  if (platform == "win32" && global.productType == PRODUCTKF40) {
    nStartNum = 5001
  } else {
    nStartNum = 1
  }
  objTagList = ReadJson(strJsonPath)
  if (objTagList.Error) {
    console.log(objTagList.ErrorDesc)
    return -1
  }

  let arrUserTagList = objTagList.OPCVAR.filter(function (tag) {
    return tag.TagType == KVIO_TAG_TYPE_USER
  })
  let nTagLen = arrUserTagList.length
  let nVarLen = objTagList.OPCVAR.length
  if (nTagLen > 0 && arrUserTagList[nTagLen - 1].TagID != undefined && global.productType == PRODUCTKF40) {
    return arrUserTagList[nTagLen - 1].TagID + 1
  }
  else if (objTagList.OPCVAR.length > 0 && global.productType == PRODUCTKF36) {
    return objTagList.OPCVAR[nVarLen - 1].TagID + 1
  }
  else {
    return nStartNum
  }
}
//生成ID3
function MakeVarID2 (strProjectName, strProjectID, projectPath) {
  let strJsonPath = ""
  if (global.productType == PRODUCTKF36) {
    strJsonPath = path.join(projectPath, "VarInfo.json")
  }
  else {
    strJsonPath = path.join(projectPath, "VarInfo.json")
  }
  var objTagList = {}
  var nStartNum = 0
  if (platform == "win32" && global.productType == PRODUCTKF40) {
    nStartNum = 5001
  } else {
    nStartNum = 1
  }
  objTagList = ReadJson(strJsonPath)
  if (objTagList.Error) {
    console.log(objTagList.ErrorDesc)
    return -1
  }
  objTagList.DAVAR = objTagList.DAVAR || []
  nStartNum = objTagList.DAVAR.length ? (objTagList.DAVAR[objTagList.DAVAR.length - 1].TagID + 1) : nStartNum
  return nStartNum
}
//生成变量组ID
function MakeVarGroupID (projectPath, objTagGroupData) {
  let strJsonPath = ""
  if (global.productType == PRODUCTKF36) {
    strJsonPath = pathFunc.join(projectPath, "VarGroupInfo.json")
  }
  else {
    strJsonPath = pathFunc.join(projectPath, "/VarGroupInfo.json")
  }
  var objTagGroupList = {}
  objTagGroupList = ReadJson(strJsonPath)
  if (objTagGroupData) objTagGroupList = objTagGroupData
  if (objTagGroupList.Error) {
    console.log(objTagGroupList.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "Leave function MakeVarGroupID")
    return -1
  }
  var arrTagGroupList = Array.isArray(objTagGroupList.TagGroupList) ? objTagGroupList.TagGroupList : []
  var strTagGroupID = 0//当前变量组的ID
  // 目标是遍历整棵变量组树，找出当前已经使用过的最大 TagGroupID。
  // 找到最大值后，函数返回“最大值 + 1”，作为下一个新建变量组可用的 ID

  // 显式栈 DFS
  var groupStack = arrTagGroupList.slice()
  while (groupStack.length > 0) {
    // 弹出一个当前要处理的组节点。
    let currentGroup = groupStack.pop()

    // 防御性判断：如果节点为空或不是对象，直接跳过，避免后续读取属性时报错
    if (!currentGroup || typeof currentGroup != "object") {
      continue
    }

    // 如果当前节点带有 TagGroupID，并且比目前记录的最大值更大，就用它刷新 strTagGroupID
    // 整个遍历过程中，strTagGroupID 始终保存“目前见过的最大 ID”
    if (currentGroup.TagGroupID != undefined && Number(currentGroup.TagGroupID) > strTagGroupID) {
      strTagGroupID = Number(currentGroup.TagGroupID)
    }
    // TagObjectList 承担“子组数组”的角色
    if (Array.isArray(currentGroup.TagObjectList) && currentGroup.TagObjectList.length > 0) {
      for (let childIndex = 0; childIndex < currentGroup.TagObjectList.length; childIndex++) {
        let childGroup = currentGroup.TagObjectList[childIndex]

        // 只把真正的子组节点压栈。
        // 这里用 TagGroupID 是否存在作为一个轻量判断，过滤掉组内普通变量对象。
        if (childGroup && childGroup.TagGroupID != undefined) {
          groupStack.push(childGroup)
        }
      }
    }
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function MakeVarGroupID")
  return strTagGroupID + 1
}

//获取变量属性
router.post('/getVarProperty', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post getVarProperty")
  var objVarProperty = ReadJson(global.propertyPath + '/VarProperty.json')
  res.send(objVarProperty)
  VarLogManagerObj.traceLog(VarManagerName, "Leave post getVarProperty")
})

//获取一个工程或变量组中的所有变量
router.post('/getTagProperty', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post getTagProperty")
  //let global.sdbPath = getPath("../config/externalConfig.json");
  //console.time("getTagProperty");
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID//获取工程的ID
  let projectPath = pathFunc.join(tenantDir, strProjectID, 'project')
  let strTagGroupName = req.query.TagGroup
  if (global.productType == PRODUCTKF36) {
    var strVarJsonPath = pathFunc.join(projectPath, 'VarInfo.json')
  } else {
    var strVarJsonPath = pathFunc.join(projectPath, 'VarInfo.json')
  }
  var objTagList = {}
  var objOutTagList = {}
  objTagList = ReadJson(strVarJsonPath)
  if (objTagList.Error == undefined) {
    objOutTagList.Error = true
    objOutTagList.rows = []
    objOutTagList.ErrorDesc = "ReadJson错误，缺少Error属性"
    VarLogManagerObj.errorLog(VarManagerName, objOutTagList.ErrorDesc)
  }
  if (objTagList.Error || objTagList.TagList == undefined) {
    objOutTagList.Error = true
    objOutTagList.rows = []
    objOutTagList.ErrorDesc = objTagList.ErrorDesc
    VarLogManagerObj.errorLog(VarManagerName, objOutTagList.ErrorDesc)
  }
  else {
    objOutTagList.Error = false
    objOutTagList.ErrorDesc = ""
    if (strTagGroupName == "变量" || strTagGroupName == "root") {
      objOutTagList.rows = objTagList.TagList
    } else {
      let strVarGroupJsonPath = pathFunc.join(projectPath, 'VarGroupInfo.json')
      let objReadGroup = ReadJson(strVarGroupJsonPath)
      if (objReadGroup.Error) {
        objOutTagList.Error = true
        objOutTagList.rows = []
        objOutTagList.ErrorDesc = objReadGroup.ErrorDesc
      } else {
        var arrVarList = []
        recursionGetVarInGroup(objReadGroup.TagGroupList, strTagGroupName, arrVarList)
        objOutTagList.rows = objTagList.TagList.filter(function (tag) {//过滤工程中所有属于该变量组的变量
          let objFind = arrVarList.find(function (params) {
            return params.TagID == tag.TagID
          })
          if (objFind != undefined) {
            return true
          }
        })
      }
    }
    //
    for (var i = 0; i < objOutTagList.rows.length; i++) {
      var typeNum = objOutTagList.rows[i].TagDataType
      objOutTagList.rows[i].TagDataType = GetDataTypeString(typeNum)//转换数据类型
      typeNum = objOutTagList.rows[i].RegDataType
      objOutTagList.rows[i].RegDataType = GetDataTypeString(typeNum)//转换转换数据类型
      let nAccessType = objOutTagList.rows[i].AccessType
      objOutTagList.rows[i].AccessType = GetAccessString(nAccessType)//转换读写类型
      if (objOutTagList.rows[i].RegName != null && objOutTagList.rows[i].RegAddress != null) {
        var tagRegName = objOutTagList.rows[i].RegName
        var tagRegAddress = objOutTagList.rows[i].RegAddress
        if (typeof tagRegName != "string") {
          tagRegName = tagRegName.toString()
        }
        if (typeof tagRegAddress != "string") {
          tagRegAddress = tagRegAddress.toString()
        }
        objOutTagList.rows[i].RegAddress = tagRegAddress.substr(tagRegName.length)
      }
      let nConvertType = objOutTagList.rows[i].DataConvertType//转换数据转换类型
      objOutTagList.rows[i].DataConvertType = GetConvertTypeString(nConvertType)
      let nCleanType = 0
      let objCleanType = ""
      nCleanType = objOutTagList.rows[i].DataCleaningType//转换数据清洗类型
      objCleanType = GetDataCleanTypeString(nCleanType)
      // if (global.productType == 1) {
      //   nCleanType = objOutTagList.rows[i].DataCleaningType;//转换数据清洗类型
      //   objCleanType = GetDataCleanTypeString(nCleanType); 
      // }
      objOutTagList.rows[i].DataCleaningType = objCleanType.DataCleaningType
      objOutTagList.rows[i].ValueRangeType = objCleanType.ValueRangeType
      /* for (const param in objOutTagList.rows[i]) {
        if (objOutTagList.rows[i].hasOwnProperty(param) && (objOutTagList.rows[i][param] == "" || objOutTagList.rows[i][param]  == null)) {
          objOutTagList.rows[i][param] = "--";
        }
      } */
    }
  }
  objOutTagList.total = objOutTagList.rows.length
  //let strVarGroupJsonPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/VarGroupInfo.json"; 
  //console.timeEnd("getTagProperty");
  res.send(JSON.stringify(objOutTagList))
  VarLogManagerObj.traceLog(VarManagerName, "Leave post getTagProperty")
})

//循环嵌套获取一个变量组中的变量
function recursionGetVarInGroup (arrVarGroupList, strGroupName, arrVarList) {
  for (let i = 0; i < arrVarGroupList.length; i++) {
    if (arrVarGroupList[i].TagGroupName == strGroupName) {
      for (let j = 0; j < arrVarGroupList[i].TagObjectList.length; j++) {
        if (arrVarGroupList[i].TagObjectList[j].TagID) {//表示是变量
          arrVarList.push(arrVarGroupList[i].TagObjectList[j])
        } else {//表示是变量组，这个变量组下的所有变量也要放到arrVarList中
          if (arrVarGroupList[i].TagObjectList[j].TagObjectList.length > 0) {
            recursionGetVarInGroup(arrVarGroupList[i].TagObjectList, arrVarGroupList[i].TagObjectList[j].TagGroupName, arrVarList)
          }
        }
      }
    } else if (arrVarGroupList[i].TagObjectList) {//表示是变量
      recursionGetVarInGroup(arrVarGroupList[i].TagObjectList, strGroupName, arrVarList)
    }
  }
}

//获取一个工程下的所有变量组
router.post('/getTagGroupList', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post getTagGroupList")
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID
  let strProjectVersion = req.query.ProjectVersion
  let strProjectName = req.query.ProjectName
  if (global.productType == PRODUCTKF36) {
    var strProVarGroupPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/VarGroupInfo.json"
  } else {
    var strProVarGroupPath = global.sdbPath + "/" + strProjectName + "/VarGroupInfo.json"
  }
  let objGroupList = ReadJson(strProVarGroupPath)
  if (objGroupList.Error) {
    res.send("读取" + strProVarGroupPath + "错误，错误原因：" + objGroupList.ErrorDesc)
    VarLogManagerObj.errorLog(VarManagerName, "读取" + strProVarGroupPath + "错误，错误原因：" + objGroupList.ErrorDesc)
    return
  }
  delete objGroupList.Error

  let objTreeExample = ReadJson(global.propertyPath + '/CollectProjectTree.json')
  if (objTreeExample.Error) {
    res.send("读取" + global.propertyPath + "/CollectProjectTree.json错误，错误原因：" + objGroupList.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "读取" + global.propertyPath + "/CollectProjectTree.json错误，错误原因：" + objGroupList.ErrorDesc)
    return
  }
  var projectNode = new Array()
  projectNode.push({
    id: 0,
    text: "root",
    iconCls: "icon-unit-var",
    children: []
  })
  /* projectNode.id = 1;
  projectNode.text = req.query.ProjectName; */
  // = objTreeExample.RootNode.iconCls;

  /* var tempAttribute = new Object();
  tempAttribute.url = objTreeExample.RootNode.attributes.url; */
  //projectNode.attributes = tempAttribute;

  getTagGroup(projectNode[0].children, objGroupList.TagGroupList, true)
  res.send(JSON.stringify(projectNode))
  VarLogManagerObj.traceLog(VarManagerName, "Leave post getTagGroupList")
})

//获取所有变量组
//tagGroupList：变量组列表
//tagObjectList：TagGroupINfo.json中的列表，包含变量组和变量
//bFirst:表示是否是第一层
function getTagGroup (tagGroupList, tagObjectList, bFirst) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function getTagGroup")
  let nCount = 0
  for (let i = 0; i < tagObjectList.length; i++) {
    if (tagObjectList[i].TagGroupID) {
      if (nCount == 0 && tagGroupList.children == undefined && !bFirst) {
        tagGroupList.children = []
      }
      let objTemp = {}
      objTemp.id = nCount + 1
      objTemp.text = tagObjectList[i].TagGroupName
      objTemp.iconCls = "icon-unit-var"
      //objTemp.TagObjectList = tagObjectList[i].TagObjectList;
      if (bFirst) {
        tagGroupList.push(objTemp)
        getTagGroup(tagGroupList[nCount], tagObjectList[i].TagObjectList)
      }
      else {
        tagGroupList.children.push(objTemp)
        getTagGroup(tagGroupList.children[nCount], tagObjectList[i].TagObjectList)
      }
      nCount++
    }
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function getTagGroup")
}

//移动变量到另一个变量组
router.post('/moveVarToGroup', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post moveVarToGroup")
  req.query = pubInter.EscapeAllData(req.query)
  // modified by  jinlong.feng at 0722 移动变量到组问题
  let strProjectID = req.query.ProjectID || req.query.projectID
  if (!strProjectID) {
    res.send("工程ID不能为空")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
    return
  }
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  let projectPath = pathFunc.join(tenantDir, strProjectID, 'project')
  var strProjectVarPath = pathFunc.join(projectPath, "VarInfo.json")
  var strProjectVarGroupPath = pathFunc.join(projectPath, "VarGroupInfo.json")
  let moveRequestBody = pubInter.EscapeAllData(req.body || {})
  var objVarInfo = ReadJson(strProjectVarPath)
  if (objVarInfo.Error) {
    res.send("读取" + strProjectVarPath + "失败，错误原因：" + objVarInfo.ErrorDesc)
    VarLogManagerObj.errorLog(VarManagerName, "moveVarToGroup:读取" + strProjectVarPath + "失败，错误原因：" + objVarInfo.ErrorDesc)
    return
  }
  if (!objVarInfo.TagList || !Array.isArray(objVarInfo.TagList)) {
    res.send("变量文件格式错误")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
    return
  }
  var objVarGroupInfo = ReadJson(strProjectVarGroupPath)
  if (objVarGroupInfo.Error) {
    res.send("读取" + strProjectVarGroupPath + "失败，错误原因：" + objVarGroupInfo.ErrorDesc)
    VarLogManagerObj.errorLog(VarManagerName, "moveVarToGroup:读取" + strProjectVarGroupPath + "失败，错误原因：" + objVarGroupInfo.ErrorDesc)
    return
  }
  if (!objVarGroupInfo.TagGroupList || !Array.isArray(objVarGroupInfo.TagGroupList)) {
    res.send("变量组文件格式错误")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
    return
  }

  /**
   * @function parseMoveVarJson
   * @description 解析移动变量接口中可能为JSON字符串的入参字段
   * @param {Array|string} requestData 移动变量入参字段
   * @returns {Array|string|null} 解析后的入参字段，解析失败返回null
   */
  function parseMoveVarJson(requestData) {
    if (typeof(requestData) != "string") return requestData
    try {
      return JSON.parse(requestData)
    } catch (error) {
      return null
    }
  }

  /**
   * @function isRootVarGroup
   * @description 判断变量组ID或名称是否表示根变量组
   * @param {string|number} varGroupValue 变量组ID或名称
   * @returns {boolean} 是否为根变量组
   */
  function isRootVarGroup(varGroupValue) {
    return ["-1", "0", "root", "tagRoot", "变量", "数采变量"].indexOf(String(varGroupValue)) != -1
  }

  /**
   * @function findVarGroupById
   * @description 根据变量组ID从变量组树中查找变量组
   * @param {Array} groupListArr 变量组树节点列表
   * @param {string|number} varGroupID 变量组ID
   * @returns {Object|null} 匹配到的变量组节点，未匹配返回null
   */
  function findVarGroupById(groupListArr, varGroupID) {
    if (!Array.isArray(groupListArr)) return null
    for (let i = 0; i < groupListArr.length; i++) {
      if (groupListArr[i].TagGroupID != undefined && String(groupListArr[i].TagGroupID) == String(varGroupID)) {
        return groupListArr[i]
      }
      let matchedGroup = findVarGroupById(groupListArr[i].TagObjectList, varGroupID)
      if (matchedGroup) return matchedGroup
    }
    return null
  }

  /**
   * @function findVarGroupByName
   * @description 根据变量组名称从变量组树中查找变量组，兼容旧移动变量入参
   * @param {Array} groupListArr 变量组树节点列表
   * @param {string} varGroupName 变量组名称
   * @returns {Object|null} 匹配到的变量组节点，未匹配返回null
   */
  function findVarGroupByName(groupListArr, varGroupName) {
    if (!Array.isArray(groupListArr)) return null
    for (let i = 0; i < groupListArr.length; i++) {
      if (groupListArr[i].TagGroupName == varGroupName) {
        return groupListArr[i]
      }
      let matchedGroup = findVarGroupByName(groupListArr[i].TagObjectList, varGroupName)
      if (matchedGroup) return matchedGroup
    }
    return null
  }

  /**
   * @function findVarInfoById
   * @description 根据变量ID从变量列表中查找变量信息
   * @param {Array} tagList 变量列表
   * @param {string|number} tagID 变量ID
   * @returns {Object|null} 匹配到的变量信息，未匹配返回null
   */
  function findVarInfoById(tagList, tagID) {
    for (let i = 0; i < tagList.length; i++) {
      if (String(tagList[i].TagID) == String(tagID)) {
        return tagList[i]
      }
    }
    return null
  }

  /**
   * @function removeVarFromGroupTree
   * @description 从整棵变量组树中删除变量引用
   * @param {Array} groupListArr 变量组树节点列表
   * @param {string|number} tagID 变量ID
   * @returns {boolean} 是否删除成功
   */
  function removeVarFromGroupTree(groupListArr, tagID) {
    if (!Array.isArray(groupListArr)) return false
    let isRemoved = false
    for (let i = groupListArr.length - 1; i >= 0; i--) {
      if (groupListArr[i].TagID != undefined && String(groupListArr[i].TagID) == String(tagID)) {
        groupListArr.splice(i, 1)
        isRemoved = true
        continue
      }
      if (groupListArr[i].TagObjectList && groupListArr[i].TagObjectList.length != 0) {
        let childRemoved = removeVarFromGroupTree(groupListArr[i].TagObjectList, tagID)
        isRemoved = isRemoved || childRemoved
      }
    }
    return isRemoved
  }

  /**
   * @function addVarToTargetGroup
   * @description 将变量引用添加到目标变量组
   * @param {Array} targetVarList 目标变量组下的变量列表
   * @param {string|number} tagID 变量ID
   * @param {string} tagName 变量名称
   * @returns {void} 无返回值
   */
  function addVarToTargetGroup(targetVarList, tagID, tagName) {
    for (let i = 0; i < targetVarList.length; i++) {
      if (targetVarList[i].TagID != undefined && String(targetVarList[i].TagID) == String(tagID)) {
        return
      }
    }
    let newGroupObj = new Object()
    newGroupObj.TagID = tagID
    newGroupObj.TagName = tagName
    targetVarList.push(newGroupObj)
  }

  let requestVarIds = parseMoveVarJson(moveRequestBody.varIds || moveRequestBody.varIDs || moveRequestBody.tagIds || moveRequestBody.tagIDs || moveRequestBody.TagIDs)
  let targetVarGroupIdArr = [
    moveRequestBody.targetVarGroupId,
    moveRequestBody.targetVarGroupID,
    moveRequestBody.DesVarGroupID,
    req.query.targetVarGroupId,
    req.query.targetVarGroupID,
    req.query.DesVarGroupID
  ]
  let targetVarGroupId
  for (let targetVarGroupIndex = 0; targetVarGroupIndex < targetVarGroupIdArr.length; targetVarGroupIndex++) {
    if (targetVarGroupIdArr[targetVarGroupIndex] !== undefined && targetVarGroupIdArr[targetVarGroupIndex] !== "") {
      targetVarGroupId = targetVarGroupIdArr[targetVarGroupIndex]
      break
    }
  }
  let isNewMoveVarParams = Array.isArray(requestVarIds) && targetVarGroupId !== undefined && targetVarGroupId !== ""
  let arrMoveVarList = []
  let strDesVarGroup = req.query.desVarGroup
  let targetVarObjectList = null

  if (isNewMoveVarParams) {
    if (isRootVarGroup(targetVarGroupId)) {
      strDesVarGroup = "root"
      targetVarObjectList = null
    } else {
      let targetVarGroupNode = findVarGroupById(objVarGroupInfo.TagGroupList, targetVarGroupId)
      if (!targetVarGroupNode) {
        res.send("目标变量组不存在:" + targetVarGroupId)
        VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
        return
      }
      if (!targetVarGroupNode.TagObjectList) targetVarGroupNode.TagObjectList = []
      strDesVarGroup = targetVarGroupNode.TagGroupName
      targetVarObjectList = targetVarGroupNode.TagObjectList
    }

    for (let i = 0; i < requestVarIds.length; i++) {
      let varInfo = findVarInfoById(objVarInfo.TagList, requestVarIds[i])
      if (!varInfo) {
        res.send("变量不存在:" + requestVarIds[i])
        VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
        return
      }
      arrMoveVarList.push({
        TagID: varInfo.TagID,
        TagName: varInfo.TagName,
        TagGroup: varInfo.TagGroup,
      })
    }
  } else {
    arrMoveVarList = parseMoveVarJson(moveRequestBody.data)
    if (arrMoveVarList == null || !Array.isArray(arrMoveVarList) || arrMoveVarList.length == 0) {
      res.send("移动变量参数错误")
      VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
      return
    }

    if (isRootVarGroup(strDesVarGroup)) {
      strDesVarGroup = "root"
      targetVarObjectList = null
    } else {
      let targetVarGroupNode = findVarGroupByName(objVarGroupInfo.TagGroupList, strDesVarGroup)
      if (!targetVarGroupNode) {
        res.send("该变量组(" + strDesVarGroup + ")不存在")
        VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
        return
      }
      if (!targetVarGroupNode.TagObjectList) targetVarGroupNode.TagObjectList = []
      targetVarObjectList = targetVarGroupNode.TagObjectList
    }

    for (let i = 0; i < arrMoveVarList.length; i++) {
      let varInfo = findVarInfoById(objVarInfo.TagList, arrMoveVarList[i].TagID)
      if (!varInfo) {
        res.send("变量不存在:" + arrMoveVarList[i].TagName)
        VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
        return
      }
      arrMoveVarList[i].TagName = arrMoveVarList[i].TagName || varInfo.TagName
      arrMoveVarList[i].TagGroup = arrMoveVarList[i].TagGroup || varInfo.TagGroup
    }
  }

  let movedVarIdSet = new Set()
  for (let i = 0; i < arrMoveVarList.length; i++) {
    let normalizedTagID = String(arrMoveVarList[i].TagID)
    if (movedVarIdSet.has(normalizedTagID)) continue
    movedVarIdSet.add(normalizedTagID)
    if (!isRootVarGroup(arrMoveVarList[i].TagGroup)) {
      let removeVarResult = removeVarFromGroupTree(objVarGroupInfo.TagGroupList, arrMoveVarList[i].TagID)
      if (!removeVarResult) {
        res.send("在VarGroupInfo.json中删除变量" + arrMoveVarList[i].TagName + "失败，原因：Not found")
        VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
        return
      }
    }
    if (targetVarObjectList) {
      addVarToTargetGroup(targetVarObjectList, arrMoveVarList[i].TagID, arrMoveVarList[i].TagName)
    }
    let varInfo = findVarInfoById(objVarInfo.TagList, arrMoveVarList[i].TagID)
    varInfo.TagGroup = strDesVarGroup
  }

  let resWrite = WriteJson(strProjectVarPath, objVarInfo)
  if (resWrite != "OK") {
    res.send(resWrite)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
    return
  }
  resWrite = WriteJson(strProjectVarGroupPath, objVarGroupInfo)
  if (resWrite != "OK") {
    res.send(resWrite)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
    return
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave post moveVarToGroup")
  res.send("OK")
  // end
})

//从右向左提取出一个字符串中的数字,返回值为已个对象，包含两个属性，一个是提取出来的数字，一个是去掉数字
//之后的字符串
function GetNumberInChar (strInput) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function GetNumberInChar")
  // let nLength = strInput.length;
  // var r = /^\d+$/;　　//非负整数
  var r = /[\u4E00-\u9FA5A-Za-z0_]+/
  let strOutput = r.exec(strInput)
  // let nInd = nLength - 1;
  // for (let i = 0; i < nLength; i++) {
  //   if (r.test(strInput)) {
  //     nInd--;
  //   }
  //   else{
  //     break;
  //   }
  // }
  var nLength = strOutput[0].length
  var strlength = strInput.length
  let nNum = Number(strInput.substr(nLength, strlength - nLength))
  // let nNum = Number(strInput.substr(nInd + 1, nLength - nInd - 1));
  // let strOutput = strInput.substr(0, nInd + 1);
  var objOutput = {}
  objOutput.nNum = nNum
  objOutput.strOutput = strOutput[0]

  VarLogManagerObj.traceLog(VarManagerName, "Leave function GetNumberInChar")
  return objOutput
}

//将从属性框中传过来的json字符串解析成合适的变量对象
function GetVarJsonInfo (strVarJson) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function GetVarJsonInfo")
  let objTagInfo = []
  if (typeof strVarJson == "string") {
    objTagInfo = JSON.parse(strVarJson).rows
  }
  else {
    objTagInfo = strVarJson
  }
  var objNewTagInfo = {}
  for (let i = 0; i < objTagInfo.length; i++) {
    let strTemp = objTagInfo[i].value
    /*if (objTagInfo[i].key == "TagDataType") {
      objNewTagInfo[objTagInfo[i].key] = GetDataTypeNum(strTemp);
    }
    else if (objTagInfo[i].key == "RegDataType") {
      objNewTagInfo[objTagInfo[i].key] = GetDataTypeNum(strTemp);
    }
     else if (objTagInfo[i].key == "AccessType") {
      objNewTagInfo[objTagInfo[i].key] = GetAccessType(strTemp);
    } 
    else if (objTagInfo[i].key == "DataConvertType") {
      objNewTagInfo[objTagInfo[i].key] = GetConvertTypeNum(strTemp);
    }*/
    if (objTagInfo[i].editor && objTagInfo[i].editor.type && objTagInfo[i].editor.type == "combobox") {//编辑时会用到
      if (objTagInfo[i].editor.options.data) {
        let objComboxList = objTagInfo[i].editor.options.data
        for (let j = 0; j < objComboxList.length; j++) {
          let objTemp = objTagInfo[i].editor.options.data[j]
          if (objTemp.id != objTemp.text && objTemp.text == objTagInfo[i].value) {
            strTemp = objTemp.id
            break
          }
        }
      }
    }
    else if (objTagInfo[i].key == "ValueRangeType") {
      continue
    }
    if (objTagInfo[i].key == "TagName" || objTagInfo[i].key == "Description" || objTagInfo[i].key == "DeviceName" ||
      objTagInfo[i].key == "TagGroup" || objTagInfo[i].key == "RegName" || objTagInfo[i].key == "RegAddress" ||
      objTagInfo[i].key == "NonLinearName" || objTagInfo[i].key == "OldTagName" || objTagInfo[i].key == "Unit" || objTagInfo[i].key == "SpaceTimeName" ||
      objTagInfo[i].key == "SpaceTimeTagName") {
      objNewTagInfo[objTagInfo[i].key] = objTagInfo[i].value
    }
    else {
      let nNumField = Number(strTemp)
      if (objTagInfo[i].key == "DataCleaningType") {
        //查找ValueRangeType
        let objValueRangeType = objTagInfo.find(function (tagField) {
          return tagField.key == "ValueRangeType"
        })
        objNewTagInfo[objTagInfo[i].key] = GetDataCleanTypeNum(strTemp, objValueRangeType.value)
      }
      else if (!isNaN(nNumField)) {
        objNewTagInfo[objTagInfo[i].key] = nNumField
      }
      else {
        objNewTagInfo[objTagInfo[i].key] = 0
      }
    }
  }
  //增加一个变量类别的属性
  objNewTagInfo.TagType = KVIO_TAG_TYPE_USER
  if (global.productType == PRODUCTKF40) {
    //增加一些其他属性
    objNewTagInfo.CollectOffect = 0//采集偏移
    objNewTagInfo.TimeZoneBias = 0//时间偏移
    objNewTagInfo.TimeAdjustment = 0//时间校正
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function GetVarJsonInfo")
  return objNewTagInfo
}

//获取一个设备的所有信息
let gloab_dn2info = {}//{设备名称:设备信息}
function getOneDevInfo (strProjectName, strProjectID, projectPath, DeviceName) {
  let objOneDev = {}
  objOneDev.ErrMsg = ""
  objOneDev.DeviceInfo = {}
  let dinfo = gloab_dn2info[strProjectID + DeviceName]//工程id+设备名称，保证唯一性
  if (dinfo) {
    objOneDev.DeviceInfo = dinfo
    return objOneDev
  }
  if (global.productType == PRODUCTKF36) {
    var strDevJsonPath = path.join(projectPath, "DeviceInfo.json")
  }
  else {
    var strDevJsonPath = path.join(projectPath, "DeviceInfo.json")
  }
  let objDeviceInfo = ReadJson(strDevJsonPath)

  if (objDeviceInfo.Error) {
    objOneDev.ErrMsg = strDevJsonPath + ": " + objDeviceInfo.ErrorDesc
    VarLogManagerObj.traceLog(VarManagerName, "Leave function getOneDevInfo")
    return objOneDev
  }
  else if (objDeviceInfo.DeviceList == undefined) {
    objOneDev.ErrMsg = strDevJsonPath + ":文件格式错误，缺少DeviceList"
    VarLogManagerObj.traceLog(VarManagerName, "Leave function getOneDevInfo")
    return objOneDev
  }
  let objDevice = objDeviceInfo.DeviceList.filter(function (device) {
    VarLogManagerObj.traceLog(VarManagerName, "Leave function getOneDevInfo")
    return device.DeviceName == DeviceName
  })

  if (objDevice.length == 0) {
    objOneDev.ErrMsg = "该变量所属的设备(" + DeviceName + ")不存在"
    VarLogManagerObj.traceLog(VarManagerName, "Leave function getOneDevInfo")
    return objOneDev
  }
  else if (objDevice.length > 1) {
    objOneDev.ErrMsg = "该变量所属的设备(" + DeviceName + ")有不止一个"
    VarLogManagerObj.traceLog(VarManagerName, "Leave function getOneDevInfo")
    return objOneDev
  }
  objOneDev.DeviceInfo = objDevice[0]
  VarLogManagerObj.traceLog(VarManagerName, "Leave function getOneDevInfo")
  gloab_dn2info[strProjectID + DeviceName] = objOneDev.DeviceInfo
  return objOneDev
}
//add by tingting.wang 根据变量组名称找到完整的变量组路径
function getTagGroupPath (root, targetGroupName) {
  const path = []
  if (targetGroupName == 'root') return targetGroupName
  // modified by  jinlong.feng at 0727 变量组路径导出兼容修改
  function isTagGroupPathExist (groupListArr, groupPath) {
    if (!Array.isArray(groupListArr) || !groupPath || groupPath.indexOf('.') == -1) return false
    const groupNames = groupPath.split('.').filter(segment => segment.length > 0)
    let currentChildren = groupListArr
    for (let i = 0; i < groupNames.length; i++) {
      let matchedGroup = null
      for (let j = 0; j < currentChildren.length; j++) {
        if (currentChildren[j].TagGroupName == groupNames[i]) {
          matchedGroup = currentChildren[j]
          break
        }
      }
      if (!matchedGroup) return false
      currentChildren = matchedGroup.TagObjectList || []
    }
    return true
  }
  if (isTagGroupPathExist(root.TagGroupList, targetGroupName)) {
    return targetGroupName
  }
  // end
  function traverse (node) {
    path.push(node.TagGroupName)
    if (node.TagGroupName === targetGroupName) return true
    if (node.TagObjectList) {
      for (const child of node.TagObjectList) {
        if (traverse(child)) return true
      }
    }
    path.pop()
    return false
  }
  for (let i = 0; i < root.TagGroupList.length; i++) {
    // modified by  jinlong.feng at 0727 变量组路径导出兼容修改
    if (traverse(root.TagGroupList[i])) {
      break
    }
    // end
  }
  var tagGrouPath = path.join('.')
  return tagGrouPath.length > 0 ? tagGrouPath : 'root'
}
//add end by tingting.wang

//获取一个变量组所在的位置,返回值是一个数组，数组的每个元素分别表示数组的位置或对象的字段名
function getGroupLocation (arrTagGroupList, strGroupName) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function getGroupLocation")
  var strField = ""//当前字段的值
  var arrLocation = [0]//记录当前位置的数组
  var arrCurrent = arrTagGroupList//当前的数组
  var arrOld = {}//每一次编历到的数组
  var i = 0//当前的位置索引
  var nIndex = 0//当前位置在第一层的位置索引
  while (nIndex < arrTagGroupList.length) {
    if (arrCurrent.length > 0) {
      strField = arrCurrent[i].TagGroupName
    }

    if (strField == strGroupName) {//表示该位置是所找的变量组
      arrLocation[arrLocation.length - 1] = i
      break
    }
    else if (arrCurrent.length > 0 && arrCurrent[i].TagObjectList != undefined) {//表示该位置不是所找的变量组，但还有下一级嵌套
      arrLocation.push(0)
      arrOld["lay" + (arrLocation.length - 1)] = arrCurrent
      arrCurrent = arrCurrent[i].TagObjectList
      i = 0
    }
    else {//表示该位置不是所找的变量组，并且没有下一级嵌套
      while (i >= arrCurrent.length - 1 && arrLocation.length > 0) {//表示已经遍历完了当前数组
        arrLocation.pop()
        if (arrLocation.length > 0) {
          i = arrLocation[arrLocation.length - 1]
          arrCurrent = arrOld["lay" + arrLocation.length]
        }
      }
      i++
      if (arrLocation.length > 0) {
        arrLocation[arrLocation.length - 1] = i
      }
      if (JSON.stringify(arrCurrent) == JSON.stringify(arrTagGroupList)) {
        nIndex++
      }
    }
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function getGroupLocation")
  return arrLocation
}

//获取一个设备的驱动的所有寄存器
router.post('/getRegisterNames', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post getRegisterNames")
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID//获取工程的ID
  var projectPath = path.join(tenantDir, strProjectID, 'project')
  let strProjectVersion = req.query.ProjectVersion//获取工程的版本
  let strProjectName = req.query.ProjectName//获取工程的版本
  let strDeviceName = req.query.DeviceName//设备的名称
  //var objDeviceInfo =  getOneDevInfo(strProjectID, strProjectVersion, strDeviceName);
  var objDeviceInfo = getOneDevInfo(strProjectName, strProjectID, projectPath, strDeviceName)
  if (objDeviceInfo.ErrMsg != "") {
    res.send({
      Error: true,
      ErrorDesc: objDeviceInfo.ErrMsg,
      data: []
    })
    VarLogManagerObj.traceLog(VarManagerName, "Leave post getRegisterNames")
    return
  }
  var arrRegLIst = []//所有寄存器信息的列表
  let strDriverName = objDeviceInfo.DeviceInfo.DriverName
  var strDriverSeries = objDeviceInfo.DeviceInfo.DriverSeries
  //20240118 适配括号
  let converDriverSeries = ""
  for (let j = 0; j < strDriverSeries.length; j++) {
    let e = strDriverSeries[j]
    if (e == "(") {
      converDriverSeries += "LB"
    } else if (e == ")") {
      converDriverSeries += "RB"
    } else {

      converDriverSeries += e
    }
  }
  let strXmlPath = ""
  if (global.productType == PRODUCTKF36) {
    strXmlPath = pathFunc.join(projectPath, "Driver/" + strDriverName + ".xml")
  } else {
    strXmlPath = pathFunc.join(projectPath, "Driver/" + strDriverName + ".xml")
  }

  let strDriverXmlName = strDriverName + ".xml"
  if (!fs.existsSync(strXmlPath)) {
    res.send({
      Error: true,
      ErrorDesc: strXmlPath + " 驱动文件不存在",
      data: []
    })
    VarLogManagerObj.traceLog(VarManagerName, "Leave post getRegisterNames")
    return
  }
  let buf = fs.readFileSync(strXmlPath, "utf-8")
  var ss = xml2js.parseString(buf, { explicitArray: false }, function (err, json) {
    if (err) {
      console(err.message)
      res.send({
        Error: true,
        ErrorDesc: err.message,
        data: []
      })
    }
    if (typeof (json["XML"]) == 'object') {
      for (x in json["XML"][strDriverName]) {
        if (typeof (json["XML"][strDriverName][x]) == 'object') {
          strDriverXmlName = "XML"
          break
        }
      }
    }
    for (x in json[strDriverXmlName][strDriverName]) {
      if (typeof (json[strDriverXmlName][strDriverName][x]) == 'object' && x == converDriverSeries) {//20240118
        let strReglist = ""
        for (var key in json[strDriverXmlName][strDriverName][x].RegisterInfo) {
          let objRegInfo = {}
          if (key.indexOf("XmlNumNode") == 0) {
            objRegInfo.id = key.substr(10, key.length)
          }
          else {
            objRegInfo.id = key
          }
          objRegInfo.text = objRegInfo.id
          arrRegLIst.push(objRegInfo)
        }
      }
    }
    VarLogManagerObj.traceLog(VarManagerName, "Async Leave post getRegisterNames")
    res.send({
      Error: false,
      ErrorDesc: "",
      data: arrRegLIst
    })
  })
  //使用校验模块
  /* KingConfigModule.getConfigModuleObject();
  if (!fs.existsSync(strXmlPath)){
    res.send(strXmlPath + "文件不存在");
    return;
  }
  KingConfigModule.setXmlPath(strXmlPath);
  //第一个参数（传出参数）
  let objRegInfo = {};
  //第二个参数(传出参数)
  let objRegCount = {};
  objRegCount.nRegCount = -1;
  nRes = KingConfigModule.getRegister(objRegInfo, objRegCount, strDriverName, strDriverName);
  var arrRegList = [];
  res.send(arrRegList); */
  VarLogManagerObj.traceLog(VarManagerName, "Leave post getRegisterNames")
})
//获取一个设备的驱动的所有寄存器
router.post('/getRegisterNamesFromDriver', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post getRegisterNamesFromDriver")

  var objDeviceInfo = req.body

  var arrRegLIst = []//所有寄存器信息的列表
  let strDriverName = objDeviceInfo.DriverName
  var strDriverSeries = objDeviceInfo.DeviceSeries
  //20240118 适配括号
  let converDriverSeries = ""
  for (let j = 0; j < strDriverSeries.length; j++) {
    let e = strDriverSeries[j]
    if (e == "(") {
      converDriverSeries += "LB"
    } else if (e == ")") {
      converDriverSeries += "RB"
    } else {

      converDriverSeries += e
    }
  }
  let strXmlPath = ""
  //服务端驱动路径
  strXmlPath = "./Driver/" + objDeviceInfo.SysPlatform
    + "/" + objDeviceInfo.OsType
    + "/" + objDeviceInfo.DriverCompany
    + "/" + strDriverName
    + "/" + objDeviceInfo.DriverVersion
    + "/" + strDriverName + ".xml"

  let strDriverXmlName = strDriverName + ".xml"
  if (!fs.existsSync(strXmlPath)) {
    res.send({
      Error: true,
      ErrorDesc: strXmlPath + " 驱动文件不存在",
      data: []
    })
    VarLogManagerObj.traceLog(VarManagerName, "Leave post getRegisterNamesFromDriver")
    return
  }
  let buf = fs.readFileSync(strXmlPath, "utf-8")
  var ss = xml2js.parseString(buf, { explicitArray: false }, function (err, json) {
    if (err) {
      console(err.message)
      res.send({
        Error: true,
        ErrorDesc: err.message,
        data: []
      })
    }
    if (typeof (json["XML"]) == 'object') {
      for (x in json["XML"][strDriverName]) {
        if (typeof (json["XML"][strDriverName][x]) == 'object') {
          strDriverXmlName = "XML"
          break
        }
      }
    }
    for (x in json[strDriverXmlName][strDriverName]) {
      if (typeof (json[strDriverXmlName][strDriverName][x]) == 'object' && x == converDriverSeries) {//20240118
        let strReglist = ""
        for (var key in json[strDriverXmlName][strDriverName][x].RegisterInfo) {
          let objRegInfo = {}
          if (key.indexOf("XmlNumNode") == 0) {
            objRegInfo.id = key.substr(10, key.length)
          }
          else {
            objRegInfo.id = key
          }
          objRegInfo.text = objRegInfo.id
          arrRegLIst.push(objRegInfo)
        }
      }
    }
    VarLogManagerObj.traceLog(VarManagerName, "Async Leave post getRegisterNamesFromDriver")
    res.send({
      Error: false,
      ErrorDesc: "",
      data: arrRegLIst
    })
  })
  VarLogManagerObj.traceLog(VarManagerName, "Leave post getRegisterNamesFromDriver")
})
//获取一个寄存器的所有数据类型
router.post('/getDataTypeByRegName', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post getDataTypeByRegName")
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID//获取工程的ID
  var projectPath = path.join(tenantDir, strProjectID, 'project')
  let strDeviceName = req.query.DeviceName//设备的名称
  let strRegName = req.query.RegName//寄存器的名称
  let strProjectName = req.query.ProjectName//工程的名称
  //若寄存器的名称为数字，则要在它的前边加上“XmlNumNode”
  var regPos = /^\d+(\.\d+)?$/ //非负浮点数
  if (regPos.test(strRegName[0])) {
    strRegName = "XmlNumNode" + strRegName
  }

  var objRes = {
    Error: false,
    ErrorDesc: "",
    data: []
  }
  var objDeviceInfo = getOneDevInfo(strProjectName, strProjectID, projectPath, strDeviceName)
  if (objDeviceInfo.ErrMsg != "") {
    objRes.Error = true
    objRes.ErrorDesc = objDeviceInfo.ErrMsg
    res.send(objRes)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post getDataTypeByRegName")
    return
  }
  //var arrRegList = [];//所有寄存器信息的列表
  let strDriverName = objDeviceInfo.DeviceInfo.DriverName
  var strDriverSeries = objDeviceInfo.DeviceInfo.DriverSeries//驱动的设备系列
  //20240118 适配括号
  let converDriverSeries = ""
  for (let j = 0; j < strDriverSeries.length; j++) {
    let e = strDriverSeries[j]
    if (e == "(") {
      converDriverSeries += "LB"
    } else if (e == ")") {
      converDriverSeries += "RB"
    } else {

      converDriverSeries += e
    }
  }
  let strXmlPath = ""
  if (global.productType == PRODUCTKF36) {
    strXmlPath = pathFunc.join(projectPath, "Driver/" + strDriverName + ".xml")
  } else {
    strXmlPath = pathFunc.join(projectPath, "Driver/" + strDriverName + ".xml")
  }
  let strDriverXmlName = strDriverName + ".xml"
  if (!fs.existsSync(strXmlPath)) {
    objRes.Error = true
    objRes.ErrorDesc = strXmlPath + " 驱动文件不存在"
    res.send(objRes)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post getDataTypeByRegName")
    return
  }
  let buf = fs.readFileSync(strXmlPath, "utf-8")
  var arrRegDataTypeInfo = []
  xml2js.parseString(buf, { explicitArray: false }, function (err, json) {
    if (err) {
      console(err.message)
      objRes.Error = true
      objRes.ErrorDesc = err.message
      res.send(objRes)
    }
    if (typeof (json["XML"]) == 'object') {
      for (x in json["XML"][strDriverName]) {
        if (typeof (json["XML"][strDriverName][x]) == 'object') {
          strDriverXmlName = "XML"
          break
        }
      }
    }
    for (x in json[strDriverXmlName][strDriverName]) {
      if (typeof (json[strDriverXmlName][strDriverName][x]) == 'object' && x == converDriverSeries) {
        let strReglist = ""
        for (var key in json[strDriverXmlName][strDriverName][x].RegisterInfo) {
          if (key == strRegName) {
            let strDataType = json[strDriverXmlName][strDriverName][x]["RegisterInfo"][key]["DataType"]
            let strRegDataType = GetDataTypeString(Number(strDataType))
            //寄存器数据类型的数组
            if (strRegDataType.charAt(0) == "[") {
              let arrRegDataType = JSON.parse(strRegDataType)
              for (let i = 0; i < arrRegDataType.length; i++) {
                let objTempDataType = {}
                objTempDataType.id = GetDataTypeNum(arrRegDataType[i])
                objTempDataType.text = arrRegDataType[i]
                arrRegDataTypeInfo.push(objTempDataType)
              }
            }
            else {
              arrRegDataTypeInfo.push({ id: Number(strDataType), text: strRegDataType })
            }
            break
          }
        }
      }
    }
    VarLogManagerObj.traceLog(VarManagerName, "Async Leave post getDataTypeByRegName")
    objRes.data = arrRegDataTypeInfo
    res.send(objRes)
    return
  })
  VarLogManagerObj.traceLog(VarManagerName, "Leave post getDataTypeByRegName")
})

//获取一个寄存器的所有数据类型
router.post('/getDataTypeByRegNameFromDriver', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post getDataTypeByRegNameFromDriver")

  var objRes = {
    Error: false,
    ErrorDesc: "",
    data: []
  }

  var objDeviceInfo = req.body

  let strRegName = objDeviceInfo.RegName//寄存器的名称

  //若寄存器的名称为数字，则要在它的前边加上“XmlNumNode”
  var regPos = /^\d+(\.\d+)?$/ //非负浮点数
  if (regPos.test(strRegName[0])) {
    strRegName = "XmlNumNode" + strRegName
  }

  let strDriverName = objDeviceInfo.DriverName
  var strDriverSeries = objDeviceInfo.DeviceSeries
  let strXmlPath = ""
  //服务端驱动路径
  strXmlPath = "./Driver/" + objDeviceInfo.SysPlatform
    + "/" + objDeviceInfo.OsType
    + "/" + objDeviceInfo.DriverCompany
    + "/" + strDriverName
    + "/" + objDeviceInfo.DriverVersion
    + "/" + strDriverName + ".xml"


  let strDriverXmlName = strDriverName + ".xml"
  if (!fs.existsSync(strXmlPath)) {
    objRes.Error = true
    objRes.ErrorDesc = strXmlPath + " 驱动文件不存在"
    res.send(objRes)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post getDataTypeByRegNameFromDriver")
    return
  }
  let buf = fs.readFileSync(strXmlPath, "utf-8")
  var arrRegDataTypeInfo = []
  xml2js.parseString(buf, { explicitArray: false }, function (err, json) {
    if (err) {
      console(err.message)
      objRes.Error = true
      objRes.ErrorDesc = err.message
      res.send(objRes)
    }
    if (typeof (json["XML"]) == 'object') {
      for (x in json["XML"][strDriverName]) {
        if (typeof (json["XML"][strDriverName][x]) == 'object') {
          strDriverXmlName = "XML"
          break
        }
      }
    }
    for (x in json[strDriverXmlName][strDriverName]) {
      if (typeof (json[strDriverXmlName][strDriverName][x]) == 'object' && x == strDriverSeries) {
        let strReglist = ""
        for (var key in json[strDriverXmlName][strDriverName][x].RegisterInfo) {
          if (key == strRegName) {
            let strDataType = json[strDriverXmlName][strDriverName][x]["RegisterInfo"][key]["DataType"]
            let strRegDataType = GetDataTypeString(Number(strDataType))
            //寄存器数据类型的数组
            if (strRegDataType.charAt(0) == "[") {
              let arrRegDataType = JSON.parse(strRegDataType)
              for (let i = 0; i < arrRegDataType.length; i++) {
                let objTempDataType = {}
                objTempDataType.id = GetDataTypeNum(arrRegDataType[i])
                objTempDataType.text = arrRegDataType[i]
                arrRegDataTypeInfo.push(objTempDataType)
              }
            }
            else {
              arrRegDataTypeInfo.push({ id: Number(strDataType), text: strRegDataType })
            }
            break
          }
        }
      }
    }
    VarLogManagerObj.traceLog(VarManagerName, "Async Leave post getDataTypeByRegNameFromDriver")
    objRes.data = arrRegDataTypeInfo
    res.send(objRes)
    return
  })
  VarLogManagerObj.traceLog(VarManagerName, "Leave post getDataTypeByRegNameFromDriver")
})


var nAddTagCount = 0
//批量新建变量
router.post('/submitCollectTagPropertyMultiple', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post submitCollectTagProperty")
  let objResponse = { "code": 0, "message": "OK", "data": [] }
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID//获取工程的ID
  let strProjectVersion = req.query.ProjectVersion//获取工程的版本
  let strProjectName = req.query.ProjectName//工程名称
  //let strTagInfo = pubInter.EscapeAllData(req.body);
  let objNewTagInfos = pubInter.EscapeAllData(req.body)
  let xmlPaths = []//存储每个变量的xml路径
  //验证每一个变量是否满足要求
  for (let i = 0; i < objNewTagInfos.length; i++) {
    let objNewTagInfo = objNewTagInfos[i]
    //查看数据类型和寄存器类型是否对应
    if ((objNewTagInfo.RegDataType == 1 || objNewTagInfo.RegDataType == 256 || objNewTagInfo.RegDataType == 1024 || objNewTagInfo.TagDataType == 1 || objNewTagInfo.TagDataType == 256 || objNewTagInfo.TagDataType == 1024) && objNewTagInfo.TagDataType != objNewTagInfo.RegDataType) {
      objResponse.code = -1
      objResponse.message = "转换数据类型与寄存器数据类型不匹配"
      res.send(objResponse)
      return
    }
    //获取设备的驱动和ID
    let objDevice = getOneDevInfo(strProjectName, strProjectID, strProjectVersion, objNewTagInfo.DeviceName)
    if (objDevice.ErrMsg != "") {
      objResponse.code = -1
      objResponse.message = objDevice.ErrMsg
      res.send(objResponse)
      VarLogManagerObj.errorLog(VarManagerName, objDevice.ErrMsg)
      return
    }
    //获取与设备相关的信息
    let strDriverName = objDevice.DeviceInfo.DriverName
    if (objDevice.DeviceInfo.DriverSeries) {
      var strDeviceSeries = objDevice.DeviceInfo.DriverSeries
    }
    else if (objDevice.DeviceInfo.DeviceSeries) {
      var strDeviceSeries = objDevice.DeviceInfo.DeviceSeries
    }
    var DriverVersion = objDevice.DeviceInfo.DriverVersion
    objNewTagInfo.DeviceID = objDevice.DeviceInfo.DeviceID
    objNewTagInfo.ChannelDriver = objDevice.DeviceInfo.DriverName
    if (global.productType == PRODUCTKF40) {
      if (objDevice.DeviceInfo.LinkName == "COM") {
        objNewTagInfo.ChannelName = objDevice.DeviceInfo.SerialName
      }
      else {
        objNewTagInfo.ChannelName = objDevice.DeviceInfo.LinkIP
      }
      objNewTagInfo.DeviceSeriesType = objDevice.DeviceInfo.DriverSeriesType
    }
    objNewTagInfo.DeviceSeries = strDeviceSeries
    //设备冗余属性

    if (objDevice.DeviceInfo.RedunDeviceID == "") {
      objNewTagInfo.RedunDeviceID = 0
    } else {
      objNewTagInfo.RedunDeviceID = Number(objDevice.DeviceInfo.RedunDeviceID)
    }
    objNewTagInfo.DataCleaningType = 0
    objNewTagInfo.TagNanoId = "io_" + nanoid(21)//20251009
    let strXmlPath = "", strDriverXmlPath = ""
    if (global.productType == PRODUCTKF36) {
      strXmlPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/Driver/" + strDriverName + ".xml"
    } else {
      strXmlPath = global.sdbPath + "/" + strProjectName + "/Driver/" + strDriverName + ".xml"
    }
    //服务端驱动路径
    strDriverXmlPath = "./Driver/" + objDevice.DeviceInfo.SystemPlatform + "/" + objDevice.DeviceInfo.OsType + "/" + objDevice.DeviceInfo.DeviceProvider + "/" + strDriverName + "/" + DriverVersion + "/" + strDriverName + ".xml"
    //使用校验模块校验
    //KingConfigModule.getConfigModuleObject();//20250611 屏蔽，解决批量新建变量（含有不同设备的）
    if (!fs.existsSync(strXmlPath)) {
      //sendMsgToMainThread(strXmlPath + "文件不存在");
      objResponse.code = -1
      objResponse.message = strXmlPath + "文件不存在"
      res.send(objResponse)
      VarLogManagerObj.errorLog(VarManagerName, strXmlPath + "文件不存在")
      return
    }
    if (!fs.existsSync(strDriverXmlPath)) {
      //sendMsgToMainThread(strDriverXmlPath + "文件不存在");
      objResponse.code = -1
      objResponse.message = strDriverXmlPath + "文件不存在"
      res.send(objResponse)
      VarLogManagerObj.errorLog(VarManagerName, strDriverXmlPath + "文件不存在")
      return
    }
    //KingConfigModule.setXmlPath(strDriverXmlPath);//20250611 屏蔽，解决批量新建变量（含有不同设备的）
    //KingConfigModuleJs.setXmlPath(strDriverXmlPath); //20250611 屏蔽，解决批量新建变量（含有不同设备的）
    xmlPaths.push(strDriverXmlPath)
  }
  addTags(req, res, objNewTagInfos, xmlPaths)

  VarLogManagerObj.traceLog(VarManagerName, "Leave post submitCollectTagProperty")
})
async function addTags (req, res, objNewTagInfos, xmlPaths) {
  let objResponse = { "code": 0, "message": "OK", "data": [] }//250401 add 
  let strProjectID = req.query.ProjectID//获取工程的ID
  let strProjectVersion = req.query.ProjectVersion//获取工程的版本
  let strProjectName = req.query.ProjectName//工程名称
  var nStartTime = new Date().getTime()
  let objTagList, objTagGroupList
  //获取当前的变量列表
  let strVarJsonPath = ""
  if (global.productType == PRODUCTKF36) {
    strVarJsonPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/VarInfo.json"
  } else {
    strVarJsonPath = global.sdbPath + "/" + strProjectName + "/VarInfo.json"
  }
  objTagList = ReadJson(strVarJsonPath)
  if (objTagList.Error) {
    objResponse.code = -1
    objResponse.message = strDevJsonPath + ":" + objTagList.ErrorDesc
    res.send(objResponse)
    VarLogManagerObj.errorLog(VarManagerName, strDevJsonPath + ":" + objTagList.ErrorDesc)
    return
  }
  else if (objTagList.TagList == undefined) {
    objResponse.code = -1
    objResponse.message = strDevJsonPath + ":文件格式错误, 缺少TagList"
    res.send(objResponse)
    VarLogManagerObj.errorLog(VarManagerName, strDevJsonPath + ":文件格式错误,缺少TagList")
    return
  }
  //获取当前变量组的列表
  //var objCurrentGroup = {};
  let strTagGroupJson = ""
  if (global.productType == PRODUCTKF36) {
    strTagGroupJson = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/VarGroupInfo.json"
  } else {
    strTagGroupJson = global.sdbPath + "/" + strProjectName + "/VarGroupInfo.json"
  }
  objTagGroupList = ReadJson(strTagGroupJson)
  if (objTagGroupList.Error) {
    objResponse.code = -1
    objResponse.message = strTagGroupJson + ":" + objTagGroupList.ErrorDesc
    res.send(objResponse)
    VarLogManagerObj.errorLog(VarManagerName, strTagGroupJson + ":" + objTagGroupList.ErrorDesc)
    return
  }
  else if (objTagGroupList.TagGroupList == undefined) {
    objResponse.code = -1
    objResponse.message = strTagGroupJson + ":文件格式错误, 缺少TagGroupList"
    res.send(objResponse)
    VarLogManagerObj.errorLog(VarManagerName, strTagGroupJson + ":文件格式错误, 缺少TagGroupList")
    return
  }
  /////////////////////////////////////
  //objNewTagInfos添加到工程变量列表

  let nVarID = MakeVarID(strProjectName, strProjectID, strProjectVersion)
  let ids = []
  let strErrOut = ""//返回的错误原因
  //250806 判断变量名称是否重复
  let tagnames = []
  for (let i = 0; i < objNewTagInfos.length; i++) {
    let strTagName = objNewTagInfos[i].TagName
    if (tagnames.indexOf(strTagName) != -1) {
      strErrOut += "该变量(" + strTagName + ")在该批次参数中重复; "
    } else {
      tagnames.push(strTagName)
    }
    var objFindTag = objTagList.TagList.find(function (tag) {
      return tag.TagName == strTagName
    })
    if (objFindTag != undefined) {
      strErrOut += "该变量(" + strTagName + ")已经存在; "
    }
  }
  if (strErrOut) {
    objResponse.code = -1
    objResponse.message = strErrOut
    res.send(objResponse)
    return
  }
  console.time('耗时统计')
  for (let i = 0; i < objNewTagInfos.length; i++) {
    //20250611 start
    //KingConfigModule.getConfigModuleObject();//20250902 s适配
    //KingConfigModule.setXmlPath(xmlPaths[i]);
    KingConfigModuleJs.setXmlPath(xmlPaths[i])
    //20250611 end
    let objNewTagInfo = objNewTagInfos[i]

    //第一个参数
    var objDbItem = {}
    objDbItem.nAccessMode = objNewTagInfo.AccessType
    objDbItem.nDataType = objNewTagInfo.RegDataType
    objDbItem.reserved = new Array()
    objDbItem.reserved[0] = 0
    objDbItem.reserved[1] = 0
    //第二个参数（传出参数）
    var objPlcVar = {}
    //第三个参数：错误码
    var nErr = {}
    let objNumChar = GetNumberInChar(objNewTagInfo.TagName)
    var nNum = objNumChar.nNum
    let strCharName = objNumChar.strOutput
    //判断寄存器是否有二级甚至三级通道
    var arrRegAddr = [0, 0, 0]
    let bNum = false
    let nCut = 0
    //var regPos = /^\d+(\.\d+)?$/; //非负浮点数
    var strRegAddress = objNewTagInfo["RegAddress"]
    if (isNumAndPoint(strRegAddress)) {
      bNum = true
      let nFindStart = 0
      let nPointInd = 0
      while (nPointInd != -1) {
        nPointInd = strRegAddress.indexOf(".", nFindStart)
        let nFindEnd = 0
        if (nPointInd == -1) {
          nFindEnd = strRegAddress.length
        }
        else {
          nFindEnd = nPointInd
        }
        let strRegister = strRegAddress.substr(nFindStart, nFindEnd - nFindStart)
        arrRegAddr[nCut] = Number(strRegister)
        nCut++
        if (nCut >= 3) {
          break
        }
        nFindStart = nPointInd + 1
      }
    }
    var nNumber = 1
    var nStepSize = 1
    var nNameStepSize = 1
    //删除objNewTagInfo中不会存到json文件中的属性
    // delete objNewTagInfo.Number;
    // delete objNewTagInfo.StepSize;
    // delete objNewTagInfo.NameStepSize;
    //生成新变量的ID
    if (nVarID <= 0) {
      objResponse.code = -1
      objResponse.message = "生成变量ID失败"
      res.send(objResponse)
      VarLogManagerObj.errorLog(VarManagerName, "生成变量ID失败")
      return
    }

    var nVarCount = 0

    //strErrOut = RecurAddVarSync(objNewTagInfo, objTagList, objTagGroupList, strDriverName, objDbItem, arrRegAddr, )
    for (let j = 0; j < nNumber; j++) {
      let nRes = -1000
      let objCurrentVar = JSON.parse(JSON.stringify(objNewTagInfo))
      objCurrentVar.TagID = nVarID
      if (global.productType == PRODUCTKF40) {
        objCurrentVar.TagExtID = nVarID//新增，扩展ID
      }
      nVarID++
      //当前变量的名称
      let strTagName = objCurrentVar.TagName
      if (j > 0) {
        nNum += nNameStepSize
        if (nNum >= 0) {
          strTagName = strCharName + nNum
        } else {
          strTagName = strCharName + "_" + (-nNum)
        }
      }
      objCurrentVar.TagName = strTagName
      //当前变量的寄存器名称
      if (bNum) {
        let strNewRegAddr = arrRegAddr[nCut - 1] + j * nStepSize
        if (nCut == 1) {
          strRegAddress = strNewRegAddr
        }
        else if (nCut == 2) {
          strRegAddress = arrRegAddr[0] + "." + strNewRegAddr
        }
        else {
          strRegAddress = arrRegAddr[0] + "." + arrRegAddr[1] + "." + strNewRegAddr
        }
      }

      //兼容导出的变量新建
      if ((strRegAddress + "").indexOf(objCurrentVar.RegName) == 0) {
        objCurrentVar.RegAddress = strRegAddress
      } else {
        //20240527 adapte driver:CodeSys_Link
        objCurrentVar.RegAddress = objCurrentVar.RegName + (objCurrentVar.ChannelDriver == "CodeSys_Link" ? "." : "") + strRegAddress
        // objCurrentVar.RegAddress = objCurrentVar.RegName + strRegAddress;
      }
      objDbItem.szRegister = objCurrentVar.RegAddress
      objDbItem.szDevName = objCurrentVar.DeviceName
      objPlcVar = {
        "wVarID": { "value": 0 },     	    // variable ID
        "wVarType": { "value": 0 },           // variable type
        "szVarName": { "value": "" }, 	// variable name
        "nDeviceIndex": { "value": 0 },	    // PLC index
        "nUnitNo": { "value": 0 },		    // PLC address
        "pDevAddr": { "nDevAddr": 0, "sDevAddr": "" },//device address name}	    // pointer to device address structure
        "pszRegName": { "value": "" },	    // register name
        "nRegType": { "value": 0 },  	    // register type
        "nSubType": { "value": 0 },		    // sub-type
        "nSubType1": { "value": 0 },
        "nSubType2": { "value": 0 },
        "nNo": { "value": 0 },          	    // address No.
        "nDataType": { "value": 0 },    	    // data type
        "nAccessMode": { "value": 0 },      	// I/O Mode.
        "pComThread": { "value": "" },   // thread
        "nTimerCount": { "value": 0 }, 	    // Counter
        "nFrequency": { "value": 0 },  	    // Sampling frequency
        "maxRaw": { "value": "" },		    // Maximum raw value
        "minRaw": { "value": "" },		    // minimum raw value
        "bConvertion": { "value": 0 },	        // convert type
        "isBad": { "value": 0 },		        // bad device
        "isUnvalid": { "value": 0 }	        // invalid variable
      }
      nErr = {}
      let objDevice = getOneDevInfo(strProjectName, strProjectID, strProjectVersion, objNewTagInfo.DeviceName)
      let strDriverName = objNewTagInfo.DriverName
      let isConfig = objDevice.DeviceInfo.isConfig
      //20240118 适配驱动系列带 ()
      let nds = ""
      for (let k = 0; k < objNewTagInfo.DeviceSeries.length; k++) {
        let e = objNewTagInfo.DeviceSeries[k]
        if (e == "(") {
          nds += "LB"
        } else if (e == ")") {
          nds += "RB"
        } else {
          nds += e
        }
      }

      if (isConfig === false) {//true或者没有这个参数的都认为是要校验的
        let nRegType = await KingConfigModuleJs.getRegType(nds, objCurrentVar.RegName)
        if (nRegType < 0) {
          objResponse.code = -1
          objResponse.message = "该驱动xml文件格式或内容有错误, 错误码:" + nRegType
          res.send(objResponse)
          return
        }
        objCurrentVar.VarPlcInfo = strRegAddress + ";0;0;" + objCurrentVar.RegName + ";" + nRegType
      } else {
        //20250902 适配校验模块 js化
        //nRes = KingConfigModule.getVarInfo(objDbItem, objPlcVar, nErr, nds, strDriverName);
        let errcode = { "value": 0 }
        let ret = KingConfigModule.LoadXmlFile(errcode, xmlPaths[i], strDriverName, nds)
        if (!ret) {
          res.send("加载XML文件失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value])
          return
        }
        let count = { "value": 0 }
        ret = KingConfigModule.getRegisters(errcode, [], count, strDriverName, nds)
        if (!ret) {
          //校验失败
          strErrOut += "该变量(" + strTagName + ")校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value]
          nVarCount = i
          continue
        }
        nRes = KingConfigModule.checkUserVar(errcode, objDbItem, objPlcVar, strDriverName, nds)
        //!20250902
        nRes = objCurrentVar.ChannelDriver == "CodeSys_Link" ? 1 : nRes
        if (nRes == 0) {
          strErrOut += "该变量(" + strTagName + ")校验失败，错误原因：" + objConfigErrMsg[nErr.nErrCode] + "; "
          continue
        }
        objPlcVar.nNo = objCurrentVar.ChannelDriver == "CodeSys_Link" ? strRegAddress : objPlcVar.nNo.value
        objCurrentVar.VarPlcInfo = objPlcVar.nNo + ";" + objPlcVar.nSubType1 + ";" + objPlcVar.nSubType2 + ";" + objCurrentVar.RegName + ";" + objPlcVar.nRegType.value
      }
      //将objCurrentVar存到json文件里
      objTagList.TagList.push(objCurrentVar)
      //将变量信息写到VarGroupInfo.json中
      if (objNewTagInfo.TagGroup != "变量" && objNewTagInfo.TagGroup != "root") {
        let resAdd = recursionVarAdd(objTagGroupList.TagGroupList, objNewTagInfo.TagGroup, objCurrentVar.TagID, strTagName)
        if (resAdd != "OK") {
          objResponse.code = -1
          objResponse.message = "该变量组(" + objNewTagInfo.TagGroup + ")不存在"
          res.send(objResponse)
          return
        }
      }
      nSchedule = Number((((j + 1) / nNumber) * 100).toString().match(/^\d+(?:\.\d{0,2})?/))//计算百分比并保留2位小数
      ids.push(objCurrentVar.TagID)
      console.log("新建过程已完成" + nSchedule + "%")
      //gws.send(nSchedule.toString());
      //fs.writeFileSync("temp.txt", nSchedule)
    }
    //KingConfigModule.releaseConfigModuleObject();
  }
  console.timeEnd('耗时统计')
  if (strErrOut) {
    objResponse.code = -1
    objResponse.message = strErrOut
    res.send(objResponse)
    return
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  nSchedule = "100"
  fs.writeFileSync("temp.txt", nSchedule)


  strVarJsonPath = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/VarInfo.json"
  strTagGroupJson = pubInter.joinPath(strProjectID, strProjectVersion, strProjectName) + "/VarGroupInfo.json"
  let strErrMsg = WriteJson(strVarJsonPath, objTagList)
  if (strErrMsg != "OK") {
    objResponse.code = -1
    objResponse.message = strErrMsg
    res.send(objResponse)
    VarLogManagerObj.errorLog(VarManagerName, strErrMsg)
    return
  }
  var nEndTime = new Date().getTime()
  console.log("建立" + nNumber + "个变量共用" + (nEndTime - nStartTime) / 1000 + "s")
  //更新工程json中的变量点数
  if (global.productType == PRODUCTKF36) {
    var strProJsonPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/ProjectPorpertyInfo.json"
  } else {
    var strProJsonPath = global.sdbPath + "/" + strProjectName + "/ProjectPorpertyInfo.json"
  }
  let objPerty = ReadJson(strProJsonPath)
  if (objPerty.Error) {
    objResponse.code = -1
    objResponse.message = strProJsonPath + ":" + objPerty.ErrorDesc
    res.send(objResponse)
    VarLogManagerObj.errorLog(VarManagerName, strProJsonPath + ":" + objPerty.ErrorDesc)
    return
  }
  if (objPerty.TagPointsNum != undefined) {
    objPerty.TagPointsNum += nVarCount
  }
  strErrMsg = WriteJson(strProJsonPath, objPerty)
  if (strErrMsg != "OK") {
    objResponse.code = -1
    objResponse.message = strErrMsg
    res.send(objResponse)
    VarLogManagerObj.errorLog(VarManagerName, strErrMsg)
    return
  }
  if (strErrOut == "") {
    objResponse.data = ids
    res.send(objResponse)
    gloab_dn2info = {}//250806 置空
  } else {
    objResponse.code = -1
    objResponse.message = strErrOut
    res.send(objResponse)
  }
}
//新建变量
router.post('/submitCollectTagProperty', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post submitCollectTagProperty")
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID//获取工程的ID
  var projectPath = path.join(tenantDir, strProjectID, 'project')
  let strProjectName = req.query.ProjectName//工程名称
  let strTagInfo = pubInter.EscapeAllData(req.body)
  //console.log(strTagInfo.VarInfo);
  var objNewTagInfo = GetVarJsonInfo(strTagInfo.VarInfo)
  //查看数据类型和寄存器类型是否对应
  if ((objNewTagInfo.RegDataType == 1 || objNewTagInfo.RegDataType == 256 || objNewTagInfo.RegDataType == 1024 || objNewTagInfo.TagDataType == 1 || objNewTagInfo.TagDataType == 256 || objNewTagInfo.TagDataType == 1024) && objNewTagInfo.TagDataType != objNewTagInfo.RegDataType) {
    res.send("转换数据类型与寄存器数据类型不匹配")
    return
  }
  //获取设备的驱动和ID
  let objDevice = getOneDevInfo(strProjectName, strProjectID, projectPath, objNewTagInfo.DeviceName)
  if (objDevice.ErrMsg != "") {
    res.send(objDevice.ErrMsg)
    VarLogManagerObj.errorLog(VarManagerName, objDevice.ErrMsg)
    return
  }
  //获取与设备相关的信息
  let strDriverName = objDevice.DeviceInfo.DriverName
  if (objDevice.DeviceInfo.DriverSeries) {
    var strDeviceSeries = objDevice.DeviceInfo.DriverSeries
  }
  else if (objDevice.DeviceInfo.DeviceSeries) {
    var strDeviceSeries = objDevice.DeviceInfo.DeviceSeries
  }
  var DriverVersion = objDevice.DeviceInfo.DriverVersion
  objNewTagInfo.DeviceID = objDevice.DeviceInfo.DeviceID
  objNewTagInfo.ChannelDriver = objDevice.DeviceInfo.DriverName
  if (global.productType == PRODUCTKF40) {
    if (objDevice.DeviceInfo.LinkName == "COM") {
      objNewTagInfo.ChannelName = objDevice.DeviceInfo.SerialName
    }
    else {
      objNewTagInfo.ChannelName = objDevice.DeviceInfo.LinkIP
    }
    objNewTagInfo.DeviceSeriesType = objDevice.DeviceInfo.DriverSeriesType
  }
  objNewTagInfo.DeviceSeries = strDeviceSeries
  //设备冗余属性

  if (objDevice.DeviceInfo.RedunDeviceID == "") {
    objNewTagInfo.RedunDeviceID = 0
  } else {
    objNewTagInfo.RedunDeviceID = Number(objDevice.DeviceInfo.RedunDeviceID)
  }
  objNewTagInfo.DataCleaningType = 0
  objNewTagInfo.TagNanoId = "io_" + nanoid(21)//20251009
  //获取当前的变量列表
  let strVarJsonPath = ""
  if (global.productType == PRODUCTKF36) {

    strVarJsonPath = path.join(projectPath, "VarInfo.json")
  } else {
    strVarJsonPath = path.join(projectPath, "VarInfo.json")
  }
  var objTagList = ReadJson(strVarJsonPath)
  let count = objTagList.DAVAR.length + objTagList.OPCVAR.length + objTagList.TagList.length
  if (count + 1 > 20000) {
    return res.send('工程变量数量超出点数限制')
  }
  if (objTagList.Error) {
    res.send(strDevJsonPath + ":" + objTagList.ErrorDesc)
    VarLogManagerObj.errorLog(VarManagerName, strDevJsonPath + ":" + objTagList.ErrorDesc)
    return
  }
  else if (objTagList.TagList == undefined) {
    res.send(strDevJsonPath + ":文件格式错误，缺少TagList")
    VarLogManagerObj.errorLog(VarManagerName, strDevJsonPath + ":文件格式错误，缺少TagList")
    return
  }

  //获取当前变量组的列表
  //var objCurrentGroup = {};
  let strTagGroupJson = ""
  if (global.productType == PRODUCTKF36) {
    strTagGroupJson = path.join(projectPath, "VarGroupInfo.json")
  } else {
    strTagGroupJson = path.join(projectPath, "VarGroupInfo.json")
  }
  var objTagGroupList = ReadJson(strTagGroupJson)
  if (objTagGroupList.Error) {
    res.send(strTagGroupJson + ":" + objTagGroupList.ErrorDesc)
    VarLogManagerObj.errorLog(VarManagerName, strTagGroupJson + ":" + objTagGroupList.ErrorDesc)
    return
  }
  else if (objTagGroupList.TagGroupList == undefined) {
    res.send(strTagGroupJson + ":文件格式错误，缺少TagGroupList")
    VarLogManagerObj.errorLog(VarManagerName, strTagGroupJson + ":文件格式错误，缺少TagGroupList")
    return
  }

  let strXmlPath = "", strDriverXmlPath = ""
  if (global.productType == PRODUCTKF36) {
    strXmlPath = path.join(projectPath, "Driver/" + strDriverName + ".xml")
  } else {
    strXmlPath = path.join(projectPath, "Driver/" + strDriverName + ".xml")
  }
  //服务端驱动路径
  strDriverXmlPath = "./Driver/" + objDevice.DeviceInfo.SystemPlatform + "/" + objDevice.DeviceInfo.OsType + "/" + objDevice.DeviceInfo.DeviceProvider + "/" + strDriverName + "/" + DriverVersion + "/" + strDriverName + ".xml"
  if (strPlatFormType == "Linux") { // 20230529
    //使用校验模块校验
    //KingConfigModule.getConfigModuleObject();
    if (!fs.existsSync(strXmlPath)) {
      //sendMsgToMainThread(strXmlPath + "文件不存在");
      res.send(strXmlPath + "文件不存在")
      VarLogManagerObj.errorLog(VarManagerName, strXmlPath + "文件不存在")
      return
    }
    if (!fs.existsSync(strDriverXmlPath)) {
      //sendMsgToMainThread(strDriverXmlPath + "文件不存在");
      res.send(strDriverXmlPath + "文件不存在")
      VarLogManagerObj.errorLog(VarManagerName, strDriverXmlPath + "文件不存在")
      return
    }
    //KingConfigModule.setXmlPath(strDriverXmlPath);   
    KingConfigModuleJs.setXmlPath(strDriverXmlPath)
    let nds = ""
    for (let i = 0; i < objNewTagInfo.DeviceSeries.length; i++) {
      let e = objNewTagInfo.DeviceSeries[i]
      if (e == "(") {
        nds += "LB"
      } else if (e == ")") {
        nds += "RB"
      } else {
        nds += e
      }
    }
    let errcode = { "value": 0 }
    let ret = KingConfigModule.LoadXmlFile(errcode, strDriverXmlPath, strDriverName, nds)
    if (!ret) {
      res.send("加载XML文件失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value])
      return
    }
  }
  req.projectPath = projectPath
  addTagSync(req, res, objNewTagInfo, objTagList, objTagGroupList, strDriverName, objDevice.DeviceInfo.isConfig, objDevice)
  VarLogManagerObj.traceLog(VarManagerName, "Leave post submitCollectTagProperty")
})

//新建变量
router.post('/submitCollectTagPropertyFromDriver', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post submitCollectTagPropertyFromDriver")

  var objNewTagInfo = req.body
  //查看数据类型和寄存器类型是否对应
  if ((objNewTagInfo.RegDataType == 1 || objNewTagInfo.RegDataType == 256 ||
    objNewTagInfo.RegDataType == 1024 || objNewTagInfo.TagDataType == 1 ||
    objNewTagInfo.TagDataType == 256 || objNewTagInfo.TagDataType == 1024) &&
    objNewTagInfo.TagDataType != objNewTagInfo.RegDataType) {
    res.send("转换数据类型与寄存器数据类型不匹配")
    return
  }
  let strDriverName = objNewTagInfo.DriverName
  let strDeviceSeries = objNewTagInfo.DeviceSeries
  let DriverVersion = objNewTagInfo.DriverVersion
  let OsType = objNewTagInfo.OsType
  let strDriverXmlPath = ""
  //服务端驱动路径
  strDriverXmlPath = "./Driver/" + objNewTagInfo.SysPlatform
    + "/" + OsType
    + "/" + objNewTagInfo.DriverCompany
    + "/" + strDriverName
    + "/" + DriverVersion
    + "/" + strDriverName + ".xml"



  if (!fs.existsSync(strDriverXmlPath)) {
    //sendMsgToMainThread(strDriverXmlPath + "文件不存在");
    res.send(strDriverXmlPath + "文件不存在")
    VarLogManagerObj.errorLog(VarManagerName, strDriverXmlPath + "文件不存在")
    return
  }


  KingConfigModuleJs.setXmlPath(strDriverXmlPath)


  //第一个参数
  var objDbItem = {}
  objDbItem.nAccessMode = objNewTagInfo.AccessType
  objDbItem.nDataType = objNewTagInfo.RegDataType
  objDbItem.reserved = new Array()
  objDbItem.reserved[0] = 0
  objDbItem.reserved[1] = 0
  //第二个参数（传出参数）
  var objPlcVar = {}
  //第三个参数：错误码
  var nErr = {}


  //判断寄存器是否有二级甚至三级通道
  var arrRegAddr = [0, 0, 0]
  let bNum = false
  let nCut = 0
  //var regPos = /^\d+(\.\d+)?$/; //非负浮点数
  var strRegAddress = objNewTagInfo["RegAddress"]
  if (isNumAndPoint(strRegAddress)) {
    bNum = true
    let nFindStart = 0
    let nPointInd = 0
    while (nPointInd != -1) {
      nPointInd = strRegAddress.indexOf(".", nFindStart)
      let nFindEnd = 0
      if (nPointInd == -1) {
        nFindEnd = strRegAddress.length
      }
      else {
        nFindEnd = nPointInd
      }
      let strRegister = strRegAddress.substr(nFindStart, nFindEnd - nFindStart)
      arrRegAddr[nCut] = Number(strRegister)
      nCut++
      if (nCut >= 3) {
        break
      }
      nFindStart = nPointInd + 1
    }
  }

  //当前变量的寄存器名称
  if (bNum) {
    let strNewRegAddr = arrRegAddr[nCut - 1]
    if (nCut == 1) {
      strRegAddress = strNewRegAddr
    }
    else if (nCut == 2) {
      strRegAddress = arrRegAddr[0] + "." + strNewRegAddr
    }
    else {
      strRegAddress = arrRegAddr[0] + "." + arrRegAddr[1] + "." + strNewRegAddr
    }
  }

  objDbItem.szRegister = objNewTagInfo.RegName + strRegAddress
  objDbItem.szDevName = ""
  objPlcVar = {}
  nErr = {}

  let nRes = -1000
  var strErrOut = ""//返回的错误原因



  //获取该驱动是否需要校验
  KingConfigModuleJs.isStringFormat(strDriverXmlPath, strDriverName)
    .then(async (objRes) => {
      if (objRes.Error) {
        res.send(objRes.ErrorDesc)
        return
      }
      var isConfig = !objRes.isString

      if (isConfig === false) {//true或者没有这个参数的都认为是要校验的
        let nRegType = await KingConfigModuleJs.getRegType(strDeviceSeries, objNewTagInfo.RegName)
        if (nRegType < 0) {
          res.send("该驱动xml文件格式或内容有错误，错误码:" + nRegType)
          return
        }
      }
      else {
        //使用校验模块校验
        KingConfigModule.getConfigModuleObject()
        KingConfigModule.setXmlPath(strDriverXmlPath)
        nRes = KingConfigModule.getVarInfo(objDbItem, objPlcVar, nErr, strDeviceSeries, strDriverName)
        KingConfigModule.releaseConfigModuleObject()
        if (nRes == 0) {
          //校验失败
          strErrOut = "校验失败，错误原因：" + objConfigErrMsg[nErr.nErrCode]
          //res.send("该变量(" + strTagName + ")校验失败，错误原因：" + objConfigErrMsg[nErr.nErrCode]);
          res.send(strErrOut)
          return
        }
      }

      res.send("OK")
    })


  VarLogManagerObj.traceLog(VarManagerName, "Leave post submitCollectTagPropertyFromDriver")
})
async function addTagSync (req, res, objNewTagInfo, objTagList, objTagGroupList, strDriverName, isConfig, objDevice = "") {
  //CollectTimeInterval check [100-108000000]
  if (objNewTagInfo.CollectTimeInterval < 100 || objNewTagInfo.CollectTimeInterval > 108000000) {
    res.send("采集频率超限! CollectTimeInterval:[100-108000000]")
    return
  }
  let strProjectID = req.query.ProjectID//获取工程的ID
  let strProjectName = req.query.ProjectName//工程名称
  var nStartTime = new Date().getTime()
  //第一个参数
  var objDbItem = {}
  objDbItem.nAccessMode = objNewTagInfo.AccessType
  objDbItem.nDataType = objNewTagInfo.RegDataType
  objDbItem.reserved = new Array()
  objDbItem.reserved[0] = 0
  objDbItem.reserved[1] = 0
  //第二个参数（传出参数）
  var objPlcVar = {}
  //第三个参数：错误码
  var nErr = {}
  let objNumChar = GetNumberInChar(objNewTagInfo.TagName)
  var nNum = objNumChar.nNum
  let strCharName = objNumChar.strOutput
  //判断寄存器是否有二级甚至三级通道
  var arrRegAddr = [0, 0, 0]
  let bNum = false
  let nCut = 0
  //var regPos = /^\d+(\.\d+)?$/; //非负浮点数
  var strRegAddress = objNewTagInfo["RegAddress"]
  if (isNumAndPoint(strRegAddress)) {
    bNum = true
    let nFindStart = 0
    let nPointInd = 0
    while (nPointInd != -1) {
      nPointInd = strRegAddress.indexOf(".", nFindStart)
      let nFindEnd = 0
      if (nPointInd == -1) {
        nFindEnd = strRegAddress.length
      }
      else {
        nFindEnd = nPointInd
      }
      let strRegister = strRegAddress.substr(nFindStart, nFindEnd - nFindStart)
      arrRegAddr[nCut] = Number(strRegister)
      nCut++
      if (nCut >= 3) {
        break
      }
      nFindStart = nPointInd + 1
    }
  }
  var nNumber = objNewTagInfo.Number
  var nStepSize = objNewTagInfo.StepSize
  var nNameStepSize = objNewTagInfo.NameStepSize
  //删除objNewTagInfo中不会存到json文件中的属性
  delete objNewTagInfo.Number
  delete objNewTagInfo.StepSize
  delete objNewTagInfo.NameStepSize
  //生成新变量的ID
  let nVarID1 = MakeVarID(strProjectName, strProjectID, req.projectPath)
  let nVarID2 = MakeVarID1(strProjectName, strProjectID, req.projectPath)
  let nVarID3 = MakeVarID2(strProjectName, strProjectID, req.projectPath)
  let nVarID = Math.max(nVarID1, nVarID2, nVarID3)
  if (nVarID <= 0) {
    res.send("生成变量ID失败")
    VarLogManagerObj.errorLog(VarManagerName, "生成变量ID失败")
    return
  }
  var strErrMsg = ""

  var strErrOut = ""//返回的错误原因
  var nVarCount = 0
  let tagIDs = []//231110
  //strErrOut = RecurAddVarSync(objNewTagInfo, objTagList, objTagGroupList, strDriverName, objDbItem, arrRegAddr, )
  for (let i = 0; i < nNumber; i++) {
    let nRes = -1000
    let objCurrentVar = JSON.parse(JSON.stringify(objNewTagInfo))
    objCurrentVar.TagID = nVarID
    if (global.productType == PRODUCTKF40) {
      objCurrentVar.TagExtID = nVarID//新增，扩展ID
    }
    nVarID++
    //当前变量的名称
    let strTagName = objCurrentVar.TagName
    if (i > 0) {
      nNum += nNameStepSize
      if (nNum >= 0) {
        strTagName = strCharName + nNum
      } else {
        strTagName = strCharName + "_" + (-nNum)
      }
    }
    //查找是否有名称重复的变量
    var objFindTag = objTagList.TagList.find(function (tag) {
      return tag.TagName == strTagName
    })
    if (objFindTag != undefined) {
      strErrOut += "该变量(" + strTagName + ")已经存在; "
      nVarCount--
      //res.send("该变量(" + strTagName + ")已经存在");
      continue
    }
    objCurrentVar.TagName = strTagName
    //当前变量的寄存器名称
    if (bNum) {
      let strNewRegAddr = arrRegAddr[nCut - 1] + i * nStepSize
      if (nCut == 1) {
        strRegAddress = strNewRegAddr
      }
      else if (nCut == 2) {
        strRegAddress = arrRegAddr[0] + "." + strNewRegAddr
      }
      else {
        strRegAddress = arrRegAddr[0] + "." + arrRegAddr[1] + "." + strNewRegAddr
      }
    }
    //20240524 adapte driver:CodeSys_Link
    objCurrentVar.RegAddress = objCurrentVar.RegName + (objCurrentVar.ChannelDriver == "CodeSys_Link" ? "." : "") + strRegAddress
    // objCurrentVar.RegAddress = objCurrentVar.RegName + strRegAddress
    objDbItem.szRegister = objCurrentVar.RegAddress
    objDbItem.szDevName = objCurrentVar.DeviceName
    objPlcVar = {
      "wVarID": { "value": 0 },     	    // variable ID
      "wVarType": { "value": 0 },           // variable type
      "szVarName": { "value": "" }, 	// variable name
      "nDeviceIndex": { "value": 0 },	    // PLC index
      "nUnitNo": { "value": 0 },		    // PLC address
      "pDevAddr": { "nDevAddr": 0, "sDevAddr": "" },//device address name}	    // pointer to device address structure
      "pszRegName": { "value": "" },	    // register name
      "nRegType": { "value": 0 },  	    // register type
      "nSubType": { "value": 0 },		    // sub-type
      "nSubType1": { "value": 0 },
      "nSubType2": { "value": 0 },
      "nNo": { "value": 0 },          	    // address No.
      "nDataType": { "value": 0 },    	    // data type
      "nAccessMode": { "value": 0 },      	// I/O Mode.
      "pComThread": { "value": "" },   // thread
      "nTimerCount": { "value": 0 }, 	    // Counter
      "nFrequency": { "value": 0 },  	    // Sampling frequency
      "maxRaw": { "value": "" },		    // Maximum raw value
      "minRaw": { "value": "" },		    // minimum raw value
      "bConvertion": { "value": 0 },	        // convert type
      "isBad": { "value": 0 },		        // bad device
      "isUnvalid": { "value": 0 }	        // invalid variable
    }
    nErr = {}
    strPlatFormType = 'Linux'
    if (strPlatFormType == "Windows") { // 20230529  window:有xml文件走驱动校验，无xml走前端校验
      // 判断有没有xml文件
      var strProDriverPath = path.join(req.projectPath, 'Driver')
      if (objDevice == "") {
        return
      }

      if (fs.existsSync(strProDriverPath + "/" + objDevice.DeviceInfo.DriverName + ".xml") == false) { // 表示不存在xml
        var CLSID = '{' + objDevice.DeviceInfo.CLSID + '}'
        var ItemName = objNewTagInfo.RegName + objNewTagInfo.RegAddress
        var resvar = checknode.VarCheck(CLSID, objDevice.DeviceInfo.DevNumber, objDevice.DeviceInfo.DevAddress, objDevice.DeviceInfo.DriverSeries,
          ItemName, objNewTagInfo.TagName, objNewTagInfo.RegName, objNewTagInfo.TagDataType, objNewTagInfo.AccessType, objNewTagInfo.CollectTimeInterval)
        if (resvar != 0) {
          res.send("变量校验失败")
          return
        }

        objCurrentVar.VarPlcInfo = "" // windows 不用
      } else { // 4.0 直接调前端校验模块 还没写完
        res.send("有xml,变量校验失败")
        return
      }
    } else {
      if (isConfig === false) {//true或者没有这个参数的都认为是要校验的
        let nRegType = await KingConfigModuleJs.getRegType(objNewTagInfo.DeviceSeries, objCurrentVar.RegName)
        if (nRegType < 0) {
          res.send("该驱动xml文件格式或内容有错误，错误码:" + nRegType)
          return
        }
        objCurrentVar.VarPlcInfo = strRegAddress + ";0;0;" + objCurrentVar.RegName + ";" + nRegType
      } else {
        //20240118 适配驱动系列带()
        let nds = ""
        for (let i = 0; i < objNewTagInfo.DeviceSeries.length; i++) {
          let e = objNewTagInfo.DeviceSeries[i]
          if (e == "(") {
            nds += "LB"
          } else if (e == ")") {
            nds += "RB"
          } else {
            nds += e
          }
        }
        //20250901 适配校验模块 js化
        //nRes = KingConfigModule.getVarInfo(objDbItem, objPlcVar, nErr, nds, strDriverName);
        let errcode = { "value": 0 }, count = { "value": 0 }
        let ret = KingConfigModule.getRegisters(errcode, [], count, strDriverName, nds)
        if (!ret) {
          //校验失败
          strErrOut += "该变量(" + strTagName + ")校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value]
          nVarCount = i
          continue
        }
        nRes = KingConfigModule.checkUserVar(errcode, objDbItem, objPlcVar, strDriverName, nds)
        //!20250901
        nRes = objCurrentVar.ChannelDriver == "CodeSys_Link" ? 1 : nRes
        if (nRes == 0) {
          //校验失败
          strErrOut = "该变量(" + strTagName + ")校验失败，错误原因：" + objConfigErrMsg[errcode.value]
          //res.send("该变量(" + strTagName + ")校验失败，错误原因：" + objConfigErrMsg[nErr.nErrCode]);
          nVarCount = i
          continue
        }
        objPlcVar.nNo = objCurrentVar.ChannelDriver == "CodeSys_Link" ? strRegAddress : objPlcVar.nNo.value
        objCurrentVar.VarPlcInfo = objPlcVar.nNo + ";" + objPlcVar.nSubType1 + ";" + objPlcVar.nSubType2 + ";" + objCurrentVar.RegName + ";" + objPlcVar.nRegType.value
      }
    }

    //将objCurrentVar存到json文件里
    objTagList.TagList.push(objCurrentVar)
    //将变量信息写到VarGroupInfo.json中
    if (objNewTagInfo.TagGroup != "变量" && objNewTagInfo.TagGroup != "root") {
      let resAdd = recursionVarAdd(objTagGroupList.TagGroupList, objNewTagInfo.TagGroup, objCurrentVar.TagID, strTagName)
      if (resAdd != "OK") {
        //res.send("该变量组(" + objNewTagInfo.TagGroup + ")不存在");
        strErrOut += "该变量组(" + objNewTagInfo.TagGroup + ")不存在; "
        nVarCount--
        continue
      }
    }
    nSchedule = Number((((i + 1) / nNumber) * 100).toString().match(/^\d+(?:\.\d{0,2})?/))//计算百分比并保留2位小数
    console.log("新建过程已完成" + nSchedule + "%")
    //gws.send(nSchedule.toString());
    //fs.writeFileSync("temp.txt", nSchedule)
    tagIDs.push(objCurrentVar.TagID)
  }
  nSchedule = "100"
  fs.writeFileSync("temp.txt", nSchedule)
  if (strPlatFormType == "Linux") {
    //KingConfigModule.releaseConfigModuleObject();
  }


  let strVarJsonPath = path.join(req.projectPath, "VarInfo.json")
  let strTagGroupJson = path.join(req.projectPath, "VarGroupInfo.json")
  strErrMsg = WriteJson(strVarJsonPath, objTagList)
  if (strErrMsg != "OK") {
    res.send(strErrMsg)
    VarLogManagerObj.errorLog(VarManagerName, strErrMsg)
    return
  }
  else if (objNewTagInfo.TagGroup != "变量" && objNewTagInfo.TagGroup != "root") {
    if (strErrMsg = WriteJson(strTagGroupJson, objTagGroupList) != "OK") {
      res.send(strErrMsg)
      VarLogManagerObj.errorLog(VarManagerName, strErrMsg)
      return
    }
  }
  var nEndTime = new Date().getTime()
  console.log("建立" + nNumber + "个变量共用" + (nEndTime - nStartTime) / 1000 + "s")
  //更新工程json中的变量点数
  if (global.productType == PRODUCTKF36) {
    var strProJsonPath = path.join(req.projectPath, "ProjectPorpertyInfo.json")
  } else {
    var strProJsonPath = path.join(req.projectPath, "ProjectPorpertyInfo.json")
  }
  let objPerty = ReadJson(strProJsonPath)
  if (objPerty.Error) {
    res.send(strProJsonPath + ":" + objPerty.ErrorDesc)
    VarLogManagerObj.errorLog(VarManagerName, strProJsonPath + ":" + objPerty.ErrorDesc)
    return
  }
  if (objPerty.TagPointsNum != undefined) {
    objPerty.TagPointsNum += nVarCount
  }
  strErrMsg = WriteJson(strProJsonPath, objPerty)
  if (strErrMsg != "OK") {
    res.send(strErrMsg)
    VarLogManagerObj.errorLog(VarManagerName, strErrMsg)
    return
  }
  if (strErrOut == "") {
    //20231110 新建变量返回id
    // res.send("OK");
    let obj = { "code": "OK", "message": "success", "data": tagIDs }
    res.send(obj)
  }
  else {
    res.send(strErrOut)
  }
}

//判断一个寄存器地址是否是数字和小数点组成
function isNumAndPoint (strRegAddress) {
  strRegAddress = strRegAddress + ""
  if (!strRegAddress || strRegAddress.indexOf('.') == -1) {
    return false
  }
  let arrNum = strRegAddress.split(".")
  for (let i = 0; i < arrNum.length; i++) {
    if (!(/^\d+$/.test(arrNum[i]))) {
      return false
    }
  }
  return true
}

//编辑变量
router.post('/editCollectTagProperty', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post editCollectTagProperty")
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID//获取工程的ID
  let projectPath = path.join(tenantDir, strProjectID, 'project')
  let strProjectName = req.query.ProjectName//工程名称
  let strTagInfo = pubInter.EscapeAllData(req.body)
  var objEditTagInfo = GetVarJsonInfo(strTagInfo.VarInfo)
  //CollectTimeInterval check [100-108000000]
  if (objEditTagInfo.CollectTimeInterval < 100 || objEditTagInfo.CollectTimeInterval > 108000000) {
    res.send("采集频率超限! CollectTimeInterval:[100-108000000]")
    return
  }
  //查看数据类型和寄存器类型是否对应
  if ((objEditTagInfo.RegDataType == 1 || objEditTagInfo.RegDataType == 256 || objEditTagInfo.RegDataType == 1024 || objEditTagInfo.TagDataType == 1 || objEditTagInfo.TagDataType == 256 || objEditTagInfo.TagDataType == 1024) && objEditTagInfo.TagDataType != objEditTagInfo.RegDataType) {
    res.send("转换数据类型与寄存器数据类型不匹配")
    return
  }
  //获取设备的驱动和ID
  let objDevice = getOneDevInfo(strProjectName, strProjectID, projectPath, objEditTagInfo.DeviceName, projectPath)
  if (objDevice.ErrMsg != "") {
    res.send(objDevice.ErrMsg)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
    return
  }
  //获取与设备相关的信息
  let strDriverName = objDevice.DeviceInfo.DriverName//驱动名称
  let strDeviceSeries = ""//设备系列名称
  if (objDevice.DeviceInfo.DriverSeries) {
    strDeviceSeries = objDevice.DeviceInfo.DriverSeries
  } else if (objDevice.DeviceInfo.DeviceSeries) {
    strDeviceSeries = objDevice.DeviceInfo.DeviceSeries
  }
  objEditTagInfo.DeviceID = objDevice.DeviceInfo.DeviceID
  objEditTagInfo.ChannelDriver = objDevice.DeviceInfo.DriverName
  if (objDevice.DeviceInfo.LinkName == "COM") {
    objEditTagInfo.ChannelName = objDevice.DeviceInfo.SerialName
  }
  else {
    objEditTagInfo.ChannelName = objDevice.DeviceInfo.LinkIP
  }
  objEditTagInfo.DeviceSeries = strDeviceSeries
  if (objDevice.DeviceInfo.DriverSeriesType) {
    objEditTagInfo.DeviceSeriesType = objDevice.DeviceInfo.DriverSeriesType
  }
  let strXmlPath = ""
  if (global.productType == PRODUCTKF36) {
    // strXmlPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/Driver/" + strDriverName + ".xml";
    strXmlPath = "./Driver/" + objDevice.DeviceInfo.SystemPlatform + "/" + objDevice.DeviceInfo.OsType + "/" + objDevice.DeviceInfo.DeviceProvider + "/"
      + objDevice.DeviceInfo.DriverName + "/" + objDevice.DeviceInfo.DriverVersion + "/" + objDevice.DeviceInfo.DriverName + ".xml"
  } else {
    strXmlPath = global.sdbPath + "/" + strProjectName + "/Driver/" + strDriverName + ".xml"
  }
  //服务端驱动路径
  let strDriverXmlPath = "./Driver/" + objDevice.DeviceInfo.SystemPlatform + "/" + objDevice.DeviceInfo.OsType + "/" + objDevice.DeviceInfo.DeviceProvider + "/" + strDriverName + "/" + objDevice.DeviceInfo.DriverVersion + "/" + strDriverName + ".xml"

  //使用校验模块校验
  //KingConfigModule.getConfigModuleObject();
  if (!fs.existsSync(strXmlPath)) {
    res.send(strXmlPath + "文件不存在")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
    return
  }
  if (!fs.existsSync(strDriverXmlPath)) {
    res.send(strXmlPath + "文件不存在")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
    return
  }
  //KingConfigModule.setXmlPath(strDriverXmlPath);
  //KingConfigModuleJs.setXmlPath(strDriverXmlPath);
  //第一个参数
  var objDbItem = {}
  objDbItem.nAccessMode = objEditTagInfo.AccessType
  objDbItem.nDataType = objEditTagInfo.RegDataType
  objDbItem.reserved = new Array()
  objDbItem.reserved[0] = 0
  objDbItem.reserved[1] = 0
  //第二个参数（传出参数）
  var objPlcVar = {
    "wVarID": { "value": 0 },     	    // variable ID
    "wVarType": { "value": 0 },           // variable type
    "szVarName": { "value": "" }, 	// variable name
    "nDeviceIndex": { "value": 0 },	    // PLC index
    "nUnitNo": { "value": 0 },		    // PLC address
    "pDevAddr": { "nDevAddr": 0, "sDevAddr": "" },//device address name}	    // pointer to device address structure
    "pszRegName": { "value": "" },	    // register name
    "nRegType": { "value": 0 },  	    // register type
    "nSubType": { "value": 0 },		    // sub-type
    "nSubType1": { "value": 0 },
    "nSubType2": { "value": 0 },
    "nNo": { "value": 0 },          	    // address No.
    "nDataType": { "value": 0 },    	    // data type
    "nAccessMode": { "value": 0 },      	// I/O Mode.
    "pComThread": { "value": "" },   // thread
    "nTimerCount": { "value": 0 }, 	    // Counter
    "nFrequency": { "value": 0 },  	    // Sampling frequency
    "maxRaw": { "value": "" },		    // Maximum raw value
    "minRaw": { "value": "" },		    // minimum raw value
    "bConvertion": { "value": 0 },	        // convert type
    "isBad": { "value": 0 },		        // bad device
    "isUnvalid": { "value": 0 }	        // invalid variable
  }
  //第三个参数：错误码
  var nErr = {}
  //判断寄存器是否有二级甚至三级通道
  let arrRegAddr = [0, 0, 0]
  let bNum = false
  let nCut = 0
  //var regPos = /^\d+(\.\d+)?$/; //非负浮点数
  var strRegAddress = objEditTagInfo["RegAddress"]
  if (isNumAndPoint(strRegAddress)) {
    bNum = true
    let nFindStart = 0
    let nPointInd = 0
    while (nPointInd != -1) {
      nPointInd = strRegAddress.indexOf(".", nFindStart)
      let nFindEnd = 0
      if (nPointInd == -1) {
        nFindEnd = strRegAddress.length
      }
      else {
        nFindEnd = nPointInd
      }
      let strRegister = strRegAddress.substr(nFindStart, nFindEnd - nFindStart)
      arrRegAddr[nCut] = Number(strRegister)
      nCut++
      if (nCut >= 3) {
        break
      }
      nFindStart = nPointInd + 1
    }
  }

  //获取当前的变量列表
  let strVarJsonPath = ""
  if (global.productType == PRODUCTKF36) {
    strVarJsonPath = pathFunc.join(projectPath, "VarInfo.json")
  } else {
    strVarJsonPath = pathFunc.join(projectPath, "VarInfo.json")
  }
  var objTagList = ReadJson(strVarJsonPath)
  if (objTagList.Error) {
    res.send(strVarJsonPath + ":" + objTagList.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
    return
  }
  else if (objTagList.TagList == undefined) {
    res.send(strVarJsonPath + ":文件格式错误，缺少TagList")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
    return
  }

  let objFindVar = objTagList.TagList.find(function (tag) {
    return tag.TagID == objEditTagInfo.TagID
  })
  if (objFindVar == undefined) {
    res.send("未找到该变量")
    return
  }
  //校验变量信息
  objEditTagInfo.RegAddress = objEditTagInfo.RegName + strRegAddress
  objDbItem.szRegister = objEditTagInfo.RegAddress
  objDbItem.szDevName = objEditTagInfo.DeviceName

  //如果改名了，判断修改后的变量名称是否有重复
  var bReName = false//判断是否进行过改名
  var objDuplicateTag = objTagList.TagList.filter(function (tag) {
    return tag.TagName == objEditTagInfo.TagName//找到ID相同的变量
  })

  if (objDuplicateTag.length > 1 || (objDuplicateTag.length > 0 && objDuplicateTag[0].TagID != objEditTagInfo.TagID)) {
    bReName = true
    res.send("该变量(" + objEditTagInfo.TagName + ")已经存在")
    return
  }
  if (objDuplicateTag.length == 0) {
    bReName = true
  }
  //获取当前变量组的列表
  var arrLoc = []
  var objTagGroupList = {}
  var objCurrentGroup = {}
  if (global.productType == PRODUCTKF36) {
    var strTagGroupJson = pathFunc.join(projectPath, "VarGroupInfo.json")
  } else {
    var strTagGroupJson = pathFunc.join(projectPath, "VarGroupInfo.json")
  }
  if (bReName) {
    if (objEditTagInfo.TagGroup != "变量" && objEditTagInfo.TagGroup != "root") {
      objTagGroupList = ReadJson(strTagGroupJson)
      if (objTagGroupList.Error) {
        res.send(strTagGroupJson + ":" + objTagGroupList.ErrorDesc)
        VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
        return
      }
      else if (objTagGroupList.TagGroupList == undefined) {
        res.send(strTagGroupJson + ":文件格式错误，缺少TagGroupList")
        VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
        return
      }
      //获取当前变量组所在的位置
      arrLoc = getGroupLocation(objTagGroupList.TagGroupList, objEditTagInfo.TagGroup)
      if (arrLoc.length == 0) {
        res.send(objEditTagInfo.TagGroup + ":该变量组不存在")
        VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
        return
      }
      else {
        let objTemp = []
        for (let j = 0; j < arrLoc.length; j++) {
          if (j == 0) {
            objTemp = objTagGroupList.TagGroupList[arrLoc[j]]
          }
          else {
            objTemp = objTemp.TagObjectList[arrLoc[j]]
          }
        }
        objCurrentGroup = objTemp
        if (objCurrentGroup.TagObjectList != undefined) {
          for (let i = 0; i < objCurrentGroup.TagObjectList.length; i++) {
            if (objCurrentGroup.TagObjectList[i].TagID == objEditTagInfo.TagID) {
              objCurrentGroup.TagObjectList[i].TagName = objEditTagInfo.TagName
            }
          }
        }

      }

      delete objTagGroupList.Error
    }
  }

  //判断是否需要校验
  if (objDevice.DeviceInfo.isConfig === false) {
    KingConfigModuleJs.getRegType(objEditTagInfo.DeviceSeries, objEditTagInfo.RegName)
      .then((nRegType) => {
        if (nRegType < 0) {
          res.send("该驱动xml文件格式或内容有错误，错误码:" + nRegType)
          return
        }
        objEditTagInfo.VarPlcInfo = strRegAddress + ";0;0;" + objEditTagInfo.RegName + ";" + nRegType
        if (bReName && objEditTagInfo.TagGroup != "变量" && objEditTagInfo.TagGroup != "root" && JSON.stringify(objTagGroupList) != "{}") {
          if (strErrMsg = WriteJson(strTagGroupJson, objTagGroupList) != "OK") {
            res.send(strErrMsg)
            VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
            return
          }
        }
        delete objTagList.Error
        delete objEditTagInfo.OldTagName
        for (let i = 0; i < objTagList.TagList.length; i++) {
          if (objTagList.TagList[i].TagID == objEditTagInfo.TagID) {
            objTagList.TagList[i] = objEditTagInfo
            break
          }
        }
        strErrMsg = WriteJson(strVarJsonPath, objTagList)
        if (strErrMsg != "OK") {
          res.send(strErrMsg)
          VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
          return
        }
        VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
        res.send("OK")
      })
  } else {
    let nds = ""
    for (let i = 0; i < strDeviceSeries.length; i++) {
      let e = strDeviceSeries[i]
      if (e == "(") {
        nds += "LB"
      } else if (e == ")") {
        nds += "RB"
      } else {
        nds += e
      }
    }
    //20250901 适配校验模块 js化
    //let nRes = KingConfigModule.getVarInfo(objDbItem, objPlcVar, nErr, nds, strDriverName);
    //KingConfigModule.releaseConfigModuleObject();
    let errcode = { "value": 0 }
    let ret = KingConfigModule.LoadXmlFile(errcode, strDriverXmlPath, strDriverName, nds)
    if (!ret) {
      res.send("加载XML文件失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value])
      return
    }
    errcode = { "value": 0 }, count = { "value": 0 }
    ret = KingConfigModule.getRegisters(errcode, [], count, strDriverName, nds)
    if (!ret) {
      //校验失败
      strErrOut += "该变量(" + strTagName + ")校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value]
      res.send(strErrOut)
      return
    }
    let nRes = KingConfigModule.checkUserVar(errcode, objDbItem, objPlcVar, strDriverName, nds)
    //!20250901
    //20240524 adapte driver: CodeSys_Link
    nRes = objEditTagInfo.ChannelDriver == "CodeSys_Link" ? 1 : nRes
    if (nRes == 0) {
      //校验失败
      res.send("该变量(" + objEditTagInfo.TagName + ")校验失败，错误原因：" + objConfigErrMsg[errcode.value])
      VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
      return
    }
    //strRegAddress = strRegAddress.indexOf('.')==-1?("."+strRegAddress):strRegAddress;
    objEditTagInfo.RegAddress = objEditTagInfo.RegName + strRegAddress
    objPlcVar.nNo = objEditTagInfo.ChannelDriver == "CodeSys_Link" ? strRegAddress.substr(1) : objPlcVar.nNo.value
    objEditTagInfo.VarPlcInfo = objPlcVar.nNo + ";" + objPlcVar.nSubType1 + ";" + objPlcVar.nSubType2 + ";" + objEditTagInfo.RegName + ";" + objPlcVar.nRegType.value
    //objSelectTagInfo = objEditTagInfo;
    if (bReName && objEditTagInfo.TagGroup != "变量" && objEditTagInfo.TagGroup != "root" && JSON.stringify(objTagGroupList) != "{}") {
      if (strErrMsg = WriteJson(strTagGroupJson, objTagGroupList) != "OK") {
        res.send(strErrMsg)
        VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
        return
      }
    }
    delete objTagList.Error
    delete objEditTagInfo.OldTagName
    for (let i = 0; i < objTagList.TagList.length; i++) {
      if (objTagList.TagList[i].TagID == objEditTagInfo.TagID) {
        // objTagList.TagList[i] = objEditTagInfo;
        Object.assign(objTagList.TagList[i], objEditTagInfo)
        if (!objTagList.TagList[i].hasOwnProperty('TagNanoId')) {
          objTagList.TagList[i].TagNanoId = "io_" + nanoid(21)
        }
        break
      }
    }
    strErrMsg = WriteJson(strVarJsonPath, objTagList)
    if (strErrMsg != "OK") {
      res.send(strErrMsg)
      VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
      return
    }
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
    res.send("OK")
  }
})
//批量编辑变量
router.post('/editCollectTagPropertyMutiple', function (req, res) {
  console.time("统计耗时")
  VarLogManagerObj.traceLog(VarManagerName, "Enter post editCollectTagProperty")
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID//获取工程的ID
  let strProjectVersion = req.query.ProjectVersion//获取工程的版本
  let strProjectName = req.query.ProjectName//工程名称
  let taginfos = JSON.parse(req.body.VarInfos)
  let strVarJsonPath = ""
  //获取当前的变量列表    
  if (global.productType == PRODUCTKF36) {
    strVarJsonPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/VarInfo.json"
  } else {
    strVarJsonPath = global.sdbPath + "/" + strProjectName + "/VarInfo.json"
  }
  let objTagList = ReadJson(strVarJsonPath)
  if (objTagList.Error) {
    res.send(strVarJsonPath + ":" + objTagList.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
    return
  }
  else if (objTagList.TagList == undefined) {
    res.send(strVarJsonPath + ":文件格式错误，缺少TagList")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
    return
  }
  let strErrMsg = ""
  for (let ii = 0; ii < taginfos.length; ii++) {
    let taginfo = taginfos[ii]
    //let strTagInfo = pubInter.EscapeAllData(req.body);
    var objEditTagInfo = GetVarJsonInfo(taginfo.rows)
    //CollectTimeInterval check [100-108000000]
    if (objEditTagInfo.CollectTimeInterval < 100 || objEditTagInfo.CollectTimeInterval > 108000000) {
      strErrMsg += objEditTagInfo.TagName + ": 采集频率超限! CollectTimeInterval:[100-108000000]; "
      continue
    }
    //查看数据类型和寄存器类型是否对应
    if ((objEditTagInfo.RegDataType == 1 || objEditTagInfo.RegDataType == 256 || objEditTagInfo.RegDataType == 1024 || objEditTagInfo.TagDataType == 1 || objEditTagInfo.TagDataType == 256 || objEditTagInfo.TagDataType == 1024) && objEditTagInfo.TagDataType != objEditTagInfo.RegDataType) {
      strErrMsg += objEditTagInfo.TagName + ": 转换数据类型与寄存器数据类型不匹配; "
      continue
    }
    //获取设备的驱动和ID
    let objDevice = getOneDevInfo(strProjectName, strProjectID, strProjectVersion, objEditTagInfo.DeviceName)
    if (objDevice.ErrMsg != "") {
      res.send(objDevice.ErrMsg)
      VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
      return
    }
    //获取与设备相关的信息
    let strDriverName = objDevice.DeviceInfo.DriverName//驱动名称
    let strDeviceSeries = ""//设备系列名称
    if (objDevice.DeviceInfo.DriverSeries) {
      strDeviceSeries = objDevice.DeviceInfo.DriverSeries
    } else if (objDevice.DeviceInfo.DeviceSeries) {
      strDeviceSeries = objDevice.DeviceInfo.DeviceSeries
    }
    objEditTagInfo.DeviceID = objDevice.DeviceInfo.DeviceID
    objEditTagInfo.ChannelDriver = objDevice.DeviceInfo.DriverName
    if (objDevice.DeviceInfo.LinkName == "COM") {
      objEditTagInfo.ChannelName = objDevice.DeviceInfo.SerialName
    }
    else {
      objEditTagInfo.ChannelName = objDevice.DeviceInfo.LinkIP
    }
    objEditTagInfo.DeviceSeries = strDeviceSeries
    if (objDevice.DeviceInfo.DriverSeriesType) {
      objEditTagInfo.DeviceSeriesType = objDevice.DeviceInfo.DriverSeriesType
    }
    let strXmlPath = ""
    if (global.productType == PRODUCTKF36) {
      // strXmlPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/Driver/" + strDriverName + ".xml";
      strXmlPath = "./Driver/" + objDevice.DeviceInfo.SystemPlatform + "/" + objDevice.DeviceInfo.OsType + "/" + objDevice.DeviceInfo.DeviceProvider + "/"
        + objDevice.DeviceInfo.DriverName + "/" + objDevice.DeviceInfo.DriverVersion + "/" + objDevice.DeviceInfo.DriverName + ".xml"
    } else {
      strXmlPath = global.sdbPath + "/" + strProjectName + "/Driver/" + strDriverName + ".xml"
    }
    //服务端驱动路径
    let strDriverXmlPath = "./Driver/" + objDevice.DeviceInfo.SystemPlatform + "/" + objDevice.DeviceInfo.OsType + "/" + objDevice.DeviceInfo.DeviceProvider + "/" + strDriverName + "/" + objDevice.DeviceInfo.DriverVersion + "/" + strDriverName + ".xml"

    //使用校验模块校验
    //KingConfigModule.getConfigModuleObject();
    if (!fs.existsSync(strXmlPath)) {
      res.send(strXmlPath + "文件不存在")
      VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
      return
    }
    if (!fs.existsSync(strDriverXmlPath)) {
      res.send(strXmlPath + "文件不存在")
      VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
      return
    }
    //KingConfigModule.setXmlPath(strDriverXmlPath);
    KingConfigModuleJs.setXmlPath(strDriverXmlPath)
    //第一个参数
    var objDbItem = {}
    objDbItem.nAccessMode = objEditTagInfo.AccessType
    objDbItem.nDataType = objEditTagInfo.RegDataType
    objDbItem.reserved = new Array()
    objDbItem.reserved[0] = 0
    objDbItem.reserved[1] = 0
    //第二个参数（传出参数）
    var objPlcVar = {
      "wVarID": { "value": 0 },     	    // variable ID
      "wVarType": { "value": 0 },           // variable type
      "szVarName": { "value": "" }, 	// variable name
      "nDeviceIndex": { "value": 0 },	    // PLC index
      "nUnitNo": { "value": 0 },		    // PLC address
      "pDevAddr": { "nDevAddr": 0, "sDevAddr": "" },//device address name}	    // pointer to device address structure
      "pszRegName": { "value": "" },	    // register name
      "nRegType": { "value": 0 },  	    // register type
      "nSubType": { "value": 0 },		    // sub-type
      "nSubType1": { "value": 0 },
      "nSubType2": { "value": 0 },
      "nNo": { "value": 0 },          	    // address No.
      "nDataType": { "value": 0 },    	    // data type
      "nAccessMode": { "value": 0 },      	// I/O Mode.
      "pComThread": { "value": "" },   // thread
      "nTimerCount": { "value": 0 }, 	    // Counter
      "nFrequency": { "value": 0 },  	    // Sampling frequency
      "maxRaw": { "value": "" },		    // Maximum raw value
      "minRaw": { "value": "" },		    // minimum raw value
      "bConvertion": { "value": 0 },	        // convert type
      "isBad": { "value": 0 },		        // bad device
      "isUnvalid": { "value": 0 }	        // invalid variable
    }
    //第三个参数：错误码
    var nErr = {}
    //判断寄存器是否有二级甚至三级通道
    let arrRegAddr = [0, 0, 0]
    let bNum = false
    let nCut = 0
    //var regPos = /^\d+(\.\d+)?$/; //非负浮点数
    var strRegAddress = objEditTagInfo["RegAddress"]
    if (isNumAndPoint(strRegAddress)) {
      bNum = true
      let nFindStart = 0
      let nPointInd = 0
      while (nPointInd != -1) {
        nPointInd = strRegAddress.indexOf(".", nFindStart)
        let nFindEnd = 0
        if (nPointInd == -1) {
          nFindEnd = strRegAddress.length
        }
        else {
          nFindEnd = nPointInd
        }
        let strRegister = strRegAddress.substr(nFindStart, nFindEnd - nFindStart)
        arrRegAddr[nCut] = Number(strRegister)
        nCut++
        if (nCut >= 3) {
          break
        }
        nFindStart = nPointInd + 1
      }
    }

    let objFindVar = objTagList.TagList.find(function (tag) {
      return tag.TagID == objEditTagInfo.TagID
    })
    if (objFindVar == undefined) {
      res.send("TagID:" + objEditTagInfo.TagID + "未找到该变量")
      return
    }
    //校验变量信息
    objEditTagInfo.RegAddress = objEditTagInfo.RegName + strRegAddress
    objDbItem.szRegister = objEditTagInfo.RegAddress
    objDbItem.szDevName = objEditTagInfo.DeviceName

    //如果改名了，判断修改后的变量名称是否有重复
    var bReName = false//判断是否进行过改名
    var objDuplicateTag = objTagList.TagList.filter(function (tag) {
      return tag.TagName == objEditTagInfo.TagName//找到ID相同的变量
    })

    if (objDuplicateTag.length > 1 || (objDuplicateTag.length > 0 && objDuplicateTag[0].TagID != objEditTagInfo.TagID)) {
      bReName = true
      strErrMsg += "该变量(" + objEditTagInfo.TagName + ")已经存在"
      continue
    }
    if (objDuplicateTag.length == 0) {
      bReName = true
    }
    //获取当前变量组的列表
    var arrLoc = []
    var objTagGroupList = {}
    var objCurrentGroup = {}
    if (global.productType == PRODUCTKF36) {
      var strTagGroupJson = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/VarGroupInfo.json"
    } else {
      var strTagGroupJson = global.sdbPath + "/" + strProjectName + "/VarGroupInfo.json"
    }
    if (bReName) {
      if (objEditTagInfo.TagGroup != "变量" && objEditTagInfo.TagGroup != "root") {
        objTagGroupList = ReadJson(strTagGroupJson)
        if (objTagGroupList.Error) {
          res.send(strTagGroupJson + ":" + objTagGroupList.ErrorDesc)
          VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
          return
        }
        else if (objTagGroupList.TagGroupList == undefined) {
          res.send(strTagGroupJson + ":文件格式错误，缺少TagGroupList")
          VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
          return
        }
        //获取当前变量组所在的位置
        arrLoc = getGroupLocation(objTagGroupList.TagGroupList, objEditTagInfo.TagGroup)
        if (arrLoc.length == 0) {
          res.send(objEditTagInfo.TagGroup + ":该变量组不存在")
          VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
          return
        }
        else {
          let objTemp = []
          for (let j = 0; j < arrLoc.length; j++) {
            if (j == 0) {
              objTemp = objTagGroupList.TagGroupList[arrLoc[j]]
            }
            else {
              objTemp = objTemp.TagObjectList[arrLoc[j]]
            }
          }
          objCurrentGroup = objTemp
          if (objCurrentGroup.TagObjectList != undefined) {
            for (let i = 0; i < objCurrentGroup.TagObjectList.length; i++) {
              if (objCurrentGroup.TagObjectList[i].TagID == objEditTagInfo.TagID) {
                objCurrentGroup.TagObjectList[i].TagName = objEditTagInfo.TagName
              }
            }
          }

        }

        delete objTagGroupList.Error
      }
    }

    //判断是否需要校验
    if (objDevice.DeviceInfo.isConfig === false) {
      /*
      KingConfigModuleJs.getRegType(objEditTagInfo.DeviceSeries, objEditTagInfo.RegName)
      .then((nRegType) => {
        if (nRegType < 0) {
          res.send("该驱动xml文件格式或内容有错误，错误码:" + nRegType);
          return;
        }
        objEditTagInfo.VarPlcInfo = strRegAddress + ";0;0;" + objEditTagInfo.RegName + ";" + nRegType;
        if (bReName && objEditTagInfo.TagGroup != "变量" && objEditTagInfo.TagGroup != "root" && JSON.stringify(objTagGroupList) != "{}") {
          if (strErrMsg = WriteJson(strTagGroupJson, objTagGroupList) != "OK") {
            res.send(strErrMsg); 
            VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty");
            return;
          }
        }
        delete objTagList.Error;
        delete objEditTagInfo.OldTagName;
        for (let i = 0; i < objTagList.TagList.length; i++) {
          if (objTagList.TagList[i].TagID == objEditTagInfo.TagID) {
            objTagList.TagList[i] = objEditTagInfo;
            break;
          }
        }
        // strErrMsg = WriteJson(strVarJsonPath, objTagList);
        // if (strErrMsg != "OK") {
        //   res.send(strErrMsg);
        //   VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty");
        //   return;
        // }
        // VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty");
        // res.send("OK");
      })*/
      objEditTagInfo.VarPlcInfo = strRegAddress + ";0;0;" + objEditTagInfo.RegName + ";0"//250707  nRegType 默认为0，windows中并未使用该字段
      if (bReName && objEditTagInfo.TagGroup != "变量" && objEditTagInfo.TagGroup != "root" && JSON.stringify(objTagGroupList) != "{}") {
        if (strErrMsg = WriteJson(strTagGroupJson, objTagGroupList) != "OK") {
          res.send(strErrMsg)
          VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
          return
        }
      }
      delete objTagList.Error
      delete objEditTagInfo.OldTagName
      for (let i = 0; i < objTagList.TagList.length; i++) {
        if (objTagList.TagList[i].TagID == objEditTagInfo.TagID) {
          objTagList.TagList[i] = objEditTagInfo
          break
        }
      }
    } else {
      let nds = ""
      for (let i = 0; i < strDeviceSeries.length; i++) {
        let e = strDeviceSeries[i]
        if (e == "(") {
          nds += "LB"
        } else if (e == ")") {
          nds += "RB"
        } else {
          nds += e
        }
      }
      //20250920 校验模块 js化
      let errcode = { "value": 0 }
      let ret = KingConfigModule.LoadXmlFile(errcode, strDriverXmlPath, strDriverName, nds)
      if (!ret) {
        res.send("加载XML文件失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value])
        return
      }
      errcode = { "value": 0 }, count = { "value": 0 }
      ret = KingConfigModule.getRegisters(errcode, [], count, strDriverName, nds)
      if (!ret) {
        //校验失败
        strErrOut += "该变量(" + strTagName + ")校验失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value]
        res.send(strErrOut)
        return
      }
      let nRes = KingConfigModule.checkUserVar(errcode, objDbItem, objPlcVar, strDriverName, nds)
      //let nRes = KingConfigModule.getVarInfo(objDbItem, objPlcVar, nErr, nds, strDriverName);
      //KingConfigModule.releaseConfigModuleObject();
      //!20250920      
      //20240524 adapte driver: CodeSys_Link
      nRes = objEditTagInfo.ChannelDriver == "CodeSys_Link" ? 1 : nRes
      if (nRes == 0) {
        //校验失败
        strErrMsg += "该变量(" + objEditTagInfo.TagName + ")校验失败，错误原因：" + objConfigErrMsg[nErr.nErrCode] + "; "
        continue
      }
      //strRegAddress = strRegAddress.indexOf('.')==-1?("."+strRegAddress):strRegAddress;
      objEditTagInfo.RegAddress = objEditTagInfo.RegName + strRegAddress
      objPlcVar.nNo = objEditTagInfo.ChannelDriver == "CodeSys_Link" ? strRegAddress.substr(1) : objPlcVar.nNo.value
      objEditTagInfo.VarPlcInfo = objPlcVar.nNo + ";" + objPlcVar.nSubType1 + ";" + objPlcVar.nSubType2 + ";" + objEditTagInfo.RegName + ";" + objPlcVar.nRegType.value
      objSelectTagInfo = objEditTagInfo
      if (bReName && objEditTagInfo.TagGroup != "变量" && objEditTagInfo.TagGroup != "root" && JSON.stringify(objTagGroupList) != "{}") {
        let strMss = ""
        if (strMss = WriteJson(strTagGroupJson, objTagGroupList) != "OK") {
          res.send(strMss)
          VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
          return
        }
      }
      delete objTagList.Error
      delete objEditTagInfo.OldTagName
      for (let i = 0; i < objTagList.TagList.length; i++) {
        if (objTagList.TagList[i].TagID == objEditTagInfo.TagID) {
          objTagList.TagList[i] = objEditTagInfo
          break
        }
      }
    }
  }
  //250806 
  if (strErrMsg) {
    res.send(strErrMsg)
    return
  }
  strErrMsg = WriteJson(strVarJsonPath, objTagList)
  if (strErrMsg != "OK") {
    res.send(strErrMsg)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
    return
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave post editCollectTagProperty")
  res.send("OK")
  console.timeEnd("统计耗时")
})

//删除变量
router.post('/deleteCollectVariableInfo', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post deleteCollectVariableInfo")
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  let strProjectID = xss(req.query.ProjectID)//获取工程的ID
  let projectPath = pathFunc.join(tenantDir, strProjectID, 'project')
  //let strTagNames = req.query.TagNames;
  //let arrTagNames = strTagNames.split(",");
  let arrTagNames = pubInter.EscapeAllData(req.body.TagNames)//获取要被删除的变量
  if (typeof (arrTagNames) == "string") {
    arrTagNames = JSON.parse(arrTagNames)
  }
  if (global.productType == PRODUCTKF36) {
    var strPath = pathFunc.join(projectPath, "VarInfo.json")
  } else {
    var strPath = pathFunc.join(projectPath, "VarInfo.json")
  }
  var objTagList = ReadJson(strPath)
  if (objTagList.Error) {
    res.send("读取" + strPath + "失败：错误原因：" + objTagList.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteCollectVariableInfo")
    return
  }
  if (objTagList.TagList == undefined) {
    res.send(strPath + ":文件格式错误，缺少TagList")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteCollectVariableInfo")
    return
  }

  //变量组json文件路径
  if (global.productType == PRODUCTKF36) {
    var strGroupPath = pathFunc.join(projectPath, "VarGroupInfo.json")
  } else {
    var strGroupPath = pathFunc.join(projectPath, "VarGroupInfo.json")
  }
  var objTagGroupList = ReadJson(strGroupPath)
  if (objTagGroupList.Error) {
    res.send("读取" + strGroupPath + "失败：错误原因：" + objTagGroupList.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteCollectVariableInfo")
    return
  }
  if (objTagGroupList.TagGroupList == undefined) {
    res.send(strGroupPath + ":文件格式错误，缺少TagList")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteCollectVariableInfo")
    return
  }
  //开始删除变量
  var nDelCount = 0
  for (let i = 0; i < arrTagNames.length; i++) {
    for (let j = 0; j < objTagList.TagList.length; j++) {
      if (objTagList.TagList[j].TagType == 0) {
        continue
      }
      else if (objTagList.TagList[j].TagName == arrTagNames[i]) {
        let nTagID = objTagList.TagList[j].TagID
        //删除变量在变量组中的位置
        if (objTagList.TagList[j].TagGroup != "变量" && objTagList.TagList[j].TagGroup != "root") {
          var resDel = deleteVarInGroup(objTagGroupList.TagGroupList, arrTagNames[i], nTagID)
          if (resDel != "OK") {
            res.send("在VarGroupInfo.json中删除变量" + arrTagNames[i] + "失败，原因：" + resDel)
            VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteCollectVariableInfo")
            return
          }
        }
        objTagList.TagList.splice(j, 1)
        nDelCount++
        break
      }
    }

  }

  delete objTagList.Error
  delete objTagGroupList.Error
  var resWrite = WriteJson(strPath, objTagList)
  if (resWrite != "OK") {
    res.send(resWrite)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteCollectVariableInfo")
    return
  }
  resWrite = WriteJson(strGroupPath, objTagGroupList)
  if (resWrite != "OK") {
    res.send(resWrite)
    return
  }
  //更新工程json中的变量点数
  let strProJsonPath = ""
  if (global.productType == PRODUCTKF36) {
    strProJsonPath = pathFunc.join(projectPath, "ProjectPorpertyInfo.json")
  } else {
    strProJsonPath = pathFunc.join(projectPath, "ProjectPorpertyInfo.json")
  }
  let objPerty = ReadJson(strProJsonPath)
  if (objPerty.Error) {
    res.send(strProJsonPath + ":" + objPerty.ErrorDesc)
    return
  }
  if (objPerty.TagPointsNum != undefined) {
    objPerty.TagPointsNum -= nDelCount
  }
  resWrite = WriteJson(strProJsonPath, objPerty)
  if (resWrite != "OK") {
    res.send(resWrite)
    return
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteCollectVariableInfo")
  res.send("OK")
})

//在变量组中删除指定的变量
function deleteVarInGroup (groupListArr, strTagName, strTagID) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function deleteVarInGroup")
  for (var i = 0; i < groupListArr.length; i++) {
    if (groupListArr[i].TagID != undefined && groupListArr[i].TagName != undefined && groupListArr[i].TagID == strTagID
      && groupListArr[i].TagName == strTagName) {
      groupListArr.splice(i, 1)
      VarLogManagerObj.traceLog(VarManagerName, "Leave function deleteVarInGroup")
      return "OK"
    } else if (groupListArr[i].TagObjectList && groupListArr[i].TagObjectList.length != 0) {
      var resAdd = deleteVarInGroup(groupListArr[i].TagObjectList, strTagName, strTagID)
      if (resAdd == "OK") {
        VarLogManagerObj.traceLog(VarManagerName, "Leave function deleteVarInGroup")
        return resAdd
      }
    }
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function deleteVarInGroup")
  return "Not found"
}

// modified by  jinlong.feng at 0724 变量组不允许重名修改
function hasVarGroupNameInTree (groupListArr, groupName, excludeGroupID) {
  if (!Array.isArray(groupListArr)) return false
  for (let i = 0; i < groupListArr.length; i++) {
    let groupNode = groupListArr[i]
    if (!groupNode || groupNode.TagGroupID == undefined) {
      continue
    }
    if (groupNode.TagGroupName == groupName && String(groupNode.TagGroupID) != String(excludeGroupID)) {
      return true
    }
    if (hasVarGroupNameInTree(groupNode.TagObjectList, groupName, excludeGroupID)) {
      return true
    }
  }
  return false
}
// end

//获取 变量组 属性
router.post('/getVarGroupProperty', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post getVarGroupProperty")
  var objVarGroupInfo = ReadJson(global.propertyPath + '/VarGroupProperty.json')
  if (objVarGroupInfo.Error) {
    res.send("读取Data/config/VarGroupProperty.json失败，错误原因：" + objVarGroupInfo.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post getVarGroupProperty")
    return
  }
  delete objVarGroupInfo.Error
  VarLogManagerObj.traceLog(VarManagerName, "Leave post getVarGroupProperty")
  res.send(JSON.stringify(objVarGroupInfo))
})

//写变量组
function recursionVarAdd (groupListArr, parentGroupName, tagID, tagName) {//------------------------------需要校验组名重复情况
  VarLogManagerObj.traceLog(VarManagerName, "Enter function recursionVarAdd")
  function splitByDot (input) {
    return input.split('.').filter(segment => segment.length > 0)
  }
  const result = splitByDot(parentGroupName) //result:[group1,group2,group3]
  for (var i = 0; i < result.length; i++) {
    for (var i = 0; i < groupListArr.length; i++) {
      if (groupListArr[i].TagGroupName == parentGroupName) {
        var newGroupObj = new Object()
        newGroupObj.TagID = tagID
        newGroupObj.TagName = tagName
        if (groupListArr[i].TagObjectList) {
          groupListArr[i].TagObjectList.push(newGroupObj)
        }
        else {
          groupListArr[i].TagObjectList = []
          groupListArr[i].TagObjectList.push(newGroupObj)
        }
        VarLogManagerObj.traceLog(VarManagerName, "Leave function recursionVarAdd")
        return "OK"//只有一个同名的组名
      } else if (groupListArr[i].TagObjectList && groupListArr[i].TagObjectList.length != 0) {
        let resAdd = recursionVarAdd(groupListArr[i].TagObjectList, parentGroupName, tagID, tagName)
        if (resAdd == "OK") {
          VarLogManagerObj.traceLog(VarManagerName, "Leave function recursionVarAdd")
          return "OK"
        }
      }
    }
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function recursionVarAdd")
  return "Not found"
}

//add by tingting.wang 导入变量时 需要校验变量组是否存在 不存在则进行新建
function addChildWithPathCreation (tree, path, projectPath) {
  let currentNode = tree
  // 遍历路径
  for (let i = 0; i < path.length; i++) {
    const pathSegment = path[i]
    // 查找或创建路径节点
    let foundChild = null
    let childrenKey = 'TagObjectList'
    if (i == 0) {
      childrenKey = 'TagGroupList'
    }
    for (let child of currentNode[childrenKey]) {
      if (child.TagGroupName === pathSegment) {
        foundChild = child
        break
      }
    }
    // 如果没有找到，创建新节点
    if (!foundChild) {
      // modified by  jinlong.feng at 0724 变量组不允许重名修改
      if (hasVarGroupNameInTree(tree.TagGroupList, pathSegment)) {
        return "变量组\"" + pathSegment + "\"已存在"
      }
      // end
      strTagGroupID = MakeVarGroupID(projectPath, tree)
      // MakeVarGroupID(ProjectName, ProjectID, ProjectVer);//生成变量组ID
      let newGroupObj = new Object()
      newGroupObj.TagGroupID = strTagGroupID
      newGroupObj.TagGroupName = pathSegment
      newGroupObj.TagObjectList = []
      currentNode[childrenKey].push(newGroupObj)
      foundChild = newGroupObj
    }
    currentNode = foundChild
  }
  return "OK"
}
//add by tingting.wang 导入变量时 需要校验变量组是否存在 不存在则进行新建
function checkAndCreateNewTagGroup (groupListArr, groupName, projectPath) {
  function splitByDot (input) {
    return input.split('.').filter(segment => segment.length > 0)
  }
  if (groupName === 'root') return
  const GroupNames = splitByDot(groupName) //GroupNames:[group1,group2,group3]
  if (GroupNames.length == 0)//表示为根节点
  {
    return "OK"
  }
  if (GroupNames.length > 3) return false
  // modified by  jinlong.feng at 0724 变量组不允许重名修改
  let resAddGroup = addChildWithPathCreation(groupListArr, GroupNames, projectPath)
  if (resAddGroup != "OK") {
    return resAddGroup
  }
  // end
  var projectVarURL = path.join(projectPath, 'VarGroupInfo.json')

  var finalStr = WriteJson(projectVarURL, groupListArr)
  return finalStr
}
//新建变量组
router.post('/submitAddVarGroup', function (req, res) {
  req.query = pubInter.EscapeAllData(req.query)
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  let projectPath = pathFunc.join(tenantDir, req.query.ProjectID, 'project')
  if (global.productType == PRODUCTKF36) {
    var projectVarURL = pathFunc.join(projectPath, 'VarGroupInfo.json')
  } else {
    var projectVarURL = pathFunc.join(projectPath, 'VarGroupInfo.json')
  }
  let objVarJson = ReadJson(projectVarURL)
  if (objVarJson.Error) {
    res.send("读取" + projectVarURL + " 失败，错误原因：" + objVarJson.ErrorDesc)
    return
  }
  let parentVarGroupName = req.query.GroupName
  let parentVarGroupID = req.query.GroupID
  let subDatas = req.body.submitDatas
  let newVarGroupName = "默认组名"
  let newVarGroupDesc = "默认描述"
  for (var i = 0; i < subDatas.rows.length; i++) {
    if (subDatas.rows[i].code == "TagGroupName") {
      if (subDatas.rows[i].value == "变量" || subDatas.rows[i].value == "root") {
        res.send("变量组名称不能命名为\"变量\"或者\"root\"")
        VarLogManagerObj.traceLog(VarManagerName, "Leave post submitAddVarGroup")
        return
      }
      newVarGroupName = subDatas.rows[i].value
    }
    if (subDatas.rows[i].code == "Description") {
      newVarGroupDesc = subDatas.rows[i].value
    }
  }

  var strTagGroupID = MakeVarGroupID(projectPath)

  // modified by  jinlong.feng at 0709
  function normalizeVarGroupID (parentGroupID) {
    if (parentGroupID == undefined || parentGroupID == null) {
      return parentGroupID
    }
    let strParentGroupID = String(parentGroupID)
    if (strParentGroupID.indexOf(".") != -1) {
      strParentGroupID = strParentGroupID.split(".").pop()
    }
    return strParentGroupID
  }

  function isVarGroupNode (tagObject) {
    return tagObject != undefined
      && tagObject != null
      && tagObject.TagGroupID != undefined
  }

  function recursionVarGroupAdd (groupListArr, parentGroupName, parentGroupID, newGroupName, newGroupDesc) {//------------------------------需要校验组名重复情况
    var bFind = false
    parentGroupID = normalizeVarGroupID(parentGroupID)
    for (var i = 0; i < groupListArr.length; i++) {
      if (!isVarGroupNode(groupListArr[i])) {
        continue
      }
      if (String(groupListArr[i].TagGroupID) == String(parentGroupID)
        || groupListArr[i].TagGroupName == parentGroupName) {
        if (!Array.isArray(groupListArr[i].TagObjectList)) {
          groupListArr[i].TagObjectList = []
        }
        let objFindTag = groupListArr[i].TagObjectList.find(function (tagGroup) {
          return isVarGroupNode(tagGroup) && tagGroup.TagGroupName == newGroupName
        })
        let objFindGroup = groupListArr.find(function (tagGroup) {
          return isVarGroupNode(tagGroup) && tagGroup.TagGroupName == newGroupName
        })
        if (objFindTag != undefined || objFindGroup != undefined) {
          return "变量组\"" + newGroupName + "\"已存在"
        }
        var newGroupObj = new Object()
        newGroupObj.TagGroupID = strTagGroupID
        newGroupObj.TagGroupName = newGroupName
        newGroupObj.Description = newGroupDesc
        newGroupObj.TagObjectList = []
        groupListArr[i].TagObjectList.push(newGroupObj)
        bFind = true
      } else if (groupListArr[i].TagGroupName == newGroupName) {//不能有两个相同的分组名
        return "变量组\"" + newGroupName + "\"已存在"
      } else if (groupListArr[i].TagObjectList && groupListArr[i].TagObjectList.length != 0) {
        var resAdd = recursionVarGroupAdd(groupListArr[i].TagObjectList,
          parentGroupName, parentGroupID, newGroupName, newGroupDesc)
        if (resAdd != "Not found") {
          return resAdd
        }
      }
    }

    if (!bFind) {
      return "Not found"
    }
    else {
      return "OK"
    }
  }
  function findRootGroup (groupListArr, parentGroupID) {
    parentGroupID = normalizeVarGroupID(parentGroupID)
    function recursionGroup (groupListArr, parentGroupID) {
      for (let i = 0; i < groupListArr.length; i++) {
        if (!isVarGroupNode(groupListArr[i])) {
          continue
        }
        if (String(groupListArr[i].TagGroupID) == String(parentGroupID)) {
          return true
        }
        if (groupListArr[i].TagObjectList && groupListArr[i].TagObjectList.length > 0) {
          let result = recursionGroup(groupListArr[i].TagObjectList, parentGroupID)
          if (result) return result
        }
      }
      return false
    }
    for (let i = 0; i < groupListArr.length; i++) {
      if (!isVarGroupNode(groupListArr[i])) {
        continue
      }
      if (String(groupListArr[i].TagGroupID) == String(parentGroupID)) {
        return i
      }
      if (groupListArr[i].TagObjectList
        && groupListArr[i].TagObjectList.length > 0
        && recursionGroup(groupListArr[i].TagObjectList, parentGroupID)) return i
    }
    return -1
  }
  // end

  var returnObj = new Object()
  // modified by  jinlong.feng at 0724 变量组不允许重名修改
  if (hasVarGroupNameInTree(objVarJson.TagGroupList, newVarGroupName)) {
    res.send("变量组\"" + newVarGroupName + "\"已存在")
    VarLogManagerObj.traceLog(VarManagerName, "Leave post submitAddVarGroup")
    return
  }
  // end
  if (parentVarGroupID == -1 || parentVarGroupName == "root" || parentVarGroupName == "变量") {
    //先判断该变量组是否已经存在
    let duplicateName = objVarJson.TagGroupList.filter(function (tagGroup) {
      return tagGroup.TagGroupName == newVarGroupName
    })
    if (duplicateName.length > 0) {
      /*  returnObj.err = true;
       returnObj.data = "变量组" + newVarGroupName + "已存在"; */
      res.send("变量组\"" + newVarGroupName + "\"已存在")
      return
    }
    let newGroupObj = new Object()
    newGroupObj.TagGroupID = strTagGroupID
    newGroupObj.TagGroupName = newVarGroupName
    newGroupObj.Description = newVarGroupDesc
    newGroupObj.TagObjectList = []
    objVarJson.TagGroupList.push(newGroupObj)
  } else {
    let index = findRootGroup(objVarJson.TagGroupList, parentVarGroupID)
    // modified by  jinlong.feng at 0709
    if (index == -1) {
      res.send("变量组父组不存在")
      VarLogManagerObj.traceLog(VarManagerName, "Leave post submitAddVarGroup")
      return
    }
    // end
    var resAdd = recursionVarGroupAdd([objVarJson.TagGroupList[index]], parentVarGroupName, parentVarGroupID, newVarGroupName, newVarGroupDesc)
    if (resAdd != "OK") {
      /* returnObj.err = true;
      returnObj.data = resAdd; */
      res.send(resAdd)
      VarLogManagerObj.traceLog(VarManagerName, "Leave post submitAddVarGroup")
      return
    }
  }

  delete objVarJson.Error
  var finalStr = WriteJson(projectVarURL, objVarJson)
  res.send(finalStr)
  /*returnObj.err = false; */
  VarLogManagerObj.traceLog(VarManagerName, "Leave post submitAddVarGroup")
})


//编辑变量组
router.post('/editVarGroupProperty', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post editVarGroupProperty")
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  var projectPath = path.join(tenantDir, req.query.ProjectID, 'project')
  let editVarGroupID = req.query.VarGroupID
  let editGroupInfo = pubInter.EscapeAllData(req.body)
  let strProPath = ""
  if (global.productType == PRODUCTKF36) {
    strProPath = pathFunc.join(projectPath, 'VarGroupInfo.json')
  } else {
    strProPath = pathFunc.join(projectPath, 'VarGroupInfo.json')
  }
  var objVarGroup = ReadJson(strProPath)
  if (objVarGroup.Error) {
    res.send("读取" + strProPath + "失败。错误原因：" + objVarGroup.ErrorDesc)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editVarGroupProperty")
    return
  }
  var strOldName = ""
  var strNewName = ""

  function recursionVarGroupEdit (groupListArr, editVarGroupID, editGroupInfo) {
    let strCodeName = ""
    if (editGroupInfo.code == "GroupName" || editGroupInfo.code == "GroupID") {
      strCodeName = "Tag" + editGroupInfo.code
    }
    else {
      strCodeName = editGroupInfo.code
    }
    for (var i = 0; i < groupListArr.length; i++) {
      // modified by  jinlong.feng at 0724 变量组不允许重名修改
      if (strCodeName == "TagGroupName"
        && String(groupListArr[i].TagGroupID) != String(editVarGroupID)
        && groupListArr[i].TagGroupName == editGroupInfo.value) {
        return "变量组重名"
      }
      // end
      if (groupListArr[i].TagGroupID == editVarGroupID) {
        if (strCodeName == "TagGroupName" && groupListArr[i][strCodeName] != editGroupInfo.value) {
          strOldName = groupListArr[i][strCodeName]
          strNewName = editGroupInfo.value
        }
        groupListArr[i][strCodeName] = editGroupInfo.value
      } else if (groupListArr[i].TagObjectList && groupListArr[i].TagObjectList.length != 0) {
        let strRes = recursionVarGroupEdit(groupListArr[i].TagObjectList, editVarGroupID, editGroupInfo)
        if (strRes != "OK") {
          return strRes
        }
      }
    }
    return "OK"
  }

  let strEditRes = recursionVarGroupEdit(objVarGroup.TagGroupList, editVarGroupID, editGroupInfo)
  if (strEditRes != "OK") {
    res.send(strEditRes)
    return
  }
  if (strNewName == "变量" || strNewName == "root") {
    res.send("变量组名称不能命名为\"变量\"或者\"root\"")
    return
  }

  delete objVarGroup.Error
  var resWrite = WriteJson(strProPath, objVarGroup)
  if (resWrite != "OK") {
    res.send(resWrite)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post editVarGroupProperty")
    return
  }
  if (strNewName != strOldName) {
    //修改变量信息中的TagGroup字段的值
    let strVarPath = ""
    if (global.productType == PRODUCTKF36) {
      strVarPath = pathFunc.join(projectPath, 'VarInfo.json')
    } else {
      strVarPath = pathFunc.join(projectPath, 'VarInfo.json')
    }
    var objVarJson = ReadJson(strVarPath)
    if (objVarJson.Error) {
      res.send(objVarJson.ErrorDesc)
      VarLogManagerObj.traceLog(VarManagerName, "Leave post editVarGroupProperty")
      return
    }
    for (let i = 0; i < objVarJson.TagList.length; i++) {
      if (objVarJson.TagList[i].TagGroup == strOldName) {
        objVarJson.TagList[i].TagGroup = strNewName
      }
    }

    resWrite = WriteJson(strVarPath, objVarJson)
    res.send(resWrite)
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave post editVarGroupProperty")
})

//删除变量组
router.post('/deleteVarGroup', function (req, res) {
  req.query = pubInter.EscapeAllData(req.query)
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  let projectPath = pathFunc.join(tenantDir, req.query.ProjectID, 'project')
  if (global.productType == PRODUCTKF36) {
    var projectVarURL = pathFunc.join(projectPath, 'VarGroupInfo.json')
  } else {
    var projectVarURL = pathFunc.join(projectPath, 'VarGroupInfo.json')
  }
  var objErrOut = {}
  objErrOut.err = false
  objErrOut.data = "OK"
  let objVarJson = ReadJson(projectVarURL)
  if (objVarJson.Error) {
    objErrOut.err = true
    objErrOut.data = objVarJson.ErrorDesc
    res.send(JSON.stringify(objErrOut))
    VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteVarGroup")
    return
  }
  if (objVarJson.TagGroupList == undefined) {
    objErrOut.err = true
    objErrOut.data = projectVarURL + "文件格式错误，错误原因：缺少TagGroupList"
    res.send(JSON.stringify(objErrOut))
    VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteVarGroup")
    return
  }
  let delVarGroupName = req.query.GroupName
  let delVarGroupID = req.query.GroupID

  if (global.productType == PRODUCTKF36) {
    var strProVarPath = pathFunc.join(projectPath, 'VarInfo.json')
  } else {
    var strProVarPath = pathFunc.join(projectPath, 'VarInfo.json')
  }
  let objAllTagList = ReadJson(strProVarPath)
  if (objAllTagList.Error) {
    objErrOut.err = true
    objErrOut.data = objAllTagList.ErrorDesc
    res.send(JSON.stringify(objErrOut))
    return
  }
  let arrAllTagList = objAllTagList.TagList
  let nBefore = arrAllTagList.length
  var resDel = recursionVarGroupDelete(objVarJson.TagGroupList, delVarGroupName, delVarGroupID, arrAllTagList)
  if (resDel != "OK") {
    objErrOut.err = true
    objErrOut.data = "删除变量组" + delVarGroupName + "失败.原因：" + resDel
    res.send(JSON.stringify(objErrOut))
    VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteVarGroup")
    return
  }
  let nAfter = arrAllTagList.length
  let nDelCount = nBefore - nAfter
  //写入json
  delete objVarJson.Error
  var resWrite = WriteJson(projectVarURL, objVarJson)
  if (resWrite != "OK") {
    objErrOut.err = true
    objErrOut.data = resWrite
    res.send(JSON.stringify(objErrOut))
    return
  }
  resWrite = WriteJson(strProVarPath, objAllTagList)
  if (resWrite != "OK") {
    objErrOut.err = true
    objErrOut.data = resWrite
    res.send(JSON.stringify(objErrOut))
    return
  }
  //更新工程json中的变量点数
  if (global.productType == PRODUCTKF36) {
    var strProJsonPath = pathFunc.join(projectPath, 'ProjectPorpertyInfo.json')
  } else {
    var strProJsonPath = pathFunc.join(projectPath, '/ProjectPorpertyInfo.json')
  }
  let objPerty = ReadJson(strProJsonPath)
  if (objPerty.Error) {
    objErrOut.err = true
    objErrOut.data = strProJsonPath + ":" + objPerty.ErrorDesc
    res.send(JSON.stringify(objErrOut))
    return
  }
  if (objPerty.TagPointsNum != undefined) {
    objPerty.TagPointsNum -= nDelCount
  }
  resWrite = WriteJson(strProJsonPath, objPerty)
  if (resWrite != "OK") {
    objErrOut.err = true
    objErrOut.data = resWrite
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave post deleteVarGroup")
  res.send(JSON.stringify(objErrOut))
})

//删除指定的变量组
function recursionVarGroupDelete (groupListArr, strGroupName, strGroupID, arrVarList) {//------------------------------需要校验组名重复情况
  VarLogManagerObj.traceLog(VarManagerName, "Enter function recursionVarGroupDelete")
  for (var i = 0; i < groupListArr.length; i++) {
    if ((groupListArr[i].TagGroupID != undefined && groupListArr[i].TagGroupID == strGroupID) ||
      (groupListArr[i].TagGroupName != undefined && groupListArr[i].TagGroupName == strGroupName)) {
      let arrDelTagList = groupListArr[i].TagObjectList
      delVarInGroup(arrVarList, arrDelTagList)
      groupListArr.splice(i, 1)
      VarLogManagerObj.traceLog(VarManagerName, "Leave function recursionVarGroupDelete")
      return "OK"//只有一个同名的组名
    } else if (groupListArr[i].TagObjectList && groupListArr[i].TagObjectList.length != 0) {
      var resAdd = recursionVarGroupDelete(groupListArr[i].TagObjectList, strGroupName, strGroupID, arrVarList)
      if (resAdd != "Not found") {
        VarLogManagerObj.traceLog(VarManagerName, "Leave function recursionVarGroupDelete")
        return resAdd
      }
    }
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function recursionVarGroupDelete")
  return "Not found"
}

//在变量组中删除指定的变量
function delVarInGroup (arrVarList, arrDelTagList) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function delVarInGroup")
  for (let j = arrVarList.length - 1; j >= 0; j--) {
    if (arrVarList[j].TagType == 0) {
      continue
    }
    for (let k = 0; k < arrDelTagList.length; k++) {
      if (arrDelTagList[k].TagID != undefined && arrVarList[j].TagID == arrDelTagList[k].TagID) {
        arrVarList.splice(j, 1)
        arrDelTagList.splice(k, 1)
        break
      }
      else if (arrDelTagList[k].TagGroupID != undefined) {
        if (arrDelTagList[k].TagObjectList.length == 0) {
          continue
        }
        let nLength = arrVarList.length
        delVarInGroup(arrVarList, arrDelTagList[k].TagObjectList)
        if (nLength != arrVarList.length && nLength - arrVarList.length > 1) {
          j -= nLength - arrVarList.length - 1
        }
        if (nLength - arrVarList.length > 0) {
          break
        }
      }
    }
    if (arrDelTagList.length == 0) {
      VarLogManagerObj.traceLog(VarManagerName, "Leave function delVarInGroup")
      return
    }
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function delVarInGroup")
}

//递归删除
function delFileAndDir (pathOfFile) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function delFileAndDir")
  var files = []
  if (fs.existsSync(pathOfFile)) {
    files = fs.readdirSync(pathOfFile)
    files.forEach(function (file, index) {
      var curPath = pathOfFile + '/' + file
      if (fs.statSync(curPath).isDirectory()) {
        delFileAndDir(curPath)
      } else {
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(pathOfFile)
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function delFileAndDir")
};

//递归创建目录
function makeDirSync (pathname) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function delFileAndDir")
  if (fs.existsSync(pathname)) {
    return true
  } else {
    if (makeDirSync(path.dirname(pathname))) {
      try {
        fs.mkdirSync(pathname)
      } catch (error) {
        VarLogManagerObj.traceLog(VarManagerName, "Leave function delFileAndDir")
        return false
      }
      VarLogManagerObj.traceLog(VarManagerName, "Leave function delFileAndDir")
      return true
    }
    else {
      VarLogManagerObj.traceLog(VarManagerName, "Leave function delFileAndDir")
      return false
    }
  }

}

//导出变量
router.post('/exportCollectTag', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post exportCollectTag")
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID
  var projectPath = path.join(tenantDir, strProjectID, 'project')
  let strProjectName = req.query.ProjectName
  let strProPath = ""
  if (global.productType == PRODUCTKF36) {
    strProPath = pathFunc.join(projectPath, "VarInfo.json")
  } else {
    strProPath = pathFunc.join(projectPath, "VarInfo.json")
  }
  let strSysType = req.query.SystemType
  let strFileType = req.query.Type
  /* let nFind = __dirname.lastIndexOf(pathSep);
  let strPath = __dirname.substring(0, nFind); */
  delFileAndDir(global.exportPath + "/var")//如果存在的话就删除目录
  let tempPath = global.exportPath + "/var"
  var objRes = {}
  objRes.Error = false
  let createFile = makeDirSync(tempPath)//创建目录
  if (!createFile) {
    objRes.Error = true
    objRes.data = "创建" + tempPath + "目录失败"
    res.send(objRes)
    VarLogManagerObj.errorLog(VarManagerName, objRes.data)
    return
  }
  // var arrExportTags = req.body.TagName.split(",");//导出变量名称的列表
  var arrExportVarInfo = []
  var objAllVarInfo = ReadJson(strProPath)
  if (objAllVarInfo.Error) {
    objRes.Error = true
    objRes.data = "读取" + strProPath + "失败。错误原因：" + objAllVarInfo.ErrorDesc
    res.send(objRes)
    VarLogManagerObj.errorLog(VarManagerName, objRes.data)
    return
  }

  // modified by  jinlong.feng at 0709
  let tagNanoIdChanged = false
  for (let i = 0; i < objAllVarInfo.TagList.length; i++) {
    if (objAllVarInfo.TagList[i].TagType == KVIO_TAG_TYPE_USER
      && (objAllVarInfo.TagList[i].TagNanoId == undefined
        || objAllVarInfo.TagList[i].TagNanoId === "")) {
      objAllVarInfo.TagList[i].TagNanoId = "io_" + nanoid(21)
      tagNanoIdChanged = true
    }
  }
  if (tagNanoIdChanged) {
    delete objAllVarInfo.Error
    let writeTagNanoIdResult = WriteJson(strProPath, objAllVarInfo)
    if (writeTagNanoIdResult != "OK") {
      objRes.Error = true
      objRes.data = "写入TagNanoId失败，错误原因：" + writeTagNanoIdResult
      res.send(objRes)
      VarLogManagerObj.errorLog(VarManagerName, objRes.data)
      return
    }
  }
  // end

  //判断是否是全部导出
  if (req.query.AllExportFlag == "true") {
    var arrExportTags = []
    for (let i = 0; i < objAllVarInfo.TagList.length; i++) {
      if (objAllVarInfo.TagList[i].TagType == KVIO_TAG_TYPE_USER) {
        arrExportTags.push(objAllVarInfo.TagList[i].TagName)
      }
    }
  } else {
    var arrExportTags = pubInter.EscapeAllData(req.body.ExportTagList)//导出变量名称的列表
  }

  //add by tingting.wang 导出时 补全变量的变量组信息
  let strTagGroupJson = path.join(projectPath, "/VarGroupInfo.json")
  var objTagGroupList = {}
  objTagGroupList = ReadJson(strTagGroupJson)
  if (objTagGroupList.Error) {
    objRes.Error = true
    objRes.data = strTagGroupJson + ":" + objTagGroupList.ErrorDesc
    res.send(objRes)
    return
  }
  else if (objTagGroupList.TagGroupList == undefined) {
    objRes.Error = true
    objRes.data = strTagGroupJson + ":文件格式错误，缺少TagGroupList"
    res.send(objRes)
    return
  }
  //add end
  //获取所有要被导出的变量的信息
  for (let i = 0; i < arrExportTags.length; i++) {
    let isFound = false
    for (let j = 0; j < objAllVarInfo.TagList.length; j++) {
      if (objAllVarInfo.TagList[j].TagName == arrExportTags[i]) {
        //获取设备的驱动
        let objDevice = getOneDevInfo(strProjectName, strProjectID, projectPath, objAllVarInfo.TagList[j].DeviceName)
        if (objDevice.ErrMsg != "") {
          objRes.Error = true
          objRes.data = objDevice.ErrMsg
          res.send(objRes)
          VarLogManagerObj.errorLog(VarManagerName, objRes.data)
          return
        }
        objAllVarInfo.TagList[j].DriverName = objDevice.DeviceInfo.DriverName
        objAllVarInfo.TagList[j].DeviceSeries = objDevice.DeviceInfo.DriverSeries
        objAllVarInfo.TagList[j].SystemPlatform = objDevice.DeviceInfo.SystemPlatform
        objAllVarInfo.TagList[j].TagGroup = getTagGroupPath(objTagGroupList, objAllVarInfo.TagList[j].TagGroup)//add by tingting.wang 导出变量组全路径
        arrExportVarInfo.push(objAllVarInfo.TagList[j])
        isFound = true
        break
      }
    }
    if (!isFound) {
      objRes.Error = true
      objRes.data = "变量：" + arrExportTags[i] + " 不存在."
      res.send(objRes)
      return
    }
  }

  if (strFileType == "csv") {
    if (!WriteCsv(arrExportVarInfo, tempPath + "/Tag.csv", strSysType)) {
      objRes.Error = true
      objRes.data = "写入csv出错"
      res.send(objRes)
      VarLogManagerObj.errorLog(VarManagerName, objRes.data)
      return
    }
    objRes.data = "var/Tag.csv"
  } else {
    //表示是导出json格式的文件
    var objExportJson = {}
    objExportJson.TagList = arrExportVarInfo
    let resWrite = WriteJson(tempPath + "/Tag.json", objExportJson)
    if (resWrite != "OK") {
      objRes.Error = true
      objRes.data = "写入json出错,错误原因：" + resWrite
      res.send(objRes)
      VarLogManagerObj.errorLog(VarManagerName, objRes.data)
      return
    }
    objRes.data = "var/Tag.json"
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave post exportCollectTag")
  res.send(objRes)
})

//导出变量（KF）
router.post('/exportProTagList', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post exportProTagList")
  req.query = pubInter.EscapeAllData(req.query)
  let strProjectID = req.query.ProjectID
  let strProjectVersion = req.query.ProjectVersion
  let strProPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/VarInfo.json"
  let strProjectName = req.query.ProjectName
  let nFind = __dirname.lastIndexOf("/")
  if (platform == "win32") {
    nFind = __dirname.lastIndexOf("\\")
  }
  //let strPath = __dirname.substring(0, nFind);
  delFileAndDir(global.exportPath + "/var")//如果存在的话就删除目录
  let tempPath = global.exportPath + "/var"
  var objRes = {}
  objRes.Error = false
  let createFile = makeDirSync(tempPath)//创建目录
  if (!createFile) {
    objRes.Error = true
    objRes.data = "创建" + tempPath + "目录失败"
    res.send(objRes)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post exportProTagList")
    return
  }
  var arrExportTags = pubInter.EscapeAllData(req.body.ExportTagList)//导出变量名称的列表
  var arrExportVarInfo = []
  var objAllVarInfo = ReadJson(strProPath)
  if (objAllVarInfo.Error) {
    objRes.Error = true
    objRes.data = "读取" + strProPath + "失败。错误原因：" + objAllVarInfo.ErrorDesc
    res.send(objRes)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post exportProTagList")
    return
  }

  //获取所有要被导出的变量的信息
  for (let i = 0; i < objAllVarInfo.TagList.length; i++) {
    for (let j = 0; j < arrExportTags.length; j++) {
      if (objAllVarInfo.TagList[i].TagName == arrExportTags[j]) {
        //获取设备的驱动
        let objDevice = getOneDevInfo(strProjectName, strProjectID, strProjectVersion, objAllVarInfo.TagList[i].DeviceName)
        if (objDevice.ErrMsg != "") {
          objRes.Error = true
          objRes.data = objDevice.ErrMsg
          res.send(objRes)
          VarLogManagerObj.traceLog(VarManagerName, "Leave post exportProTagList")
          return
        }
        objAllVarInfo.TagList[i].ChannelDriver = objDevice.DeviceInfo.DriverName
        arrExportVarInfo.push(objAllVarInfo.TagList[i])
        break
      }
    }
  }

  //表示是导出json格式的文件
  var objExportJson = {}
  objExportJson.sourceName = strProjectName
  objExportJson.objectlist = []
  for (let i = 0; i < arrExportVarInfo.length; i++) {
    let objOneObject = {}
    objOneObject.n = arrExportVarInfo[i].TagName
    objOneObject.d = arrExportVarInfo[i].Description
    objOneObject.g = arrExportVarInfo[i].TagGroup
    objOneObject.t = GetDataType2(arrExportVarInfo[i].TagDataType)
    /* let objTemp = {};
    for (const key in arrExportVarInfo[i]) {
      if (arrExportVarInfo[i].hasOwnProperty(key)) {
        if (key != "TagName" && key != "Description" && key != "TagGroup" && key != "TagType") {
          objTemp[key] = arrExportVarInfo[i][key];
        }
      }
    }
    objOneObject.o = JSON.stringify(objTemp); */
    objOneObject.o = ""
    objExportJson.objectlist.push(objOneObject)
  }
  let resWrite = WriteJson(tempPath + "/Tag.json", objExportJson)
  if (resWrite != "OK") {
    objRes.Error = true
    objRes.data = resWrite
    res.send(objRes)
    VarLogManagerObj.traceLog(VarManagerName, "Leave post exportProTagList")
    return
  }
  objRes.data = "/var/Tag.json"
  VarLogManagerObj.traceLog(VarManagerName, "Leave post exportProTagList")
  res.send(objRes)
})

//将变量信息写入csv文件
function WriteCsv (arrExportVarInfo, strCsvPath, sysType) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter function WriteCsv")
  if (typeof arrExportVarInfo != "object" || arrExportVarInfo.length == 0) {
    VarLogManagerObj.traceLog(VarManagerName, "Leave function WriteCsv")
    return false
  }
  let fields = Object.keys(arrExportVarInfo[0])//获取对象的所有属性
  const json2csvParser = new Json2csvParser({ fields })
  const csv = json2csvParser.parse(arrExportVarInfo)
  var newCsv
  if (sysType == 1) {
    newCsv = iconv.encode(csv, 'GBK')
  } else {
    newCsv = csv
  }
  try {
    fs.writeFileSync(strCsvPath, newCsv)
  } catch (error) {
    console.error(error.message)
    return false
  }
  VarLogManagerObj.traceLog(VarManagerName, "Leave function WriteCsv")
  return true
}

//导入变量
router.post('/ImportCollectTag', function (req, res) {
  VarLogManagerObj.traceLog(VarManagerName, "Enter post ImportCollectTag")
  const projectGroupService = tenantManager.getProjectGroupService(req.headers.tenant_id)
  const tenantDir = projectGroupService.dataStore.tenantDir
  let projectPath = path.join(tenantDir, req.query.ProjectID, 'project')
  var nStartTime = new Date().getTime()
  const form = new formidable.IncomingForm()
  form.keepExtensions = true//保存扩展名
  form.maxFieldsSize = 500 * 1024 * 1024//上传文件的最大大小
  req.query = pubInter.EscapeAllData(req.query)
  form.parse(req, async function (err, fields, files) {
    // 解析重复操作参数，skip=跳过同名变量(默认)，overwrite=覆盖同名变量
    const duplicateAction = req.query.DuplicateAction === 'skip' ? 'skip' : 'overwrite'
    if (err) {
      VarLogManagerObj.errorLog(VarManagerName, err.message)
      res.send(err.message)
      return
    }
    if (files.uploadDatas == undefined) {
      res.send("The property of 'uploadDatas' is not found.")
      return
    }
    let uploadFile = Array.isArray(files.uploadDatas) ? files.uploadDatas[0] : files.uploadDatas
    let strFileName = uploadFile.path || uploadFile.filepath
    if (!strFileName) {
      res.send("上传文件路径无效")
      return
    }
    let readFile = fs.readFileSync(strFileName)
    //读取当前变量信息
    let strProjectID = req.query.ProjectID
    let strProjectName = req.query.ProjectName
    let strProVarPath = ""
    strProVarPath = pathFunc.join(projectPath, "VarInfo.json")
    var objVarData = ReadJson(strProVarPath)
    let proVarTotal = objVarData.DAVAR.length + objVarData.OPCVAR.length + objVarData.TagList.length
    if (objVarData.Error) {
      res.send(strProVarPath + "读取失败，原因：" + objVarData.ErrorDesc)
      VarLogManagerObj.errorLog(VarManagerName, strProVarPath + "读取失败，原因：" + objVarData.ErrorDesc)
      return
    }
    if (objVarData.TagList == undefined) {
      res.send(strProVarPath + "格式错误，缺少\"TagList\"")
      VarLogManagerObj.errorLog(VarManagerName, strProVarPath + "格式错误，缺少\"TagList\"")
      return
    }
    //260413 gxx 提升校验性能
    let dupTagNMSet = new Set()
    objVarData.TagList.forEach(v => dupTagNMSet.add(v.TagName))
    let mapDevNmDriNmDeSer2DevObj = {}
    //260413
    delete objVarData.Error
    //开始导入
    var objReadFile = {}
    if (req.query.Type == "csv") {
      objReadFile.TagList = []
      // modified by  jinlong.feng at 0727 CSV导入编码兼容修改
      readFile = pubInter.decodeImportCsvFile(readFile)
      // end
      objReadFile.TagList = await csv2Json({
        trim: false,
        ignoreEmpty: false,
        checkType: false
      }).fromString(readFile)
      if (objReadFile.TagList.length > 0) {
        const csvHeaders = Object.keys(objReadFile.TagList[0])
        objReadFile.TagList = objReadFile.TagList.map(function (tagItem) {
          const normalizedTagItem = {}
          for (let headerIndex = 0; headerIndex < csvHeaders.length; headerIndex++) {
            const headerName = csvHeaders[headerIndex]
            normalizedTagItem[headerName] = tagItem[headerName] == undefined ? "" : tagItem[headerName]
          }
          return normalizedTagItem
        })
      }
    } else {//表示是json
      objReadFile = JSON.parse(readFile.toString())
      if (objReadFile.TagList == undefined) {
        res.send("导入文件的格式不正确，缺少\"TagList\"")
        VarLogManagerObj.errorLog(VarManagerName, "导入文件的格式不正确，缺少\"TagList\"")
        return
      }

    }
    //260413 gxx 屏蔽
    if (proVarTotal + objReadFile.TagList.length > 20000) {
      return res.send('工程变量数量超出点数限制')
    }

    // for(let i = 0; i < objReadFile.TagList.length; i++) {
    //   let t_Name = objReadFile.TagList[i].TagName;
    //   for(let j = 0; j < objReadFile.TagList.length; j++) {
    //     if(j == i) continue;
    //     else if(t_Name == objReadFile.TagList[j].TagName) {
    //       let ErrorDesc = "失败，文件中含有名称重复变量:"+ t_Name +"，请修改！";
    //       res.send(ErrorDesc);
    //       return;
    //     }
    //   }
    // }
    ///260413

    //读取设备信息
    let strDevPath = pathFunc.join(projectPath, "DeviceInfo.json")
    var objDevInfo = ReadJson(strDevPath)
    if (objDevInfo.Error) {
      res.send(strDevPath + "读取失败，失败原因：" + objDevInfo.ErrorDesc)
      VarLogManagerObj.errorLog(VarManagerName, strDevPath + "读取失败，失败原因：" + objDevInfo.ErrorDesc)
      return
    }
    //读取变量组信息
    let strVarGroupPath = pathFunc.join(projectPath, "VarGroupInfo.json")
    var objTagGroupInfo = ReadJson(strVarGroupPath)
    if (objTagGroupInfo.Error) {
      res.send(strVarGroupPath + "读取失败，失败原因：" + objTagGroupInfo.ErrorDesc)
      VarLogManagerObj.errorLog(VarManagerName, strVarGroupPath + "读取失败，失败原因：" + objTagGroupInfo.ErrorDesc)
      return
    }
    //读取非线性表信息//add by xin.wang 2020-06-10
    let strnonlinearPath = pathFunc.join(projectPath, "NonlinearInfo.json")
    var objNonlinearInfo = ReadJson(strnonlinearPath)
    if (objNonlinearInfo.Error) {
      res.send(strnonlinearPath + "读取失败，失败原因：" + objNonlinearInfo.ErrorDesc)
      VarLogManagerObj.errorLog(VarManagerName, strnonlinearPath + "读取失败，失败原因：" + objNonlinearInfo.ErrorDesc)
      return
    }

    var strErrOut = ""
    // 同一批导入里，大量变量会复用相同驱动文件，缓存 existsSync 结果可避免重复磁盘探测。
    const driverFileExistsCache = new Map()
    // 变量组在导入过程中会被频繁查找，按完整路径构建索引，避免每个点都递归遍历整棵组树。
    const tagGroupNameMap = new Map()
    const childGroupIndexCache = new WeakMap()
    // 这一批导入里新增变量组时，不能每次都重新扫描整棵 VarGroup 树去找下一个可用 ID。
    // 先在导入开始前调用一次 MakeVarGroupID 算出“当前最大 ID + 1”，
    // 后续本批次新建组统一走 allocateTagGroupID 递增分配。
    // 这样无论本次导入新增多少层级组，都只需要一次全树扫描。
    let nextTagGroupID = MakeVarGroupID(projectPath, objTagGroupInfo)
    const getChildGroupIndex = function (children) {
      let childIndexMap = childGroupIndexCache.get(children)

      // 如果这一层 children 之前已经建过索引，直接复用。
      // 这样同一层后续再查 groupName 时，就不需要重新扫描整段数组。
      if (childIndexMap != undefined) {
        return childIndexMap
      }

      // children 表示“当前这一层的所有直接子组”。
      // 导入时最常见的操作是：给定一个 groupName，判断这一层有没有同名子组。
      // 如果每次都在 children 里顺序 for 一遍，导入量大时重复开销会很高。
      // 所以这里第一次访问某一层时，把它转换成 Map<TagGroupName, groupObject>。
      // 后面只要还是这一层 children，就可以 O(1) 查找。
      childIndexMap = new Map()
      for (let childIndex = 0; childIndex < children.length; childIndex++) {
        const child = children[childIndex]

        // 只把合法的子组节点写入索引，key 是组名，value 是组对象本身。
        if (child && child.TagGroupName) {
          childIndexMap.set(child.TagGroupName, child)
        }
      }

      // 用 WeakMap 把“原数组对象 -> 这一层的索引 Map”绑定起来。
      // 这样缓存和具体那一层 children 是一一对应的。
      childGroupIndexCache.set(children, childIndexMap)
      return childIndexMap
    }
    const allocateTagGroupID = function () {
      // nextTagGroupID 是这次导入批次里的“下一个可分配 ID 游标”。
      // 每次创建新组时：
      // 1. 先取出当前值作为本次分配结果。
      // 2. 再把游标加 1，留给下一个新组。
      // 这样一整批导入里的新组 ID 会连续递增，不需要每次都重新扫树找最大值。
      const allocatedID = nextTagGroupID
      nextTagGroupID += 1
      return allocatedID
    }
    {
      // 这一段是“预热索引”。
      // 目标是把现有变量组树拍平成：完整路径 -> 组对象。
      // 例如把 A.B.C 这样的路径直接映射到对应的组节点。
      // 后面导入变量时，如果变量本身已经指向某个现有组，就能直接命中，不用再递归查树。

      // 这里同样使用显式栈 DFS。
      // 初始时把第一层组节点转成 { group, groupPath } 结构压入栈，
      // 其中 groupPath 记录“从根到当前节点”的完整路径字符串。
      const groupStack = (objTagGroupInfo.TagGroupList || []).map(group => ({
        group: group,
        groupPath: group && group.TagGroupName ? group.TagGroupName : ""
      }))
      while (groupStack.length > 0) {
        // 取出一个待处理节点，以及它当前对应的完整路径。
        const currentItem = groupStack.pop()
        const currentGroup = currentItem.group

        // 节点或路径不合法就跳过，避免把空路径写进索引。
        if (!currentGroup || !currentGroup.TagGroupName || !currentItem.groupPath) {
          continue
        }

        // 把“完整路径 -> 当前组对象”写入总索引。
        // 后面 tagGroupNameMap.get("A.B.C") 就能直接拿到目标组。
        tagGroupNameMap.set(currentItem.groupPath, currentGroup)

        // 如果当前节点下面还有子组，继续向下展开。
        if (Array.isArray(currentGroup.TagObjectList) && currentGroup.TagObjectList.length > 0) {

          // 顺手把这一层子组数组的名字索引也建好，供后面创建路径时复用。
          getChildGroupIndex(currentGroup.TagObjectList)

          // 逐个子组压栈，并把子组的完整路径拼出来。
          // 例如当前路径是 A.B，子组名是 C，那么子组路径就是 A.B.C。
          for (let groupIndex = currentGroup.TagObjectList.length - 1; groupIndex >= 0; groupIndex--) {
            const childGroup = currentGroup.TagObjectList[groupIndex]
            if (childGroup && childGroup.TagGroupName) {
              groupStack.push({
                group: childGroup,
                groupPath: currentItem.groupPath + "." + childGroup.TagGroupName
              })
            }
          }
        }
      }
    }
    // modified by  jinlong.feng at 0727 变量导入覆盖组信息同步修改
    function findImportVarGroupByName (groupListArr, groupName) {
      if (!Array.isArray(groupListArr)) return null
      for (let i = 0; i < groupListArr.length; i++) {
        if (groupListArr[i].TagGroupName == groupName) {
          return groupListArr[i]
        }
        let matchedGroup = findImportVarGroupByName(groupListArr[i].TagObjectList, groupName)
        if (matchedGroup) {
          return matchedGroup
        }
      }
      return null
    }
    function getImportVarGroupNode (tagGroupPath) {
      if (tagGroupPath == "变量" || tagGroupPath == "root") return null
      let targetGroup = tagGroupNameMap.get(tagGroupPath)
      if (targetGroup) {
        return targetGroup
      }
      return findImportVarGroupByName(objTagGroupInfo.TagGroupList, tagGroupPath)
    }
    function removeImportVarFromGroupTree (groupListArr, tagID) {
      if (!Array.isArray(groupListArr)) return false
      let isRemoved = false
      for (let i = groupListArr.length - 1; i >= 0; i--) {
        if (groupListArr[i].TagID != undefined && String(groupListArr[i].TagID) == String(tagID)) {
          groupListArr.splice(i, 1)
          isRemoved = true
          continue
        }
        if (groupListArr[i].TagObjectList && groupListArr[i].TagObjectList.length != 0) {
          let childRemoved = removeImportVarFromGroupTree(groupListArr[i].TagObjectList, tagID)
          isRemoved = isRemoved || childRemoved
        }
      }
      return isRemoved
    }
    function addImportVarToGroup (targetGroup, tagID, tagName) {
      if (!targetGroup) return false
      if (!Array.isArray(targetGroup.TagObjectList)) {
        targetGroup.TagObjectList = []
      }
      for (let i = 0; i < targetGroup.TagObjectList.length; i++) {
        if (targetGroup.TagObjectList[i].TagID != undefined && String(targetGroup.TagObjectList[i].TagID) == String(tagID)) {
          targetGroup.TagObjectList[i].TagName = tagName
          return true
        }
      }
      targetGroup.TagObjectList.push({
        TagID: tagID,
        TagName: tagName
      })
      return true
    }
    // end
    //生成新的变量ID
    let nVarID1 = MakeVarID(strProjectName, strProjectID, projectPath)
    let nVarID2 = MakeVarID1(strProjectName, strProjectID, projectPath)
    let nVarID3 = MakeVarID2(strProjectName, strProjectID, projectPath)
    let nVarID = Math.max(nVarID1, nVarID2, nVarID3)

    //获取当前工程是属于哪个平台
    let strProInfoPath = pathFunc.join(projectPath, "ProjectPorpertyInfo.json")
    let objProInfo = ReadJson(strProInfoPath)
    if (objProInfo.Error) {
      res.send(strProInfoPath + "文件格式错误")
      return
    }
    //导入文件应有的字段 //md by tingting.wang productType == PRODUCTKF36 导入变量时去掉deviceID的限制（for成都云图需求）
    if (global.productType == PRODUCTKF36) {
      var arrRequiredField = ["TagID", "TagName", "Description", "TagGroup", "DeviceName", "RegName", "RegAddress", "RegDataType", "TagDataType", "AccessType", "CollectTimeInterval",
        "DataConvertType", "MaxRawValue", "MinRawValue", "MaxValue", "MinValue", "DataCleaningType", "DataCleaningUpperLimit", "DataCleaningLowerLimit", "ChangeRate", "DeadbandRate", "TagType",
      /*"DeviceID",*/"ChannelDriver", "DriverName", "DeviceSeries", "SystemPlatform", "NonLinearName", "DataConvertDeviation", "DataConvertCoefficient", "RedunDeviceID", 'StorEnable',
        'StorMode', 'StorCycle', "UaTrans", "DaTrans", "MqTrans", "MqInter", "SpaceTimeName", "SpaceTimeTagName", "TagNanoId"]//add by xin.wang ,"NonLinearName" 2020-06-10
    } else {
      var arrRequiredField = ["TagName", "Description", "TagGroup", "DeviceName", "RegName", "RegAddress", "TagDataType", "RegDataType", "AccessType", "CollectTimeInterval", "CollectControl",
        "Enable", "CollectOffect", "ForceWrite", "DataConvertType", "MaxRawValue", "MinRawValue", "MaxValue", "MinValue", "NonLinearName", "Unit", "DataFilterEnable", "DeadbandRate",
        "HisRecordMode", "HisInterval", "TagType", "DeviceID", "ChannelDriver", "ChannelName", "DeviceSeries", "DeviceSeriesType", "TagID", "TagExtID"]
    }
    //231219 添加导入变量的id数组
    let tagIdArray = []
    // 覆盖模式下构建 tagName→index 索引，用于快速查找工程中已存在的变量
    const existingTagMap = duplicateAction === 'overwrite' ? new Map(objVarData.TagList.map((t, i) => [t.TagName, i])) : null
    for (let i = 0; i < objReadFile.TagList.length; i++) {
      //检查字段是否齐全
      let j = 0
      for (j = 0; j < arrRequiredField.length; j++) {
        if (objReadFile.TagList[i][arrRequiredField[j]] == undefined) {
          if (['StorEnable', 'RedunDeviceID', "UaTrans", "DaTrans", "MqTrans", "MqInter"].indexOf(arrRequiredField[j]) != -1) {
            objReadFile.TagList[i][arrRequiredField[j]] = ("MqTrans" == arrRequiredField[j] ? 1 : 0)
          } else {
            strErrOut += objReadFile.TagList[i].TagName + "字段不全，缺少" + arrRequiredField[j] + "; "
            break
          }
        }
        //将某些字段的字符串转化为数字
        else if (arrRequiredField[j] != "TagName" && arrRequiredField[j] != "Description" && arrRequiredField[j] != "DeviceName" &&
          arrRequiredField[j] != "TagGroup" && arrRequiredField[j] != "RegName" && arrRequiredField[j] != "RegAddress" &&
          arrRequiredField[j] != "NonLinearName" && arrRequiredField[j] != "ChannelDriver" && arrRequiredField[j] != "DriverName" && arrRequiredField[j] != "ChannelName" &&
          arrRequiredField[j] != "DeviceSeries" && arrRequiredField[j] != "Unit" && arrRequiredField[j] != "SystemPlatform" && arrRequiredField[j] != "SpaceTimeName" &&
          arrRequiredField[j] != "SpaceTimeTagName" && arrRequiredField[j] != "TagNanoId" &&
          typeof objReadFile.TagList[i][arrRequiredField[j]] == "string") {
          objReadFile.TagList[i][arrRequiredField[j]] = parseFloat(objReadFile.TagList[i][arrRequiredField[j]])
        }
        else if (typeof objReadFile.TagList[i][arrRequiredField[j]] == "string" && objReadFile.TagList[i][arrRequiredField[j]].charAt(0) == "\"" && objReadFile.TagList[i][arrRequiredField[j]].charAt(objReadFile.TagList[i][arrRequiredField[j]].length - 1) == "\"") {
          objReadFile.TagList[i][arrRequiredField[j]] = objReadFile.TagList[i][arrRequiredField[j]].substring(1, objReadFile.TagList[i][arrRequiredField[j]].length - 1)
        }
      }
      if (j < arrRequiredField.length && req.query.Type == "csv") {
        break
      }
      //名称非法字符校验
      if (/[^\w\u4e00-\u9fa5]+/g.test(objReadFile.TagList[i].TagName)) {
        strErrOut += " 第" + Number(i + 1) + "个变量名称含有非法字符; "
        continue
      }
      //add by tingting.wang 导入变量时增加特殊字符校验 与windowsIO保持一致
      const invalidCharsRegex = /[,::+*\/%&!~|^<>={\[\]().'"\\?`]/
      if (invalidCharsRegex.test(objReadFile.TagList[i].TagName)) {
        strErrOut += " 第" + Number(i + 1) + "个变量名称含有非法字符; "
        continue
      }
      //add end by tingting.wang
      //非线性表是否存在校验//add by xin.wang 2020-06-10
      if (objReadFile.TagList[i].NonLinearName != "" && !objNonlinearInfo.NonlinearTableList.find(function (value) {
        return (value.TableName == objReadFile.TagList[i].NonLinearName && objReadFile.TagList[i].NonLinearName != undefined)
      })) {
        strErrOut += " 第" + Number(i + 1) + "个变量非线性表不存在; "
        continue
      }
      //字段校验//add by xin.wang 2020/06/10
      var proCheck = varCheckObj.varSingleCheck(objReadFile.TagList[i], req.query.SystemPlatform)
      if (proCheck.error) {
        strErrOut += " 第" + Number(i + 1) + "个变量" + proCheck.info + " "
        continue
      }
      //检查是否有重名 260413 gxx
      // 覆盖模式支持
      let tagName = objReadFile.TagList[i].TagName
      // 查找工程中是否存在同名变量，overwrite模式下为undefined表示不存在
      let existingIndex = existingTagMap ? existingTagMap.get(tagName) : undefined
      // overwrite模式下同名变量执行覆盖，否则报错跳过
      if (existingIndex !== undefined && duplicateAction !== 'overwrite') {
        strErrOut += tagName + "已经存在; "
        continue
        // overwrite模式下导入文件内重复时，后面的覆盖前面的；skip模式下报错
      } else if (dupTagNMSet.has(tagName) && duplicateAction !== 'overwrite') {
        strErrOut += tagName + "导入文件中重复; "
        continue
      } else if (dupTagNMSet.has(tagName) && duplicateAction === 'overwrite') {
        // 覆盖模式：同文件内重复时跳过前面的，用后面的覆盖
      }
      dupTagNMSet.add(tagName)
      //检查导入变量的所属设备和驱动是否存在
      let strDriverName = objReadFile.TagList[i].ChannelDriver//comment by xin.wang 同时校验Driver Name
      let strDeviceName = objReadFile.TagList[i].DeviceName
      let strDeviceSeries = objReadFile.TagList[i].DeviceSeries

      let objFIndDev = mapDevNmDriNmDeSer2DevObj[`${strDeviceName}_${strDriverName}_${strDeviceSeries}`]
      if (objFIndDev == undefined) {
        objFIndDev = objDevInfo.DeviceList.find(function (dev) {
          return (dev.DeviceName == strDeviceName && dev.DriverName == strDriverName && dev.DriverSeries == strDeviceSeries)//20240119
        })
        if (objFIndDev == undefined) {
          strErrOut += objReadFile.TagList[i].TagName + "的设备或驱动不存在\n"
          continue
        }
        mapDevNmDriNmDeSer2DevObj[`${strDeviceName}_${strDriverName}_${strDeviceSeries}`] = objFIndDev
      }
      //add by tingting.wang 给tag赋值deviceID
      objReadFile.TagList[i].DeviceID = objFIndDev.DeviceID
      //add end by tingting.wang 
      //检查驱动文件是否存在
      let strDriverXmlPath = ""
      let strDriverSoPath = ""
      if (global.productType == PRODUCTKF36) {
        strDriverSoPath = pathFunc.join(projectPath, "Driver/")
        // strDriverXmlPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/Driver/" + strDriverName + ".xml";
        strDriverXmlPath = "./Driver/" + objFIndDev.SystemPlatform + "/" + objFIndDev.OsType + "/" + objFIndDev.DeviceProvider + "/" + objFIndDev.DriverName + "/" + objFIndDev.DriverVersion + "/" + objFIndDev.DriverName + ".xml"//260413 gxx
      } else {
        strDriverSoPath = global.sdbPath + "/" + strProjectName + "/Driver/"
        strDriverXmlPath = global.sdbPath + "/" + strProjectName + "/Driver/" + strDriverName + ".xml"
      }

      if (objProInfo.OsType == "Windows") {
        strDriverSoPath = pathFunc.join(strDriverSoPath, strDriverName + ".dll")
      }
      else {
        if (objFIndDev.DriverVersion == "66.1.1.1" || objFIndDev.DriverVersion == undefined) {//260413 gxx
          strDriverSoPath += "lib" + strDriverName + ".so"
        } else {
          strDriverSoPath += "lib" + strDriverName + ".so." + objFIndDev.DriverVersion//260413 gxx
        }
      }

      // 同一驱动会被大量变量重复引用，这里只探测一次磁盘文件是否存在。
      const driverFileCacheKey = strDriverXmlPath + "|" + strDriverSoPath
      let driverFilesReady = driverFileExistsCache.get(driverFileCacheKey)
      if (driverFilesReady === undefined) {
        driverFilesReady = fs.existsSync(strDriverXmlPath) && fs.existsSync(strDriverSoPath)
        driverFileExistsCache.set(driverFileCacheKey, driverFilesReady)
      }
      if (!driverFilesReady) {
        strErrOut += objReadFile.TagList[i].TagName + "的驱动" + strDriverName + "文件不存在; "
        continue
      }
      //对该变量进行校验
      //KingConfigModule.getConfigModuleObject();
      //KingConfigModule.setXmlPath(strDriverXmlPath);
      KingConfigModuleJs.setXmlPath(strDriverXmlPath)
      //第一个参数
      var objDbItem = {}
      objDbItem.nAccessMode = objReadFile.TagList[i].AccessType
      //objDbItem.nDataType = objReadFile.TagList[i].RegDataType; //250221
      objDbItem.nDataType = objReadFile.TagList[i].RegDataType
      objDbItem.reserved = new Array()
      objDbItem.reserved[0] = 0
      objDbItem.reserved[1] = 0
      //第二个参数（传出参数）
      var objPlcVar = {
        "wVarID": { "value": 0 },     	    // variable ID
        "wVarType": { "value": 0 },           // variable type
        "szVarName": { "value": "" }, 	// variable name
        "nDeviceIndex": { "value": 0 },	    // PLC index
        "nUnitNo": { "value": 0 },		    // PLC address
        "pDevAddr": { "nDevAddr": 0, "sDevAddr": "" },//device address name}	    // pointer to device address structure
        "pszRegName": { "value": "" },	    // register name
        "nRegType": { "value": 0 },  	    // register type
        "nSubType": { "value": 0 },		    // sub-type
        "nSubType1": { "value": 0 },
        "nSubType2": { "value": 0 },
        "nNo": { "value": 0 },          	    // address No.
        "nDataType": { "value": 0 },    	    // data type
        "nAccessMode": { "value": 0 },      	// I/O Mode.
        "pComThread": { "value": "" },   // thread
        "nTimerCount": { "value": 0 }, 	    // Counter
        "nFrequency": { "value": 0 },  	    // Sampling frequency
        "maxRaw": { "value": "" },		    // Maximum raw value
        "minRaw": { "value": "" },		    // minimum raw value
        "bConvertion": { "value": 0 },	        // convert type
        "isBad": { "value": 0 },		        // bad device
        "isUnvalid": { "value": 0 }	        // invalid variable
      }
      //第三个参数：错误码
      var nErr = {}
      objDbItem.szRegister = objReadFile.TagList[i].RegAddress
      objDbItem.szDevName = objReadFile.TagList[i].DeviceName
      if (objDbItem.szRegister.indexOf(objReadFile.TagList[i].RegName) != 0) {//如果csv中寄存器名称是0的话，那么可能excel自动将RegAddress识别为数字并去掉最前边的0，所以这里会判断一下并拼接
        objDbItem.szRegister = objReadFile.TagList[i].RegName + objDbItem.szRegister
        objReadFile.TagList[i].RegAddress = objDbItem.szRegister
      }
      //20240118 适配驱动系列带()
      let nds = ""
      for (let i = 0; i < strDeviceSeries.length; i++) {
        let e = strDeviceSeries[i]
        if (e == "(") {
          nds += "LB"
        } else if (e == ")") {
          nds += "RB"
        } else {
          nds += e
        }
      }
      //20240228 添加isConfig 判断
      if (objFIndDev.isConfig === false) {//true或者没有这个参数的都认为是要校验的
        let nRegType = await KingConfigModuleJs.getRegType(objReadFile.TagList[i].DeviceSeries, objReadFile.TagList[i].RegName)
        if (nRegType < 0) {
          res.send("该驱动xml文件格式或内容有错误，错误码:" + nRegType)
          return
        }
        objReadFile.TagList[i].TagID = nVarID + i
        objReadFile.TagList[i].VarPlcInfo = objReadFile.TagList[i].RegAddress + ";0;0;" + objReadFile.TagList[i].RegName + ";" + nRegType
      } else {
        //20250902 适配校验模块 js化
        //let nRes = KingConfigModule.getVarInfo(objDbItem, objPlcVar, nErr, nds, strDriverName);
        //KingConfigModule.releaseConfigModuleObject();
        let errcode = { "value": 0 }
        let ret = KingConfigModule.LoadXmlFile(errcode, strDriverXmlPath, strDriverName, nds)
        if (!ret) {
          res.send("加载XML文件失败，错误码：" + errcode.value + " " + objConfigErrMsg[errcode.value])
          return
        }
        let count = { "value": 0 }
        ret = KingConfigModule.getRegisters(errcode, [], count, strDriverName, nds)
        if (!ret) {
          const initErrMsg = objConfigErrMsg[errcode.value] || ("未知错误码:" + errcode.value)
          strErrOut += objReadFile.TagList[i].TagName + "校验失败，错误码：" + initErrMsg + "; "
          continue
        }
        let nRes = KingConfigModule.checkUserVar(errcode, objDbItem, objPlcVar, strDriverName, nds)
        //!20250902        
        //20240527 adapte driver: CodeSys_Link
        nRes = objReadFile.TagList[i].ChannelDriver == "CodeSys_Link" ? 1 : nRes
        if (nRes == 0) {
          //校验失败
          const errMsg = objConfigErrMsg[errcode.value] || ("未知错误码:" + errcode.value)
          strErrOut += objReadFile.TagList[i].TagName + "校验失败，错误码：" + errMsg + "; "
          continue
        }
      }


      //校验模块中会进行寄存器名称和变量类型校验，不需要再重复校验了
      //寄存器名称校验 add by xin.wang 2020-06-10
      /* let strXmlPath = "";
      if (global.productType == PRODUCTKF36) {
        strXmlPath = global.sdbPath + "/" + strProjectID + "/" + strProjectVersion + "/project/Driver/" + strDriverName + ".xml";
      } else {
        strXmlPath = global.sdbPath + "/" + strProjectName + "/Driver/" + strDriverName + ".xml";
      }
      let buf = fs.readFileSync(strXmlPath, "utf-8");
      var regNameCheck = varCheckObj.getRegName(buf, strDriverName);
      if(regNameCheck.error){
        strErrOut += " 第" + Number(i + 1) + "个变量" + regNameCheck.info + " ";
        continue;
      }else if(regNameCheck.info.find(function(value){
        return value == objReadFile.TagList[i].RegName;
      }) == undefined){
        strErrOut += " 第" + Number(i + 1) + "个变量寄存器名称非法 ";
        continue;
      }

      //校验数据类型
      if (!varCheckObj.checkDataType(objReadFile.TagList[i].TagDataType)) {
        strErrOut += " 第" + Number(i + 1) + "个变量变量类型非法 ";
        continue;
      } */

      objReadFile.TagList[i].TagID = nVarID + i
      objPlcVar.nNo = objReadFile.TagList[i].ChannelDriver == "CodeSys_Link" ?
        objReadFile.TagList[i].RegAddress.substr(objReadFile.TagList[i].RegAddress.indexOf('.') + 1) :
        objPlcVar.nNo.value
      objReadFile.TagList[i].VarPlcInfo = objPlcVar.nNo + ";" + objPlcVar.nSubType1 + ";" + objPlcVar.nSubType2 + ";" + objReadFile.TagList[i].RegName + ";" + objPlcVar.nRegType.value
      // overwrite模式下覆盖同名变量，保留原TagID
      // modified by  jinlong.feng at 0727 变量导入覆盖组信息同步修改
      let isOverwriteTag = false
      // end
      if (duplicateAction === 'overwrite' && existingIndex !== undefined) {
        // 保存原TagID和原TagGroup
        let originalTagID = objVarData.TagList[existingIndex].TagID
        let originalTagGroup = objVarData.TagList[existingIndex].TagGroup
        // 用导入数据覆盖，TagID保持不变
        objVarData.TagList[existingIndex] = objReadFile.TagList[i]
        objVarData.TagList[existingIndex].TagID = originalTagID
        // modified by  jinlong.feng at 0727 变量导入覆盖组信息同步修改
        objReadFile.TagList[i].TagID = originalTagID
        isOverwriteTag = true
        // end
        // 标记变量用于后续TagGroupInfo处理
        objReadFile.TagList[i]._originalTagGroup = originalTagGroup
        objReadFile.TagList[i]._isOverwrite = true
        tagIdArray.push(originalTagID)
      }
      //objReadFile.TagList[i].TagGroup = req.query.TagGroup; //add by tingting.wang 使用导入文件中的变量组信息 而不是请求中的变量组
      //add by tingting.wang 导入变量组时 需要根据传入的变量组路径 判断变量组是否存在 如果不存在 新建变量组
      let checkGroupFlag = "OK"
      if (objReadFile.TagList[i].TagGroup !== 'root') {
        // CSV 中的组路径格式为 a.b.c，按层级拆分后逐层查找或补建。
        const groupNames = objReadFile.TagList[i].TagGroup.split('.').filter(segment => segment.length > 0)
        // modified by  jinlong.feng at 0724 导入变量组层级限制修改
        if (groupNames.length > 8) {
        // end
          checkGroupFlag = false
        } else {
          // currentChildren 始终指向“当前正在处理的这一层子组数组”。
          // 每进入下一段路径，就把 currentChildren 切换到命中的子组 TagObjectList，
          // 所以这个循环本质上是在顺着 a -> b -> c 这条路径一步步向下走。
          // 如果某一段不存在，就在当前位置立即补建一个新组，再继续向下处理后续段。
          let currentChildren = objTagGroupInfo.TagGroupList
          for (let groupIndex = 0; groupIndex < groupNames.length; groupIndex++) {
            const groupName = groupNames[groupIndex]
            const childIndexMap = getChildGroupIndex(currentChildren)
            let foundChild = childIndexMap.get(groupName) || null
            if (!foundChild) {
              // modified by  jinlong.feng at 0724 变量组不允许重名修改
              if (hasVarGroupNameInTree(objTagGroupInfo.TagGroupList, groupName)) {
                checkGroupFlag = "变量组\"" + groupName + "\"已存在"
                break
              }
              // end
              // 新组一旦创建，需要同时写入两个位置：
              // 1. push 到树结构里，保证最终写盘后的 VarGroupInfo.json 正确。
              // 2. set 到本层索引里，保证同一批导入后续命中同一路径时可立即复用。
              foundChild = {
                TagGroupID: allocateTagGroupID(),
                TagGroupName: groupName,
                TagObjectList: []
              }
              currentChildren.push(foundChild)
              childIndexMap.set(groupName, foundChild)
            }
            const currentPath = groupNames.slice(0, groupIndex + 1).join('.')
            // tagGroupNameMap 维护的是“完整路径 -> 组对象”的映射，
            // 不是单纯的“组名 -> 组对象”。这样像 A.X 和 B.X 这种末级同名组不会串到一起。
            tagGroupNameMap.set(currentPath, foundChild)
            if (!Array.isArray(foundChild.TagObjectList)) {
              foundChild.TagObjectList = []
            }
            // 提前为下一层 children 建好索引，后续如果还有更深层路径可直接复用。
            getChildGroupIndex(foundChild.TagObjectList)
            currentChildren = foundChild.TagObjectList
          }
        }
      }
      // modified by  jinlong.feng at 0724 变量组不允许重名修改
      if (checkGroupFlag !== "OK") {
        if (checkGroupFlag === false) {
          strErrOut += "导入变量路径超出限制"
        } else {
          strErrOut += checkGroupFlag
        }
        break
      }
      // end
      //add end by tingting.wang
      // overwrite模式下处理TagGroupInfo更新
      if (objReadFile.TagList[i]._isOverwrite) {
        let originalTagGroup = objReadFile.TagList[i]._originalTagGroup
        let newTagGroup = objReadFile.TagList[i].TagGroup
        // 如果TagGroup发生变化，需要从原组中移除该变量
        if (originalTagGroup && originalTagGroup !== 'root' && originalTagGroup !== '变量' && originalTagGroup !== newTagGroup) {
          // modified by  jinlong.feng at 0727 变量导入覆盖组信息同步修改
          removeImportVarFromGroupTree(objTagGroupInfo.TagGroupList, objReadFile.TagList[i].TagID)
          // end
        }
        delete objReadFile.TagList[i]._isOverwrite
        delete objReadFile.TagList[i]._originalTagGroup
      }
      if (objReadFile.TagList[i].TagGroup != "变量" && objReadFile.TagList[i].TagGroup != "root") {
        // 这里仍然使用完整组路径取索引，确保 A.X 与 B.X 这类同名末级组不会混淆。
        // modified by  jinlong.feng at 0727 变量导入覆盖组信息同步修改
        let targetGroup = getImportVarGroupNode(objReadFile.TagList[i].TagGroup)
        // end
        let resAdd = "Not found"
        if (targetGroup) {
          // modified by  jinlong.feng at 0727 变量导入覆盖组信息同步修改
          resAdd = addImportVarToGroup(targetGroup, objReadFile.TagList[i].TagID, objReadFile.TagList[i].TagName) ? "OK" : "Not found"
          // end
        }
        if (resAdd != "OK") {
          strErrOut += "该变量组(" + req.query.TagGroup + ")未找到; "
          continue
        }
      }

      // modified by  jinlong.feng at 0727 变量导入覆盖组信息同步修改
      if (isOverwriteTag) {
        continue
      }
      // end
      objVarData.TagList.push(objReadFile.TagList[i])
      tagIdArray.push(objReadFile.TagList[i].TagID)
    }

    // modified by  jinlong.feng at 0727 变量导入覆盖组信息同步修改
    for (let syncIndex = 0; syncIndex < tagIdArray.length; syncIndex++) {
      let syncTagID = tagIdArray[syncIndex]
      let syncTagInfo = objVarData.TagList.find(function (tagInfo) {
        return tagInfo.TagID != undefined && String(tagInfo.TagID) == String(syncTagID)
      })
      if (!syncTagInfo) {
        continue
      }
      removeImportVarFromGroupTree(objTagGroupInfo.TagGroupList, syncTagInfo.TagID)
      if (syncTagInfo.TagGroup != "变量" && syncTagInfo.TagGroup != "root") {
        let syncTargetGroup = getImportVarGroupNode(syncTagInfo.TagGroup)
        if (syncTargetGroup) {
          addImportVarToGroup(syncTargetGroup, syncTagInfo.TagID, syncTagInfo.TagName)
        }
      }
    }
    // end

    //写入json文件
    let resWrite = WriteJson(strProVarPath, objVarData)
    //delFileAndDir(writeDir);
    if (resWrite != "OK") {
      VarLogManagerObj.errorLog(VarManagerName, resWrite)
      res.send(resWrite)
      return
    }

    resWrite = WriteJson(strVarGroupPath, objTagGroupInfo)
    if (resWrite != "OK") {
      res.send(resWrite)
    }
    else if (strErrOut != "") {
      VarLogManagerObj.errorLog(VarManagerName, strErrOut)
      res.send({ "code": strErrOut, "ids": tagIdArray })
    }
    else {
      VarLogManagerObj.traceLog(VarManagerName, "Async Leave post ImportCollectTag")
      // res.send("OK");
      res.send({ "code": "OK", "ids": tagIdArray })
    }
    var nEndTime = new Date().getTime()
    console.log("导入过程花费时间" + (nEndTime - nStartTime) / 1000 + "s")

  })
  VarLogManagerObj.traceLog(VarManagerName, "Leave post ImportCollectTag")
})

//当导入或新建时获取进度
var nScheduleCount = 0
router.post('/getTagSchedule', function (req, res) {
  nScheduleCount++
  if (fs.existsSync("temp.txt")) {
    fs.readFile("temp.txt", 'utf-8', function (err, data) {
      if (err) {
        res.send(err.message)
        return
      }
      res.send(data)
    })
  } else {
    setTimeout(() => {
      if (fs.existsSync("temp.txt")) {
        fs.readFile("temp.txt", 'utf-8', function (err, data) {
          if (err) {
            res.send(err.message)
            return
          }
          res.send(data)
        })
      } else {
        res.send("100")
      }
    }, 500)
  }
})

//根据变量前缀和字段名称（成员名称）快速匹配
router.post('/quickMatch', function (req, res) {
  let strProjectID = req.query.ProjectID
  let strProjectVersion = req.query.ProjectVersion
  let strProVarPath = pubInter.joinPath(strProjectID, strProjectVersion, "") + "/VarInfo.json"
  let objReadJson = pubInter.readJson(strProVarPath)
  var objOut = {
    Error: false,
    ErrorDesc: "",
    data: []
  }
  if (objReadJson.Error) {
    res.send(objReadJson)
    return
  }

  //获取对象属性
  var arrObjectInfo = req.body.ObjectInfo
  var objObjectInfo = {}
  for (let i = 0; i < arrObjectInfo.length; i++) {
    if (arrObjectInfo[i].group == "成员属性") {
      if (objObjectInfo.FieldList == undefined) {
        objObjectInfo.FieldList = []
      }
      objObjectInfo.FieldList.push(arrObjectInfo[i])
    } else {
      objObjectInfo[arrObjectInfo[i].field] = arrObjectInfo[i].value
    }
  }
  let arrFieldList = objObjectInfo.FieldList//获取字段列表
  if (arrFieldList == undefined) {
    objOut.Error = true
    objOut.ErrorDesc = "对象属性缺失字段数据"
    res.send(objOut)
    return
  }

  var strRelationObject = ""
  var strPropertyName = ""
  if (objObjectInfo.RelationType == 0) {
    strRelationObject = "RelatetionDevice"
    strPropertyName = "DeviceName"
  } else {
    strRelationObject = "RelatetionTagGroup"
    strPropertyName = "TagGroup"
  }
  if (objObjectInfo[strRelationObject] == undefined || objObjectInfo[strRelationObject] == "") {
    objOut.Error = true
    objOut.ErrorDesc = "缺少" + strRelationObject + "参数"
    res.send(objOut)
    return
  }
  //前缀名称
  var strPrefixName = ""
  if (objObjectInfo.PrefixName && objObjectInfo.PrefixName != "") {
    strPrefixName = objObjectInfo.PrefixName
  } else {
    strPrefixName = objObjectInfo.ObjectName
  }

  var arrVarList = objReadJson.data.TagList//变量列表
  for (let i = 0; i < arrObjectInfo.length; i++) {
    if (arrObjectInfo[i].group == "成员属性") {
      for (let j = 0; j < arrVarList.length; j++) {
        let strTagName = arrVarList[j].TagName
        if (strTagName.indexOf(strPrefixName + "_" + arrObjectInfo[i].field) != -1 && arrVarList[j][strPropertyName] == objObjectInfo[strRelationObject]) {
          arrObjectInfo[i].value = strTagName
          break
        }
      }
    }
  }
  objOut.data = arrObjectInfo
  res.send(objOut)
})

module.exports = router
