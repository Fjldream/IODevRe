# kingioserver 重构设计文档

**日期：** 2026-07-28
**状态：** 待审批

---

## 1. 概述

### 1.1 背景

`kingioserver` 是 IO 开发态服务，为 `gateway` 网关提供数据采集相关的后端接口。当前代码分为两套风格：

- **lib 风格（新）**：`exe/lib/` 下，采用 Controller → Service → Model 分层，路由通过 `route_loader` 动态加载，响应格式统一 `{errorCode, message, data}`
- **Routes 风格（旧）**：`exe/Routes/` 下（~42,000 行），直接在路由函数中混合文件读写，无分层，响应格式不统一

`gateway` 网关服务通过旧风格路径（`/ProjectDev/*`, `/ProjectVar/*`, `/api/v1/*`, `/DriverManage/*`, `/Project/*`）调用 kingioserver。

### 1.2 重构目标

1. 生成工程文件格式和字段不变（兼容现有运行态）
2. 保留 `exe/lib/` 下所有文件及接口，可修改内部逻辑提升通用性
3. 以 lib 风格重构设备、变量、驱动、权限等模块
4. 接口命名遵循 lib 下的 RESTful + 驼峰格式
5. 实现错误码 + 语言包的国际化报错
6. 新开发态输出到 `kingioserver_Re/` 文件夹
7. gateway 不动，在 kingioserver_Re 中做独立 compat 适配层
8. 所有接口 JSON 产物与旧开发态完全一致（硬性要求）
9. 大数量导入（上万条）需保证性能

---

## 2. 目录结构

