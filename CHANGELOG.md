# Changelog

All notable implementation progress for `platformio-mcp` should be recorded in this file.

The format is intentionally pragmatic rather than release-automation-oriented:
- capture what was actually implemented
- capture what was actually verified
- distinguish completed work from pending verification
- avoid claiming hardware or CI results that were not directly observed

## [Unreleased]

### Added
- Added official-alignment research and practice docs in [docs/platformio-official-best-practices-for-mcp.md](/E:/program/platformio-mcp/docs/platformio-official-best-practices-for-mcp.md), [docs/platformio-core-cli-official-doc-analysis.md](/E:/program/platformio-mcp/docs/platformio-core-cli-official-doc-analysis.md), and [docs/platformio-cli-local-practice.md](/E:/program/platformio-mcp/docs/platformio-cli-local-practice.md).
- Added project inspection enrichment via `pio project metadata --json-output` in [src/tools/projects.ts](/E:/program/platformio-mcp/src/tools/projects.ts) and [src/platformio.ts](/E:/program/platformio-mcp/src/platformio.ts).
- Added `list_project_targets` MCP tool aligned with `pio run --list-targets` in [src/tools/definitions/list-project-targets.ts](/E:/program/platformio-mcp/src/tools/definitions/list-project-targets.ts).
- Added `generate_compile_commands` MCP tool aligned with `pio run -t compiledb` in [src/tools/definitions/generate-compile-commands.ts](/E:/program/platformio-mcp/src/tools/definitions/generate-compile-commands.ts).
- Added first-stage monitor session MCP tools:
  - [src/tools/definitions/open-monitor-session.ts](/E:/program/platformio-mcp/src/tools/definitions/open-monitor-session.ts)
  - [src/tools/definitions/read-monitor-session.ts](/E:/program/platformio-mcp/src/tools/definitions/read-monitor-session.ts)
  - [src/tools/definitions/write-monitor-session.ts](/E:/program/platformio-mcp/src/tools/definitions/write-monitor-session.ts)
  - [src/tools/definitions/close-monitor-session.ts](/E:/program/platformio-mcp/src/tools/definitions/close-monitor-session.ts)
- Added device parsing coverage for both official `pio device list --json-output` output shapes in [tests/devices.test.ts](/E:/program/platformio-mcp/tests/devices.test.ts).
- Added official `pkg`-oriented library tests in [tests/libraries.test.ts](/E:/program/platformio-mcp/tests/libraries.test.ts).
- Added Wave 2 session and upload semantics coverage in:
  - [tests/monitor-session.test.ts](/E:/program/platformio-mcp/tests/monitor-session.test.ts)
  - [tests/upload-semantics.test.ts](/E:/program/platformio-mcp/tests/upload-semantics.test.ts)
- Added Wave 3 repair-loop coverage in:
  - [tests/doctor-repair-suggestions.test.ts](/E:/program/platformio-mcp/tests/doctor-repair-suggestions.test.ts)
  - [tests/repair-environment.test.ts](/E:/program/platformio-mcp/tests/repair-environment.test.ts)
- Added `repair_environment` MCP tool in [src/tools/definitions/repair-environment.ts](/E:/program/platformio-mcp/src/tools/definitions/repair-environment.ts) and [src/tools/repair.ts](/E:/program/platformio-mcp/src/tools/repair.ts).

### Changed
- `inspect_project` now exposes an explicit project-truth model that distinguishes:
  - static config truth from `platformio.ini`
  - execution-time truth from `pio project metadata --json-output`
- `inspect_project` now stabilizes environment-truth fields:
  - `configSource`
  - `metadataSource`
  - `resolvedEnvironment`
  - `environmentResolution`
  - `resolutionReason`
  - `resolutionWarnings`
- `inspect_project` now reports configuration complexity signals for risky PlatformIO semantics:
  - `extends_present`
  - `extra_configs_present`
  - `sysenv_interpolation_present`
  - `this_interpolation_present`
  - `default_env_override_possible`
