var fs = require("fs");
var xml2js = require("xml2js");

function CheckModule() { }

CheckModule.prototype.Errcode = {
  "ERR_CHECK_SUCCESS": 0,
  "ERR_XML_PATH_NULL": 1,
  "ERR_XML_FILE_LOAD": 2,
  "ERR_XML_DRV_BASE_INFO": 3,
  "ERR_XML_DEV_BASE_INFO": 4,
  "ERR_XML_DEV_ADDR_INFO": 5,
  "ERR_XML_DEV_REG_INFO": 6,
  "ERR_XML_DEV_REG_RULE": 7,
  "ERR_XML_DEV_ADDR_FORMAT": 8,
  "ERR_XML_REG_FORMAT": 9,
  "ERR_XML_DEV_RULE_NOT_EXIST": 10,
  "ERR_XML_REG_RULE_NOT_EXIST": 11,
  "ERR_XML_NO_THIS_DEVICE": 12,
  "ERR_USR_DEV_ADDR_OUTRANGE": 13,
  "ERR_USR_DEV_ADDR_FORMAT": 14,
  "ERR_USR_REG_VAR_OUTRANGE": 15,
  "ERR_USR_REG_VAR_DATATYPE": 16,
  "ERR_USR_REG_VAR_ACCESSTYPE": 17,
  "ERR_USR_REG_VAR_FORMAT": 18,
  "ERR_LOAD_DRIVER_XML_FILE": 19,
  "ERR_INPUT_PARAMS_INVALID": 20
};
CheckModule.prototype.Errcode_decode =
{
  0:"ERR_CHECK_SUCCESS",
  1:"ERR_XML_PATH_NULL",
  2:"ERR_XML_FILE_LOAD",
  3:"ERR_XML_DRV_BASE_INFO",
  4:"ERR_XML_DEV_BASE_INFO",
  5:"ERR_XML_DEV_ADDR_INFO",
  6:"ERR_XML_DEV_REG_INFO",
  7:"ERR_XML_DEV_REG_RULE",
  8:"ERR_XML_DEV_ADDR_FORMAT",
  9:"ERR_XML_REG_FORMAT",
  10:"ERR_XML_DEV_RULE_NOT_EXIST",
  11:"ERR_XML_REG_RULE_NOT_EXIST",
  12:"ERR_XML_NO_THIS_DEVICE",
  13:"ERR_USR_DEV_ADDR_OUTRANGE",
  14:"ERR_USR_DEV_ADDR_FORMAT",
  15:"ERR_USR_REG_VAR_OUTRANGE",
  16:"ERR_USR_REG_VAR_DATATYPE",
  17:"ERR_USR_REG_VAR_ACCESSTYPE",
  18:"ERR_USR_REG_VAR_FORMAT",
  19:"ERR_LOAD_DRIVER_XML_FILE",
  20:"ERR_INPUT_PARAMS_INVALID"
}

/**
 * @brief 设备寄存器规则
 * @note  
 */
CheckModule.prototype.load_ = { "value": 0 };
/**
 * @brief 设备寄存器规则
 * @note  
 */
CheckModule.prototype.allDevsRegRules_ = new Map();
/**
 * @brief 设备寄存器信息
 * @note  
 */
CheckModule.prototype.allDevsRegInfo_ = new Map();
/**
 * @brief 设备基础信息
 * @note  
 */
CheckModule.prototype.allDevsBaseInfo_ = new Map();
/**
 * @brief 设备检查类型
 * @note  
 */
CheckModule.prototype.allDevsCheckType_ = new Map();
/**
 * @brief 设备地址规则
 * @note  
 */
CheckModule.prototype.allDevsAddrRules_ = new Map();
/**
 * @brief 当前xml文件的路径
 * @note  静态对象
 */
CheckModule.prototype.xmlFilePath = { "value": "" };
/**
 * @brief 当前xml文件的名称
 * @note  静态对象
 */
CheckModule.prototype.xmlFileName = { "value": "" };
/**
 * @brief 当前xml文件的驱动名称
 * @note  静态对象
 */
CheckModule.prototype.driverName = { "value": "" };
/**
 * @brief 当前xml文件的设备系列
 * @note  静态对象
 */
CheckModule.prototype.deviceSeries = { "value": "" };
/**
 * @brief 地址规则片段最大数量
 * @note  静态对象
 */
var XML_DEVADDR_ONE_RULE_MAX_SEGMENT_COUNT = 10;
/**
 * @brief  设备地址格式分隔符
 * @note  静态对象
 */
var XML_DEVADDR_FORMAT_DELIMITER = " .|";
/**
 * @brief  设备地址范围分隔符
 * @note  静态对象
 */
var XML_DEVADDR_SCOPE_DELIMITER = ";";
var XML_REGISTER_SCOPE_DELIMITER = ",";
var XML_REGISTER_ONE_RULE_MAX_SEGMENT_COUNT = 4;
var XML_REGISTER_FORMAT_DELIMITER = " .";
var BOTH_ADDRESS_REGUALR_CHECK = 0x00;
var DEVICE_ADDRESS_NOT_CHECK = 0x01;
/**
 * @brief  允许用户输入的字符
 * @note  静态对象
 */
var XML_USERCFG_ALLOWED_CHARSET =
  " 1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:.|\\_/";
/**
 * @brief  xml文件信息
 * @note
 */
CheckModule.prototype.XmlInfo = new Map();
/**
 * @brief  设备地址格式化片段
 * @note
 */
CheckModule.prototype.formatSlices = [];
/**
 * @brief  设备地址格式化分隔符
 * @note
 */
CheckModule.prototype.formatPlus = [];
/**
 * @brief  设备地址范围格式化片段
 * @note
 */
CheckModule.prototype.scopeSlices = [];
/**
 * @brief  设备地址范围格式化分隔符
 * @note
 */
CheckModule.prototype.scopePlus = [];
/**
 * @brief  设备
 * @note
 */
CheckModule.prototype.scopesegs = [];
/**
 * @brief  设备地址格式
 * @note
 */
CheckModule.prototype.control = { "value": "" };
/**
 * @brief 设备地址信息
 * @note
 */
