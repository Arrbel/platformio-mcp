/**
 * Environment and project diagnostics.
 */

import {
  checkPlatformIOInstalled,
  checkRemoteCliAvailable,
  detectHostCppToolchain,
  getPlatformIOBinaryPath,
  getPlatformIOPythonExecutable,
  getPlatformIOVersion,
  getRecommendedPlatformIOCliPath,
  isPlatformIOShellCallable,
  probeSerialPortBusy,
} from '../platformio.js';
import type {
  DoctorFixSuggestion,
  DoctorProblem,
  DoctorReport,
} from '../types.js';
import { deriveDoctorReadiness, listDevices } from './devices.js';
import { inspectProject } from './projects.js';

function getCandidateProjectPort(project?: Awaited<ReturnType<typeof inspectProject>>): string | undefined {
  if (!project) {
    return undefined;
  }

  const defaultEnvironmentName = project.defaultEnvironments[0];
  const environment =
    (defaultEnvironmentName
      ? project.environments.find((entry) => entry.name === defaultEnvironmentName)
      : undefined) ?? project.environments[0];

  return environment?.uploadPort ?? environment?.monitorPort;
}

function buildRepairReadiness(fixSuggestions: DoctorFixSuggestion[]): DoctorReport['repairReadiness'] {
  const recommendedFixIds = Array.from(
    new Set(
      fixSuggestions
        .filter(
          (suggestion) =>
            suggestion.canAutoFix &&
            suggestion.fixKind !== 'env_hint' &&
            suggestion.fixKind !== 'manual_guidance' &&
            suggestion.fixKind !== 'recheck'
        )
        .map((suggestion) => suggestion.fixId)
    )
  );
  const manualProblemCodes = Array.from(
    new Set(
      fixSuggestions
        .filter(
          (suggestion) =>
            suggestion.fixKind === 'manual_guidance' ||
            suggestion.fixKind === 'recheck'
        )
        .map((suggestion) => suggestion.problemCode)
    )
  );

  return {
    hasAutoFixes: fixSuggestions.some((suggestion) => suggestion.canAutoFix),
    hasConfirmationRequiredFixes: fixSuggestions.some(
      (suggestion) => suggestion.requiresConfirmation
    ),
    hasManualOnlyFixes: fixSuggestions.some(
      (suggestion) => !suggestion.canAutoFix && !suggestion.requiresConfirmation
    ),
    recommendedFixIds,
    manualProblemCodes,
  };
}

