# platformio-mcp 下一阶段详细实施规划

## 1. 下一阶段的总体目标

下一阶段的核心目标是：

把 `platformio-mcp` 从“非硬件依赖链路基本可用”的状态，推进到“常见开发板场景下可形成可信的软硬联调闭环样本”的状态。

这一阶段要优先完成的不是更多工具，而是更可靠的闭环：

- `doctor`
- `inspect_project`
- `list_environments`
- `build_project`
- `upload_firmware`
- `start_monitor`
- 业务输出验证

为什么先做这个：

- 这是当前 Execution Layer 是否成立的关键标准
- 没有真实 upload / monitor / verify 闭环，后续自动重试、错误归因、UI 状态面板都没有可信基础
- 这是最符合“非硬件专家用户降低门槛”目标的一步

这一阶段的边界：

- 做厚 Execution Layer
- 不做大规模架构重构
- 不做高阶自治调试平台
- 不做复杂调试器主路径
- 不做重型 VS Code UI

这一阶段完成后，项目会从：

- “可探测项目、可 build、部分支持 upload / monitor”

推进到：

- “在 1-2 种常见板卡上可完成有证据的真实闭环，并输出稳定、可消费的状态结果”

## 2. 下一阶段的能力建设主线

### 主线 A：真实硬件闭环主线

为什么要做：

- 这是当前最直接的能力缺口
- 也是能否继续向 Workflow Layer 演进的前提

当前缺口：

- 还没有稳定的真实板卡样本路径
- 没有已验证的 `upload -> monitor -> 读取业务输出` 证据链

预期产出：

- 至少 1-2 种常见板卡样本闭环
- 标准化的闭环验证记录

为后续打基础：

- 自动重试
- 错误归因
- UI 状态展示

### 主线 B：upload / monitor / verify 结果语义主线

为什么要做：

- Agent 需要知道“发生了什么”，而不仅是命令是否退出成功

当前缺口：

- `upload_firmware` 结果语义还不够细
- `start_monitor` 可抓取输出，但“是否命中业务输出”还不是正式能力

预期产出：

- 上传结果分类
- monitor 结果分类
- 验证结果分类

为后续打基础：

- 调试 session
- 自动验证
- 自动重试

### 主线 C：端口与环境自动判断主线

为什么要做：

- 这是降低硬件门槛的关键点

当前缺口：

- 虽已有基础 environment / port 继承逻辑
- 但仍缺少更明确的设备类型判断和决策来源表达

预期产出：

- 更可靠的环境选择
- 更可靠的端口选择与候选提示
- 更明确的决策来源

为后续打基础：

- 更少人工介入
- 更高上传成功率
- 更适合 UI 摘要展示

### 主线 D：面向 Agent 的状态接口主线

为什么要做：

- 高层 Agent 不应再解析一大段 CLI 文本去猜状态

当前缺口：

- 虽然已有 `status/summary/data/warnings/nextActions`
- 但领域状态仍不够清晰，例如 upload、verify、失败类别

预期产出：

- 更稳定的领域状态字段
- 更统一的执行结果模型

为后续打基础：

- Workflow Layer
- 自动归因
- 自动重试

### 主线 E：为 VS Code 扩展预留数据接口主线

为什么要做：

- 未来扩展不应直接依赖 CLI 或命令拼接

当前缺口：

- 缺少稳定的项目摘要、设备摘要、最近任务摘要模型

预期产出：

- UI 可直接消费的数据接口

为后续打基础：

- 项目面板
- 设备面板
- 任务状态面板

## 3. 详细任务拆解

### 任务 1：建立真实硬件验证基线

- 所属主线：A
- 优先级：P0
- 任务目标：
  - 明确至少一种常见开发板作为主验证样本
- 涉及模块 / 文件：
  - `README.md`
  - `llms-install.md`
  - 建议新增 `docs/hardware-validation.md`
- 前置依赖：无
- 主要实施内容：
  - 选定主验证板卡，建议优先 Arduino Uno / ESP32 DevKit / RP2040 Pico
  - 定义每种板卡的最小闭环标准：
    - 可识别设备
    - 可 build
    - 可 upload
    - 可 monitor
    - 可读到业务输出
- 完成标准：
  - 存在正式样本板卡清单与验收条件
- 验证方式：
  - 文档检查
  - 实际硬件闭环执行
- 风险点：
  - 当前机器可能没有可用开发板
  - 驱动/线材/boot 模式不稳定
- 是否适合并行推进：否

### 任务 2：定义最小业务输出验证能力

- 所属主线：B
- 优先级：P0
- 任务目标：
  - 让 monitor 能结构化回答“是否读到了预期业务输出”
