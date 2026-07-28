var fs = require('fs');
var path = require('path');
var LogManager = require('./LogInterface');//日志接口
var ObjectCheckInterfaceObj = new LogManager();
var ObjectCheckInterfaceName = "ObjectCheckInterface";
var publicClass = require('./PublicInterface');//公用函数接口
var pubInter = new publicClass();
var xml2js = require("xml2js");

function ObjectCheckInterface() {}

/**
 * @brief 规则函数对象 
 * note  静态对象
 */
ObjectCheckInterface.prototype.allRules =  {
	numLetterCharacter:{
		validator:function(value,param){
			var result = value.search(/^$|^[\w\u4e00-\u9fa5]+$/);
			return (result != -1);
        },
        functionString:`
            var result = value.search(/^$|^[\\w\\u4e00-\\u9fa5]+$/);
			return (result != -1);
        `,
		message:'数字、字母、汉字与下划线之间的组合'
	},
	integer:{
		validator:function(value,param){
			return /^[0-9]\d*$/.test(value);
        },
        functionString:`
            return /^[0-9]\\d*$/.test(value);
        `,
		message:'整数'
	},
	numberAndPlotEdition:{
		validator:function(value,param){
			return /^\d+(\.\d+)*$/.test(value);
        },
        functionString:`
        return /^\\d+(\\.\\d+)*$/.test(value);
        `,
		message:'数字和点组成'
	},
	dataRange:{
		validator:function(value,param){
			if(param[2]!=0){
				return (value >= param[0]) && (value <= param[1]);
			}else{
				return ((value >= param[0]) && (value <= param[1])) || ( value == param[2] );
			}
        },
        functionString:`
            if(param[2]!=0){
                return (value >= param[0]) && (value <= param[1]);
            }else{
                return ((value >= param[0]) && (value <= param[1])) || ( value == param[2] );
            }
        `,
		message:'需要由{0}到{1}之间的数字组成'
    },
    length:{
		validator:function(value,param){
			return (value.length >= param[0]) && (value.length <= param[1]);
        },
        functionString:`
            return (value.length >= param[0]) && (value.length <= param[1]);
        `,
		message:'需要由{0}到{1}个字符组成'
    },
    enumeration:{
		validator:function(value,param = [0,1]){
			if(param.find(function(val){
                return value == val;
            })!==undefined){
                return true;
            }else{
                return false;
            }
        },
        functionString:`
            if(param.find(function(val){
                return value == val;
            })!==undefined){
                return true;
            }else{
                return false;
            }
        `,
		message:'仅支持{n}'
	},
	floatNum:{
		validator:function(value,param){
			return /^-?\d+(\.\d+)?$/.test(value);
        },
        functionString:`
        return /^-?\\d+(\\.\\d+)?$/.test(value);
        `,
		message:'请输入有效整数或浮点数'
    },
    required:{
        validator:function(value,param){
			return value != "";
        },
        functionString:`
            return value != "";
        `,
		message:'此项为必备项'
    }
}

/**
 * @brief 设备校验规则
 * @note  静态对象
 */