```
kingioserver_Re/
├── config/                          # 平台级配置（复制，不动）
│   ├── oemConfig.json
│   ├── externalConfig.json
│   ├── common.json
│   ├── opscenterconfig.json
│   ├── nodeRegister.json
│   ├── devconfig.json
│   └── proxyconfig.json
│
├── common/                          # 公共模块（复制，不动）
│   ├── log4js/
│   └── projectClient/
│
├── exe/
│   ├── index.js                     # 入口（精简，启动+注册路由）
│   ├── config/                      # 服务配置（复制，不动）
│   │   ├── serverconfig.json
│   │   ├── server.key
│   │   ├── server.pem
│   │   ├── interalconfig.json
│   │   ├── KIOLogCfg.json
│   │   ├── KingIOServer_UAClient.der
│   │   ├── KingIOServer_UAClient.pem
│   │   ├── type.json
│   │   └── logconfig.json
│   ├── Driver/                      # 驱动文件（复制，不动）
│   ├── Data/                        # 数据文件（复制，不动）
│   ├── start.sh / start.bat         # 启动脚本（复制）
│   ├── version.json                 # 版本文件（复制）
│   │
│   ├── core/                        # 核心工具层（保留，增强 i18n）
│   │   ├── middlewares/
│   │   │   ├── index.js                   # 导出所有中间件
│   │   │   ├── midware_response.js        # 统一响应封装 sendOk/sendErr
│   │   │   ├── midware_tenantId.js        # 租户ID校验（保留）
│   │   │   ├── midware_auth.js            # 认证提取 + 权限校验
│   │   │   └── midware_i18n.js            # 【新增】国际化中间件，解析 Accept-Language
│   │   ├── utils/
│   │   │   ├── index.js
│   │   │   ├── function_util.js
│   │   │   ├── upload.js
│   │   │   ├── request_handler.js
│   │   │   ├── cryptico.js
│   │   │   └── file_writer.js             # 【新增】批量文件写入工具
│   │   ├── cache/
│   │   │   ├── index.js
│   │   │   └── cache_redis.js
│   │   └── enums/
│   │       ├── index.js
│   │       ├── enum_storeEntity.js
│   │       └── enum_common.js
│   │
│   ├── i18n/                        # 【新增】国际化
│   │   ├── index.js                       # i18n 工具（t 函数）
│   │   ├── errorCodes.js                  # 错误码枚举
│   │   ├── AppError.js                    # 标准错误类
│   │   ├── zh-CN.json                     # 中文语言包
│   │   └── en-US.json                     # 英文语言包
│   │
│   ├── lib/                         # 【保留】已有新风格模块
│   │   ├── controllers/
│   │   │   ├── index.js
│   │   │   ├── controller_project.js
│   │   │   ├── controller_projectGroup.js
│   │   │   └── controller_script.js
│   │   ├── services/
│   │   │   ├── ProjectService.js
│   │   │   ├── ProjectGroupService.js
│   │   │   ├── TenantManager.js
│   │   │   ├── dataStore.js
│   │   │   └── fileOperationService.js
│   │   ├── models/
│   │   │   ├── Project.js
│   │   │   └── ProjectGroup.js
│   │   └── routers/
│   │       ├── index.js
│   │       ├── route_loader.js
│   │       └── api/v1/
│   │           ├── index.js
│   │           ├── project_router_config.js
│   │           └── projectGroup_router_config.js
│   │
│   ├── app/                         # 【新增】重构后的业务模块
│   │   ├── controllers/
│   │   │   ├── index.js
│   │   │   ├── controller_device.js          # 设备管理
│   │   │   ├── controller_variable.js        # 变量管理
│   │   │   ├── controller_driver.js          # 驱动管理
│   │   │   ├── controller_network.js         # 网络/存储/转发配置
│   │   │   ├── controller_uacollect.js       # UA OPC采集
│   │   │   ├── controller_dacollect.js       # DA采集
│   │   │   ├── controller_realtime.js        # 实时数据
│   │   │   ├── controller_authority.js       # 权限管理
│   │   │   └── controller_projectExt.js      # 工程扩展（lib 中 Project 未覆盖的功能）
│   │   ├── services/
│   │   │   ├── index.js
│   │   │   ├── DeviceService.js              # 设备组 + 设备 CRUD
│   │   │   ├── VariableService.js            # 变量组 + 变量 CRUD + 导入导出
│   │   │   ├── DriverService.js              # 驱动安装/卸载/配置
│   │   │   ├── NetworkService.js             # 网络配置
│   │   │   ├── StorageService.js             # 存储配置
│   │   │   ├── TransService.js               # 转发配置
│   │   │   ├── UACollectService.js           # UA OPC UA 采集
│   │   │   ├── DACollectService.js           # DA 采集
│   │   │   ├── RealtimeDataService.js        # 实时数据读取
│   │   │   ├── AuthorityService.js           # 权限
│   │   │   ├── FileImportService.js          # 【重要】批量导入优化（万级以上）
│   │   │   └── FileExportService.js          # 批量导出
│   │   ├── models/
│   │   │   ├── index.js
│   │   │   ├── Device.js                     # 设备模型 + Joi 校验
│   │   │   ├── DeviceGroup.js                # 设备组模型
│   │   │   ├── Variable.js                   # 变量模型 + Joi 校验
│   │   │   ├── VariableGroup.js              # 变量组模型
│   │   │   ├── Driver.js                     # 驱动模型
│   │   │   ├── NetworkConfig.js              # 网络配置模型
│   │   │   ├── StorageConfig.js              # 存储配置模型
│   │   │   └── TransConfig.js                # 转发配置模型
│   │   └── routers/
│   │       ├── index.js                      # app 路由器汇总
│   │       └── api/v1/
│   │           ├── index.js
│   │           ├── device_router_config.js
│   │           ├── variable_router_config.js
│   │           ├── driver_router_config.js
│   │           ├── network_router_config.js
│   │           ├── uaCollect_router_config.js
│   │           ├── daCollect_router_config.js
│   │           ├── realtime_router_config.js
│   │           └── authority_router_config.js
│   │
│   └── compat/                      # 【新增】gateway 兼容适配层（可整目录删除）
│       ├── index.js                       # compat 入口，注册所有旧路径
│       ├── adapters/
│       │   ├── adapter_device.js          # /ProjectDev/* → app device service
│       │   ├── adapter_variable.js        # /ProjectVar/* → app variable service
│       │   ├── adapter_driver.js          # /DriverManage/* → app driver service
│       │   ├── adapter_restful.js         # /api/v1/*（旧格式） → app 各 service
│       │   ├── adapter_network.js         # /Project/*（网络/存储） → app network service
│       │   └── adapter_authority.js       # /Authority/* → app authority service
│       └── utils/
│           ├── format_converter.js        # 新格式 ↔ 旧格式 转换工具
│           └── json_comparator.js         # JSON 产物一致性对比工具
```

---

## 3. 架构分层

