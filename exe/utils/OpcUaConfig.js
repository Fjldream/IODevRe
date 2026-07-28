const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");
const fs = require('fs');
const {
    OPCUAClient,
    MessageSecurityMode,
    SecurityPolicy,
    AttributeIds,
    makeBrowsePath,
    ClientSubscription,
    TimestampsToReturn,
    MonitoringParametersOptions,
    ReadValueIdOptions,
    ClientMonitoredItem,
    DataValue,
    UserTokenType} = require("node-opcua");
const TYPE = {
    0:  "no tag",
    1:  "boolean",
    2:  "sbyte",
    3:  "byte",
    4:  "int16",
    5:  "uint16",
    6:  "int32",
    7:  "uint32",
    8:  "int64",
    9:  "uint64",
    10: "float",
    11: "double",
    12: "string",
    13: "datetime",
    14: "guid",
    15: "bytestring",
    16: "xmlelement",
    17: "nodeid",
    18: "expandednodeid",
    19: "statuscode",
    20: "qualifiedname",
    22: "localiziedtext",
    25: "diagnosticinfo"
}
const SECURITY_MODE = {
    "None"      :MessageSecurityMode.None,
    "Sign" :MessageSecurityMode.Sign,
    "Sign & Encrypt"      :MessageSecurityMode.SignAndEncrypt   
}
const SECURITY_POLICY = {
    "None"              :SecurityPolicy.None,
    "Basic128Rsa15"     :SecurityPolicy.Basic128Rsa15,
    "Basic256"          :SecurityPolicy.Basic256,
    "Basic256Sha256"    :SecurityPolicy.Basic256Sha256
}
class OPCUAConfig{
    constructor()
    {
        // this.baseconfig = {};
        // this.baseconfig.host= host;
        // this.baseconfig.basePath= basePath;
        // this.baseconfig.isHttp= isHttp;        
        // this.gatewayself = this;
        // console.log("OPCUAConfig()");
        this.allNodeIDs = {};
    }    
    async uaConnect(){
        let ret = 1;//connect faild
        if( this.client){
            try{
                if(this.userName || this.passWord) {
                    this.userIdentity = {
                        type:   UserTokenType.UserName,
                        userName: this.userName,
                        password: this.passWord
                      };
                }else {
                    this.userIdentity=undefined;
                }
                await this.client.connect(this.url);
                this.session = await this.client.createSession(this.userIdentity);             
                ret = 0;
                console.log("连接opcua服务成功， url: "+ this.url);
            }catch(e){
                console.log("连接opcua服务失败， url: "+this.url + "\nerror:" + e);
                await this.disConnect();
            }         
        }
        return ret;
    }
    async InitializeOpcUaClient(OPCinfo) {     
        this.opcName            = OPCinfo.opcName;   
        this.url                = OPCinfo.url;
        this.maxeconnectimeRT   = OPCinfo.maxeconnectimeRT;
        this.recoveryTime       = OPCinfo.recoveryTime;
        this.userName           = OPCinfo.userName;
        this.passWord           = OPCinfo.passWord;
        this.securityMode       = OPCinfo.securityMode;
        this.securityPolicy     = OPCinfo.securityPolicy;
        this.serverCertPath     = OPCinfo.serverCertPath;
        /**opcua client连接策略：
            maxRetry：定义客户端在连接失败后最多重试的次数。
            initialDelay：定义客户端在第一次连接失败后等待的时间。
            maxDelay：定义客户端在连接失败后最多等待的时间。
            randomisationFactor：定义客户端在等待时间内随机等待的比例
        */
        const connectionStrategy = {
            initialDelay:   this.maxeconnectimeRT,
            maxDelay:       this.recoveryTime >= this.maxeconnectimeRT ?  this.recoveryTime : this.maxeconnectimeRT*2
        }; 
        let clientObj = {};
        clientObj.applicationName       = this.opcName;
        clientObj.connectionStrategy    = connectionStrategy;
        clientObj.securityMode          = SECURITY_MODE[this.securityMode];
        clientObj.securityPolicy        = SECURITY_POLICY[this.securityPolicy];
        clientObj.endpointMustExist     = false;
        clientObj.applicationUri        = "urn:DESKTOP-TIQ88R1:wellintech:KingIOServer_UAClient"; 
        clientObj.certificateFile   = "./config/KingIOServer_UAClient.der";
        clientObj.privateKeyFile    = "./config/KingIOServer_UAClient.pem";
        if (this.serverCertPath) {
            try{
                clientObj.serverCertificate = fs.readFileSync(this.serverCertPath);
            }catch(e){
                console.log(e);
            }
        }
        const client = OPCUAClient.create(clientObj); 
        // const client = OPCUAClient.create({
        //     applicationName: OPCName,
        //     connectionStrategy: connectionStrategy,
        //     securityMode: MessageSecurityMode.SignAndEncrypt,//?
        //     securityPolicy: SecurityPolicy.Basic256Sha256,//?
        //     endpointMustExist: false,
        //     certificateFile: CAPath
        // });

        // const client = OPCUAClient.create({
        //     applicationName: OPCName,
        //     connectionStrategy: connectionStrategy,
        //     securityMode: MessageSecurityMode.None,//?
        //     securityPolicy: SecurityPolicy.None,//?
        //     endpointMustExist: false
        // });
        this.client = client;
    }
    async BrowseOpcUaItemFirst() {
        let res = [];
        if(!this.session) return res;
        let browseResult = await this.session.browse("ObjectsFolder");    
        //console.log("references of ObjectsFolder :");
        for (let reference of browseResult.references) {
            if(reference.nodeId.identifierType > 2) continue;
            let strNodeInfo = "", nodeId = "";            
            strNodeInfo += reference.nodeId.namespace;
            strNodeInfo += "|";            
            strNodeInfo += reference.nodeId.identifierType == 1?"Numeric":"String";
            strNodeInfo += "|";
            strNodeInfo += reference.nodeId.value;
            nodeId = strNodeInfo;
            strNodeInfo += "##&&!!";//250424
            strNodeInfo += reference.nodeId.value;
            strNodeInfo += "##&&!!";//250424
            strNodeInfo += reference.nodeClass;  
            strNodeInfo += "##&&!!";//250424
            strNodeInfo += reference.displayName.text; 
            this.allNodeIDs[nodeId] = reference.nodeId;        
            res.push(strNodeInfo);
        }
        return res;
    }
    async ReadValueSpecifiedByNodeIdMap(nodeIdIMap){
        let res = [];
        for(let nodeid of nodeIdIMap) {
            let arr = nodeid.split("|");
            let fIndex = nodeid.indexOf("|");
            let subStr = nodeid.substr(fIndex+1);
            let sIndex = subStr.indexOf("|");
            let ns = nodeid.substr(0, fIndex), dataType = subStr.substr(0, sIndex), identifier=subStr.substr(sIndex+1);
            let nodeIdStr = "ns="+ns+";"+(dataType=="Numeric"?"i=":"s=")+identifier;
            const dataTypeToRead = {
                nodeId: nodeIdStr,
                attributeId: AttributeIds.Value
            };
            const dataTypeValue = await this.session.read(dataTypeToRead);
            let t = TYPE[dataTypeValue.value.dataType];
            let type = t || TYPE[0];

            const asscessTypeToRead = {
                nodeId: nodeIdStr,
                attributeId: AttributeIds.AccessLevel
            };
            const accessValue = await this.session.read(asscessTypeToRead);
            if(accessValue.value.value==1 || accessValue.value.value==3) {
                type = type?(type+"|read"):"read";
            }
            if(accessValue.value.value==2 || accessValue.value.value==3) {
                type = type?(type+"|write"):"write";
            }
            res.push(nodeid+"#*$!"+type);//20250901
        }
        
        return res;
    }
    //测试opc server 连接
    async testConnect(OPCInfoObj) {
        await this.InitializeOpcUaClient(OPCInfoObj);
        let ret = await this.uaConnect();
        // this.disConnect();
        return ret;
    }
    async getInitTree(OPCInfoObj) {
        let res = [];
        if(!OPCInfoObj.url.length) {
            return res;
        }
        await this.InitializeOpcUaClient(OPCInfoObj);
        let ret = await this.uaConnect();
        if(ret != 0){             
            return res;
        }
        res = this.BrowseOpcUaItemFirst();
        return res;
    }
    //20240613
    async processBrowseNext(continuationPoint, releaseContinuationPoints, preNodeInfos) {

        if(continuationPoint) {
            let nextNodeInfos = await this.session.browseNext(continuationPoint, releaseContinuationPoints);
            continuationPoint = nextNodeInfos.continuationPoint;
            if(continuationPoint) await processBrowseNext( continuationPoint,releaseContinuationPoints, preNodeInfos);
            preNodeInfos.references.push(...nextNodeInfos.references);
        }
    }

