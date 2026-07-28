const routerConfig = require("./api/v1");

class RouteLoader {
    constructor() {
        this.routerContainer = routerConfig;
    }

    // 注册路由
    registerRoutes(router) {
        let routerManager = Object.getOwnPropertyNames(this.routerContainer);
        for (let i = 0; i < routerManager.length; i++) {
            let modelRouter = this.routerContainer[routerManager[i]];
            let methods = Object.getOwnPropertyNames(modelRouter)
            for (let methodIndex = 0; methodIndex < methods.length; methodIndex++) {
                let routerMethods = modelRouter[methods[methodIndex]]
                let routerItems = Object.getOwnPropertyNames(routerMethods)
                for (let routerIndex = 0; routerIndex < routerItems.length; routerIndex++) {
                    if (routerMethods[routerItems[routerIndex]]) {
                        router[methods[methodIndex]](routerItems[routerIndex], ...routerMethods[routerItems[routerIndex]]);
                        logger.log("info", `${methods[methodIndex]}  ${routerItems[routerIndex]}`);
                    } else {
                        logger.log("warn", `${methods[methodIndex]}  ${routerItems[routerIndex]}  undefined`)
                    }
                }
            }
        }
    };
}

module.exports = new RouteLoader();