- `inspect_project` now exposes lightweight capability discovery through:
  - `projectCapabilities.hasMetadata`
  - `projectCapabilities.hasTargets`
  - `projectCapabilities.canGenerateCompileCommands`
  - `projectCapabilities.hasTestDir`
  - `projectCapabilities.hasTestConfiguration`
  - `projectCapabilities.hasLibraryDependencyOverrides`
  - `projectCapabilities.hasExtraScripts`
  - `projectCapabilities.hasNativeEnvironment`
  - `projectCapabilities.hasCustomTargetsHint`
- `inspect_project` now promotes common test/library/script config into environment summaries:
  - `testIgnore`
  - `testFramework`
  - `testBuildSrc`
  - `libDeps`
  - `libExtraDirs`
  - `libLdfMode`
  - `libCompatMode`
  - `extraScripts`
- `inspect_project` tool guidance is now aligned with environment truth:
  - only resolved projects get direct `build_project` / `list_project_targets` suggestions
  - ambiguous projects now prefer `list_environments` first
- `inspect_project` environment resolution is now stricter:
  - invalid `default_envs` entries no longer produce fake `resolvedEnvironment` values
  - runtime default-environment override risk is surfaced through `resolutionWarnings`
- `inspect_project` now also exposes compact aggregate summaries:
  - `projectSummary` for high-level project truth
  - `riskSummary` for fast environment/configuration risk checks
- `inspect_project` summary wording is now more explicit for real read-only use:
  - projects with zero environments are summarized as `no environments defined`
  - projects without a resolved environment now report `metadata skipped`
  - only projects with a resolved environment but failed metadata lookup report `metadata unavailable`
- `list_project_targets` now returns structured discovery semantics instead of only a flat items array:
  - `resolvedEnvironment`
  - `targetDiscoveryStatus`
  - `targets`
  - `rawOutputExcerpt`
- `generate_compile_commands` now returns structured generation semantics instead of only a success boolean:
  - `resolvedEnvironment`
  - `generationStatus`
  - `compileCommandsPath`
  - `failureCategory`
  - `rawOutputExcerpt`
- `inspect_project` now skips metadata lookup when the project has multiple environments with no reliable default resolution, instead of forcing an ambiguous metadata call.
- `list_project_targets` now uses a longer CLI timeout for real-world official example projects, avoiding false timeouts during read-only capability discovery.
- `inspect_project` now uses a dual-source model:
  - config source from `platformio.ini`
  - execution metadata from `pio project metadata --json-output`
- `inspect_project` now exposes:
  - `defaultEnvironments`
  - `metadataAvailable`
  - `metadata`
  - `targets`
  - `toolchain`
  - `includes`
  - `defines`
  - `programPath`
  - `metadataExtra`
- `inspect_project` now emits explicit warnings for config complexity signals such as:
  - `extends`
  - `extra_configs`
  - `${sysenv.*}`
  - `${this.*}`
- `doctor` in [src/tools/doctor.ts](/E:/program/platformio-mcp/src/tools/doctor.ts) was upgraded from a simple installation check to a layered readiness report with:
  - `cliPath`
  - `shellCallable`
  - `pythonExecutable`
  - `projectReadiness`
  - `deviceReadiness`
  - `monitorReadiness`
  - `remoteReadiness`
- `doctor` now also returns repair-oriented structured fields:
  - `detectedProblems`
  - `fixSuggestions`
  - `repairReadiness`
- `doctor` problem records now also expose minimal impact hints through `affects`, so Agent callers can distinguish:
  - all-PlatformIO issues
  - native-only host compiler issues
  - upload / monitor transport issues
- `doctor` repair planning is now more opinionated:
  - `activate_local_platformio_cli` is preferred over temporary shell-only activation
  - `repairReadiness` now includes `recommendedFixIds` and `manualProblemCodes`
- `repair_environment` now supports:
  - targeted `problemCodes` / `fixIds`
  - `dryRun`
  - install gating through `allowInstall`
  - automatic `doctor` recheck via `postRepairDoctor`
