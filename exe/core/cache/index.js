const NodeCache = require("node-cache");
const RedisCache = require("./cache_redis");

const enums = require("../enums");

class Cache {
    constructor(cacheType = enums.common.enum_cacheType.LOCAL_CACHE) {
        this.cacheType = cacheType;
        this.clientHandle = {};
    }

    setCacheType(cacheType) {
        this.cacheType = cacheType;
    }

    init(cacheType, config) {
        this.setCacheType(cacheType);
        if (this.cacheType === enums.common.enum_cacheType.LOCAL_CACHE) {
            this.clientHandle = new NodeCache();
            logger.log("info", "内存数据库初始化完毕")
        } else {
            this.clientHandle = new RedisCache();
            this.clientHandle.init(config);
        }
    }

    async has(key) {
        if (this.cacheType === enums.common.enum_cacheType.LOCAL_CACHE) {
            return await this.clientHandle.has(key);
        } else {
            return await this.clientHandle.exists(key);
        }
    }


    async get(key) {
        if (this.cacheType === enums.common.enum_cacheType.LOCAL_CACHE) {
            return await this.clientHandle.get(key);
        } else {
            return await this.clientHandle.get(key);
        }
    }

    async set(key, data) {
        if (this.cacheType === enums.common.enum_cacheType.LOCAL_CACHE) {
            return await this.clientHandle.set(key, data);
        } else {
            return await this.clientHandle.set(key, data);
        }
    }

    async del(key) {
        if (this.cacheType === enums.common.enum_cacheType.LOCAL_CACHE) {
            return await this.clientHandle.del(key);
        } else {
            return await this.clientHandle.del(key);
        }
    }

    async keys(param) {
        if (this.cacheType === enums.common.enum_cacheType.LOCAL_CACHE) {
            if (param) {
                param = param.replace(/\*/g, "");
                let reply = await this.clientHandle.keys();
                let filterRes = [];
                for (let i = 0; i < reply.length; i++) {
                    const element = reply[i];
                    if (element.includes(param)) {
                        filterRes.push(element)
                    }
                }
                return filterRes;
            } else {
                return await this.clientHandle.keys();
            }
        } else {
            return await this.clientHandle.keys(param);
        }
    }

}

module.exports = new Cache();