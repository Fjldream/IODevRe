const path = require('path');
const { request_handler } = require('../../core/utils');
const VariableService = require('../services/VariableService');
function svc(pid) { return new VariableService(path.join(global.sdbPath, pid)); }

class VariableController {
  async getGroups(req, res) { try { res.sendOk(svc(req.query.projectId).getGroupList()); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async createGroup(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId).createGroup(d)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async editGroup(req, res) { try { const { projectId, groupId, ...d } = request_handler.httpPutData(req); res.sendOk(svc(projectId).editGroup(groupId, d)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async deleteGroup(req, res) { try { const { projectId, groupId } = request_handler.httpDeleteData(req); res.sendOk(svc(projectId).deleteGroup(groupId)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async getVars(req, res) { try { const { projectId, groupName } = request_handler.httpGetData(req); res.sendOk(svc(projectId).getVars(groupName||null)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async createVar(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId).createVar(d)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async editVar(req, res) { try { const { projectId, tagId, ...d } = request_handler.httpPutData(req); res.sendOk(svc(projectId).editVar(tagId, d)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async deleteVar(req, res) { try { const { projectId, tagIds } = request_handler.httpDeleteData(req); res.sendOk(svc(projectId).deleteVars(Array.isArray(tagIds)?tagIds:[tagIds])); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async moveVar(req, res) { try { const { projectId, varIds, targetGroupName } = request_handler.httpPostData(req); res.sendOk(svc(projectId).moveVars(varIds, targetGroupName)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async getProperty(req, res) { try { const { projectId, tagId } = request_handler.httpGetData(req); res.sendOk(svc(projectId).getVarProperty(tagId)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }

  async exportTags(req, res) {
    try {
      const { projectId, tagList, allExportFlag, fileType } = request_handler.httpPostData(req);
      const tags = svc(projectId).exportVariables(tagList, allExportFlag);
      if (fileType === 'csv' && tags.length > 0) {
        const { Parser } = require('json2csv');
        res.setHeader('Content-Type','text/csv; charset=utf-8');
        return res.send(new Parser({ fields: Object.keys(tags[0]) }).parse(tags));
      }
      res.sendOk(tags);
    } catch (e) { res.sendErr(e.errorCode||500, e.message); }
  }

  async importTags(req, res) {
    const multer = require('multer');
    multer({ storage: multer.memoryStorage(), limits: { fileSize: 50*1024*1024 } })
      .array('tagsFiles', 1)(req, res, async (err) => {
        if (err) return res.sendErr(400, err.message);
        try {
          const { projectId, importMode, groupId, groupName } = req.body;
          const file = req.files?.[0];
          if (!file) return res.sendErr(400, '请上传文件');
          let data = [];
          const content = file.buffer.toString('utf8');
          if (file.originalname.endsWith('.json')) data = JSON.parse(content);
          else if (file.originalname.endsWith('.csv')) data = await require('csvtojson')().fromString(content);
          res.sendOk(svc(projectId).importVariables(data, { mode: importMode||'append', groupId, groupName }));
        } catch (e) { res.sendErr(e.errorCode||500, e.message); }
      });
  }
}

module.exports = new VariableController();
