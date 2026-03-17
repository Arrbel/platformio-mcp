# PlatformIO MCP Server

PlatformIO MCP Server is a **Model Context Protocol (MCP) execution layer** for PlatformIO-based embedded development.

This repository is maintained and published by **Arrbel** at `Arrbel/platformio-mcp`, and is focused on turning real PlatformIO workflows into structured MCP tools that AI agents can safely consume.

It supports board-agnostic flows such as:

- board discovery
- project inspection
- environment resolution
- firmware build
- firmware upload
- serial monitor capture
- runtime verification
- library management
- environment diagnostics

## Maintainer

- **Current maintainer / publisher:** Arrbel
- **GitHub repository:** `https://github.com/Arrbel/platformio-mcp`
- **npm package:** `platformio-mcp-server`

## Upstream Attribution

This repository builds on the original upstream project lineage from `jl-codes/platformio-mcp`.

The current repository adds substantial execution-layer work, including:

- `startMonitor` interface refactor to a typed options object
- profile-driven monitor verification with no hardcoded domain fields
- per-tool registry definition modules with compatibility tests
- domain-split type system and upload-path deduplication
- runtime version consistency from `package.json`
- hardware-free PlatformIO CLI integration tests in CI
- real hardware closure validation on an ESP32-S3 sample board

The upstream work remains an important source foundation and should continue to be acknowledged.

## Current Release Position

This repository has crossed the “proof-of-concept” stage and is now positioned as a **credible execution layer release**.

### What is already validated

- 14 MCP tools exposed over stdio
- structured tool responses using `status`, `summary`, `data`, `warnings`, and `nextActions`
- shared `ExecutionResultMeta` coverage across all 14 tools
- `platformio.ini` parsing without requiring the PlatformIO CLI for inspect-style operations
- hardware-free PlatformIO CLI integration tests in CI
- one documented real hardware closure on **ESP32-S3 + CH343 + COM9**

### What this does **not** mean yet

- not every board has been validated in real hardware closure
- not every upload workflow is zero-touch
- this is not yet a fully autonomous “plug hardware and let the agent do everything forever” system

The realistic current positioning is:

> **execution layer complete, real closure proven at least once, broader stability still to be expanded**

## Tooling

The server currently exposes 14 MCP tools:

1. `list_boards`
2. `get_board_info`
3. `list_devices`
4. `init_project`
5. `inspect_project`
6. `list_environments`
7. `build_project`
8. `clean_project`
9. `upload_firmware`
10. `start_monitor`
11. `search_libraries`
12. `install_library`
13. `list_installed_libraries`
14. `doctor`

## Installation

### Prerequisites

- Node.js 18+
- PlatformIO Core CLI installed and available as `pio`, `platformio`, or via `PLATFORMIO_CLI_PATH`

Example PlatformIO installation:

```bash
pip install platformio
pio --version
```

### Run via `npx`

```bash
npx -y platformio-mcp-server
```

### Or install globally

```bash
npm install -g platformio-mcp-server
platformio-mcp-server
```

## MCP Configuration

### Recommended `npx` configuration

```json
{
  "mcpServers": {
    "platformio": {
      "command": "npx",
      "args": ["-y", "platformio-mcp-server"],
      "env": {}
    }
  }
}
```

### If PlatformIO is not in PATH

```json
{
  "mcpServers": {
    "platformio": {
      "command": "npx",
      "args": ["-y", "platformio-mcp-server"],
      "env": {
        "PLATFORMIO_CLI_PATH": "C:/Users/you/AppData/Local/Programs/Python/Python311/Scripts/pio.exe"
      }
    }
  }
}
```

### Local repository development configuration

```json
{
  "mcpServers": {
    "platformio": {
      "command": "node",
      "args": ["E:/program/platformio-mcp/build/index.js"],
      "env": {}
    }
  }
}
```

## Typical Flow

1. Run `doctor` to confirm Node.js, PlatformIO, project state, and device visibility.
2. Use `list_boards` or `get_board_info` to choose target hardware.
3. Use `init_project` or `inspect_project` to prepare or inspect a PlatformIO workspace.
4. Use `build_project` and `upload_firmware` for firmware delivery.
5. Use `start_monitor` for either monitor instructions or bounded serial capture.
6. Use monitor verification output to decide whether the runtime behavior matches expectations.

## Verified Capabilities

### Non-hardware-dependent validation

- `npm run build`
- `npm test`
- `npm run test:integration`
- `npm run lint`
- `npm run format:check`

CI runs the same checks on pull requests, including a dedicated PlatformIO CLI integration job.

### Real hardware closure evidence

Documented in `docs/phase-a2-hardware-closure.md`:

- board: **ESP32-S3 DevKitC-1 class sample**
- serial adapter: **CH343**
- port: **COM9**
- framework: **Arduino**
- result: **build -> upload -> monitor -> verify closed successfully**

Observed verification summary from the documented closure:

- 5 JSON messages captured
- 9 health signals
- 0 failure signals
- degraded-only status caused by expected missing physical sensors

## Notes

- `inspect_project` and `list_environments` work by parsing `platformio.ini`; they do not require the PlatformIO CLI.
- `upload_firmware` and `start_monitor` can inherit `upload_port`, `monitor_port`, and `monitor_speed` from the selected or default environment when those values are defined in `platformio.ini`.
- `start_monitor` remains backward compatible at the MCP schema level; without capture options it returns an executable command, with bounded capture options it returns collected serial lines.

## Local Development

```bash
npm install
npm run build
npm test
npm run test:integration
npm run lint
npm run format:check
```

Run from source:

```bash
node build/index.js
```

If PlatformIO CLI is missing, the server still starts, but execution tools return warnings or errors until the CLI is available.

## Recommended Reading

- `llms-install.md` — agent/operator-oriented installation guide
- `docs/phase-a-a1-closure-report.md` — Phase A1 closure report
- `docs/phase-a2-hardware-closure.md` — real hardware closure record
- `docs/hardware-validation.md` — hardware validation baseline

## License

MIT. See `LICENSE`.