- 涉及模块 / 文件：
  - `src/tools/monitor.ts`
  - `src/types.ts`
  - `src/tools/registry.ts`
  - `tests/`
- 前置依赖：任务 1
- 主要实施内容：
  - 为 monitor 增加验证输入模型，例如：
    - 期望匹配文本
    - 超时时间
    - 最大读取行数
  - 返回：
    - 是否命中
    - 命中内容
    - 超时
    - 无输出
    - 原始捕获片段
- 完成标准：
  - 能对 `BOOT_OK` / `HEARTBEAT` 这类业务输出做结构化判断
- 验证方式：
  - 单元测试
  - 真实开发板串口输出验证
- 风险点：
  - 串口启动窗口和输出时机不稳定
- 是否适合并行推进：可与任务 3 并行

### 任务 3：细化 upload 结果模型

- 所属主线：B
- 优先级：P0
- 任务目标：
  - 把 upload 结果从“命令成功/失败”提升为“联调阶段状态”
- 涉及模块 / 文件：
  - `src/tools/upload.ts`
  - `src/types.ts`
  - `src/tools/registry.ts`
  - `tests/`
- 前置依赖：任务 1
- 主要实施内容：
  - 区分以下结果类别：
    - 设备未找到
    - 端口不可用
    - 上传器失败
    - 需要 boot 模式/人工动作
    - 上传成功
  - 保留必要的 raw 输出
  - 增加明确的 nextActions
- 完成标准：
  - `upload_firmware` 返回足够让 Agent 决策下一步的结果类别
- 验证方式：
  - mock 测试
  - 真实上传验证
- 风险点：
  - 各平台上传失败信息差异大
- 是否适合并行推进：可并行

### 任务 4：增强设备可上传性判断

- 所属主线：C
- 优先级：P0
- 任务目标：
  - 让系统能更清楚地知道“这是不是开发板而不是普通串口”
- 涉及模块 / 文件：
  - `src/tools/devices.ts`
  - `src/tools/doctor.ts`
  - `src/tools/upload.ts`
  - `src/types.ts`
- 前置依赖：无
- 主要实施内容：
  - 增加设备分类：
    - `likely_board`
    - `bluetooth_serial`
    - `serial_only`
    - `unknown`
  - 基于 VID/PID、描述、HWID 做轻量启发式判断
  - 在 `doctor` 中提示“发现的是蓝牙串口还是疑似开发板串口”
- 完成标准：
  - 能明显区分蓝牙串口与常见 USB 开发板串口
- 验证方式：
  - mock 测试
  - 当前机器设备枚举验证
- 风险点：
  - Windows 设备命名和驱动差异大
- 是否适合并行推进：可并行

### 任务 5：稳定环境与端口决策结果

- 所属主线：C
- 优先级：P0
- 任务目标：
  - 让 build/upload/monitor 的默认决策变得可解释
- 涉及模块 / 文件：
  - `src/tools/projects.ts`
  - `src/tools/build.ts`
  - `src/tools/upload.ts`
  - `src/tools/monitor.ts`
  - `src/types.ts`
- 前置依赖：无
- 主要实施内容：
  - 显式返回：
    - 实际使用的 environment
    - environment 来源
    - 实际使用的 port
    - port 来源
  - 统一 build / upload / monitor 的决策说明字段
- 完成标准：
  - 用户和 Agent 都能知道系统“实际用了什么”
- 验证方式：
  - 单元测试
  - 临时项目 smoke test
- 风险点：
  - 旧调用方未使用这些字段，但不应构成 breaking change
- 是否适合并行推进：可并行

### 任务 6：增强 doctor 为联调入口诊断工具

- 所属主线：A / C / D
- 优先级：P0
- 任务目标：
  - 让 `doctor` 成为闭环入口，而不是只是环境查询
- 涉及模块 / 文件：
  - `src/tools/doctor.ts`
  - `src/types.ts`
  - `src/tools/registry.ts`
- 前置依赖：任务 4、任务 5
- 主要实施内容：
  - 增加 readiness 诊断：
    - `ready_for_build`
    - `ready_for_upload`
    - `ready_for_monitor`
  - 把项目、环境、设备、CLI 状态关联起来输出
- 完成标准：
  - `doctor` 可以作为高层 Agent 的前置决策工具
- 验证方式：
  - 单元测试
  - 真实机器环境验证
- 风险点：
  - 诊断粒度拿捏不好会要么太粗，要么过度复杂
- 是否适合并行推进：依赖后串行

### 任务 7：沉淀最近一次执行结果模型

