# Phase A 真实硬件验证基线

## 目标

本文件用于定义 `platformio-mcp` 在 Phase A 阶段认可的真实硬件闭环验证基线。

闭环目标不是“命令能调用”，而是：

- 可识别开发板
- 可 build
- 可 upload
- 可 monitor
- 可读到真实业务串口输出

## 主验证板卡建议

按优先级建议如下：

1. Arduino Uno
2. ESP32 DevKit
3. RP2040 Pico

原因：

- PlatformIO 支持成熟
- 用户常见
- 串口 upload / monitor 路径清晰
- 对“非硬件专家用户”门槛较低

## Phase A 闭环验收条件

一次真实硬件闭环需要满足以下条件：

1. `doctor` 能识别：
   - PlatformIO CLI 可用
   - 项目有效
   - 至少存在一个可疑似 upload 的设备
2. `inspect_project` / `list_environments` 能正确解析当前项目
3. `build_project` 成功
4. `upload_firmware` 成功，且结果语义明确
5. `start_monitor` 能接入目标串口
6. monitor 在给定窗口内读到业务输出
7. 业务输出中命中预期标记，例如：
   - `BOOT_OK`
   - `HEARTBEAT`

## 推荐最小示例程序

建议在样本工程中使用最小业务输出程序：

- 上电后立即输出 `BOOT_OK`
- 随后定时输出 `HEARTBEAT`

这样可以同时验证：

- 固件确实被写入
- 程序确实运行
- 串口输出确实被 monitor 读取

## 没有真实板卡时的边界

在没有真实开发板的情况下，只能声称以下内容已完成：

- 非硬件依赖的真实 PlatformIO smoke test
- 闭环前能力就绪
- monitor 验证模式、upload 结果模型、doctor readiness、设备分类等基础能力已实现并可验证

不能声称以下内容已完成：

- 真实 upload 成功
- 真实 monitor 业务输出验证
- 完整软硬联调闭环

## 验证记录要求

后续执行真实闭环时，必须记录：

- 板卡型号
- 平台 / environment
- 上传端口
- monitor 端口 / 波特率
- 业务输出内容
- 是否命中预期输出
- 成功 / 失败
- 遇到的问题
