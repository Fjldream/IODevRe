/**
 * Variable 模型 - 变量实体
 *
 * 对应工程文件 VarInfo.json 中 TagList 的每个元素。
 * 变量关联设备和寄存器，用于数据采集配置。
 *
 * @see VarInfo.json - 工程变量信息文件
 */

const Joi = require('joi');
const uuid = require('uuid');

class Variable {
  /**
   * @param {Object} data - 变量原始数据
   * @param {string} [data.TagID] - 变量唯一标识，默认 UUID v1
   * @param {string} data.TagName - 变量名称
   * @param {string} [data.Description] - 描述
   * @param {string} [data.DeviceID] - 关联设备 ID
   * @param {string} [data.DeviceName] - 关联设备名称
   * @param {string} [data.TagGroup] - 所属变量组 ID/名称
   * @param {number} [data.TagType] - 变量类型：1=系统 2=链路 3=设备 4=用户
   * @param {number} [data.TagDataType] - 数据类型
   * @param {number} [data.RegDataType] - 寄存器数据类型
   * @param {number} [data.AccessType] - 读写权限：0=只读 1=只写 2=读写
   * @param {string} [data.RegName] - 寄存器名称
   * @param {string} [data.RegAddress] - 寄存器地址
   * @param {string} [data.VarPlcInfo] - PLC 信息
   * @param {number} [data.CollectTimeInterval] - 采集间隔
   * @param {number} [data.DataConvertType] - 数据转换类型
   * @param {number} [data.MaxRawValue] - 最大原始值
   * @param {number} [data.MinRawValue] - 最小原始值
   * @param {number} [data.MaxValue] - 最大工程值
   * @param {number} [data.MinValue] - 最小工程值
   * @param {string} [data.NonLinearName] - 非线性表名称
   * @param {number} [data.DataCleaningType] - 数据清洗类型
   * @param {number} [data.DataCleaningUpperLimit] - 清洗上限
   * @param {number} [data.DataCleaningLowerLimit] - 清洗下限
   * @param {number} [data.ChangeRate] - 变化率
   * @param {number} [data.DeadbandRate] - 死区率
   * @param {number} [data.AlarmUpperLimit] - 报警上限
   * @param {number} [data.AlarmLowerLimit] - 报警下限
   */
  constructor(data) {
    this.TagID = data.TagID || uuid.v1();
    this.TagName = data.TagName || '';
    this.Description = data.Description || '';
    this.DeviceID = data.DeviceID || '';
    this.DeviceName = data.DeviceName || '';
    this.TagGroup = data.TagGroup || 'TagGroup';
    this.TagType = data.TagType || 4; // KF4.0 默认用户变量
    this.TagDataType = data.TagDataType || 128;
    this.RegDataType = data.RegDataType || 128;
    this.AccessType = data.AccessType || 0;
    this.RegName = data.RegName || null;
    this.RegAddress = data.RegAddress || null;
    this.VarPlcInfo = data.VarPlcInfo || '';
    this.CollectTimeInterval = data.CollectTimeInterval || null;
    this.DataConvertType = data.DataConvertType || null;
    this.MaxRawValue = data.MaxRawValue || null;
    this.MinRawValue = data.MinRawValue || null;
    this.MaxValue = data.MaxValue || null;
    this.MinValue = data.MinValue || null;
    this.NonLinearName = data.NonLinearName || '';
    this.DataCleaningType = data.DataCleaningType || null;
    this.DataCleaningUpperLimit = data.DataCleaningUpperLimit || null;
    this.DataCleaningLowerLimit = data.DataCleaningLowerLimit || null;
    this.ChangeRate = data.ChangeRate || null;
    this.DeadbandRate = data.DeadbandRate || null;
    this.AlarmUpperLimit = data.AlarmUpperLimit || null;
    this.AlarmLowerLimit = data.AlarmLowerLimit || null;
  }

  /**
   * Joi 数据校验（宽松模式，allowUnknown）
   * @param {Object} data - 变量数据
   * @returns {Object} 校验通过的数据
   */
  static validate(data) {
    const schema = Joi.object({
      TagName: Joi.string()
        .regex(/^[a-zA-Z0-9_一-龥]+$/)
        .required(),
      DeviceName: Joi.string().allow('').optional(),
      TagGroup: Joi.string().allow('').optional(),
      TagDataType: Joi.number().optional(),
      RegDataType: Joi.number().optional(),
      RegName: Joi.string().allow('', null).optional(),
      RegAddress: Joi.string().allow('', null).optional(),
    }).unknown(true); // 允许旧格式中的额外字段

    const { error, value } = schema.validate(data);
    if (error) {
      throw new Error(`变量数据验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * 创建变量实例（含校验）
   * @param {Object} data
   * @returns {Variable}
   */
  static create(data) {
    const validated = this.validate(data);
    return new Variable(validated);
  }

  /**
   * 更新变量属性（TagID 不可修改）
   * @param {Object} data
   * @returns {Variable} this
   */
  update(data) {
    Object.keys(data).forEach((key) => {
      if (key !== 'TagID') {
        this[key] = data[key];
      }
    });
    return this;
  }

  /**
   * 序列化为 JSON 对象（保证字段顺序和旧版一致）
   * @returns {Object}
   */
  toJSON() {
    return {
      TagID: this.TagID,
      TagName: this.TagName,
      Description: this.Description,
      DeviceID: this.DeviceID,
      DeviceName: this.DeviceName,
      TagGroup: this.TagGroup,
      TagType: this.TagType,
      TagDataType: this.TagDataType,
      RegDataType: this.RegDataType,
      AccessType: this.AccessType,
      RegName: this.RegName,
      RegAddress: this.RegAddress,
      VarPlcInfo: this.VarPlcInfo,
      CollectTimeInterval: this.CollectTimeInterval,
      DataConvertType: this.DataConvertType,
      MaxRawValue: this.MaxRawValue,
      MinRawValue: this.MinRawValue,
      MaxValue: this.MaxValue,
      MinValue: this.MinValue,
      NonLinearName: this.NonLinearName,
      DataCleaningType: this.DataCleaningType,
      DataCleaningUpperLimit: this.DataCleaningUpperLimit,
      DataCleaningLowerLimit: this.DataCleaningLowerLimit,
      ChangeRate: this.ChangeRate,
      DeadbandRate: this.DeadbandRate,
      AlarmUpperLimit: this.AlarmUpperLimit,
      AlarmLowerLimit: this.AlarmLowerLimit,
    };
  }

  /**
   * 从 JSON 还原 Variable 实例
   * @param {Object} data
   * @returns {Variable}
   */
  static fromJSON(data) {
    return new Variable(data);
  }
}

module.exports = Variable;
