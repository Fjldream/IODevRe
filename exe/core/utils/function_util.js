/**
 * @name function_util.js
 * @desc 包含KC开发系统公共方法
 * @auth jinlong.feng
 * @date 2025-07-08
 * @version 1.0.0.1
 */
const nanoid  = require('nanoid');
const dayjs = require('dayjs');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

class Util {
    /**
     * @method nanoId
     * @description 获取nanaoID
     * @param null
     * @returns
     */
    nanoId() {
        return nanoid();
    }
    /**
     * @method getNowDTStr
     * @description 获取当前时刻的字符串日期+时间
     * @param null
     * @returns {String}
     */
    getNowDTStr() {
        return dayjs().format('YYYY-MM-DD HH:mm:ss');
    }
    /**
     * @method dateObjToDateStr
     * @description Date对象转为 YYYY-MM-DD
     * @param {Date Object} date
     * @returns
     */
    dateObjToDateStr(date) {
        return dayjs(date).format('YYYY-MM-DD');
    }
    /**
     * @method timeObjToTimeStr
     * @description Time对象转为 HH:mm:ss
     * @param {Time Object} time
     * @returns
     */
    timeObjToTimeStr(time) {
        return dayjs(time).format('HH:mm:ss');
    }
    /**
     * @method dTObjToDTimeStr
     * @description Date对象转为 'YYYY-MM-DD HH:mm:ss'
     * @param {Date Object} date
     * @returns
     */
    dTObjToDTimeStr(ts) {
        return dayjs(ts).format('YYYY-MM-DD HH:mm:ss');
    }
    /**
     * @method dT2ObjToDT2imeStr
     * @description Date对象转为 'YYYY-MM-DD HH:mm:ss.SSS'
     * @param {Date Object} date
     * @returns
     */
    dT2ObjToDT2imeStr(ts) {
        return dayjs(ts).format('YYYY-MM-DD HH:mm:ss.SSS');
    }
    /**
     * @method osType
     * @description 获取操作系统名称
     * @param {null}
     * @returns
     */
    osType() {
        let osTypeStr = null;
        switch (os.type()) {
            case 'Windows_NT':
                osTypeStr = 'win';
                break;
            case 'Linux':
                osTypeStr = 'linux';
                break;
            case 'Darwin':
                osTypeStr = 'mac';
                break;
            default:
                break;
        }
        return osTypeStr;
    }
    /**
     * @method osArch
     * @description 获取操作系统CPU架构
     * @param {null}
     * @returns
     */
    osArch() {
        return os.arch();
    }
    /**
     * @method osHostName
     * @description 获取操作系统主机名
     * @param {null}
     * @returns
     */
    osHostName() {
        return os.hostname();
    }
    /**
     * @method getDataType
     * @description 获取值的数据类型
     * @param {any}
     * @returns
     */
    getDataType(value) {
        if (typeof value === 'boolean' || value === null || typeof value === 'undefined') {
            return 1; // 离散值  Bool/Null/Undefined
        }
        if (typeof value === 'string') {
            if (value === 'true') {
                // 字符串的true/false作为bool值
                return 1;
            }
            if (value === 'false') {
                return 1;
            }
            return 11; //字符串            String
        }
        if (typeof value === 'number' && Number.isInteger(value) && value >= -128 && value <= 127) {
            return 2; //有符号8位整数 Byte
        }
        if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255) {
            return 3; //无符号8位整数  Unsigned Byte
        }
        if (typeof value === 'number' && Number.isInteger(value) && value % 1 === 0 && value >= -32768 && value <= 32767) {
            return 4; //有符号16位整数   Short
        }
        if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 65535) {
            return 5; //无符号16位整数    Unsigned Short
        }
        if (typeof value === 'number' && Number.isInteger(value) && value % 1 === 0 && value >= -2147483648 && value <= 2147483647) {
            return 6; //有符号32位整数    Int
        }
        if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4294967295) {
            return 7; //无符号32位整数    Unsigned Int
        }
        if (typeof value === 'bigint') {
            return 8; //有符号64位整数    Long
        }
        if (typeof value === 'number' && Math.fround(value) === value) {
            return 9; //单精度浮点        Float
        }
        if (typeof value === 'number' && Math.fround(value) !== value) {
            return 10; //双精度浮点        Double
        }
    }

    /**
     * @method dateFormat
     * @description 格式化日期时间
     * @param {Date} date 要格式化的日期时间
     * @param {String} fmt 指定格式
     * @returns 指定格式的日期时间字符串
     */
    dateFormat(date, fmt) {
        if (null == date || undefined == date || date == '0000-00-00 00:00:00.000000') return '';
        function getS(milliseconds) {
            if (milliseconds < 10) {
                milliseconds = '00' + milliseconds;
            }
            if (milliseconds > 9 && milliseconds < 100) {
                milliseconds = '0' + milliseconds;
            }
            return milliseconds;
        }
        var o = {
            'M+': date.getMonth() + 1,
            'd+': date.getDate(),
            'h+': date.getHours(),
            'm+': date.getMinutes(),
            's+': date.getSeconds(),
            'S': getS(date.getMilliseconds()),
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
        for (var k in o) if (new RegExp('(' + k + ')').test(fmt)) fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
        return fmt;
    }
    //判断该值是否是数组
    isArray(arr) {
        return Object.prototype.toString.call(arr) === '[object Array]';
    }
    //判断是否是类数组
    isArrayLike(value) {
        var self = this;
        return value != null && self.isLength(value.length) && !self.isFunction(value);
    }
    //判断该值是否是原型对象
    isPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }
    // 判断是否为Map
    isMap(value) {
        return Object.prototype.toString.call(value) === '[object Map]';
    }
    // 判断是否为Set
    isSet(value) {
        return Object.prototype.toString.call(value) === '[object Set]';
    }
    //判断值是否为空
    isEmpty(value) {
        let self = this;
        if (value == null || value == undefined || value === '') {
            return true;
        }
        if (self.isArrayLike(value)) {
            return !value.length;
        } else if (self.isPlainObject(value)) {
            for (let key in value) {
                if (hasOwnProperty.call(value, key)) {
                    return false;
                }
            }
            return true;
        } else if (self.isMap(value) || self.isSet(value)) {
            return value.size <= 0;
        }
        return false;
    }
    //判断是否是带length属性的值
    isLength(value) {
        return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= Number.MAX_SAFE_INTEGER;
    }
    // 判断是否是方法
    isFunction(value) {
        return Object.prototype.toString.call(value) === '[object Function]';
    }
    //判断该值是否是引用类型的对象
    isObject(value) {
        var type = typeof value;
        return value != null && (type == 'object' || type == 'function');
    }
    // 判断是不是json格式
    isJsonString(str) {
        try {
            if (typeof JSON.parse(str) === 'object') {
                return true;
            }
        } catch (e) {}
        return false;
    }
    // 获取客户端IP
    getClientIp(req) {
        let realClientIp = '';
        try {
            let clientIp =
                req.headers['x-forwarded-for'] || //判断是否有反向代理IP
                req.connection.remoteAddress || //判断connection的远程IP
                req.socket.remoteAddress || //判断后端的socket的IP
                req.connection.socket.remoteAddress;
            realClientIp = clientIp.replace('::ffff:', '');
            if (realClientIp.indexOf(':') > -1) {
                realClientIp = realClientIp.slice(0, realClientIp.indexOf(':'));
            }
        } catch (e) {
            console.log('getClientIp faild:' + e.message);
        }
        return realClientIp;
    }
    //aes加密
    _innerEncode(index) {
        index = JSON.stringify(index);
        const cipher = crypto.createCipher('aes128', 'key');
        let newPsd = '';
        newPsd += cipher.update(index, 'utf8', 'hex');
        newPsd += cipher.final('hex');
        index = newPsd;
        return index;
    }
}

module.exports = new Util();