CheckModule.prototype.devaddr = [];
/**
 * @brief 全部的设备寄存器地址
 */
CheckModule.prototype.allDevsRegPtr_ = new Map();
/**
 * @brief 设置当前驱动xml文件路径
 * @param strXmlPath {string} xml文件路径
 * @return 
 */
CheckModule.prototype.setXmlPath = function (strXmlPath) {
  this.xmlFilePath.value = strXmlPath;
};

/**
 * @brief 读取xml文件
 * @param out errcode {object} errcode.vaule : 0 success
 * @param strXmlPath {string} xml文件路径
 * @param driverName {string} 驱动名
 * @return  false:失败 true:成功
 */
CheckModule.prototype.LoadXmlFile = function (errcode, strXmlPath, driverName, deviceSeries) {
  // if (this.load_.value == 1) return true;
  var tempXmlInfo;
  if (strXmlPath == "" || strXmlPath == undefined) {
    errcode.value = this.Errcode.ERR_XML_FILE_LOAD;
    return false;
  }

  if (driverName == "" || driverName == undefined) {
    errcode.value = this.Errcode.ERR_XML_FILE_LOAD;
    return false;
  }

  var buf = "";
  try {
    buf = fs.readFileSync(strXmlPath, "utf-8");
  } catch (error) {
    errcode.value = Errcode.ERR_XML_FILE_LOAD;
    return false;
  }

  xml2js.parseString(buf, { explicitArray: false }, function (err, json) {
    if (err) {
      errcode.value = this.Errcode.ERR_XML_FILE_LOAD;
      return false;
    }
    tempXmlInfo = json;
  });

  // --- reset --- //
  this.allDevsBaseInfo_.clear();
  this.allDevsAddrRules_.clear();
  this.allDevsCheckType_.clear();
  this.allDevsRegInfo_.clear();
  this.allDevsRegPtr_.clear();
  this.allDevsRegRules_.clear();
  // --- reset --- //
  this.deviceSeries.value = deviceSeries;
  this.driverName.value = driverName;
  this.xmlFileName.value = driverName + ".xml";
  this.xmlFilePath.value = strXmlPath;
  this.XmlInfo.set(driverName, tempXmlInfo);

  if (!this.loadXmlDevsBaseInfo()) {
    errcode.value = this.Errcode.ERR_XML_DRV_BASE_INFO;
    return false;
  }
  if (!this.loadXmlDevsAddrInfo()) {
    errcode.value = this.Errcode.ERR_XML_DEV_ADDR_INFO;
    return false;
  }
  if (!this.loadXmlDevsRegInfo()) {
    errcode.value = this.Errcode.ERR_XML_DEV_REG_INFO;
    return false;
  }
  if (!this.loadXmlDevsRegRule()) {
    errcode.value = this.Errcode.ERR_XML_DEV_REG_RULE;
    return false;
  }
  this.load_.value = 1;
  return true;
};
/**
 * @brief 加载设备地址信息
 * @return
 */
CheckModule.prototype.loadXmlDevsAddrInfo = function () {
  if (this.driverName.value == undefined || this.driverName.value == "") return false;
  if (this.XmlInfo.has(this.driverName.value) == false) return false;
  // if ((this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value] == undefined) return false;
  // var xmlInfo = (this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value][this.driverName.value];
  //..20231121
  let xmlValue;
  if ((this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value] != undefined) {
    xmlValue = (this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value];
  } else if ((this.XmlInfo.get(this.driverName.value))["XML"] != undefined){
    xmlValue = (this.XmlInfo.get(this.driverName.value))["XML"];
  }
  if(!xmlValue) return;
  xmlInfo = xmlValue[this.driverName.value];
  //..
  if (xmlInfo == undefined) return false;

  for (let key in xmlInfo) {
    // if (key.indexOf(this.driverName.value) != 0) continue;
    let r1 = key.indexOf(this.deviceSeries.value) != 0;
    let r2 = this.deviceSeries.value.indexOf(key) != 0;
    let ret = (r1 && r2);
    if (ret) continue; //20231121
    let device = xmlInfo[key];
    if (device["DeviceInfo"] == undefined) return false;
    let devinfo = device["DeviceInfo"];
    if (devinfo.name == undefined) return false;
    // let devname = devinfo.name;
    let devname = this.deviceSeries.value;//20231121

    if (device["AddressInfo"] == undefined) return false;
    let addrinfo = device["AddressInfo"];
    let AddressRule = [];
    for (let i in addrinfo) {
      if(Array.isArray(addrinfo[i])) {
        addrinfo[i].forEach(v=>pushRules(AddressRule, v, i, devname))
      }else {
        pushRules(AddressRule, addrinfo[i], i, devname)
      }       
    }
    this.allDevsAddrRules_.set(devname, AddressRule);
  }
  return true;
}