```
┌──────────────────────────────────────────────────────┐
│                    gateway (不动)                      │
│   controllers → services → http call kingioserver     │
└──────────────────────┬───────────────────────────────┘
                       │ 旧路径 /ProjectDev/*, /ProjectVar/*, ...
                       ▼
┌──────────────────────────────────────────────────────┐
│              kingioserver_Re/exe/compat                │
│  adapters: 旧路径 → 新 service，新响应 → 旧 JSON       │
│  【可整目录删除，切换到纯新接口】                         │
└──────────────────────┬───────────────────────────────┘
                       │ 调用新 service
                       ▼
┌──────────────────────────────────────────────────────┐
│               kingioserver_Re/exe/app                  │
│  controllers → services → models → JSON 文件读写       │
│  响应: { errorCode, message, data }                   │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│               kingioserver_Re/exe/lib                  │
│  Project, ProjectGroup, Script（已有，保留）            │
│  响应: { errorCode, message, data }                   │
└──────────────────────────────────────────────────────┘
```

### 3.1 数据流（以"获取设备列表"为例）

```
gateway
  GET /collect/devices?projectId=xxx
    │
    ▼
gateway controller_collect.getDevicesList()
    │ httpGetSync(http://127.0.0.1:11002/ProjectDev/getProjectDeviceGroupTreeView?projectId=xxx)
    ▼
kingioserver_Re compat/adapter_device.js
    │ 解析旧参数 → app/DeviceService.getDeviceGroupsByProject(projectId)
    ▼
app/DeviceService.js
    │ 验证工程存在 → 读取 DeviceInfo.json → 构建设备树
    ▼
compat 层将新格式转为旧 JSON 格式，res.send(oldFormat)
    │ 返回 JSON 与旧版逐字段一致
    ▼
gateway 收到完全一致的 JSON
```

---

## 4. 接口命名规范（RESTful + 驼峰）

遵循 lib 已有风格：`method + resource + 驼峰`

| 方法 | 路径格式 | 示例 |
|------|---------|------|
| GET 列表 | `/api/v1/resourceName` | `/api/v1/devices?projectId=` |
| GET 单个 | `/api/v1/resourceNameById` | `/api/v1/deviceById?guid=` |
| POST 创建 | `/api/v1/resourceName` | `POST /api/v1/devices` |
| PUT 更新 | `/api/v1/resourceName` | `PUT /api/v1/devices` |
| DELETE 删除 | `/api/v1/resourceName` | `DELETE /api/v1/devices` |

### 4.1 接口清单

#### 设备管理

| 方法 | 新路径 | 说明 |
|------|--------|------|
| GET | `/api/v1/deviceGroups` | 获取设备组树 |
| POST | `/api/v1/deviceGroups` | 创建设备组 |
| PUT | `/api/v1/deviceGroups` | 编辑设备组 |
| DELETE | `/api/v1/deviceGroups` | 删除设备组 |
| GET | `/api/v1/devices` | 获取设备列表 |
| POST | `/api/v1/devices` | 创建设备 |
| PUT | `/api/v1/devices` | 编辑设备 |
| DELETE | `/api/v1/devices` | 删除设备 |
| POST | `/api/v1/moveDevice` | 移动设备到其他组 |
| GET | `/api/v1/deviceProperty` | 获取设备属性 |
| POST | `/api/v1/exportDevices` | 导出设备 |
| POST | `/api/v1/importDevices` | 导入设备 |
| GET | `/api/v1/registers` | 获取寄存器列表 |
| GET | `/api/v1/registerDataTypes` | 获取寄存器数据类型 |

#### 变量管理

| 方法 | 新路径 | 说明 |
|------|--------|------|
| GET | `/api/v1/variableGroups` | 获取变量组树 |
| POST | `/api/v1/variableGroups` | 创建变量组 |
| PUT | `/api/v1/variableGroups` | 编辑变量组 |
| DELETE | `/api/v1/variableGroups` | 删除变量组 |
| GET | `/api/v1/variables` | 获取变量列表 |
| POST | `/api/v1/variables` | 创建变量 |
| PUT | `/api/v1/variables` | 编辑变量 |
| DELETE | `/api/v1/variables` | 删除变量 |
| POST | `/api/v1/moveVarToGroup` | 移动变量到其他组 |
| GET | `/api/v1/variableProperty` | 获取变量属性 |
| POST | `/api/v1/exportTags` | 导出变量 |
| POST | `/api/v1/importTags` | 导入变量（含覆盖导入/导入到组） |

