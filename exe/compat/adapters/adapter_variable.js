/**
 * adapter_variable.js — /ProjectVar/* 路径兼容适配器
 * 对应旧文件: kingioserver/exe/Routes/ProjectVarManage.js
 */
const express = require('express');
const path = require('path');
const VariableService = require('../../app/services/VariableService');
function svc(pid) { return new VariableService(path.join(global.sdbPath, pid)); }

module.exports = function () {
  const r = express.Router();

  r.post('/getTagGroupList', function (req, res) {
    try { res.send(svc(req.body.projectId).getGroupList()); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/getVarProperty', function (req, res) {
    try { res.send(svc(req.body.projectId).getVarProperty(req.body.tagId)); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/getTagProperty', function (req, res) {
    try { res.send({ Error: false, rows: svc(req.body.projectId).getVars(req.body.TagGroup || null), total: 0 }); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/submitAddVarGroup', function (req, res) {
    try {
      const { projectId, groupName } = req.body;
      const g = svc(projectId).createGroup({ TagGroupName: groupName });
      res.send({ Error: false, data: g });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/editVarGroupProperty', function (req, res) {
    try {
      const { projectId, groupId, groupName } = req.body;
      svc(projectId).editGroup(groupId, { TagGroupName: groupName });
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/deleteVarGroup', function (req, res) {
    try { svc(req.body.projectId).deleteGroup(req.body.groupId); res.send({ Error: false }); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/submitCollectTagProperty', function (req, res) {
    try { const { projectId, ...d } = req.body; res.send({ code: 'OK', data: svc(projectId).createVar(d) }); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/submitCollectTagPropertyMultiple', function (req, res) {
    try { const { projectId, tagList } = req.body; res.send({ code: 'OK', data: svc(projectId).importVariables(tagList||[], { mode:'append' }) }); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/editCollectTagProperty', function (req, res) {
    try { const { projectId, TagID, ...d } = req.body; svc(projectId).editVar(TagID, d); res.send({ Error: false }); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/editCollectTagPropertyMutiple', function (req, res) {
    try { const { projectId, tagList } = req.body; const s = svc(projectId); for (const t of tagList||[]) s.editVar(t.TagID, t); res.send({ Error: false }); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/deleteCollectVariableInfo', function (req, res) {
    try { svc(req.body.projectId).deleteVars(Array.isArray(req.body.tagIds)?req.body.tagIds:[req.body.tagIds]); res.send({ Error: false }); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/moveVarToGroup', function (req, res) {
    try { const { projectId, varIds, targetVarGroupId } = req.body; res.send({ Error: false, data: svc(projectId).moveVars(varIds, targetVarGroupId) }); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/exportCollectTag', function (req, res) {
    try {
      const { projectId, tagList, allExportFlag, fileType } = req.body;
      const tags = svc(projectId).exportVariables(tagList, allExportFlag);
      if (fileType === 'csv' && tags.length > 0) { const { Parser } = require('json2csv'); return res.send(new Parser({ fields: Object.keys(tags[0]) }).parse(tags)); }
      res.send(tags);
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/exportProTagList', function (req, res) {
    try { res.send(svc(req.body.projectId).exportVariables(req.body.tagList, req.body.allExportFlag)); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/ImportCollectTag', function (req, res) {
    try {
      const formidable = require('formidable');
      new formidable.IncomingForm().parse(req, async (err, fields, files) => {
        if (err) return res.send({ Error: true, ErrorDesc: err.message });
        const { projectId, importMode, groupId, groupName } = fields;
        const file = files.uploadFile || files.tagsFiles;
        let data = [];
        if (file?.name) { if (file.name.endsWith('.json')) data = JSON.parse(require('fs').readFileSync(file.path, 'utf8')); else if (file.name.endsWith('.csv')) data = await require('csvtojson')().fromFile(file.path); }
        res.send({ Error: false, data: svc(projectId).importVariables(data, { mode: importMode||'overwrite', groupId, groupName }) });
      });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  r.post('/getVarGroupProperty', function (req, res) { try { res.send({}); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });

  return r;
};
