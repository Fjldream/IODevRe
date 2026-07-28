const http = require('http');
const https = require('https');
const querystring = require('querystring');
const urlNPM = require('url');
var formData = require('form-data');
var formidable = require('formidable');
var fs = require('fs');
var publicClass = require('./PublicInterface');//���ú����ӿ�
var pubInter = new publicClass();

class RestfulAPIGateWay{
    constructor(host,basePath,isHttp)
    {
        this.baseconfig = {};
        this.baseconfig.host= host;
        this.baseconfig.basePath= basePath;
        this.baseconfig.isHttp= isHttp;
        if(isHttp=== true)
        {
            this.baseconfig.path='http://' + this.baseconfig.host+this.baseconfig.basePath;
        }
        else{
            this.baseconfig.path='https://' + this.baseconfig.host+this.baseconfig.basePath;
        }
       
        this.gatewayself = this;
    }    

    post(url, data, fn, contentType, fileInfo, tenant_id) {
        data = data || {};
        //var content = querystring.stringify(data);
        var content = JSON.stringify(data);
        //console.log(content);
        if (fileInfo) {
            var form = new formData();
            //multiple files upload            
            if("_restfulInerface" in fileInfo)
            {
                let keys = Object.keys(fileInfo);
                for(let i=0; i<keys.length;i++)
                {
                    let key = keys[i];
                    if(typeof(fileInfo[key]) == 'object')
                    {
                        
                        form.append(key, fs.createReadStream(fileInfo[key].path));     

                    }
                    else
                    {
                        form.append(key, fileInfo[key]);
                    }
                }
            }else{
                form.append(fileInfo.fileKeyName, fs.createReadStream(fileInfo.file.path));//compatible
            }
                        
            var headers = form.getHeaders();
            contentType = headers["content-type"];
            content = querystring.stringify(data);
        }       
        var parse_u = urlNPM.parse(url, true);

        var isHttp = parse_u.protocol == 'http:';
        var options = {
            host: parse_u.hostname,
            port: parse_u.port || (isHttp ? 80 : 443),
            path: parse_u.path,
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Content-Length': pubInter.getStringBytes(content, 'utf8'), 
                'tenant_id':tenant_id
            }
        };
        if (contentType.indexOf("multipart/form-data") != -1) {
            delete options.headers["Content-Length"];
        }

