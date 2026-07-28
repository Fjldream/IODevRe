const fs = require('fs');
var path= require("path");
const { exit } = require('process');
const xss = require("xss");
const Json2csvParser = require('json2csv').Parser;
var iconv = require('iconv-lite');
function getFileName(strPath){
    let strOutPath = path.basename(strPath);
    strOutPath = strOutPath.substring(0, strOutPath.lastIndexOf("."));
    return strOutPath
}

class publicInterface{
    constructor(){}
    
    /**
     * @brief 获取当前时间
     * @note  ;
     * @return 当前时间字符串 //2020-04-03 09:06:23
     */
    getCurrentTime(){
        var currentDate=new Date();
        var currentDay=("0"+currentDate.getDate()).slice(-2);
        var currentMonth=("0"+(currentDate.getMonth()+1)).slice(-2);
        var currentHour=("0"+currentDate.getHours()).slice(-2);
        var currentMinute=("0"+currentDate.getMinutes()).slice(-2);
        var currentSecond=("0"+currentDate.getSeconds()).slice(-2);
        var currentMillSecond = currentDate.getMilliseconds()
        var currentTime=currentDate.getFullYear()+"-"+(currentMonth)+"-"+(currentDay)+" "+(currentHour)+":"+(currentMinute)+":"+(currentSecond) + "." + currentMillSecond;
        return currentTime;
    }

    /**
     * @brief 获取当前时间
     * @note  ;
     * @return 当前时间字符串 //2020-04-03 09:06:23
     */
    getTimeFormat(date){
        var currentDay=("0"+date.getDate()).slice(-2);
        var currentMonth=("0"+(date.getMonth()+1)).slice(-2);
        var currentHour=("0"+date.getHours()).slice(-2);
        var currentMinute=("0"+date.getMinutes()).slice(-2);
        var currentSecond=("0"+date.getSeconds()).slice(-2);
        var currentMillSecond = date.getMilliseconds()
        var currentTime=date.getFullYear()+"-"+(currentMonth)+"-"+(currentDay)+" "+(currentHour)+":"+(currentMinute)+":"+(currentSecond) + "." + currentMillSecond;
        return currentTime;
    }

    //add by tingting.wang 生成普通设备ID和ua设备ID
     /**
     * @brief 生成普通设备和ua设备的deviceID 其中普通设备设备的范围1-512 ua设备>512   
     * @note  若当前设备ID为(1 2 5 513 515) 新建普通设备 返回3 若新建ua设备返回514; 若当前设备ID为(1 2 3 513 514) 新建普通设备返回4 若新建ua设备返回515
     * @return deviceID 
     */
    generateDeviceID(deviceObj, isUa=false) {
        var largestNum = 1;
        if (deviceObj.DeviceList.length == 0) {
            if(isUa)
            {
                largestNum = 513;
            }
            return largestNum;
        }
        if(isUa)
        {
            var numSet = new Set();
            for (var k = 0; k < deviceObj.DeviceList.length; k++) {
                if(deviceObj.DeviceList[k].DeviceID > 512)
                {
                    numSet.add(deviceObj.DeviceList[k].DeviceID); //只统计1-512范围的deviceID
                }
            }
            //const filtered = Array.from(numSet).filter(num => num >= 513).sort((a, b) => a - b);
            let current = 513;
            // 遍历排序后的数组，检查连续值
            for (const num of numSet) {
                if (num === current) {
                    current++;
                } else {
                    // 找到缺失值，直接返回
                    return current;
                }
            }
            // 若所有 filtered 元素都连续，返回最后一个值+1（如 filtered=[513,514,515] 则返回 516）
            return current;
        }
        else
        {
            var numSet = new Set();
            for (var k = 0; k < deviceObj.DeviceList.length; k++) {
                if(deviceObj.DeviceList[k].DeviceID < 513)
                {
                    numSet.add(deviceObj.DeviceList[k].DeviceID); //只统计1-512范围的deviceID
                }
            }
            for (var i = 0; i < deviceObj.DeviceList.length; i++) {
                if (!numSet.has(i + 1)) {
                    largestNum = i+1;
                    return largestNum;
                }
            }
            return Math.max(...numSet) + 1;
        }
    }
//add end tingting.wang
    //递归创建目录 pathname：路径
    recursiveMakeDir(pathname){
        return makeDir(pathname);
    }

