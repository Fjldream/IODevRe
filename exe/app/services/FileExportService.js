const fs = require('fs'), path = require('path');
class FileExportService {
  constructor(projectDir) { this.dir = projectDir; }
  exportCSV(data, fields) { const { Parser } = require('json2csv'); return new Parser({ fields: fields || Object.keys(data[0]||{}) }).parse(data); }
  exportJSON(data) { return JSON.stringify(data, null, '\t'); }
  writeFile(filename, content) { const p = path.join(global.exportPath || this.dir, filename); fs.writeFileSync(p, content, 'utf8'); return p; }
}
module.exports = FileExportService;