// CheckModule.prototype.loadXmlDevsAddrInfo = function () {
  //   if (this.driverName.value == undefined || this.driverName.value == "") return false;
  //   if (this.XmlInfo.has(this.driverName.value) == false) return false;
  //   if ((this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value] == undefined) return false;
  
  //   var xmlInfo = (this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value][this.driverName.value];
  //   if (xmlInfo == undefined) return false;
  
  //   for (let key in xmlInfo) {
  //     if (key.indexOf(this.driverName.value) != 0) continue;
  //     let device = xmlInfo[key];
  //     if (device["DeviceInfo"] == undefined) return false;
  //     let devinfo = device["DeviceInfo"];
  //     if (devinfo.name == undefined) return false;
  //     var devname = devinfo.name;
  
  //     if (device["AddressInfo"] == undefined) return false;
  //     let addrinfo = device["AddressInfo"];
  //     let AddressRule = [];
  //     for (let i in addrinfo) {
  //       if (i.indexOf("AddressRuleName") != 0) continue;
  //       let format, scope;
  //       if (addrinfo[i]["AddressFormat"] != undefined) {
  //         format = addrinfo[i]["AddressFormat"]
  //       }
  //       if (addrinfo[i]["AddressScope"] != undefined) {
  //         scope = addrinfo[i]["AddressScope"];
  //       }
  //       let taken = "", pos = -1;
  //       while ((pos = scope.indexOf(";")) != -1) {
  //         let segment = scope.substr(0, pos); // format: DEVID:%d:0-65535: / STRING1:-:默认值:
  //         if (segment.indexOf("STRING") != -1) { // 未测试
  //           taken = taken + (segment.substr(0, segment.indexOf(':', segment.indexOf(':') + 1) + 1)); // STRING1:-: (with :)
  //           taken = taken + XML_DEVADDR_SCOPE_DELIMITER;
  //         } else {
  //           if (segment[segment.length-1] != ':') {
  //             segment += ':';
  //           }          
  //           taken = taken + (segment.substr(0, segment.lastIndexOf(":"))); // DEVID:%d:0-65535 (without :)
  //           taken = taken + XML_DEVADDR_SCOPE_DELIMITER;
  //         }
  //         scope = scope.substr(pos + 1); // taken: DEVID:%d:0-65535;STRING1:-:;
  //       }
  //       AddressRule.push({
  //         "format": format, "scope": taken, "sample": "", "desc": "",
  //         "segment": { "type": "", "desc": "", "range": "" },
  //         "scopesegs": [], "control": ""
  //       });
  //       if ("STRING1" == format) {
  //         this.allDevsCheckType_.set(devname, (allDevsCheckType_.get(devname) | DEVICE_ADDRESS_NOT_CHECK));
  //       }
  //     }
  //     this.allDevsAddrRules_.set(devname, AddressRule);
  //   }
  //   return true;
  // }
/**
 * @brief 加载设备基础信息
 * @return
 */
CheckModule.prototype.loadXmlDevsBaseInfo = function () {
  if (this.driverName.value == undefined || this.driverName.value == "") return false;
  if (this.XmlInfo.has(this.driverName.value) == false) return false;
  let xmlValue;//20231121
  if ((this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value] != undefined) {
    xmlValue = (this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value];
  } else if ((this.XmlInfo.get(this.driverName.value))["XML"] != undefined){
    xmlValue = (this.XmlInfo.get(this.driverName.value))["XML"];
  }
  if(!xmlValue) return;
  xmlInfo = xmlValue[this.driverName.value];
  // if ((this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value] == undefined) return false;
  // var xmlInfo = (this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value][this.driverName.value];
  if (xmlInfo == undefined) return false;

  for (let key in xmlInfo) {
    // if (key.indexOf(this.driverName.value) != 0) continue;
    //if (key.indexOf(this.driverName.value) != 0 && this.driverName.value.indexOf(key) != 0) continue; //20231121
    if (key.indexOf(this.deviceSeries.value) != 0 && this.deviceSeries.value.indexOf(key) != 0) continue;
    let device = xmlInfo[key];
    if (device["DeviceInfo"] == undefined) return false;
    let devinfo = device["DeviceInfo"];
    if (devinfo.name == undefined || devinfo.TransType == undefined || devinfo.PacketLenth == undefined) return false; // 应该不会为空
    // let devname = devinfo.name;
    let devname = this.deviceSeries.value;//20231121
    let transType = devinfo.TransType;
    let packetLen = Number(devinfo.PacketLenth, 10);

    this.allDevsBaseInfo_.set(devname, { "company": "", "devtype": "", "name": devname, "linktype": 0, "transtype": transType, "packetlen": packetLen })
    this.allDevsCheckType_.set(devname, BOTH_ADDRESS_REGUALR_CHECK);
  }

  return true;
}
/**
 * @brief 加载设备寄存器信息
 * @return
 */
CheckModule.prototype.loadXmlDevsRegInfo = function () {
  if (this.driverName.value == undefined || this.driverName.value == "") return false;
  if (this.XmlInfo.has(this.driverName.value) == false) return false;
  // if ((this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value] == undefined) return false;
  // var xmlInfo = (this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value][this.driverName.value];
  //..20231121
  let xmlValue;
  if ((this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value] != undefined) {
    xmlValue = (this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value];
  } else if ((this.XmlInfo.get(this.driverName.value))["XML"] != undefined){
    xmlValue = (this.XmlInfo.get(this.driverName.value))["XML"];
  }
  if(!xmlValue) return;
  xmlInfo = xmlValue[this.driverName.value];
  //..
  if (xmlInfo == undefined) return false;
  let tempMap = [];
  for (let key in xmlInfo) {
    // if (key.indexOf(this.driverName.value) != 0) continue;
    if (key.indexOf(this.deviceSeries.value) != 0 && this.deviceSeries.value.indexOf(key) != 0) continue; //20231121
    let device = xmlInfo[key];
    if (device["DeviceInfo"] != undefined && typeof (device["DeviceInfo"]) == "object") {
      // var devname = device["DeviceInfo"].name;
      devname = this.deviceSeries.value;//20231121
    } else return false;
    if (device["RegisterInfo"] != undefined && typeof (device["RegisterInfo"]) == "object") {
      let datatype = "", rwtype = "", smin = 0, smax = 0;
      for (let i in device["RegisterInfo"]) {
        if (i.indexOf("XmlNumNode") == 0) {
          var regname = i.slice("XmlNumNode".length);
        } else {
          var regname = i;
        }
        if (device["RegisterInfo"][i]["DataType"] != undefined) datatype = device["RegisterInfo"][i]["DataType"];
        if (device["RegisterInfo"][i]["RW"] != undefined) rwtype = device["RegisterInfo"][i]["RW"];
        if (device["RegisterInfo"][i]["ChannelScopeMin"] != undefined) smin = device["RegisterInfo"][i]["ChannelScopeMin"];
        if (device["RegisterInfo"][i]["ChannelScopeMax"] != undefined) smax = device["RegisterInfo"][i]["ChannelScopeMax"];
        tempMap.push({ "name": regname, "dtype": datatype, "atype": rwtype, "scopemin": smin, "scopemax": smax });
      }
    } else return false;
    this.allDevsRegInfo_.set(devname, tempMap);
  }
  return true;
}
/**
 * @brief 加载设备地址规则
 * @return
 */