    //递归删除目录 pathOfFile：路径
    delFileAndDir(pathOfFile){
        return deleteDir(pathOfFile);
    }

    //文件拷贝
    proFileCopy(sourPath, desPaht, fileName) {
        return copyDir(sourPath, desPaht, fileName)
    }
    //判断是否为uuid格式 260409 gxx
    isValidGUID(guid) {
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return guidRegex.test(guid);
    }
    //读json文件
    readJson(strPath) {
        let objJson = {};
        let strOutPath = getFileName(strPath);
        if(fs.existsSync(strPath)){
            let strJson = "";
            try {
                strJson = fs.readFileSync(strPath);
            } catch (error) {
                objJson.Error = true;
                objJson.ErrorDesc = "读取" + strOutPath + "失败";
                return objJson;
            }
            try {
                objJson.data = JSON.parse(strJson);
                objJson.Error = false;
            } catch (error) {
                objJson.Error = true;
                objJson.ErrorDesc = error.message;
                console.log(error.message);
                return objJson;
            }
        }
        else{
            objJson.Error = true;
            objJson.ErrorDesc = strOutPath + " 不存在";
            return objJson;
        }
        return objJson;
    }

    //写json文件
    writeJson(strPath, objJson) {
        let strOutPath = getFileName(strPath);
        if (objJson.Error != undefined) {
            delete objJson.Error;
        }
        let strJson = JSON.stringify(objJson, "", "\t");
        try {
            fs.writeFileSync(strPath, strJson);
        } catch (error) {
            return strOutPath + "写入失败";
        } 
        return "OK";
    }
    //
    writeCsv(arrExportVarInfo, strCsvPath, sysType) {
        return doWriteCsv(arrExportVarInfo, strCsvPath, sysType);
    }
    // modified by  jinlong.feng at 0727 CSV导入编码兼容修改
    decodeImportCsvFile(buffer) {
        return doDecodeImportCsvFile(buffer);
    }
    // end
    //路径拼接
    joinPath(ProjectID, ProjectEdition, ProjectName){
        if( global.productType == 1){
          return global.sdbPath + '/' + ProjectID + '/' + ProjectEdition + '/project';
        }else if( global.productType == 2){
          return global.sdbPath + '/' + ProjectName;
        }
    }