- `repair_environment` now also returns `recheckSummary`, including:
  - `resolvedProblemCodes`
  - `remainingProblemCodes`
  - `newProblemCodes`
  - `stillBlocking`
  - readiness booleans for build / upload / monitor
- `repair_environment` selection and result semantics are now stricter:
  - default execution uses `doctor.repairReadiness.recommendedFixIds`
  - manual guidance items are no longer auto-attempted by default
  - unknown fix IDs now fail fast, while already-healthy known fixes no longer produce false failures
- `doctor` readiness states now use stable issue codes plus human-readable `details`, instead of relying only on natural-language strings.
- `search_libraries` now aligns with `pio pkg search --json-output` and preserves pagination metadata instead of flattening everything into a plain array.
- `list_installed_libraries` now aligns with `pio pkg list --json-output` and tolerates items that do not contain a numeric `id`.
- `install_library` now uses official `pio pkg install` semantics instead of the older `lib install` path.
- `list_devices` now supports both official PlatformIO output shapes:
  - top-level serial array
  - grouped object with `serial` / `logical` / `mdns`
- `list_devices`, `doctor`, and monitor-related code now expose explicit device classification fields such as:
  - `transportType`
  - `detectionSource`
  - `deviceType`
  - `uploadCandidate`
  - `monitorCandidate`
- `start_monitor` continues to support bounded capture, but now also exposes official-leaning transport/session metadata:
  - `transportType`
  - `endpoint`
  - `source`
  - `resolvedPort`
  - `resolvedBaud`
  - `resolvedEnvironment`
  - `resolutionSource`
- `start_monitor` instruction mode now builds commands using the resolved actual PlatformIO executable path, instead of assuming `pio` is in `PATH`.
- Monitor execution in [src/tools/monitor.ts](/E:/program/platformio-mcp/src/tools/monitor.ts) now has a real in-process session path instead of a pseudo-session wrapper:
  - `open_monitor_session` spawns a persistent `pio device monitor` process
  - `read_monitor_session` drains only newly collected output
  - `write_monitor_session` writes to the monitor process stdin
  - `close_monitor_session` terminates and releases the session process
- Upload and monitor status semantics are now explicitly exercised in automated tests:
  - upload classifications for `port_unavailable`, `device_not_found`, `manual_boot_required`, `uploader_failed`
  - monitor session classifications for `session_opened`, `session_read_timeout`, `port_open_failed`, `session_closed`
- Registry wiring in [src/tools/registry.ts](/E:/program/platformio-mcp/src/tools/registry.ts) now includes:
  - `list_project_targets`
  - `generate_compile_commands`
  - `open_monitor_session`
  - `read_monitor_session`
  - `write_monitor_session`
  - `close_monitor_session`
- Integration test discovery now aligns with this Windows host's actual local PlatformIO installation:
  - [tests/integration/platformio-cli.test.ts](/E:/program/platformio-mcp/tests/integration/platformio-cli.test.ts) falls back to the local default `~/.platformio/penv/Scripts/pio.exe`
  - `test:integration` no longer collapses to a full skip when `PLATFORMIO_CLI_PATH` is unset but PlatformIO is installed locally
- Wave 2 monitor/session closure now also stabilizes:
  - project-derived `monitor_filters` inheritance
  - auto-detected `resolvedPort` recovery for successful uploads
  - auto-detected `resolvedPort` recovery from monitor banner output in bounded capture and session reads
- The ESP32 agri-node validation profile doc now explicitly distinguishes:
  - startup-stage profiles for boot/init banners
  - runtime-stage profiles for steady-state JSON and cycle checks
  so startup-only text expectations are not misused in steady-state session verification

### Fixed
- Fixed PlatformIO 6.1.19 compatibility for board listing and board lookup:
  - top-level array output support
  - field compatibility mapping for values such as `fcpu` and `rom`
- Fixed PlatformIO 6.1.19 compatibility for library search:
  - paginated object parsing with `items`
- Fixed PlatformIO 6.1.19 compatibility for installed packages:
  - no longer requires `id`
