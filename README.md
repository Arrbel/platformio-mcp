<p align="center">
  <img src="Cline-PlatformIO-MCP-Server-Logo.png" alt="PlatformIO MCP Server" width="200"/>
</p>

<h1 align="center">PlatformIO MCP Server</h1>

<p align="center">
  A board-agnostic <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server for <a href="https://platformio.org">PlatformIO</a> embedded development.<br/>
  Let AI agents build, upload, monitor, and verify firmware across <strong>1,000+ boards</strong> and <strong>30+ platforms</strong>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/platformio-mcp-server"><img src="https://img.shields.io/npm/v/platformio-mcp-server?color=cb3837&label=npm" alt="npm version"/></a>
  <a href="https://github.com/Arrbel/platformio-mcp/actions"><img src="https://img.shields.io/github/actions/workflow/status/Arrbel/platformio-mcp/ci.yml?branch=main&label=CI" alt="CI status"/></a>
  <img src="https://img.shields.io/node/v/platformio-mcp-server" alt="node version"/>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Arrbel/platformio-mcp" alt="license"/></a>
</p>

---

## Quick Start

```bash
npx -y platformio-mcp-server
```

Or install globally:

```bash
npm install -g platformio-mcp-server
```

> Requires **Node.js 18+** and **[PlatformIO Core CLI](https://platformio.org/install/cli)** (`pip install platformio`)

## MCP Configuration

Add to your MCP client (Claude Desktop, Cline, Cursor, etc.):

```json
{
  "mcpServers": {
    "platformio": {
      "command": "npx",
      "args": ["-y", "platformio-mcp-server"]
    }
  }
}
```

<details>
<summary>Custom PlatformIO CLI path</summary>

```json
{
  "mcpServers": {
    "platformio": {
      "command": "npx",
      "args": ["-y", "platformio-mcp-server"],
      "env": {
        "PLATFORMIO_CLI_PATH": "/path/to/pio"
      }
    }
  }
}
```

</details>

## 14 MCP Tools

| Category | Tools | Description |
|----------|-------|-------------|
| **Board Discovery** | `list_boards` `get_board_info` | Search 1,000+ boards, get specs (MCU, frequency, flash, RAM) |
| **Device Management** | `list_devices` | Detect connected serial devices |
| **Project** | `init_project` `inspect_project` `list_environments` | Create, inspect, and enumerate project environments |
| **Build & Upload** | `build_project` `clean_project` `upload_firmware` | Compile, clean, and flash firmware |
| **Monitor** | `start_monitor` | Serial capture with bounded duration, or generate monitor command |
| **Libraries** | `search_libraries` `install_library` `list_installed_libraries` | Search registry, install, and list dependencies |
| **Diagnostics** | `doctor` | Check Node.js, PlatformIO CLI, project health, and device visibility |

All tools return structured JSON with `status`, `summary`, `data`, `warnings`, `nextActions`, and unified `ExecutionResultMeta`.

## Typical Workflow

```
doctor → list_boards → init_project → build_project → upload_firmware → start_monitor
```

1. Run `doctor` to verify your environment
2. Find your board with `list_boards` or `get_board_info`
3. Create or inspect a project
4. Build and upload firmware
5. Monitor serial output and verify runtime behavior

## Supported Platforms

ESP32 · ESP8266 · Arduino (Uno, Mega, Nano, Due) · STM32 · nRF52 · RP2040 (Pico) · Teensy · RISC-V · MSP430 · PIC32 · and [many more](https://docs.platformio.org/en/latest/boards/)

## What's New in v1.1

This release resolves the technical debt from v1.0 and closes the execution layer with real hardware validation.

| Improvement | Detail |
|-------------|--------|
| **`startMonitor` refactor** | 17 positional params → typed `StartMonitorOptions` object |
| **Monitor verification** | Profile-driven signal evaluation, no hardcoded sensor fields |
| **Registry split** | `registry.ts` reduced from 731 → 54 lines; per-tool definition modules |
| **Type system** | Monolithic `types.ts` → 9 domain modules under `src/types/` |
| **Upload dedup** | Shared `executeUploadRun()` eliminates duplicated upload logic |
| **Version consistency** | `SERVER_VERSION` read from `package.json` at runtime |
| **ExecutionResultMeta** | Unified response metadata across all 14 tools |
| **CI integration tests** | Real PlatformIO CLI tests in GitHub Actions (no hardware required) |
| **Hardware closure** | Full build → upload → monitor → verify on ESP32-S3 + CH343 |

## Hardware Validation

Documented real hardware closure on **ESP32-S3 DevKitC-1** ([full report](docs/phase-a2-hardware-closure.md)):

- **Board:** ESP32-S3 · **Adapter:** CH343 · **Port:** COM9 · **Framework:** Arduino
- **Result:** build → upload → monitor → verify closed successfully
- 5 JSON messages captured · 9 health signals · 0 failure signals

## Development

```bash
npm install
npm run build
npm test                  # unit tests
npm run test:integration  # PlatformIO CLI integration tests
npm run lint
npm run format:check
```

## Attribution

This project is forked from [jl-codes/platformio-mcp](https://github.com/jl-codes/platformio-mcp). The original work laid the foundation for the MCP server architecture and initial tool implementations. The current repository ([Arrbel/platformio-mcp](https://github.com/Arrbel/platformio-mcp)) adds substantial execution-layer improvements, structured verification, CI integration, and real hardware closure validation.

## License

[MIT](LICENSE)