- 所属主线：D / E
- 优先级：P1
- 任务目标：
  - 为上层 Agent 和未来 UI 预留任务状态接口
- 涉及模块 / 文件：
  - `src/types.ts`
  - `src/tools/registry.ts`
  - 可能新增轻量状态模块
- 前置依赖：任务 2、3、5、6
- 主要实施内容：
  - 定义统一字段：
    - build 状态
    - upload 状态
    - monitor 状态
    - verify 状态
    - 失败类别
  - 保持现有结构化外壳不破坏
- 完成标准：
  - 不同工具结果可被统一消费
- 验证方式：
  - 类型和 handler 测试
- 风险点：
  - 若建模过早偏实现细节，未来 session 化会难改
- 是否适合并行推进：建议后置

### 任务 8：定义最小调试 session 骨架

- 所属主线：D
- 优先级：P1
- 任务目标：
  - 为 Workflow Layer 预留连续动作抽象
- 涉及模块 / 文件：
  - `src/types.ts`
  - 可新增轻量 session 模块
- 前置依赖：任务 7
- 主要实施内容：
  - 定义但不重实现：
    - session id
    - 关联 project / environment / port
    - 最近动作状态
  - 不做复杂调度器
- 完成标准：
  - 存在可供后续 workflow 使用的最小会话数据模型
- 验证方式：
  - 类型与接口测试
- 风险点：
  - 过早做重型实现会偏离当前主线
- 是否适合并行推进：否

### 任务 9：沉淀面向 VS Code 的摘要接口

- 所属主线：E
- 优先级：P1
- 任务目标：
  - 让未来扩展可以直接消费项目/设备/任务摘要
- 涉及模块 / 文件：
  - `src/tools/projects.ts`
  - `src/tools/devices.ts`
  - `src/tools/doctor.ts`
  - `src/types.ts`
- 前置依赖：任务 4、6、7
- 主要实施内容：
  - 稳定以下摘要结构：
    - 项目摘要
    - 设备摘要
    - 最近任务摘要
  - 避免 UI 侧重复解析复杂返回
- 完成标准：
  - 至少三类摘要可直接供扩展消费
- 验证方式：
  - 结构测试
  - 文档检查
- 风险点：
  - 过早偏 UI 可能影响当前执行层主线
- 是否适合并行推进：可后置并行

## 4. 分阶段实施路线图

### Phase A：真实硬件闭环基础打通

- 阶段目标：
  - 让至少一种常见开发板跑通真实闭环
- 具体任务：
  - 任务 1
  - 任务 2
  - 任务 3
  - 任务 4
  - 任务 5
  - 任务 6
- 进入前提：
  - 当前非硬件依赖 smoke test 通过
- 阶段完成标准：
  - 真实板卡完成 `doctor -> inspect -> build -> upload -> monitor -> verify`
  - 读到业务输出并结构化判断结果
- 阶段风险：
  - 缺板卡
  - 驱动/线材/boot 模式不稳定
- 阶段交付物：
  - 闭环样本板卡验证记录
  - 更稳定的 doctor/upload/monitor 结果语义

### Phase B：结果验证与状态语义稳定化

- 阶段目标：
  - 把闭环过程沉淀成 Agent 可消费的状态模型
- 具体任务：
  - 任务 7
  - 任务 8
- 进入前提：
  - Phase A 至少有一条真实闭环样本稳定
- 阶段完成标准：
  - build/upload/monitor/verify 结果可统一消费
  - 存在最小 session 骨架
- 阶段风险：
  - 抽象过早脱离真实硬件行为
- 阶段交付物：
  - 统一状态模型
  - 最小调试 session 数据模型

### Phase C：为工作流层与 VS Code 预留接口

- 阶段目标：
  - 沉淀 UI 与高层 Agent 可直接消费的摘要接口
- 具体任务：
  - 任务 9
  - 对 Phase B 状态模型做稳定化
- 进入前提：
  - Phase B 完成
- 阶段完成标准：
  - 项目、设备、任务摘要接口稳定
- 阶段风险：
  - 过早让 UI 诉求反向主导执行层结构
- 阶段交付物：
  - 可供 VS Code 扩展使用的状态与摘要接口

## 5. 验收标准

### 功能验收

必须真实跑通的链路：

- `doctor`
- `inspect_project`
- `list_environments`
- `build_project`
- `list_devices`
- `upload_firmware`
- `start_monitor`
- 业务输出验证

必须真实可观察的结果：

- 固件真实写入
- 程序真实运行
- monitor 在超时窗口内读到业务输出或明确判定未命中

