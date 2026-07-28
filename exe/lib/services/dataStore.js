const fs = require('fs');
const path = require('path');
const FileOperation = require('./fileOperationService');
const { getNowDTStr } = require('../../core/utils/function_util');

// 数据读取类
class DataStore {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.dataDir = path.join(__DIR, `../../../sdb`);
        // TODO
        this.demoDir = path.join(__DIR, `/solutions/windows/project`);
        this.tenantDir = path.join(this.dataDir, `/${tenantId}/kingioserver`);
        this.ensureDataDirectory();
    }
    // 确保租户目录存在
    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, {
                recursive: true,
            });
        }
        if (!fs.existsSync(this.tenantDir)) {
            fs.mkdirSync(this.tenantDir, {
                recursive: true,
            });
            let defaultGroupObj = [
                {
                    'guid': 'default_kingioserver',
                    'name': '默认工程组',
                    'description': '',
                    'createBy': -1,
                    'createTime': getNowDTStr(),
                    'modifiedBy': -1,
                    'modifiedTime': getNowDTStr(),
                    'parnetGroupId': null,
                    'roleIds': [],
                },
            ];
            fs.writeFileSync(this.getProjectGroupFilePath(), JSON.stringify(defaultGroupObj, null, 2), 'utf8');
        }
    }
    // 确保工程目录存在
    ensureProjectDirectory(projectId) {
        const projectDir = path.join(this.tenantDir, projectId);
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }
        return projectDir;
    }
    // 获取工程组数据文件
    getProjectGroupFilePath() {
        return path.join(this.tenantDir, 'projectGroupInfo.json');
    }
    // 获取工程数据文件
    getProjectFilePath(projectId) {
        const projectDir = this.ensureProjectDirectory(projectId);
        return path.join(projectDir, 'project.json');
    }
    // 获取数据文件路径
    getEntityFilePath(entity, projectId = null) {
        if (entity === 'project_groups') {
            return this.getProjectGroupFilePath();
        }
        if (entity === 'projects' && projectId) {
            return this.getProjectFilePath(projectId);
        }
    }
    // 读取数据
    readData(entity, projectId = null) {
        try {
            const filePath = this.getEntityFilePath(entity, projectId);
            if (!fs.existsSync(filePath)) {
                return entity === 'projects' && projectId ? null : [];
            }
            const data = fs.readFileSync(filePath, 'utf8');
            const parsedData = JSON.parse(data);
            if (entity === 'projects' && projectId) {
                return parsedData;
            }
            return parsedData;
        } catch (error) {
            console.error(`读取数据失败- 租户${this.tenantId},实体 ${entity}, 工程id: ${projectId}`, error);
            return entity === 'projects' && projectId ? null : [];
        }
    }
    // 写入数据
    writeData(entity, data, projectId = null) {
        try {
            const filePath = this.getEntityFilePath(entity, projectId);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`写入数据失败-租户：${this.tenantId},实体: ${entity},工程id: ${projectId}`, error);
            return false;
        }
    }
    // 读取所有工程数据
    readAllProjects() {
        try {
            const projects = [];
            const tenantDirContents = fs.readdirSync(this.tenantDir);
            for (const item of tenantDirContents) {
                const itemPath = path.join(this.tenantDir, item);
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    const projectFilePath = path.join(itemPath, 'project.json');
                    if (fs.existsSync(projectFilePath)) {
                        try {
                            const projectData = fs.readFileSync(projectFilePath, 'utf8');
                            const project = JSON.parse(projectData);
                            projects.push(project);
                        } catch (error) {
                            console.error(`读取工程文件失败：${projectFilePath}`, error);
                        }
                    }
                }
            }
            // 数组排序，从早到晚
            const sortProjects = [...projects].sort((a, b) => {
                return new Date(a.createTime) - new Date(b.createTime);
            });
            return sortProjects;
        } catch (error) {
            console.error(`读取所有工程失败-租户${this.tenantId}`, error);
            return [];
        }
    }
    // 查询数据
    find(entity, filter = {}) {
        let data;
        if (entity === 'projects') {
            data = this.readAllProjects();
        } else {
            data = this.readData(entity);
        }
        if (Object.keys(filter).length === 0) {
            return data;
        }
        return data.filter((item) => {
            return Object.keys(filter).every((key) => {
                if (filter[key] === undefined || filter[key] === null) {
                    return true;
                }
                return item[key] === filter[key];
            });
        });
    }
    // 根据id查找单个记录
    findById(entity, id) {
        if (entity === 'projects') {
            const projectData = this.readData('projects', id);
            return projectData && projectData.guid === id ? projectData : null;
        } else {
            const data = this.readData(entity);
            return data.find((item) => item.guid === id);
        }
    }
    // 插入数据
    insert(entity, newItem) {
        if (entity === 'projects') {
            return this.writeData('projects', newItem, newItem.guid);
        } else {
            const data = this.readData(entity);
            data.push(newItem);
            return this.writeData(entity, data);
        }
    }
    // 更新数据
    update(entity, id, updateData) {
        if (entity === 'projects') {
            const existingProject = this.readData('projects', id);
            if (!existingProject) {
                return false;
            }
            const updateProject = { ...existingProject, ...updateData };
            return this.writeData('projects', updateProject, id);
        } else {
            const data = this.readData(entity);
            const index = data.findIndex((item) => item.guid === id);
            if (index === -1) {
                return false;
            }
            data[index] = { ...data[index], ...updateData };
            return this.writeData(entity, data);
        }
    }
    // 删除数据
    delete(entity, id) {
        if (entity === 'projects') {
            const projectDir = path.join(this.tenantDir, id);
            if (fs.existsSync(projectDir)) {
                try {
                    fs.rmSync(projectDir, { recursive: true, force: true });
                    return true;
                } catch (error) {
                    console.error(`删除工程数据失败: ${projectDir}`, error);
                    return false;
                }
            }
            return false;
        } else {
            const data = this.readData(entity);
            const index = data.findIndex((item) => item.guid === id);
            if (index === -1) {
                return false;
            }
            data.splice(index, 1);
            return this.writeData(entity, data);
        }
    }
    // 检查是否存在
    exists(entity, id) {
        return this.findById(entity, id) !== undefined;
    }
    copyProject(projectData) {
        try {
            const filePath = this.ensureProjectDirectory(projectData.guid);
            const dir = path.join(filePath, 'project');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            return FileOperation.copyFile(path.join(this.demoDir), dir);
        } catch (err) {
            console.error(`复制工程失败:${this.tenantId}`, err);
            return false;
        }
    }
    // 导出工程
    exportProject(projectID) {
        return new Promise((resolve, reject) => {
            const filePath = this.ensureProjectDirectory(projectID);
            const dir = path.join(filePath, 'project');
            if (!fs.existsSync(dir)) resolve({ code: false, projectID: projectID, msg: '工程文件残缺，无法导出' });
            let projectData = this.findById('projects', projectID);
            FileOperation.zipDirectory(filePath, projectData.name, function (err, zipFileName) {
                if (err) {
                    reject({ code: false, msg: `error:${err}`, projectName: projectData.name });
                    return;
                }
                var zipPath = path.dirname(zipFileName);
                var downloadUrl = 'export/' + projectData.name + '.zip';
                resolve({ code: true, projectName: projectData.name, url: downloadUrl });
                return;
            });
        });
    }
    /**
     * @function importProjects
     * @description 导入工程
     * @param {*} srcFileName
     * @param {*} dstFilePath
     * @param {*} projectJsonData
     * @returns
     */
    importProjects(srcFileName, dstFilePath, projectJsonData) {
        let self = this;
        return new Promise((resolve, reject) => {
            FileOperation.unzipDirectory(srcFileName, dstFilePath, (err) => {
                if (err) return resolve({ code: false, msg: '信息异常' });
                if (!fs.existsSync(dstFilePath)) return resolve({ code: false, msg: '解压工程失败' });
                const items = fs.readdirSync(dstFilePath);
                if (items.length > 1) {
                    fs.unlinkSync(srcFileName);
                    fs.rmSync(dstFilePath, { recursive: true, force: true });
                    return resolve({ code: false, msg: '工程格式不正确' });
                }
                // fs.renameSync(path.join(dstFilePath, items[0]), path.join(dstFilePath, projectJsonData.guid));
                fs.mkdirSync(path.join(dstFilePath, projectJsonData.guid));
                FileOperation.copyFile(path.join(dstFilePath, items[0]), path.join(dstFilePath, projectJsonData.guid));
                fs.rmSync(path.join(dstFilePath, items[0]), { recursive: true, force: true });
                let newPath = path.join(dstFilePath, projectJsonData.guid);
                // 修改project.json内容
                fs.writeFileSync(path.join(newPath, 'project.json'), JSON.stringify(projectJsonData), 'utf8');
                let ProjectPorpertyInfo = JSON.parse(fs.readFileSync(path.join(newPath, 'project/ProjectPorpertyInfo.json'), 'utf8'));
                ProjectPorpertyInfo.ProjectName = projectJsonData.name;
                ProjectPorpertyInfo.CreateTime = projectJsonData.createTime;
                ProjectPorpertyInfo.Creator = projectJsonData.modifiedByName;
                ProjectPorpertyInfo.ProjectID  = projectJsonData.guid;
                fs.writeFileSync(path.join(newPath, 'project/ProjectPorpertyInfo.json'), JSON.stringify(ProjectPorpertyInfo), 'utf8');
                // 移动目录到别的位置
                let targetPath = path.join(self.tenantDir, projectJsonData.guid);
                if (fs.existsSync(targetPath)) return resolve({ code: false, msg: '工程已存在' });
                // fs.renameSync(newPath, self.tenantDir);
                FileOperation.copyFile(dstFilePath, self.tenantDir);
                // 导入完成删除导入的工程
                fs.rmSync(dstFilePath, { recursive: true, force: true });
                fs.unlinkSync(srcFileName);
                resolve({ code: true, msg: '导入成功', data: projectJsonData });
            });
        });
    }
    upload(req) {
        FileOperation.upload(req);
    }
    // 获取工程目录结构
    getProjectDirectory(projectId) {
        return path.join(this.tenantDir, projectId);
    }
    // 检查工程目录是否存在
    projectDirectoryExists(projectId) {
        const projectDir = this.getProjectDirectory(projectId);
        return fs.existsSync(projectDir) && fs.statSync(projectDir).isDirectory();
    }
}
module.exports = DataStore;
