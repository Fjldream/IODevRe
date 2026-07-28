class AppError extends Error {
  /**
   * @param {Object} errorCode - 错误码对象 { code, key }
   * @param {string} detail - 附加详情
   */
  constructor(errorCode, detail = '') {
    super(errorCode.key);
    this.name = 'AppError';
    this.errorCode = errorCode.code;
    this.i18nKey = errorCode.key;
    this.detail = detail;
  }
}

module.exports = AppError;
