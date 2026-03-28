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

## What This Server Is

`platformio-mcp-server` is an execution-layer MCP server for PlatformIO projects.

Its current focus is:

- inspect real PlatformIO projects without forcing higher-level agents to guess `environment` resolution
- run build / upload / monitor flows and return structured results instead of raw CLI text
- keep serial monitoring usable both as bounded capture and as a persistent session
- diagnose the local host with `doctor` and close low-risk repair loops with `repair_environment`

It is intentionally not a workflow orchestrator, not a generic terminal, and not a remote-device platform yet.

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

## Current Recommended Entry Points

If you are using this server on a real project, start here:

1. `doctor`
2. `repair_environment` if `doctor` reports recommended fixes
3. `inspect_project`
4. `build_project`
5. `upload_firmware`
6. `open_monitor_session` / `read_monitor_session` / `close_monitor_session`

Use `start_monitor` when you only want:

- instruction-mode guidance
- a bounded one-shot serial capture
- one-shot profile verification instead of a longer-lived session

## Typical Workflow

```
doctor → repair_environment (optional) → inspect_project → build_project → upload_firmware → open_monitor_session → read_monitor_session → close_monitor_session
```

1. Run `doctor` to verify your environment and review structured repair suggestions
2. If needed, run `repair_environment` in `dryRun` mode first, then allow low-risk or confirmed fixes
3. Find your board with `list_boards` or `get_board_info`
4. Create or inspect a project
5. Use `inspect_project` as the project-truth entrypoint to resolve environments, metadata availability, and project capability hints
6. Use `list_project_targets` to discover official PlatformIO targets for the resolved environment
7. Use `generate_compile_commands` when the project supports `compiledb`
8. Build and upload firmware
9. Use `open_monitor_session` / `read_monitor_session` / `close_monitor_session` for persistent serial monitoring
10. Use `start_monitor` when you only need bounded capture or instruction-mode guidance

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

Important project-truth fields exposed by `inspect_project` now include:

- `defaultEnvironments`
- `resolvedEnvironment`
- `environmentResolution`
- `resolutionReason`
- `resolutionWarnings`
- `metadataAvailable`
- `targets`
- `toolchain`
- `includes`
- `defines`
- `programPath`
- `configComplexitySignals`
- `projectCapabilities`

This means higher-level agents can distinguish:

- config-derived truth from execution-derived truth
- single-environment fallback from explicit default environment resolution
- genuinely unresolved projects from projects that simply have no metadata yet
- simple projects from projects using risky PlatformIO features like `extends`, `extra_configs`, or interpolation

## Device And Transport Semantics

`list_devices` is no longer just a raw serial-port dump.

It now normalizes official PlatformIO device discovery into structured fields such as:

- `deviceType`
- `transportType`
- `detectionSource`
- `uploadCandidate`
- `monitorCandidate`

This same device classification is reused by `doctor`, upload resolution, and monitor resolution so the server does not maintain three different guesses about which port matters.

## Upload Semantics

`upload_firmware` is intended to be directly consumable by an Agent without post-parsing CLI text.

Key fields now include:

- `resolvedPort`
- `resolvedEnvironment`
- `resolutionSource`
- `uploadStatus`
- `failureCategory`
- `retryHint`

Current upload status modeling covers common cases such as:

- `uploaded`
- `device_not_found`
- `port_unavailable`
- `manual_boot_required`
- `uploader_failed`
- `unknown_failure`

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

Current real host closure on this Windows machine has already been validated for:

- local PlatformIO CLI path activation when `pio` is not callable from `PATH`
- confirmation-gated host compiler installation via `winget`
- post-repair `doctor` recheck semantics

The repair loop is still intentionally conservative:

- no process killing for busy serial ports
- no automatic driver installation
- no generic package-manager abstraction
- no remote workflow repair logic

## Monitor Execution Modes

There are now two intended monitor paths:

- `start_monitor`
  - compatibility entrypoint for bounded capture and instruction-mode responses
  - useful when you want one-shot output capture plus optional profile verification
- `open_monitor_session` / `read_monitor_session` / `write_monitor_session` / `close_monitor_session`
  - first-stage persistent monitor session flow
  - intended for real execution-layer closure where the Agent needs to keep reading serial output over time

