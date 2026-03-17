# ESP32 农业传感器节点运行样本与验证规则草稿

## 1. 文档目的

本文件用于把一次真实运行中的 ESP32 农业传感器节点的串口输出样本，收敛成 `platformio-mcp` Phase A 主线可直接使用的验证依据。

它的角色不是设备说明书，也不是固件设计文档，而是：

- 为 `start_monitor` 的业务输出验证模式提供真实样本
- 为未来 `verify` 能力提供字段与规则依据
- 为 `doctor -> inspect -> build -> upload -> monitor -> verify` 闭环中的 `verify` 环节提供现实输入

本文件只基于非破坏性、只读分析得到：

- 没有烧录
- 没有复位
- 没有修改设备配置

## 2. 样本设备上下文

### 2.1 当前观察到的设备信息

- 节点类型：ESP32 农业传感器节点
- 串口端口：`COM9`
- 系统识别名称：`USB-Enhanced-SERIAL CH343 (COM9)`
- PnP ID：`USB\\VID_1A86&PID_55D3\\5A45042637`
- 业务波特率：`115200`

### 2.2 当前分析边界

本次分析只覆盖运行态观察：

- 被动读取串口输出
- 抽取文本与 JSON 结构
- 推断采样周期与字段稳定性

不覆盖：

- upload
- 固件来源确认
- 板载传感器接线核对
- bootloader / 芯片信息读取

## 3. 观察到的输出协议

### 3.1 输出层次

当前节点每个采样周期输出两层内容：

#### A. 人类可读日志层

典型结构：

1. 分隔线
2. `时间: <秒数>`
3. DHT11 温湿度块
4. 土壤湿度块
5. 光照传感器状态
6. CO2 传感器状态
7. `JSON 输出` 标记
8. 一条 JSON
9. `下次读取倒计时: 5秒...`

#### B. 机器可读 JSON 层

每轮包含一条 JSON，例如：

```json
{
  "device_id": 1001,
  "timestamp": 450,
  "air_temp": 16.1,
  "air_humidity": 53.4,
  "soil_moisture": 0,
  "light": null,
  "co2": null,
  "tvoc": null
}
```

### 3.2 周期性

从多轮采样观察到：

- `timestamp` 单调递增
- 相邻差值基本为 `5`
- 人类可读层也明确出现 `下次读取倒计时: 5秒...`

因此当前节点的运行周期可初步判断为：

- 目标周期：`5 秒`
- 当前实际表现：稳定

## 4. 当前字段语义草稿

### `device_id`

- 观测值：`1001`
- 语义：节点身份标识
- 稳定性：高
- 验证价值：高

### `timestamp`

- 观测值：持续递增
- 语义：节点运行时间或周期计数
- 稳定性：高
- 验证价值：极高

原因：

- 能证明程序仍在运行
- 能证明输出不是一次性启动日志
- 能支持周期性验证

### `air_temp`

- 观测值：约 `16.1`
- 语义：空气温度
- 稳定性：高
- 验证价值：高

### `air_humidity`

- 观测值：约 `53.2 ~ 53.6`
- 语义：空气湿度
- 稳定性：高
- 验证价值：高

### `soil_moisture`

- 观测值：长期为 `0`
- 文本层同时输出原始 ADC 值
- 语义：土壤湿度映射结果
- 当前判断：
  - 采集链路正常
  - 但当前映射后被判为“干燥”

### `light`

- 当前为 `null`
- 文本层为：`光照传感器 未检测到设备`
- 当前语义：
  - 不是主链路失败
  - 而是可视为“子模块缺失/未检测到”

### `co2`

- 当前为 `null`
- 文本层为：`CO2传感器 未检测到设备`
- 当前语义：
  - 可视为降级运行
  - 不应直接判为节点整体故障

### `tvoc`

- 当前为 `null`
- 文本层无单独 TVOC 采集块
- 当前语义：
  - 预留字段或依赖未接入气体传感器链路

## 5. 健康信号草稿

以下信号可作为当前节点的“运行健康信号”：

### H1. 节点在线

满足任一轮输出：

- 存在 JSON
- JSON 中有 `device_id`
- JSON 中有 `timestamp`

### H2. 主循环存活

满足：

