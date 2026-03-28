import type { SerialDevice } from './device.js';
import type { ProjectInspection } from './project.js';

export interface DoctorReadiness {
  status: 'ready' | 'warning' | 'blocked';
  issues: string[];
  details?: string[];
}

export interface DoctorProblem {
  problemCode:
    | 'platformio_cli_missing'
    | 'platformio_cli_not_shell_callable'
    | 'host_cpp_compiler_missing'
    | 'host_cpp_compiler_not_shell_callable'
    | 'serial_port_busy'
    | 'project_not_platformio'
    | 'environment_not_resolved';
  severity: 'info' | 'warning' | 'error';
  scope:
    | 'host_shell'
    | 'native_host_build_only'
    | 'serial_transport'
    | 'project'
    | 'platformio_cli'
    | 'native_host_build_only';
  detectedFrom: string;
  blocking: boolean;
  affects: Array<'all_platformio' | 'native_build' | 'upload' | 'monitor'>;
  summary: string;
}

export interface DoctorFixSuggestion {
  problemCode: DoctorProblem['problemCode'];
  fixId:
    | 'set_platformio_cli_env_hint'
    | 'activate_local_platformio_cli'
    | 'install_host_cpp_compiler_via_winget'
    | 'suggest_close_serial_consumers'
    | 'recheck_only';
  fixKind:
    | 'env_hint'
    | 'local_activation'
    | 'package_install'
    | 'manual_guidance'
    | 'recheck';
  canAutoFix: boolean;
  requiresConfirmation: boolean;
  platformSupport: Array<'windows' | 'macos' | 'linux'>;
  summary: string;
  commands: string[];
  expectedImpact: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DoctorRepairReadiness {
  hasAutoFixes: boolean;
  hasConfirmationRequiredFixes: boolean;
  hasManualOnlyFixes: boolean;
  recommendedFixIds: DoctorFixSuggestion['fixId'][];
  manualProblemCodes: DoctorProblem['problemCode'][];
}

export interface DoctorRecheckSummary {
  resolvedProblemCodes: DoctorProblem['problemCode'][];
  remainingProblemCodes: DoctorProblem['problemCode'][];
  newProblemCodes: DoctorProblem['problemCode'][];
  stillBlocking: boolean;
  readyForBuild: boolean;
  readyForUpload: boolean;
  readyForMonitor: boolean;
}

export interface DoctorReport {
  nodeVersion: string;
  platformio: {
    installed: boolean;
    version?: string;
    cliPath?: string;
    shellCallable: boolean;
    pythonExecutable?: string;
  };
  project?: ProjectInspection;
  devices: {
    count: number;
    items: SerialDevice[];
  };
  projectReadiness: DoctorReadiness;
  deviceReadiness: DoctorReadiness;
  monitorReadiness: DoctorReadiness;
  remoteReadiness: DoctorReadiness;
  readyForBuild: boolean;
  readyForUpload: boolean;
  readyForMonitor: boolean;
  blockingIssues: string[];
  detectedProblems: DoctorProblem[];
  fixSuggestions: DoctorFixSuggestion[];
  repairReadiness: DoctorRepairReadiness;
  warnings: string[];
}
