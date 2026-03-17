# Architecture

**Analysis Date:** 2026-03-17

## Pattern Overview

**Overall:** MCP execution layer over PlatformIO CLI

**Key Characteristics:**
- Single stdio MCP server
- Tool-centric architecture
- PlatformIO CLI as the execution backend
- Execution metadata and structured result semantics layered over raw CLI behavior

## Layers

**MCP Entry Layer:**
- Purpose: register MCP tools and route requests
- Contains: `src/index.ts`, `src/tools/registry.ts`
- Depends on: tool modules and shared types
- Used by: MCP-compatible agent runtimes

**Tool Logic Layer:**
- Purpose: implement project, board, device, build, upload, monitor, and library workflows
- Contains: `src/tools/*.ts`
- Depends on: CLI adapter, validation, shared types
- Used by: registry and MCP handlers

**CLI Adapter Layer:**
- Purpose: execute PlatformIO commands and capture/normalize output
- Contains: `src/platformio.ts`
- Depends on: Node child process APIs
- Used by: tool modules

**Shared Types / Validation Layer:**
- Purpose: define response models, input schemas, and validation rules
- Contains: `src/types.ts`, `src/utils/validation.ts`, `src/utils/errors.ts`
- Used by: all layers

## Data Flow

**MCP Request Flow:**
1. MCP client calls a registered tool
2. `src/index.ts` delegates to `src/tools/registry.ts`
3. registry validates tool input via `zod`
4. selected tool module runs
5. tool calls PlatformIO adapter or local parsing logic
6. registry wraps result into the standard MCP response envelope

**Monitor Verification Flow:**
1. client calls `start_monitor`
2. monitor tool captures serial output via PlatformIO monitor
3. monitor tool parses text and JSON messages
4. verification profile is applied
5. result returns execution status + verification status + signals

## Key Abstractions

**ExecutionResultMeta:**
- Purpose: shared cross-tool execution metadata
- Examples: `operationType`, `executionStatus`, `verificationStatus`
- Pattern: common meta object inside `data`

**Tool Registry:**
- Purpose: central declaration of MCP tools
- Location: `src/tools/registry.ts`
- Pattern: declarative registry with handler functions

**Verification Profile:**
- Purpose: generic runtime-output validation rules for monitor capture
- Location: `src/types.ts` + `src/tools/monitor.ts`
- Pattern: configurable input profile rather than device-specific hardcoding

## Entry Points

**Server Entry:**
- Location: `src/index.ts`
- Trigger: `node build/index.js`
- Responsibilities: connect stdio transport, register tools, serialize responses

## Error Handling

**Strategy:** normalize CLI and validation failures into structured MCP-friendly errors

**Patterns:**
- tool-level typed errors
- extracted failure categories
- retry hints for actionable failures

## Cross-Cutting Concerns

**Validation:**
- `zod` schemas at MCP boundaries and for parsed output

**Result Semantics:**
- execution metadata is progressively being standardized across major tools

**Real Hardware Safety:**
- project intentionally avoids assuming safe write access to connected live devices

---
*Architecture analysis: 2026-03-17*
