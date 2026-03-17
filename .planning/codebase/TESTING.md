# Testing

**Analysis Date:** 2026-03-17

## Test Framework

- Vitest is the test runner
- Coverage uses V8 through `@vitest/coverage-v8`

## Current Test Strategy

### Compatibility / Parsing
- PlatformIO 6.1.19 JSON shape compatibility
- Board and library output normalization

### Execution Semantics
- Upload result classification
- Monitor verification semantics
- Device classification
- Shared execution metadata on MCP outputs

### Real CLI / Safe Integration
- Real PlatformIO CLI invocation against temporary projects
- Real monitor/profile validation on the current live agricultural node without flashing

## What Is Explicitly Not Claimed Yet

- Safe-board upload closure is not yet complete
- A2 hardware write path is still blocked by lack of a disposable board

## Testing Conventions

- Keep tests focused and behavior-oriented
- Use real CLI integration when it is safe and does not require destructive hardware actions
- Avoid overbuilding fake abstractions if a temporary project or current real hardware can validate the behavior safely

## Useful Commands

- `npm run build`
- `npm test`
- `npm run test:coverage`
- `npm run lint`
- `npm run format:check`

---
*Testing analysis: 2026-03-17*
