/**
 * 文件名:  utils.js
 * 描述:    通用工具类
 * 版本:   1.0
 */

const utils = {};

utils.util = require('./function_util');
utils.cryptico = require('./cryptico');
utils.request_handler = require('./request_handler');
utils.upload = require('./upload');
module.exports = utils;