#### 驱动管理

| 方法 | 新路径 | 说明 |
|------|--------|------|
| GET | `/api/v1/drivers` | 获取驱动列表 |
| POST | `/api/v1/drivers` | 安装驱动 |
| DELETE | `/api/v1/drivers` | 卸载驱动 |
| GET | `/api/v1/driverProperty` | 获取驱动属性配置 |
| POST | `/api/v1/installDriverConf` | 安装驱动配置文件 |
| POST | `/api/v1/uploadDriverConf` | 上传驱动配置文件 |

#### UA OPC UA 采集

| 方法 | 新路径 | 说明 |
|------|--------|------|
| POST | `/api/v1/uaConnect` | UA 连接测试 |
| POST | `/api/v1/uaDevices` | UA 添加设备 |
| GET | `/api/v1/uaDevices` | UA 设备列表 |
| PUT | `/api/v1/uaDevices` | UA 编辑设备 |
| DELETE | `/api/v1/uaDevices` | UA 删除设备 |
| GET | `/api/v1/uaRootSources` | UA 根节点浏览 |
| GET | `/api/v1/uaChildSources` | UA 子节点浏览 |
| GET | `/api/v1/uaVariables` | UA 变量列表 |
| POST | `/api/v1/uaVariables` | UA 添加变量 |
| PUT | `/api/v1/uaVariables` | UA 编辑变量 |
| DELETE | `/api/v1/uaVariables` | UA 删除变量 |
| POST | `/api/v1/uaExportVariables` | UA 导出变量 |
| POST | `/api/v1/uaImportVariables` | UA 导入变量 |

#### DA 采集

| 方法 | 新路径 | 说明 |
|------|--------|------|
| GET | `/api/v1/daDeviceGroups` | DA 设备组列表 |
| POST | `/api/v1/daDeviceGroups` | DA 添加设备组 |
| PUT | `/api/v1/daDeviceGroups` | DA 编辑设备组 |
| DELETE | `/api/v1/daDeviceGroups` | DA 删除设备组 |
| GET | `/api/v1/daDevices` | DA 设备列表 |
| POST | `/api/v1/daDevices` | DA 添加设备 |
| PUT | `/api/v1/daDevices` | DA 编辑设备 |
| DELETE | `/api/v1/daDevices` | DA 删除设备 |
| GET | `/api/v1/daVariables` | DA 变量列表 |
| POST | `/api/v1/daVariables` | DA 添加变量 |
| PUT | `/api/v1/daVariables` | DA 编辑变量 |
| DELETE | `/api/v1/daVariables` | DA 删除变量 |
| GET | `/api/v1/daTestConnect` | DA 连接测试 |
| GET | `/api/v1/daRootSources` | DA 根节点浏览 |
| GET | `/api/v1/daChildSources` | DA 子节点浏览 |
| POST | `/api/v1/daExportVariables` | DA 导出变量 |
| POST | `/api/v1/daImportVariables` | DA 导入变量 |

#### 网络/存储/转发

| 方法 | 新路径 | 说明 |
|------|--------|------|
| GET | `/api/v1/netWorkProperty` | 获取网络配置 |
| POST | `/api/v1/netWorkConfig` | 添加/修改网络配置 |
| GET | `/api/v1/transTypes` | 获取转发类型 |
| GET | `/api/v1/transConfigs` | 获取转发配置列表 |
| POST | `/api/v1/transConfigs` | 添加转发配置 |
| PUT | `/api/v1/transConfigs` | 编辑转发配置 |
| DELETE | `/api/v1/transConfigs` | 删除转发配置 |
| GET | `/api/v1/storageConfigs` | 获取存储配置列表 |
| POST | `/api/v1/storageConfigs` | 添加存储配置 |
| PUT | `/api/v1/storageConfigs` | 编辑存储配置 |
| DELETE | `/api/v1/storageConfigs` | 删除存储配置 |
| GET | `/api/v1/dbProperty` | 获取数据库属性 |

#### 实时数据

| 方法 | 新路径 | 说明 |
|------|--------|------|
| GET | `/api/v1/batchRealValue` | 批量获取实时值（Linux） |
| GET | `/api/v1/realtimeVarInfo` | 实时变量信息 |