    //唯一标示函数
    getUUID() { // 获取唯一值
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    //将所有的信息进行编码
    EscapeAllData(objEncode) {
        return EscapeAll(objEncode);
    }

    //将路径字符串改成只有文件名的字符串
    getFileName(strPath){
        return getFileName(strPath);
    }

    //将一个对象中的所有属性名称首字母改为小写
    convertObjToLowerCase(objInput){
        return convertObjToLowerCase(objInput)
    }

    //将一个对象中的所有属性名称首字母改为大写
    convertObjToUpperCase(objInput){
        return convertObjToUpperCase(objInput)
    }

    //获取一个字符串的字节数而不是字符数
    getStringBytes(str, charset) {
        var total = 0, charCode;
        charset = charset ? charset.toLowerCase() : '';
        if (charset == 'utf-16' || charset == 'utf16') {
            for (let i = 0; i < str.length; i++) {
                charCode = str.charCodeAt(i);
                if (charCode <= 0xffff) {
                    total += 2;
                } else {
                    total += 4;
                }
            }
        } else {
            for (let i = 0; i < str.length; i++) {
                charCode = str.charCodeAt(i);
                if (charCode <= 0x007f) {
                    total += 1;
                } else if (charCode <= 0x07ff) {
                    total += 2;
                } else if (charCode <= 0xffff) {
                    total += 3;
                } else {
                    total += 4;
                }
            }
        }
        let nLL = str.length;
        return total;
    }
}
function makeDir(pathname){
    if(fs.existsSync(pathname)){
        return true;
    }else{
        if(makeDir(path.dirname(pathname))){
            try {
                fs.mkdirSync(pathname);
            } catch (error) {
                return false;
            }
            return true;
        }
    }
}
function deleteDir(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file) {
            var curPath = path + "/" + file;
            try {
                var bDirectory = fs.statSync(curPath).isDirectory()
            } catch (error) {
                // LogManagerObj.debugLog(projectManagerName, error.message);
                return error.message;
            }
            if (bDirectory == true) { // recurse
                deleteDir(curPath);
            } else { // delete file
                try {
                    fs.unlinkSync(curPath);
                } catch (error) {
                    // LogManagerObj.debugLog(projectManagerName, error.message);
                    return error.message;
                }
            }
        });

        try {
            fs.rmdirSync(path);
        } catch (error) {
            // LogManagerObj.debugLog(projectManagerName, error.message);
            return error.message;
        }
    }
    else {
        return path + "不存在";
    }
    return "OK";
}
function copyDir(sourPath, desPaht, fileName){
    try {
        var dirs = fs.readdirSync(sourPath);
    } catch (error) {
        return error.message;
    }   
    dirs.forEach(function (item) {
        fileName.push(item);
        var item_path = path.join(sourPath, item);
        try {
            var temp = fs.statSync(item_path);
        } catch (error) {
            return error.message;
        }
        
        if (temp.isDirectory() == false) {
            var filePaht = desPaht + "/" + item;
            try {
                fs.copyFileSync(item_path, filePaht);
            } catch (error) {
                return error.message;
            }
        } else {
            var foludPath = desPaht + "/" + item;
            try {
                //260409 gxx
                let exist = true;
                try {
                    const stats = fs.statSync(foludPath);
                    exist = stats.isDirectory();
                } catch (error) {
                    exist = false;
                }
                if(!exist) fs.mkdirSync(foludPath);
                ///
            } catch (error) {
                return error.message; 
            }

            let strResCopy = copyDir(sourPath + "/" + item, foludPath, fileName);
            if (strResCopy != "OK") {
                return strResCopy
            }
        }
    });
    return "OK";
}

function EscapeAll(objEncode) {
    var objOut = {};
    //var arrOut = [];
    if (typeof objEncode == "object") {
        if (Array.isArray(objEncode)) {
            objOut = [];
        }
        for (const key in objEncode) {
            if (objEncode.hasOwnProperty(key)) {
                if (typeof objEncode[key] == "object" && !Array.isArray(objEncode[key])) {
                    objOut[key] = EscapeAll(objEncode[key]);
                } else if (typeof objEncode[key] == "object" && Array.isArray(objEncode[key])){
                    let arrOut = [];
                    arrOut = EscapeAll(objEncode[key]);
                    objOut[key] = JSON.parse(JSON.stringify(arrOut));
                } else if (typeof objEncode[key] == "string"){
                    objOut[key] = xss(objEncode[key]);
                } else {
                    objOut[key] = objEncode[key];
                }
            }
        }
    } else if (typeof objEncode == "string") {
        objOut = "";
        objOut = xss(objEncode);
    } else {
        objOut = objEncode; 
    }
    return objOut;
}