CheckModule.prototype.loadXmlDevsRegRule = function () {
  if (this.driverName.value == undefined || this.driverName.value == "") return false;
  if (this.XmlInfo.has(this.driverName.value) == false) return false;
  // if ((this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value] == undefined) return false;
  // var xmlInfo = (this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value][this.driverName.value];
  //..20231121
  let xmlValue;
  if ((this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value] != undefined) {
    xmlValue = (this.XmlInfo.get(this.driverName.value))[this.xmlFileName.value];
  } else if ((this.XmlInfo.get(this.driverName.value))["XML"] != undefined){
    xmlValue = (this.XmlInfo.get(this.driverName.value))["XML"];
  }
  if(!xmlValue) return;
  xmlInfo = xmlValue[this.driverName.value];
  //..
  if (xmlInfo == undefined) return false;

  for (let key in xmlInfo) {
    if (key.indexOf(this.deviceSeries.value) != 0 && this.deviceSeries.value.indexOf(key) != 0) continue; //20231121
    // if (key.indexOf(this.driverName.value) != 0) continue;
    let device = xmlInfo[key];
    if (device["DeviceInfo"] != undefined && typeof (device["DeviceInfo"]) == "object") {
      // let devname = device["DeviceInfo"].name;
      let devname = this.deviceSeries.value;//20231121
      if (devname != undefined && devname != "") {
        if (device["RegisterInfo"] != undefined && typeof (device["RegisterInfo"]) == "object") {
          let tempMap = new Map();
          for (let i in device["RegisterInfo"]) {
            if (i.indexOf("XmlNumNode") == 0) {
              var regname = i.slice("XmlNumNode".length);
            } else {
              var regname = i;
            }
            let tempRegMap = new Map();
            for (let j in device["RegisterInfo"][i]) {
              if (j.indexOf("RegisterRule") != 0) continue;
              let format, scope, dtype, atype;
              if (device["RegisterInfo"][i][j]["RegFormat"] != undefined) format = device["RegisterInfo"][i][j]["RegFormat"];
              if (device["RegisterInfo"][i][j]["ChannelScope"] != undefined) scope = device["RegisterInfo"][i][j]["ChannelScope"];
              if (device["RegisterInfo"][i][j]["DataTypeSP"] != undefined) dtype = device["RegisterInfo"][i][j]["DataTypeSP"];
              if (device["RegisterInfo"][i][j]["RWForRule"] != undefined) atype = device["RegisterInfo"][i][j]["RWForRule"];

              tempRegMap.set(j, { "format": format, "scope": scope, "dtype": dtype, "atype": atype, "control": "", "scopesegs": [] });

            }
            tempMap.set(regname, tempRegMap);
          }
          this.allDevsRegRules_.set(devname, tempMap);
        } else return false;
      } else return false;
    } else return false;
  }
  return true;
}
/**
 * @brief 获取包长度
 * @param 
 * @return
 */
CheckModule.prototype.packetLen = function (errcode, packetlen, devicename) {
  let devname = (devicename == undefined || devicename == "") ? this.driverName.value : devicename;
  if (this.allDevsBaseInfo_.has(devname) == false) {
    errcode.value = this.Errcode.ERR_XML_NO_THIS_DEVICE;
    return false;
  } else {
    packetlen.value = this.allDevsBaseInfo_.get(devname).packetlen;
    return true;
  }
}
/**
 * @brief check user address information
 * @param strDevAddr(in) {string} user device address
 * @param devaddr(out) {object} return the checked device address
 * @param devicename(in) {string} device name
 * @return 
 */
CheckModule.prototype.checkUserDevAddr = function (errcode, strDevAddr, devaddr, devicename, deviceSeries) {
  if (1 != this.load_.value || this.XmlInfo.has(this.driverName.value) == false) {
    errcode.value = this.Errcode.ERR_LOAD_DRIVER_XML_FILE;
    return false;
  }

  if(strDevAddr == "" || strDevAddr == undefined) {
    errcode.value = this.Errcode.ERR_INPUT_PARAMS_INVALID;
    return false;
  }
  let devname = (deviceSeries == undefined || deviceSeries == "") ? this.deviceSeries.value : deviceSeries;
  let rules = [];
  if (!this.findDevAddrRules(rules, devname)) {
    errcode.value = this.Errcode.ERR_XML_DEV_RULE_NOT_EXIST;
    return false;
  }
  if (rules.length == 0) return false;
  rules = rules[0];

  errcode.value = this.Errcode.ERR_XML_DEV_RULE_NOT_EXIST;
  for (let i in rules) {
    if (this.parseRule(rules[i])) {
      if (this.checkUserAddrFormat(rules[i], strDevAddr)) {
        if (this.checkUserAddrValue(rules[i], devaddr, strDevAddr)) {
          //
          errcode.value = this.Errcode.ERR_CHECK_SUCCESS;
          return true;
        } else {
          errcode.value = this.Errcode.ERR_USR_DEV_ADDR_OUTRANGE;
          return false;
        }
      } else errcode.value = this.Errcode.ERR_USR_DEV_ADDR_FORMAT;
    } else errcode.value = this.Errcode.ERR_XML_DEV_ADDR_FORMAT;
  }
  return false;
};
/**
 * @brief get the device address rule
 * @param rules(out) : device address rule
 * @param devicename : device name
 * @return true or false
 */
CheckModule.prototype.findDevAddrRules = function (rules, devicename) {
  if (devicename == undefined || devicename == "") {
    return false;
  } else {
    if (this.allDevsAddrRules_.has(devicename) == false) {
      return false;
    } else {
      rules.push(this.allDevsAddrRules_.get(devicename));
      return true;
    }
  }
}
/**
 * @brief get registers info
 * @param regs (out) {object} register infomation 
 * @param count (out) {int} 
 * @param devicename {string} 
 * @return true or false
 */
CheckModule.prototype.getRegisters = function (errcode, regs, count, devicename, deviceSeries) {
  if (1 != this.load_.value) {
    errcode.value = this.Errcode.ERR_LOAD_DRIVER_XML_FILE;
    return false;
  }
  let devname = (deviceSeries == undefined || deviceSeries == "") ? this.deviceSeries.value : deviceSeries;

  if (devname == undefined || devname == "") return false;

  if (!this.findDevRegInfo(count, devname)) {
    errcode.value = this.Errcode.ERR_XML_REG_RULE_NOT_EXIST;
    return false;
  }
  regs = this.allDevsRegPtr_.get(devname);
  return true;
}
/**
 * @brief checkUserVar
 * @param item {object} 
 * @param plcVar (out) {object} 
 * @param devicename {string} 驱动名
 * @return
 */
