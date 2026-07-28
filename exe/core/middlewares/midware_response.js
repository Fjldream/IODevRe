module.exports = (request, response, next) => {
    response.sendOk = data => {
        const ret = {
            errorCode: 0,
            message: "操作成功！",
            data
        };
        response.status(200);
        response.send(ret);
        response.end();
    };
    response.sendErr = (code, message) => {
        const ret = {
            errorCode: code,
            message,
            data: null
        };
        response.status(400);
        response.send(ret);
        response.end();
    };
    next();
};