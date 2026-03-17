# PlatformIO MCP Server Setup Guide

This guide is for agents or operators configuring the repository for local MCP use.

## 1. Verify Requirements

```bash
node --version
npm --version
pio --version
```

Required:

- Node.js 18+
- npm
- PlatformIO Core CLI

If PlatformIO is installed outside PATH, note the absolute executable path and provide it through `PLATFORMIO_CLI_PATH`.

## 2. Install Dependencies

```bash
npm install
```

This installs runtime dependencies, development tools, and writes `package-lock.json`.

## 3. Build and Verify

```bash
npm run build
npm test
npm run test:integration
npm run lint
```

Expected:

- TypeScript build succeeds
- Vitest test suite passes
- PlatformIO CLI integration tests pass when PlatformIO is installed
- ESLint passes

## 4. Start the Server

```bash
node build/index.js
```

Expected startup:

- With PlatformIO installed: server starts normally
- Without PlatformIO installed: server starts with a warning, and `doctor` reports the missing CLI

## 5. Example MCP Configuration

```json
{
  "mcpServers": {
    "platformio": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/build/index.js"],
      "env": {}
    }
  }
}
```

With explicit PlatformIO path:

```json
{
  "mcpServers": {
    "platformio": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/build/index.js"],
      "env": {
        "PLATFORMIO_CLI_PATH": "<absolute-path-to-pio-or-platformio>"
      }
    }
  }
}
```

## 6. Recommended First Tool Call

Call `doctor` first. It reports:

- Node version
- PlatformIO availability and version
- Optional project inspection
- Connected serial device visibility

## 7. Notes for Agent Use

- `inspect_project` and `list_environments` parse `platformio.ini` directly.
- `build_project`, `upload_firmware`, and monitor capture depend on PlatformIO CLI availability.
- `start_monitor` supports bounded capture with `captureDurationMs` and `maxLines`.
- Tool responses are structured JSON, not raw CLI text blobs.
