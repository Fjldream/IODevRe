const { request_handler } = require('../../core/utils');
const tenantManager = require('../services/TenantManager');
class ScriptController {
    /**
     * @function getProjectJsonData
     * @description 获取变量、脚本等json文件。数1据
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async getProjectJsonData(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { projectId, type, groupId } = request_handler.httpGetData(req);
            const result = await ScriptService.getProjectJsonData(projectId, type, groupId);
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function addProjectJsonData
     * @description 添加变量、脚本等json文件
     * @param {*} req
     * @param {*} res
     */
    async addProjectJsonData(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { projectId, type, data } = request_handler.httpPostData(req);
            const result = await ScriptService.addProjectJsonData(projectId, type, data);
            const ProjectService = tenantManager.getProjectService(tenantId);
            let project = await ProjectService.getProjectById(projectId);
            if (project.status === 'updated') {
                await ProjectService.updateProject({
                    guid: projectId,
                    status: 'modify',
                });
            }
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function modifyProjectJsonData
     * @description 修改变量、脚本等信息
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async modifyProjectJsonData(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { projectId, type, scriptId, data } = request_handler.httpPutData(req);
            const result = await ScriptService.modifyProjectJsonData(projectId, type, scriptId, data);
            const ProjectService = tenantManager.getProjectService(tenantId);
            let project = await ProjectService.getProjectById(projectId);
            if (project.status === 'updated') {
                await ProjectService.updateProject({
                    guid: projectId,
                    status: 'modify',
                });
            }
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function deleteProjectJsonData
     * @description 修改变量、脚本等信息
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async deleteProjectJsonData(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { projectId, type, scriptIds } = request_handler.httpDeleteData(req);
            const result = await ScriptService.deleteProjectJsonData(projectId, type, scriptIds);
            const ProjectService = tenantManager.getProjectService(tenantId);
            let project = await ProjectService.getProjectById(projectId);
            if (project.status === 'updated') {
                await ProjectService.updateProject({
                    guid: projectId,
                    status: 'modify',
                });
            }
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function
     * @description 获取脚本内容
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async getScriptData(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const userId = req.headers.user_id;
            const userName = req.headers.user_name;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { projectId, scriptId, type } = request_handler.httpGetData(req);
            const result = await ScriptService.getScriptData(projectId, scriptId, type, userId, userName);
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function modifyScriptInvalidStatus
     * @description 脚本设置生效、失效
     * @param {*} req
     * @param {*} res
     */
    async modifyScriptInvalidStatus(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { projectId, type, whetherenable, scriptIds } = request_handler.httpPutData(req);
            const result = await ScriptService.modifyScriptInvalidStatus(projectId, type, whetherenable, scriptIds);
            const ProjectService = tenantManager.getProjectService(tenantId);
            let project = await ProjectService.getProjectById(projectId);
            if (project.status === 'updated') {
                await ProjectService.updateProject({
                    guid: projectId,
                    status: 'modify',
                });
            }
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function modifyScriptData
     * @description 编辑脚本
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async modifyScriptData(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const userId = req.headers.user_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { projectId, type, scriptId, scriptData } = request_handler.httpPutData(req);
            const result = await ScriptService.modifyScriptData(projectId, type, scriptId, scriptData, userId);
            const ProjectService = tenantManager.getProjectService(tenantId);
            let project = await ProjectService.getProjectById(projectId);
            if (project.status === 'updated') {
                await ProjectService.updateProject({
                    guid: projectId,
                    status: 'modify',
                });
            }
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function startServerScriptDebug
     * @description 脚本调试功能
     * @param {*} req
     * @param {*} res
     */
    async startServerScriptDebug(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const userId = req.headers.user_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { projectId, debuggerStatus, serverIP } = request_handler.httpGetData(req);
            const result = await ScriptService.startServerScriptDebug(projectId, debuggerStatus, userId, tenantId, serverIP);
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function lockerList
     * @description 获取所有占位脚本
     * @param {*} req
     * @param {*} res
     */
    async lockerList(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { projectId } = request_handler.httpGetData(req);
            const result = await ScriptService.lockerList(projectId);
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function unlockScript
     * @description 释放占位
     * @param {*} req
     * @param {*} res
     */
    async unlockScript(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const userId = req.headers.user_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { scriptIds } = request_handler.httpPutData(req);
            const result = await ScriptService.unlockScript(scriptIds, userId);
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function forceUnlockScript
     * @description 工程所有者强制释放占位
     * @param {*} req
     * @param {*} res
     */
    async forceUnlockScript(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { scriptIds } = request_handler.httpPutData(req);
            const result = await ScriptService.forceUnlockScript(scriptIds);
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    async getScriptLockInfo(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ScriptService = tenantManager.getScriptService(tenantId);
            const { scriptId } = request_handler.httpGetData(req);
            const result = await ScriptService.getScriptLockInfo(scriptId);
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
}

module.exports = new ScriptController();
