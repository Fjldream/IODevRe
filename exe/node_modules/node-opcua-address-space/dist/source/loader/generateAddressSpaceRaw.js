"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAddressSpaceRaw = void 0;
const node_opcua_debug_1 = require("node-opcua-debug");
const adjust_namespace_array_1 = require("../../src/nodeset_tools/adjust_namespace_array");
const load_nodeset2_1 = require("./load_nodeset2");
const doDebug = (0, node_opcua_debug_1.checkDebugFlag)(__filename);
const debugLog = (0, node_opcua_debug_1.make_debugLog)(__filename);
const errorLog = (0, node_opcua_debug_1.make_errorLog)(__filename);
/**
 * @param addressSpace the addressSpace to populate
 * @xmlFiles: a lis of xml files
 * @param xmlLoader - a helper function to return the content of the xml file
 */
async function generateAddressSpaceRaw(addressSpace, xmlFiles, xmlLoader, options) {
    const nodesetLoader = new load_nodeset2_1.NodeSetLoader(addressSpace, options);
    if (!Array.isArray(xmlFiles)) {
        xmlFiles = [xmlFiles];
    }
    for (let index = 0; index < xmlFiles.length; index++) {
        const xmlData = await xmlLoader(xmlFiles[index]);
        try {
            await nodesetLoader.addNodeSetAsync(xmlData);
        }
        catch (err) {
            errorLog("generateAddressSpace:  Loading xml file ", xmlFiles[index], " failed with error ", err.message);
            throw err;
        }
    }
    await nodesetLoader.terminateAsync();
    (0, adjust_namespace_array_1.adjustNamespaceArray)(addressSpace);
    // however process them in series
}
exports.generateAddressSpaceRaw = generateAddressSpaceRaw;
//# sourceMappingURL=generateAddressSpaceRaw.js.map