# Requirements: PlatformIO MCP Server

**Defined:** 2026-03-17
**Core Value:** An AI agent can reliably understand the current embedded project and connected device state, then act through MCP with structured, trustworthy execution results.

## v1 Requirements

### Project Analysis

- [ ] **ANLY-01**: User can inspect a PlatformIO project and receive parsed environments, defaults, and key configuration metadata.
- [ ] **ANLY-02**: User can list project environments separately from full project inspection.
- [ ] **ANLY-03**: User can run `doctor` and receive clear readiness information for build, upload, and monitor.

### Device Visibility

- [ ] **DEVC-01**: User can list currently connected serial devices.
- [ ] **DEVC-02**: User can distinguish likely uploadable USB serial devices from Bluetooth serial devices.
- [ ] **DEVC-03**: User can see why a device was classified a certain way.

### Build and Upload

- [ ] **EXEC-01**: User can build a real PlatformIO project with the correct resolved environment.
- [ ] **EXEC-02**: User can clean a real PlatformIO project.
- [ ] **EXEC-03**: User can attempt firmware upload and receive a categorized result with retry guidance.

### Runtime Verification

- [ ] **MONI-01**: User can capture serial output from a connected device through MCP.
- [ ] **MONI-02**: User can verify expected text output in captured serial logs.
- [ ] **MONI-03**: User can verify expected JSON fields, values, and message counts in captured serial output.
- [ ] **MONI-04**: User can evaluate whether runtime output is healthy, degraded, failed, or indeterminate.
- [ ] **MONI-05**: User can detect port-open failures separately from business-level verification failures.

### Result Semantics

- [ ] **RSLT-01**: Core MCP tools return a consistent execution metadata model.
- [ ] **RSLT-02**: Tool responses expose resolved environment/port/baud values when applicable.
- [ ] **RSLT-03**: Tool responses expose failure categories and retry hints when applicable.

## v2 Requirements

### Real Hardware Closure

- **HWCL-01**: User can complete `doctor -> inspect -> build -> upload -> monitor -> verify` on a safe test board.
- **HWCL-02**: Upload outcomes can be validated against post-flash runtime output using the same monitor verification model.

### Workflow Support

- **WFLO-01**: Agent can reuse execution metadata to support controlled retry and failure diagnosis flows.
- **WFLO-02**: Agent can maintain lightweight execution history for repeated debugging sessions.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Workflow Layer orchestration | Deferred until execution layer is stable on real hardware |
| Heavy VS Code UI implementation | Requires stable state contracts first |
| JTAG / OpenOCD debugger-first support | Not the current highest-value path |
| General-purpose autonomous code-fixing workflows | Too early without stronger hardware closure evidence |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANLY-01 | Phase A1 | Complete |
| ANLY-02 | Phase A1 | Complete |
| ANLY-03 | Phase A1 | Complete |
| DEVC-01 | Phase A1 | Complete |
| DEVC-02 | Phase A1 | Complete |
| DEVC-03 | Phase A1 | Complete |
| EXEC-01 | Phase A1 | Complete |
| EXEC-02 | Phase A1 | Complete |
| EXEC-03 | Phase A1 | Complete |
| MONI-01 | Phase A1 | Complete |
| MONI-02 | Phase A1 | Complete |
| MONI-03 | Phase A1 | Complete |
| MONI-04 | Phase A1 | Complete |
| MONI-05 | Phase A1 | Complete |
| RSLT-01 | Phase A1 | In Progress |
| RSLT-02 | Phase A1 | Complete |
| RSLT-03 | Phase A1 | Complete |
| HWCL-01 | Phase A2 | Pending |
| HWCL-02 | Phase A2 | Pending |
| WFLO-01 | Future | Pending |
| WFLO-02 | Future | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after GSD project initialization*
