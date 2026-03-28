# platformio-mcp 项目真相字段说明

本文只说明当前 `inspect_project`、`list_project_targets`、`generate_compile_commands` 这组三个只读入口中，已经稳定下来的“项目真相”相关字段。

目标不是解释 PlatformIO 全部语义，而是让后续工程师或 Agent 清楚：

- 哪些字段来自 `platformio.ini` 静态读取
- 哪些字段来自官方 `pio project metadata --json-output`
- 当前 environment 是否已被可靠解析
- 当前项目是否具备 target / compiledb / test 等只读能力

## 1. `inspect_project`

### 真相来源字段

- `configSource = "platformio_ini"`
  - 表示静态配置真相来自项目根目录下的 `platformio.ini`
- `metadataSource = "pio_project_metadata"`
  - 表示执行态真相优先对齐官方 `pio project metadata --json-output`

这两个字段只是标记“采用哪类事实源”，不代表两类数据都一定成功读取。

### environment 真相字段

- `defaultEnvironments`
  - 从 `[platformio] default_envs` 静态读取
- `resolvedEnvironment`
  - 当前只读分析阶段实际选中的 environment
- `environmentResolution`
  - 当前 environment 的解析状态，固定为：
    - `explicit`
    - `default_envs`
    - `single_environment_fallback`
    - `ambiguous`
    - `not_resolved`
- `resolutionReason`
  - 人类可读的解析原因说明
- `resolutionWarnings`
  - 与当前 environment 选择相关的风险提示

当前策略：

- 有 `default_envs` 时，优先返回 `default_envs`
- 只有一个 environment 时，返回 `single_environment_fallback`
- 多 environment 且没有默认值时，返回 `ambiguous`
- 没有 `[env:<name>]` 时，返回 `not_resolved`
- 如果 `default_envs` 指向了不存在的 environment，也返回 `not_resolved`

注意：

- 在 `ambiguous` 或 `not_resolved` 时，`inspect_project` 不会伪造 metadata 结果
- 这时只返回静态配置真相，不把未验证的执行态推断包装成事实
- 与 environment 解析直接相关的风险，优先落在 `resolutionWarnings`，而不是混进通用 `warnings`

### metadata / capability 字段

- `metadataAvailable`
  - 是否成功读取官方 metadata
- `metadata`
  - 原始 metadata 摘要
- `targets`
  - 从 metadata 读取到的 target 名称列表
- `toolchain`
  - 编译器/调试器路径摘要
- `includes`
  - include 路径摘要
- `defines`
  - 宏定义摘要
- `programPath`
  - 产物路径摘要
- `metadataExtra`
  - `metadata.extra` 的弱承诺透传字段

### 配置复杂度字段

- `configComplexitySignals`
  - 当前用于提示“手写解析与官方最终求值可能偏离”的信号
  - 当前稳定项：
    - `extends_present`
    - `extra_configs_present`
    - `sysenv_interpolation_present`
    - `this_interpolation_present`
    - `default_env_override_possible`

这些字段不是错误，而是提示：

- 当前项目配置较复杂
- 如果后续执行工具没有显式指定 environment，必须更谨慎

### 项目能力字段

- `projectCapabilities`
  - 当前项目可被只读发现出来的能力摘要
  - 当前固定包含：
    - `hasMetadata`
    - `hasTargets`
    - `canGenerateCompileCommands`
    - `hasTestDir`
    - `hasTestConfiguration`
    - `hasLibraryDependencyOverrides`
    - `hasExtraScripts`
    - `hasNativeEnvironment`
    - `hasCustomTargetsHint`

这些字段用于：

- 高层 Agent 判断“后续可做什么”
- 避免再次去猜 CLI 文本或目录结构

### 聚合摘要字段

为了避免上层每次都自己拼装多组字段，当前 `inspect_project` 还会返回两组聚合摘要：

