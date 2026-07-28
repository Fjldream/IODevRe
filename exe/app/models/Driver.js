/**
 * Driver 模型 - 驱动实体
 *
 * 对应 exe/Driver/DriverInfo.json 中 DriverList 的每个元素。
 * 提供 Joi 校验、创建、更新、序列化方法。
 *
 * @see DriverInfo.json - 驱动信息文件
 */

const Joi = require('joi');
const uuid = require('uuid');

class Driver {
  /**
   * @param {Object} data - 驱动原始数据
   * @param {number} [data.DriverID] - 驱动唯一标识
   * @param {string} data.DriverName - 驱动名称
   * @param {string} [data.DriverVersion] - 驱动版本
   * @param {string} [data.DriverType] - 驱动类型
   * @param {string} [data.DriverPath] - 驱动安装路径
   * @param {string} [data.InstallTime] - 安装时间
   * @param {string} [data.Description] - 描述
   * @param {boolean} [data.Enable] - 是否启用
   * @param {string} [data.SysPlatform] - 系统平台
   * @param {string} [data.PlatformType] - 平台类型
   * @param {string} [data.DriverDesc] - 驱动描述
   * @param {string} [data.DriverCreator] - 创建者
   * @param {string} [data.DependFile] - 依赖文件列表
   * @param {Array<string>} [data.DeviceSeries] - 设备系列
   * @param {Array<number>} [data.DriverTypeArr] - 驱动类型数组
   * @param {string} [data.CLSID] - COM 类标识
   * @param {string} [data.DriverCompany] - 驱动厂商
   * @param {number} [data.DriverDevelopmentVersion] - 驱动开发版本
   */
  constructor(data) {
    this.DriverID = data.DriverID || Date.now();
    this.DriverName = data.DriverName || '';
    this.DriverVersion = data.DriverVersion || '';
    this.DriverType = data.DriverType || '';
    this.DriverPath = data.DriverPath || '';
    this.InstallTime = data.InstallTime || '';
    this.Description = data.Description || '';
    this.Enable = data.Enable !== undefined ? data.Enable : true;
    this.SysPlatform = data.SysPlatform || '';
    this.PlatformType = data.PlatformType || '';
    this.DriverDesc = data.DriverDesc || '';
    this.DriverCreator = data.DriverCreator || '';
    this.DependFile = data.DependFile || '';
    this.DeviceSeries = data.DeviceSeries || [];
    this.DriverTypeArr = data.DriverTypeArr || [];
    this.CLSID = data.CLSID || '';
    this.DriverCompany = data.DriverCompany || '';
    this.DriverDevelopmentVersion = data.DriverDevelopmentVersion || 0;
  }

  /**
   * Joi 数据校验
   * @param {Object} data - 待校验的驱动数据
   * @param {boolean} [isUpdate=false] - 是否为更新操作
   * @returns {Object} 校验通过的数据
   * @throws {Error} 校验失败时抛出
   */
  static validate(data, isUpdate = false) {
    const schema = Joi.object({
      DriverID: isUpdate ? Joi.number().required() : Joi.number().optional(),
      DriverName: isUpdate
        ? Joi.string().optional()
        : Joi.string().required(),
      DriverVersion: Joi.string().allow('').optional(),
      DriverType: Joi.string().allow('').optional(),
      DriverPath: Joi.string().allow('').optional(),
      InstallTime: Joi.string().allow('').optional(),
      Description: Joi.string().allow('').optional(),
      Enable: Joi.boolean().optional(),
      SysPlatform: Joi.string().allow('').optional(),
      PlatformType: Joi.string().allow('').optional(),
      DriverDesc: Joi.string().allow('').optional(),
      DriverCreator: Joi.string().allow('').optional(),
      DependFile: Joi.string().allow('').optional(),
      DeviceSeries: Joi.array().optional(),
      DriverTypeArr: Joi.array().optional(),
      CLSID: Joi.string().allow('').optional(),
      DriverCompany: Joi.string().allow('').optional(),
      DriverDevelopmentVersion: Joi.number().optional(),
    });

    const { error, value } = schema.validate(data, { allowUnknown: true });
    if (error) {
      throw new Error(`驱动数据验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * 创建驱动实例（含校验）
   * @param {Object} data - 驱动数据
   * @returns {Driver} 新驱动实例
   */
  static create(data) {
    const validated = this.validate(data);
    return new Driver(validated);
  }

  /**
   * 更新驱动属性
   * @param {Object} data - 要更新的字段
   * @returns {Driver} this
   */
  update(data) {
    Object.keys(data).forEach((key) => {
      if (key !== 'DriverID') {
        this[key] = data[key];
      }
    });
    return this;
  }

  /**
   * 序列化为普通 JSON 对象（用于写入 DriverInfo.json）
   * @returns {Object} 序列化后的驱动数据
   */
  toJSON() {
    return {
      DriverID: this.DriverID,
      DriverName: this.DriverName,
      DriverVersion: this.DriverVersion,
      DriverType: this.DriverType,
      DriverPath: this.DriverPath,
      InstallTime: this.InstallTime,
      Description: this.Description,
      Enable: this.Enable,
      SysPlatform: this.SysPlatform,
      PlatformType: this.PlatformType,
      DriverDesc: this.DriverDesc,
      DriverCreator: this.DriverCreator,
      DependFile: this.DependFile,
      DeviceSeries: this.DeviceSeries,
      DriverTypeArr: this.DriverTypeArr,
      CLSID: this.CLSID,
      DriverCompany: this.DriverCompany,
      DriverDevelopmentVersion: this.DriverDevelopmentVersion,
    };
  }

  /**
   * 从 JSON 对象还原 Driver 实例
   * @param {Object} data - 反序列化数据
   * @returns {Driver}
   */
  static fromJSON(data) {
    return new Driver(data);
  }
}

module.exports = Driver;
