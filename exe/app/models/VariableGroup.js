/**
 * VariableGroup 模型 - 变量组实体（树形节点）
 *
 * 对应工程文件 VarInfo.json 中 VarGroupTree 的每个节点。
 * 变量组以树形结构组织，支持嵌套和批量操作。
 *
 * @see VarInfo.json - 工程变量信息文件
 */

const Joi = require('joi');
const uuid = require('uuid');

class VariableGroup {
  /**
   * @param {Object} data - 变量组数据
   * @param {string} [data.TagGroupID] - 唯一标识
   * @param {string} data.TagGroupName - 变量组名称
   * @param {string} [data.Description] - 描述
   * @param {string} [data.ParentID] - 父节点 ID
   * @param {Array<Object>} [data.Children] - 子节点列表
   */
  constructor(data) {
    this.TagGroupID = data.TagGroupID || uuid.v1();
    this.TagGroupName = data.TagGroupName || '';
    this.Description = data.Description || '';
    this.ParentID = data.ParentID || '';
    this.Children = data.Children || [];
  }

  /**
   * Joi 数据校验
   * @param {Object} data
   * @returns {Object}
   */
  static validate(data) {
    const schema = Joi.object({
      TagGroupName: Joi.string()
        .regex(/^[a-zA-Z0-9_一-龥]+$/)
        .required(),
      Description: Joi.string().allow('').optional(),
      ParentID: Joi.string().allow('').optional(),
      Children: Joi.array().optional(),
    }).unknown(true);

    const { error, value } = schema.validate(data);
    if (error) {
      throw new Error(`变量组数据验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * 创建变量组实例
   * @param {Object} data
   * @returns {VariableGroup}
   */
  static create(data) {
    return new VariableGroup(this.validate(data));
  }

  /**
   * 更新属性
   * @param {Object} data
   * @returns {VariableGroup}
   */
  update(data) {
    Object.keys(data).forEach((k) => {
      if (k !== 'TagGroupID') this[k] = data[k];
    });
    return this;
  }

  /**
   * 序列化为 JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      TagGroupID: this.TagGroupID,
      TagGroupName: this.TagGroupName,
      Description: this.Description,
      ParentID: this.ParentID,
      Children: this.Children,
    };
  }

  /**
   * 从 JSON 还原
   * @param {Object} data
   * @returns {VariableGroup}
   */
  static fromJSON(data) {
    return new VariableGroup(data);
  }
}

module.exports = VariableGroup;
