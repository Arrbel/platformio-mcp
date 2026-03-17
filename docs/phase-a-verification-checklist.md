# Phase A 验证清单

## A1：无硬件条件下

以下项目在没有真实开发板时应完成：

### 功能层

- `doctor` 输出 readiness 诊断
- `build_project` 输出实际采用的 environment 与来源
- `upload_firmware` 输出最小可用的结果分类
- `start_monitor` 支持业务输出验证模式
- `list_devices` 支持设备类型和可上传性判断

### 工程层

- `npm run build`
- `npm test`
- `npm run test:coverage`
- `npm run lint`
- `npm run format:check`

### 验证方式

- 真实 PlatformIO CLI + 临时项目
- 纯规则输入输出测试
- 当前机器设备枚举结果验证

## A2：接入真实开发板后

以下项目必须在真实开发板上验证：

- `doctor`
- `inspect_project`
- `list_environments`
- `build_project`
- `list_devices`
- `upload_firmware`
- `start_monitor`
- 业务输出验证

## 完成判定

### A1 完成

满足：

- 无硬件前置能力已完成
- 所有本地工程检查通过
- 明确哪些结论仍待硬件验证

### A2 完成

满足：

- 至少一种常见板卡跑通完整闭环
- 有正式验证记录
- 闭环结果不是理论推断，而是真实执行结果
