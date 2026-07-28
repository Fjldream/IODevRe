// 工程组模型
const { nanoId, getNowDTStr } = require('../../core/utils/function_util');
const Joi = require('joi');

class ProjectGroup {
    constructor(data) {
        this.guid = data.guid || nanoId();
        this.name = data.name;
        this.description = data.description;
        this.createBy = data.createBy;
        this.createTime = data.createTime || getNowDTStr();
        this.modifiedTime = data.modifiedTime || getNowDTStr();
        this.modifiedBy = data.modifiedBy || data.createBy;
        this.parentGroupId = data.parentGroupId || null; // 父组ID
        this.roleIds = data.roleIds || []; // 分配给该工程组的角色ID列表
    }
    static validate(data, isUpdate = false) {
        const schema = Joi.object({
            guid: Joi.string().uuid().optional(),
            name: isUpdate ? Joi.string().min(1).max(200).optional() : Joi.string().min(1).max(200).required(),
            description: Joi.string().max(1000).allow('').optional(),
            createBy: isUpdate ? Joi.string().min(1).max(100).optional() : Joi.string().min(1).max(100).required(),
            createTime: Joi.string().optional(),
            modifiedTime: Joi.string().optional(),
            parentGroupId: Joi.string().allow(null).optional(),
            roleIds: Joi.array().items(Joi.string()).optional(),
        });
        return schema.validate(data);
    }
    // 创建新工程组
    static create(data) {
        const { error, value } = this.validate(data);
        if (error) {
            throw new Error(`数据校验失败: ${error.details[0].message}`);
        }
        return new ProjectGroup(value);
    }
    // 更新工程组信息
    update(data) {
        Object.keys(data).forEach((key) => {
            if (key !== 'guid' && key !== 'createTime' && key !== 'createBy') {
                this[key] = data[key];
            }
        });
        this.modifiedTime = getNowDTStr();
        return this;
    }
    // 转为JSON对象
    toJSON() {
        return {
            guid: this.guid,
            name: this.name,
            description: this.description,
            createBy: this.createBy,
            createTime: this.createTime,
            modifiedBy: this.modifiedBy,
            modifiedTime: this.modifiedTime,
            parnetGroupId: this.parentGroupId,
            roleIds: this.roleIds,
        };
    }
    // 从JSON对象创建ProjectGroup实例
    static fromJSON(data) {
        return new ProjectGroup(data);
    }
}
module.exports = ProjectGroup;