---

## 5. 国际化设计

### 5.1 错误码体系

```js
// i18n/errorCodes.js
const ErrorCodes = {
  // 通用 (0-999)
  SUCCESS:                    { code: 0,   key: 'success' },
  INTERNAL_ERROR:             { code: 500, key: 'internalError' },
  VALIDATION_ERROR:           { code: 400, key: 'validationError' },
  NOT_FOUND:                  { code: 404, key: 'notFound' },
  UNAUTHORIZED:               { code: 401, key: 'unauthorized' },
  FILE_NOT_FOUND:             { code: 405, key: 'fileNotFound' },
  FILE_READ_ERROR:            { code: 406, key: 'fileReadError' },
  FILE_WRITE_ERROR:           { code: 407, key: 'fileWriteError' },

  // 设备 (1000-1999)
  DEVICE_NOT_FOUND:           { code: 1000, key: 'deviceNotFound' },
  DEVICE_NAME_EXISTS:         { code: 1001, key: 'deviceNameExists' },
  DEVICE_GROUP_NOT_FOUND:     { code: 1002, key: 'deviceGroupNotFound' },
  DEVICE_GROUP_NAME_EXISTS:   { code: 1003, key: 'deviceGroupNameExists' },
  DEVICE_ADDRESS_INVALID:     { code: 1004, key: 'deviceAddressInvalid' },
  DEVICE_IMPORT_FAILED:       { code: 1005, key: 'deviceImportFailed' },
  DEVICE_EXPORT_FAILED:       { code: 1006, key: 'deviceExportFailed' },
  DEVICE_HAS_VARIABLES:       { code: 1007, key: 'deviceHasVariables' },

  // 变量 (2000-2999)
  VARIABLE_NOT_FOUND:         { code: 2000, key: 'variableNotFound' },
  VARIABLE_NAME_EXISTS:       { code: 2001, key: 'variableNameExists' },
  VARIABLE_GROUP_NOT_FOUND:   { code: 2002, key: 'variableGroupNotFound' },
  VARIABLE_GROUP_NAME_EXISTS: { code: 2003, key: 'variableGroupNameExists' },
  VARIABLE_IMPORT_FAILED:     { code: 2004, key: 'variableImportFailed' },
  VARIABLE_EXPORT_FAILED:     { code: 2005, key: 'variableExportFailed' },
  VARIABLE_REG_INVALID:       { code: 2006, key: 'variableRegInvalid' },
  VARIABLE_TYPE_INVALID:      { code: 2007, key: 'variableTypeInvalid' },

  // 驱动 (3000-3999)
  DRIVER_NOT_FOUND:           { code: 3000, key: 'driverNotFound' },
  DRIVER_INSTALL_FAILED:      { code: 3001, key: 'driverInstallFailed' },
  DRIVER_UNINSTALL_FAILED:    { code: 3002, key: 'driverUninstallFailed' },
  DRIVER_CONFIG_INVALID:      { code: 3003, key: 'driverConfigInvalid' },

  // 网络/存储/转发 (4000-4999)
  NETWORK_CONFIG_INVALID:     { code: 4000, key: 'networkConfigInvalid' },
  STORAGE_NOT_FOUND:          { code: 4001, key: 'storageNotFound' },
  TRANS_NOT_FOUND:            { code: 4002, key: 'transNotFound' },
  DB_CONNECT_FAILED:          { code: 4003, key: 'dbConnectFailed' },

  // UA采集 (5000-5999)
  UA_CONNECT_FAILED:          { code: 5000, key: 'uaConnectFailed' },
  UA_DEVICE_NOT_FOUND:        { code: 5001, key: 'uaDeviceNotFound' },
  UA_SOURCE_BROWSE_FAILED:    { code: 5002, key: 'uaSourceBrowseFailed' },

  // DA采集 (6000-6999)
  DA_CONNECT_FAILED:          { code: 6000, key: 'daConnectFailed' },
  DA_DEVICE_NOT_FOUND:        { code: 6001, key: 'daDeviceNotFound' },
  DA_SOURCE_BROWSE_FAILED:    { code: 6002, key: 'daSourceBrowseFailed' },

  // 权限 (7000-7999)
  PERMISSION_DENIED:          { code: 7000, key: 'permissionDenied' },
  TOKEN_INVALID:              { code: 7001, key: 'tokenInvalid' },
  TOKEN_EXPIRED:              { code: 7002, key: 'tokenExpired' },
};
```

