var fs = require('fs');
var path = require('path');
var publicClass = require('./PublicInterface');//公用函数接口
var pubInter = new publicClass();
var xml2js = require("xml2js");

function KingConfigModule() {
    
}

/**
 * @brief 当前xml文件的路径
 * @note  静态对象
 */
KingConfigModule.prototype.xmlFilePath = "";
/**
 * @brief 当前xml文件的名称
 * @note  静态对象
 */
KingConfigModule.prototype.xmlFileName = "";
/**
 * @brief 当前xml文件的驱动名称
 * @note  静态对象
 */
KingConfigModule.prototype.driverName = "";

/**
 * @brief 获取当前驱动xml文件路径
 * @param strXmlPath {string} xml文件路径
 * @return 
 */
KingConfigModule.prototype.setXmlPath = function (strXmlPath) {
    this.xmlFilePath = strXmlPath;
    this.driverName = pubInter.getFileName(strXmlPath);
    this.xmlFileName = this.driverName + ".xml";
}

/**
 * @brief 获取一个驱动是否有寄存器通道类型是string，如果有的话，该驱动不会被校验
 * @param strXmlPath {string} xml文件路径
 * @param strDriverName {string} 驱动名称
 * @return 
 */
KingConfigModule.prototype.isStringFormat = async function (strXmlPath, strDriverName, isCheckDev, driverSeries) {
    return new Promise((resolve, reject) => {
        let buf = fs.readFileSync(strXmlPath, "utf-8");
        var objRes = {
            Error:false,
            ErrorDesc:"",
            isString:false
        }
        let strDriverXmlName = strDriverName + ".xml";
        xml2js.parseString(buf, { explicitArray: false }, function (err, json) {
            if (err) {
                console(err.message);
                resolve({
                    Error:true,
                    ErrorDesc:err.message,
                    isString:false
                });
                return;
            }
            if (typeof (json["XML"]) == 'object') {
                if (json["XML"][strDriverName] == undefined || typeof(json["XML"][strDriverName]) != "object") {
                    objRes.Error = true;
                    objRes.ErrorDesc = "xml文件在XML->" + strDriverName + "处格式不正确";
                    resolve(objRes);
                    return;
                }
                for (let x in json["XML"][strDriverName]) {
                    if (typeof (json["XML"][strDriverName][x]) == 'object') {
                        strDriverXmlName = "XML";
                        break;
                    }
                }
            }
            if (json[strDriverXmlName][strDriverName] == undefined || typeof(json[strDriverXmlName][strDriverName]) != "object") {
                objRes.Error = true;
                objRes.ErrorDesc = "xml文件在" + strDriverXmlName + "->" + strDriverName + "处格式不正确";
                resolve(objRes);
                return;
            }
            for (let x in json[strDriverXmlName][strDriverName]) {
                if (typeof (json[strDriverXmlName][strDriverName][x]) == 'object') {
                    if (json[strDriverXmlName][strDriverName][x].RegisterInfo == undefined || typeof(json[strDriverXmlName][strDriverName][x].RegisterInfo) != "object") {
                        objRes.Error = true;
                        objRes.ErrorDesc = "xml文件在" + strDriverXmlName + "->" + strDriverName + "->" + x + "->RegisterInfo处格式不正确";
                        resolve(objRes);
                        return;
                    }

                    //check device
                    if(isCheckDev) {
                        for (var key in json[strDriverXmlName][strDriverName][driverSeries].AddressInfo) {
                            var objDevInfo = json[strDriverXmlName][strDriverName][driverSeries].AddressInfo[key];
                            if(objDevInfo.AddressFormat == "STRING1") {
                                objRes.isString = true;
                                resolve(objRes);
                                return;
                            }
                        }

                    } else {
                        //check register
                        for (var key in json[strDriverXmlName][strDriverName][x].RegisterInfo) {
                            let nRuleCount = 1;
                            let nStringRule = 0;
                            var objRegisterInfo = json[strDriverXmlName][strDriverName][x].RegisterInfo[key];
                            while (objRegisterInfo["RegisterRule" + nRuleCount] != undefined) {
                                if (objRegisterInfo["RegisterRule" + nRuleCount].RegFormat == "STRING1") {
                                    nStringRule++;
                                }
                                nRuleCount++;
                            }
                            if (nStringRule == nRuleCount - 1 && nStringRule != 0) {
                                objRes.isString = true;
                                this.xmlFileInfo = json;
                                resolve(objRes);
                                return;
                            }
                        }

                    }                        
                }
            }
            this.xmlFileInfo = json;
            resolve(objRes);
        })
    })
}

/**
 * @brief 获取一个寄存器的RegType
 * @param strDriverSeries {string} 设备系列名称
 * @param strRegName {string} 寄存器名称
 * @return 
 */
let global_drnmARegnm2nCount = {};//260414 gxx {drivername_driverseries_regname:ncount}
KingConfigModule.prototype.getRegType = async function (strDriverSeries, strRegName) {
    return new Promise((resolve, reject) => {
        if (this.xmlFilePath == "") {
            resolve(-1);
            return;
        }
        let buf = fs.readFileSync(this.xmlFilePath, "utf-8");
        var strDriverXmlName = this.xmlFileName;
        var strDriverName = this.driverName;
        if(global_drnmARegnm2nCount[`${strDriverName}_${strDriverSeries}_${strRegName}`] != undefined){//260414 gxx 
            resolve(global_drnmARegnm2nCount[`${strDriverName}_${strDriverSeries}_${strRegName}`]);//260414 gxx 
            return;
        }
        //若寄存器的名称为数字，则要在它的前边加上“XmlNumNode”
        var regPos = /^\d+(\.\d+)?$/; //非负浮点数
        if (regPos.test(strRegName[0])) {
            strRegName = "XmlNumNode" + strRegName;
        }
        xml2js.parseString(buf, { explicitArray: false }, function (err, json) {
            if (typeof (json["XML"]) == 'object') {
                if (typeof (json["XML"][strDriverName]) == 'object') {
                    strDriverXmlName = "XML";
                }
            }
            var bFind = false;
            for (let x in json[strDriverXmlName][strDriverName]) {
                if (typeof (json[strDriverXmlName][strDriverName][x]) == 'object' && x == strDriverSeries) {
                    let nCount = 0;
                    bFind = true;
                    for (var key in json[strDriverXmlName][strDriverName][x].RegisterInfo) {
                        if (key == strRegName ) {
                            global_drnmARegnm2nCount[`${strDriverName}_${strDriverSeries}_${strRegName}`] = nCount;//260414 gxx 
                            resolve(nCount);
                            return;
                        }
                        nCount++;
                    }
                    resolve(-3);//表示没找到这个寄存器
                    return;
                }
            }
            resolve(-2);
            return;
        })
    })
}

module.exports = KingConfigModule