/**
 * json_comparator.js - JSON 产物一致性对比工具
 *
 * 用于自动化回归测试：对同一接口分别请求旧版和新版 kingioserver，
 * 将两个 JSON 输出传入 deepCompare() 进行递归逐字段对比。
 *
 * 使用方式：
 *   node -e "
 *     const { compareOutputs } = require('./compat/utils/json_comparator');
 *     const diffs = compareOutputs('endpointName', oldOutput, newOutput);
 *     diffs.length === 0 ? console.log('PASS') : console.log(diffs);
 *   "
 */

/**
 * 递归深度对比两个 JSON 对象
 * @param {*} oldObj - 旧版输出
 * @param {*} newObj - 新版输出
 * @param {string} currentPath - 当前层级路径（用于错误定位）
 * @returns {string[]} 差异列表，空数组表示完全一致
 */
function deepCompare(oldObj, newObj, currentPath = '') {
  const diffs = [];

  // 类型检查
  if (typeof oldObj !== typeof newObj) {
    diffs.push(`${currentPath}: type mismatch (${typeof oldObj} vs ${typeof newObj})`);
    return diffs;
  }

  // null 检查
  if (oldObj === null && newObj === null) return diffs;
  if ((oldObj === null) !== (newObj === null)) {
    diffs.push(`${currentPath}: null mismatch`);
    return diffs;
  }

  // 数组对比
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    if (oldObj.length !== newObj.length) {
      diffs.push(`${currentPath}: array length mismatch (${oldObj.length} vs ${newObj.length})`);
    }
    const len = Math.min(oldObj.length, newObj.length);
    for (let i = 0; i < len; i++) {
      diffs.push(...deepCompare(oldObj[i], newObj[i], `${currentPath}[${i}]`));
    }
    return diffs;
  }

  // 对象对比
  if (typeof oldObj === 'object') {
    // 检查缺失字段
    for (const key of Object.keys(oldObj)) {
      if (!(key in newObj)) {
        diffs.push(`${currentPath}.${key}: missing in new output`);
      } else {
        diffs.push(...deepCompare(oldObj[key], newObj[key], `${currentPath}.${key}`));
      }
    }
    // 检查多余字段
    for (const key of Object.keys(newObj)) {
      if (!(key in oldObj)) {
        diffs.push(`${currentPath}.${key}: extra in new output`);
      }
    }
    return diffs;
  }

  // 基本类型值对比（容忍浮点数微小差异）
  if (typeof oldObj === 'number' && typeof newObj === 'number') {
    if (Math.abs(oldObj - newObj) > 1e-6) {
      diffs.push(`${currentPath}: value "${oldObj}" vs "${newObj}"`);
    }
  } else if (oldObj !== newObj) {
    diffs.push(`${currentPath}: value "${oldObj}" vs "${newObj}"`);
  }

  return diffs;
}

/**
 * 对比两个 API 输出并打印结果
 * @param {string} endpoint - 接口名称（用于日志）
 * @param {*} oldOutput - 旧版 kingioserver 输出（JSON.parse 后）
 * @param {*} newOutput - 新版 kingioserver_Re 输出（JSON.parse 后）
 * @returns {string[]} 差异列表
 */
function compareOutputs(endpoint, oldOutput, newOutput) {
  const diffs = deepCompare(oldOutput, newOutput, endpoint);
  if (diffs.length === 0) {
    console.log(`PASS: ${endpoint} - outputs match`);
  } else {
    console.log(`FAIL: ${endpoint} - ${diffs.length} difference(s):`);
    for (const d of diffs) {
      console.log(`  ${d}`);
    }
  }
  return diffs;
}

/**
 * 批量对比多个接口
 * @param {Array<{name: string, old: *, new: *}>} testCases
 * @returns {{ passed: number, failed: number, diffs: Object<string, string[]> }}
 */
function batchCompare(testCases) {
  const result = { passed: 0, failed: 0, diffs: {} };
  for (const tc of testCases) {
    const d = compareOutputs(tc.name, tc.old, tc.new);
    if (d.length === 0) {
      result.passed++;
    } else {
      result.failed++;
      result.diffs[tc.name] = d;
    }
  }
  console.log(`\n总计: ${result.passed} 通过, ${result.failed} 失败`);
  return result;
}

module.exports = { compareOutputs, deepCompare, batchCompare };