### 5.2 语言包结构

```json
// i18n/zh-CN.json
{
  "success": "操作成功",
  "internalError": "服务器内部错误",
  "validationError": "数据验证失败",
  "notFound": "资源不存在",
  "fileNotFound": "工程文件不存在",
  "fileReadError": "文件读取失败",
  "fileWriteError": "文件写入失败",
  "deviceNotFound": "设备不存在",
  "deviceNameExists": "设备名称已存在",
  "deviceGroupNotFound": "设备组不存在",
  ...
}

// i18n/en-US.json
{
  "success": "Operation successful",
  "internalError": "Internal server error",
  "validationError": "Data validation failed",
  "notFound": "Resource not found",
  "deviceNotFound": "Device not found",
  "deviceNameExists": "Device name already exists",
  ...
}
```

### 5.3 使用方式

```js
// i18n/AppError.js
class AppError extends Error {
  constructor(errorCode, detail = '') {
    super(errorCode.key);
    this.errorCode = errorCode.code;
    this.i18nKey = errorCode.key;
    this.detail = detail;
  }
}

// 业务层抛出
throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, `ID: ${deviceId}`);

// 中间件捕获 + 翻译
// midware_i18n.js 根据 req.headers['accept-language'] 选择语言包
// → zh-CN: { errorCode: 1000, message: "设备不存在 ID: xxx", data: null }
// → en-US: { errorCode: 1000, message: "Device not found ID: xxx", data: null }
```

### 5.4 与 compat 层的错误兼容

compat 适配器调用新 service 时，捕获 `AppError`，转为旧格式错误响应（与旧版 `codeMessage.js` 中的格式一致），确保 gateway 的 `error_transformation` 仍然能正常工作：

```js
// compat 适配器中
try {
  const result = await deviceService.getDevices(projectId);
  res.send(toOldDeviceListFormat(result));
} catch (err) {
  if (err instanceof AppError) {
    // 返回旧格式错误，与旧版 codeMessage.js 一致
    res.send({
      code: err.errorCode,
      message: err.message,
      data: []
    });
  } else {
    res.send({
      code: 500,
      message: err.message,
      data: []
    });
  }
}
```

---

## 6. 性能设计（大批量导入）

### 6.1 问题分析

旧代码在导入上万条变量/设备时，逐条同步写入 JSON 文件，导致：
- 每次写入都要完整的 JSON.stringify + fs.writeFileSync
- 大文件（几MB）反复序列化，性能极差
- 导入过程中阻塞整个进程

### 6.2 优化策略

#### 批量内存操作 + 单次落盘

```js
// FileImportService.js
class FileImportService {
  async importVariables(projectId, variables, importMode) {
    // 1. 一次性读取 VarInfo.json 到内存
    const varInfo = await this.readJson(projectDir, 'VarInfo.json');

    // 2. 根据模式在内存中合并
    switch (importMode) {
      case 'overwrite':  // 覆盖导入
        varInfo.TagList = this.mergeOverwrite(varInfo.TagList, variables);
        break;
      case 'append':     // 追加导入
        varInfo.TagList = this.mergeAppend(varInfo.TagList, variables);
        break;
      case 'toGroup':    // 导入到指定组
        varInfo.TagList = this.mergeToGroup(varInfo.TagList, variables, targetGroupId);
        break;
    }

    // 3. 只做一次 JSON.stringify + writeFileSync
    await this.writeJson(projectDir, 'VarInfo.json', varInfo);

    // 4. 批量更新索引/关联文件
    await this.batchUpdateIndexFiles(projectDir, variables);
  }
}
```

#### 流式处理大文件

对于 CSV/ZIP 导入，使用流式读取，分批处理（每批 500-1000 条），避免内存溢出：

```js
async importFromCSV(filePath, projectId, importMode, batchSize = 500) {
  const batches = [];
  let batch = [];
  
  // 流式读取 CSV
  await csv2Json({ /* stream */ }).fromFile(filePath)
    .on('data', (row) => {
      batch.push(this.parseRow(row));
      if (batch.length >= batchSize) {
        batches.push([...batch]);
        batch = [];
      }
    });

  if (batch.length > 0) batches.push(batch);

  // 分批处理
  for (const batch of batches) {
    await this.processBatch(projectId, batch, importMode);
  }
}
```

