# Phase 2 (A2) 真实硬件闭环验证记录

**日期:** 2026-03-17
**验证人:** Kiro + 用户
**结论:** 闭环验证通过

## 设备信息

- 板卡型号: ESP32-S3 (QFN56, revision v0.2)
- Board ID: esp32-s3-devkitc-1
- Platform: espressif32
- Framework: Arduino
- 串口适配器: USB-Enhanced-SERIAL CH343
- 端口: COM9
- 波特率: 115200
- MAC: 98:88:e0:16:1b:14
- Flash: 8MB
- PSRAM: 8MB

## 闭环执行记录

### 1. doctor / inspect_project

- PlatformIO CLI: 可用 (via PLATFORMIO_CLI_PATH)
- 项目识别: ✓ isPlatformIOProject: true
- 环境解析: ✓ esp32-s3-devkitc-1, espressif32, arduino
- monitor_speed: 115200

### 2. list_devices

- COM9 可见: ✓
- 设备分类: usb_serial_adapter
- uploadCapability: likely
- VID:PID: 1A86:55D3
- 蓝牙串口正确排除: COM3/4/5/6/7/8 均标记为 bluetooth_serial

### 3. build_project

- 编译结果: SUCCESS
- 环境: esp32-s3-devkitc-1
- resolutionSource: single_environment_fallback
- RAM: 6.1% (19852/327680 bytes)
- Flash: 9.3% (312501/3342336 bytes)
- 耗时: 7.85 秒
- 注: 源码需要添加前向声明才能在 PlatformIO 下编译（原为 Arduino IDE 风格）

### 4. upload_firmware

- 刷写前备份: ✓ flash_backup.bin (8,388,608 bytes, 完整 8MB 镜像)
- 刷写结果: SUCCESS
- uploadStatus: uploaded
- resolvedPort: COM9
- resolutionSource: explicit_argument
- 写入: 312864 bytes (175693 compressed) at 0x00010000
- 耗时: 20.06 秒
- 设备自动重启: ✓ (Hard resetting via RTS pin)

### 5. start_monitor + verify

- 捕获窗口: 25 秒, 最大 100 行
- 实际捕获: 84 行, 5 条 JSON 消息
- verificationStatus: **degraded**
- monitorStatus: captured_output

健康信号 (9/9):
- ✓ expected_patterns_matched
- ✓ json_fields_present
- ✓ json_non_null_fields_present
- ✓ json_values_match
- ✓ json_message_count_sufficient
- ✓ node_loop_healthy
- ✓ node_online_basic
- ✓ sensor_core_present
- ✓ device_identity_match

降级信号 (2, 符合预期):
- allowed_null_field:light (光照传感器未接)
- allowed_null_field:co2 (CO2 传感器未接)

失败信号: 0

JSON 样本:
```json
{"device_id":1001,"timestamp":60,"air_temp":17.3,"air_humidity":59.2,"soil_moisture":4,"light":null,"co2":null}
{"device_id":1001,"timestamp":80,"air_temp":17.3,"air_humidity":59.1,"soil_moisture":3,"light":null,"co2":null}
```

周期验证: timestamp 60→65→70→75→80, 严格 5 秒间隔 ✓

## 闭环完整性

| 环节 | 状态 | 证据 |
|------|------|------|
| doctor/inspect | ✓ | 项目正确识别, 环境解析正确 |
| list_devices | ✓ | COM9 可见, 分类正确 |
| build_project | ✓ | SUCCESS, 7.85s |
| upload_firmware | ✓ | uploaded, 20.06s |
| start_monitor | ✓ | 84 行, 5 条 JSON |
| verify | ✓ | degraded (预期), 9 健康信号, 0 失败信号 |

## 备注

- 刷写的是同一份固件代码（仅添加了 C++ 前向声明以兼容 PlatformIO 编译）
- 刷写前做了完整 flash 备份 (源码/backup/flash_backup.bin)
- 设备在刷写后立即恢复正常运行, 传感器数据采集未受影响
- "degraded" 状态是正确的——light 和 co2 传感器物理上未连接, 不是固件问题
