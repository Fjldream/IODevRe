const { parseLocale } = require('../../i18n');

module.exports = (req, res, next) => {
  const acceptLanguage = req.headers['accept-language'] || '';
  req.locale = parseLocale(acceptLanguage);
  next();
};
