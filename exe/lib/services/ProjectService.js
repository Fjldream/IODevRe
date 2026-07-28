const Project = require('../model/Project');
const path = require('path');
const fs = require('fs');
/**
 * 工程实例-单例
 */
class ProjectService {
    constructor(dataStore, projectGroupService = null, scriptService) {
        this.dataStore = dataStore;
        this.projectGroupService = projectGroupService;
        this.scriptService = scriptService;
        this.entitiyName = 'projects';
    }
    // 根据工程ID获取工程信息
    async getProjectById(id) {
        try {
            const data = this.dataStore.findById(this.entitiyName, id);
            let proInfo = JSON.parse(fs.readFileSync(path.join(this.dataStore.tenantDir,data.guid,'project','ProjectPorpertyInfo.json'),'utf8'));
            if (!data) {
                return null;
            }
            let result = Project.fromJSON(data);
            result.sysPlatform = proInfo.SysPlatform;
            result.osType = proInfo.OsType
            return result
        } catch (error) {
            throw new Error(`获取工程失败 ${error.message}`);
        }
    }
    // 获取所有工程
    async getAllProject() {
        try {
            const data = this.dataStore.find(this.entitiyName, {});
            if (!data) {
                return null;
            }
            return data;
        } catch (error) {
            throw new Error(`获取工程失败 ${error.message}`);
        }
    }
    /**
     * @function getProjectsByGroupId
     * @description 根据工程组获取工程列表
     * @param {*} groupId
     * @returns
     */
    async getProjectsByGroupId(groupId) {
        try {
            if (groupId) {
                const existingData = this.dataStore.findById('project_groups', groupId);
                if (!existingData) {
                    throw new Error('工程组不存在');
                }
            }
            const data = this.dataStore.find(this.entitiyName, {
                projectGroupId: groupId,
            });
            let self = this;
            let result = data.map((item) => Project.fromJSON(item).toJSON()).map(item=>{
                let proInfo = JSON.parse(fs.readFileSync(path.join(self.dataStore.tenantDir,item.guid,'project','ProjectPorpertyInfo.json'),'utf8'));
                item.sysPlatform = proInfo.SysPlatform;
                item.osType = proInfo.OsType
                return item
            })
            return result
        } catch (error) {
            throw new Error(`获取工程列表失败: ${error.message}`);
        }
    }
    /**
     * @function createProject
     * @description 创建工程
     * @param {*} projectData
     * @returns
     */
    async createProject(projectData, isImport = false) {
        try {
            // 检查名称是否存在
            const existingProjects = this.dataStore.find(this.entitiyName, {
                name: projectData.name,
            });
            if (existingProjects.length > 0) {
                throw new Error('工程名称已存在');
            }
            if (!projectData.projectGroupId) {
                throw new Error('未指定工程组');
            }
            // 检查工程组是否存在
            const groupExists = await this.projectGroupService.projectGroupExists(projectData.projectGroupId);
            if (!groupExists) {
                throw new Error('工程组不存在');
            }
            const project = Project.create(projectData);
            if (isImport) {
                return project.toJSON();
            }
            const success = this.dataStore.insert(this.entitiyName, project.toJSON());
            // success 成功后把工程demo复制到工程文件下
            if (!success) {
                throw new Error('保存工程失败');
            }
            // const copysuccess = this.dataStore.copyProject(project.toJSON());
            // if (!copysuccess) {
            //     throw new Error('工程demo保存失败');
            // }
            return project;
        } catch (error) {
            throw new Error(`${error.message}`);
        }
    }
    /**
     * @function updateProject
     * @description 更新工程
     * @param {*} projectData
     * @returns
     */
    async updateProject(projectData) {
        try {
            const { guid: id, ...updateData } = projectData;
            const existingData = this.dataStore.findById(this.entitiyName, id);
            if (!existingData) {
                throw new Error('工程不存在');
            }
            // 检查名称重复
            if (updateData.name && updateData.name != existingData.name) {
                const existingProjects = this.dataStore.find(this.entitiyName, {
                    name: updateData.name,
                });
                if (existingProjects.length > 0) {
                    throw new Error('工程名已存在');
                }
            }
            //如果更换组， 检查工程组存在
            if (updateData.projectGroupId && updateData.projectGroupId !== existingData.projectGroupId && this.projectGroupService) {
                const groupExists = await this.projectGroupService.projectGroupExists(updateData.projectGroupId);
                if (!groupExists) {
                    throw new Error('指定的工程组不存在');
                }
            }
            if (updateData.description) existingData.description = updateData.description;
            const project = Project.fromJSON(existingData);
            project.update(updateData);
            const success = this.dataStore.update(this.entitiyName, id, project.toJSON());
            let proInfo = JSON.parse(fs.readFileSync(path.join(this.dataStore.tenantDir,id,'project','ProjectPorpertyInfo.json'),'utf8'));
            proInfo.Modifier = updateData.modifiedByName;
            proInfo.ProjectName = updateData.name ? updateData.name : proInfo.ProjectName;
            fs.writeFileSync(path.join(this.dataStore.tenantDir,id,'project','ProjectPorpertyInfo.json'),JSON.stringify(proInfo),'utf8')
            if (!success) {
                throw new Error('更新工程失败');
            }
            return project;
        } catch (error) {
            throw new Error(`${error.message}`);
        }
    }
    /**
     * @function deleteProject
     * @description 删除工程
     * @param {*} id
     * @returns
     */
    async deleteProject(ids) {
        try {
            ids.forEach((id) => {
                const existingData = this.dataStore.findById(this.entitiyName, id);
                if (existingData.status !== 'unPublished') {
                    throw new Error('存在已发布工程');
                }
                if (!existingData) {
                    throw new Error(`工程不存在：${id}`);
                }
            });
            ids.forEach((id) => {
                const success = this.dataStore.delete(this.entitiyName, id);
                if (!success) {
                    throw new Error('删除工程失败');
                }
            });
            return true;
        } catch (error) {
            throw new Error(`删除工程失败: ${error.message}`);
        }
    }
    /**
     * @function exportProject
     * @description 导出工程
     * @param {*} ids 工程id组
     * @returns
     */
    async exportProject(ids) {
        let resData = {
            errorPros: [],
            successPros: [],
        };
        for (let i = 0; i < ids.length; i++) {
            let data = await this.dataStore.exportProject(ids[i]);
            if (data.code) {
                resData.successPros.push({
                    projectName: data.projectName,
                    url: data.url,
                });
            } else {
                resData.errorPros.push({
                    projectName: data.projectName,
                    projectID: data.projectID,
                    msg: data.msg,
                });
            }
        }
        return resData;
    }
    async importProjects(uploadFiles, groupId, userId, userName) {
        //TODO
        let resData = {
            errorPros: [],
            successPros: [],
        };
        for (let i = 0; i < uploadFiles.length; i++) {
            let file = uploadFiles[i];
            file.filename = decodeURIComponent(file.filename);
            const uploadDir = path.join(__dirname, '../../../../../sdb/filestation/kingioserver/upload', file.filename.replace('.zip', ''));
            console.log(`文件名称:${file.filename},文件路径:${file.path}`);
            let projectName = file.filename.replace('.zip', '');
            let addData = {
                name: projectName,
                description: '导入工程_' + file.filename.replace('.zip', ''),
                createBy: userId,
                createByName: userName,
                projectGroupId: groupId,
            };
            let projectJsonData = null;
            try {
                projectJsonData = await this.createProject(addData, true);
            } catch (error) {
                resData.errorPros.push({
                    packetName: file.filename,
                    msg: error.message,
                });
                continue;
            }
            // 修改project.json内容
            let data = await this.dataStore.importProjects(file.path, uploadDir, projectJsonData);
            if (data.code) {
                resData.successPros.push({
                    data: data.data,
                });
            } else {
                resData.errorPros.push({
                    packetName: file.filename,
                    msg: data.msg,
                });
            }
        }
        return resData;
    }
}
module.exports = ProjectService;
