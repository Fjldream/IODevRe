/**
 * DriverService - 驱动管理业务逻辑层
 *
 * 负责驱动信息的 CRUD 操作、安装、卸载，
 * 底层读写 exe/Driver/DriverInfo.json。
 * 配置路径从 global.__DIR 读取（exe 目录）。
 */

const fs = require('fs');
const path = require('path');
const Driver = require('../models/Driver');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class DriverService {
  constructor() {
    /** @type {string} exe 目录路径 */
    this.exeDir = global.__DIR || __dirname;
  }

  /**
   * 获取 DriverInfo.json 的完整路径
   * @returns {string}
   */
  _getDriverInfoPath() {
    return path.join(this.exeDir, 'Driver', 'DriverInfo.json');
  }

  /**
   * 获取 Driver 目录路径
   * @returns {string}
   */
  _getDriverDir() {
    return path.join(this.exeDir, 'Driver');
  }

  /**
   * 读取 DriverInfo.json
   * @returns {{ DriverList: Array, SysPlatformInfo: Array }}
   * @throws {AppError} FILE_READ_ERROR
   */
  _readDriverInfo() {
    const fp = this._getDriverInfoPath();
    if (!fs.existsSync(fp)) {
      return { DriverList: [], SysPlatformInfo: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_READ_ERROR, `DriverInfo.json: ${err.message}`);
    }
  }

  /**
   * 写入 DriverInfo.json
   * @param {Object} data - 要写入的数据
   * @returns {boolean}
   * @throws {AppError} FILE_WRITE_ERROR
   */
  _writeDriverInfo(data) {
    const fp = this._getDriverInfoPath();
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      fs.writeFileSync(fp, JSON.stringify(data, null, '\t'), 'utf8');
      return true;
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `DriverInfo.json: ${err.message}`);
    }
  }

  // ==================== 驱动操作 ====================

  /**
   * 获取所有驱动列表
   * @returns {Array<Object>} 驱动数组
   */
  getDrivers() {
    const info = this._readDriverInfo();
    return info.DriverList || [];
  }

  /**
   * 安装驱动
   *
   * 解压驱动包到 Driver/{name}/ 目录，将驱动元数据写入 DriverInfo.json。
   * 若同名驱动已存在，则更新版本号。
   *
   * @param {Object} driverData - 驱动数据
   * @param {string} driverData.DriverName - 驱动名称
   * @param {string} driverData.DriverVersion - 驱动版本
   * @param {Buffer} [driverData.driverFile] - 驱动文件 Buffer
   * @returns {Object} 安装后的驱动对象
   * @throws {AppError} DRIVER_INSTALL_FAILED
   */
  installDriver(driverData) {
    const validated = Driver.validate(driverData);
    const info = this._readDriverInfo();
    const list = info.DriverList || [];

    // 检查同名驱动是否已存在
    const existing = list.find((d) => d.DriverName === validated.DriverName);
    if (existing) {
      // 更新版本和配置
      Object.assign(existing, validated, { DriverID: existing.DriverID });
      this._writeDriverInfo(info);
      return existing;
    }

    // 创建新驱动记录
    const newDriver = Driver.create(validated).toJSON();
    newDriver.DriverID = list.length > 0 ? Math.max(...list.map((d) => d.DriverID)) + 1 : 1;
    newDriver.InstallTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 创建驱动目录
    const driverDir = path.join(this._getDriverDir(), validated.DriverName);
    if (!fs.existsSync(driverDir)) {
      try {
        fs.mkdirSync(driverDir, { recursive: true });
      } catch (err) {
        throw new AppError(ErrorCodes.DRIVER_INSTALL_FAILED, `创建目录失败: ${err.message}`);
      }
    }

    // 写入驱动数据（若有传入）
    if (driverData.driverFile) {
      try {
        const targetPath = path.join(driverDir, `${validated.DriverName}.dll`);
        fs.writeFileSync(targetPath, driverData.driverFile);
      } catch (err) {
        throw new AppError(ErrorCodes.DRIVER_INSTALL_FAILED, `写入驱动文件失败: ${err.message}`);
      }
    }

    list.push(newDriver);
    info.DriverList = list;
    this._writeDriverInfo(info);
    return newDriver;
  }

  /**
   * 卸载驱动
   *
   * 删除 Driver/{name}/ 目录，从 DriverInfo.json 中移除记录。
   *
   * @param {string} driverName - 驱动名称
   * @returns {boolean}
   * @throws {AppError} DRIVER_NOT_FOUND | DRIVER_UNINSTALL_FAILED
   */
  uninstallDriver(driverName) {
    const info = this._readDriverInfo();
    const list = info.DriverList || [];
    const index = list.findIndex((d) => d.DriverName === driverName);
    if (index === -1) {
      throw new AppError(ErrorCodes.DRIVER_NOT_FOUND, `驱动: ${driverName}`);
    }

    // 删除驱动目录
    const driverDir = path.join(this._getDriverDir(), driverName);
    if (fs.existsSync(driverDir)) {
      try {
        fs.rmSync(driverDir, { recursive: true, force: true });
      } catch (err) {
        throw new AppError(ErrorCodes.DRIVER_UNINSTALL_FAILED, `删除目录失败: ${err.message}`);
      }
    }

    // 从列表中移除
    list.splice(index, 1);
    info.DriverList = list;
    this._writeDriverInfo(info);
    return true;
  }

  /**
   * 获取指定驱动属性
   * @param {string} driverName - 驱动名称
   * @returns {Object} 驱动对象
   * @throws {AppError} DRIVER_NOT_FOUND
   */
  getDriverProperty(driverName) {
    const info = this._readDriverInfo();
    const driver = (info.DriverList || []).find((d) => d.DriverName === driverName);
    if (!driver) {
      throw new AppError(ErrorCodes.DRIVER_NOT_FOUND, `驱动: ${driverName}`);
    }
    return driver;
  }

  /**
   * 获取点位映射文件列表
   *
   * 读取 Driver/ 下所有子目录中的 .map 文件。
   *
   * @returns {Array<{ fileName: string, filePath: string, driverName: string }>}
   */
  getPointMappingFiles() {
    const driverDir = this._getDriverDir();
    if (!fs.existsSync(driverDir)) return [];

    const result = [];
    try {
      const subDirs = fs.readdirSync(driverDir, { withFileTypes: true });
      for (const dirent of subDirs) {
        if (dirent.isDirectory()) {
          const subDirPath = path.join(driverDir, dirent.name);
          const files = fs.readdirSync(subDirPath);
          for (const file of files) {
            if (file.endsWith('.map') || file.endsWith('.csv') || file.endsWith('.json')) {
              result.push({
                fileName: file,
                filePath: path.join(subDirPath, file),
                driverName: dirent.name,
              });
            }
          }
        }
      }
    } catch (err) {
      /* return empty array on error */
    }
    return result;
  }

  /**
   * 上传点位映射文件
   * @param {string} driverName - 驱动名称
   * @param {Object} file - multer 文件对象 { originalname, buffer }
   * @returns {{ fileName: string, filePath: string }}
   * @throws {AppError} DRIVER_NOT_FOUND
   */
  uploadPointMapping(driverName, file) {
    const info = this._readDriverInfo();
    if (!(info.DriverList || []).some((d) => d.DriverName === driverName)) {
      throw new AppError(ErrorCodes.DRIVER_NOT_FOUND, `驱动: ${driverName}`);
    }

    const driverDir = path.join(this._getDriverDir(), driverName);
    if (!fs.existsSync(driverDir)) {
      fs.mkdirSync(driverDir, { recursive: true });
    }

    const targetPath = path.join(driverDir, file.originalname);
    try {
      fs.writeFileSync(targetPath, file.buffer);
      return { fileName: file.originalname, filePath: targetPath };
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `写入映射文件失败: ${err.message}`);
    }
  }

  /**
   * 删除点位映射文件
   * @param {string} driverName - 驱动名称
   * @param {string} fileName - 文件名
   * @returns {boolean}
   * @throws {AppError} FILE_NOT_FOUND
   */
  delPointMapping(driverName, fileName) {
    const filePath = path.join(this._getDriverDir(), driverName, fileName);
    if (!fs.existsSync(filePath)) {
      throw new AppError(ErrorCodes.FILE_NOT_FOUND, `映射文件: ${fileName}`);
    }
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `删除映射文件失败: ${err.message}`);
    }
  }
}

module.exports = DriverService;
