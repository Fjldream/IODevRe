/**
 * RealtimeDataService - 实时数据业务逻辑层
 *
 * 负责实时数据查询、批量获取实时值、实时变量信息获取。
 * 数据来源为运行时内存或实时数据缓存文件。
 */

const fs = require('fs');
const path = require('path');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class RealtimeDataService {
  constructor() {
    /** @type {string} exe 目录路径 */
    this.exeDir = global.__DIR || __dirname;
  }

  /**
   * 获取实时数据缓存文件路径
   * @returns {string}
   */
  _getRealtimeCachePath() {
    return path.join(this.exeDir, 'Data', 'RealtimeCache.json');
  }

  /**
   * 获取变量信息文件路径
   * @param {string} projectName - 工程名称
   * @returns {string}
   */
  _getVarInfoPath(projectName) {
    return path.join(global.sdbPath, projectName, 'project', 'VarInfo.json');
  }

  /**
   * 读取实时数据缓存
   * @returns {Object}
   */
  _readRealtimeCache() {
    const fp = this._getRealtimeCachePath();
    if (!fs.existsSync(fp)) return {};
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (err) {
      return {};
    }
  }

  /**
   * 批量获取实时值
   *
   * 根据标签名称列表批量获取实时数据值。
   *
   * @param {string[]} tagNames - 标签名称数组
   * @returns {Array<{ tagName: string, value: *, quality: number, timestamp: string }>}
   */
  getBatchRealValue(tagNames) {
    const cache = this._readRealtimeCache();
    const names = Array.isArray(tagNames) ? tagNames : [];

    return names.map((tagName) => {
      const cached = cache[tagName];
      return {
        tagName,
        value: cached ? cached.value : null,
        quality: cached ? (cached.quality || 192) : 0,
        timestamp: cached ? (cached.timestamp || new Date().toISOString()) : new Date().toISOString(),
      };
    });
  }

  /**
   * 获取实时变量信息
   *
   * 从工程 VarInfo.json 读取变量列表，附加实时值。
   *
   * @param {string} projectName - 工程名称
   * @returns {{ variables: Array<Object>, totalCount: number }}
   * @throws {AppError} FILE_READ_ERROR
   */
  getRealtimeVarInfo(projectName) {
    const fp = this._getVarInfoPath(projectName);
    if (!fs.existsSync(fp)) {
      return { variables: [], totalCount: 0 };
    }
    try {
      const varInfo = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const tags = varInfo.TagList || [];
      const cache = this._readRealtimeCache();

      const variables = tags.map((tag) => ({
        ...tag,
        RealTimeValue: cache[tag.TagName] ? cache[tag.TagName].value : null,
        Quality: cache[tag.TagName] ? (cache[tag.TagName].quality || 192) : 0,
        Timestamp: cache[tag.TagName] ? (cache[tag.TagName].timestamp || '') : '',
      }));

      return { variables, totalCount: variables.length };
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_READ_ERROR, `VarInfo.json: ${err.message}`);
    }
  }
}

module.exports = RealtimeDataService;
