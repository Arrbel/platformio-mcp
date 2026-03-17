# State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-17)

**Core value:** An AI agent can reliably understand the current embedded project and connected device state, then act through MCP with structured, trustworthy execution results.
**Current focus:** Milestone v1.1 — Technical Debt Resolution (Phase 4)

## Current Position

Phase: 4 — Monitor Interface Refactor + CI Tests
Plan: —
Status: Not started
Last activity: 2026-03-17 — v1.1 roadmap created, phases 4-6 defined

```
Progress: [Phase 4 ░░░░░░░░░░] [Phase 5 ░░░░░░░░░░] [Phase 6 ░░░░░░░░░░]
```

## Recent Verified Outcomes

- Real PlatformIO smoke tests for non-hardware-dependent MCP tools succeeded.
- The current ESP32 agricultural node on `COM9` has been monitored successfully at `115200`.
- The monitor verification profile can classify the current node as `degraded` with valid health and degraded signals.
- Core MCP tool outputs now expose a shared execution metadata model for the main execution path.
- Phase A1 requirements 16/17 complete, RSLT-01 still in progress.
- Phase A2 remains blocked by hardware availability.

## Accumulated Context

- `startMonitor` has 17 positional parameters — confirmed maintainability risk, highest priority refactor target.
- `registry.ts` at 700+ lines mixes tool definitions, schema mapping, business calls, response wrapping — confirmed architectural debt.
- Monitor verification engine hardcodes `air_temp`, `air_humidity`, `soil_moisture`, `device_id` — conflicts with board-agnostic positioning.
- No stable real PlatformIO CLI integration tests in CI — limits delivery confidence for a CLI execution bridge.
- `uploadAndMonitor` and `uploadFirmware` share ~80% identical code — `uploadAndMonitor` not in public registry yet.
- `types.ts` at 639 lines with all domains in one file — manageable now but will compound in Phase B.
- `index.ts` hardcodes version `1.1.0` separately from `package.json`.

## Key Decisions

- INTF-04 backward compatibility verification is deferred to Phase 5 (after all interface refactors complete).
- TEST-02 (no regressions) is a gate enforced at Phase 4 and re-checked at each subsequent phase.
- Phase ordering: 4 (monitor + tests) → 5 (registry + compat) → 6 (types + upload dedup + version).
- Phase 6 is safe to do last — CORG items are independent of interface correctness.

## Active Concerns

- A2 cannot proceed safely without a disposable or explicitly approved board.
- The project must avoid drifting into Workflow Layer or UI design while the execution layer is still stabilizing.
- All refactoring in phases 4-6 must preserve existing MCP tool input schemas exactly.

---
*State updated: 2026-03-17 — v1.1 roadmap created*
