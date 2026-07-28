var log4js = require('log4js');
var fs = require('fs');
var publicClass = require('./PublicInterface');//公用函数接口
var pubInter = new publicClass();

const logconfig = require(__dirname + '/../../common/log4js/index');

function LogInterface(){

}

if (!fs.existsSync("./config/logconfig.json")) {

}
var _logconfig = JSON.parse(fs.readFileSync("./config/logconfig.json"));
// if(!fs.existsSync(_logconfig.appenders.writefile.filename)){
//     console.log(`1111`)
    
// }
log4js.configure(_logconfig);

var _logger = log4js.getLogger();


/**
 * @brief 打印日志,等级debug
 * @param logStr {string} 需要打印的信息
 * @param moduleName {string} 打印的信息的模块名称
 * @note  TRACE < DEBUG < INFO < WARN < ERROR < FATAL < MARK
 * @return 
 */
LogInterface.prototype.debugLog = function(moduleName, logStr){
    var printStr = logStr;
    if(typeof logStr == "object"){
        printStr = JSON.stringify(logStr);
    }
    _logger.debug(moduleName + ": " + printStr);
}

/**
 * @brief 打印日志,等级 info
 * @param logStr {string} 需要打印的信息
 * @param moduleName {string} 打印的信息的模块名称
 * @note  
 * @return 
 */
LogInterface.prototype.infoLog = function(moduleName, logStr){
    var printStr = logStr;
    if(typeof logStr == "object"){
        printStr = JSON.stringify(logStr);
    }
    _logger.info(moduleName + ": " + printStr);
}

/**
 * @brief 打印日志,等级 trace
 * @param logStr {string} 需要打印的信息
 * @param moduleName {string} 打印的信息的模块名称
 * @note  
 * @return 
 */
LogInterface.prototype.traceLog = function(moduleName, logStr){
    var printStr = logStr;
    if(typeof logStr == "object"){
        printStr = JSON.stringify(logStr);
    }
    _logger.trace(moduleName + ": " + printStr);
}

/**
 * @brief 打印日志,等级 warn
 * @param logStr {string} 需要打印的信息
 * @param moduleName {string} 打印的信息的模块名称
 * @note  
 * @return 
 */
LogInterface.prototype.warnLog = function(moduleName, logStr){
    var printStr = logStr;
    if(typeof logStr == "object"){
        printStr = JSON.stringify(logStr);
    }
    _logger.warn(moduleName + ": " + printStr);
}

/**
 * @brief 打印日志,等级 error
 * @param logStr {string} 需要打印的信息
 * @param moduleName {string} 打印的信息的模块名称
 * @note  
 * @return 
 */
LogInterface.prototype.errorLog = function(moduleName, logStr){
    var printStr = logStr;
    if(typeof logStr == "object"){
        printStr = JSON.stringify(logStr);
    }
    _logger.error(moduleName + ": " + printStr);
}

/**
 * @brief 打印日志,等级 fatal
 * @param logStr {string} 需要打印的信息
 * @param moduleName {string} 打印的信息的模块名称
 * @note  
 * @return 
 */
LogInterface.prototype.fatalLog = function(moduleName, logStr){
    var printStr = logStr;
    if(typeof logStr == "object"){
        printStr = JSON.stringify(logStr);
    }
    _logger.fatal(moduleName + ": " + printStr);
}

/**
 * @brief 打印日志,等级 mark
 * @param logStr {string} 需要打印的信息
 * @param moduleName {string} 打印的信息的模块名称
 * @note  
 * @return 
 */
LogInterface.prototype.markLog = function(moduleName, logStr){
    var printStr = logStr;
    if(typeof logStr == "object"){
        printStr = JSON.stringify(logStr);
    }
    _logger.mark(moduleName + ": " + printStr);
}

/**
 * @brief 按照总体组的要求写日志
 * @param logStr {string} 需要打印的信息
 * @param moduleName {string} 打印的信息的模块名称
 * @note  
 * @return 
 */
LogInterface.prototype.WriteLog = function (ProjectID, UserName, LogContent) {
    var strNowtime = pubInter.getCurrentTime();
    var strLogPath = "../../../../sdb/logs/kingioserver/" + ProjectID + "/kiooperation.log";
    if (fs.existsSync("../../../../sdb/logs/kingioserver/" + ProjectID)) {
        pubInter.recursiveMakeDir("../../../../sdb/logs/kingioserver/" + ProjectID);
    }
    let strNewLog = strNowtime + " operate " + UserName + " " + LogContent + "\r\n";
    fs.appendFile(strLogPath, strNewLog, function (err) {
        if (err) {
            return 1;
        } else {
            return 0;
        }
    })
}
LogInterface.prototype.useLogger = function (app, logger) {
    app.use(log4js.connectLogger(logger || log4js.getLogger('http')));
}

module.exports = LogInterface