function convertObjToLowerCase(objInput){
    if (typeof(objInput) == "object") {
        var objNew = {};
        if (Array.isArray(objInput)) {//判断输入对象是否为数组
            var arrNew = [];
            for (let i = 0; i < objInput.length; i++) {
                if (typeof(objInput[i]) == "object") {
                    arrNew.push(convertObjToLowerCase(objInput[i]))
                } else {
                    arrNew.push(objInput[i]);
                }
            }
            return arrNew;
        } else {
            for (const key in objInput) {
                if (objInput.hasOwnProperty(key) && typeof(key) == "string") {
                    let cFirstCase = key[0].toLowerCase();
                    let strNewKey = cFirstCase + key.substring(1, key.length);
                    strNewKey = strNewKey.replace(/ID/g, "Id");
                    if (key == "CLSID") {
                        strNewKey = "clsid";
                    }
                    objNew[strNewKey] = objInput[key];
                    if (typeof objInput[key] == "object") {
                        objNew[strNewKey] = convertObjToLowerCase(objInput[key]);
                    }
                } 
            }
            return objNew;
        }       
    } else if (typeof(objInput) == "string"){
        let cFirstCase = objInput[0].toLowerCase();
        let strNewKey = cFirstCase + objInput.substring(1, objInput.length);
        strNewKey = strNewKey.replace(/ID/g, "Id");
        if (objInput == "CLSID") {
            strNewKey = "clsid";
        }
        return strNewKey;
    }
}

function convertObjToUpperCase(objInput){
    if (typeof(objInput) == "object") {
        var objNew = {};
        if (Array.isArray(objInput)) {//判断输入对象是否为数组
            var arrNew = [];
            for (let i = 0; i < objInput.length; i++) {
                if (typeof(objInput[i]) == "object") {
                    arrNew.push(convertObjToUpperCase(objInput[i]))
                } else {
                    arrNew.push(objInput[i]);
                }
            }
            return arrNew;
        } else {
            for (const key in objInput) {
                if (objInput.hasOwnProperty(key) && typeof(key) == "string") {
                    let cFirstCase = key[0].toUpperCase();
                    let strNewKey = cFirstCase + key.substring(1, key.length);
                    strNewKey = strNewKey.replace(/Id/g, "ID");
                    if (key == "clsid") {
                        strNewKey = "CLSID";
                    }
                    objNew[strNewKey] = objInput[key];
                    if (typeof objInput[key] == "object") {
                        objNew[strNewKey] = convertObjToUpperCase(objInput[key]);
                    }
                } 
            }
            return objNew;
        }       
    } else if (typeof(objInput) == "string"){
        let cFirstCase = objInput[0].toUpperCase();
        let strNewKey = cFirstCase + objInput.substring(1, objInput.length);
        strNewKey = strNewKey.replace(/Id/g, "ID");
        if (objInput == "clsid") {
            strNewKey = "CLSID";
        }
        return strNewKey;
    }
}
//20240222 
//将变量信息写入csv文件
function doWriteCsv(arrExportVarInfo, strCsvPath, sysType) {
    if (typeof arrExportVarInfo != "object"|| arrExportVarInfo.length == 0) {
      return false;
    }
    let fields = Object.keys(arrExportVarInfo[0]);//获取对象的所有属性
    const json2csvParser = new Json2csvParser({ fields });
    const csv = json2csvParser.parse(arrExportVarInfo);
    var newCsv;
    if( sysType == 1){
      newCsv = iconv.encode(csv, 'GBK');
    }else{
      newCsv = csv;
    }
    try {
      fs.writeFileSync(strCsvPath, newCsv); 
    } catch (error) {
      console.error(error.message);
      return false;
    }
    return true;
}

// modified by  jinlong.feng at 0727 CSV导入编码兼容修改
function doDecodeImportCsvFile(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        return buffer == undefined ? "" : String(buffer);
    }
    if (buffer.length >= 3 && buffer[0] == 0xEF && buffer[1] == 0xBB && buffer[2] == 0xBF) {
        return buffer.toString('utf8').replace(/^\uFEFF/, '');
    }
    let utf8Text = buffer.toString('utf8');
    let utf8Buffer = Buffer.from(utf8Text, 'utf8');
    if (utf8Buffer.length == buffer.length && utf8Buffer.equals(buffer)) {
        return utf8Text;
    }
    return iconv.decode(buffer, 'GB18030');
}
// end

module.exports =  publicInterface;
