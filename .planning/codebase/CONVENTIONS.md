# Conventions

**Analysis Date:** 2026-03-17

## Code Style

- TypeScript with `strict` mode
- `zod` used for input and output validation
- Prettier formatting enforced
- ESLint applied to `src/**/*.ts` and `tests/**/*.ts`

## Response Conventions

- MCP responses use a stable outer shape:
  - `status`
  - `summary`
  - `data`
  - `warnings`
  - `nextActions`
- Execution-oriented tools are converging on `data.meta` for shared execution semantics

## Naming Patterns

- MCP tool names use snake_case
- Shared semantic fields use descriptive names rather than short aliases
- Failure categories and retry hints are concise and machine-consumable

## Error Handling Conventions

- Tool code prefers structured failure categories over opaque exception text
- Raw output is preserved when it helps debugging
- Validation errors should fail fast at the boundary

## Architectural Conventions

- Avoid overdesigning future layers before the current execution layer is stable
- Keep device-specific knowledge in profiles or docs, not hardcoded into generic monitor logic
- Favor minimal brownfield-safe changes over large refactors

## Git / Workflow Conventions

- Conventional commits are used
- Planning and verification artifacts are intended to be tracked in git

---
*Conventions analysis: 2026-03-17*