Current structured monitor/session results stabilize fields such as:

- `transportType`
- `resolvedPort`
- `resolvedBaud`
- `resolvedEnvironment`
- `resolutionSource`
- `monitorStatus`
- `verificationStatus`
- `failureCategory`
- `retryHint`

Structured monitor verification continues to use a deliberately small rule set:

- `expectedPatterns`
- `expectedJsonFields`
- `expectedJsonNonNull`
- `expectedJsonValues`
- `allowedNullFields`
- `expectedCycleSeconds`
- `expectedCycleToleranceSeconds`
- `minJsonMessages`

Current verification results distinguish:

- `healthy`
- `degraded`
- `failed`
- `not_requested`
- `indeterminate`

This keeps monitor verification useful for real device closure without turning the server into a private protocol engine.

## Supported Platforms

ESP32 · ESP8266 · Arduino (Uno, Mega, Nano, Due) · STM32 · nRF52 · RP2040 (Pico) · Teensy · RISC-V · MSP430 · PIC32 · and [many more](https://docs.platformio.org/en/latest/boards/)

## What's New in v1.2

This release closes the current execution-layer consolidation pass: project truth aligns with official PlatformIO metadata, upload/monitor semantics are stabilized, and `doctor → repair_environment → recheck` forms a practical host-environment closure loop.

| Improvement | Detail |
|-------------|--------|
| **Project truth model** | `inspect_project` now separates `platformio.ini` config truth from `pio project metadata --json-output` execution truth |
| **Capability discovery** | `list_project_targets` and `generate_compile_commands` now return structured discovery/generation status instead of ad-hoc command text |
| **Monitor sessions** | Added `open_monitor_session`, `read_monitor_session`, `write_monitor_session`, and `close_monitor_session` for persistent serial monitoring |
| **Upload/monitor semantics** | Stable fields like `resolvedPort`, `resolvedEnvironment`, `monitorStatus`, `verificationStatus`, `failureCategory`, and `retryHint` now flow through the main execution path |
| **Host repair closure** | `doctor` and `repair_environment` now provide structured diagnosis, recommended fixes, and explicit recheck summaries |
| **`startMonitor` refactor** | 17 positional params → typed `StartMonitorOptions` object |
| **Monitor verification** | Profile-driven signal evaluation, no hardcoded sensor fields |
| **Registry split** | `registry.ts` reduced from 731 → 54 lines; per-tool definition modules |
| **Type system** | Monolithic `types.ts` → 9 domain modules under `src/types/` |
| **Upload dedup** | Shared `executeUploadRun()` eliminates duplicated upload logic |
| **Version consistency** | `SERVER_VERSION` read from `package.json` at runtime |
| **ExecutionResultMeta** | Unified response metadata across all 21 tools |
| **CI integration tests** | Real PlatformIO CLI tests in GitHub Actions (no hardware required) |
| **Hardware validation** | Real device detection + upload + persistent monitor-session validation on ESP32 agriculture node via CH343 |
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

Current explicit validation boundary:

- directly revalidated on one real ESP32-S3 node
- directly revalidated on real upload + persistent monitor-session closure
- directly revalidated on local PlatformIO CLI integration tests
- not yet claimed across a broader hardware matrix
- not yet claimed for remote workflows
- not a generic shell/terminal server

## Development

```bash
npm install
npm run build
npm test                  # unit tests
npm run test:integration  # PlatformIO CLI integration tests
npm run lint
npm run format:check
```

Current local verification baseline used before release preparation:

- `npm run build`
- `npm run lint`
- `npm test -- --run`
- `npm run test:integration`
- `npm pack --dry-run`

## Attribution

This project is forked from [jl-codes/platformio-mcp](https://github.com/jl-codes/platformio-mcp). The original work laid the foundation for the MCP server architecture and initial tool implementations. The current repository ([Arrbel/platformio-mcp](https://github.com/Arrbel/platformio-mcp)) adds substantial execution-layer improvements, structured verification, CI integration, and real hardware closure validation.

## License

[MIT](LICENSE)
