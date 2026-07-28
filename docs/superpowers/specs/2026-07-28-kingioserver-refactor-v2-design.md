# kingioserver 重构设计文档 v2

**日期：** 2026-07-28
**状态：** 待审批

---

## 1. 概述

### 1.1 背景

`kingioserver` 是 IO 开发态服务，为 `gateway` 网关提供数据采集接口。当前 `exe/Routes/` 下约 42,000 行代码采用路由内直接混合文件读写的旧风格，需要以 `exe/lib/` 的 Controller→Service→Model 分层风格彻底重写。

### 1.2 重构目标

1. 所有业务逻辑移入 `app/services/`，Controller 只做参数提取和响应
2. **绝不引用旧 Routes**：`app/` 和 `compat/` 下不出现 `require('../../Routes/...')`
3. 接口命名遵循 lib 的 RESTful + 驼峰格式
4. 错误码 + 语言包国际化报错
5. compat 兼容适配层可整目录剥离
6. 所有接口 JSON 产物与旧开发态完全一致（硬性）
7. 修正旧代码中不合理的设计（全局变量耦合、重复代码、硬编码路径、回调地狱）
8. 大数量导入（万级以上）保证性能
9. 跨平台兼容（macOS/Windows/Linux）

---

## 2. 架构分层

```
gateway (不动)
  │  旧路径 /ProjectDev/*, /ProjectVar/*, /api/v1/*, /DriverManage/*, /Project/*, /Authority/*
  ▼
compat/adapters/
  │  每个 adapter 自己负责请求参数提取 + 格式转换
  │  返回 JSON 与旧接口完全一致
  │  错误返回旧格式: {Error: true, ErrorDesc: "..."} 或 {code: xxx, message, data: []}
  ▼
app/services/
  │  全部业务逻辑：文件读写、数据校验、导入导出、协议调用
  │  统一抛 AppError(ErrorCodes.XXX, detail)
  ▼
JSON 工程文件 (sdb/)
```

### 2.1 数据流（以"创建设备"为例）

```
gateway POST /collect/devices
  → httpPostSync(http://localhost:11002/ProjectDev/addNewDevice, {projectId, DeviceName, ...})
    → compat/adapter_device.js:
        router.post('/addNewDevice', (req, res) => {
          const service = new DeviceService(projectDir)
          const device = service.createDevice(req.body)
          res.send({Error: false, data: device})   // ← 旧格式
        })
      → app/services/DeviceService.js:
          createDevice(data) {
            // 1. Joi 校验
            // 2. 检查名称唯一性
            // 3. 自动生成系统变量
            // 4. 自动关联链路
            // 5. 写入 DeviceInfo.json
            // 6. 更新 DeviceGroupInfo.json
            return newDevice
          }
```

### 2.2 响应格式对照

| 场景 | Service 抛出 | Controller 响应(新 /api/v1) | Adapter 响应(旧路径) |
|------|-------------|---------------------------|---------------------|
| 成功 | `return data` | `res.sendOk(data)` → `{errorCode:0, message:"操作成功！", data}` | `res.send(data)` 或 `res.send({Error:false, data})` |
| 失败 | `throw new AppError(EC.DEVICE_NOT_FOUND, id)` | `res.sendErr(1000, "设备不存在 ID:xxx")` | `res.send({Error:true, ErrorDesc:"设备不存在 ID:xxx"})` |

---

## 3. 目录结构

