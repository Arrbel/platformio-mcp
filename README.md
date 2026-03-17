# PlatformIO MCP Server

PlatformIO MCP Server exposes PlatformIO Core workflows as MCP tools for embedded development. It targets board-agnostic flows such as board discovery, project inspection, build, upload, serial monitoring, and library management.

## Current Scope

- Works over stdio with the Model Context Protocol SDK
- Uses PlatformIO CLI as the execution backend
- Returns structured tool responses with `status`, `summary`, `data`, `warnings`, and `nextActions`
- Parses `platformio.ini` to inspect environments and default configuration
- Supports bounded serial output capture for agent workflows

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

## Prerequisites

- Node.js 18+
- PlatformIO Core CLI installed and available as `pio`, `platformio`, or via `PLATFORMIO_CLI_PATH`

Example installation:

```bash
pip install platformio
pio --version
```

## Local Development

```bash
npm install
npm run build
npm test
npm run test:integration
npm run lint
```

Run the server locally:

```bash
node build/index.js
```

If PlatformIO CLI is missing, the server still starts, but execution tools return warnings or errors until the CLI is available.

## MCP Configuration

Example configuration:

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

If PlatformIO is not in PATH, pass the binary explicitly:

```json
{
  "mcpServers": {
    "platformio": {
      "command": "node",
      "args": ["E:/program/platformio-mcp/build/index.js"],
      "env": {
        "PLATFORMIO_CLI_PATH": "C:/Users/you/AppData/Local/Programs/Python/Python311/Scripts/pio.exe"
      }
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

## Notes

- `inspect_project` and `list_environments` work by parsing `platformio.ini`; they do not require PlatformIO CLI.
- `upload_firmware` and `start_monitor` can inherit `upload_port`, `monitor_port`, and `monitor_speed` from the selected or default environment when those values are defined in `platformio.ini`.
- `start_monitor` stays backward compatible: without capture options it returns an executable command; with bounded capture options it returns collected serial lines.

## Verification

The repository uses:

- `npm run build`
- `npm test`
- `npm run test:integration`
- `npm run lint`
- `npm run format:check`

CI runs the same checks on pull requests, plus a dedicated PlatformIO CLI integration job.

## License

MIT. See [LICENSE](LICENSE).
