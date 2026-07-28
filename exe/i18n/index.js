const zhCN = require('./zh-CN.json');
const enUS = require('./en-US.json');

const locales = {
  'zh-CN': zhCN,
  'zh': zhCN,
  'en-US': enUS,
  'en': enUS,
};

const defaultLocale = 'zh-CN';

/**
 * 翻译函数
 * @param {string} key - 语言包中的 key
 * @param {string} locale - 语言标识（从 Accept-Language 解析）
 * @returns {string}
 */
function t(key, locale = defaultLocale) {
  const langPack = locales[locale] || locales[defaultLocale];
  return langPack[key] || key;
}

/**
 * 从请求头解析语言
 * @param {string} acceptLanguage - Accept-Language 头
 * @returns {string}
 */
function parseLocale(acceptLanguage) {
  if (!acceptLanguage) return defaultLocale;
  const lang = acceptLanguage.split(',')[0].trim();
  if (lang.startsWith('zh')) return 'zh-CN';
  if (lang.startsWith('en')) return 'en-US';
  return defaultLocale;
}

module.exports = { t, parseLocale, locales, defaultLocale };
