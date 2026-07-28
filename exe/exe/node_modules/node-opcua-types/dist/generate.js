"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-types
 */
// tslint:disable:no-console
const path = __importStar(require("path"));
const d = __importStar(require("node-opcua-data-model"));
const node_opcua_data_value_1 = require("node-opcua-data-value");
const node_opcua_generator_1 = require("node-opcua-generator");
const n = __importStar(require("node-opcua-numeric-range"));
const node_opcua_variant_1 = require("node-opcua-variant");
const force_inclusion = n.NumericRange;
const force_inclusion_QualifiedName = d.QualifiedName;
const force_inclusion_LocalizedText = d.LocalizedText;
const force_inclusion_Variant = node_opcua_variant_1.Variant;
const force_inclusion_DataValue = node_opcua_data_value_1.DataValue;
async function main() {
    try {
        // await build_generated_folder();
        const filename = path.join(__dirname, "../xmlschemas/Opc.Ua.Types.bsd");
        const generatedTypescriptFilename = path.join(__dirname, "_generated_opcua_types.ts");
        await (0, node_opcua_generator_1.generate)(filename, generatedTypescriptFilename);
    }
    catch (err) {
        console.log(err);
    }
}
main().then().catch();
//# sourceMappingURL=generate.js.map