CheckModule.prototype.checkUserVar = function (errcode, dbitem, plcVar, devicename, deviceSeries) {
  if (dbitem == undefined || plcVar == undefined) {
    errcode.value = this.Errcode.ERR_INPUT_PARAMS_INVALID;
    return false;
  }
  let devname = (deviceSeries == undefined || deviceSeries == "") ? this.deviceSeries.value : deviceSeries;
  let uservarcfg = dbitem.szRegister;
  let rules = [];
  let userchannelcfg = { "value": "" }; //
  if (!this.findDevRegRules(rules, plcVar.nRegType, userchannelcfg, uservarcfg, devname)) {
    errcode.value = this.Errcode.ERR_XML_REG_RULE_NOT_EXIST;
    return false;
  }
  plcVar.pszRegName = this.allDevsRegPtr_.get(devname)[plcVar.nRegType.value].sRegName;
  if (rules.length > 0) rules = rules[0];
  let r = [];
  rules.forEach(function (value, key) {
    r.push(value);
  });
  errcode.value = this.Errcode.ERR_XML_REG_RULE_NOT_EXIST;
  for (let i = 0; i < r.length; i++) {
    if (this.parseRuleVar(r[i])) {
      if (this.checkUserVarFormat(r[i], userchannelcfg)) {
        let c1 = this.checkUserVarAccessType(r[i], dbitem.nAccessMode);
        let c2 = this.checkUserVarDataType(r[i], dbitem.nDataType);
        if (!c1) {
          errcode.value = this.Errcode.ERR_USR_REG_VAR_ACCESSTYPE;
        }
        if (!c2) {
          errcode.value = this.Errcode.ERR_USR_REG_VAR_DATATYPE;
        }
        if (c1 && c2) {
          let c3 = this.checkUserVarValue(r[i], plcVar, userchannelcfg.value);
          if (!c3) {
            errcode.value = this.Errcode.ERR_USR_REG_VAR_OUTRANGE;
            // return false;//20240325 
          } else {
            plcVar.nDataType.value = dbitem.nDataType;
            plcVar.nAccessMode = dbitem.nAccessMode;
            errcode.value = this.Errcode.ERR_CHECK_SUCCESS;
            return true;
          }
        } else if (c1 || c2) {
          //return false; /// @note may have others addrs can match it
        }
      } else errcode.value = this.Errcode.ERR_USR_REG_VAR_FORMAT;
    } else errcode.value = this.Errcode.ERR_XML_REG_FORMAT;
  }
  return false;
}

/**
 * @brief check user variable value
 * @param rule {object} : register rule
 * @param plcVar (out) {object} : variable
 * @param userchannelcfg
 * @return true or false
 */
CheckModule.prototype.checkUserVarValue = function (rule, plcVar, userchannelcfg) {
  if (rule.scopesegs.length > XML_REGISTER_ONE_RULE_MAX_SEGMENT_COUNT) return false;

  let ret = true;
  let channelno = [{ "value": 0 }, { "value": 0 }, { "value": 0 }, { "value": 0 }];

  // control: %lld.%llx   (format:NUM1.NUM2)
  // ranges:  0-255 0x0-0xFF

  // 00-format forward check
  var scope = scanf(userchannelcfg, rule.control);
  if(scope == null || scope.length != rule.scopesegs.length) return false;

  // 02-value check(any seg check failed, return false)
  vals = [];
  for (let i = 0; i < rule.scopesegs.length; ++i) {
    if (!this.checkUserVarSegValue(rule.scopesegs, channelno[i], i, scope[i])) {
      ret = false;
      break; // return ?
    }
  }
  plcVar.nNo.value = channelno[0].value;
  plcVar.nSubType = 0;
  plcVar.nSubType1 = channelno[1].value;
  plcVar.nSubType2 = channelno[2].value;
  return ret;
}

/**
 * @brief check user variable segment value
 * @param channelno (out) {object} 
 * @return true or false
 */
CheckModule.prototype.checkUserVarSegValue = function (scopesegs, channelno, segid, userValue) {
  let type = scopesegs[segid].type;
  let range = scopesegs[segid].range;
  let typedes = scopesegs[segid].desc;
  let prex = "";
  if (type == "STRING") {
    // --- //
    /// @attention STRING default supports all allowed charset
  } else if (type == "NUM") {
    let lr = [];  // 0-0xFF

    if (typedes == "%d") {
      this.stringSplit(lr, [], range, "-");
      if (lr.length != 2) return false;
    } else if (typedes == "%x") {
      this.stringSplit(lr, [], range, "-");
      if (lr.length != 2) return false;
      prex = "0x";
    } else {
      return false;
    }

    let usrval = Number(prex+userValue, 10);
    lr[0] = Number(lr[0], 10);
    lr[1] = Number(lr[1], 10);
    if (isNaN(usrval) || isNaN(lr[0]) || isNaN(lr[1])) return false;
    if (usrval < lr[0] || usrval > lr[1]) {
      return false;
    } else {
      channelno.value = Number(usrval, 10);
    }
  } else {
    return false;
  }
  return true;
}
/**
 * @brief 
 * @return
 */
CheckModule.prototype.checkUserVarDataType = function (rule, datatype) {
  // data type
  if (datatype & (Number(rule.dtype, 10))) {
    return true;
  } else {
    return false;
  }
}
/**
 * @brief check user variable read-write type
 * @param rule {object} : register rule
 * @param accesstype {object} :  
 * @return true or false
 */
CheckModule.prototype.checkUserVarAccessType = function (rule, accesstype) {
  // access type
  let r = (rule.atype.indexOf("R") != -1 ? 0x01 : 0x00);
  let w = (rule.atype.indexOf("W") != -1 ? 0x02 : 0x00);

  // -1:error/00:read/01:write/02:read&write/
  if ((accesstype + 1) & (r | w)) {
    return true;
  } else {
    return false;
  }
}
/**
 * @brief check user variable format
 * @param r {object} : register rule
 * @param userchannelcfg {object} 
 * @return true or false
 */
