# Concerns

**Analysis Date:** 2026-03-17

## Primary Concerns

### 1. Safe Hardware Closure Is Still Blocked
- The project has real monitor/profile validation on a live device
- But real upload closure is not complete because no safe disposable board is currently available

### 2. Live Device Safety
- The connected ESP32 agricultural node is not a disposable test target
- Any future upload work must avoid overwriting live firmware without explicit approval

### 3. Windows Serial Reliability
- COM ports can appear healthy at the OS level yet still fail to configure
- Port contention and transient driver/device state remain real-world operational risks

### 4. Remaining Result-Model Drift
- Core tools are mostly aligned on `data.meta`
- But the project must resist expanding the abstraction too aggressively beyond current use

## Technical Debt / Fragility

- `src/tools/monitor.ts` is becoming a dense module because it now combines capture, parsing, verification, and shaping
- Future cleanup may be needed, but not before current execution-layer priorities are stable

## Scope Discipline Risk

- The project has a strong tendency to drift into:
  - workflow orchestration
  - session systems
  - future UI architecture
- This must remain constrained until the current execution layer is unquestionably stable in real use

## Current Recommended Focus

- Finish GSD brownfield initialization
- Keep the project anchored on real current-device and current-project usability
- Delay future-layer ambitions until hardware closure is practical

---
*Concerns analysis: 2026-03-17*