ObjectCheckInterface.prototype.m_ODevCheckRules =  {
    DeviceName: [
        {
            validator:function(value,param){
                var result = value.search(/^[\w\u4e00-\u9fa5]+$/);
                return (result != -1);
            },
            message:'数字、字母、汉字与下划线之间的组合'
        },
        {
            validator:function(value,param = [1,128]){
                return (value.length >= param[0]) && (value.length <= param[1]);
            },
            message:'需要由1到64个字符组成'
        }
    ],
    Description: [
        {
            validator:function(value,param = [1,128]){
                return (value.length >= param[0]) && (value.length <= param[1]);
            },
            message:'需要由1到128个字符组成'
        }
    ],
    Active: [
        {
            validator:function(value,param = [0,1]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持0,1'
        }
    ],
    Timeout: [
        {
            validator:function(value,param = [0, 30000, 1]){
                if(param[2]!=0){
                    return (value >= param[0]) && (value <= param[1]);
                }else{
                    return ((value >= param[0]) && (value <= param[1])) || ( value == param[2] );
                }
            },
            message:'需要由0到30000之间的数字组成'
        }
    ],
    DeviceCollectTime: [
        {
            validator:function(value,param = [100, 86400000, 1]){
                if(param[2]!=0){
                    return (value >= param[0]) && (value <= param[1]);
                }else{
                    return ((value >= param[0]) && (value <= param[1])) || ( value == param[2] );
                }
            },
            message:'需要由100到86400000之间的数字组成'
        }
    ],
    ReconnectInterval: [
        {
            validator:function(value,param = [5000, 86400000, 0]){
                if(param[2]!=0){
                    return (value >= param[0]) && (value <= param[1]);
                }else{
                    return ((value >= param[0]) && (value <= param[1])) || ( value == param[2] );
                }
            },
            message:'需要由5000到86400000之间的数字组成'
        }
    ],
    MaxReconncetInterval: [
        {
            validator:function(value,param = [5000, 604800000, 1]){
                if(param[2]!=0){
                    return (value >= param[0]) && (value <= param[1]);
                }else{
                    return ((value >= param[0]) && (value <= param[1])) || ( value == param[2] );
                }
            },
            message:'需要由5000到604800000之间的数字组成'
        }
    ],
    DevAddress: [],
    DriverName: [],
    LinkType: [
        {
            validator:function(value,param = [0, 1, 2]){
                if(param.find(function(val){
                    return value === val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持0,1,2'
        }
    ],
    SerialName: [],
    SerialBaudRate: [
        {
            validator:function(value,param = [1200, 2400, 4800, 9600, 19200, 28800, 38400, 76800, 115200]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持1200, 2400, 4800, 9600, 19200, 28800, 38400, 76800, 115200'
        }
    ],
    SerialParity: [
        {
            validator:function(value,param = [0, 1, 2, 3, 4]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持0, 1, 2, 3, 4'
        }
    ],
    SerialDataBits: [
        {
            validator:function(value,param = [7, 8]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持7, 8'
        }
    ],
    SerialStopBits: [
        {
            validator:function(value,param = [1, 2]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持1, 2'
        }
    ],
    FrequencyControlMode: [
        {
            validator:function(value,param = [0, 1]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持0, 1'
        }
    ],
    FrequencySwitchCondition: [],
    DeviceID: [],
    DeviceGroup: [],
    DevNumber: 1,
    DeviceProvider: [],
    SystemPlatform: [],
    Company: [],
    DriverSeries: [],
    CLSID: []
}

/**
 * @brief 变量校验规则
 * @note  静态对象
 */
ObjectCheckInterface.prototype.m_OVarCheckRules =  {
    TagName: [
        {
            validator:function(value,param){
                var result = value.search(/^[\w\u4e00-\u9fa5]+$/);
                return (result != -1);
            },
            message:'数字、字母、汉字与下划线之间的组合'
        },
        {
            validator:function(value,param = [1,128]){
                return (value.length >= param[0]) && (value.length <= param[1]);
            },
            message:'需要由1到64个字符组成'
        }
    ],
    Description: [
        {
            validator:function(value,param = [0,128]){
                return (value.length >= param[0]) && (value.length <= param[1]);
            },
            message:'需要由0到128个字符组成'
        }
    ],
    TagType: [
        {
            validator:function(value,param = [2]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持2'
        }
    ],
    AccessType: [
        {
            validator:function(value,param = [0,1,2]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持0,1,2'
        }
    ],
    CollectTimeInterval: [
        {
            validator:function(value,param = [100, 108000000, 0]){
                if(param[2]!=0){
                    return (value >= param[0]) && (value <= param[1]);
                }else{
                    return ((value >= param[0]) && (value <= param[1])) || ( value == param[2] );
                }
            },
            message:'需要由100到108000000之间的数字组成'
        },
        {
            validator:function(value,param){
                return /^\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        }
    ],
    DataConvertType: [
        {
            validator:function(value,param = [0, 1, 2, 3, 4, 5]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持0, 1, 2, 3, 4, 5'
        }
    ],
    MaxRawValue: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        }
    ],
    MinRawValue: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        }
    ],
    MaxValue: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        }
    ],
    MinValue: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        }
    ],
    DataConvertCoefficient: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        }
    ],
    DataConvertDeviation: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        }
    ],
    DataCleaningType: [
        {
            validator:function(value,param = [0, 1, 2, 3, 4, 5, 6, 7, 8]){
                if(param.find(function(val){
                    return value == val;
                })!==undefined){
                    return true;
                }else{
                    return false;
                }
            },
            message:'仅支持0, 1, 2, 3, 4, 5, 6, 7, 8'
        }
    ],
    ValueRangeType: [],
    StorEnable: [
        {
            validator:function(value,param){
                return value in [0,1,'0','1'];
            },
            message:'请输入正确取值'
        }        
    ],
    UaTrans:[
        {
            validator:function(value,param){
                return value in [0,1,'0','1'];
            },
            message:'请输入正确取值:0,1'
        } 
    ],
    DaTrans:[
        {
            validator:function(value,param){
                return value in [0,1,'0','1'];
            },
            message:'请输入正确取值0,1'
        }
    ],
    MqTrans:[
        {
            validator:function(value,param){
                return value in [0,1,2,3,'0','1','2','3'];
            },
            message:'请输入正确取值0,1,2,3'
        }
    ],
    MqInter:[],
    DataCleaningUpperLimit: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        }
    ],
    DataCleaningLowerLimit: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        }
    ],
    ChangeRate: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        },
        {
            validator:function(value,param = [0, 100, 1]){
                if(param[2]!=0){
                    return (value >= param[0]) && (value <= param[1]);
                }else{
                    return ((value >= param[0]) && (value <= param[1])) || ( value == param[2] );
                }
            },
            message:'需要在0到100之间'
        }
    ],
    DeadbandRate: [
        {
            validator:function(value,param){
                return /^-?\d+(\.\d+)?$/.test(value);
            },
            message:'请输入有效整数或浮点数'
        },
        {
            validator:function(value,param = [0, 100, 1]){
                if(param[2]!=0){
                    return (value >= param[0]) && (value <= param[1]);
                }else{
                    return ((value >= param[0]) && (value <= param[1])) || ( value == param[2] );
                }
            },
            message:'需要在0到100之间'
        }
    ],
    StorMode:[
        {
            validator:function(value,param){
                return value in [0,1,2,'0','1','2'];
            },
            message:'请输入正确取值'
        }
    ],//2023-4-20 by xiaoxu.gao
    StorCycle:[],
    NonLinearName: [],//
    DeviceName: [],//外部校验
    DeviceID: [],//外部校验
    TagID: [],
    TagExtID: [],
    TagGroup: [],
    RegName: [],
    RegAddress: [],
    TagDataType: [],
    RegDataType: [],
    ChannelDriver: [],
    Company: [],
    DeviceSeries: [],
    DriverName: [],
    SystemPlatform: [],
    VarPlcInfo: [],//外部校验
    CollectControl: [],//外部校验
    Enable: [],//外部校验
    ForceWrite: [],//外部校验
    Unit: [],//外部校验
    DataFilterEnable: [],//外部校验
    CollectOffect: [],//外部校验
    TimeZoneBias: [],//外部校验
    ChannelName: [],//外部校验
    DeviceSeriesType: [],//外部校验
    TimeAdjustment: [],//外部校验
    HisRecordMode: [],//外部校验
    HisInterval: [],//外部校验
    RedunDeviceID:[],
    StepSize:[],
    NameStepSize:[],
    Number:[],
    SpaceTimeName:[],
    SpaceTimeTagName:[],
    TagNanoId:[]//260413 gxx
}