        if (isHttp === true) {
            var req = http.request(options, function (res) {
                var _data = '';
                res.on('data', function (chunk) {
                    var strType = typeof(chunk);
                    var strChunk = chunk.toString('utf8');
                    _data += chunk;
                });
                res.on('end', function () {
                    fn != undefined && fn(_data);
                });
                res.on('error', (err) => {
                    console.log("post error information:" + err.message);
                    fn != undefined && fn(err);
                });
            });
            req.on('error', (err) => {
                console.log("post error information:" + err.message);
                fn != undefined && fn(err);
            });
            //console.log(content);
            req.write(content);
            if (fileInfo) {
                form.pipe(req); 
            } else {
                req.end(); 
            }
        } else {
            options.rejectUnauthorized = false;
            options.requestCert = true;
            options.agent = false;
            var req = https.request(options, function (res) {
                var _data = '';
                res.on('data', function (chunk) {
                    var strChunk = chunk.toString('utf8');
                    _data += chunk;
                });
                res.on('end', function () {
                    fn != undefined && fn(_data);
                });
            });
            req.on('error', (err) => {
                console.log("post error information:" + err.message);
                fn != undefined && fn(err);
            });
            //console.log(content);
            req.write(content);
            if (fileInfo) {
                form.pipe(req); 
            } else {
                req.end(); 
            }
        }

    }

    put(url, data, fn, contentType) {
        data = data || {};
        var content = JSON.stringify(data);
        //console.log(content);
        var parse_u = urlNPM.parse(url, true);

        var isHttp = parse_u.protocol == 'http:';
        var options = {
            host: parse_u.hostname,
            port: parse_u.port || (isHttp ? 80 : 443),
            path: parse_u.path,
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
                'Content-Length': content.length
            }
        };
        if (isHttp === true) {
            var req = http.request(options, function (res) {
                var _data = '';
                res.on('data', function (chunk) {
                    _data += chunk;
                });
                res.on('end', function () {
                    fn != undefined && fn(_data);
                });
            });
            req.on('error', (err) => {
                console.log("put error information:" + err.message);
            });
            console.log(content);
            req.write(content);
            req.end();
        } else {
            var req = https.request(options, function (res) {
                var _data = '';
                res.on('data', function (chunk) {
                    _data += chunk;
                });
                res.on('end', function () {
                    fn != undefined && fn(_data);
                });
            });
            req.on('error', (err) => {
                console.log("put error information:" + err.message);
            });
            //console.log(content);
            req.write(content);
            req.end();

        }
    }
    

    delete(url, data, fn, contentType) {
        data = data || {};
        var content = JSON.stringify(data);
        //console.log(content);
        var parse_u = urlNPM.parse(url, true);

        var isHttp = parse_u.protocol == 'http:';
        var options = {
            host: parse_u.hostname,
            port: parse_u.port || (isHttp ? 80 : 443),
            path: parse_u.path,
            method: 'DELETE',
            headers: {
                'Content-Type': contentType,
                'Content-Length': content.length
            }
        };
        if (isHttp === true) {
            var req = http.request(options, function (res) {
                var _data = '';
                res.on('data', function (chunk) {
                    _data += chunk;
                });
                res.on('end', function () {
                    fn != undefined && fn(_data);
                });
            });
            req.on('error', (err) => {
                console.log("delete error information:" + err.message);
            });
            console.log(content);
            req.write(content);
            req.end();
        } else {
            var req = https.request(options, function (res) {
                var _data = '';
                res.on('data', function (chunk) {
                    _data += chunk;
                });
                res.on('end', function () {
                    fn != undefined && fn(_data);
                });
            });
            req.on('error', (err) => {
                console.log("delete error information:" + err.message);
            });
            //console.log(content);
            req.write(content);
            req.end();

        }
    }


    get(url, data, fn, contentType) {
        var parse_u = urlNPM.parse(url, true);
        var content = querystring.stringify(data);
        var isHttp = parse_u.protocol == 'http:';
        var options = {
            host: parse_u.hostname,
            port: parse_u.port || (isHttp ? 80 : 443),
            path: parse_u.path + (data ? '?' + content : ''),
            method: 'GET'
        };
        if (isHttp === true) {
            var req = http.request(options, function (res) {
               // console.log("Status:" + res.statusCode);
               // console.log("Headers:" + JSON.stringify(res.headers));
                res.setEncoding('utf-8');
                // res.on('data', (chunk) => {
                //     console.log("Body:" + chunk);
                // });
                var _data = '';
                res.on('data', function (chunk) {
                    _data += chunk;
                });
                res.on('end', function () {
                    //console.log("Body:" + _data)
                    fn != undefined && fn(_data);
                });
                
            });
            req.on('error', (err) => {
                console.log("get error information:" + err.message);
            });
            req.end();
        } else {
            var req = https.request(options, function (res) {
               // console.log("Status:" + res.statusCode);
               // console.log("Headers:" + JSON.stringify(res.headers));
                res.setEncoding('utf-8');

                res.on('data', (chunk) => {
                    console.log("Body:" + chunk);
                });
            });
            req.on('error', (err) => {
                console.log("get error information:" + err.message);
            });
            req.end();
        }

    }

    initConfig(host, basePath, isHttp) {
        this.baseconfig.host = host;
        this.baseconfig.basePath = basePath;
        this.baseconfig.isHttp = isHttp;
        this.baseconfig.path=this.baseconfig.host+this.baseconfig.basePath;
    }

    ProcessAsy(operType,path,data,callback,contentType,file,tenant_id)
    {
        if(typeof operType !== 'string')
        {
            //callback('operType error');
            return;
        }
        if (contentType == undefined) {
            // contentType = "application/x-www-form-urlencoded";
            contentType = "application/json";
        }
        path = encodeURI(path);

        operType = operType.toUpperCase();
        if(operType === 'GET')
        {
            this.get( this.baseconfig.path + path,data,callback,contentType,tenant_id);

        }
        else if(operType === 'POST')
        {
            this.post( this.baseconfig.path + path,data,callback,contentType,file,tenant_id);
        }
        else if(operType === 'PUT')
        {
            this.put( this.baseconfig.path + path,data,callback,contentType,tenant_id);
        }
        else if(operType === 'DELETE')
        {
            this.delete( this.baseconfig.path + path,data,callback,contentType,tenant_id);
        }
    }
}

module.exports = RestfulAPIGateWay