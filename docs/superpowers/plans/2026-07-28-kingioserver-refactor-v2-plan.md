# kingioserver v2 实施计划

> **Goal:** 按设计文档 v2 逐模块重写 app/ 和 compat/，每个 Service 包含完整业务逻辑

**Architecture:** 每个模块 5 文件：Model → Service → Controller → Router Config → Compat Adapter。Service 是唯一包含业务逻辑的层。

**Tech Stack:** Node.js + Express + Joi + uuid + csvtojson/json2csv + iconv-lite + node-opcua + formidable

## Global Constraints

1. app/ 和 compat/ 下禁止 `require('../../utils/...')` 或 `require('../Routes/...')`
2. Controller 和 Adapter 不直接读写文件
3. 所有错误抛 `new AppError(ErrorCodes.XXX, detail)`
4. 所有类和方法必须有 JSDoc
5. 跨平台：`path.join()`，不硬编码路径分隔符
6. Model 遵循 lib/Project.js 模式：constructor + validate + create + update + toJSON + fromJSON
7. Controller 遵循 lib/controller_project.js 模式：Class + async + request_handler + sendOk/sendErr
8. Router Config 遵循 lib/routers/api/v1/project_router_config.js 格式
9. Compat Adapter 返回旧 JSON 格式，与 gateway 兼容
10. 每个模块完成后 `node -e "require('./xxx')"` 验证 + git commit + push

---

## M1: 设备管理（5 文件）

### Task 1.1: Device.js Model
- Create: `exe/app/models/Device.js`
- 参考旧代码: `ProjectDeviceManage.js` 中 `newDeviceObj` 构建（约 25 个字段）
- 字段: DeviceID, DeviceName, Description, DeviceGroup, DriverName, DriverVersion, SystemPlatform, DeviceProvider, DevAddress, DevNumber, LinkType, LinkIP, SerialName, SerialBaudRate, CLSID, OsType, LinkName, DeviceAddress, DeviceType, CollectTimeInterval, Timeout, ReconnectTime, MaxReconncetInterval, Enable, ExtendField
- Joi validate + create + update + toJSON + fromJSON

### Task 1.2: DeviceGroup.js Model
- Create: `exe/app/models/DeviceGroup.js`
- 字段: DeviceGroupID, DeviceGroupName, Description, DeviceObjectList `[{DeviceID, DeviceName}]`
- Joi validate + create + update + toJSON + fromJSON

### Task 1.3: DeviceService.js
- Create: `exe/app/services/DeviceService.js`
- constructor(projectDir)
- 私有: `_readDeviceGroups()`, `_writeDeviceGroups()`, `_readDevices()`, `_writeDevices()`, `_readDeviceInfo()` → 读取 `DeviceInfo.json`, `_readVarInfo()` → 读取 `VarInfo.json`
- 公开方法（按设计文档 §4 M1 表格）: getDeviceGroupTree, createDeviceGroup, editDeviceGroup, deleteDeviceGroup, getDevices, createDevice, editDevice, deleteDevices, moveDevices, getDeviceProperty, createDevicesBatch, getRegisters
- 创建设备时自动生成 3 个系统变量（Status/Control/Frequency），自动关联链路到 CollectChannelInfo.json
- 所有错误用 AppError

### Task 1.4: controller_device.js + device_router_config.js
- Create: `exe/app/controllers/controller_device.js` — 每个方法提取 req 参数，new DeviceService，调 service，sendOk/sendErr
- Create: `exe/app/routers/api/v1/device_router_config.js` — get/post/put/delete 路由配置

### Task 1.5: adapter_device.js
- Create: `exe/compat/adapters/adapter_device.js`
- 注册所有 `/ProjectDev/*` 路径（按设计文档 §6 表格）
- 每个 handler: `new DeviceService(projectDir)`, 调 service, 返回旧格式 `{Error: false, data}`

### Task 1.6: 聚合文件
- Create: `exe/app/models/index.js`, `exe/app/services/index.js`, `exe/app/controllers/index.js`
- Create: `exe/app/routers/api/v1/index.js`, `exe/app/routers/index.js`
- Create: `exe/compat/index.js`

### Task 1.7: 验证
```bash
node -e "require('./exe/app/models/Device'); require('./exe/app/models/DeviceGroup'); require('./exe/app/services/DeviceService'); require('./exe/app/controllers/controller_device'); require('./exe/compat/adapters/adapter_device'); console.log('M1 OK')"
git add -A && git commit -m "M1: device management module" && git push
```

---

## M2: 变量管理（5 文件 + 2 工具 Service）

### Task 2.1: Variable.js + VariableGroup.js Model
- Create: `exe/app/models/Variable.js` — 26 个字段
- Create: `exe/app/models/VariableGroup.js` — TagGroupID, TagGroupName, TagObjectList

### Task 2.2: VariableService.js
- Create: `exe/app/services/VariableService.js`
- CRUD + importVariables（overwrite/append/toGroup）+ exportVariables + getRegisters
- **导入性能优化**: 一次读→内存合并（Map 索引）→单次写

### Task 2.3: FileImportService.js + FileExportService.js
- Create: `exe/app/services/FileImportService.js` — readCSVInBatches(流式), parseImportBuffer, decodeBuffer(GB2312/UTF-8)
- Create: `exe/app/services/FileExportService.js` — exportToCSV(json2csv), exportToJSON, encodeToGB2312

### Task 2.4: controller_variable.js + variable_router_config.js + adapter_variable.js

### Task 2.5: 更新聚合文件 + 验证

---

## M3-M8: 驱动、网络/存储/转发、UA、DA、实时、权限

每个模块遵循 M1 模板：Model × N → Service → Controller → Router Config → Compat Adapter → 更新聚合 → 验证。

| 模块 | 参考旧代码 | Service 文件 |
|------|-----------|-------------|
| M3 驱动 | DriverManager.js + KFRestfulManage.js | DriverService.js |
| M4 网络/存储/转发 | ProjectManage.js | NetworkService.js, StorageService.js, TransService.js |
| M5 UA | OpcUaConfig.js + RestfulManage.js UA 部分 | UACollectService.js |
| M6 DA | RestfulManage.js DA 部分 | DACollectService.js |
| M7 实时 | RestfulManage.js 实时部分 | RealtimeDataService.js |
| M8 权限 | AuthorityManage.js + OAuthenicSystemInterface.js | AuthorityService.js |

---

## M9: 兼容适配器汇总

- 补全 `adapter_restful.js` — 所有 /api/v1 旧 UA/DA/实时/驱动/转发路径
- 更新 `compat/index.js` — 注册所有 adapter

## M10: 入口文件 + 全量验证

- 重写 `exe/index.js` — 只用 lib + app + compat
- 启动服务验证
- JSON 产物对比（json_comparator）
- 性能测试（10000 条变量导入）
