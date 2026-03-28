export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PlatformInfo {
  name: string;
  title: string;
  version?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  frameworks?: string[];
  packages?: string[];
}

export interface ToolNextAction {
  tool: string;
  reason: string;
  arguments?: Record<string, unknown>;
}

export interface ToolResponse<TData = unknown> {
  status: 'ok' | 'warning' | 'error';
  summary: string;
  data: TData;
  warnings: string[];
  nextActions: ToolNextAction[];
}

export interface ExecutionResultMeta {
  operationType: 'doctor' | 'inspect' | 'build' | 'upload' | 'monitor' | 'repair';
  executionStatus: 'succeeded' | 'failed' | 'blocked' | 'not_applicable';
  verificationStatus:
    | 'healthy'
    | 'degraded'
    | 'failed'
    | 'indeterminate'
    | 'not_requested';
  failureCategory?: string;
  retryHint?: string;
  resolvedEnvironment?: string;
  resolvedPort?: string;
  resolvedBaud?: number;
  resolutionSource?: string;
}
