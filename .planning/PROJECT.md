# PlatformIO MCP Server

## What This Is

`platformio-mcp` is a Model Context Protocol execution layer for PlatformIO-based embedded development. It is being shaped to help AI agents analyze projects, understand configuration, compile firmware, monitor device output, and eventually support safe upload-and-verify workflows with minimal hardware friction for the user.

The current product focus is not generic platform orchestration or UI tooling. It is making the MCP execution layer truly usable for the user's real devices, real PlatformIO projects, and real debugging workflow on Windows.

## Core Value

An AI agent can reliably understand the current embedded project and its connected device state, then produce actionable, structured execution results without requiring the user to manually manage most hardware and PlatformIO details.

## Requirements

### Validated

- ✓ The MCP server can expose structured tool responses with `status`, `summary`, `data`, `warnings`, and `nextActions`.
- ✓ The MCP layer can inspect `platformio.ini` and list environments from real PlatformIO projects.
- ✓ The server can build real PlatformIO projects using the local PlatformIO CLI.
- ✓ The server can detect connected serial devices and classify common serial adapter scenarios such as Bluetooth serial vs USB serial adapters.
- ✓ The server can capture and verify real device serial output with a configurable monitor verification profile.

### Active

- [ ] A real `build -> upload -> monitor -> verify` closure can be completed on a safe-to-flash development board.
- [ ] Tool results are consistently expressed through a shared execution metadata model across all core MCP tools.
- [ ] Current real-world device and project workflows on Windows can be diagnosed with minimal ambiguity.
- [ ] The MCP layer can remain device-agnostic while supporting project-specific runtime verification profiles.
- [ ] The `startMonitor` interface uses a structured options object instead of positional parameters.
- [ ] Monitor verification logic is free of hardcoded domain-specific fields; all business rules live in configurable profiles.
- [ ] The tool registry is split into per-tool definition modules instead of a single monolithic file.
- [ ] Real PlatformIO CLI integration tests can run in CI without hardware.
- [ ] Type definitions are organized by domain rather than in a single large file.
- [ ] Upload module has no significant code duplication between upload variants.
- [ ] Server version is derived from package.json, not hardcoded.

### Out of Scope

- Workflow Layer orchestration and autonomous retry loops — deferred until the execution layer is stable on real hardware.
- Heavy VS Code UI and status panel implementation — deferred until execution results and state interfaces settle.
- JTAG / OpenOCD / complex debugger-first flows — not the current primary path for this project.

## Context

- Current stack is TypeScript + Node.js + MCP SDK + PlatformIO CLI.
- The project already supports project inspection, board and library discovery, build, upload, monitor, and doctor workflows.
- The main real device currently observed is an ESP32-based agricultural sensor node connected through a CH343 USB serial adapter on Windows.
- The user does not want to deeply manage hardware details; the MCP should absorb complexity and return structured, actionable results.
- Non-hardware smoke tests are already in good shape. The main remaining hard gap is safe real upload validation on a spare board.

## Constraints

- **Platform**: Windows-first behavior must work reliably — the user's primary environment is Windows with PowerShell and VS Code.
- **Hardware Safety**: Do not overwrite production-like device firmware without explicit confirmation — some connected boards are live devices, not disposable test hardware.
- **Project Scope**: Keep focus on the current MCP execution layer — avoid drifting into workflow orchestration or UI platform work too early.
- **Verification Integrity**: No claimed success without real evidence — especially for hardware-related actions.

## Current Milestone: v1.1 Technical Debt Resolution

**Goal:** Resolve confirmed architectural debt and testing gaps before the project evolves into Workflow Layer work.

**Target features:**
- Refactor `startMonitor` from 17 positional parameters to a single options object
- Extract hardcoded agricultural sensor fields from monitor verification into configurable profiles
- Establish a real PlatformIO CLI integration test layer that runs in CI without hardware
- Split `registry.ts` into per-tool definition modules
- Split `types.ts` by domain (board, device, build, monitor, library)
- Consolidate duplicate code in upload module
- Derive server version from package.json instead of hardcoding

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the current focus on the MCP execution layer | Real device and project flows still need closure and stabilization | ✓ Good |
| Treat real hardware samples as verification profiles, not hardcoded device logic | Preserve generality while still using real evidence | ✓ Good |
| Prefer minimal result-model unification over large architectural rewrites | Avoid overdesign while improving agent usability | ✓ Good |
| Delay real upload closure until a safe flashable board is available | Protect the user's live agricultural node | ✓ Good |
| Resolve technical debt before Workflow Layer work | Accumulated architectural debt in registry, monitor, and types will compound if not addressed now | — Pending |
| Prioritize startMonitor and monitor profile over registry split | Monitor interface is the most active change surface and directly affects board-agnostic positioning | — Pending |

---
*Last updated: 2026-03-17 after milestone v1.1 started*
