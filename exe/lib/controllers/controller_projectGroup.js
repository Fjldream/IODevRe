const tenantManager = require('../services/TenantManager');
const { request_handler } = require('../../core/utils');
class ProjectGroupController {
    /**
     * @function getAllProjectGroups
     * @description 获取所有工程组信息
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async getAllProjectGroups(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const userInfo = req.userInfo;
            const projectGroupService = tenantManager.getProjectGroupService(tenantId);
            const projectGroups = await projectGroupService.getAllProjectGroups(userInfo);
            res.sendOk(projectGroups);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function createProjectGroup
     * @description 创建工程组
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async createProjectGroup(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const userId = req.headers.user_id;
            const projectGroupService = tenantManager.getProjectGroupService(tenantId);
            const projectGroupData = request_handler.httpPostData(req);
            const projectGroups = await projectGroupService.createProjectGroup(projectGroupData, userId);
            res.sendOk(projectGroups);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function updateProjectGroup
     * @description 更新工程组
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async updateProjectGroup(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const projectGroupService = tenantManager.getProjectGroupService(tenantId);
            const projectGroupData = request_handler.httpPutData(req);
            const projectGroups = await projectGroupService.updateProjectGroup(projectGroupData);
            res.sendOk(projectGroups);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function deleteProjectGroup
     * @description 删除工程组
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async deleteProjectGroup(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const projectGroupService = tenantManager.getProjectGroupService(tenantId);
            const { guid } = request_handler.httpDeleteData(req);
            const projectGroups = await projectGroupService.deleteProjectGroup(guid);
            res.sendOk(projectGroups);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function assignRolesToGroup
     * @description 工程组分配角色
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async assignRolesToGroup(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const { guid, roleIds } = request_handler.httpPostData(req);
            if (!Array.isArray(roleIds) || roleIds.length === 0) {
                throw new Error('roleIds必须非空数组');
            }
            const projectGroupService = tenantManager.getProjectGroupService(tenantId);
            const projectGroup = await projectGroupService.getProjectGroupById(guid);
            if (!projectGroup) {
                throw new Error('工程组不存在');
            }
            const newRoleIds = [...new Set([...projectGroup.roleIds, ...roleIds])];
            const updateData = {
                guid,
                modifiedBy: req.userInfo.userId,
                roleIds: newRoleIds,
            };
            const updatedGroup = await projectGroupService.updateProjectGroup(updateData, true);
            res.sendOk(updatedGroup);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function removeRolesFromGroup
     * @description 工程组删除角色
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async removeRolesFromGroup(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const { guid, roleIds, modifiedBy } = request_handler.httpDeleteData(req);
            if (!Array.isArray(roleIds) || roleIds.length === 0) {
                throw new Error('roleIds必须非空数组');
            }
            const projectGroupService = tenantManager.getProjectGroupService(tenantId);
            const projectGroup = await projectGroupService.getProjectGroupById(guid);
            if (!projectGroup) {
                throw new Error('工程组不存在');
            }
            const newRoleIds = projectGroup.roleIds.filter((roleId) => !roleIds.includes(roleId));
            const updateData = {
                guid,
                modifiedBy: req.userInfo.userId,
                roleIds: newRoleIds,
            };
            const updatedGroup = await projectGroupService.updateProjectGroup(updateData);
            res.sendOk(updatedGroup);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function getGroupRoles
     * @description 获取工程组角色信息
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async getGroupRoles(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const { guid } = request_handler.httpGetData(req);
            const projectGroupService = tenantManager.getProjectGroupService(tenantId);
            const projectGroup = await projectGroupService.getProjectGroupById(guid);
            if (!projectGroup) {
                throw new Error('工程组不存在');
            }
            res.sendOk({
                groupId: guid,
                roleIds: projectGroup.roleIds,
            });
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
}

module.exports = new ProjectGroupController();
