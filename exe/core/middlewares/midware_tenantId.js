// const whiteList = ['/export'];
module.exports = (req, res, next) => {
    try {
        if (req.originalUrl === '/importProjects') {
            return next();
        }
        if (!req.headers.tenant_id) {
            // 传递了工程名，没有找到工程ID
            return res.sendErr(-500, `租户ID无效`);
        }
        next();
    } catch (error) {
        res.status(412);
        res.send(error);
        return res.end();
    }
};