必须结构化返回的结果：

- build 结果
- upload 结果
- monitor 结果
- verify 结果
- doctor 诊断结果

### 工程验收

必须满足：

- `npm run build`
- `npm test`
- `npm run test:coverage`
- `npm run lint`
- `npm run format:check`
- CI 覆盖以上检查

文档要求：

- 明确哪些板卡路径已真实验证
- 明确哪些仍未验证
- 明确 Windows + `PLATFORMIO_CLI_PATH` 使用方式

### 真实验证验收

必须在真实开发板上验证：

- upload
- monitor
- 业务串口输出验证

可以先用 mock / fake / 临时项目验证：

- 项目解析
- 结构化返回字段
- 设备分类启发式
- 状态模型

在没有硬件时不能声称完成：

- 真实闭环
- 上传成功语义完整性
- 业务串口验证
- 端口自动推断对真实板卡的准确性

## 6. 暂缓项与不做项

### 暂缓：高阶自治调试 Agent

原因：

- 底层执行和验证状态还未完全稳定

### 暂缓：复杂调试器链路

例如：

- JTAG
- OpenOCD
- GDB

原因：

- 不符合当前低硬件门槛主路径

### 暂缓：重型 VS Code UI

原因：

- 当前优先稳定数据接口，而不是先设计界面

### 暂缓：复杂运行时设备控制协议

原因：

- 当前主问题仍是 `build/upload/monitor/verify` 闭环

### 暂缓：大而全工作流编排器

原因：

- 底层状态模型和真实硬件样本还不够成熟

## 7. 与未来 VS Code 可视化扩展的衔接

下一阶段应预留以下接口，供未来扩展直接消费：

### 项目摘要接口

至少包括：

- 项目是否有效
- 有哪些 environments
- 默认 environment
- 配置来源

### 设备摘要接口

至少包括：

- 当前设备列表
- 设备类型
- 可上传性判断
- 判断依据

### 最近任务状态接口

至少包括：

- 最近一次 build 状态
- 最近一次 upload 状态
- 最近一次 monitor / verify 状态

### 应从现在开始稳定下来的返回结构

- `status`
- `summary`
- `data`
- `warnings`
- `nextActions`
- 实际采用的 environment
- 实际采用的 port
- 决策来源
- 失败类别

### 未来可能需要 UI 确认的动作

- upload
- 重试 upload
- 修改项目配置
- 触发高风险设备操作

## 8. 与未来高层 Agent 调试工作流的衔接

下一阶段应为未来这些能力打基础：

- 调试 session
- 验证规则
- 自动重试
- 错误归因
- 代码修改后再 build/upload/verify 的闭环

当前阶段应沉淀的底层能力：

- 真实闭环结果
- 可验证的 monitor 结果
- 可解释的 upload 结果
- 设备与环境决策来源
- 失败类别

将来最关键的状态字段：

- `resolvedEnvironment`
- `resolvedPort`
- `resolutionSource`
- `uploadStatus`
- `monitorStatus`
- `verificationStatus`
- `failureCategory`
- `retryHint`

如果现在这些地方设计错了，后面会很难补救：

- 只返回原始 CLI 文本，不返回领域状态
- 无法区分命令成功与设备实际运行成功
- 不记录系统实际采用的环境/端口/推断来源
- upload / monitor / verify 结果缺乏统一语义

## 9. 最终可执行 TODO 清单

1. 选定并记录主验证开发板样本与真实闭环验收条件。`P0` `blocker`
2. 为 monitor 增加业务输出验证模式，支持预期文本匹配与超时结果。`P0` `blocker`
3. 细化 upload 结果模型，区分设备缺失、端口错误、上传失败、上传成功。`P0` `blocker`
4. 增强设备分类，区分蓝牙串口、普通串口、疑似开发板串口。`P0`
5. 稳定 environment / port 决策结果，显式返回实际采用值与来源。`P0`
6. 增强 `doctor`，输出闭环 readiness 诊断。`P0`
7. 用真实开发板执行一次完整 `doctor -> inspect -> build -> upload -> monitor -> verify` 闭环。`P0` `blocker`
8. 为闭环结果补单测、临时项目 smoke test 和真实硬件验证记录。`P0`
9. 抽象统一的 build / upload / monitor / verify 状态字段。`P1`
10. 定义最小调试 session 骨架，只沉淀数据模型，不实现重型编排。`P1`
11. 沉淀项目摘要、设备摘要、最近任务摘要接口，供未来 VS Code 扩展消费。`P1`
12. 在真实闭环稳定后，再规划 Workflow Layer 的自动重试与错误归因。`P2`