```
kingioserver_Re/
├── config/                          # 平台级配置（不动）
├── common/                          # 公共模块（不动）
├── exe/
│   ├── index.js                     # 入口（只用 lib+app+compat，不注册旧 Routes）
│   ├── config/                      # 服务配置（不动）
│   ├── Driver/                      # 驱动文件（不动）
│   ├── Data/                        # 数据文件（不动）
│   │
│   ├── core/                        # 核心工具层
│   │   ├── middlewares/             # midware_response, midware_tenantId, midware_auth, midware_i18n
│   │   ├── utils/                   # request_handler, file_writer, function_util
│   │   ├── cache/                   # redis 缓存
│   │   ├── enums/                   # 枚举
│   │   └── bootstrap.js            # 启动初始化
│   │
│   ├── i18n/                        # 国际化
│   │   ├── errorCodes.js            # 错误码枚举（按模块分段）
│   │   ├── AppError.js              # 标准错误类
│   │   ├── zh-CN.json               # 中文语言包
│   │   ├── en-US.json               # 英文语言包
│   │   └── index.js                 # t() 翻译函数
│   │
│   ├── lib/                         # 保留不动（project/projectGroup/script）
│   │
│   ├── app/                         # 【重写】重构后的业务模块
│   │   ├── controllers/
│   │   │   ├── index.js
│   │   │   ├── controller_device.js
│   │   │   ├── controller_variable.js
│   │   │   ├── controller_driver.js
│   │   │   ├── controller_network.js
│   │   │   ├── controller_uacollect.js
│   │   │   ├── controller_dacollect.js
│   │   │   ├── controller_realtime.js
│   │   │   └── controller_authority.js
│   │   ├── services/
│   │   │   ├── index.js
│   │   │   ├── DeviceService.js        # 设备管理（设备组/设备/链路/导入导出）
│   │   │   ├── VariableService.js      # 变量管理（变量组/变量/导入导出）
│   │   │   ├── DriverService.js        # 驱动管理（安装/卸载/配置/点位映射）
│   │   │   ├── NetworkService.js       # 网络配置
│   │   │   ├── StorageService.js       # 存储配置
│   │   │   ├── TransService.js         # 转发配置
│   │   │   ├── UACollectService.js     # OPC UA 采集
│   │   │   ├── DACollectService.js     # DA 采集
│   │   │   ├── RealtimeDataService.js  # 实时数据
│   │   │   ├── AuthorityService.js     # 权限管理
│   │   │   ├── FileImportService.js    # 批量导入工具
│   │   │   └── FileExportService.js    # 批量导出工具
│   │   ├── models/
│   │   │   ├── index.js
│   │   │   ├── Device.js
│   │   │   ├── DeviceGroup.js
│   │   │   ├── Variable.js
│   │   │   ├── VariableGroup.js
│   │   │   ├── Driver.js
│   │   │   ├── NetworkConfig.js
│   │   │   ├── StorageConfig.js
│   │   │   └── TransConfig.js
│   │   └── routers/
│   │       ├── index.js                # 中间件链 + route_loader
│   │       └── api/v1/
│   │           ├── index.js            # 聚合所有 router_config
│   │           ├── device_router_config.js
│   │           ├── variable_router_config.js
│   │           ├── driver_router_config.js
│   │           ├── network_router_config.js
│   │           ├── uaCollect_router_config.js
│   │           ├── daCollect_router_config.js
│   │           ├── realtime_router_config.js
│   │           └── authority_router_config.js
│   │
│   └── compat/                      # 【重写】gateway 兼容适配层（可整目录删除）
│       ├── index.js                 # 注册所有 adapter
│       ├── adapters/
│       │   ├── adapter_device.js    # /ProjectDev/*
│       │   ├── adapter_variable.js  # /ProjectVar/*
│       │   ├── adapter_driver.js    # /DriverManage/*
│       │   ├── adapter_network.js   # /Project/*（网络/存储/转发）
│       │   ├── adapter_restful.js   # /api/v1/*（UA/DA/实时/驱动配置）
│       │   └── adapter_authority.js # /Authority/*
│       └── utils/
│           └── json_comparator.js   # JSON 产物一致性对比
```

---

## 4. 模块详细设计

### M1: 设备管理 DeviceService

**参考旧代码**: `kingioserver/exe/Routes/ProjectDeviceManage.js`（5,236 行）

**工程文件**: `DeviceGroupInfo.json` + `DeviceInfo.json`

**核心方法**:

| 方法 | 说明 |
|------|------|
| `getDeviceGroupTree()` | 从 DeviceGroupInfo.json 读取设备组列表，关联 DeviceInfo.json 中设备详情，构建完整树 |
| `createDeviceGroup(data)` | 创建组节点，检查名称唯一性 |
| `editDeviceGroup(id, data)` | 编辑组属性 |
| `deleteDeviceGroup(id)` | 删除组（检查无设备归属） |
| `getDevices(groupName?)` | 获取设备列表，可选按组过滤 |
| `createDevice(data)` | 创建设备：Joi 校验 → 名称唯一性 → 生成系统变量(Status/Control/Frequency) → 自动关联链路 → 写入 DeviceInfo.json → 更新 DeviceGroupInfo.json |
| `editDevice(id, data)` | 编辑设备属性 |
| `deleteDevices(ids)` | 删除设备 + 关联的系统变量 + 组引用 |
| `moveDevices(ids, targetGroup)` | 从旧组移除引用 → 加入新组 → 更新设备 DeviceGroup 字段 |
| `getDeviceProperty(id)` | 返回设备完整属性 |
| `createDevicesBatch(list)` | 批量创建（导入用），单次写盘 |
| `getRegisters(deviceName)` | 查询设备可用寄存器列表 |