CheckModule.prototype.checkUserVarFormat = function (r, userchannelcfg) {
  if (!this.checkString(XML_USERCFG_ALLOWED_CHARSET, userchannelcfg.value)) return false;
  let count = r.scopesegs.length;
  let segs = [], plus = [];
  this.stringSplit(segs, plus, userchannelcfg.value, XML_REGISTER_FORMAT_DELIMITER);
  if (segs.length != count) return false;
  return true;
}
/**
 * @brief parse register rule
 * @param r {object} : register rule
 * @return true or false
 */
CheckModule.prototype.parseRuleVar = function (r) {
  // set empty
  r.scopesegs.length = 0;
  r.control = "";

  let formatSlices = [], formatPlus = [];
  let scopeSlices = [], scopePlus = [];

  this.stringSplit(formatSlices, formatPlus, r.format, XML_REGISTER_FORMAT_DELIMITER);
  this.stringSplit(scopeSlices, scopePlus, r.scope, XML_REGISTER_SCOPE_DELIMITER);

  if (formatSlices.length > XML_DEVADDR_ONE_RULE_MAX_SEGMENT_COUNT) return false;

  for (let i = 0; i < scopeSlices.length; i++) {
    let scopeseg = {
      type: "", desc: "", range: ""
    };
    let segs = [], plus = [];
    this.stringSplit(segs, plus, scopeSlices[i], ":");
    if (segs.length < 2) return false;
    if (formatSlices[i].indexOf("NUM") != -1) {
      scopeseg.type = "NUM";

      let p = segs[1].indexOf("-"); // 1-65535  or 0x1-0XFF
      //231226 兼容 范围为单个数字，例如 0
      if (p == -1) {
        segs[1] = segs[1] + "-" + segs[1];
        p = segs[1].indexOf("-");
        r.scope = formatSlices[i] + ":" + segs[1];
      }//
      if (p != -1) {
        /// @attention controlstr depends on the right hand side.
        ///  someone input 0-0xFF, the left zero is hex-zero.
        // right
        if (segs[1].indexOf("0x", p + 1) != -1 ||
          segs[1].indexOf("0X", p + 1) != -1) {
          r.control = r.control + "%x";
          scopeseg.desc = "%x";
        } else {
          r.control = r.control + "%d";
          scopeseg.desc = "%d";
        }
      } 
      else {
        return false;
      }
    } else if (formatSlices[i].indexOf("STRING") != -1) {
      scopeseg.type = "STRING";
      r.control = r.control + "%s";
      scopeseg.desc = "%s";
    } else {
      return false;
    }
    scopeseg.range = segs[1]; // 0-65535
    r.control = r.control + formatPlus[i];
    r.scopesegs.push(scopeseg);
  }
  return true;
}
/**
 * @brief find device register rules
 * @param rules (out) {object} 
 * @param regid (out) {object} 
 * @param userchannelcfg (out) {object} 
 * @param uservarcfg {string} 
 * @param devicename {string} 
 * @return true or false
 */
CheckModule.prototype.findDevRegRules = function (rules, regid, userchannelcfg, uservarcfg, devicename) {
  if (this.allDevsRegInfo_.has(devicename) == false) return false;
  var regs = this.allDevsRegInfo_.get(devicename)
  let regids = [];
  for (let key in regs) {
    if (uservarcfg.indexOf(regs[key].name) == 0) {
      regids.push(key);
    }
  }
  if (regids.length == 0) return false;

  var regname = "";
  for (let key in regids) {
    if (regs[regids[key]].name.length > regname.length) {
      regname = regs[regids[key]].name;
      regid.value = Number(regids[key], 10);
    }
  }
  userchannelcfg.value = uservarcfg.substr(regname.length);
  if (this.allDevsRegRules_.has(devicename) == false) return false;
  let temp = this.allDevsRegRules_.get(devicename);
  if (temp.has(regname) == false) return false;
  rules.push(temp.get(regname));
  return true;
}
/**
 * @brief get registers info
 * @param count {int} 
 * @param devicename {string} 
 * @return
 */
CheckModule.prototype.findDevRegInfo = function (count, devicename) {
  if (this.XmlInfo.has(this.driverName.value) == false) return false;
  //20231011
  // if (this.allDevsRegInfo_.has(devicename) == true && this.allDevsRegPtr_.has(devicename) == false) {
  if (this.allDevsRegInfo_.has(devicename) == true) {
    var RegisterInfo = this.allDevsRegInfo_.get(devicename);
    var regs = [];
    for (let key in RegisterInfo) {
      let reg = {};
      reg.sRegName = RegisterInfo[key].name;
      reg.nLowIndex = Number(RegisterInfo[key].scopemin, 10);
      reg.nUpperIndex = Number(RegisterInfo[key].scopemax, 10);
      reg.wDataType = Number(RegisterInfo[key].dtype, 10);
      let r = (RegisterInfo[key].atype.indexOf("R") != -1 ? 1 : 0);
      let w = (RegisterInfo[key].atype.indexOf('W') != -1 ? 2 : 0);
      reg.nData = (r | w) - 1; // 00:read/01:write/02:read&write/-1: error
      regs.push(reg);
    }
    if (!this.allDevsRegPtr_.has(devicename)){
      this.allDevsRegPtr_.set(devicename, regs);
    }
    count.value = regs.length;
    return true;
  } else return false
}

/**
 * @brief check user address value
 * @param rule address rule
 * @param devaddr(out) {object}  
 * @param driverName(in) {string} 
 * @return true or false
 */
CheckModule.prototype.checkUserAddrValue = function (rule, devaddr, userdevaddr) {
  // scopesegs.size() is not static number, so only set a max count.
  if (rule.scopesegs.length > XML_DEVADDR_ONE_RULE_MAX_SEGMENT_COUNT) {
    return false;
  }
  // 01-format check
  var vals = scanf(userdevaddr, rule.control);
  if(vals == null || vals.length != rule.scopesegs.length) return false;
 
  let devid = { "value": 0 };
  // 02-value check
  for (let i = 0; i < rule.scopesegs.length; ++i) {
    if (!this.checkUserAddrSegValue(rule, devid, i, vals[i])) {
      return false;
    }
  }
  devaddr.nDevAddr = devid.value;
  devaddr.sDevAddr = userdevaddr;
  return true;
};

