import { afterEach, describe, expect, it, vi } from 'vitest';

import * as doctorModule from '../src/tools/doctor.js';
import { repairEnvironment } from '../src/tools/repair.js';

describe('repair environment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PLATFORMIO_CLI_PATH;
  });

  it('returns a dry-run plan without applying changes', async () => {
    vi.spyOn(doctorModule, 'doctor').mockResolvedValue({
      nodeVersion: 'v22.14.0',
      platformio: { installed: true, shellCallable: false },
      devices: { count: 0, items: [] },
      projectReadiness: { status: 'warning', issues: [], details: [] },
      deviceReadiness: { status: 'warning', issues: [], details: [] },
      monitorReadiness: { status: 'warning', issues: [], details: [] },
      remoteReadiness: { status: 'warning', issues: [], details: [] },
      readyForBuild: true,
      readyForUpload: false,
      readyForMonitor: false,
      blockingIssues: [],
      warnings: [],
      detectedProblems: [
        {
          problemCode: 'platformio_cli_not_shell_callable',
          severity: 'warning',
          scope: 'host_shell',
          detectedFrom: 'platformio.shellCallable',
          blocking: false,
          summary: 'PlatformIO CLI is installed but not callable from PATH.',
        },
      ],
      fixSuggestions: [
        {
          problemCode: 'platformio_cli_not_shell_callable',
          fixId: 'set_platformio_cli_env_hint',
          fixKind: 'env_hint',
          canAutoFix: true,
          requiresConfirmation: false,
          platformSupport: ['windows'],
          summary: 'Use the resolved PlatformIO CLI path.',
          commands: [
            '$env:PLATFORMIO_CLI_PATH="C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe"',
          ],
          expectedImpact: 'Doctor and MCP execution will use the explicit CLI path.',
          riskLevel: 'low',
        },
      ],
      repairReadiness: {
        hasAutoFixes: true,
        hasConfirmationRequiredFixes: false,
        hasManualOnlyFixes: false,
        recommendedFixIds: ['set_platformio_cli_env_hint'],
        manualProblemCodes: [],
      },
    });

    const result = await repairEnvironment({ dryRun: true });

    expect(result.repairStatus).toBe('dry_run');
    expect(result.attemptedFixes).toHaveLength(1);
    expect(result.appliedFixes).toEqual([]);
    expect(result.postRepairDoctor).toBeDefined();
    expect(result.recheckSummary).toEqual(
      expect.objectContaining({
        resolvedProblemCodes: [],
        remainingProblemCodes: ['platformio_cli_not_shell_callable'],
      })
    );
  });

  it('skips install fixes unless allowInstall is true', async () => {
    vi.spyOn(doctorModule, 'doctor').mockResolvedValue({
      nodeVersion: 'v22.14.0',
      platformio: { installed: true, shellCallable: true },
      devices: { count: 0, items: [] },
      projectReadiness: { status: 'ready', issues: [], details: [] },
      deviceReadiness: { status: 'warning', issues: [], details: [] },
      monitorReadiness: { status: 'warning', issues: [], details: [] },
      remoteReadiness: { status: 'warning', issues: [], details: [] },
      readyForBuild: true,
      readyForUpload: false,
      readyForMonitor: false,
      blockingIssues: [],
      warnings: [],
      detectedProblems: [
        {
          problemCode: 'host_cpp_compiler_missing',
          severity: 'warning',
          scope: 'native_host_build_only',
          detectedFrom: 'host_cpp_toolchain',
          blocking: false,
          summary: 'No host C/C++ compiler was detected.',
        },
      ],
      fixSuggestions: [
        {
          problemCode: 'host_cpp_compiler_missing',
          fixId: 'install_host_cpp_compiler_via_winget',
          fixKind: 'package_install',
          canAutoFix: false,
          requiresConfirmation: true,
          platformSupport: ['windows'],
          summary: 'Install a host C/C++ compiler via winget.',
          commands: ['winget install --id Example.Compiler -e'],
          expectedImpact: 'Native PlatformIO builds can compile on this host.',
          riskLevel: 'medium',
        },
      ],
      repairReadiness: {
        hasAutoFixes: false,
        hasConfirmationRequiredFixes: true,
        hasManualOnlyFixes: false,
        recommendedFixIds: [],
        manualProblemCodes: [],
      },
    });

    const result = await repairEnvironment({
      fixIds: ['install_host_cpp_compiler_via_winget'],
      allowInstall: false,
    });

    expect(result.repairStatus).toBe('partial');
    expect(result.appliedFixes).toEqual([]);
    expect(result.skippedFixes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixId: 'install_host_cpp_compiler_via_winget',
          reason: 'install_not_allowed',
        }),
      ])
    );
  });

  it('persists local PlatformIO CLI activation when requested', async () => {
    const execSpy = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(doctorModule, 'doctor')
      .mockResolvedValueOnce({
        nodeVersion: 'v22.14.0',
        platformio: { installed: true, shellCallable: false },
        devices: { count: 0, items: [] },
        projectReadiness: { status: 'ready', issues: [], details: [] },
        deviceReadiness: { status: 'warning', issues: [], details: [] },
        monitorReadiness: { status: 'warning', issues: [], details: [] },
        remoteReadiness: { status: 'warning', issues: [], details: [] },
        readyForBuild: true,
        readyForUpload: false,
        readyForMonitor: false,
        blockingIssues: [],
        warnings: [],
        detectedProblems: [
          {
            problemCode: 'platformio_cli_not_shell_callable',
            severity: 'warning',
            scope: 'host_shell',
            detectedFrom: 'platformio.shellCallable',
            blocking: false,
            summary: 'PlatformIO CLI is installed but not callable from PATH.',
          },
        ],
        fixSuggestions: [
          {
            problemCode: 'platformio_cli_not_shell_callable',
            fixId: 'activate_local_platformio_cli',
            fixKind: 'local_activation',
            canAutoFix: true,
            requiresConfirmation: false,
            platformSupport: ['windows'],
            summary: 'Persist local PlatformIO CLI path.',
            commands: [
              `powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('PLATFORMIO_CLI_PATH', 'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe', 'User')"`,
            ],
            expectedImpact: 'Future MCP sessions use the local PlatformIO path.',
            riskLevel: 'low',
          },
        ],
        repairReadiness: {
          hasAutoFixes: true,
          hasConfirmationRequiredFixes: false,
          hasManualOnlyFixes: false,
          recommendedFixIds: ['activate_local_platformio_cli'],
          manualProblemCodes: [],
        },
      })
      .mockResolvedValueOnce({
        nodeVersion: 'v22.14.0',
        platformio: { installed: true, shellCallable: true },
        devices: { count: 0, items: [] },
        projectReadiness: { status: 'ready', issues: [], details: [] },
        deviceReadiness: { status: 'warning', issues: [], details: [] },
        monitorReadiness: { status: 'warning', issues: [], details: [] },
        remoteReadiness: { status: 'warning', issues: [], details: [] },
        readyForBuild: true,
        readyForUpload: false,
        readyForMonitor: false,
        blockingIssues: [],
        warnings: [],
        detectedProblems: [],
        fixSuggestions: [],
        repairReadiness: {
          hasAutoFixes: false,
          hasConfirmationRequiredFixes: false,
          hasManualOnlyFixes: false,
          recommendedFixIds: [],
          manualProblemCodes: [],
        },
      });

    const result = await repairEnvironment(
      {
        fixIds: ['activate_local_platformio_cli'],
        allowShellProfileHints: true,
      },
      execSpy
    );

    expect(execSpy).toHaveBeenCalledWith('setx', [
      'PLATFORMIO_CLI_PATH',
      'C:\\Users\\Arrebol\\.platformio\\penv\\Scripts\\pio.exe',
    ]);
    expect(result.repairStatus).toBe('applied');
    expect(result.appliedFixes).toEqual([
      { fixId: 'activate_local_platformio_cli' },
    ]);
    expect(result.recheckSummary).toEqual(
      expect.objectContaining({
        resolvedProblemCodes: ['platformio_cli_not_shell_callable'],
        remainingProblemCodes: [],
      })
    );
  });

  it('executes install fixes with shell-safe command handling when allowInstall is true', async () => {
    const execSpy = vi.fn().mockResolvedValue(undefined);

    const doctorSpy = vi
      .spyOn(doctorModule, 'doctor')
      .mockResolvedValueOnce({
        nodeVersion: 'v22.14.0',
        platformio: { installed: true, shellCallable: true },
        devices: { count: 0, items: [] },
        projectReadiness: { status: 'ready', issues: [], details: [] },
        deviceReadiness: { status: 'warning', issues: [], details: [] },
        monitorReadiness: { status: 'warning', issues: [], details: [] },
        remoteReadiness: { status: 'warning', issues: [], details: [] },
        readyForBuild: true,
        readyForUpload: false,
        readyForMonitor: false,
        blockingIssues: [],
        warnings: [],
        detectedProblems: [
          {
            problemCode: 'host_cpp_compiler_missing',
            severity: 'warning',
            scope: 'native_host_build_only',
            detectedFrom: 'host_cpp_toolchain',
            blocking: false,
            summary: 'No host C/C++ compiler was detected.',
          },
        ],
        fixSuggestions: [
          {
            problemCode: 'host_cpp_compiler_missing',
            fixId: 'install_host_cpp_compiler_via_winget',
            fixKind: 'package_install',
            canAutoFix: false,
            requiresConfirmation: true,
            platformSupport: ['windows'],
            summary: 'Install LLVM via winget.',
            commands: ['winget install --id LLVM.LLVM -e --accept-package-agreements --accept-source-agreements'],
            expectedImpact: 'clang++ becomes available for native builds.',
            riskLevel: 'medium',
          },
        ],
        repairReadiness: {
          hasAutoFixes: false,
          hasConfirmationRequiredFixes: true,
          hasManualOnlyFixes: false,
          recommendedFixIds: [],
          manualProblemCodes: [],
        },
      })
      .mockResolvedValueOnce({
        nodeVersion: 'v22.14.0',
        platformio: { installed: true, shellCallable: true },
        devices: { count: 0, items: [] },
        projectReadiness: { status: 'ready', issues: [], details: [] },
        deviceReadiness: { status: 'warning', issues: [], details: [] },
        monitorReadiness: { status: 'warning', issues: [], details: [] },
        remoteReadiness: { status: 'warning', issues: [], details: [] },
        readyForBuild: true,
        readyForUpload: false,
        readyForMonitor: false,
        blockingIssues: [],
        warnings: [],
        detectedProblems: [],
        fixSuggestions: [],
        repairReadiness: {
          hasAutoFixes: false,
          hasConfirmationRequiredFixes: false,
          hasManualOnlyFixes: false,
          recommendedFixIds: [],
          manualProblemCodes: [],
        },
      });

    const result = await repairEnvironment({
      fixIds: ['install_host_cpp_compiler_via_winget'],
      allowInstall: true,
    }, execSpy);

    expect(execSpy).toHaveBeenCalledWith(
      'winget',
      [
        'install',
        '--id',
        'LLVM.LLVM',
        '-e',
        '--accept-package-agreements',
        '--accept-source-agreements',
      ]
    );
    expect(result.repairStatus).toBe('applied');
    expect(result.appliedFixes).toEqual([
      { fixId: 'install_host_cpp_compiler_via_winget' },
    ]);
    expect(doctorSpy).toHaveBeenCalledTimes(2);
  });

  it('uses recommended fixes by default and does not auto-attempt manual-only guidance', async () => {
    vi.spyOn(doctorModule, 'doctor')
      .mockResolvedValueOnce({
        nodeVersion: 'v22.14.0',
        platformio: { installed: true, shellCallable: false },
        devices: { count: 0, items: [] },
        projectReadiness: { status: 'ready', issues: [], details: [] },
        deviceReadiness: { status: 'warning', issues: [], details: [] },
        monitorReadiness: { status: 'warning', issues: [], details: [] },
        remoteReadiness: { status: 'warning', issues: [], details: [] },
        readyForBuild: true,
        readyForUpload: false,
        readyForMonitor: false,
        blockingIssues: [],
        warnings: [],
        detectedProblems: [
          {
            problemCode: 'platformio_cli_not_shell_callable',
            severity: 'warning',
            scope: 'host_shell',
            detectedFrom: 'platformio.shellCallable',
            blocking: false,
            affects: ['all_platformio'],
            summary: 'PlatformIO CLI is installed but not callable from PATH.',
          },
          {
            problemCode: 'serial_port_busy',
            severity: 'error',
            scope: 'serial_transport',
            detectedFrom: 'serial_port_probe:COM9',
            blocking: true,
            affects: ['upload', 'monitor'],
            summary: 'Serial port COM9 is busy.',
          },
        ],
        fixSuggestions: [
          {
            problemCode: 'platformio_cli_not_shell_callable',
            fixId: 'activate_local_platformio_cli',
            fixKind: 'local_activation',
            canAutoFix: true,
            requiresConfirmation: false,
            platformSupport: ['windows'],
            summary: 'Persist local PlatformIO CLI path.',
            commands: [
              `powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('PLATFORMIO_CLI_PATH', 'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe', 'User')"` ,
            ],
            expectedImpact: 'Future MCP sessions use the local PlatformIO path.',
            riskLevel: 'low',
          },
          {
            problemCode: 'serial_port_busy',
            fixId: 'suggest_close_serial_consumers',
            fixKind: 'manual_guidance',
            canAutoFix: false,
            requiresConfirmation: false,
            platformSupport: ['windows'],
            summary: 'Close serial consumers.',
            commands: [],
            expectedImpact: 'Port becomes available.',
            riskLevel: 'low',
          },
        ],
        repairReadiness: {
          hasAutoFixes: true,
          hasConfirmationRequiredFixes: false,
          hasManualOnlyFixes: true,
          recommendedFixIds: ['activate_local_platformio_cli'],
          manualProblemCodes: ['serial_port_busy'],
        },
      })
      .mockResolvedValueOnce({
        nodeVersion: 'v22.14.0',
        platformio: { installed: true, shellCallable: true },
        devices: { count: 0, items: [] },
        projectReadiness: { status: 'ready', issues: [], details: [] },
        deviceReadiness: { status: 'warning', issues: [], details: [] },
        monitorReadiness: { status: 'warning', issues: [], details: [] },
        remoteReadiness: { status: 'warning', issues: [], details: [] },
        readyForBuild: true,
        readyForUpload: false,
        readyForMonitor: false,
        blockingIssues: ['serial_port_busy'],
        warnings: [],
        detectedProblems: [
          {
            problemCode: 'serial_port_busy',
            severity: 'error',
            scope: 'serial_transport',
            detectedFrom: 'serial_port_probe:COM9',
            blocking: true,
            affects: ['upload', 'monitor'],
            summary: 'Serial port COM9 is busy.',
          },
        ],
        fixSuggestions: [],
        repairReadiness: {
          hasAutoFixes: false,
          hasConfirmationRequiredFixes: false,
          hasManualOnlyFixes: true,
          recommendedFixIds: [],
          manualProblemCodes: ['serial_port_busy'],
        },
      });

    const result = await repairEnvironment(
      {
        allowShellProfileHints: true,
      },
      vi.fn().mockResolvedValue(undefined)
    );

    expect(result.attemptedFixes).toEqual([
      { fixId: 'activate_local_platformio_cli' },
    ]);
    expect(result.skippedFixes).toEqual([]);
    expect(result.repairStatus).toBe('partial');
  });

  it('fails fast for unknown fix ids', async () => {
    vi.spyOn(doctorModule, 'doctor').mockResolvedValue({
      nodeVersion: 'v22.14.0',
      platformio: { installed: true, shellCallable: true },
      devices: { count: 0, items: [] },
      projectReadiness: { status: 'ready', issues: [], details: [] },
      deviceReadiness: { status: 'warning', issues: [], details: [] },
      monitorReadiness: { status: 'warning', issues: [], details: [] },
      remoteReadiness: { status: 'warning', issues: [], details: [] },
      readyForBuild: true,
      readyForUpload: false,
      readyForMonitor: false,
      blockingIssues: [],
      warnings: [],
      detectedProblems: [],
      fixSuggestions: [],
      repairReadiness: {
        hasAutoFixes: false,
        hasConfirmationRequiredFixes: false,
        hasManualOnlyFixes: false,
        recommendedFixIds: [],
        manualProblemCodes: [],
      },
    });

    const result = await repairEnvironment({
      fixIds: ['unknown_fix'],
    });

    expect(result.repairStatus).toBe('failed');
    expect(result.failedFixes).toEqual([
      { fixId: 'unknown_fix', reason: 'unknown_fix_id' },
    ]);
  });
});
