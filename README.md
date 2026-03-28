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

## 21 MCP Tools

| Category | Tools | Description |
|----------|-------|-------------|
| **Board Discovery** | `list_boards` `get_board_info` | Search 1,000+ boards, get specs (MCU, frequency, flash, RAM) |
| **Device Management** | `list_devices` | Detect connected serial devices |
| **Project** | `init_project` `inspect_project` `list_project_targets` `generate_compile_commands` `list_environments` | Create projects, inspect project truth, discover targets, generate compile commands, and enumerate environments |
| **Build & Upload** | `build_project` `clean_project` `upload_firmware` | Compile, clean, and flash firmware |
| **Monitor** | `start_monitor` `open_monitor_session` `read_monitor_session` `write_monitor_session` `close_monitor_session` | Bounded capture plus first-stage persistent serial monitor sessions |
| **Libraries** | `search_libraries` `install_library` `list_installed_libraries` | Search registry, install, and list dependencies |
| **Diagnostics** | `doctor` `repair_environment` | Diagnose environment/project readiness, surface repair suggestions, and execute controlled low-risk repairs |

All tools return structured JSON with `status`, `summary`, `data`, `warnings`, `nextActions`, and unified `ExecutionResultMeta`.

## Typical Workflow

```
doctor → repair_environment (optional) → inspect_project → build_project → upload_firmware → start_monitor
```

1. Run `doctor` to verify your environment and review structured repair suggestions
2. If needed, run `repair_environment` in `dryRun` mode first, then allow low-risk or confirmed fixes
3. Find your board with `list_boards` or `get_board_info`
4. Create or inspect a project
5. Use `inspect_project` as the project-truth entrypoint to resolve environments, metadata availability, and project capability hints
6. Use `list_project_targets` to discover official PlatformIO targets for the resolved environment
7. Use `generate_compile_commands` when the project supports `compiledb`
8. Build and upload firmware
9. Monitor serial output and verify runtime behavior

## Read-Only Project Truth

`inspect_project` is now the primary read-only overview entrypoint for a PlatformIO project.

It distinguishes:

- static config truth from `platformio.ini`
- execution-time truth from `pio project metadata --json-output`
- environment resolution states such as `default_envs`, `single_environment_fallback`, `ambiguous`, and `not_resolved`

In practice this means higher-level agents no longer need to guess:

- which environment is actually resolved
- whether metadata was available or intentionally skipped
- whether the project can expose targets or generate `compile_commands.json`

Related read-only tools:

- `list_project_targets`
  - returns `targetDiscoveryStatus`, `targets`, `resolvedEnvironment`, and `rawOutputExcerpt`
- `generate_compile_commands`
  - returns `generationStatus`, `compileCommandsPath`, `resolvedEnvironment`, and `failureCategory`

## Environment Closure Loop

`doctor` and `repair_environment` now form a minimal environment-closure loop for the current host.

- `doctor`
  - returns structured `detectedProblems`
  - classifies problem impact through `affects`
  - exposes `repairReadiness.recommendedFixIds` and `manualProblemCodes`
- `repair_environment`
  - defaults to recommended fixes when no `fixIds` or `problemCodes` are provided
  - keeps install actions confirmation-gated through `allowInstall`
  - returns `recheckSummary` so callers can see:
    - which problems were resolved
    - which problems remain
    - whether build / upload / monitor are now ready

Recommended usage:

1. Call `doctor`
2. If `recommendedFixIds` is non-empty, call `repair_environment` with `dryRun: true`
3. If the plan looks safe, rerun `repair_environment` without `dryRun`
4. Use `recheckSummary` to decide whether to continue with `inspect_project`, `build_project`, `upload_firmware`, or `start_monitor`

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
| **ExecutionResultMeta** | Unified response metadata across all 21 tools |
| **CI integration tests** | Real PlatformIO CLI tests in GitHub Actions (no hardware required) |
| **Hardware validation** | Real device detection + upload + persistent monitor-session validation on ESP32 agriculture node via CH343 |
| **Environment repair loop** | `doctor` now returns structured `detectedProblems`, `fixSuggestions`, `repairReadiness`; `repair_environment` applies controlled low-risk fixes and re-runs `doctor` |
| **Repair closure semantics** | `doctor` problems now expose impact hints like `affects`, while `repair_environment` returns `recheckSummary` so agents can see what was resolved, what remains, and whether build/upload/monitor are ready |
| **Confirmed install repair** | `repair_environment` can now execute a confirmation-gated Windows host compiler install via `winget` and clear `host_cpp_compiler_missing` on recheck |
| **Confirmed CLI activation repair** | `repair_environment` can now persist `PLATFORMIO_CLI_PATH` for future MCP sessions on Windows and clear `platformio_cli_not_shell_callable` on recheck |

## Hardware Validation

Documented real hardware validation on the live ESP32 agriculture node:

- **Adapter:** CH343 · **Port:** COM9 · **Baud:** 115200
- **Result:** device detection + upload + bounded monitor capture + monitor-session verification succeeded
- **Observed:** structured JSON payloads, stable 5-second cycle, and a fresh session-based `healthy` verification with non-null `light` / `co2`

Current direct evidence is recorded in:

- [docs/esp32-agri-node-validation-profile.md](/E:/program/platformio-mcp/docs/esp32-agri-node-validation-profile.md)
- [docs/hardware-validation.md](/E:/program/platformio-mcp/docs/hardware-validation.md)

Session-oriented hardware closure notes are tracked in [docs/phase-a2-hardware-closure.md](/E:/program/platformio-mcp/docs/phase-a2-hardware-closure.md).

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
