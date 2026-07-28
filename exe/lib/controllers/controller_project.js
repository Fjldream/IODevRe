const multer = require('multer');
const { request_handler, upload } = require('../../core/utils');
const tenantManager = require('../services/TenantManager');
class ProjectController {
    /**
     * @function getProjectsByGroupId
     * @description 根据组id获取工程列表
     * @param {*} req
     * @param {*} res
     */
    async getProjectsByGroupId(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { projectGroupId } = request_handler.httpGetData(req);
            const projects = await ProjectService.getProjectsByGroupId(projectGroupId);
            res.sendOk(projects);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    // 根据工程ID获取工程信息
    async getProjectsById(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { guid } = request_handler.httpGetData(req);
            const project = await ProjectService.getProjectById(guid);
            const projectGroupService = tenantManager.getProjectGroupService(tenantId);
            let group = await projectGroupService.getProjectGroupById(project.projectGroupId);
            let result = project.toJSON();
            result.sysPlatform = project.sysPlatform;
            result.osType = project.osType;
            result.groupInfo = group.toJSON();
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function createProject
     * @description 创建工程
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async createProject(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const projectData = request_handler.httpPostData(req);
            const project = await ProjectService.createProject(projectData);
            res.sendOk(project);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function updateProject
     * @description 更新工程
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async updateProject(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const projectData = request_handler.httpPutData(req);
            const project = await ProjectService.updateProject(projectData);
            res.sendOk(project);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function deleteProject
     * @description 删除工程
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async deleteProject(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { projectId } = request_handler.httpDeleteData(req);
            const success = await ProjectService.deleteProject(projectId);
            res.sendOk(success);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function exportProject
     * @description 导出工程
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async exportProject(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { guidArr } = request_handler.httpPostData(req);
            const success = await ProjectService.exportProject(guidArr);
            res.sendOk(success);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function importProjects
     * @description 导入工程
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async importProjects(req, res) {
        try {
            upload.upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    throw new Error('文件超出大小限制');
                } else if (err) {
                    throw new Error('上传出现未知错误');
                }
                console.log(req.files);
                const tenantId = req.headers.tenant_id;
                const userId = req.headers.user_id;
                const userName = req.headers.user_name;
                const ProjectService = tenantManager.getProjectService(tenantId);
                const { projectGroupId } = request_handler.httpPostData(req);
                const success = await ProjectService.importProjects(req.files, projectGroupId, userId, userName);
                res.sendOk(success);
            });
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function openProject
     * @description 获取工程脚本列表
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async openProject(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { projectId } = request_handler.httpGetData(req);
            const projects = await ProjectService.openProject(projectId);
            res.sendOk(projects);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function addScriptGroup
     * @description 添加变量\脚本
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async addScriptGroup(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { projectId, scriptType, parentId, name } = request_handler.httpPostData(req);
            const projects = await ProjectService.addScriptGroup(projectId, scriptType, parentId, name);
            let project = await ProjectService.getProjectById(projectId);
            if (project.status === 'updated') {
                await ProjectService.updateProject({
                    guid: projectId,
                    status: 'modify',
                });
            }
            res.sendOk(projects);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function modifyScriptGroup
     * @description 修改变量\脚本
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async modifyScriptGroup(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { projectId, scriptType, groupId, name } = request_handler.httpPutData(req);
            const project = await ProjectService.modifyScriptGroup(projectId, scriptType, groupId, name);
            const project1 = await ProjectService.getProjectById(projectId);
            if (project1.status === 'updated') {
                await ProjectService.updateProject({
                    guid: projectId,
                    status: 'modify',
                });
            }
            res.sendOk(project);
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
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { projectId, type, whetherenable, idArr } = request_handler.httpPutData(req);
            const project = await ProjectService.modifyScriptInvalidStatus(projectId, type, whetherenable, idArr);
            const project1 = await ProjectService.getProjectById(projectId);
            if (project1.status === 'updated') {
                await ProjectService.updateProject({
                    guid: projectId,
                    status: 'modify',
                });
            }
            res.sendOk(project);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function deleteScripteGroup
     * @description 删除脚本组
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async deleteScripteGroup(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { projectId, scriptType, groupId } = request_handler.httpDeleteData(req);
            const success = await ProjectService.deleteScripteGroup(projectId, scriptType, groupId);
            const project1 = await ProjectService.getProjectById(projectId);
            if (project1.status === 'updated') {
                await ProjectService.updateProject({
                    guid: projectId,
                    status: 'modify',
                });
            }
            res.sendOk(success);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function getProjectSharedUsers
     * @description 获取工程共享的用户信息
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async getProjectSharedUsers(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const { guid } = request_handler.httpGetData(req);
            const projectService = tenantManager.getProjectService(tenantId);
            const project = await projectService.getProjectById(guid);
            if (!project) {
                throw new Error('工程组不存在');
            }
            res.sendOk({
                projectId: guid,
                userIds: project.shareUserIds,
            });
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function shareProject
     * @description 共享工程给用户
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async shareProject(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const { guid, userIds, modifiedBy } = request_handler.httpPostData(req);
            if (!Array.isArray(userIds) || userIds.length === 0) {
                throw new Error('userIds必须是非空数组');
            }
            const ProjectService = tenantManager.getProjectService(tenantId);
            const project = await ProjectService.getProjectById(guid);
            if (!project) {
                throw new Error('工程不存在');
            }
            const newUserIds = [...new Set([...project.shareUserIds, ...userIds])];
            const updateData = {
                guid,
                shareUserIds: newUserIds,
                modifiedBy,
            };
            const updateProject = await ProjectService.updateProject(updateData);
            res.sendOk(updateProject);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function unshareProject
     * @description 取消共享
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async unshareProject(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const { guid, userIds, modifiedBy } = request_handler.httpDeleteData(req);
            if (!Array.isArray(userIds) || userIds.length === 0) {
                throw new Error('userIds必须非空数组');
            }
            const ProjectService = tenantManager.getProjectService(tenantId);
            const project = await ProjectService.getProjectById(guid);
            if (!project) {
                throw new Error('工程不存在');
            }
            const newUserIds = project.shareUserIds.filter((userId) => !userIds.includes(userId));
            const updateData = {
                guid,
                shareUserIds: newUserIds,
                modifiedBy,
            };
            const updateProject = await ProjectService.updateProject(updateData);
            res.sendOk(updateProject);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    /**
     * @function clearProjectShares
     * @description 删除工程组下所有角色
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async clearProjectShares(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const { guid, modifiedBy } = request_handler.httpDeleteData(req);
            const projectService = tenantManager.getProjectService(tenantId);
            const project = await projectService.getProjectById(guid);
            if (!project) {
                throw new Error('工程组不存在');
            }
            const updateData = {
                guid,
                shareUserIds: [],
                modifiedBy,
            };
            const updatedProject = await projectService.updateProject(updateData);
            res.sendOk(updatedProject);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
    
    /**
     * @function isUserCreateProject
     * @description 判断用户是否创建工程
     * @param {*} req
     * @param {*} res
     * @returns
     */
    async isUserCreateProject(req, res) {
        try {
            const tenantId = req.headers.tenant_id;
            const ProjectService = tenantManager.getProjectService(tenantId);
            const { userId } = request_handler.httpGetData(req);
            const projects = await ProjectService.getAllProject();

            const result = projects.some((row) => String(row.createBy) === String(userId));
            res.sendOk(result);
        } catch (error) {
            res.sendErr(500, error.message);
        }
    }
}

module.exports = new ProjectController();
