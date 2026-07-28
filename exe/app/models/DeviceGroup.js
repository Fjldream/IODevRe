/**
 * DeviceGroup 模型 - 设备组实体（树形节点）
 *
 * 对应工程文件 DeviceInfo.json 中 DeviceGroupTree 的每个节点。
 * 设备组以树形结构组织，支持嵌套。
 *
 * @see DeviceInfo.json - 工程设备信息文件
 */

const Joi = require('joi');
const uuid = require('uuid');

class DeviceGroup {
  /**
   * @param {Object} data - 设备组原始数据
   * @param {string} [data.DeviceGroupID] - 设备组唯一标识
   * @param {string} data.DeviceGroupName - 设备组名称
   * @param {string} [data.Description] - 描述
   * @param {string} [data.ParentID] - 父节点 ID，空字符串表示根节点
   * @param {Array<Object>} [data.Children] - 子节点列表
   */
  constructor(data) {
    this.DeviceGroupID = data.DeviceGroupID || uuid.v1();
    this.DeviceGroupName = data.DeviceGroupName || '';
    this.Description = data.Description || '';
    this.ParentID = data.ParentID || '';
    this.Children = data.Children || [];
  }

  /**
   * Joi 数据校验
   * @param {Object} data - 待校验数据
   * @returns {Object} 校验通过的数据
   */
  static validate(data) {
    const schema = Joi.object({
      DeviceGroupID: Joi.string().optional(),
      DeviceGroupName: Joi.string()
        .regex(/^[a-zA-Z0-9_一-龥]+$/)
        .required(),
      Description: Joi.string().allow('').optional(),
      ParentID: Joi.string().allow('').optional(),
      Children: Joi.array().optional(),
    });

    const { error, value } = schema.validate(data, { allowUnknown: true });
    if (error) {
      throw new Error(`设备组数据验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * 创建设备组实例（含校验）
   * @param {Object} data - 设备组数据
   * @returns {DeviceGroup}
   */
  static create(data) {
    const validated = this.validate(data);
    return new DeviceGroup(validated);
  }

  /**
   * 更新设备组属性
   * @param {Object} data - 要更新的字段
   * @returns {DeviceGroup} this
   */
  update(data) {
    Object.keys(data).forEach((key) => {
      if (key !== 'DeviceGroupID') {
        this[key] = data[key];
      }
    });
    return this;
  }

  /**
   * 序列化为 JSON 对象
   * @returns {Object}
   */
  toJSON() {
    return {
      DeviceGroupID: this.DeviceGroupID,
      DeviceGroupName: this.DeviceGroupName,
      Description: this.Description,
      ParentID: this.ParentID,
      Children: this.Children,
    };
  }

  /**
   * 从 JSON 对象还原实例
   * @param {Object} data
   * @returns {DeviceGroup}
   */
  static fromJSON(data) {
    return new DeviceGroup(data);
  }
}

module.exports = DeviceGroup;
