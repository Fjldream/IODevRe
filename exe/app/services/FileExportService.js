const fs = require('fs'), path = require('path');
class FileExportService {
  constructor(projectDir) { this.dir = projectDir; }
  exportToCSV(data, fields) { var Parser = require('json2csv').Parser; return new Parser({ fields: fields || Object.keys(data[0]||{}) }).parse(data); }
  exportToJSON(data) { return JSON.stringify(data, null, '\t'); }
  exportToFile(data, format, filename) { var dir = global.exportPath || path.join(this.dir, 'export'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); var fp = path.join(dir, filename+'.'+format); var content = format === 'csv' ? this.exportToCSV(data) : this.exportToJSON(data); fs.writeFileSync(fp, content, 'utf8'); return fp; }
  encodeToGB2312(csvContent) { var iconv = require('iconv-lite'); return iconv.encode(csvContent, 'gb2312'); }
}
module.exports = FileExportService;
