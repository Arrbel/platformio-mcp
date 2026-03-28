# 本机 PlatformIO CLI 实践记录

## 1. 目的

本文不是理论说明，而是基于本机实际环境，按 PlatformIO 官方文档的安装、Shell Commands、项目初始化、元数据、设备与包管理流程，逐步执行后的记录。

目标是回答两个问题：

1. 本机到底有没有可用的 PlatformIO CLI 环境
2. 当前本机环境在真实实践中能跑到哪一步，卡在哪一步

## 2. 实践时间与环境

- 时间: `2026-03-27`
- 操作系统: Windows
- Shell: PowerShell
- 工作目录: `E:\program\platformio-mcp`
- 官方文档对照依据:
  - [PlatformIO Core (CLI)](https://docs.platformio.org/en/latest/core/index.html)
  - [Install Shell Commands](https://docs.platformio.org/en/latest/core/installation/shell-commands.html)
  - [System Requirements](https://docs.platformio.org/en/latest/core/installation/requirements.html)
  - [pio boards](https://docs.platformio.org/en/latest/core/userguide/cmd_boards.html)
  - [pio project init](https://docs.platformio.org/en/latest/core/userguide/project/cmd_init.html)
  - [pio project metadata](https://docs.platformio.org/en/latest/core/userguide/project/cmd_metadata.html)
  - [pio run](https://docs.platformio.org/en/latest/core/userguide/cmd_run.html)
  - [pio device list](https://docs.platformio.org/en/latest/core/userguide/device/cmd_list.html)
  - [pio pkg search](https://docs.platformio.org/en/latest/core/userguide/pkg/cmd_search.html)
  - [pio pkg list](https://docs.platformio.org/en/latest/core/userguide/pkg/cmd_list.html)

## 3. 官方文档相关前提

根据官方文档：

- Windows 上 PlatformIO CLI 常见位置是 `%USERPROFILE%\.platformio\penv\Scripts\`
- `pio` / `platformio` 都应该可作为命令入口
- 如果命令不可直接执行，常见原因是 Shell Commands 没接进 `Path`
- `native` 平台构建依赖宿主机本地编译工具链

## 4. 本机 CLI 环境核对

### 4.1 PATH 中默认不可见

直接执行以下命令：

```powershell
where.exe pio
where.exe platformio
```

结果：

- 默认 PATH 中找不到 `pio`
- 默认 PATH 中找不到 `platformio`

这说明：

- 本机不是“没有 PlatformIO”
- 而是“当前 shell 默认没有接通 Shell Commands”

### 4.2 实际 CLI 二进制存在

本机实际存在以下路径：

- `C:\Users\Arrebol\.platformio\penv\Scripts\pio.exe`
- `C:\Users\Arrebol\.platformio\penv\Scripts\platformio.exe`

这与官方 Windows Shell Commands 文档一致。

### 4.3 VS Code PlatformIO 插件已安装

检测到本机存在 VS Code 插件目录：

- `C:\Users\Arrebol\.vscode\extensions\platformio.platformio-ide-3.3.4-win32-x64`

这进一步说明：

- 本机确实已经有 PlatformIO 生态环境
- 只是终端 PATH 未自动接通 CLI

## 5. CLI 可执行性验证

### 5.1 直接用绝对路径执行

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" --version
& "$HOME\.platformio\penv\Scripts\platformio.exe" --version
```

实际结果：

```text
PlatformIO Core, version 6.1.19
```

结论：

- CLI 存在
- 可正常启动
- 当前本机 Core 版本是 `6.1.19`

### 5.2 临时接入 PATH 后可直接执行

执行：

```powershell
$env:PATH = "$HOME\.platformio\penv\Scripts;" + $env:PATH
pio --version
platformio --version
```

实际结果：

```text
PlatformIO Core, version 6.1.19
```

结论：

- 当前问题不是 PlatformIO 未安装
- 而是 Windows Shell Commands 没有永久接入 PATH

## 6. 系统信息验证

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" system info
```

实际结果摘要：

- PlatformIO Core: `6.1.19`
- Python: `3.11.7`
- System Type: `windows_amd64`
- PlatformIO Core Directory: `C:\Users\Arrebol\.platformio`
- Python Executable: `C:\Users\Arrebol\.platformio\penv\Scripts\python.exe`
- Development Platforms: `3`
- Tools & Toolchains: `11`

结论：

- 本机 PlatformIO Core 环境自身是完整启动的
- Python 虚拟环境也存在
- 不是一个“空壳安装”

## 7. 设备列表验证

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" device list --json-output
```

实际结果：

- 当前会话里只看到了多个蓝牙串口 `COM3/4/5/6/7/8`
- 没看到 USB 串口设备

结论：

- `pio device list` 本身可以正常运行
- 但当前执行时，本机没有暴露出可见的 USB 开发板串口
- 这不等于 CLI 有问题，只表示本轮硬件连接状态不满足 USB 设备验证

## 8. 板卡查询验证

### 8.1 全量板卡列表

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" boards --json-output
```

结果：

- 返回大量 JSON 数组结果
- 字段包括 `id`、`name`、`platform`、`mcu`、`fcpu`、`ram`、`rom`、`frameworks`、`vendor`、`debug`

结论：

- `boards` JSON 输出在本机可正常工作
- 当前 `platformio-mcp` 需要继续按这个真实结构兼容字段映射

### 8.2 按 `esp32` 过滤

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" boards esp32 --json-output
```

结果：

- 成功返回大量 `espressif32` 相关板卡
- 包含 `ESP32`、`ESP32S2`、`ESP32S3`、`ESP32C3`、`ESP32C6` 等条目

结论：

- 官方文档中关于 `pio boards [FILTER]` 的行为与本机实际一致
- 板卡发现能力是当前本机已经可直接利用的

## 9. 包检索验证

### 9.1 搜索库

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" pkg search "framework:arduino json"
```

实际结果：

- 成功返回分页文本结果
- 显示 `Found 974 packages (page 1 of 98)`
- 返回多条 JSON / Arduino 相关库条目

结论：

- 官方 `pkg search` 在本机可正常使用
- qualifier 语义是实打实可用的，不只是文档概念

## 10. 项目初始化与元数据验证

### 10.1 初始化临时项目

实践目录：

- `C:\Users\Arrebol\AppData\Local\Temp\pio_practice_doc_2`

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" project init --environment native --project-option=platform=native --project-option=build_flags=-DRELEASE=1
```

实际结果：

- 成功创建
  - `include/`
  - `lib/`
  - `src/`
  - `platformio.ini`
- 输出 `Project has been successfully initialized!`

### 10.2 初始化后的 `platformio.ini`

实际生成：

```ini
[env:native]
platform = native
build_flags = -DRELEASE=1
```

结论：

- `pio project init` 的行为与官方文档一致
- `--environment` + `--project-option` 可以直接用于生成可控的最小项目

### 10.3 获取项目元数据

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" project metadata --json-output
```

实际返回关键字段：

- `build_type = release`
- `env_name = native`
- `defines = ["PLATFORMIO=60119", "RELEASE=1"]`
- `includes.build = [include, src]`
- `cc_path = "gcc"`
- `cxx_path = "g++"`
- `prog_path = ...\.pio\build\native\program.exe`

结论：

- `project metadata` 在本机可正常输出 JSON
- 它确实是比直接解析 `platformio.ini` 更强的结构化信息源
- 对 `platformio-mcp` 后续增强 `inspect_project` 很有直接价值

## 11. 构建验证

### 11.1 构建输入

写入最小 `src/main.cpp`：

```cpp
#include <stdio.h>

int main() {
  puts("BOOT_OK");
  return 0;
}
```

### 11.2 执行构建

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" run
```

实际结果：

```text
Processing native (platform: native)
...
Compiling .pio\build\native\src\main.o
'g++' is not recognized as an internal or external command,
operable program or batch file.
*** [.pio\build\native\src\main.o] Error 1
```

### 11.3 结论

这里的失败非常重要：

- 这不是 PlatformIO CLI 未安装
- 也不是 `pio run` 命令本身坏了
- 而是 `native` 平台依赖宿主机本地 `g++`，而当前机器没有可见的 `g++`

这与官方文档对 `native`/宿主工具链依赖的预期是一致的。

因此当前更准确的判断是：

- 本机的 PlatformIO CLI 环境是存在的
- PlatformIO 项目初始化、元数据、板卡、设备、包检索这些能力都能跑
- 但若选择 `platform = native`，当前机器的宿主 C/C++ 工具链不满足构建条件

## 12. 包列表验证

执行：

```powershell
& "$HOME\.platformio\penv\Scripts\pio.exe" pkg list
```

实际结果：

- 成功列出当前项目依赖树
- 至少包括：
  - `Platform native @ 1.2.1`
  - `tool-scons`
  - `toolchain-atmelavr`
  - `toolchain-riscv32-esp`
  - `toolchain-xtensa-esp32s3`
  - 若干 framework/tool 包

结论：

- `pkg list` 能真实反映当前安装包树
- 这也说明本机 `.platformio` 目录里已经缓存了不少包，不是首次空环境

## 13. 当前本机 PlatformIO CLI 状态总结

### 已确认可用

- CLI 二进制存在
- `pio.exe` / `platformio.exe` 可执行
- Core 版本可读
- `system info` 可执行
- `boards --json-output` 可执行
- `boards esp32 --json-output` 可执行
- `device list --json-output` 可执行
- `pkg search` 可执行
- `project init` 可执行
- `project metadata --json-output` 可执行
- `pkg list` 可执行

### 已确认存在的问题

- 默认 PATH 未接入 PlatformIO Shell Commands
- 当前会话未检测到 USB 开发板串口，仅有蓝牙串口
- `native` 构建失败，根因是本机缺少可见的 `g++`

### 当前不能直接宣称完成的事项

- 不能宣称“本机 PlatformIO CLI 完全无阻塞”
- 不能宣称“当前本机可以直接完成任意项目构建”
- 不能宣称“当前硬件链路可直接验证 upload/monitor”

## 14. 对 `platformio-mcp` 的直接启发

这次实践对本项目最直接的结论有三个：

### 14.1 `doctor` 需要更细

只检查 CLI 版本是不够的，还应区分：

- CLI 是否安装
- CLI 是否在 PATH 中
- CLI 实际绝对路径
- 当前 shell 是否可直接调用
- 当前平台所需宿主工具链是否满足

### 14.2 `build_project` 的失败分类应更明确

像这次的 `g++ not recognized`，不应只返回泛化构建失败，而应该尽量归类为：

- host_toolchain_missing
- missing_compiler
- native_toolchain_unavailable

### 14.3 `inspect_project` / `doctor` 应考虑吸收 `pio project metadata`

因为 `project metadata` 能直接给出：

- `cc_path`
- `cxx_path`
- `prog_path`
- `defines`
- `includes`

这比只读 `platformio.ini` 更接近真实可执行状态。

## 15. 当前最小建议

如果只针对当前本机继续推进，最合理的下一步是：

1. 决定是否要把 `C:\Users\Arrebol\.platformio\penv\Scripts` 永久加到 PATH
2. 在 `platformio-mcp` 里增强 `doctor`
   - 区分“CLI 已安装但 PATH 未接通”
   - 区分“项目存在但宿主编译器缺失”
3. 如果还要继续真实构建实践：
   - 要么补 Windows 本地 `g++`
   - 要么换一个不依赖宿主 `g++` 的真实板卡环境来验证

## 16. 官方示例项目追加实践

本节继续基于官方示例仓库做真实命令验证，不再只停留在最小 `native` 初始化项目。

实践时间：

- `2026-03-27`
- 目录：`E:\program\platformio-official\platformio-examples\wiring-blink`

该示例的 `platformio.ini` 包含多个环境：

- `uno`
- `featheresp32`
- `teensy31`

这里优先验证 `featheresp32`，因为本机已经缓存对应平台与工具链包。

## 17. `pio project metadata` 对官方 ESP32 示例的真实输出

执行：

```powershell
$env:PATH = "$HOME\.platformio\penv\Scripts;" + $env:PATH
$project = "E:\program\platformio-official\platformio-examples\wiring-blink"
pio project metadata -d $project -e featheresp32 --json-output
```

实际结果：

- 成功返回结构化 JSON
- 核心字段包括：
  - `env_name = featheresp32`
  - `cc_path`
  - `cxx_path`
  - `gdb_path`
  - `prog_path`
  - `defines`
  - `includes`
  - `targets`
  - `extra.flash_images`

结论：

- `project metadata` 确实不是“附加信息”，而是接近 IDE / Agent 可直接消费的构建事实源
- 对 `platformio-mcp` 来说，`inspect_project` 后续应优先吸收这一能力，而不是只停留在 `platformio.ini` 解析

## 18. `pio pkg list` 对官方 ESP32 示例的真实输出

执行：

```powershell
$env:PATH = "$HOME\.platformio\penv\Scripts;" + $env:PATH
$project = "E:\program\platformio-official\platformio-examples\wiring-blink"
pio pkg list -d $project -e featheresp32
```

实际结果：

- 成功列出 `featheresp32` 环境依赖树
- 输出中明确包含：
  - `Platform espressif32 @ 6.13.0`
  - `framework-arduinoespressif32`
  - `tool-esptoolpy`
  - `tool-mkfatfs`
  - `tool-mklittlefs`
  - `tool-mkspiffs`
  - `toolchain-riscv32-esp`

结论：

- `pkg list` 在真实项目中可以给出依赖树，而不是平铺列表
- 这说明 `list_installed_libraries` 之外，未来如果要增强 `inspect_project` 或 `doctor`，还可以考虑补“环境依赖树摘要”

## 19. `pio run -t compiledb` 真实验证

执行：

```powershell
$env:PATH = "$HOME\.platformio\penv\Scripts;" + $env:PATH
$project = "E:\program\platformio-official\platformio-examples\wiring-blink"
pio run -d $project -e featheresp32 -t compiledb
```

实际结果：

- 执行成功
- 输出明确出现：
  - `Building compilation database compile_commands.json`
  - `SUCCESS`
- 在项目根目录实际生成：
  - `E:\program\platformio-official\platformio-examples\wiring-blink\compile_commands.json`

结论：

- 本机不仅能调用 `compiledb`，而且对官方 ESP32 示例可真实产出结果
- 这对后续 MCP 很重要，因为它为代码分析、静态工具链、Agent 跨文件理解提供了官方支持的可靠入口

## 20. `pio pkg search` 追加验证

执行：

```powershell
$env:PATH = "$HOME\.platformio\penv\Scripts;" + $env:PATH
pio pkg search "framework:arduino espressif32"
```

实际结果：

- 返回分页结果
- 输出头部明确显示：
  - `Found 165 packages (page 1 of 17)`
- 结果中既包含平台包，也包含库包

结论：

- `pkg search` 在真实 CLI 中确实是分页语义，不是简单数组
- 对 `platformio-mcp` 来说，这进一步验证了：
  - search 结果必须保留分页信息
  - Agent 不应假定一次搜索就拿到完整结果集

## 21. `pio device list --json-output` 追加验证

执行：

```powershell
$env:PATH = "$HOME\.platformio\penv\Scripts;" + $env:PATH
pio device list --json-output
```

实际结果：

- 成功返回 JSON 数组
- 本次列出的依旧只有蓝牙串口：
  - `COM3`
  - `COM4`
  - `COM5`
  - `COM6`
  - `COM7`
  - `COM8`
- 本次仍未看到 USB 开发板口

结论：

- 当前本机这次实践时点仍然没有可直接用于 upload / monitor 的 USB 设备被 CLI 枚举到
- 这再次说明：
  - 当前可以确认 `device list` 命令本身可用
  - 但不能基于这次结果宣称“本机硬件链路已就绪”

## 22. 这轮追加实践对 `platformio-mcp` 的直接启发

### 22.1 `inspect_project` 应尽量贴近 `project metadata`

因为它能稳定暴露：

- 编译器路径
- include 路径
- 宏定义
- 输出固件路径
- target 列表
- 额外 flash image

这比单纯解析 `platformio.ini` 更接近真实执行态。

### 22.2 `doctor` 需要区分三类状态

- CLI 不存在
- CLI 存在但当前 shell 不可直呼
- CLI 可用，但当前项目或宿主工具链还不满足执行条件

### 22.3 `build_project` 后续可考虑补 `compiledb` 导向能力

不是现在就加新功能，而是明确：

- 官方已经提供了稳定入口
- 后续若要增强代码分析能力，不应自造 include 推断机制

### 22.4 `list_installed_libraries` 不应只盯“库”

官方 `pkg list` 更接近“环境依赖树”视角，包含：

- platform
- framework
- toolchain
- tools
- libraries

因此当前 MCP 的 library 视角是可用的，但并不覆盖官方全部依赖面。

## 23. 到目前为止的真实实践边界

### 已真实跑通

- `pio --version`
- `pio system info`
- `pio boards --json-output`
- `pio boards esp32 --json-output`
- `pio device list --json-output`
- `pio pkg search`
- `pio project init`
- `pio project metadata --json-output`
- `pio pkg list`
- `pio run -t compiledb`

### 已真实发现的阻塞

- 默认 PowerShell PATH 未接通 PlatformIO Shell Commands
- `native` 构建缺少宿主 `g++`
- 当前这轮实践未枚举到可 upload 的 USB 开发板端口

### 还不能宣称已完成

- 不能宣称本机已完成真实 upload
- 不能宣称本机已完成真实 monitor 闭环
- 不能宣称当前机器对任意 PlatformIO 项目都具备完整构建能力

## 24. `pio remote` 命令族追加实践

本节只记录本机真实 CLI 行为，不把官方源码推断混进来。

实践时间：

- `2026-03-27`
- Shell: PowerShell

### 24.1 `pio remote --help`

执行：

```powershell
& "$HOME\\.platformio\\penv\\Scripts\\pio.exe" remote --help
```

实际结果：

- 成功输出子命令：
  - `agent`
  - `device`
  - `run`
  - `test`
  - `update`

结论：

- 当前本机 CLI 已包含 remote 命令入口
- `remote` 不是文档概念，是真实可调用命令族

### 24.2 `pio remote device --help`

执行：

```powershell
& "$HOME\\.platformio\\penv\\Scripts\\pio.exe" remote device --help
```

实际结果：

- 首次触发安装 `platformio/contrib-pioremote`
- 安装过程中拉取：
  - `twisted`
  - `pyopenssl`
  - `service-identity`
  - `pywin32`
- 安装完成后成功输出子命令：
  - `list`
  - `monitor`

结论：

- `remote` 在本机并非完全零依赖功能
- 首次使用会触发官方远端组件安装
- 对 `platformio-mcp` 来说，这说明未来若要对齐 remote 能力，`doctor` 需要考虑 remote 依赖准备状态

### 24.3 `pio remote device monitor --help`

执行：

```powershell
& "$HOME\\.platformio\\penv\\Scripts\\pio.exe" remote device monitor --help
```

实际结果：

- 成功显示参数，包括：
  - `--port`
  - `--baud`
  - `--parity`
  - `--rtscts`
  - `--xonxoff`
  - `--rts`
  - `--dtr`
  - `--echo`
  - `--encoding`
  - `--filter`
  - `--eol`
  - `--raw`
  - `--exit-char`
  - `--menu-char`
  - `--quiet`
  - `--project-dir`
  - `--environment`
  - `--sock`

结论：

- 官方 remote monitor 不是只读日志命令
- 它延续了本地 monitor 的大部分交互参数
- `--sock` 很关键，说明 remote monitor 本身具备桥接到本地 socket 的能力

### 24.4 `pio remote run --help`

执行：

```powershell
& "$HOME\\.platformio\\penv\\Scripts\\pio.exe" remote run --help
```

实际结果：

- 成功显示参数，包括：
  - `--environment`
  - `--target`
  - `--upload-port`
  - `--project-dir`
  - `--disable-auto-clean`
  - `--force-remote`
  - `--silent`
  - `--verbose`

结论：

- 官方明确暴露 `--force-remote`
- 这说明远端执行在官方语义里分“默认混合路径”和“强制完整远端路径”两种模式

### 24.5 `pio remote test --help`

执行：

```powershell
& "$HOME\\.platformio\\penv\\Scripts\\pio.exe" remote test --help
```

实际结果：

- 成功显示参数，包括：
  - `--environment`
  - `--filter`
  - `--ignore`
  - `--upload-port`
  - `--test-port`
  - `--project-dir`
  - `--force-remote`
  - `--without-building`
  - `--without-uploading`
  - `--verbose`

结论：

- 官方远端测试不是单一黑盒动作
- 它保留了构建、上传、测试三个阶段的显式控制开关

### 24.6 这轮 remote 实践对 `platformio-mcp` 的直接启发

基于本机真实 CLI，而不是源码推断，可以直接确认：

- PlatformIO 官方已经有远端硬件接入能力
- 远端能力的重点不是 shell，而是：
  - agent
  - device list/monitor
  - run
  - test
- `remote device monitor` 的 `--sock` 参数，为未来 `platformio-mcp` 的交互式硬件接入能力提供了非常直接的官方参考

### 24.7 这轮实践的现实边界

本轮只完成了 remote CLI 帮助与依赖安装验证。

还没有真实完成：

- `pio remote agent start`
- 真实远端设备发现
- 真实远端 upload
- 真实远端 monitor
- 真实远端 test

因此当前只能宣称：

- 本机 PlatformIO Core 6.1.19 确实包含 remote 能力入口
- 本机已经能安装并调用 remote 子命令
- 但远端硬件工作流本身还没有在本机完成真实闭环验证

## 25. 当前 `platformio-mcp` 只读真相链路追加实践

本节不是直接调用裸 CLI，而是直接使用当前仓库里的只读实现：

- `inspect_project`
- `list_project_targets`
- `generate_compile_commands`

目的是确认这条“项目真相层”在两个真实对象上是否已经足够稳定：

1. 当前真实项目：`E:\program\platformio-mcp\源码`
2. 官方 example：`E:\program\platformio-official\platformio-examples\wiring-blink`

实践时间：

- `2026-03-28`
- 执行方式：`npx tsx` 直接调用当前仓库中的 `src/tools/projects.ts`

### 25.1 当前真实项目：`源码`

#### `inspect_project`

实际结果摘要：

- `environmentResolution = single_environment_fallback`
- `resolvedEnvironment = esp32-s3-devkitc-1`
- `metadataAvailable = true`
- `projectSummary.environmentCount = 1`
- `projectSummary.hasTargets = true`
- `projectSummary.hasLibraryDependencyOverrides = true`
- `riskSummary.hasWarnings = false`
- `programPath = E:\program\platformio-mcp\源码\.pio\build\esp32-s3-devkitc-1\firmware.elf`

结论：

- 当前真实项目即使没有配置 `default_envs`，也能通过“单环境 fallback”得到稳定 environment 真相
- metadata、targets、program path 都能被真实拿到
- 对这个项目来说，`inspect_project` 已经足够承担“总览入口”

#### `list_project_targets`

实际结果摘要：

- `resolvedEnvironment = esp32-s3-devkitc-1`
- `targetDiscoveryStatus = targets_found`
- `targets` 包括：
  - `buildfs`
  - `erase`
  - `size`
  - `upload`
  - `uploadfs`
  - `uploadfsota`

结论：

- 当前 MCP 的 target 发现能力在真实项目上是可直接使用的
- 不是只返回原始文本，而是已经能给出结构化 target 列表

#### `generate_compile_commands`

实际结果摘要：

- `resolvedEnvironment = esp32-s3-devkitc-1`
- `generationStatus = generated`
- `compileCommandsPath = E:\program\platformio-mcp\源码\compile_commands.json`

结论：

- 当前真实项目在本机上可以真实生成 `compile_commands.json`
- 这证明 “inspect -> targets -> compiledb” 的只读链路不是纸面设计

### 25.2 官方 example：`wiring-blink`

#### `inspect_project`

实际结果摘要：

- `environmentResolution = ambiguous`
- `resolvedEnvironment = null`
- `metadataAvailable = false`
- `projectSummary.environmentCount = 3`
- `riskSummary.hasEnvironmentRisk = true`
- `warnings` 包含：
  - `PlatformIO metadata lookup was skipped because no environment could be resolved unambiguously.`
- `resolutionWarnings` 包含：
  - environment 选择存在歧义

结论：

- 对多 environment 且无 `default_envs` 的官方 example，当前实现不会伪造 `resolvedEnvironment`
- 也不会硬查 metadata 然后把不可靠结果包装成真相
- 这正是当前主线要的行为：先把 environment 歧义暴露出来

#### `list_project_targets`

实际结果摘要：

- `resolvedEnvironment = null`
- `targetDiscoveryStatus = targets_found`
- `targets` 包括：
  - `bootloader`
  - `fuses`
  - `size`
  - `upload`
  - `uploadeep`
  - `buildfs`
  - `erase`
  - `uploadfs`
  - `uploadfsota`

结论：

- 即使 `inspect_project` 阶段 environment 仍有歧义，当前 target 发现仍能返回真实 CLI 结果
- 但这里的返回更适合被解释为“项目层可见 target 面”，而不是某个已解析 environment 的强事实

#### `generate_compile_commands`

实际结果摘要：

- `resolvedEnvironment = null`
- `generationStatus = environment_not_resolved`
- `failureCategory = environment_not_resolved`

结论：

- 当前实现对 compile commands 的处理是保守且正确的：
  - environment 不明确
  - 就不伪造生成成功
  - 直接返回结构化不可执行原因

### 25.3 这轮实践对当前主线的实际结论

基于这次真实调用，可以确认：

- `inspect_project` 已经能把“单环境真实项目”和“多环境官方 example”区分清楚
- `list_project_targets` 已具备真实可用的结构化 target 发现能力
- `generate_compile_commands` 已具备真实可用的成功/不可执行状态语义

当前最重要的不是继续扩字段，而是保持这套真相层语义稳定：

- 单环境项目：
  - 应直接给出可靠 `resolvedEnvironment`
- 多环境歧义项目：
  - 应优先暴露 `ambiguous`
  - 不应伪造 metadata / compiledb 成功

这说明当前这条“项目真相与能力发现强化”主线已经基本具备真实项目可用性，而不是停留在测试样本层。

## 26. `doctor -> repair_environment -> recheck` 收口验证补记

本节记录当前 MCP 环境闭环线的最新真实结果，重点不是“能不能修”，而是：

- 当前问题是否已结构化
- 修复建议是否有优先级
- 修完后是否能直接判断还剩什么

实践时间：

- `2026-03-28`

### 26.1 当前主机已健康时的 `repair_environment`

在当前 Windows 主机上，`doctor({ projectDir: "E:/program/platformio-mcp/源码" })` 已经能返回：

- `platformio.installed = true`
- `platformio.shellCallable = true`
- `readyForBuild = true`
- `readyForUpload = true`
- `readyForMonitor = true`
- `detectedProblems = []`

此时即使显式调用：

```text
repair_environment({
  projectDir: "E:/program/platformio-mcp/源码",
  fixIds: ["activate_local_platformio_cli"]
})
```

当前实现也不再把它误判成失败，而是返回：

- `repairStatus = applied`
- `attemptedFixes = []`
- `appliedFixes = []`
- `failedFixes = []`
- `recheckSummary.stillBlocking = false`

结论：

- 当主机已经健康时，请求一个“已知但当前无需执行”的修复项，不应再制造假失败
- 这对 Agent 很关键，因为它减少了“重复修复请求”带来的噪音

### 26.2 当前环境闭环新增的结构化语义

#### `doctor.detectedProblems[].affects`

当前问题项已补充最小影响面，例如：

- `all_platformio`
- `native_build`
- `upload`
- `monitor`

这使高层调用方可以更准确地区分：

- 当前问题是否阻塞整个 PlatformIO 主链
- 是否只是 native 主机构建相关风险
- 是否只是串口传输层问题

#### `doctor.repairReadiness`

当前除了布尔汇总外，还新增：

- `recommendedFixIds`
- `manualProblemCodes`

这意味着：

- `repair_environment` 默认不再盲目尝试所有修复项
- 手工引导类问题默认只保留在 plan 中

#### `repair_environment.recheckSummary`

当前修复结果除了 `postRepairDoctor` 外，还会直接返回：

- `resolvedProblemCodes`
- `remainingProblemCodes`
- `newProblemCodes`
- `stillBlocking`
- `readyForBuild`
- `readyForUpload`
- `readyForMonitor`

结论：

- 现在高层 Agent 已经不需要自己手工 diff 两份 `doctor` 报告
- 环境修复是否真正推进了主链，已经能被直接消费
