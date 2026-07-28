const request = require("request"),
    common = require("../../../../../config/common"),
    nodeRegister = require("../../../config/nodeRegister"),
    querystring = require("querystring");
class ProjectUtil {
    constructor() {}
    async isExistProjectName(e, t, r, o) {
        return new Promise(function (n, i) {
            var s = o,
                a = "api/v1/isExistProjectName",
                c = {
                    url: (0 === e ? "http://" + t + "/" + a : "https://" + t + "/" + a) + "?" + querystring.stringify(s),
                    json: !0,
                    path: a,
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        Authorization: "Bearer " + r,
                        Connection: "keep-alive"
                    }
                };
            request(c, function (e, t) {
                e ? i(e) : n(t.body)
            })
        })
    }
    async publishProjectBegin(e, t, r, o) {
        let n = this.getProjectStorageDir(o.projectType, o.projectId, o.projectVersion, o.tenantId);
        return new Promise(function (i, s) {
            o.projectDir = n;
            var a = "api/v1/publishProjectBegin";
            request({
                url: 0 === e ? "http://" + t + "/" + a : "https://" + t + "/" + a,
                json: !0,
                path: a,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + r
                },
                body: o
            }, function (e, t) {
                e ? s(e) : i(t.body)
            })
        })
    }
    async publishProjectEnd(e, t, r, o) {
        return new Promise(function (n, i) {
            var s = {
                    projectId: o.projectId,
                    projectVersion: o.projectVersion
                },
                a = "api/v1/publishProjectEnd";
            request({
                url: 0 === e ? "http://" + t + "/" + a : "https://" + t + "/" + a,
                json: !0,
                path: a,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + r
                },
                body: s
            }, function (e, t) {
                e ? i(e) : n(t.body)
            })
        })
    }
    getProjectStorageDir(e, t, r, o) {
        let n;
        switch (e) {
            case 0:
                n = "kingcalculation";
                break;
            case 1:
                n = "kingclient";
                break;
            case 2:
                n = "kingio";
                break;
            case 3:
                n = "kingdbconnector";
                break;
            case 4:
                n = "kingdb";
                break;
            case 5:
                n = "kingioserver"
        }
        return `sdb/${o}/${common.solutions.GUID}/${n}/${t}/${r}`
    }
    getExecStorageDir(e, t) {
        let r;
        switch (e) {
            case 0:
                r = "kingcalculation";
                break;
            case 1:
                r = "kingclient";
                break;
            case 2:
                r = "kingio";
                break;
            case 3:
                r = "kingdbconnector";
                break;
            case 4:
                r = "kingdb";
                break;
            case 5:
                r = "kingioserver"
        }
        return `exedb/${r}/x86/linux/${t}`
    }
    getImageStorageDir(e) {
        let t = "",
            r = "";
        if (0 === e) r = "imagedb/base/x86/linux";
        else {
            switch (e) {
                case 1:
                    t = "mongodb";
                    break;
                case 2:
                    t = "postgresql";
                    break;
                case 3:
                    t = "redis";
                    break;
                case 4:
                    t = "timescaledb";
                    break;
                case 5:
                    t = "mqtt"
            }
            r = `imagedb/third/x86/linux/${t}`
        }
        return r
    }
    getProxyNodeId() {
        return nodeRegister.nodeInfo.nodeId
    }
    getProxyNodeName() {
        return nodeRegister.nodeInfo.nodeName
    }
}
module.exports = new ProjectUtil;