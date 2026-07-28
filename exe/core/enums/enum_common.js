

// 枚举-授权产品ID
const enum_ProductId = {
    CLIENT: 1158,                               // 客户端
    COMPUTE: 1159,                              // 计算
    DATA_SOURCE: 1160                           // 数据源
}
// 枚举-ws连接状态
const enum_wsStatus = {
    ready: 1
}

module.exports = {
    enum_wsStatus,
    enum_ProductId,
};