/**
 * @brief 设置设备校验规则
 * @param rulesInfoObj {object} 设备规则设定对象，读取配置文件获取
 * @note  
 * @return 
 */
ObjectCheckInterface.prototype.setDeviceRules = function (rulesInfoObj) {
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Enter function setDeviceRules");
    var returnInfo = new Object();
    returnInfo.error = false;
    returnInfo.info = "";
    for(var param in rulesInfoObj){//遍历所有属性
        for(var i = 0; i < rulesInfoObj[param].length; i++){//遍历每个属性的校验规则
            if(this.allRules[rulesInfoObj[param][i].validator]){
                rulesInfoObj[param][i].validator = new Function('value',rulesInfoObj[param][i].secondParam,this.allRules[rulesInfoObj[param][i].validator].functionString);
            }else{
                returnInfo.error = true;
                returnInfo.info = "不存在校验规则：" + rulesInfoObj[param][i].validator ;
                ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "leave function setDeviceRules");
                return returnInfo;
            }
        }
    }
    ObjectCheckInterface.prototype.m_ODevCheckRules = rulesInfoObj;
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "leave function setDeviceRules");
    return returnInfo;
}

/**
 * @brief 设置变量校验规则
 * @param rulesInfoObj {object} 变量规则设定对象，读取配置文件获取
 * @return 
 */
