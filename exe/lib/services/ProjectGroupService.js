const ProjectGroup = require('../model/ProjectGroup');
/**
 * 工程组实例-单例
 */
class ProjectGroupService {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.entityName = 'project_groups';
    }
    /**
     * @function getAllProjectGroups
     * @description 获取所有工程组信息
     * @param {*} filter
     * @returns
     */
    async getAllProjectGroups(userInfo) {
        try {
            const data = this.dataStore.find(this.entityName, {});
            const dataArr = data.map((item) => ProjectGroup.fromJSON(item));
            let result = [];
            for (let index = 0; index < dataArr.length; index++) {
                const element = dataArr[index];
                if (element.createBy == -1) {
                    result.push(element);
                    continue;
                }
                if (element.createBy == userInfo.userId || userInfo.roleIds.some((item) => element.roleIds.includes(JSON.stringify(item)))) {
                    result.push(element);
                }
            }
            return result;
        } catch (error) {
            throw new Error(`获取所有工程组失败${error.message}`);
        }
    }
    /**
     * @function getProjectGroupById
     * @description 根据ID获取工程组信息
     * @param {*} filter
     * @returns
     */
    async getProjectGroupById(id) {
        try {
            const data = this.dataStore.findById(this.entityName, id);
            if (!data) {
                return null;
            }
            return ProjectGroup.fromJSON(data);
        } catch (error) {
            throw new Error(`根据id获取工程组失败: ${error.message}`);
        }
    }
    /**
     * @function createProjectGroup
     * @description 创建工程组
     * @param {*} projectGroupData
     * @returns
     */
    async createProjectGroup(projectGroupData, userId) {
        try {
            // 检查名称是否存在
            const existingGroups = this.dataStore.find(this.entityName, { name: projectGroupData.name });
            if (existingGroups.length > 0) {
                throw new Error('工程组名称已存在');
            }
            // 如果有父组，检查父是否存在
            if (projectGroupData.partGroupId) {
                const parentGroup = this.dataStore.findById(this.entityName, projectGroupData.parnetGroupId);
                if (!parentGroup) {
                    throw new Error('指定父工程组不存在');
                }
                // 检查是否会循环引用
                if (await this.wouldCreateCircularReference(projectGroupData.parnetGroupId, null)) {
                    throw new Error('不能将工程组设置为其子组的子组');
                }
            }
            if (!projectGroupData.createBy) {
                projectGroupData.createBy = userId;
            }
            const group = ProjectGroup.create(projectGroupData);
            const success = this.dataStore.insert(this.entityName, group.toJSON());
            if (!success) {
                throw new Error('保存工程组失败');
            }
            return group.toJSON();
        } catch (error) {
            throw new Error(`${error.message}`);
        }
    }
    /**
     * @function updateProjectGroup
     * @description 更新工程组
     * @param {*} projectGroupData
     * @returns
     */
    async updateProjectGroup(projectGroupData, isAssign = false) {
        try {
            const { guid: id, ...updateData } = projectGroupData;
            if (!isAssign && id === 'default_kingioserver') throw new Error('默认工程组不允许修改');
            // 检查名称是否存在
            const existingData = this.dataStore.findById(this.entityName, id);
            if (!existingData) {
                throw new Error('工程组名称不存在');
            }
            // 检查名称重复
            if (updateData.name && updateData.name !== existingData.name) {
                const existingGroups = this.dataStore.find(this.entityName, { name: updateData.name });
                if (existingGroups.length > 0) {
                    throw new Error('工程组名称已存在');
                }
            }
            // 如果更新父组，进行验证
            if (updateData.parnetGroupId !== undefined && updateData.parnetGroupId !== existingData.parnetGroupId) {
                if (updateData.parnetGroupId) {
                    // 检查父工程组是否存在
                    const parentGroup = this.dataStore.findById(this.entityName, updateData.parnetGroupId);
                    if (!parentGroup) {
                        throw new Error('指定父组不存在');
                    }
                    // 检查是否会造成循环引用
                    if (await this.wouldCreateCircularReference(updateData.parnetGroupId, id)) {
                        throw new Error('不能将工程组设置为子组的子组');
                    }
                }
            }
            const projectGroup = ProjectGroup.fromJSON(existingData);
            projectGroup.update(updateData);
            const success = this.dataStore.update(this.entityName, id, projectGroup.toJSON());
            if (!success) {
                throw new Error('更新工程组失败');
            }
            return projectGroup;
        } catch (error) {
            throw new Error(`${error.message}`);
        }
    }
    /**
     * @function deleteProjectGroup
     * @description 删除工程组
     * @param {*} id
     * @returns
     */
    async deleteProjectGroup(id) {
        try {
            if (id === 'default_kingioserver') throw new Error('默认工程组不允许修改');
            const existingData = this.dataStore.findById(this.entityName, id);
            if (!existingData) {
                throw new Error('工程组不存在');
            }
            // 检查是否存在关联工程
            if (this.projectService) {
                const relatedProjects = await this.projectService.getProjectsByGroupId(id);
                if (relatedProjects.length > 0) {
                    throw new Error('无法删除，工程组下还有工程');
                }
            }
            const success = this.dataStore.delete(this.entityName, id);
            if (!success) {
                throw new Error('删除工程组失败');
            }
            return true;
        } catch (error) {
            throw new Error(`${error.message}`);
        }
    }
    // 设置项目服务引用(用于删除是检查关联)
    setProjectService(projectService) {
        this.projectService = projectService;
    }
    /**
     * @function projectGroupExists
     * @description 检查工程组是否存在
     * @param {*} id
     * @returns
     */
    async projectGroupExists(id) {
        return this.dataStore.exists(this.entityName, id);
    }
}
module.exports = ProjectGroupService;