**修正旧代码问题**:
- 全局变量 `strPlatFormType` → 从 `process.platform` 按需获取
- 系统变量模板 → Service 内 `SYSTEM_TAG_TEMPLATE` 常量
- 树递归构建散落多处 → 收敛到 `getDeviceGroupTree()`
- `ReadJson`/`WriteJson` 每处重复 → `_readFile`/`_writeFile` 私有方法

### M2: 变量管理 VariableService

**参考旧代码**: `kingioserver/exe/Routes/ProjectVarManage.js`（5,341 行）

**工程文件**: `VarGroupInfo.json` + `VarInfo.json`

**核心方法**:

| 方法 | 说明 |
|------|------|
| `getVariableGroupTree()` | 变量组列表 |
| `createVariableGroup(data)` | 创建变量组 |
| `editVariableGroup(id, data)` | 编辑变量组 |
| `deleteVariableGroup(id)` | 删除变量组 |
| `getVariables(groupName?)` | 变量列表，可选按组过滤 |
| `createVariable(data)` | 创建变量：校验设备存在 → TagID 自增 → 关联变量组 |
| `editVariable(id, data)` | 编辑变量 |
| `deleteVariables(ids)` | 删除变量 + 组引用 |
| `moveVariables(ids, targetGroup)` | 移动变量到其他组 |
| `getVariableProperty(id)` | 变量完整属性 |
| `importVariables(list, {mode, groupName})` | **核心**: 一次读→内存合并→单次写。三种模式：overwrite（覆盖）、append（追加跳过）、toGroup（导入到组，组不存在自动创建）。2W 上限校验。设备关联校验。 |
| `exportVariables(tagNames, allFlag)` | 导出为数组，CSV/JSON 格式由 Controller/Adapter 决定 |
| `getRegisters(deviceName)` | 寄存器列表 |
| `getRegisterDataTypes(deviceName, regName)` | 寄存器数据类型 |

**修正旧代码问题**:
- KF3.6/KF4.0 `TagType` 分支散落 → 收敛为 `TAG_TYPE` 常量对象
- nanoid 和 uuid 混用 → 统一 `uuid.v1()`
- 导入逐条写盘 → 内存合并 + 单次 `fs.writeFileSync`
- 重复的错误字符串拼接 → `AppError(ErrorCodes.XXX, detail)`

### M3: 驱动管理 DriverService

**参考旧代码**: `DriverManager.js`（1,011 行）+ `KFRestfulManage.js`（258 行）

**核心方法**:

| 方法 | 说明 |
|------|------|
| `getDrivers(sysPlatform?)` | 驱动列表（从 DriverInfo.json 读取） |
| `installDriver(file, info)` | 安装：解压→复制到 Driver/→更新 DriverInfo.json |
| `uninstallDriver(name, version)` | 卸载：删除目录→更新 DriverInfo.json |
| `getDriverProperty(name)` | 驱动属性配置 |
| `getPointMappingFiles(params)` | 点位映射文件列表 |
| `uploadPointMapping(file, info)` | 上传点位映射文件 |
| `delPointMapping(fileName, info)` | 删除点位映射文件 |
| `installDriverConf(data)` | 安装驱动配置文件 |
| `uploadDriverConf(file)` | 上传驱动配置文件 |

### M4: 网络/存储/转发

**三个独立 Service**，参考 `ProjectManage.js` 中对应部分：

| Service | 工程文件 | 核心方法 |
|---------|---------|---------|
| `NetworkService` | `CollectChannelInfo.json` | getProperty, addConfig, editConfig |
| `StorageService` | `DataBaseConfig.json` | getList, addConfig, editConfig, deleteConfig, getById, getDBProperty |
| `TransService` | `DataTransConfig.json` | getTypes, getDBConfig, addConfig, editConfig, deleteConfig, getById |

