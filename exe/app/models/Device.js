/**
 * Device 模型 - 设备实体
 *
 * 对应工程文件 DeviceInfo.json 中 DeviceList 的每个元素。
 * 提供 Joi 数据校验、创建、更新、序列化方法。
 *
 * @see DeviceInfo.json - 工程设备信息文件
 */

const Joi = require('joi');
const uuid = require('uuid');

class Device {
  /**
   * @param {Object} data - 设备原始数据
   * @param {string} [data.DeviceID] - 设备唯一标识，未提供时自动生成 UUID v1
   * @param {string} data.DeviceName - 设备名称
   * @param {string} [data.Description] - 设备描述
   * @param {string} [data.DeviceGroupID] - 所属设备组 ID
   * @param {string} [data.DriverName] - 关联驱动名称
   * @param {string} [data.LinkName] - 链路名称
   * @param {string} [data.DeviceAddress] - 设备地址
   * @param {number} [data.DeviceType] - 设备类型
   * @param {number} [data.CollectTimeInterval] - 采集间隔（ms）
   * @param {number} [data.Timeout] - 超时时间（ms）
   * @param {number} [data.ReconnectTime] - 重连间隔（ms）
   * @param {boolean} [data.Enable] - 是否启用
   * @param {Object} [data.ExtendField] - 扩展字段
   */
  constructor(data) {
    this.DeviceID = data.DeviceID || uuid.v1();
    this.DeviceName = data.DeviceName || '';
    this.Description = data.Description || '';
    this.DeviceGroupID = data.DeviceGroupID || '';
    this.DriverName = data.DriverName || '';
    this.LinkName = data.LinkName || '';
    this.DeviceAddress = data.DeviceAddress || '';
    this.DeviceType = data.DeviceType || 0;
    this.CollectTimeInterval = data.CollectTimeInterval || 1000;
    this.Timeout = data.Timeout || 3000;
    this.ReconnectTime = data.ReconnectTime || 5000;
    this.Enable = data.Enable !== undefined ? data.Enable : true;
    this.ExtendField = data.ExtendField || {};
  }

  /**
   * Joi 数据校验
   * @param {Object} data - 待校验的设备数据
   * @param {boolean} [isUpdate=false] - 是否为更新操作（更新时 DeviceID 必填）
   * @returns {Object} 校验通过的数据
   * @throws {Error} 校验失败时抛出
   */
  static validate(data, isUpdate = false) {
    const schema = Joi.object({
      DeviceID: isUpdate ? Joi.string().required() : Joi.string().optional(),
      DeviceName: isUpdate
        ? Joi.string()
            .regex(/^[a-zA-Z0-9_一-龥]+$/)
            .optional()
        : Joi.string()
            .regex(/^[a-zA-Z0-9_一-龥]+$/)
            .required(),
      Description: Joi.string().allow('').optional(),
      DeviceGroupID: Joi.string().allow('').optional(),
      DriverName: Joi.string().allow('').optional(),
      LinkName: Joi.string().allow('').optional(),
      DeviceAddress: Joi.string().allow('').optional(),
      DeviceType: Joi.number().optional(),
      CollectTimeInterval: Joi.number().min(100).max(3600000).optional(),
      Timeout: Joi.number().min(100).max(60000).optional(),
      ReconnectTime: Joi.number().min(100).max(60000).optional(),
      Enable: Joi.boolean().optional(),
      ExtendField: Joi.object().optional(),
    });

    const { error, value } = schema.validate(data, { allowUnknown: true });
    if (error) {
      throw new Error(`设备数据验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * 创建设备实例（含校验）
   * @param {Object} data - 设备数据
   * @returns {Device} 新设备实例
   */
  static create(data) {
    const validated = this.validate(data);
    return new Device(validated);
  }

  /**
   * 更新设备属性
   * @param {Object} data - 要更新的字段（DeviceID 不可修改）
   * @returns {Device} this
   */
  update(data) {
    Object.keys(data).forEach((key) => {
      if (key !== 'DeviceID') {
        this[key] = data[key];
      }
    });
    return this;
  }

  /**
   * 序列化为普通 JSON 对象（用于写入 DeviceInfo.json）
   * @returns {Object} 序列化后的设备数据
   */
  toJSON() {
    return {
      DeviceID: this.DeviceID,
      DeviceName: this.DeviceName,
      Description: this.Description,
      DeviceGroupID: this.DeviceGroupID,
      DriverName: this.DriverName,
      LinkName: this.LinkName,
      DeviceAddress: this.DeviceAddress,
      DeviceType: this.DeviceType,
      CollectTimeInterval: this.CollectTimeInterval,
      Timeout: this.Timeout,
      ReconnectTime: this.ReconnectTime,
      Enable: this.Enable,
      ExtendField: this.ExtendField,
    };
  }

  /**
   * 从 JSON 对象还原 Device 实例
   * @param {Object} data - 反序列化数据
   * @returns {Device}
   */
  static fromJSON(data) {
    return new Device(data);
  }
}

module.exports = Device;
