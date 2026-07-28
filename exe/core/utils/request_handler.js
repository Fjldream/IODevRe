/**
 * 文件名:  request_handler.js
 * 描述:    获取请求体
 * 版本:   1.0
 */

const crypto = require("crypto-js")
module.exports = {
    httpGetData(request, response) {
        if ("GET" !== request.method) {
            return null;
        };
        let params = request.query;
        return params;
    },
    httpPostData(request, response) {
        if ("POST" !== request.method) {
            return null;
        };
        let postData = {};
        if (request.body) {
            postData = request.body;
        }
        return postData;
    },
    httpPutData(request, response) {
        if ("PUT" !== request.method) {
            return null;
        };
        let putData = null;
        if (request.body) {
            putData = request.body;
        }

        return putData;
    },
    httpDeleteData(request, response) {
        if ("DELETE" !== request.method) {
            return null;
        };
        let deleteData = {};
        if (request.body) {
            deleteData = request.body;
        }
        return deleteData;
    },
    httpOptionsData(request, response) {
        if ("OPTIONS" !== request.method) {
            return null;
        };
        response.header("Access-Control-Allowed-Origin", request.headers.origin);
        response.header("Access-Control-Allowed-Method", "GET, POST, PUT, DELETE, OPTIONS");
        response.end();
    },
    /**
     * 获取请求方真实IP
     * @param {*} request 
     */
    getReqIP(request) {
        let clientIp = request.headers['x-forwarded-for'] || //判断是否有反向代理IP
            request.connection.remoteAddress || //判断connection的远程IP
            request.socket.remoteAddress || //判断后端的socket的IP
            request.connection.socket.remoteAddress;
        return clientIp.replace("::ffff:", "");
    },
    /**
     * 获取客户端浏览器详情
     * @param {*} request 
     * @returns 
     */
    getUserAgent(request) {
        return request.headers['user-agent']; //获取客户端浏览器详情
    },
    /**
     * 获取Token
     * @param {*} request 
     * @returns 
     */
    getToken(request) {
        //校验请求头上是否有用户认证信息
        let authorToken = request.headers.authorization;
        if (!authorToken) {
            return null;
        }
        //校验请求头上是否携带token
        let userToken = authorToken.split(" ")[1];
        return userToken;
    },
    decryptPostData(postData) {
        try {
            let bytes = crypto.AES.decrypt(postData, "publickey");
            let decryptData = bytes.toString(crypto.enc.Utf8);
            let requestData = JSON.parse(decryptData);
            return requestData;
        } catch (error) {
            logger.log("error", `decryptPostData err: ${error.stack}`)
            return null;
        }
    },
    decryptImgModuleData(postData) {
        try {
            let bytes = crypto.AES.decrypt(postData, "publickey");
            let imgData = bytes.toString(crypto.enc.Utf8);
            return imgData;
        } catch (error) {
            logger.log("error", `decryptPostData err: ${error.stack}`)
            return null;
        }
    }
};