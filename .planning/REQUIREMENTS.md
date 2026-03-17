# Requirements: PlatformIO MCP Server — v1.1

**Defined:** 2026-03-17
**Core Value:** An AI agent can reliably understand the current embedded project and connected device state, then act through MCP with structured, trustworthy execution results.

## v1.1 Requirements

### Interface & Architecture

- [ ] **INTF-01**: `startMonitor` accepts a single typed options object instead of 17 positional parameters, with no breaking change to MCP tool callers
- [ ] **INTF-02**: Monitor verification engine contains no hardcoded domain-specific field names; all business-level checks (sensor fields, device identity) are driven by the caller's verification profile
- [ ] **INTF-03**: Each MCP tool definition lives in its own module file; `registry.ts` only aggregates and exports them
- [ ] **INTF-04**: All refactored interfaces maintain backward compatibility with existing MCP tool input schemas

### Code Organization

- [ ] **CORG-01**: Type definitions are split into domain-specific files (board, device, build, upload, monitor, library, common) with a barrel re-export
- [ ] **CORG-02**: `uploadFirmware` and `uploadAndMonitor` share a common execution helper with no duplicated validation/resolution/classification logic
- [ ] **CORG-03**: Server version in MCP handshake is read from `package.json` at build or startup time, not hardcoded

### Testing Infrastructure

- [ ] **TEST-01**: CI runs real PlatformIO CLI integration tests (version check, board listing, temp project init+build) without requiring hardware
- [ ] **TEST-02**: Existing unit tests continue to pass after all refactoring with no regressions
- [ ] **TEST-03**: New integration tests are included in the GitHub Actions CI matrix alongside existing test suite

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
| New MCP tool additions | This milestone is purely structural improvement |
| Structured logging system | Not urgent for local CLI process; defer to Workflow Layer |
| MCP SDK version upgrade | No confirmed compatibility issue; observe only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INTF-01 | — | Pending |
| INTF-02 | — | Pending |
| INTF-03 | — | Pending |
| INTF-04 | — | Pending |
| CORG-01 | — | Pending |
| CORG-02 | — | Pending |
| CORG-03 | — | Pending |
| TEST-01 | — | Pending |
| TEST-02 | — | Pending |
| TEST-03 | — | Pending |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 10

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after milestone v1.1 definition*