### M5: UA OPC UA 采集 UACollectService

**参考旧代码**: `OpcUaConfig.js`（286 行）+ `RestfulManage.js` UA 部分

**核心方法**:

| 方法 | 说明 |
|------|------|
| `uaConnect(config)` | 用 node-opcua 库测试连接 |
| `getDevices(projectId)` | UA 设备列表（DeviceInfo.json 中 DriverName='OPCUA' 的设备） |
| `addDevice(data)` | 添加 UA 设备 |
| `editDevice(id, data)` | 编辑 UA 设备 |
| `deleteDevices(ids)` | 删除 UA 设备 + 关联变量 |
| `browseRootSources(params)` | OPC UA Browse 根节点 |
| `browseChildSources(params)` | OPC UA Browse 子节点 |
| `getVariables(params)` | UA 变量列表（VarInfo.json 中关联 UA 设备的变量） |
| `addVariables(data)` | 添加 UA 变量 |
| `editVariables(data)` | 编辑 UA 变量 |
| `deleteVariables(ids)` | 删除 UA 变量 |
| `exportVariables(params)` | 导出 UA 变量 |
| `importVariables(file)` | 导入 UA 变量 |

### M6: DA 采集 DACollectService

**参考旧代码**: `RestfulManage.js` DA 部分

**核心方法**: 与 UA 对应，增加 `getDeviceGroups`/`addDeviceGroup`/`editDeviceGroup`/`deleteDeviceGroups` 用于 DA 设备组管理，以及 `testConnect` DA 连接测试。

### M7: 实时数据 RealtimeDataService

**参考旧代码**: `RestfulManage.js` 实时数据部分

| 方法 | 说明 |
|------|------|
| `getBatchRealValue(tagNames)` | 批量获取实时值 |
| `getRealtimeVarInfo(projectName)` | 实时变量信息 |

### M8: 权限管理 AuthorityService

**参考旧代码**: `AuthorityManage.js`（1,029 行）+ `OAuthenicSystemInterface.js`（1,267 行）

| 方法 | 说明 |
|------|------|
| `validateToken(token)` | Token 校验 |
| `login(credentials)` | 登录 |
| `logout(token)` | 登出 |
| `checkPermission(userInfo, resource)` | 权限检查 |
| `getUserList()` | 用户列表 |
| `createUser(data)` | 创建用户 |
| `editUser(data)` | 编辑用户 |
| `deleteUser(id)` | 删除用户 |

---

## 5. 代码规范

### 5.1 Service 模式

```js
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class XxxService {
  constructor(projectDir) { this.dir = projectDir; }

  // 私有读写
  _readFile(filename, fallback) { /* JSON.parse(fs.readFileSync) */ }
  _writeFile(filename, data) { /* mkdir + JSON.stringify + writeFileSync */ }

  // 公开业务方法
  someMethod(params) {
    const data = this._readFile('XxxInfo.json', { default: [] });
    // 业务逻辑
    if (error) throw new AppError(ErrorCodes.XXX_NOT_FOUND, `detail: ${id}`);
    this._writeFile('XxxInfo.json', data);
    return result;
  }
}
module.exports = XxxService;
```

### 5.2 Controller 模式

```js
const { request_handler } = require('../../core/utils');
const XxxService = require('../services/XxxService');

class XxxController {
  async someMethod(req, res) {
    try {
      const { projectId, ...params } = request_handler.httpGetData(req);
      const service = new XxxService(path.join(global.sdbPath, projectId));
      res.sendOk(service.someMethod(params));
    } catch (err) { res.sendErr(err.errorCode || 500, err.message); }
  }
}
module.exports = new XxxController();
```

### 5.3 Compat Adapter 模式

```js
const express = require('express');
const XxxService = require('../../app/services/XxxService');

module.exports = function () {
  const router = express.Router();

  router.post('/oldPath', function (req, res) {
    try {
      const { projectId, ...params } = req.body;
      const service = new XxxService(path.join(global.sdbPath, projectId));
      const result = service.someMethod(params);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  return router;
};
```

### 5.4 Model 模式