ObjectCheckInterface.prototype.setVarRules = function (rulesInfoObj) {
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Enter function setVarRules");
    var returnInfo = new Object();
    returnInfo.error = false;
    returnInfo.info = "";
    for(var param in rulesInfoObj){//遍历所有属性
        for(var i = 0; i < rulesInfoObj[param].length; i++){//遍历每个属性的校验规则
            if(this.allRules[rulesInfoObj[param][i].validator]){
                rulesInfoObj[param][i].validator = new Function('value',rulesInfoObj[param][i].secondParam,this.allRules[rulesInfoObj[param][i].validator].functionString);
            }else{
                returnInfo.error = true;
                returnInfo.info = "不存在校验规则：" + rulesInfoObj[param][i].validator ;
                ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function setVarRules");
                return returnInfo;
            }
        }
    }
    ObjectCheckInterface.prototype.m_OVarCheckRules = rulesInfoObj;
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function setVarRules");
    return returnInfo;
}


/**
 * @brief 变量字段校验
 * @param varInfoObj {object} 变量信息，变量文件json
 * @param SystemPlatform {string} 系统运行平台
 * @note  
 * @return 
 */
ObjectCheckInterface.prototype.varCheck = function (varInfoObj, SystemPlatform) {
    var returnInfo = new Object();
    returnInfo.error = false;
    returnInfo.info = "";
    if( Object.prototype.toString.call( varInfoObj.TagList ) != '[object Array]' ){
        returnInfo.error = true;
        returnInfo.info = "parameter is not array";
        return returnInfo;
    }
    for(var i = 0; i < varInfoObj.TagList.length; i++){
        if( !(varInfoObj.TagList[i].SystemPlatform != undefined && varInfoObj.TagList[i].SystemPlatform == SystemPlatform) ){
            returnInfo.info += "" + varInfoObj.TagList[i].TagName + " SystemPlatform unmatch";
            continue; 
        }
        for(var keyName in varInfoObj.TagList[i]){
            for(var j = 0; j < this.m_OVarCheckRules[keyName].length; j++){
                if( this.m_OVarCheckRules[keyName] != undefined && !this.m_OVarCheckRules[keyName][j].validator(varInfoObj.TagList[i][keyName]) ){
                    returnInfo.info += "" + varInfoObj.TagList[i].TagName + " " + keyName + " " + this.m_OVarCheckRules[keyName][j].message + "; ";
                }
            }
        }
    }
    if(returnInfo.info == ""){
        returnInfo.error = false;
    }else{
        returnInfo.error = true;
    }
    return returnInfo;
}

/**
 * @brief 单个变量字段校验
 * @param varInfoObj {object} 单个变量信息
 * @param SystemPlatform {string} 系统运行平台
 * @note  
 * @return 
 */
ObjectCheckInterface.prototype.varSingleCheck = function (varInfoObj, SystemPlatform) {
    var returnInfo = new Object();
    returnInfo.error = false;
    returnInfo.info = "";
 
    if( !(varInfoObj.SystemPlatform != undefined && varInfoObj.SystemPlatform == SystemPlatform) ){
        returnInfo.info += "" + varInfoObj.TagName + " SystemPlatform unmatch";
        returnInfo.error = true;
        return returnInfo;
    }
    for(var keyName in varInfoObj){
        if(this.m_OVarCheckRules[keyName] === undefined){
            if (keyName!="TagNanoId") {
                returnInfo.info += "变量属性：“" + keyName + "”不符合变量校验规则";    
            }
            
            continue;
        }
        for(var j = 0; j < this.m_OVarCheckRules[keyName].length; j++){
            if( this.m_OVarCheckRules[keyName] != undefined && !this.m_OVarCheckRules[keyName][j].validator( varInfoObj[keyName] ) ){
                returnInfo.info += "" + varInfoObj.TagName + " " + keyName + " " + this.m_OVarCheckRules[keyName][j].message + "; ";
            }
        }
    }
    
    if(returnInfo.info == ""){
        returnInfo.error = false;
    }else{
        returnInfo.error = true;
    }
    return returnInfo;
}


