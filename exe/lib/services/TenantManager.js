const { getNowDTStr } = require('../../core/utils/function_util');
const DataStore = require('./dataStore');
const ProjectGroupService = require('./ProjectGroupService');
const ProjectService = require('./ProjectService');
/**
 * 租户管理类
 */
class TenantManager {
    constructor() {
        // 每个租户的服务实例
        this.tenantInstances = new Map();
    }
    // 获取租户实例
    getTenantInstance(tenantId) {
        if (!this.tenantInstances.has(tenantId)) {
            this.createTenantInstance(tenantId);
        }
        return this.tenantInstances.get(tenantId);
    }
    // 创建租户实例
    createTenantInstance(tenantId) {
        // 每个租户自己的数据读取实例
        const dataStore = new DataStore(tenantId);
        // 每个租户自己的独立的服务实例
        const projectGroupService = new ProjectGroupService(dataStore);
        const projectService = new ProjectService(dataStore, projectGroupService);
        // 设置服务相互引用
        projectGroupService.setProjectService(projectService);
        const tenantInstances = {
            tenantId,
            dataStore,
            projectGroupService,
            projectService,
            createAt: getNowDTStr(),
        };
        this.tenantInstances.set(tenantId, tenantInstances);
        console.log('info', `为租户${tenantId}创建了新实例`);
        return tenantInstances;
    }
    // 获取租户的工程组服务
    getProjectGroupService(tenantId) {
        const instance = this.getTenantInstance(tenantId);
        return instance.projectGroupService;
    }
    // 获取租户的工程服务
    getProjectService(tenantId) {
        const instance = this.getTenantInstance(tenantId);
        return instance.projectService;
    }
    // 获取租户的脚本服务
    getScriptService(tenantId) {
        const instance = this.getTenantInstance(tenantId);
        return instance.scriptService;
    }
    // 获取租户的数据存储
    getDataStore(tenantId) {
        const instance = this.getTenantInstance(tenantId);
        return instance.dataStore;
    }
    // 移除租户实例
    removeTenantInstance(tenantId) {
        if (this.tenantInstances.has(tenantId)) {
            this.tenantInstances.delete(tenantId);
            console.log('info', `租户${tenantId} 的服务实例已清理`);
            return true;
        }
        return false;
    }
}
module.exports = new TenantManager();