- Fixed `build_project` default-environment reporting so that `data.environment` reflects the resolved actual environment instead of `"default"`.
- Fixed monitor instruction-mode command generation so the returned command remains directly executable when only `PLATFORMIO_CLI_PATH` is available.
- Fixed previous performance/behavior drift where lightweight environment resolution was accidentally coupled to metadata fetching; `loadProjectInspection()` is now config-only again and metadata enrichment happens at the `inspectProject()` layer.
- Fixed a real hardware blocker in the live ESP32 agriculture-node sample under [源码/src/main.cpp](/E:/program/platformio-mcp/源码/src/main.cpp):
  - split BH1750 and SGP30 onto their actual separate I2C buses
  - removed incorrect PSRAM build flag from the sample project
  - moved SGP30 initialization out of the runtime loop so the node no longer emits `Wire.begin(): Bus already started in Master Mode.`
- Fixed `inspect_project` config parsing for multiline `platformio.ini` entries so current real projects no longer misreport values such as:
  - `lib_deps`
  - `build_flags`
  - indented `-D...=...` entries
- Fixed PlatformIO CLI discovery so MCP now recognizes the standard local PlatformIO Core installation path:
  - `C:\\Users\\<user>\\.platformio\\penv\\Scripts\\pio.exe`
  even when `pio` is not callable from the current shell `PATH`