export async function doctor(
  options: { projectDir?: string } = {}
): Promise<DoctorReport> {
  const warnings: string[] = [];
  const shellCallableWarnings: string[] = [];
  const installed = await checkPlatformIOInstalled();
  const cliPath = await getPlatformIOBinaryPath();
  const shellCallable = installed ? await isPlatformIOShellCallable() : false;
  const pythonExecutable = installed
    ? await getPlatformIOPythonExecutable()
    : undefined;

  if (installed && !shellCallable) {
    shellCallableWarnings.push(
      'PlatformIO CLI is installed but not callable from the current shell PATH. MCP can still use the resolved CLI path directly.'
    );
  }

  let version: string | undefined;
  if (installed) {
    try {
      version = await getPlatformIOVersion();
    } catch (error) {
      warnings.push(
        `PlatformIO CLI is installed but its version could not be determined: ${String(error)}`
      );
    }
  } else {
    warnings.push(
      'PlatformIO CLI is not available in PATH. Embedded build, upload, and monitor commands will fail.'
    );
  }

  let devices = [] as Awaited<ReturnType<typeof listDevices>>;
  if (installed) {
    try {
      devices = await listDevices();
    } catch (error) {
      warnings.push(`Connected devices could not be listed: ${String(error)}`);
    }
  }

  let project: Awaited<ReturnType<typeof inspectProject>> | undefined;
  if (options.projectDir) {
    try {
      project = await inspectProject(options.projectDir);
    } catch (error) {
      warnings.push(
        `Project inspection failed for '${options.projectDir}': ${String(error)}`
      );
    }
  }

  const hostCpp = await detectHostCppToolchain();
  const candidateProjectPort = getCandidateProjectPort(project);
  const uploadableDevicePort = devices.find((device) => device.uploadCandidate)?.port;
  const busyProbePort = candidateProjectPort ?? uploadableDevicePort;
  const portProbe = await probeSerialPortBusy(busyProbePort);

  const readiness = deriveDoctorReadiness({
    platformioInstalled: installed,
    hasProject: Boolean(project?.isPlatformIOProject),
    hasEnvironment: Boolean(project && project.environments.length > 0),
    hasMonitorConfiguration: Boolean(
      project?.environments.some(
        (environment) => environment.monitorPort || environment.monitorSpeed
      )
    ),
    devices,
  });

  let remoteReadiness: DoctorReport['remoteReadiness'] = {
    status: 'blocked',
    issues: ['platformio_cli_missing'],
    details: ['PlatformIO CLI is required before remote support can be checked.'],
  };

  if (installed) {
    try {
      const remote = await checkRemoteCliAvailable();
      remoteReadiness = remote.available
        ? {
            status: remote.installTriggered ? 'warning' : 'ready',
            issues: remote.installTriggered
              ? ['remote_dependency_install_triggered']
              : [],
            details: remote.installTriggered
              ? ['PlatformIO remote support was not fully ready before this check and may have triggered dependency installation.']
              : [],
          }
        : {
            status: 'warning',
            issues: ['remote_not_ready'],
            details: ['PlatformIO remote support is not ready on this machine.'],
          };
    } catch (error) {
      remoteReadiness = {
        status: 'warning',
        issues: ['remote_not_ready'],
        details: [
          `PlatformIO remote support is not ready: ${String(error)}`,
        ],
      };
    }
  }

  const projectIssueCodes: string[] = [];
  const projectIssueDetails: string[] = [];
  if (!installed) {
    projectIssueCodes.push('cli_not_installed');
  }
  if (installed && !shellCallable) {
    projectIssueCodes.push('cli_not_shell_callable');
  }
  if (!project?.isPlatformIOProject) {
    projectIssueCodes.push('project_not_available');
    projectIssueDetails.push('PlatformIO project inspection did not succeed.');
  } else if (project.environments.length === 0) {
    projectIssueCodes.push('environment_not_resolved');
    projectIssueDetails.push('No PlatformIO environments were resolved.');
  } else {
    projectIssueDetails.push(...project.warnings);
  }

  const projectReadiness: DoctorReport['projectReadiness'] = {
    status: project?.isPlatformIOProject
      ? project.environments.length > 0
        ? 'ready'
        : 'blocked'
      : 'blocked',
    issues: projectIssueCodes,
    details: projectIssueDetails,
  };

  const deviceIssueCodes: string[] = [];
  const deviceIssueDetails: string[] = [];
  if (!installed) {
    deviceIssueCodes.push('cli_not_installed');
  }
  if (devices.length === 0) {
    deviceIssueCodes.push('device_not_detected');
    deviceIssueDetails.push('No serial or logical devices were detected.');
  } else if (!devices.some((device) => device.uploadCandidate)) {
    deviceIssueCodes.push('upload_candidate_not_detected');
    deviceIssueDetails.push('No likely upload candidate was detected.');
  }

  const deviceReadiness: DoctorReport['deviceReadiness'] = {
    status:
      devices.length === 0
        ? 'warning'
        : devices.some((device) => device.uploadCandidate)
          ? 'ready'
          : 'warning',
    issues: deviceIssueCodes,
    details: deviceIssueDetails,
  };

  const monitorIssueCodes: string[] = [];
  const monitorIssueDetails: string[] = [];
  if (!installed) {
    monitorIssueCodes.push('cli_not_installed');
  }
  for (const issue of readiness.blockingIssues) {
    if (
      ['monitor_configuration_missing', 'uploadable_device_not_detected'].includes(
        issue
      )
    ) {
      monitorIssueCodes.push(issue);
    }
  }
  if (monitorIssueCodes.includes('monitor_configuration_missing')) {
    monitorIssueDetails.push(
      'No monitor_port or monitor_speed was resolved from the project environments.'
    );
  }
  if (monitorIssueCodes.includes('uploadable_device_not_detected')) {
    monitorIssueDetails.push('No likely monitor-capable serial target was detected.');
  }

  const monitorReadiness: DoctorReport['monitorReadiness'] = {
    status: readiness.readyForMonitor ? 'ready' : 'warning',
    issues: monitorIssueCodes,
    details: monitorIssueDetails,
  };

  const detectedProblems: DoctorProblem[] = [];
  const fixSuggestions: DoctorFixSuggestion[] = [];

  if (!installed) {
    detectedProblems.push({
      problemCode: 'platformio_cli_missing',
      severity: 'error',
      scope: 'platformio_cli',
      detectedFrom: 'platformio.installed',
      blocking: true,
      affects: ['all_platformio'],
      summary: 'PlatformIO CLI is not installed or cannot be resolved on this host.',
    });
  }

  if (installed && !shellCallable) {
    detectedProblems.push({
      problemCode: 'platformio_cli_not_shell_callable',
      severity: 'warning',
      scope: 'host_shell',
      detectedFrom: 'platformio.shellCallable',
      blocking: false,
      affects: ['all_platformio'],
      summary:
        'PlatformIO CLI is installed but not callable from the current shell PATH.',
    });

    const recommendedCliPath = getRecommendedPlatformIOCliPath();
    if (recommendedCliPath) {
      fixSuggestions.push({
        problemCode: 'platformio_cli_not_shell_callable',
        fixId: 'activate_local_platformio_cli',
        fixKind: 'local_activation',
        canAutoFix: true,
        requiresConfirmation: false,
        platformSupport:
          process.platform === 'win32'
            ? ['windows']
            : process.platform === 'darwin'
              ? ['macos']
              : ['linux'],
        summary:
          'Persist the standard local PlatformIO virtualenv CLI path for future MCP sessions on this host.',
        commands:
          process.platform === 'win32'
            ? [
                `powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('PLATFORMIO_CLI_PATH', '${recommendedCliPath.replace(/'/g, "''")}', 'User')"`,
              ]
            : [recommendedCliPath],
        expectedImpact:
          'Subsequent MCP sessions can execute PlatformIO using the detected local installation without relying on PATH.',
        riskLevel: 'low',
      });

      fixSuggestions.push({
        problemCode: 'platformio_cli_not_shell_callable',
        fixId: 'set_platformio_cli_env_hint',
        fixKind: 'env_hint',
        canAutoFix: true,
        requiresConfirmation: false,
        platformSupport:
          process.platform === 'win32'
            ? ['windows']
            : process.platform === 'darwin'
              ? ['macos']
              : ['linux'],
        summary:
          'Use the resolved local PlatformIO CLI path for the current MCP process only.',
        commands: [
          process.platform === 'win32'
            ? `$env:PLATFORMIO_CLI_PATH="${recommendedCliPath}"`
            : `export PLATFORMIO_CLI_PATH="${recommendedCliPath}"`,
        ],
        expectedImpact:
          'Doctor and MCP-executed PlatformIO commands will prefer the explicit CLI path in the current process.',
        riskLevel: 'low',
      });
    }
  }

  if (!project?.isPlatformIOProject) {
    detectedProblems.push({
      problemCode: 'project_not_platformio',
      severity: 'error',
      scope: 'project',
      detectedFrom: 'project.isPlatformIOProject',
      blocking: true,
      affects: ['all_platformio'],
      summary: 'The provided directory is not a valid PlatformIO project.',
    });
  } else if (project.environments.length === 0) {
    detectedProblems.push({
      problemCode: 'environment_not_resolved',
      severity: 'error',
      scope: 'project',
      detectedFrom: 'project.environments',
      blocking: true,
      affects: ['all_platformio'],
      summary: 'No PlatformIO environment could be resolved from this project.',
    });
    fixSuggestions.push({
      problemCode: 'environment_not_resolved',
      fixId: 'recheck_only',
      fixKind: 'recheck',
      canAutoFix: false,
      requiresConfirmation: false,
      platformSupport: ['windows', 'macos', 'linux'],
      summary:
        'Review platformio.ini and rerun doctor after the project environments are corrected.',
      commands: [],
      expectedImpact:
        'Project readiness will be re-evaluated after configuration changes.',
      riskLevel: 'low',
    });
  }

  if (!hostCpp.available) {
    detectedProblems.push({
      problemCode: 'host_cpp_compiler_missing',
      severity: 'warning',
      scope: 'native_host_build_only',
      detectedFrom: 'host_cpp_toolchain',
      blocking: false,
      affects: ['native_build'],
      summary:
        'No host C/C++ compiler was detected. This blocks native PlatformIO builds but does not block ESP32 cross-compilation.',
    });

    if (process.platform === 'win32' && hostCpp.packageManager === 'winget') {
      fixSuggestions.push({
        problemCode: 'host_cpp_compiler_missing',
        fixId: 'install_host_cpp_compiler_via_winget',
        fixKind: 'package_install',
        canAutoFix: false,
        requiresConfirmation: true,
        platformSupport: ['windows'],
        summary:
          'Install LLVM clang++ using winget for host-native PlatformIO builds.',
        commands: [
          'winget install --id LLVM.LLVM -e --accept-package-agreements --accept-source-agreements',
        ],
        expectedImpact:
          'Host-native PlatformIO environments can compile once clang++ is installed and discoverable.',
        riskLevel: 'medium',
      });
    }
  } else if (hostCpp.available && !hostCpp.shellCallable) {
    detectedProblems.push({
      problemCode: 'host_cpp_compiler_not_shell_callable',
      severity: 'warning',
      scope: 'native_host_build_only',
      detectedFrom: 'host_cpp_toolchain',
      blocking: false,
      affects: ['native_build'],
      summary:
        'A host C/C++ compiler was detected on disk but is not callable from the current shell/toolchain path.',
    });
  }

  if (busyProbePort && portProbe.busy) {
    detectedProblems.push({
      problemCode: 'serial_port_busy',
      severity: 'error',
      scope: 'serial_transport',
      detectedFrom: `serial_port_probe:${busyProbePort}`,
      blocking: true,
      affects: ['upload', 'monitor'],
      summary: `Serial port ${busyProbePort} appears to be busy and unavailable for upload or monitor operations.`,
    });
    fixSuggestions.push({
      problemCode: 'serial_port_busy',
      fixId: 'suggest_close_serial_consumers',
      fixKind: 'manual_guidance',
      canAutoFix: false,
      requiresConfirmation: false,
      platformSupport: ['windows', 'macos', 'linux'],
      summary:
        'Close VS Code serial monitors, PlatformIO device monitors, or other serial tools using the port, then re-run doctor.',
      commands: [],
      expectedImpact:
        'The serial port becomes available for upload and monitor commands after the conflicting consumer is closed.',
      riskLevel: 'low',
    });
    fixSuggestions.push({
      problemCode: 'serial_port_busy',
      fixId: 'recheck_only',
      fixKind: 'recheck',
      canAutoFix: false,
      requiresConfirmation: false,
      platformSupport: ['windows', 'macos', 'linux'],
      summary: 'Re-run doctor after releasing the busy serial port.',
      commands: [],
      expectedImpact: 'Serial port readiness is re-evaluated without modifying the system.',
      riskLevel: 'low',
    });
  }

  return {
    nodeVersion: process.version,
    platformio: {
      installed,
      version,
      cliPath,
      shellCallable,
      pythonExecutable,
    },
    project,
    devices: {
      count: devices.length,
      items: devices,
    },
    projectReadiness,
    deviceReadiness,
    monitorReadiness,
    remoteReadiness,
    readyForBuild: readiness.readyForBuild,
    readyForUpload: readiness.readyForUpload,
    readyForMonitor: readiness.readyForMonitor,
    blockingIssues: readiness.blockingIssues,
    detectedProblems,
    fixSuggestions,
    repairReadiness: buildRepairReadiness(fixSuggestions),
    warnings: warnings.concat(shellCallableWarnings),
  };
}