/**
 * @brief check user address segment value
 * @param rule {object} address rule
 * @param devid (out) {int} device address 
 * @param segid {int}
 * @param userValue {string}
 * @return true or false
 */
CheckModule.prototype.checkUserAddrSegValue = function (rule, devid, segid, userValue) {
  let type = rule.scopesegs[segid].type;
  let range = rule.scopesegs[segid].range;
  let typedes = rule.scopesegs[segid].desc;
  if(type && !range && !typedes) {return true;}//240112 兼容format 与 scope 数量不等
  if (type == "IP") {
    let lr = [];
    this.stringSplit(lr, [], range, "-");

    if (lr.length != 2) {
      return false;
    } else {
      lr[0] = Number(lr[0], 10);
      lr[1] = Number(lr[1], 10);
      let ipsegs = [],
        ipseps = [];
      this.stringSplit(ipsegs, ipseps, userValue, ".");
      if (ipsegs.length != 4) {
        return false;
      }
      for (let i = 0; i < ipsegs.length; i++) {
        for (let j = 0; j < ipsegs[i].length; j++) {
          // 不是数字且不是“.”，return false
          if (isNaN(Number(ipsegs[i][j], 10)) && ipsegs[i][j] != ".") {
            return false;
          }
        }
        // chack every ip segment range
        let usrIpSegVal = Number(ipsegs[i], 10);
        if (isNaN(usrIpSegVal) || isNaN(lr[0]) || isNaN(lr[1])) return false;
        if (usrIpSegVal < lr[0] || usrIpSegVal > lr[1]) {
          return false;
        }
      }
    }
  } else if (type == "STRING") {
    /// @attention STRING default supports all allowed charset
  } else if (type == "PORT") {
    let lr = []; // 0-65535
    this.stringSplit(lr, [], range, "-");
    if (lr.length != 2) {
      return false;
    } else {
      lr[0] = Number(lr[0], 10);
      lr[1] = Number(lr[1], 10);
      let usrval = Number(userValue, 10);
      if (isNaN(usrval) || isNaN(lr[0]) || isNaN(lr[1])) return false;
      if (usrval < lr[0] || usrval > lr[1]) {
        return false;
      }
    }
  } else if (type == "NUM") {
    let lr = []; // 0-4

    if (typedes == "%d") {
      this.stringSplit(lr, [], range, "-");
      if (lr.length != 2) {
        return false;
      }
    } else if (typedes == "%x") {
      this.stringSplit(lr, [], range, "-");
      if (lr.length != 2) {
        return false;
      }
    } else {
      return false;
    }
    lr[0] = Number(lr[0], 10);
    lr[1] = Number(lr[1], 10);
    let usrval = Number(userValue, 10);
    if (isNaN(usrval) || isNaN(lr[0]) || isNaN(lr[1])) return false;
    if (usrval < lr[0] || usrval > lr[1]) {
      return false;
    }
  } else if (type == "DEVID") {
    let lr = []; // 0-255

    if (typedes == "%d") {
      this.stringSplit(lr, [], range, "-");
      if (lr.length != 2) {
        return false;
      }
    } else if (typedes == "%x") {
      this.stringSplit(lr, [], range, "-");
      if (lr.length != 2) {
        return false;
      }
    } else {
      return false;
    }
    lr[0] = Number(lr[0], 10);
    lr[1] = Number(lr[1], 10);
    let usrval = Number(userValue, 10);
    if (isNaN(usrval) || isNaN(lr[0]) || isNaN(lr[1])) return false;
    if (usrval < lr[0] || usrval > lr[1]) {
      return false;
    } else {
      devid.value = usrval;
    }
  } else {
    return false;
  }
  return true;
};

/**
 * @brief check user address format
 * @param rule {object}
 * @param userdevaddr {string}
 * @return true or false
 */
CheckModule.prototype.checkUserAddrFormat = function (rule, userdevaddr) {
  if (!this.checkString(XML_USERCFG_ALLOWED_CHARSET, userdevaddr)) {
    return false;
  } else {
    // calculate segment sum.
    let count = rule.scopesegs.length;

    for (let i = 0; i < rule.scopesegs.length; i++) {
      if (rule.scopesegs[i].type == "IP") {
        count += 3;
      }
    }
    // split user device address string
    let segs = [], plus = [];
    this.stringSplit(
      segs,
      plus,
      userdevaddr,
      XML_DEVADDR_FORMAT_DELIMITER
    );
    // check
    if (segs.length != count) {
      return false;
    }
    return true;
  }
};
/**
 * @brief check user address Character validity 
 * @param allowCharSet {string}
 * @param userCharset {string} 
 * @return
 */
CheckModule.prototype.checkString = function (allowCharSet, userCharset) {
  if (allowCharSet == undefined || userCharset == undefined) {
    return false;
  }
  for (let i = 0; i < userCharset.length; i++) {
    if (allowCharSet.indexOf(userCharset[i]) == -1) {
      return false;
    }
  }
  return true;
};

/**
 * @brief parse Rule
 * @param AddressInfo {object}
 * @return
 */
