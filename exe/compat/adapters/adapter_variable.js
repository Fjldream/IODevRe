/**
 * adapter_variable.js - 变量管理 compat 兼容适配器
 *
 * 将旧的 /ProjectVar/* 路径映射到新的 VariableService 调用，
 * 返回 JSON 格式与旧版 ProjectVarManage.js 完全一致。
 *
 * 支持：变量组 CRUD、变量 CRUD、导入导出、移动、寄存器查询
 * 导入模式：overwrite / append / toGroup（组不存在自动创建）
 *
 * 对应旧文件: kingioserver/exe/Routes/ProjectVarManage.js
 */

const express = require('express');
const path = require('path');
const VariableService = require('../../app/services/VariableService');

function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

module.exports = function () {
  const router = express.Router();

  /** POST /ProjectVar/getTagGroupList - 获取变量组树 */
  router.post('/getTagGroupList', function (req, res) {
    try {
      const { projectId } = req.body;
      res.send(new VariableService(getProjectDir(projectId)).getVariableGroupTree());
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/getVarGroupProperty - 获取变量组属性 */
  router.post('/getVarGroupProperty', function (req, res) {
    try {
      const { projectId, groupId } = req.body;
      const svc = new VariableService(getProjectDir(projectId));
      const tree = svc.getVariableGroupTree();
      const find = (nodes, id) => { for (const n of nodes) { if (n.TagGroupID === id) return n; if (n.Children?.length) { const f = find(n.Children, id); if (f) return f; } } return null; };
      res.send(find(tree, groupId) || {});
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/submitAddVarGroup - 创建变量组 */
  router.post('/submitAddVarGroup', function (req, res) {
    try {
      const { projectId, groupName, groupId } = req.body;
      const g = new VariableService(getProjectDir(projectId))
        .createVariableGroup({ TagGroupName: groupName, ParentID: groupId || '' });
      res.send({ Error: false, data: g });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/editVarGroupProperty - 编辑变量组 */
  router.post('/editVarGroupProperty', function (req, res) {
    try {
      const { projectId, groupId, groupName } = req.body;
      const g = new VariableService(getProjectDir(projectId))
        .editVariableGroup(groupId, { TagGroupName: groupName });
      res.send({ Error: false, data: g });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/deleteVarGroup - 删除变量组 */
  router.post('/deleteVarGroup', function (req, res) {
    try {
      const { projectId, groupId } = req.body;
      new VariableService(getProjectDir(projectId)).deleteVariableGroup(groupId);
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/getVarProperty - 获取变量属性 */
  router.post('/getVarProperty', function (req, res) {
    try {
      const { projectId, tagId } = req.body;
      res.send(new VariableService(getProjectDir(projectId)).getVariableProperty(tagId));
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/getTagProperty - 获取标签属性（同 getVarProperty） */
  router.post('/getTagProperty', function (req, res) {
    try {
      const { projectId, tagId } = req.body;
      res.send(new VariableService(getProjectDir(projectId)).getVariableProperty(tagId));
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/submitCollectTagProperty - 创建变量 */
  router.post('/submitCollectTagProperty', function (req, res) {
    try {
      const { projectId, ...d } = req.body;
      const v = new VariableService(getProjectDir(projectId)).createVariable(d);
      res.send({ Error: false, data: v });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/submitCollectTagPropertyMultiple - 批量创建变量 */
  router.post('/submitCollectTagPropertyMultiple', function (req, res) {
    try {
      const { projectId, tagList } = req.body;
      const svc = new VariableService(getProjectDir(projectId));
      const result = svc.importVariables(tagList || [], { mode: 'append' });
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/editCollectTagProperty - 编辑变量 */
  router.post('/editCollectTagProperty', function (req, res) {
    try {
      const { projectId, TagID, ...d } = req.body;
      const v = new VariableService(getProjectDir(projectId)).editVariable(TagID, d);
      res.send({ Error: false, data: v });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/editCollectTagPropertyMutiple - 批量编辑变量 */
  router.post('/editCollectTagPropertyMutiple', function (req, res) {
    try {
      const { projectId, tagList } = req.body;
      const svc = new VariableService(getProjectDir(projectId));
      for (const tag of tagList || []) {
        svc.editVariable(tag.TagID, tag);
      }
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/deleteCollectVariableInfo - 删除变量 */
  router.post('/deleteCollectVariableInfo', function (req, res) {
    try {
      const { projectId, tagIds } = req.body;
      new VariableService(getProjectDir(projectId))
        .deleteVariables(Array.isArray(tagIds) ? tagIds : [tagIds]);
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/moveVarToGroup - 移动变量 */
  router.post('/moveVarToGroup', function (req, res) {
    try {
      const { projectId, varIds, targetVarGroupId } = req.body;
      const r = new VariableService(getProjectDir(projectId))
        .moveVariablesToGroup(varIds, targetVarGroupId);
      res.send({ Error: false, data: r });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/exportCollectTag - 导出变量 */
  router.post('/exportCollectTag', function (req, res) {
    try {
      const { projectId, tagList, allExportFlag, fileType } = req.body;
      const tags = new VariableService(getProjectDir(projectId))
        .exportVariables(tagList, allExportFlag);
      if (fileType === 'csv' && tags.length > 0) {
        const { Parser } = require('json2csv');
        res.send(new Parser({ fields: Object.keys(tags[0]) }).parse(tags));
      } else { res.send(tags); }
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/exportProTagList - 导出工程变量列表 */
  router.post('/exportProTagList', function (req, res) {
    try {
      const { projectId, tagList, allExportFlag } = req.body;
      const tags = new VariableService(getProjectDir(projectId))
        .exportVariables(tagList, allExportFlag);
      res.send(tags);
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/ImportCollectTag - 导入变量（支持三种模式） */
  router.post('/ImportCollectTag', function (req, res) {
    try {
      const formidable = require('formidable');
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) return res.send({ Error: true, ErrorDesc: err.message });
        const { projectId, importMode, groupId, groupName } = fields;
        const svc = new VariableService(getProjectDir(projectId));
        const file = files.uploadFile || files.tagsFiles;
        let data = [];
        if (file?.name) {
          if (file.name.endsWith('.json')) {
            data = JSON.parse(require('fs').readFileSync(file.path, 'utf8'));
          } else if (file.name.endsWith('.csv')) {
            data = await require('csvtojson')().fromFile(file.path);
          }
        }
        res.send({
          Error: false,
          data: svc.importVariables(data, {
            mode: importMode || 'append',
            groupId,
            groupName,
          }),
        });
      });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectVar/getRegisterNames - 获取寄存器名称列表 */
  router.post('/getRegisterNames', function (req, res) {
    try {
      const { projectId, deviceName } = req.body;
      res.send(new VariableService(getProjectDir(projectId)).getRegisters(deviceName));
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  return router;
};
