# Technology Stack

**Analysis Date:** 2026-03-17

## Languages

**Primary:**
- TypeScript 5.x - all MCP server and tool implementation in `src/`

**Secondary:**
- JavaScript - configuration and generated build output
- Markdown - project docs and planning materials

## Runtime

**Environment:**
- Node.js 18+ required, currently used with Node 22 in local validation
- PlatformIO Core CLI required for build, board, device, library, upload, and monitor workflows

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- `@modelcontextprotocol/sdk` - MCP server transport and protocol handling
- `zod` - runtime schema validation and parsing

**Testing:**
- `vitest` - unit and focused integration tests
- `@vitest/coverage-v8` - coverage reporting

**Build/Dev:**
- `typescript` - compile source to `build/`
- `tsx` - run TypeScript directly in development
- `eslint` + `@typescript-eslint/*` - linting
- `prettier` - formatting

## Key Dependencies

**Critical:**
- `@modelcontextprotocol/sdk` - MCP server implementation
- `zod` - schema validation for MCP inputs and CLI output normalization

**Infrastructure:**
- Node.js built-ins (`child_process`, `fs/promises`, `path`, `util`) - command execution and file handling

## Configuration

**Environment:**
- PlatformIO path can be provided through `PLATFORMIO_CLI_PATH`
- Project-specific MCP install now lives in `./.codex/`

**Build:**
- `tsconfig.json`
- `.eslintrc.cjs`
- `.prettierrc.json`

## Platform Requirements

**Development:**
- Windows is the currently validated primary environment
- Real serial workflows depend on a reachable serial device and the PlatformIO CLI

**Production / Distribution:**
- Intended to run as a local MCP server invoked by a coding agent
- Not currently packaged as a standalone GUI application

---
*Stack analysis: 2026-03-17*