/**
 * @brief 设备字段校验
 * @param devInfoObj {object} 设备信息，设备文件json
 * @param SystemPlatform {string} 系统运行平台
 * @note  
 * @return 
 */
ObjectCheckInterface.prototype.devCheck = function (devInfoObj, SystemPlatform) {
    var returnInfo = new Object();
    returnInfo.error = false;
    returnInfo.info = "";
    if( Object.prototype.toString.call( devInfoObj.DeviceList ) != '[object Array]' ){
        returnInfo.error = true;
        returnInfo.info = "parameter is not array";
        return returnInfo;
    }
    for(var i = 0; i < devInfoObj.DeviceList.length; i++){
        if( !(devInfoObj.DeviceList[i].SystemPlatform != undefined && devInfoObj.DeviceList[i].SystemPlatform == SystemPlatform) ){
            returnInfo.info += "" + devInfoObj.DeviceList[i].DeviceName + " SystemPlatform unmatch";
            continue; 
        }
        for(var keyName in devInfoObj.DeviceList[i]){
            for(var j = 0; j < this.m_ODevCheckRules[keyName].length; j++){
                if( this.m_ODevCheckRules[keyName] != undefined && !this.m_ODevCheckRules[keyName][j].validator(devInfoObj.DeviceList[i][keyName]) ){
                    returnInfo.info += "" + devInfoObj.DeviceList[i].DeviceName + " " + keyName + " " + this.m_ODevCheckRules[keyName][j].message + "; ";
                }
            }
        }
    }
    if(returnInfo.info == ""){
        returnInfo.error = false;
    }else{
        returnInfo.error = true;
    }
    return returnInfo;
}

/**
 * @brief 驱动存在校验（组件库中）
 * @param DriverInfoObj {object} driverInfo.json 对象
 * @param singleDevInfo {object} SystemPlatform（系统平台）;DeviceProvider（设备厂商）;DriverName（驱动名称） 使用字段
 * @note  组件库中的驱动文件存在校验（xml，so，依赖文件）
 * @return 
 */
ObjectCheckInterface.prototype.libraryDriverCheck = function ( singleDevInfo) {
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Enter function libraryDriverCheck");
    var returnObj = new Object();
    returnObj.error = false;
    returnObj.info = ""
    if( singleDevInfo == undefined ||  typeof singleDevInfo  != "object" ){
        returnObj.error = true;
        returnObj.info = "驱动库文件对象或者设备信息参数错误";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function libraryDriverCheck 驱动库文件对象或者设备信息参数错误");
        return returnObj;
    }
    var relativePathXML =  global.drivePath + "/" + singleDevInfo.SystemPlatform + "/" +  singleDevInfo.DeviceProvider + "/" + singleDevInfo.DriverName + "/" + singleDevInfo.DriverName + ".xml";
    var relativePathSO =  global.drivePath + "/" + singleDevInfo.SystemPlatform + "/" +  singleDevInfo.DeviceProvider + "/" + singleDevInfo.DriverName + "/lib" + singleDevInfo.DriverName + ".so";
    if( singleDevInfo.SystemPlatform == "Windows"){
      relativePathSO =  global.drivePath + "/" + singleDevInfo.SystemPlatform + "/" +  singleDevInfo.DeviceProvider + "/" + singleDevInfo.DriverName + "/" + singleDevInfo.DriverName + ".dll";
    }
    var xmlPath = path.resolve(__dirname,relativePathXML);
    var soPath = path.resolve(__dirname,relativePathSO);
    var xmlPathCheck = fs.existsSync(xmlPath);
    var soPathCheck = fs.existsSync(soPath);
    if(!xmlPathCheck ){
        returnObj.error = true;
        returnObj.info = "未找到驱动xml文件，错误的驱动路径：" + xmlPath;
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function libraryDriverCheck " + xmlPath);
        return returnObj;
    }
    if(!soPathCheck ){
        returnObj.error = true;
        returnObj.info = "未找到驱动文件，错误的驱动路径：" + soPath;
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function libraryDriverCheck " + soPath);
        return returnObj;
    }
    var DriverInfoObj = JSON.parse(fs.readFileSync(xmlPath));//xml怎么能用json.parse呢？
    var depenfiles = this.checkDriverDepends(DriverInfoObj, singleDevInfo.SystemPlatform, singleDevInfo.DeviceProvider, singleDevInfo.DriverName);
    if(depenfiles.error){
        returnObj.error = true;
        returnObj.info = depenfiles.info;
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function libraryDriverCheck " + depenfiles.info);
        return returnObj;
    }
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function libraryDriverCheck ");
    return returnObj;
}