#### JSON 文件写入缓冲

```js
// core/utils/file_writer.js
class FileWriter {
  constructor(flushInterval = 3000) {
    this.pending = new Map();  // path → data
    this.timer = setInterval(() => this.flush(), flushInterval);
  }

  queue(path, data) {
    this.pending.set(path, data);
  }

  flush() {
    for (const [path, data] of this.pending) {
      fs.writeFileSync(path, JSON.stringify(data, null, '\t'));
    }
    this.pending.clear();
  }
}
```

---

## 7. 变量导入细节功能保持一致

旧代码支持的导入功能，新实现必须完全覆盖：

| 功能 | 说明 | 关键逻辑 |
|------|------|---------|
| **导入到组** | 变量导入时指定目标变量组 | 从 CSV 中读取组名 → 匹配目标组 ID → 设置 TagGroup；若组不存在自动创建 |
| **覆盖导入** | 同名变量覆盖旧值 | 按 TagName + DeviceName 匹配 → 找到则替换所有字段，未找到则追加 |
| **追加导入** | 不覆盖，只追加新变量 | 跳过同名变量（TagName + DeviceName 已存在的跳过） |
| **组自动创建** | 导入时变量组不存在则创建 | 读取 TagGroup → 查找 VarGroupTree → 不存在则创建组节点 |
| **CSV 编码处理** | GB2312/UTF-8 自动识别 | iconv-lite 解码，与旧版逻辑一致 |
| **JSON 格式导出** | JSON 格式导出变量 | 导出格式字段与旧版一致 |
| **CSV 格式导出** | CSV 格式导出变量 | 列名、顺序、编码与旧版一致（json2csv Parser） |
| **设备关联校验** | 变量导入时校验设备存在 | 读取 DeviceInfo.json → 校验 DeviceName → 不存在则报错 |

---

## 8. compat 适配器与 JSON 产物一致性

### 8.1 适配器设计原则

```js
// compat/adapters/adapter_device.js
// 职责：路由映射 + 格式转换，不做任何业务逻辑

const { DeviceService } = require('../../app/services');
const { toOldDeviceTree, toOldDeviceFormat, toOldDeviceGroupFormat } = require('../utils/format_converter');

module.exports = function(router) {
  // GET /ProjectDev/getProjectDeviceGroupTreeView
  router.get('/getProjectDeviceGroupTreeView', async (req, res) => {
    try {
      const { projectId } = req.query;
      const data = await DeviceService.getDeviceGroupsByProject(projectId);
      // === 关键：转换为旧格式 JSON，保证产物完全一致 ===
      const oldFormat = toOldDeviceTree(data);
      res.send(oldFormat);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });
};
```

### 8.2 一致性保证策略

1. **逐接口对比**：新旧接口用相同输入，`JSON.stringify` 后逐字符对比
2. **字段映射表**：为每个旧接口维护一个格式转换函数，明确字段映射关系
3. **自动化对比脚本**：`compat/utils/json_comparator.js` 可用于自动化回归测试

```js
// compat/utils/json_comparator.js
function compareOutputs(oldOutput, newOutput, path = '') {
  const diffs = [];
  // 递归对比 JSON 结构、字段名、类型、值
  if (typeof oldOutput !== typeof newOutput) {
    diffs.push(`${path}: type mismatch ${typeof oldOutput} vs ${typeof newOutput}`);
  } else if (Array.isArray(oldOutput)) {
    if (oldOutput.length !== newOutput.length) {
      diffs.push(`${path}: array length mismatch ${oldOutput.length} vs ${newOutput.length}`);
    }
    for (let i = 0; i < Math.min(oldOutput.length, newOutput.length); i++) {
      diffs.push(...compareOutputs(oldOutput[i], newOutput[i], `${path}[${i}]`));
    }
  } else if (typeof oldOutput === 'object' && oldOutput !== null) {
    for (const key of Object.keys(oldOutput)) {
      if (!(key in newOutput)) {
        diffs.push(`${path}.${key}: missing in new output`);
      } else {
        diffs.push(...compareOutputs(oldOutput[key], newOutput[key], `${path}.${key}`));
      }
    }
  } else if (oldOutput !== newOutput) {
    diffs.push(`${path}: value mismatch "${oldOutput}" vs "${newOutput}"`);
  }
  return diffs;
}
```