- 连续采样到至少 2 条 JSON
- `timestamp` 严格递增

### H3. 周期性正常

满足：

- 相邻 `timestamp` 差值接近 `5`
- 可容忍少量抖动，例如 `4 ~ 7`

### H4. 核心传感器链路可用

满足：

- `air_temp` 非 null
- `air_humidity` 非 null
- `soil_moisture` 非 null
- 文本层出现 DHT11 与土壤湿度相关块

### H5. 业务结构稳定

满足：

- 文本层出现 `JSON 输出`
- 其后跟随可解析的 JSON

## 6. 降级信号草稿

以下信号当前不应直接判为“整机失败”，而应视为“降级运行”：

### D1. 光照模块缺失

表现：

- `light == null`
- 文本层出现 `光照传感器 未检测到设备`

### D2. CO2 模块缺失

表现：

- `co2 == null`
- 文本层出现 `CO2传感器 未检测到设备`

### D3. TVOC 缺失

表现：

- `tvoc == null`

说明：

- 对当前节点样本而言，`light/co2/tvoc` 的缺失不应直接覆盖 `air_temp/air_humidity/soil_moisture` 的成功采集结论

## 7. 失败信号草稿

### F1. 串口端口被占用

表现：

- `could not open port`
- `PermissionError(13, '拒绝访问。', None, 5)`

建议映射：

- `monitorStatus = port_open_failed`
- `failureCategory = port_unavailable`
- `retryHint = close_serial_consumers_and_retry`

### F2. 无输出

表现：

- monitor 连上后在预期窗口内未读到任何业务输出

建议映射：

- `monitorStatus = no_output`
- `verificationStatus = indeterminate`

### F3. 输出冻结

表现：

- 有 JSON，但 `timestamp` 不增长

建议映射：

- `verificationStatus = not_matched`
- `failureCategory = node_output_stalled`
- `retryHint = retry_capture_and_check_firmware_loop`

### F4. 结构损坏

表现：

- 出现 `JSON 输出`
- 但后续 JSON 不可解析

建议映射：

- `failureCategory = malformed_runtime_output`

## 8. 建议进入 A1 实现的最小验证规则

### 规则 1：`node_online_basic`

目标：

- 证明节点在线并输出有效 JSON

建议判定：

- 至少捕获 1 条 JSON
- 存在 `device_id`
- 存在 `timestamp`

### 规则 2：`node_loop_healthy`

目标：

- 证明程序主循环在持续运行

建议判定：

- 至少捕获 2 条 JSON
- `timestamp` 严格递增

### 规则 3：`sensor_core_present`

目标：

- 证明核心传感器链路在线

建议判定：

- `air_temp` 非 null
- `air_humidity` 非 null
- `soil_moisture` 非 null

### 规则 4：`device_identity_match`

目标：

- 证明当前连的是目标节点

建议判定：

- `device_id == 1001`

说明：

- 这类规则应设计成可配置规则，而不是写死在通用实现中

### 规则 5：`partial_sensor_degraded_but_running`

目标：

- 识别“节点在降级运行，但非整体故障”

建议判定：

- `light == null`
- `co2 == null`
- `tvoc == null`
- 同时核心字段仍有效

## 9. 建议的验证输入模型草稿

为未来 `start_monitor` 增强验证模式或独立 `verify` 能力，建议支持：

### 文本级输入

- `expectedPatterns`
- `forbiddenPatterns`

### JSON 级输入

- `expectedJsonFields`
- `expectedJsonNonNull`
- `expectedJsonValues`
- `allowedNullFields`

### 周期级输入

- `expectedCycleSeconds`
- `expectedCycleToleranceSeconds`
- `minJsonMessages`

### 节点身份级输入

- `expectedDeviceId`

## 10. 与主线任务的关系

这份样本不是额外支线，而是直接服务当前主线：

- Phase A 中 `monitor -> verify` 的能力设计
- 真实开发板闭环后的“业务输出验收标准”
- 后续 `doctor` / `upload` / `monitor` 结果语义稳定化
- 再后续 Workflow Layer 的自动重试和错误归因

因此，这份文档的作用是：

- 把真实设备输出收敛成可实现规则
- 避免后续实现只凭抽象猜测