/**
 * @brief 校验依赖文件（组件库中）
 * @param DriverInfoObj {object} driverInfo.json 对象
 * @param SysPlatform {string} 系统平台
 * @param deviceProvider {string} 设备系列
 * @param driverName {string} 驱动名称
 * @note  有路径
 * @return 
 */
ObjectCheckInterface.prototype.checkDriverDepends = function (DriverInfoObj, SysPlatform, deviceProvider, driverName) {
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Enter function checkDriverDepends");
    var returnObj = new Object();
    returnObj.error = false;
    returnObj.info = ""
    if(DriverInfoObj == undefined ||driverName == undefined || SysPlatform  == undefined || deviceProvider == undefined ){
        returnObj.error = true;
        returnObj.info = "驱动库文件、驱动名称、运行系统或设备厂商参数未定义";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkDriverDepends");
        return returnObj;
    }
    let driverObj = DriverInfoObj;
    var depenfiles = "";
    for(var i = 0; i < driverObj.DriverList.length; i++){
        if(driverObj.DriverList[i].SysPlatform == SysPlatform && driverObj.DriverList[i].DriverName == driverName && driverObj.DriverList[i].DriverCompany == deviceProvider){
            depenfiles = driverObj.DriverList[i].DependFile;
        }
    }
    if(depenfiles != ""){
        var depenfilesArr = [];
        depenfilesArr = depenfiles.split('|');
        for(var i = 0; i < depenfilesArr.length; i++){
            var relativePathFile = global.drivePath + "/" + SysPlatform + "/" + deviceProvider + "/" + driverName + "/" + depenfilesArr[i];
            var FilePath = path.resolve(__dirname,relativePathFile);
            if(!fs.existsSync(FilePath)){
                returnObj.error = true;
                returnObj.info = "未找到驱动依赖文件：" + depenfilesArr[i];
                ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkDriverDepends");
                return returnObj;
            }
        }
        returnObj.error = false;
        returnObj.info = "依赖文件无缺失";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkDriverDepends");
        return returnObj;
    }else{
        returnObj.error = false;
        returnObj.info = "该驱动无所需依赖文件";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkDriverDepends");
        return returnObj;
    }
}

/**
 * @brief 驱动校验（工程文件中）
 * @param singleProjectInfo {object} ProjectID（工程ID）;ProjectVersion（工程版本）；SysPlatform（工程系统平台）;DriverName（驱动名称）；ProjectName(工程名称)；DeviceProvider（设备系列） 使用字段
 * @note  组件库中的驱动文件存在校验（xml，so，依赖文件）
 * @return 
 */
