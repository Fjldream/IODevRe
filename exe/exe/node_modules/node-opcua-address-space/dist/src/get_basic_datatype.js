"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._getBasicDataType = void 0;
const node_opcua_basic_types_1 = require("node-opcua-basic-types");
const node_opcua_data_model_1 = require("node-opcua-data-model");
function _getBasicDataType(uaNode) {
    const _uaNode = uaNode;
    if (_uaNode._basicDataType) {
        return _uaNode._basicDataType;
    }
    if (_uaNode.dataType.namespace === 0 && _uaNode.dataType.value === 0) {
        return node_opcua_basic_types_1.DataType.Null;
    }
    const addressSpace = _uaNode.addressSpace;
    if (!addressSpace) {
        // may be node has been deleted already
        return node_opcua_basic_types_1.DataType.Null;
    }
    const dataTypeNode = addressSpace.findDataType(_uaNode.dataType);
    const basicDataType = dataTypeNode && dataTypeNode.nodeClass === node_opcua_data_model_1.NodeClass.DataType ? dataTypeNode.getBasicDataType() : node_opcua_basic_types_1.DataType.Null;
    // const basicDataType = addressSpace.findCorrespondingBasicDataType(uaNode.dataType);
    _uaNode._basicDataType = basicDataType;
    return basicDataType;
}
exports._getBasicDataType = _getBasicDataType;
//# sourceMappingURL=get_basic_datatype.js.map