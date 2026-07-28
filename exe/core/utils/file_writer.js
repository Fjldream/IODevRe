const fs = require('fs');
const path = require('path');

class FileWriter {
  constructor(flushInterval = 3000) {
    this.pending = new Map();
    this.timer = setInterval(() => this.flush(), flushInterval);
    this.timer.unref(); // 不阻止进程退出
  }

  queue(filePath, data) {
    this.pending.set(filePath, data);
  }

  flush() {
    for (const [filePath, data] of this.pending) {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, '\t'), 'utf8');
      } catch (err) {
        console.error(`FileWriter flush error: ${filePath}`, err.message);
      }
    }
    this.pending.clear();
  }

  destroy() {
    this.flush();
    clearInterval(this.timer);
  }
}

module.exports = new FileWriter();
