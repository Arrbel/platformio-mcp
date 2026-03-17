# Roadmap: PlatformIO MCP Server

**Created:** 2026-03-17

## Overview

This roadmap reflects the current brownfield state of the project. Phase A1 is largely complete in code and validation, while Phase A2 remains blocked by the lack of a safe, disposable flash target.

## Phases

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Phase A1 | Stabilize the MCP execution layer for current real project and monitor workflows | ANLY-01, ANLY-02, ANLY-03, DEVC-01, DEVC-02, DEVC-03, EXEC-01, EXEC-02, EXEC-03, MONI-01, MONI-02, MONI-03, MONI-04, MONI-05, RSLT-01, RSLT-02, RSLT-03 | 5 |
| 2 | Phase A2 | Complete safe real-board upload closure | HWCL-01, HWCL-02 | 4 |
| 3 | Result Stabilization | Finish aligning all user-facing MCP tool outputs on the shared execution metadata model | RSLT-01 | 3 |

## Phase Details

### Phase 1: Phase A1

**Goal:** Make the MCP execution layer genuinely usable for the current real project and current real device monitoring workflow.

**Requirements:** ANLY-01, ANLY-02, ANLY-03, DEVC-01, DEVC-02, DEVC-03, EXEC-01, EXEC-02, EXEC-03, MONI-01, MONI-02, MONI-03, MONI-04, MONI-05, RSLT-01, RSLT-02, RSLT-03

**Success criteria:**
1. Project inspection, environment listing, and doctor outputs work on real PlatformIO projects.
2. Device listing distinguishes Bluetooth serial devices from likely uploadable USB serial devices.
3. Monitor capture and verification work on the current real ESP32 agricultural node.
4. Runtime verification can express healthy / degraded / failed / indeterminate.
5. Core execution outputs expose meaningful resolved environment/port metadata and retry guidance.

**Status:** Mostly complete

### Phase 2: Phase A2

**Goal:** Complete a true safe-board `build -> upload -> monitor -> verify` loop on hardware that can be safely flashed.

**Requirements:** HWCL-01, HWCL-02

**Success criteria:**
1. A disposable or explicitly approved board is identified.
2. Firmware upload succeeds on that board through the MCP.
3. Post-flash monitor verification succeeds on that board using the current profile model.
4. The full closure is documented with real evidence.

**Status:** Blocked by hardware availability

### Phase 3: Result Stabilization

**Goal:** Ensure the shared execution metadata model is consistently applied across all frequently used MCP tools.

**Requirements:** RSLT-01

**Success criteria:**
1. All commonly used tools expose `data.meta`.
2. High-level consumers can rely on `operationType`, `executionStatus`, `verificationStatus`, `failureCategory`, and `retryHint`.
3. Remaining tool-specific fields continue to work without regression.

**Status:** In progress

## Current Priority

**Current highest-value focus:** Finish Phase A1 result stabilization without drifting into future-layer work.

**Blocked item:** Safe real-board upload closure (Phase A2).

## Notes

- Phase A2 should not start on the user's live agricultural node unless explicitly approved.
- Future Workflow Layer or UI work must not begin until the current execution layer remains stable in real use.

---
*Roadmap created: 2026-03-17*
*Last updated: 2026-03-17 after GSD project initialization*
