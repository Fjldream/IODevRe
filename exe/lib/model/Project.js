// 工程模型
const Joi = require('joi');
const {
    nanoId,
    getNowDTStr
} = require('../../core/utils/function_util');
const uuid = require('uuid');
class Project {
    constructor(data) {
        this.guid = data.guid || uuid.v1();
        this.name = data.name;
        this.description = data.description;
        this.createByName = data.createByName;
        this.createBy = data.createBy;
        this.createTime = data.createTime || getNowDTStr();
        this.modifiedTime = data.modifiedTime || getNowDTStr();
        this.modifiedBy = data.modifiedBy || data.createBy;
        this.modifiedByName = data.modifiedByName || data.createByName;
        this.projectGroupId = data.projectGroupId || null; // 关联的工程组ID
        this.status = data.status || 'unPublished'; // 工程状态： 未发布/ 已发布 / 已发布未更新 / 已发布已更新
        this.shareUserIds = data.shareUserIds || []; // 共享的用户id列表
        this.projectData = {}; // 工程数据
        this.group = data.group || [];
    }
    static validate(data, isUpdate = false) {
        let self = this;
        const schema = Joi.object({
            guid: Joi.string().uuid().optional(),
            name: isUpdate ?
                Joi.string()
                .regex(/^(?!\d)[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
                .optional().error((errors) => self.errorRegxMsg(errors, '工程名称只允许包含数字、字母、中文、_')) :
                Joi.string()
                .regex(/^(?!\d)[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
                .required().error((errors) => self.errorRegxMsg(errors, '工程名称只允许包含数字、字母、中文、_')),
            description: Joi.string().max(1000).allow('').optional(),
            createByName: isUpdate ? Joi.number().min(1).max(100).optional() : Joi.string().max(50).required(),
            createBy: isUpdate ? Joi.number().min(1).max(100).optional() : Joi.number().min(1).max(100).required(),
            createTime: Joi.string().optional(),
            modifiedByName: Joi.string().max(50).optional(),
            modifiedBy: Joi.string().min(1).max(100).optional(),
            modifiedTime: Joi.string().optional(),
            status: Joi.number().valid(1, 2, 3, 4).optional(),
            projectGroupId: Joi.string().allow(null).required(),
            shareUserIds: Joi.array().items(Joi.string()).optional(),
            status: Joi.string().valid('unPublished', 'published', 'updated', 'unUpdated'),
        });
        return schema.validate(data);
    }
    static create(data) {
        const {
            error,
            value
        } = this.validate(data);
        if (error) {
            throw new Error(`数据验证失败: ${error.details[0].message}`);
        }
        return new Project(value);
    }
    static errorRegxMsg(errors, message) {
        errors.forEach((element) => {
            if (element.type === 'string.regex.base' || element.type === 'string.isoDate') {
                element.message = message;
            }
            if (element.type === 'alternatives.child' || element.type === 'array.includesOne') {
                element.context.reason.length = 1;
                element.context.reason[0].message = message;
            }
        });
        return errors;
    }
    update(data) {
        if (this.status == 'published' && data.status == 'updated') {
            data.status = 'updated';
        }
        if (this.status == 'updated' && data.status == 'modify') {
            data.status = 'unUpdated';
        }
        if (data.status === 'published' && this.status === 'published') {
            data.status = 'published';
        }
        if (data.status === 'canclePublish') {
            data.status = 'unPublished';
        }
        Object.keys(data).forEach((key) => {
            if (key !== 'guid' && key !== 'createTime' && key !== 'createBy') {
                this[key] = data[key];
            }
        });
        this.modifiedTime = getNowDTStr();
        return this;
    }
    // 转换为JSON对象
    toJSON() {
        return {
            guid: this.guid,
            name: this.name,
            description: this.description,
            createBy: this.createBy,
            createByName: this.createByName,
            createTime: this.createTime,
            modifiedByName: this.modifiedByName,
            modifiedBy: this.modifiedBy,
            modifiedTime: this.modifiedTime,
            projectGroupId: this.projectGroupId,
            status: this.status,
            projectData: this.projectData,
            shareUserIds: this.shareUserIds,
            group: this.group,
        };
    }
    // 从JSON对象创建Project实例
    static fromJSON(data) {
        return new Project(data);
    }
}

module.exports = Project;