ObjectCheckInterface.prototype.projectDriverCheck = function (singleProjectInfo) {
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Enter function projectDriverCheck");
    var returnObj = new Object();
    returnObj.error = false;
    returnObj.info = ""
    if( singleProjectInfo == undefined ||  typeof singleProjectInfo  != "object" ){
        returnObj.error = true;
        returnObj.info = "工程信息参数错误";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function projectDriverCheck 工程信息参数错误");
        return returnObj;
    }
    let proPath = pubInter.joinPath(singleProjectInfo.ProjectID, singleProjectInfo.ProjectVersion, req.query.ProjectName);
    var relativePathXML =  proPath  +  "/Driver/" + singleProjectInfo.DriverName + ".xml";
    var relativePathSO =  proPath +  "/Driver/lib" + singleProjectInfo.DriverName + ".so";
    if( singleProjectInfo.SysPlatform == "Windows"){
      relativePathSO =  proPath  +  "/Driver/" + singleProjectInfo.DriverName + ".dll";
    }
    var xmlPath = path.resolve(__dirname,relativePathXML);
    var soPath = path.resolve(__dirname,relativePathSO);
    var xmlPathCheck = fs.existsSync(xmlPath);
    var soPathCheck = fs.existsSync(soPath);
    if(!xmlPathCheck ){
        returnObj.error = true;
        returnObj.info = "未找到驱动xml文件，错误的驱动路径：" + xmlPath;
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function libraryDriverCheck " + xmlPath);
        return returnObj;
    }
    if(!soPathCheck ){
        returnObj.error = true;
        returnObj.info = "未找到驱动文件，错误的驱动路径：" + soPath;
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function libraryDriverCheck " + soPath);
        return returnObj;
    }
    var DriverInfoObj = JSON.parse(fs.readFileSync(xmlPath));
    var depenfiles = this.checkProjectDriverDepends(DriverInfoObj, singleProjectInfo);
    if(depenfiles.error){
        returnObj.error = true;
        returnObj.info = depenfiles.info;
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function libraryDriverCheck " + depenfiles.info);
        return returnObj;
    }
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function libraryDriverCheck ");
    return returnObj;
}

/**
 * @brief 校验依赖文件（工程文件中）
 * @param DriverInfoObj {object} driverInfo.json 对象
 * @param SysPlatform {string} 系统平台
 * @param deviceProvider {string} 设备系列
 * @param driverName {string} 驱动名称
 * @note  有路径
 * @return 
 */
ObjectCheckInterface.prototype.checkProjectDriverDepends = function (DriverInfoObj, singleProjectInfo) {
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Enter function checkProjectDriverDepends");
    var returnObj = new Object();
    returnObj.error = false;
    returnObj.info = ""
    if(DriverInfoObj == undefined ||driverName == undefined || SysPlatform  == undefined || deviceProvider == undefined ){
        returnObj.error = true;
        returnObj.info = "驱动库文件、驱动名称、运行系统或设备厂商参数未定义";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkProjectDriverDepends");
        return returnObj;
    }
    let driverObj = DriverInfoObj;
    var depenfiles = "";
    for(var i = 0; i < driverObj.DriverList.length; i++){
        if(driverObj.DriverList[i].SysPlatform == singleProjectInfo.SysPlatform && driverObj.DriverList[i].DriverName == singleProjectInfo.DriverName && driverObj.DriverList[i].DriverCompany == singleProjectInfo.DeviceProvider){
            depenfiles = driverObj.DriverList[i].DependFile;
        }
    }
    if(depenfiles != ""){
        var depenfilesArr = [];
        depenfilesArr = depenfiles.split('|');
        for(var i = 0; i < depenfilesArr.length; i++){
            let proPath = pubInter.joinPath(singleProjectInfo.ProjectID, singleProjectInfo.ProjectVersion, req.query.ProjectName);
            var relativePathFile = proPath  +  "/Driver/" + depenfilesArr[i];
            var FilePath = path.resolve(__dirname,relativePathFile);
            if(!fs.existsSync(FilePath)){
                returnObj.error = true;
                returnObj.info = "未找到驱动依赖文件：" + depenfilesArr[i];
                ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkProjectDriverDepends");
                return returnObj;
            }
        }
        returnObj.error = false;
        returnObj.info = "依赖文件无缺失";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkProjectDriverDepends");
        return returnObj;
    }else{
        returnObj.error = false;
        returnObj.info = "该驱动无所需依赖文件";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkProjectDriverDepends");
        return returnObj;
    }
}

/**
 * @brief clsid与设备系列校验
 * @param DriverInfoObj {object} driverInfo.json 组件库中对象
 * @param singleDevObj {object} CLSID DeviceSeries SystemPlatform DeviceProvider DriverName
 * @note  有路径
 * @return 
 */
