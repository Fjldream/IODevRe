const redis = require('redis');

class redisCache {
    constructor() {
        this.client = null;
    }

    init(config) {
        this.client = redis.createClient(config.port, config.host, {
            auth_pass: config.pwd
        });
        this.client.on('error', (err) => {
            logger.log("fatal", 'Error :' + err)
        });
        this.client.on("connect", () => {
            logger.log("info", "redis内存数据库连接成功")
        })
    }

    exists(key) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis exist meet a error of key is undefined'))
            } else {
                this.client.exists(key, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    incr(key) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis incr meet a error of key is undefined'))
            } else {
                this.client.incr(key, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    decr(key) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis decr meet a error of key is undefined'))
            } else {
                this.client.decr(key, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    expire(key, seconds) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis expire meet a error of key is undefined'))
            } else {
                this.client.expire(key, seconds, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    hgetall(key) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis hgetall meet a error of key is undefined'))
            } else {
                this.client.hgetall(key, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    get(key) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis get meet a error of key is undefined'))
            } else {
                this.client.get(key, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    mget(keyArr) {
        var self = this;
        return new Promise((resolve, reject) => {
            if (typeof (keyArr) === 'undefined' || keyArr.length == 0) {
                reject(new Error('redis get meet a error of key is undefined'))
            } else {
                self.client.mget(keyArr, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    mset(keyArr, data) {
        var self = this;
        var msetArr = [];
        for (let i = 0; i < data.length; i++) {
            const element = data[i];
            msetArr.push(keyArr[i]);
            msetArr.push(element);
        }
        return new Promise((resolve, reject) => {
            if (typeof (keyArr) === 'undefined' || keyArr.length == 0) {
                reject(new Error('redis set meet a error of key is undefined'))
            } else {
                self.client.mset([...msetArr], (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    set(key, data) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis set meet a error of key is undefined'))
            } else {
                this.client.set(key, data, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    hget(key, field) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis hget meet a error of key is undefined'))
            } else {
                this.client.hget(key, field, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    hset(key, attribute, data) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis hset meet a error of key is undefined'))
            } else {
                this.client.hset(key, attribute, data, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    hdel(key, field) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis hdel meet a error of key is undefined'))
            } else {
                this.client.hdel(key, field, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    del(key) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis del meet a error of key is undefined'))
            } else {
                this.client.del(key, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    keys(pattern) {
        var self = this;
        return new Promise((resolve, reject) => {
            if (typeof (pattern) === 'undefined') {
                reject(new Error('redis keys meet a error of key is undefined'))
            } else {
                self.client.keys(pattern, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    sadd(key, member) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis keys meet a error of key is undefined'))
            } else {
                this.client.sadd(key, member, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    srem(key, member) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis keys meet a error of key is undefined'))
            } else {
                this.client.srem(key, member, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    scard(key) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis keys meet a error of key is undefined'))
            } else {
                this.client.scard(key, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    sismember(key, member) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis keys meet a error of key is undefined'))
            } else {
                this.client.sismember(key, member, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    smembers(key) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis keys meet a error of key is undefined'))
            } else {
                this.client.smembers(key, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    zadd(key, score, member) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis zadd meet a error of key is undefined'))
            } else {
                this.client.zadd(key, score, member, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    zrem(key, member) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis zrem meet a error of key is undefined'))
            } else {
                this.client.zrem(key, member, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    /**
     * Get the number of members in a sorted set
     */
    zcard(key) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis zcard meet a error of key is undefined'))
            } else {
                this.client.zcard(key, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    /**
     * Return a range of members in a sorted set, by index
     */
    zrange(key, start, stop) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis zrange meet a error of key is undefined'))
            } else {
                this.client.zrange(key, start, stop, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }

    zscore(key, member) {
        return new Promise((resolve, reject) => {
            if (typeof (key) === 'undefined') {
                reject(new Error('redis zrange meet a error of key is underfined'))
            } else {
                this.client.zscore(key, member, (err, value) => {
                    if (err) reject(new Error(err))
                    resolve(value)
                })
            }
        })
    }
}

module.exports = redisCache;