```js
const Joi = require('joi');
const uuid = require('uuid');

class Xxx {
  constructor(data) { /* 所有字段，带默认值 */ }
  static validate(data, isUpdate) { /* Joi schema */ }
  static create(data) { return new Xxx(this.validate(data)); }
  update(data) { Object.keys(data).forEach(k => { if (k !== 'id') this[k] = data[k]; }); return this; }
  toJSON() { return { ...this }; }
  static fromJSON(data) { return new Xxx(data); }
}
module.exports = Xxx;
```

### 5.5 三条红线

1. **禁止** `app/` 或 `compat/` 下出现 `require('../../Routes/...')`
2. **禁止** Controller 或 Adapter 中直接 `fs.readFileSync` / `fs.writeFileSync`
3. **必须** 所有错误抛 `AppError(ErrorCodes.XXX, detail)`

---

## 6. 兼容适配器路径映射

### adapter_device.js → /ProjectDev/*

| 旧路径 | Service 方法 | 旧返回格式 |
|--------|-------------|-----------|
| `getProjectDeviceGroupTreeView` | `getDeviceGroupTree()` | 直接返回树数组 |
| `getDeviceGroupAvailableMove` | `getDeviceGroupTree()` | 直接返回树数组 |
| `submitAddDeviceGroup` | `createDeviceGroup(data)` | `{Error: false, data: group}` |
| `editDeviceGroup` | `editDeviceGroup(id, data)` | `{Error: false}` |
| `deleteDeviceGroup` | `deleteDeviceGroup(id)` | `{Error: false}` |
| `getCollectDeviceProperty` | `getDevices(groupName)` | `{total, rows}` |
| `getDeviceProperty` | `getDeviceProperty(id)` | 直接返回设备对象 |
| `getAllDriverList` | → `DriverService.getDrivers()` | `{rows, total}` |
| `addNewDevice` | `createDevice(data)` | `{Error: false, data: device}` |
| `addMultipleNewDevices` | `createDevicesBatch(list)` | `{Error: false, data}` |
| `editDevice` | `editDevice(id, data)` | `{Error: false, data}` |
| `deleteDevice` | `deleteDevices(ids)` | `{Error: false}` |
| `moveDevice` | `moveDevices(ids, target)` | `{Error: false, data}` |
| `exportDevice` | `getDevices()` + CSV 转换 | 直接返回数据或 CSV |
| `importDevice` | `createDevicesBatch(list)` | `{Error: false, data}` |
| `getAllDevice` | `getDevices()` | 直接返回数组 |

### adapter_variable.js → /ProjectVar/*

| 旧路径 | Service 方法 | 旧返回格式 |
|--------|-------------|-----------|
| `getTagGroupList` | `getVariableGroupTree()` | 直接返回 |
| `getVarProperty` | `getVariableProperty(id)` | 直接返回 |
| `getTagProperty` | `getVariables(groupName)` | `{Error: false, rows, total}` |
| `submitAddVarGroup` | `createVariableGroup(data)` | `{Error: false, data}` |
| `editVarGroupProperty` | `editVariableGroup(id, data)` | `{Error: false}` |
| `deleteVarGroup` | `deleteVariableGroup(id)` | `{Error: false}` |
| `submitCollectTagProperty` | `createVariable(data)` | `{code: "OK", data}` |
| `submitCollectTagPropertyMultiple` | `importVariables(list, {mode:'append'})` | `{code: "OK", data}` |
| `editCollectTagProperty` | `editVariable(id, data)` | `{Error: false}` |
| `deleteCollectVariableInfo` | `deleteVariables(ids)` | `{Error: false}` |
| `moveVarToGroup` | `moveVariables(ids, target)` | `{Error: false, data}` |
| `exportCollectTag` | `exportVariables()` + CSV | 直接返回数据或 CSV |
| `ImportCollectTag` | `importVariables(list, opts)` | `{Error: false, data}` |

### adapter_driver.js → /DriverManage/*

| 旧路径 | Service 方法 |
|--------|-------------|
| `getDriverConfig` | `getDriverProperty(name)` |
| `getAllDriverList` | `getDrivers()` |

### adapter_network.js → /Project/*

