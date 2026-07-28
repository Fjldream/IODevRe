import { IAddressSpace } from "node-opcua-address-space-base";
import { DataType } from "node-opcua-basic-types";
import { NodeId } from "node-opcua-nodeid";
export interface IBaseNodeVariableOrVariableType {
    addressSpace: IAddressSpace;
    dataType: NodeId;
}
export declare function _getBasicDataType(uaNode: IBaseNodeVariableOrVariableType): DataType;