### Verified
- Local automated verification currently passes:
  - `npm test`
  - `npm run build`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run test:coverage`
- Official CLI integration now also passes on this machine when `PLATFORMIO_CLI_PATH` is set to the local PlatformIO Core binary:
  - `npm run test:integration`
- After the Wave 2 integration test discovery fix, this host now reports:
  - `npm run test:integration` => `5 passed / 2 skipped`
  - the two remaining skips are still the existing host-toolchain-gated `g++` cases
- Real local CLI behavior was directly checked against PlatformIO Core `6.1.19` for:
  - `pio project metadata --json-output`
  - `pio run --list-targets`
  - `pio pkg install --help`
  - `pio pkg list --help`
  - `pio remote --help`
- Targeted real-CLI integration coverage exists in:
  - [tests/phase-a-real-cli.test.ts](/E:/program/platformio-mcp/tests/phase-a-real-cli.test.ts)
  - [tests/integration/platformio-cli.test.ts](/E:/program/platformio-mcp/tests/integration/platformio-cli.test.ts)
- Confirmed locally on this machine:
  - PlatformIO CLI version `6.1.19`
  - `pio remote --help` is callable through the resolved local CLI binary
- Confirmed locally on this Windows host for Wave 3:
  - `doctor({ projectDir: "E:/program/platformio-mcp/源码" })` reports:
    - `platformio.installed = true`
    - `cliPath = C:\\Users\\Arrebol\\.platformio\\penv\\Scripts\\pio.exe`
    - `shellCallable = false`
    - `readyForBuild = true`
    - `readyForUpload = true`
    - `readyForMonitor = true`
    - `detectedProblems = ["platformio_cli_not_shell_callable", "host_cpp_compiler_missing"]`
  - `repair_environment({ projectDir: "E:/program/platformio-mcp/源码", dryRun: true })` returns:
    - `repairStatus = "dry_run"`
    - auto-fixable CLI path activation suggestions
    - confirmation-gated `winget` host compiler installation suggestion
    - `postRepairDoctor` populated with the automatic recheck result
- Confirmed real confirmation-gated host compiler installation on this Windows host:
  - `repair_environment({ projectDir: "E:/program/platformio-mcp/源码", allowInstall: true, fixIds: ["install_host_cpp_compiler_via_winget"] })`
    completed with:
    - `repairStatus = "applied"`
    - `appliedFixes = ["install_host_cpp_compiler_via_winget"]`
  - post-repair `doctor` no longer reports `host_cpp_compiler_missing`
  - LLVM was installed to:
    - `C:\\Program Files\\LLVM\\bin\\clang++.exe`
  - direct invocation succeeds:
    - `C:\\Program Files\\LLVM\\bin\\clang++.exe --version`
  - current shell `PATH` still does not expose `clang++` directly, but MCP host compiler readiness now succeeds because standard LLVM install locations are explicitly probed
- Confirmed real persistent CLI activation repair on this Windows host:
  - clearing the user-level `PLATFORMIO_CLI_PATH` reproduces `platformio_cli_not_shell_callable`
  - `repair_environment({ fixIds: ["activate_local_platformio_cli"], allowShellProfileHints: true })`
    completed with:
    - `repairStatus = "applied"`
    - `appliedFixes = ["activate_local_platformio_cli"]`
  - a fresh MCP server process re-runs `doctor` without reporting `platformio_cli_not_shell_callable`
  - the persistence mechanism now uses user-level `setx PLATFORMIO_CLI_PATH <resolved-cli-path>` on Windows instead of a process-local-only override
- Confirmed compatibility fixes from real local output:
  - `project metadata` may return a top-level object keyed by environment name
  - metadata fields such as `compiler_type` may be `null`
  - `run --list-targets` may legitimately return only the table header on this host/project combination
- Confirmed current project-truth / capability-discovery closure on this host:
  - `tests/projects.test.ts` covers environment truth, config complexity signals, target discovery status, and compile command generation status
  - `tests/phase-a-real-cli.test.ts` covers real native-project `inspect_project`, `list_project_targets`, and `generate_compile_commands`
  - `tests/integration/platformio-cli.test.ts` covers read-only truth surfaces on a temporary native project, the official `wiring-blink` example, and the official `unit-testing/calculator` example
- Confirmed real read-only device monitoring on the current agriculture sensor node:
  - device enumerated on `COM9`
  - description: `USB-Enhanced-SERIAL CH343 (COM9)`
  - `list_devices` classified it as `usb_serial_adapter`
  - `uploadCandidate = true`
  - `monitorCandidate = true`
- Confirmed real bounded monitor capture against the live node without upload or serial writes:
  - `start_monitor({ port: "COM9", baud: 115200, captureDurationMs: 4000, maxLines: 20 })`
  - `monitorStatus = captured_output`
  - `verificationStatus = not_requested`
  - real output included DHT11 text, soil moisture text, missing-light / missing-CO2 notices, and JSON payloads
- Confirmed real profile-driven monitor verification against the same live node:
  - profile used `expectedPatterns`, `expectedJsonFields`, `expectedJsonNonNull`, `expectedJsonValues`, `allowedNullFields`, `expectedCycleSeconds`, `expectedCycleToleranceSeconds`, and `minJsonMessages`
  - `monitorStatus = captured_output`
  - `verificationStatus = degraded`
  - `failureSignals = []`
  - `degradedSignals = ["allowed_null_field:light", "allowed_null_field:co2"]`
  - health signals included `expected_patterns_matched`, `json_fields_present`, `json_non_null_fields_present`, `json_values_match`, `json_message_count_sufficient`, `node_loop_healthy`, `node_online_basic`, `sensor_core_present`, and `device_identity_match`
- Confirmed real JSON payload shape from the live node:
  ```json
  {
    "device_id": 1001,
    "timestamp": 151,
    "air_temp": 22.5,
    "air_humidity": 41,
    "soil_moisture": 1,
    "light": null,
    "co2": null
  }
  ```
- Confirmed real hardware closed-loop verification on the current agriculture node after the sample firmware fix:
  - `pio run` succeeded for [源码/platformio.ini](/E:/program/platformio-mcp/源码/platformio.ini)
  - `pio run -t upload` succeeded against `COM9`
  - runtime output detected `BH1750` at `0x23`
  - runtime output detected `SGP30` at `0x58`
  - runtime output now includes non-null `light` and `co2`
  - direct serial capture no longer shows `Wire.begin(): Bus already started in Master Mode.`
  - `start_monitor` with a strict non-null profile now returns:
    - `monitorStatus = captured_output`
    - `verificationStatus = healthy`
    - `healthSignals = ["expected_patterns_matched", "json_fields_present", "json_non_null_fields_present", "json_values_match", "json_message_count_sufficient", "node_loop_healthy", "node_online_basic", "sensor_core_present", "device_identity_match"]`
    - `degradedSignals = []`
    - `failureSignals = []`
  - observed JSON sample:
  ```json
  {
    "device_id": 1001,
    "timestamp": 115,
    "air_temp": 23.0,
    "air_humidity": 43.2,
    "soil_moisture": 31,
    "light": 38,
    "co2": 405
  }
  ```
- Confirmed Wave 2 real monitor-session closed-loop on the same ESP32-S3 node:
  - `open_monitor_session` succeeded on `COM9`
  - first short read captured only monitor banner / boot output, proving the session stays open across reads
  - later reads captured incremental runtime output rather than re-reading the same buffer
  - one 12-second profile-driven read returned:
    - `monitorStatus = captured_output`
    - `verificationStatus = healthy`
    - `healthSignals = ["expected_patterns_matched", "json_fields_present", "json_non_null_fields_present", "json_values_match", "json_message_count_sufficient", "node_loop_healthy", "node_online_basic", "sensor_core_present", "device_identity_match"]`
    - `degradedSignals = []`
    - `failureSignals = []`
  - parsed JSON sample from session read:
  ```json
  {
    "device_id": 1001,
    "timestamp": 46,
    "air_temp": 23.7,
    "air_humidity": 41.5,
    "soil_moisture": 27,
    "light": 33,
    "co2": 400
  }
  ```
  - `write_monitor_session` completed without crashing the session
  - `close_monitor_session` returned `monitorStatus = session_closed`
- Confirmed real upload status semantics on the live board:
  - one early upload attempt correctly returned `uploadStatus = port_unavailable` while `COM9` was occupied by an active monitor path
  - the immediate retry after releasing the port succeeded with `uploadStatus = uploaded`
- Confirmed fresh real MCP closure after the Wave 2 `resolvedPort` fixes:
  - `upload_firmware` now returns `resolvedPort = COM9` on successful auto-detected upload
  - `read_monitor_session` now returns `resolvedPort = COM9` on real steady-state reads
  - project-derived `filters = ["esp32_exception_decoder"]` are returned from monitor session opening
  - a runtime-only profile using `JSON 输出` + JSON field/cycle checks avoids false failures caused by startup-only text expectations
- Confirmed fresh execution-layer consolidation checks on 2026-03-28:
  - `invokeRegisteredTool("doctor", { projectDir: "E:/program/platformio-mcp/源码" })` returned:
    - `status = "ok"`
    - `summary = "Doctor completed: PlatformIO CLI ready; project ready; device ready; monitor ready; 0 problem(s)."`
  - `invokeRegisteredTool("repair_environment", { projectDir: "E:/program/platformio-mcp/源码", dryRun: true })` returned:
    - `status = "ok"`
    - no recommended fixes needed on the current host
  - `invokeRegisteredTool("inspect_project", { projectDir: "E:/program/platformio-mcp/源码" })` returned:
    - `resolvedEnvironment = "esp32-s3-devkitc-1"`
    - `environmentResolution = "single_environment_fallback"`
    - `metadataAvailable = true`
  - direct tool execution on the same project confirmed:
    - `list_project_targets` => `targetDiscoveryStatus = "targets_found"`
    - `generate_compile_commands` => `generationStatus = "generated"`
  - fresh real monitor-session validation on the live node returned:
    - `open_monitor_session` semantics through `openMonitorSession()` => `monitorStatus = "session_opened"`
    - `read_monitor_session` semantics through `readMonitorSession()` => `monitorStatus = "captured_output"`
    - `resolvedPort = "COM9"`
    - `resolvedEnvironment = "esp32-s3-devkitc-1"`
    - `filters = ["esp32_exception_decoder"]`
    - `verificationStatus = "healthy"`
    - parsed JSON included non-null `light` and `co2`
    - `close_monitor_session` semantics through `closeMonitorSession()` => `monitorStatus = "session_closed"`
- Confirmed fresh write-path closure rerun on 2026-03-28 for the current ESP32 project and node:
  - `buildProject("E:/program/platformio-mcp/源码")` succeeded with:
    - `resolvedEnvironment = "esp32-s3-devkitc-1"`
    - `resolutionSource = "single_environment_fallback"`
  - the first fresh upload attempt failed with:
    - `uploadStatus = "port_unavailable"`
    - `resolvedPort = "COM9"`
    - this was traced to a stale `pio device monitor` process left by an earlier local validation script, not to a device or MCP resolution bug
  - after terminating the stale local monitor process, the immediate retry succeeded with:
    - `uploadStatus = "uploaded"`
    - `resolvedPort = "COM9"`
    - `resolvedEnvironment = "esp32-s3-devkitc-1"`
  - an immediate post-upload monitor read over a 12-second startup window returned:
    - `monitorStatus = "captured_output"`
    - `verificationStatus = "indeterminate"`
    - `failureSignals = ["insufficient_json_messages"]`
    - this was expected evidence insufficiency after reboot, not a runtime failure
  - a subsequent runtime-stage session read over an 18-second steady-state window returned:
    - `monitorStatus = "captured_output"`
    - `verificationStatus = "healthy"`
    - `resolvedPort = "COM9"`
    - `resolvedEnvironment = "esp32-s3-devkitc-1"`
    - `filters = ["esp32_exception_decoder"]`
    - three parsed JSON messages with non-null `light` and `co2`
    - successful cycle verification at 5-second intervals
- Confirmed the same fresh closure through the MCP tool-definition layer on 2026-03-28:
  - `invokeRegisteredTool("build_project", { projectDir })` returned:
    - `status = "ok"`
    - `data.meta.operationType = "build"`
    - `data.meta.resolvedEnvironment = "esp32-s3-devkitc-1"`
  - `invokeRegisteredTool("upload_firmware", { projectDir })` returned:
    - `status = "ok"`
    - `data.uploadStatus = "uploaded"`
    - `data.meta.resolvedPort = "COM9"`
    - `data.meta.resolutionSource = "environment_resolution"`
  - `invokeRegisteredTool("open_monitor_session", { projectDir })` returned:
    - `status = "ok"`
    - `data.monitorStatus = "session_opened"`
    - `data.filters = ["esp32_exception_decoder"]`
  - `invokeRegisteredTool("read_monitor_session", { sessionId, ...runtimeProfile })` returned:
    - `status = "ok"`
    - `data.monitorStatus = "captured_output"`
    - `data.verificationStatus = "healthy"`
    - `data.meta.resolvedPort = "COM9"`
    - `data.meta.resolvedEnvironment = "esp32-s3-devkitc-1"`
  - `invokeRegisteredTool("close_monitor_session", { sessionId })` returned:
    - `status = "ok"`
    - `data.monitorStatus = "session_closed"`

### Pending Verification
- `tests/integration/platformio-cli.test.ts` now runs locally, but two assertions remain intentionally skipped when the host lacks `g++`:
  - native build success
  - `generate_compile_commands` on native
  These are environment/toolchain limitations on this Windows host, not currently treated as MCP implementation failures.
- `npm run format:check` is still failing on broad historical repository formatting drift, not on a narrow Wave 2 regression. That remains an engineering cleanup item rather than a current execution-layer blocker.
- The broader hardware matrix is still not fully covered:
  - only the current ESP32 agriculture node has been revalidated end-to-end
  - no second board family has been rechecked yet
  - no remote workflow or bidirectional monitor-session workflow is claimed complete
- Remote workflow support is not implemented; only `remoteReadiness` and command-surface alignment have been started.

### Current Project Position
- The project is no longer just a thin CLI wrapper in the core inspection / doctor / devices / libraries path.
- Wave 1 official-alignment work is now functionally closed on the current host.
- Remaining work after Wave 1 closure is no longer “core official alignment”, but:
  - hardware-dependent upload / monitor closed-loop validation
  - future monitor session evolution
  - remote workflow expansion only after explicit prioritization
- Current immediate focus is no longer expanding capability surfaces. It is:
  - align README / changelog / planning state with the code that now exists
  - keep current execution-layer semantics trustworthy for real use
  - avoid silently treating historical hardware evidence as a fresh-session recheck
