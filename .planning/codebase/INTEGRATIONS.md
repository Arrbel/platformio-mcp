# Integrations

**Analysis Date:** 2026-03-17

## External Tools

### PlatformIO CLI
- Used for:
  - board discovery
  - library search / install / list
  - project build / clean / upload
  - serial device listing
  - serial monitor capture
- Integration point: `src/platformio.ts`
- Configuration:
  - `pio`
  - `platformio`
  - or `PLATFORMIO_CLI_PATH`

### System Serial Stack
- Real device access depends on OS serial drivers
- On Windows this includes CH34x / Bluetooth serial / other USB serial adapters
- Integration point:
  - PlatformIO device commands
  - direct serial process usage through PlatformIO monitor

## Agent Runtime Integration

### MCP Clients
- The project is designed to be consumed by MCP-aware agents
- Current MCP entry point: `src/index.ts`

### Local Codex + GSD
- GSD is installed locally into `./.codex/`
- Current project now supports GSD-based brownfield planning and execution discipline

## Git / CI

### Git
- The repo uses conventional commits
- Current branch-based development is expected for feature work

### GitHub Actions
- CI workflow exists in `.github/workflows/ci.yml`
- Verifies build, tests, lint, format, and basic startup

## Known Integration Constraints

- Real upload closure requires safe hardware; current real agricultural node should not be overwritten implicitly
- Serial access can fail because of port contention or device/driver state even when the OS reports the device as present

---
*Integrations analysis: 2026-03-17*
