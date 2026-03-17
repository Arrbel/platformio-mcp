# Structure

**Analysis Date:** 2026-03-17

## Top-Level Layout

- `src/` — main TypeScript source
- `tests/` — Vitest tests
- `build/` — compiled output
- `docs/` — project planning and verification docs
- `.codex/` — local Codex + GSD installation
- `.github/` — CI workflow

## Key Source Areas

### `src/index.ts`
- MCP server entry point

### `src/platformio.ts`
- PlatformIO CLI execution and monitor capture adapter

### `src/tools/`
- `boards.ts` — board discovery
- `build.ts` — build and clean
- `devices.ts` — serial device detection and classification
- `doctor.ts` — readiness diagnostics
- `libraries.ts` — library search/install/list
- `monitor.ts` — serial capture and verification
- `projects.ts` — project inspection and environment parsing
- `registry.ts` — MCP tool declarations and response shaping
- `upload.ts` — upload behavior and upload result classification

### `src/utils/`
- `errors.ts`
- `validation.ts`

## Test Layout

- `tests/platformio-compatibility.test.ts` — PlatformIO 6.1.19 compatibility
- `tests/phase-a-real-cli.test.ts` — real CLI integration tests without dangerous hardware writes
- `tests/phase-a-semantics.test.ts` — verification semantics and device classification
- `tests/execution-meta.test.ts` — shared execution metadata on MCP responses
- `tests/registry.test.ts` — registry behavior

## Planning / Project Context

- `docs/platformio-mcp-building-principles.md`
- `docs/platformio-mcp-next-stage-implementation-plan.md`
- `docs/hardware-validation.md`
- `docs/phase-a-verification-checklist.md`
- `docs/esp32-agri-node-validation-profile.md`
- `docs/phase-a-a1-closure-report.md`

## Naming Conventions

- tool names use MCP-friendly snake_case (`build_project`)
- source modules use feature-based filenames
- docs use explicit topic names rather than generic notes

---
*Structure analysis: 2026-03-17*