CheckModule.prototype.parseRule = function (AddressInfo) {
  // set empty
  AddressInfo.scopesegs.length = 0;
  AddressInfo.control = "";

  let formatSlices = [], formatPlus = [];
  let scopeSlices = [], scopePlus = [];

  this.stringSplit(
    formatSlices,
    formatPlus,
    AddressInfo.format,
    XML_DEVADDR_FORMAT_DELIMITER
  );
  this.stringSplit(
    scopeSlices,
    scopePlus,
    AddressInfo.scope,
    XML_DEVADDR_SCOPE_DELIMITER,
    formatSlices
  );

  if (formatSlices.length > XML_DEVADDR_ONE_RULE_MAX_SEGMENT_COUNT) return false;

  for (let key in scopeSlices) {
    let scopeseg = { "type": "", "desc": "", "range": "" };
    let segs = [], plus = [];
    this.stringSplit(segs, plus, scopeSlices[key], ":");
    if (segs.length == 0) {//240112 兼容format 与 scope 数量不相等
      scopeseg.type = formatSlices[key];
      if (formatSlices[key].indexOf("IP") != -1) {
        AddressInfo.control = AddressInfo.control + "%s";
        scopeseg.type = "IP"; // IP
      } else if (formatSlices[key].indexOf("STRING") != -1) {
        AddressInfo.control = AddressInfo.control + "%s";
        scopeseg.type = "STRING";
        segs.push("");
      } else if (formatSlices[key].indexOf("PORT") != -1) {
        AddressInfo.control = AddressInfo.control + "%d";
        scopeseg.type = "PORT";
      } 
      AddressInfo.scopesegs.push(scopeseg);
      continue;
    }
    if (segs.length < 2) return false;
    if (formatSlices[key].indexOf("IP") != -1) {
      AddressInfo.control = AddressInfo.control + "%s";
      scopeseg.type = "IP"; // IP
    } else if (formatSlices[key].indexOf("STRING") != -1) {
      AddressInfo.control = AddressInfo.control + "%s";
      scopeseg.type = "STRING";
      segs.push("");
    } else if (formatSlices[key].indexOf("PORT") != -1) {
      AddressInfo.control = AddressInfo.control + "%d";
      scopeseg.type = "PORT";
    } else if (formatSlices[key].indexOf("DEVID") != -1) {
      if (segs[1] == "%d") {
        AddressInfo.control = AddressInfo.control + "%d";
      } else if (segs[1] == "%x") {
        AddressInfo.control = AddressInfo.control + "%x";
      } else {
        return false;
      }
      scopeseg.type = "DEVID";
    } else if (formatSlices[key].indexOf("NUM") != -1) {
      if (segs[1] == "%d") {
        AddressInfo.control = AddressInfo.control + "%d";
      } else if (segs[1] == "%x") {
        AddressInfo.control = AddressInfo.control + "%x";
      } else {
        return false;
      }
      scopeseg.type = "NUM";
    } else {
      return false;
    }

    AddressInfo.control = AddressInfo.control + formatPlus[key];
    scopeseg.desc = segs[1];
    scopeseg.range = segs[2];
    AddressInfo.scopesegs.push(scopeseg);
  }
  return true;
};
/**
 * @brief split string
 * @param AddressInfo {string}
 */
CheckModule.prototype.stringSplit = function (
  formatSlices,
  formatPlus,
  source,
  delimiters,
  before_formatSlices
) {
  const regex = new RegExp("[" + delimiters + "]");
  let tmp = source.split(regex);

  if(before_formatSlices){
    for(let i=0;i<before_formatSlices.length; i++) {
      let e = before_formatSlices[i] + ":";
      let flag = false;
      let v = "";
      for (let item in tmp) {
        // if (tmp[item] == "") {
        if (tmp[item].indexOf(e) != -1) {
          flag = true;
          v = tmp[item];
          break;
        } 
      }
      v = flag?v:"";
      formatSlices.push(v);
    }
  } else {
    for (let item in tmp) {
      // if (tmp[item] == "") {
      if (tmp[item] == "") {
        continue;
      }
      let pos = source.indexOf(tmp[item]) + tmp[item].length;
      formatPlus.push(pos < source.length ? source[pos] : "");
      formatSlices.push(tmp[item]);
    }
  }
};

/**
 * @brief read data in a formatted string
 * @param input {string} 
 * @param format {string} limited %s %d %x
 */
function scanf(input, format){
  if(input == "" || input == undefined) return null;
  if(format == "" || format == undefined) return null;
  let re = "";
  let argIndex = 1;
  for(let i=0; i < format.length; i++){
    if(format[i] == "%"){
      let type = format[i+1];
      if(type == "s"){
        re += "(\\S+)";
      }else if(type == "d"){
        re += "(\\d+)";
      }else if(type == "x"){
        re += "([0-9a-fA-F]+)";//260129 解决不支持A-F字符。 增加A-F
      }
      i++;
      argIndex++;
    }else{
      re = re + "\\" + format[i];
    }
  }
  const match = input.match(re);
  if(!match){
    return null;
  }
  match.shift();
  return match;
}
/**
 * @brief push one rule to rules_array
 * @param AddressRule {[]} 
 * @param rule {object} 
 * @param rn {string}
 * @param devname {string}
 */
function pushRules(addressRule, rule, rn, devname) {
  if (rn.indexOf("AddressRuleName") != 0) return;
  let format, scope;
  if (rule["AddressFormat"] != undefined) {
    format = rule["AddressFormat"]
  }
  if (rule["AddressScope"] != undefined) {
    scope = rule["AddressScope"];
  }
  let taken = "", pos = -1;
  while ((pos = scope.indexOf(";")) != -1) {
    let segment = scope.substr(0, pos); // format: DEVID:%d:0-65535: / STRING1:-:默认值:
    if (segment.indexOf("STRING") != -1) { // 未测试
      taken = taken + (segment.substr(0, segment.indexOf(':', segment.indexOf(':') + 1) + 1)); // STRING1:-: (with :)
      taken = taken + XML_DEVADDR_SCOPE_DELIMITER;
    } else {
      if (segment[segment.length-1] != ':') {
        segment += ':';
      }          
      taken = taken + (segment.substr(0, segment.lastIndexOf(":"))); // DEVID:%d:0-65535 (without :)
      taken = taken + XML_DEVADDR_SCOPE_DELIMITER;
    }
    scope = scope.substr(pos + 1); // taken: DEVID:%d:0-65535;STRING1:-:;
  }
  addressRule.push({
    "format": format, "scope": taken, "sample": "", "desc": "",
    "segment": { "type": "", "desc": "", "range": "" },
    "scopesegs": [], "control": ""
  });
  // if ("STRING1" == format) {
  //   this.allDevsCheckType_.set(devname, (allDevsCheckType_.get(devname) | DEVICE_ADDRESS_NOT_CHECK));
  // }
}

module.exports = CheckModule;