- `projectSummary`
  - 面向项目总览
  - 当前包含：
    - `environmentCount`
    - `defaultEnvironmentCount`
    - `resolvedEnvironment`
    - `environmentResolution`
    - `hasMetadata`
    - `hasTargets`
    - `hasTestConfiguration`
    - `hasLibraryDependencyOverrides`
    - `hasExtraScripts`

- `riskSummary`
  - 面向风险快速判断
  - 当前包含：
    - `hasEnvironmentRisk`
    - `hasConfigurationRisk`
    - `hasWarnings`

建议上层优先使用这两组摘要做初筛，再按需下钻原始字段。

### environment 级配置摘要字段

当前 `environments[]` 里已经提升为正式字段的项目语义包括：

- `testIgnore`
- `testFramework`
- `testBuildSrc`
- `libDeps`
- `libExtraDirs`
- `libLdfMode`
- `libCompatMode`
- `extraScripts`

这些字段仍然来自 `platformio.ini` 的静态读取，不应被误解为“官方最终求值后的完整结果”，但它们已经足够支撑当前的项目能力发现与风险判断。

## 2. `list_project_targets`

当前稳定字段：

- `resolvedEnvironment`
- `targetDiscoveryStatus`
  - `targets_found`
  - `no_targets`
- `targets`
- `rawOutputExcerpt`

说明：

- 即使官方 CLI 只返回表头、不返回 target 项，也应返回 `no_targets`
- 不把“空结果”误判成解析失败

## 3. `generate_compile_commands`

当前稳定字段：

- `resolvedEnvironment`
- `generationStatus`
  - `generated`
  - `toolchain_unavailable`
  - `environment_not_resolved`
  - `command_failed`
- `compileCommandsPath`
- `failureCategory`
- `rawOutputExcerpt`

说明：

- 如果 environment 无法可靠解析，不会伪造生成成功
- 如果当前宿主缺工具链，应返回 `toolchain_unavailable`
- 这组字段的目标是让上层知道“为什么没生成”，而不是只看到异常文本

## 4. 当前边界

本文件只覆盖当前已经稳定下来的只读真相层，不包含：

- upload / monitor / session
- remote workflow
- UI 数据面板
- workflow/session 编排

如果后续扩展这些领域，应继续复用这里的 environment 真相和 capability 语义，而不是另起一套解释口径。

## 5. `inspect_project` 作为总览入口的动作边界

当前 `inspect_project` 仍然是项目总览入口，不拆新工具，但它的 `nextActions` 已经按 environment 真相做了收口：

- 当 `resolvedEnvironment` 已存在时：
  - 可以直接建议
    - `list_project_targets`
    - `build_project`
    - `generate_compile_commands`（仅当 `canGenerateCompileCommands = true`）
- 当 `environmentResolution = ambiguous | not_resolved` 时：
  - 不应默认建议直接 `build_project`
  - 应先引导调用方查看 `list_environments`

这样做的目的不是减少能力，而是避免 MCP 自己在 environment 仍不明确时制造错误的默认执行动作。

## 6. `inspect_project` 摘要文案语义

虽然真正稳定的接口应以结构化字段为准，但当前 `inspect_project` 的 `summary` 也已经按只读总览用途做了更明确的收口，避免调用方在快速浏览时误判：

- 当项目没有任何 environment 时：
  - 摘要会明确写 `no environments defined`
- 当项目没有可靠的 `resolvedEnvironment` 时：
  - 摘要会写 `metadata skipped`
  - 语义是“因为 environment 没法可靠确定，所以官方 metadata 没有去查”
- 当项目已经有 `resolvedEnvironment`，但 metadata 读取失败时：
  - 摘要会写 `metadata unavailable`
  - 语义是“该查了，但官方 metadata 没拿到”

这两个状态不要混用：

- `metadata skipped` 是环境解析前置条件不满足
- `metadata unavailable` 是 metadata 查询本身失败

对后续 Agent 来说，这个区别很关键，因为它决定下一步应该：

- 先解决 environment 歧义
- 还是直接排查 PlatformIO metadata/CLI 问题
