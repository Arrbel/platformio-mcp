# Phase A1 收口报告

## 1. 范围

本报告用于确认 `platformio-mcp` 在 Phase A1 阶段的完成状态。

Phase A1 的目标不是完成真实开发板 upload 闭环，而是完成：

- 闭环前执行层能力建设
- 通用 monitor 验证 profile 收口
- 结构化验证结果稳定化
- 至少一条真实节点的 monitor/profile 成功路径回归

## 2. 本阶段已完成能力

### 2.1 Execution Layer 语义增强

当前已经具备：

- `resolvedEnvironment`
- `resolvedPort`
- `resolvedBaud`
- `resolutionSource`
- `uploadStatus`
- `monitorStatus`
- `verificationStatus`
- `failureCategory`
- `retryHint`

### 2.2 设备识别增强

当前设备识别已能区分：

- `bluetooth_serial`
- `usb_serial_adapter`
- `likely_board`
- `unknown_serial`

并能输出：

- `uploadCapability`
- `detectionEvidence`

### 2.3 monitor 通用验证 profile

当前 `start_monitor` 已支持：

- `expectedPatterns`
- `expectedJsonFields`
- `expectedJsonNonNull`
- `expectedJsonValues`
- `allowedNullFields`
- `expectedCycleSeconds`
- `expectedCycleToleranceSeconds`
- `minJsonMessages`

### 2.4 monitor 结构化验证输出

当前 `start_monitor` 已稳定返回：

- `monitorStatus`
- `verificationStatus`
- `failureCategory`
- `retryHint`
- `healthSignals`
- `degradedSignals`
- `failureSignals`
- `parsedJsonMessages`
- `matchedPatterns`
- `rawOutputExcerpt`

## 3. 本阶段验证结果

### 3.1 工程验证

已通过：

- `npm run build`
- `npm test`
- `npm run test:coverage`
- `npm run lint`
- `npm run format:check`

### 3.2 非硬件依赖真实验证

已通过：

- 真实 PlatformIO CLI 环境下的临时项目 smoke test
- CH343 设备识别回归
- 串口占用失败语义回归

### 3.3 真实节点 monitor/profile 成功路径

已在真实运行中的 ESP32 农业传感器节点上取得一次 monitor/profile 成功路径：

- 端口：`COM9`
- 波特率：`115200`
- profile 输入：
  - `expectedPatterns: ['JSON 输出']`
  - `expectedJsonFields: ['device_id', 'timestamp', 'air_temp', 'air_humidity', 'soil_moisture']`
  - `expectedJsonNonNull: ['air_temp', 'air_humidity', 'soil_moisture']`
  - `expectedJsonValues: { device_id: 1001 }`
  - `allowedNullFields: ['light', 'co2', 'tvoc']`
  - `expectedCycleSeconds: 5`
  - `expectedCycleToleranceSeconds: 1`
  - `minJsonMessages: 2`

实际结果：

- `monitorStatus = captured_output`
- `verificationStatus = degraded`
- `healthSignals` 非空
- `degradedSignals` 非空
- `failureSignals = []`
- `parsedJsonMessages` 成功解析出 2 条 JSON

该结果证明：

- monitor 通用验证框架可在真实节点上工作
- 当前设计不是农业节点硬编码逻辑
- 允许 `null` 字段的降级语义成立

## 4. A1 收口判断

### 4.1 结论

Phase A1 可以判断为**基本收口完成**。

### 4.2 判断依据

满足以下条件：

- 无硬件前置能力已经完成
- 工程检查全部通过
- monitor 通用 profile 已正式可调用
- 结构化结果字段已收口
- 已取得至少一条真实节点 monitor/profile 成功路径

### 4.3 尚未完成的内容

以下内容不属于 A1 完成标准，但仍是 Phase A 整体未完成项：

- `upload_firmware` 的真实开发板闭环验证
- `doctor -> inspect -> build -> upload -> monitor -> verify` 的完整 A2 闭环
- 真实设备上 upload 后再验证运行结果

## 5. 进入下一步的建议

下一步最合理的是进入 Phase A2，而不是继续扩展 A1：

- 准备一个安全的最小样本工程
- 在真实开发板上完成 upload
- 再做 `monitor -> verify`
- 形成完整闭环验证记录

如果暂时不做 A2，也可以先做一轮小范围整理：

- 将当前 A1 改动提交
- 保持分支干净
- 为后续真实 upload 闭环留出明确入口
