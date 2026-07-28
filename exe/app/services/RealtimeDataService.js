const fs = require('fs'), path = require('path');
class RealtimeDataService {
  constructor(projectDir) { this.dir = projectDir; }
  getBatchRealValue(tagNames) { return tagNames.map(n => ({ tagName: n, value: '--', timestamp: '--', quality: '--' })); }
  getRealtimeVarInfo(projectName) { return { projectName, variables: [] }; }
}
module.exports = RealtimeDataService;