    async getObjInfo(nodeInfo) {
        let res = [];
        let nodeId = this.allNodeIDs[nodeInfo]
        let fIndex = nodeInfo.indexOf('|');
        let subStr = nodeInfo.substr(fIndex+1);
        let sIndex = subStr.indexOf('|');
        let ns = nodeInfo.substr(0, fIndex), is = subStr.substr(sIndex+1);

        let nodeIdStr = "ns=" + ns + (nodeId.identifierType==1?";i=":";s=" )+ is;
        if( this.session ){
            let nodeInfos = await this.session.browse(nodeIdStr);
            await this.processBrowseNext( nodeInfos.continuationPoint,false, nodeInfos);
            for(let reference of nodeInfos.references){
                if(reference.nodeId.identifierType > 2) continue;
                let strNodeInfo = "", nodeId = "";            
                strNodeInfo += reference.nodeId.namespace;
                strNodeInfo += "|";
                strNodeInfo += reference.nodeId.identifierType == 1?"Numeric":"String";
                strNodeInfo += "|";
                strNodeInfo += reference.nodeId.value;
                nodeId = strNodeInfo;
                strNodeInfo += "##**##**";
                strNodeInfo += reference.nodeId.value;
                strNodeInfo += "##**##**";
                strNodeInfo += reference.nodeClass;  
                strNodeInfo += "##**##**";
                strNodeInfo += reference.displayName.text; 
                this.allNodeIDs[nodeId] = reference.nodeId;        
                res.push(strNodeInfo);
            }
        } else {
            res.push("fault");
        }

        return res
    }
    async getSubVar(param) {
        let res = [];
        res = await this.ReadValueSpecifiedByNodeIdMap(param);
        return res;
    }
    async disConnect() {
        let ret = 0;
        if(this.client) {
            try{
                await this.client.disconnect();
            }catch(e){
                ret=-1
                console.log("断开opcua连接失败。url:"+this.client.endpointUrl);
            }
           
        }
        return ret;
    }
}

module.exports = OPCUAConfig