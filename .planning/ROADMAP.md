# Roadmap: PlatformIO MCP Server

**Created:** 2026-03-17

## Overview

This roadmap reflects the current brownfield state of the project. Phase A1 is largely complete in code and validation, while Phase A2 remains blocked by the lack of a safe, disposable flash target. Phases 4-6 cover milestone v1.1 Technical Debt Resolution.

## Phases

- [x] **Phase 1: Phase A1** - Stabilize the MCP execution layer for current real project and monitor workflows
- [ ] **Phase 2: Phase A2** - Complete safe real-board upload closure (blocked by hardware)
- [x] **Phase 3: Result Stabilization** - Finish aligning all user-facing MCP tool outputs on the shared execution metadata model
- [x] **Phase 4: Monitor Interface Refactor + CI Tests** - Refactor startMonitor signature, extract monitor profiles, and establish CI integration test layer
- [x] **Phase 5: Registry Split + Compatibility Verification** - Split registry into per-tool modules and verify all interfaces remain backward compatible
- [x] **Phase 6: Code Organization Cleanup** - Split types by domain, deduplicate upload logic, and derive version from package.json

## Phase Details

### Phase 1: Phase A1

**Goal:** Make the MCP execution layer genuinely usable for the current real project and current real device monitoring workflow.
**Depends on:** Nothing
**Requirements:** ANLY-01, ANLY-02, ANLY-03, DEVC-01, DEVC-02, DEVC-03, EXEC-01, EXEC-02, EXEC-03, MONI-01, MONI-02, MONI-03, MONI-04, MONI-05, RSLT-01, RSLT-02, RSLT-03
**Success Criteria** (what must be TRUE):
  1. Project inspection, environment listing, and doctor outputs work on real PlatformIO projects.
  2. Device listing distinguishes Bluetooth serial devices from likely uploadable USB serial devices.
  3. Monitor capture and verification work on the current real ESP32 agricultural node.
  4. Runtime verification can express healthy / degraded / failed / indeterminate.
  5. Core execution outputs expose meaningful resolved environment/port metadata and retry guidance.
**Plans:** Complete
**Status:** Mostly complete

### Phase 2: Phase A2

**Goal:** Complete a true safe-board `build -> upload -> monitor -> verify` loop on hardware that can be safely flashed.
**Depends on:** Phase 1
**Requirements:** HWCL-01, HWCL-02
**Success Criteria** (what must be TRUE):
  1. A disposable or explicitly approved board is identified.
  2. Firmware upload succeeds on that board through the MCP.
  3. Post-flash monitor verification succeeds on that board using the current profile model.
  4. The full closure is documented with real evidence.
**Plans:** TBD
**Status:** Blocked by hardware availability

### Phase 3: Result Stabilization

**Goal:** Ensure the shared execution metadata model is consistently applied across all frequently used MCP tools.
**Depends on:** Phase 1
**Requirements:** RSLT-01
**Success Criteria** (what must be TRUE):
  1. All commonly used tools expose `data.meta`.
  2. High-level consumers can rely on `operationType`, `executionStatus`, `verificationStatus`, `failureCategory`, and `retryHint`.
  3. Remaining tool-specific fields continue to work without regression.
**Plans:** TBD
**Status:** Complete

### Phase 4: Monitor Interface Refactor + CI Tests

**Goal:** Users of the MCP can call `startMonitor` through a clean typed options object, monitor verification is fully profile-driven with no hardcoded domain fields, and CI runs real PlatformIO CLI integration tests without hardware.
**Depends on:** Phase 3
**Requirements:** INTF-01, INTF-02, TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. `startMonitor` accepts a single options object; no positional parameter list exists in the implementation.
  2. Monitor verification engine contains no hardcoded field names like `air_temp`, `air_humidity`, `soil_moisture`, or `device_id`; all checks are driven by the caller-supplied profile.
  3. CI runs PlatformIO CLI integration tests (version check, board listing, temp project init+build) and they pass without connected hardware.
  4. All existing unit tests continue to pass with no regressions after the refactor.
  5. New integration tests appear in the GitHub Actions CI matrix alongside the existing test suite.
**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md — Refactor startMonitor to single options object, update registry call site
- [x] 04-02-PLAN.md — Remove hardcoded domain field names from evaluateMonitorVerification
- [x] 04-03-PLAN.md — Add PlatformIO CLI integration tests and CI integration job

### Phase 5: Registry Split + Compatibility Verification

**Goal:** Each MCP tool definition lives in its own module, `registry.ts` is a pure aggregator, and a compatibility verification pass confirms no MCP tool input schema has changed.
**Depends on:** Phase 4
**Requirements:** INTF-03, INTF-04
**Success Criteria** (what must be TRUE):
  1. Each MCP tool has its own definition file; `registry.ts` contains only imports and re-exports.
  2. All existing MCP tool input schemas are byte-for-byte identical to pre-refactor schemas (verified by test or diff).
  3. An MCP client calling any tool with a previously valid input receives the same response structure as before.
**Plans:** 3 plans

Plans:
- [x] 05-01-PLAN.md — Extract shared registry helpers and first-batch read-oriented definitions
- [x] 05-02-PLAN.md — Extract remaining execution and library tool definitions
- [x] 05-03-PLAN.md — Add explicit registry compatibility verification tests

### Phase 6: Code Organization Cleanup

**Goal:** Type definitions are organized by domain, upload logic has no significant duplication, and server version is derived from `package.json`.
**Depends on:** Phase 5
**Requirements:** CORG-01, CORG-02, CORG-03
**Success Criteria** (what must be TRUE):
  1. `types.ts` no longer exists as a monolith; domain-specific files (board, device, build, upload, monitor, library, common) exist with a barrel re-export.
  2. `uploadFirmware` and `uploadAndMonitor` share a common execution helper; duplicated validation, resolution, and classification logic is removed.
  3. The version reported in the MCP handshake matches `package.json` version at runtime; no hardcoded version string exists in `index.ts`.
**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md — Split types into domain modules behind a barrel export
- [x] 06-02-PLAN.md — Deduplicate upload execution logic behind a shared helper
- [x] 06-03-PLAN.md — Derive runtime version from package metadata and add consistency test

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Phase A1 | —/— | Complete | 2026-03-17 |
| 2. Phase A2 | 0/— | Blocked | - |
| 3. Result Stabilization | 0/— | Complete | 2026-03-17 |
| 4. Monitor Interface Refactor + CI Tests | 3/3 | Complete | 2026-03-17 |
| 5. Registry Split + Compatibility Verification | 3/3 | Complete | 2026-03-17 |
| 6. Code Organization Cleanup | 3/3 | Complete | 2026-03-17 |

## Notes

- Phase A2 should not start on the user's live agricultural node unless explicitly approved.
- INTF-04 (backward compatibility) is verified as part of Phase 5 after INTF-01, INTF-02, and INTF-03 are all complete.
- TEST-02 (no regressions) is a gate condition enforced at Phase 4 and re-verified at each subsequent phase.
- Future Workflow Layer or UI work must not begin until the current execution layer remains stable in real use.

---
*Roadmap created: 2026-03-17*
*Last updated: 2026-03-17 — phase 6 completed, milestone v1.1 complete*