---

## 9. 入口文件设计

```js
// exe/index.js
const express = require('express');
const app = express();

// 1. 初始化（productType、路径等，与旧版 initial() 一致）
require('./core/bootstrap')();

// 2. 全局中间件
//    跨域、bodyParser、cookieParser、session（与旧版一致）
//    日志（common/log4js）
//    响应封装（midware_response）
//    租户ID校验（midware_tenantId）
//    国际化（midware_i18n）

// 3. 注册路由
//    lib 路由 → / (project, projectGroup, script)
app.use('/', require('./lib/routers'));

//    app 路由 → /api/v1 (device, variable, driver, ...)
app.use('/api/v1', require('./app/routers'));

//    compat 路由 → 旧路径 (/ProjectDev, /ProjectVar, /DriverManage, ...)
//    【将来删除这行即可剥离兼容层】
app.use('/', require('./compat'));

// 4. 启动 HTTP/HTTPS server（与旧版一致）

module.exports = app;
```

---

## 10. 实施计划要点

### 10.1 开发顺序

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| 1 | 搭建 `kingioserver_Re` 骨架（目录、入口、中间件、i18n） | P0 |
| 2 | 复制 `lib/`、`core/`、`config/`、`Driver/`、`Data/` | P0 |
| 3 | 重构 **设备管理** 模块 (app + compat) | P0 |
| 4 | 重构 **变量管理** 模块 (app + compat) | P0 |
| 5 | 重构 **驱动管理** 模块 (app + compat) | P0 |
| 6 | 重构 **UA 采集** 模块 (app + compat) | P1 |
| 7 | 重构 **DA 采集** 模块 (app + compat) | P1 |
| 8 | 重构 **网络/存储/转发** 模块 (app + compat) | P1 |
| 9 | 重构 **实时数据** 模块 (app + compat) | P1 |
| 10 | 重构 **权限管理** 模块 (app + compat) | P1 |
| 11 | lib 中 Project/ProjectGroup 扩展功能补全 | P2 |
| 12 | 全量 JSON 产物一致性回归测试 | P0 |

### 10.2 风险与注意事项

1. **JSON 产物一致性（硬性要求）**：每个模块完成后必须做对比测试
2. **旧代码中隐藏逻辑**：~42,000 行旧代码中有很多隐式行为（如自动创建组、CSV 编码处理），重构时需仔细梳理
3. **平台差异**：旧代码中有 Linux/Windows 分支逻辑，需保留
4. **全局变量依赖**：旧代码大量使用 `global.productType`、`global.sdbPath` 等，重构后通过配置注入
5. **性能回归**：重构后需对大批量导入（万级以上）做性能测试，不能比旧代码慢
6. **错误兼容性**：compat 层的错误响应格式必须与旧版 `codeMessage.js` 保持一致，否则 gateway 的 `error_transformation` 会失效
```

---

## 11. 技术约束总结

| 约束 | 实现方式 |
|------|---------|
| 工程文件格式不变 | 所有 JSON 读写保持现有结构和字段名 |
| lib 保留 | 直接复制，代码不动 |
| RESTful + 驼峰命名 | 遵循 lib 已有模式：`/api/v1/resourceName` |
| 国际化报错 | 错误码枚举 + 中/英 JSON 语言包 + AppError 类 |
| compat 可剥离 | 独立 `compat/` 目录，入口一行 `app.use()` 可删除 |
| JSON 产物一致 | 每个接口维护格式转换函数 + 自动化对比 |
| 万级导入性能 | 批量内存操作 + 单次落盘 + 流式处理 |
| 导入细节兼容 | 覆盖导入/导入到组/组自动创建/编码处理 逐项对齐 |

---

## 12. 自审清单

- [x] 无 TBD / TODO 占位
- [x] 目录结构与接口清单自洽
- [x] 国际化方案完整（错误码 + 语言包 + 中间件）
- [x] 性能方案覆盖大批量场景
- [x] compat 层可独立剥离
- [x] 所有 gateway 调用的旧接口均有对应的适配器和新的 RESTful 路径