ObjectCheckInterface.prototype.checkCLSID = function (DriverInfoObj, singleDevObj) {
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Enter function checkCLSID");
    var returnObj = new Object();
    returnObj.error = false;
    returnObj.info = ""
    if( DriverInfoObj == undefined ||singleDevObj == undefined ){
        returnObj.error = true;
        returnObj.info = "驱动库文件或设备信息未定义";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkCLSID：驱动库文件或设备信息未定义");
        return returnObj;
    }
    let driverObj = DriverInfoObj;
    var findDriverFlag = 0;
    for(var i = 0; i < driverObj.DriverList.length; i++){
        if(driverObj.DriverList[i].SysPlatform == singleDevObj.SysPlatform && driverObj.DriverList[i].DriverName == singleDevObj.DriverName && driverObj.DriverList[i].DriverCompany == singleDevObj.DeviceProvider){
            if(singleDevObj.CLSID != driverObj.DriverList[i].CLSID ){
                returnObj.error = true;
                returnObj.info = "CLSID错误";
                ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkCLSID：CLSID错误");
                return returnObj;
            }
            if(driverObj.DriverList[i].DeviceSeries.indexof(singleDevObj.DeviceSeries) == -1){
                returnObj.error = true;
                returnObj.info = "DeviceSeries错误";
                ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkCLSID：DeviceSeries错误");
                return returnObj;
            }
            findDriverFlag = 1;
            break;
        }
    }
    if(findDriverFlag == 0){
        returnObj.error = true;
        returnObj.info = "未找到对应驱动";
        ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkCLSID：未找到对应驱动");
        return returnObj;
    }
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function checkCLSID");
    return returnObj;
}

/**
 * @brief 根据xml获取可用寄存器
 * @param xmlString {string} xml文件读取后的字符串
 * @note  driverName {string} 驱动名称
 * @return Array [] 寄存器名称数组
 */
ObjectCheckInterface.prototype.getRegName = function (xmlString,driverName) {
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Enter function getRegName");
    var returnObj = new Object();
    returnObj.error = false;
    returnObj.info = ""
    var arrRegLIst = [];
    var strDriverXmlName = driverName + ".xml"
    var ss = xml2js.parseString(xmlString, { explicitArray: false, async:false }, function (err, json) {
        if (err) {
          console(err.message);
          returnObj.error = true;
          returnObj.info = err.message;
          ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function getRegName:" + err.message);
          return returnObj;
        }
        if (typeof (json["XML"]) == 'object') {
          for (x in json["XML"][driverName]) {
            if (typeof (json["XML"][driverName][x]) == 'object') {
              strDriverXmlName = "XML";
            }
          }
        }
        for (x in json[strDriverXmlName][driverName]) {
          if (typeof (json[strDriverXmlName][driverName][x]) == 'object') {
            for (var key in json[strDriverXmlName][driverName][x].RegisterInfo) {
            //   let objRegInfo = {};
              if (key.indexOf("XmlNumNode") == 0) {
                var newkey = key.substr(10, key.length);
                arrRegLIst.push(newkey);
              }else{
                  arrRegLIst.push(key);
              }
            //   else{
            //     objRegInfo.id = key;
            //   }
            //   objRegInfo.text = objRegInfo.id;
              
            }
          }
        }
      });
    returnObj.info = arrRegLIst;
    ObjectCheckInterfaceObj.traceLog(ObjectCheckInterfaceName, "Leave function getRegName");
    return returnObj;
}

/**
 * @brief 校验数据类型的数字
 * @param nDataType 数据类型的数字
 * @return 该数字是否合理
 */
ObjectCheckInterface.prototype.checkDataType = function (nDataType) {
    //变量类型必须是数字
    if (/^\d*$/.test(nDataType) == false) {
        return false;
    }
    //变量类型的数字在1到16384之间
    if (nDataType < 1 || nDataType > 16384) {
        return false;
    }
    //变量类型的数字必然是2的n次幂
    let nQuotient = nDataType;
    let nRemainder = 0;
    while (nRemainder != 1) {
        nRemainder = nQuotient%2;
        nQuotient = Math.floor(nQuotient/2);
    }
    if (nQuotient == 0) {
        return true
    } else {
        return false;
    }
}

module.exports = ObjectCheckInterface
