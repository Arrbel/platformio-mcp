import { z } from 'zod';

export interface MonitorConfig {
  port?: string;
  baud?: number;
  projectDir?: string;
}

export const MonitorConfigSchema = z.object({
  port: z.string().optional(),
  baud: z.number().positive().optional(),
  projectDir: z.string().optional(),
});

export interface MonitorResult {
  success: boolean;
  message: string;
  command?: string;
  mode?: 'instructions' | 'capture' | 'session';
  sessionId?: string;
  transportType?: 'serial' | 'socket' | 'rfc2217';
  endpoint?: string;
  source?: 'local' | 'remote-bridge';
  filters?: string[];
  resolvedPort?: string;
  resolvedBaud?: number;
  resolvedEnvironment?: string;
  resolutionSource?: string;
  monitorStatus?:
    | 'instructions_only'
    | 'captured_output'
    | 'no_output'
    | 'timeout'
    | 'port_open_failed'
    | 'session_opened'
    | 'session_closed'
    | 'session_read_timeout';
  verificationStatus?:
    | 'healthy'
    | 'degraded'
    | 'failed'
    | 'not_requested'
    | 'indeterminate';
  matchedPatterns?: string[];
  healthSignals?: string[];
  degradedSignals?: string[];
  failureSignals?: string[];
  parsedJsonMessages?: Record<string, unknown>[];
  rawOutputExcerpt?: string;
  failureCategory?: string;
  retryHint?: string;
  output?: string[];
  timedOut?: boolean;
}

export interface MonitorVerificationProfile {
  expectedPatterns?: string[];
  expectedJsonFields?: string[];
  expectedJsonNonNull?: string[];
  expectedJsonValues?: Record<string, string | number | boolean | null>;
  allowedNullFields?: string[];
  expectedCycleSeconds?: number;
  expectedCycleToleranceSeconds?: number;
  minJsonMessages?: number;
}

export interface MonitorSessionOpenConfig {
  port?: string;
  baud?: number;
  projectDir?: string;
  echo?: boolean;
  filters?: string[];
  raw?: boolean;
  eol?: 'CR' | 'LF' | 'CRLF';
}

export interface MonitorSessionReadConfig extends MonitorVerificationProfile {
  sessionId: string;
  durationMs?: number;
  maxLines?: number;
}

export interface MonitorSessionWriteConfig {
  sessionId: string;
  data: string;
}

export interface MonitorSessionCloseConfig {
  sessionId: string;
}