| 旧路径 | Service 方法 |
|--------|-------------|
| `getNetWorkProperty` | `NetworkService.getProperty()` |
| `addProNetWork` | `NetworkService.addConfig(data)` |
| `getTransCom` | `TransService.getTypes()` |
| `getTransDBConfig` | `TransService.getDBConfig()` |
| `getStorageList` | `StorageService.getList()` |
| `addStorageConfig` | `StorageService.addConfig(data)` |
| `reduceStroage` | `StorageService.deleteConfig(ids)` |
| `queryOneStorage` | `StorageService.getById(id)` |
| `editStorageConfig` | `StorageService.editConfig(id, data)` |
| `queryOneTrans` | `TransService.getById(id)` |
| `reduceTrans` | `TransService.deleteConfig(ids)` |
| `editTransConfig` | `TransService.editConfig(id, data)` |

### adapter_restful.js → /api/v1/*

| 旧路径 | Service 方法 | 旧返回格式 |
|--------|-------------|-----------|
| `uaConnect` | `UACollectService.uaConnect()` | `{code:0, message:"success", data}` |
| `uaDevices` (GET/POST) | `getDevices()`/`addDevice()` | 同上 |
| `uaEditDevice` (PUT) | `editDevice()` | 同上 |
| `uaDelDevices` (DELETE) | `deleteDevices()` | 同上 |
| `uaRootSources` (GET) | `browseRootSources()` | 同上 |
| `uaChildSources` (GET) | `browseChildSources()` | 同上 |
| `uaVars` (GET) | `getVariables()` | 同上 |
| `uaAddVariables` (POST) | `addVariables()` | 同上 |
| `uaEditVariables` (PUT) | `editVariables()` | 同上 |
| `uaDelVars` (DELETE) | `deleteVariables()` | 同上 |
| `uaExportVars` (POST) | `exportVariables()` | 同上 |
| `uaImportVars` (POST) | `importVariables()` | 同上 |
| `daDeviceGroups` (GET) | `DACollectService.getDeviceGroups()` | 同上 |
| （其余 DA 路径类似 UA 模式） | | |
| `batchrealvalue` (GET) | `RealtimeDataService.getBatchRealValue()` | 同上 |
| `realtimeVarInfo` (GET) | `getRealtimeVarInfo()` | 同上 |
| `addTransConfig` (POST) | `TransService.addConfig()` | 同上 |
| `updateTransConfig` (POST) | `TransService.editConfig()` | 同上 |
| `getDBAPPpropety` (GET) | `StorageService.getDBProperty()` | 同上 |
| `drivers` (GET) | `DriverService.getDrivers()` | 同上 |
| `updateProDriver` (POST) | `DriverService.installDriverConf()` | 同上 |
| `getDriverFiles` (GET) | `DriverService.getDriverProperty()` | 同上 |

---

## 7. 错误码体系

按模块分段，已有基础（`exe/i18n/errorCodes.js`），重写时按需补充：

| 分段 | 模块 | 错误码范围 |
|------|------|-----------|
| 通用 | 文件/参数/认证 | 0-999 |
| 设备 | DeviceService | 1000-1999 |
| 变量 | VariableService | 2000-2999 |
| 驱动 | DriverService | 3000-3999 |
| 网络/存储/转发 | NetworkService/StorageService/TransService | 4000-4999 |
| UA | UACollectService | 5000-5999 |
| DA | DACollectService | 6000-6999 |
| 权限 | AuthorityService | 7000-7999 |

---

## 8. 验证标准

每个模块完成后：

1. `node -e "require('./xxx')"` — 所有 require 路径正确
2. `node index.js` — 服务启动无报错
3. `curl /api/v1/*` — 新 RESTful 路径正常返回
4. `curl /ProjectDev/*` 等旧路径 — compat 适配器正常工作
5. `json_comparator` 新旧 JSON 输出对比 — 零差异
6. `git commit + push`

---

## 9. 实施顺序

```
M1 设备管理 → M2 变量管理 → M3 驱动管理 → M4 网络/存储/转发
                                                  │
M8 权限 ← M7 实时数据 ← M6 DA采集 ← M5 UA采集 ←┘
   │
兼容适配器汇总 → 入口文件 → 全量验证
```

---

## 10. 自审清单

- [x] 无 TBD / TODO 占位
- [x] app/ 和 compat/ 不引用旧 Routes
- [x] 每个模块 5 文件（Model + Service + Controller + Router + Adapter）
- [x] 所有 gateway 调用的旧接口都有对应的 compat 适配器
- [x] 国际化方案完整（错误码 + 语言包 + AppError）
- [x] 导入性能方案：内存合并 + 单次落盘
- [x] 三条红线明确
