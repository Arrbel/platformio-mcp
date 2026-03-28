# ESP32 农业传感器节点运行样本与验证规则草稿

## 1. 文档目的

本文件用于把一次真实运行中的 ESP32 农业传感器节点的串口输出样本，收敛成 `platformio-mcp` Phase A 主线可直接使用的验证依据。

它的角色不是设备说明书，也不是固件设计文档，而是：

- 为 `start_monitor` 的业务输出验证模式提供真实样本
- 为未来 `verify` 能力提供字段与规则依据
- 为 `doctor -> inspect -> build -> upload -> monitor -> verify` 闭环中的 `verify` 环节提供现实输入

本文件当前记录的是只读分析与只读 monitor 验证结果：

- 没有烧录
- 没有复位
- 没有修改设备配置
- 没有串口写入

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

每轮包含一条 JSON，例如当前真实节点上实际捕获到的：

```json
{
  "device_id": 1001,
  "timestamp": 151,
  "air_temp": 22.5,
  "air_humidity": 41,
  "soil_moisture": 1,
  "light": null,
  "co2": null
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

- 观测值：本轮样本中约 `22.5`
- 语义：空气温度
- 稳定性：高
- 验证价值：高

### `air_humidity`

- 观测值：本轮样本中约 `41`
- 语义：空气湿度
- 稳定性：高
- 验证价值：高

### `soil_moisture`

- 观测值：本轮样本中约 `1`
- 文本层同时输出原始 ADC 值
- 语义：土壤湿度映射结果
- 当前判断：
  - 采集链路正常
  - 当前值可变，不应在通用验证中写死为固定数字

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

说明：

- 对当前节点样本而言，`light/co2` 的缺失不应直接覆盖 `air_temp/air_humidity/soil_moisture` 的成功采集结论

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

## 10. 启动阶段 profile 与运行阶段 profile 的使用边界

这部分是当前 Wave 2 收口后必须明确下来的使用规则。

当前 monitor/profile 框架本身已经能稳定工作，但真实 MCP 回归证明：

- 如果把启动日志里的文本信号直接塞进稳定运行窗口的 profile
- 即使设备已经正常运行、JSON 已经稳定输出
- 也仍然可能因为没有再次捕获启动 banner 而被误判为 `failed`

因此，后续 profile 使用必须显式区分下面两类。

### 10.1 启动阶段 profile

用途：

- 刚 upload 完
- 刚 reset 完
- 明确要验证 boot / init / 外设枚举是否成功

适合放入的信号：

- 启动 banner
- `BH1750`
- `SGP30`
- I2C 扫描成功文本
- 初始化完成文本
- 第一次出现的 `JSON 输出`

这类 profile 的特点：

- 采集窗口应尽量贴近启动时刻
- 更依赖文本层输出
- 不应强依赖多条周期 JSON

### 10.2 运行阶段 profile

用途：

- 设备已经稳定运行
- monitor session 持续读取
- 周期性健康检查
- upload 后延迟一段时间再做运行态验证

适合放入的信号：

- `expectedPatterns = ["JSON 输出"]`
- `expectedJsonFields`
- `expectedJsonNonNull`
- `expectedJsonValues`
- `expectedCycleSeconds`
- `expectedCycleToleranceSeconds`
- `minJsonMessages`

这类 profile 的特点：

- 不依赖启动 banner
- 不依赖一次性初始化日志
- 重点验证“当前设备是否持续健康运行”

### 10.3 当前真实节点上的误用案例

后续真实 MCP session 回归中，曾出现以下情况：

- `resolvedPort = COM9`
- `filters = ["esp32_exception_decoder"]`
- 连续读取得到有效 JSON
- `timestamp` 递增正常
- `light/co2` 非 null

但验证结果仍然是 `failed`，原因不是框架问题，而是 profile 写成了：

- `expectedPatterns = ["JSON 输出", "BH1750", "SGP30"]`

而本次 session 读取窗口覆盖的是稳定运行阶段，不是启动阶段，因此只抓到了：

- `JSON 输出`
- 周期 JSON

没有再次抓到：

- `BH1750`
- `SGP30`

所以最终失败信号为：

- `missing_expected_pattern:BH1750`
- `missing_expected_pattern:SGP30`

这个案例应作为后续使用规范的反例，而不是继续推动 monitor 核心扩规则。

### 10.4 当前建议的最小落地规则

当前阶段不需要修改 MCP schema，也不需要新增复杂 profile 语言。

只需要遵守以下约束：

1. 启动期文本信号只放进启动阶段 profile。
2. 稳定运行期 profile 只放持续可观测的运行信号。
3. 若 session 读取的目标是 steady-state 健康检查，不应要求再次命中初始化文本。
4. 若确实要验证启动期文本，应在 upload / reset 后立即开始较短窗口采集。

## 11. 本轮真实只读回归结果

### 11.1 只读采集结果

本轮通过 `start_monitor` 对真实节点执行了只读抓取：

- `port = COM9`
- `baud = 115200`
- `captureDurationMs = 4000`
- `maxLines = 20`

实际结果：

- `monitorStatus = captured_output`
- `verificationStatus = not_requested`
- 成功读到人类可读日志与 JSON 输出

### 11.2 通用 profile 验证结果

使用的通用 profile 输入：

- `expectedPatterns = ["JSON 输出"]`
- `expectedJsonFields = ["device_id", "timestamp", "air_temp", "air_humidity", "soil_moisture", "light", "co2"]`
- `expectedJsonNonNull = ["device_id", "timestamp", "air_temp", "air_humidity", "soil_moisture"]`
- `expectedJsonValues = { "device_id": 1001 }`
- `allowedNullFields = ["light", "co2"]`
- `expectedCycleSeconds = 5`
- `expectedCycleToleranceSeconds = 2`
- `minJsonMessages = 2`

实际结果：

- `monitorStatus = captured_output`
- `verificationStatus = degraded`
- `failureSignals = []`
- `degradedSignals = ["allowed_null_field:light", "allowed_null_field:co2"]`

健康信号包括：

- `expected_patterns_matched`
- `json_fields_present`
- `json_non_null_fields_present`
- `json_values_match`
- `json_message_count_sufficient`
- `node_loop_healthy`
- `node_online_basic`
- `sensor_core_present`
- `device_identity_match`

### 11.3 本轮结论

- 当前农业节点可以被 `platformio-mcp` 以只读方式稳定识别和 monitor
- 当前 monitor 通用验证 profile 已能在真实节点上返回结构化健康/降级信号
- 本文档中的字段与规则仍然只是 profile 示例，不属于 monitor 核心硬编码逻辑

## 10. 与主线任务的关系

这份样本不是额外支线，而是直接服务当前主线：

- Phase A 中 `monitor -> verify` 的能力设计
- 真实开发板闭环后的“业务输出验收标准”
- 后续 `doctor` / `upload` / `monitor` 结果语义稳定化
- 再后续 Workflow Layer 的自动重试和错误归因

因此，这份文档的作用是：

- 把真实设备输出收敛成可实现规则
- 避免后续实现只凭抽象猜测

## 12. 后续实机状态更新

> 本节用于覆盖上面“只读观察期”的旧状态。它描述的是后续在同一块真实节点上的再次 build/upload/monitor 复核结果。

### 12.1 当前设备输出状态

后续实机复核确认，当前节点已不再是 `light/co2 = null` 的降级样本，而是：

- `BH1750` 已在 `GPIO21/GPIO20` 总线上识别
- `SGP30` 已在 `GPIO8/GPIO9` 总线上识别
- 业务 JSON 已包含非空 `light`
- 业务 JSON 已包含非空 `co2`

当前真实样本：

```json
{"device_id":1001,"timestamp":115,"air_temp":23.0,"air_humidity":43.2,"soil_moisture":31,"light":38,"co2":405}
```

### 12.2 对 profile 的影响

- 前文 `allowedNullFields = ["light", "co2"]` 仍可保留为“早期降级样本规则”。
- 但对当前节点的最新验证 profile，应优先改为：
  - `light` 应存在且非 null
  - `co2` 应存在且非 null

### 12.3 当前仍然成立的边界

- 农业节点字段和规则仍然只是 profile 示例，不应写死进 monitor 核心。
- 这次通过说明的是“通用 monitor/profile 框架 + 真实设备样本”可用，不是把农业节点逻辑产品化进 MCP。

### 12.4 当前推荐的运行阶段 profile 示例

对于当前节点的 steady-state 健康检查，推荐使用类似下面的 profile：

```json
{
  "expectedPatterns": ["JSON 输出"],
  "expectedJsonFields": [
    "device_id",
    "timestamp",
    "air_temp",
    "air_humidity",
    "soil_moisture",
    "light",
    "co2"
  ],
  "expectedJsonNonNull": [
    "device_id",
    "timestamp",
    "air_temp",
    "air_humidity",
    "soil_moisture",
    "light",
    "co2"
  ],
  "expectedJsonValues": {
    "device_id": 1001
  },
  "expectedCycleSeconds": 5,
  "expectedCycleToleranceSeconds": 2,
  "minJsonMessages": 2
}
```

这个 profile 的目标是验证：

- 当前节点仍在输出 JSON
- 关键业务字段存在且非空
- 设备身份正确
- 周期输出正常

它不再要求 `BH1750` / `SGP30` 这类只在启动阶段更容易出现的初始化文本。
