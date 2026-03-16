/**
 * Serial monitor tools
 */

import type { MonitorResult, MonitorVerificationProfile } from '../types.js';
import {
  captureMonitorOutput,
  getPlatformIOBinaryPath,
} from '../platformio.js';
import {
  validateSerialPort,
  validateBaudRate,
  validateProjectPath,
} from '../utils/validation.js';
import { PlatformIOError } from '../utils/errors.js';
import { resolveProjectEnvironment } from './projects.js';

function quoteShellValue(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function evaluateMonitorVerification(
  output: string[],
  profile?: MonitorVerificationProfile
): {
  verificationStatus: MonitorResult['verificationStatus'];
  matchedPatterns: string[];
  healthSignals: string[];
  degradedSignals: string[];
  failureSignals: string[];
  parsedJsonMessages: Record<string, unknown>[];
  rawOutputExcerpt: string;
  failureCategory?: string;
  retryHint?: string;
} {
  const expectedPatterns = profile?.expectedPatterns ?? [];
  const expectedJsonFields = profile?.expectedJsonFields ?? [];
  const expectedJsonNonNull = profile?.expectedJsonNonNull ?? [];
  const expectedJsonValues = profile?.expectedJsonValues ?? {};
  const allowedNullFields = new Set(profile?.allowedNullFields ?? []);
  const minJsonMessages = profile?.minJsonMessages ?? 0;
  const expectedCycleSeconds = profile?.expectedCycleSeconds;
  const expectedCycleToleranceSeconds =
    profile?.expectedCycleToleranceSeconds ?? 0;
  const healthSignals: string[] = [];
  const degradedSignals: string[] = [];
  const failureSignals: string[] = [];
  const rawOutputExcerpt = output.join('\n').slice(0, 1200);

  const parsedJsonMessages = output
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{') && line.endsWith('}'))
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return undefined;
      }
    })
    .filter((row): row is Record<string, unknown> => Boolean(row));

  if (
    expectedPatterns.length === 0 &&
    expectedJsonFields.length === 0 &&
    expectedJsonNonNull.length === 0 &&
    Object.keys(expectedJsonValues).length === 0 &&
    minJsonMessages === 0 &&
    expectedCycleSeconds === undefined
  ) {
    return {
      verificationStatus: 'not_requested',
      matchedPatterns: [],
      healthSignals,
      degradedSignals,
      failureSignals,
      parsedJsonMessages,
      rawOutputExcerpt,
    };
  }

  if (output.length === 0) {
    return {
      verificationStatus: 'indeterminate',
      matchedPatterns: [],
      healthSignals,
      degradedSignals,
      failureSignals: ['no_output'],
      parsedJsonMessages,
      rawOutputExcerpt,
      failureCategory: 'no_output',
      retryHint: 'increase_capture_window_or_check_port',
    };
  }

  const joined = output.join('\n');
  const lowerJoined = joined.toLowerCase();

  if (
    lowerJoined.includes('could not open port') ||
    lowerJoined.includes('permissionerror') ||
    lowerJoined.includes('access is denied')
  ) {
    return {
      verificationStatus: 'indeterminate',
      matchedPatterns: [],
      healthSignals,
      degradedSignals,
      failureSignals: ['serial_port_busy'],
      parsedJsonMessages,
      rawOutputExcerpt,
      failureCategory: 'port_unavailable',
      retryHint: 'close_serial_consumers_and_retry',
    };
  }

  const matchedPatterns = expectedPatterns.filter((pattern) =>
    joined.includes(pattern)
  );
  const missingPatterns = expectedPatterns.filter(
    (pattern) => !matchedPatterns.includes(pattern)
  );
  if (expectedPatterns.length > 0 && missingPatterns.length === 0) {
    healthSignals.push('expected_patterns_matched');
  }
  for (const pattern of missingPatterns) {
    failureSignals.push(`missing_expected_pattern:${pattern}`);
  }

  const jsonFieldChecksPass =
    expectedJsonFields.length === 0 ||
    parsedJsonMessages.some((row) =>
      expectedJsonFields.every((field) =>
        Object.prototype.hasOwnProperty.call(row, field)
      )
    );
  const missingJsonFields = expectedJsonFields.filter(
    (field) =>
      !parsedJsonMessages.some((row) =>
        Object.prototype.hasOwnProperty.call(row, field)
      )
  );
  if (expectedJsonFields.length > 0 && jsonFieldChecksPass) {
    healthSignals.push('json_fields_present');
  }
  for (const field of missingJsonFields) {
    failureSignals.push(`missing_json_field:${field}`);
  }

  const jsonNonNullChecksPass =
    expectedJsonNonNull.length === 0 ||
    parsedJsonMessages.some((row) =>
      expectedJsonNonNull.every(
        (field) =>
          Object.prototype.hasOwnProperty.call(row, field) &&
          row[field] !== null &&
          row[field] !== undefined
      )
    );
  const nullJsonFields = expectedJsonNonNull.filter(
    (field) =>
      !parsedJsonMessages.some(
        (row) =>
          Object.prototype.hasOwnProperty.call(row, field) &&
          row[field] !== null &&
          row[field] !== undefined
      )
  );
  if (expectedJsonNonNull.length > 0 && jsonNonNullChecksPass) {
    healthSignals.push('json_non_null_fields_present');
  }
  for (const field of nullJsonFields) {
    failureSignals.push(`null_json_field:${field}`);
  }

  const jsonValueChecksPass =
    Object.keys(expectedJsonValues).length === 0 ||
    parsedJsonMessages.some((row) =>
      Object.entries(expectedJsonValues).every(
        ([field, expectedValue]) => row[field] === expectedValue
      )
    );
  const mismatchedJsonValues = Object.entries(expectedJsonValues)
    .filter(
      ([field, expectedValue]) =>
        !parsedJsonMessages.some((row) => row[field] === expectedValue)
    )
    .map(([field]) => field);
  if (Object.keys(expectedJsonValues).length > 0 && jsonValueChecksPass) {
    healthSignals.push('json_values_match');
  }
  for (const field of mismatchedJsonValues) {
    failureSignals.push(`json_value_mismatch:${field}`);
  }

  const jsonCountChecksPass =
    minJsonMessages === 0 || parsedJsonMessages.length >= minJsonMessages;
  if (minJsonMessages > 0) {
    if (jsonCountChecksPass) {
      healthSignals.push('json_message_count_sufficient');
    } else {
      failureSignals.push('insufficient_json_messages');
    }
  }

  let cycleChecksPass = expectedCycleSeconds === undefined;
  if (
    expectedCycleSeconds !== undefined &&
    parsedJsonMessages.length >= Math.max(2, minJsonMessages)
  ) {
    const timestamps = parsedJsonMessages
      .map((row) => row.timestamp)
      .filter((value): value is number => typeof value === 'number');
    if (timestamps.length >= 2) {
      const deltas = timestamps
        .slice(1)
        .map((value, index) => value - timestamps[index]);
      cycleChecksPass = deltas.every(
        (delta) =>
          Math.abs(delta - expectedCycleSeconds) <=
          expectedCycleToleranceSeconds
      );
      const strictlyIncreasing = deltas.every((delta) => delta > 0);
      if (strictlyIncreasing && cycleChecksPass) {
        healthSignals.push('node_loop_healthy');
      } else if (!strictlyIncreasing) {
        failureSignals.push('node_output_stalled');
      } else {
        failureSignals.push('unexpected_cycle_timing');
      }
    } else {
      cycleChecksPass = false;
      failureSignals.push('insufficient_json_messages');
    }
  }

  if (parsedJsonMessages.length > 0) {
    healthSignals.push('node_online_basic');
  }

  const lastJson = parsedJsonMessages[parsedJsonMessages.length - 1];
  if (
    lastJson &&
    ['air_temp', 'air_humidity', 'soil_moisture'].every(
      (field) => lastJson[field] !== null && lastJson[field] !== undefined
    )
  ) {
    healthSignals.push('sensor_core_present');
  }
  if (
    lastJson?.device_id !== undefined &&
    Object.keys(expectedJsonValues).includes('device_id') &&
    lastJson.device_id === expectedJsonValues.device_id
  ) {
    healthSignals.push('device_identity_match');
  }

  if (lastJson) {
    for (const field of allowedNullFields) {
      if (allowedNullFields.has(field) && lastJson[field] === null) {
        degradedSignals.push(`allowed_null_field:${field}`);
      }
    }
  }

  const patternChecksPass =
    expectedPatterns.length === 0 || missingPatterns.length === 0;

  const fullyMatched =
    patternChecksPass &&
    jsonFieldChecksPass &&
    jsonNonNullChecksPass &&
    jsonValueChecksPass &&
    jsonCountChecksPass &&
    cycleChecksPass &&
    !failureSignals.includes('node_output_stalled');

  if (fullyMatched) {
    return {
      verificationStatus: degradedSignals.length > 0 ? 'degraded' : 'healthy',
      matchedPatterns,
      healthSignals,
      degradedSignals,
      failureSignals,
      parsedJsonMessages,
      rawOutputExcerpt,
    };
  }

  const indeterminateFailures = [
    'no_output',
    'serial_port_busy',
    'insufficient_json_messages',
  ];
  if (
    failureSignals.length > 0 &&
    failureSignals.every((signal) => indeterminateFailures.includes(signal))
  ) {
    return {
      verificationStatus: 'indeterminate',
      matchedPatterns,
      healthSignals,
      degradedSignals,
      failureSignals,
      parsedJsonMessages,
      rawOutputExcerpt,
      failureCategory: failureSignals.includes('serial_port_busy')
        ? 'port_unavailable'
        : 'insufficient_runtime_evidence',
      retryHint: failureSignals.includes('serial_port_busy')
        ? 'close_serial_consumers_and_retry'
        : 'increase_capture_window_or_collect_more_messages',
    };
  }

  return {
    verificationStatus: 'failed',
    matchedPatterns,
    healthSignals,
    degradedSignals,
    failureSignals,
    parsedJsonMessages,
    rawOutputExcerpt,
    failureCategory: failureSignals.includes('node_output_stalled')
      ? 'node_output_stalled'
      : failureSignals.includes('unexpected_cycle_timing')
        ? 'unexpected_cycle_timing'
        : 'expected_output_not_found',
    retryHint: failureSignals.includes('node_output_stalled')
      ? 'retry_capture_and_check_firmware_loop'
      : failureSignals.includes('unexpected_cycle_timing')
        ? 'review_sampling_loop_timing'
        : 'review_firmware_output_or_retry_capture',
  };
}

function buildMonitorArgs(options: {
  port?: string;
  baud?: number;
  echo?: boolean;
  filters?: string[];
  raw?: boolean;
  eol?: 'CR' | 'LF' | 'CRLF';
}): string[] {
  const args = ['device', 'monitor'];

  if (options.port) {
    args.push('--port', options.port);
  }

  if (options.baud) {
    args.push('--baud', String(options.baud));
  }

  if (options.echo === true) {
    args.push('--echo');
  }

  if (options.eol) {
    args.push('--eol', options.eol);
  }

  if (options.raw === true) {
    args.push('--raw');
  }

  if (options.filters) {
    for (const filter of options.filters) {
      args.push('--filter', filter);
    }
  }

  return args;
}

function buildMonitorCommand(
  executable: string,
  args: string[],
  projectDir?: string
): string {
  const executablePart =
    executable.includes(' ') ||
    executable.includes('/') ||
    executable.includes('\\') ||
    executable.includes(':')
      ? quoteShellValue(executable)
      : executable;
  const command = `${executablePart} ${args.join(' ')}`.trim();
  return projectDir
    ? `cd ${quoteShellValue(projectDir)} && ${command}`
    : command;
}

/**
 * Provides information and command for starting a serial monitor
 * Note: The actual monitor is interactive and can't run in the background,
 * so we return instructions for the user
 */
export async function startMonitor(
  port?: string,
  baud?: number,
  projectDir?: string,
  captureDurationMs?: number,
  maxLines?: number,
  echo?: boolean,
  filters?: string[],
  raw?: boolean,
  eol?: 'CR' | 'LF' | 'CRLF',
  expectedPatterns?: string[],
  expectedJsonFields?: string[],
  expectedJsonNonNull?: string[],
  expectedJsonValues?: Record<string, string | number | boolean | null>,
  allowedNullFields?: string[],
  expectedCycleSeconds?: number,
  expectedCycleToleranceSeconds?: number,
  minJsonMessages?: number
): Promise<MonitorResult> {
  const explicitPort = port;

  // Validate inputs
  if (port && !validateSerialPort(port)) {
    throw new PlatformIOError(`Invalid serial port: ${port}`, 'INVALID_PORT', {
      port,
    });
  }

  if (baud && !validateBaudRate(baud)) {
    throw new PlatformIOError(`Invalid baud rate: ${baud}`, 'INVALID_BAUD', {
      baud,
    });
  }

  if (projectDir) {
    try {
      projectDir = validateProjectPath(projectDir);
    } catch (error) {
      throw new PlatformIOError(
        `Invalid project directory: ${error}`,
        'INVALID_PATH',
        { projectDir }
      );
    }
  }

  if (projectDir && (!port || !baud)) {
    try {
      const resolvedEnvironment = await resolveProjectEnvironment(projectDir);
      port ??= resolvedEnvironment?.monitorPort;
      baud ??= resolvedEnvironment?.monitorSpeed;
    } catch {
      // If the directory is not a valid PlatformIO project yet, still return a usable monitor command.
    }
  }

  const monitorArgs = buildMonitorArgs({
    port,
    baud,
    echo,
    filters,
    raw,
    eol,
  });
  const monitorExecutable = (await getPlatformIOBinaryPath()) ?? 'pio';
  const resolvedEnvironment = projectDir
    ? await resolveProjectEnvironment(projectDir).catch(() => undefined)
    : undefined;
  const command = buildMonitorCommand(
    monitorExecutable,
    monitorArgs,
    projectDir
  );

  if (captureDurationMs || maxLines) {
    const capture = await captureMonitorOutput({
      args: monitorArgs,
      cwd: projectDir,
      durationMs: captureDurationMs,
      maxLines,
    });
    const verification = evaluateMonitorVerification(capture.output, {
      expectedPatterns,
      expectedJsonFields,
      expectedJsonNonNull,
      expectedJsonValues,
      allowedNullFields,
      expectedCycleSeconds,
      expectedCycleToleranceSeconds,
      minJsonMessages,
    });

    return {
      success: true,
      message: `Captured ${capture.output.length} line(s) from the serial monitor.`,
      command: capture.command,
      mode: 'capture',
      resolvedPort: port,
      resolvedBaud: baud,
      resolvedEnvironment: resolvedEnvironment?.name,
      resolutionSource: explicitPort
        ? 'explicit_argument'
        : resolvedEnvironment?.monitorPort
          ? 'project_monitor_port'
          : resolvedEnvironment?.name
            ? 'environment_resolution'
            : undefined,
      monitorStatus:
        verification.failureCategory === 'port_unavailable'
          ? 'port_open_failed'
          : capture.output.length === 0
            ? capture.timedOut
              ? 'timeout'
              : 'no_output'
            : 'captured_output',
      verificationStatus: verification.verificationStatus,
      matchedPatterns: verification.matchedPatterns,
      healthSignals: verification.healthSignals,
      degradedSignals: verification.degradedSignals,
      failureSignals: verification.failureSignals,
      parsedJsonMessages: verification.parsedJsonMessages,
      rawOutputExcerpt: verification.rawOutputExcerpt,
      failureCategory: verification.failureCategory,
      retryHint: verification.retryHint,
      output: capture.output,
      timedOut: capture.timedOut,
    };
  }

  const message =
    'Serial monitor requires interactive terminal access. ' +
    'Please run the following command in your terminal:\n\n' +
    `  ${command}\n\n` +
    'Press Ctrl+C to exit the monitor.\n\n' +
    'Note: If port and baud rate are not specified, PlatformIO will auto-detect them ' +
    'from your platformio.ini configuration.';

  return {
    success: true,
    message,
    command,
    mode: 'instructions',
    resolvedPort: port,
    resolvedBaud: baud,
    resolvedEnvironment: resolvedEnvironment?.name,
    resolutionSource: explicitPort
      ? 'explicit_argument'
      : resolvedEnvironment?.monitorPort
        ? 'project_monitor_port'
        : resolvedEnvironment?.name
          ? 'environment_resolution'
          : undefined,
    monitorStatus: 'instructions_only',
    verificationStatus: 'not_requested',
  };
}

/**
 * Gets the monitor command string for a project
 */
export function getMonitorCommand(
  port?: string,
  baud?: number,
  projectDir?: string
): string {
  return buildMonitorCommand(
    'pio',
    buildMonitorArgs({ port, baud }),
    projectDir
  );
}

/**
 * Gets monitor command with custom filters
 */
export function getMonitorCommandWithFilters(options: {
  port?: string;
  baud?: number;
  projectDir?: string;
  filters?: string[];
  echo?: boolean;
  eol?: 'CR' | 'LF' | 'CRLF';
  raw?: boolean;
}): string {
  return buildMonitorCommand(
    'pio',
    buildMonitorArgs({
      port: options.port,
      baud: options.baud,
      echo: options.echo,
      filters: options.filters,
      eol: options.eol,
      raw: options.raw,
    }),
    options.projectDir
  );
}

/**
 * Provides instructions for using the raw monitor mode
 */
export function getRawMonitorInstructions(
  port: string,
  baud: number
): MonitorResult {
  if (!validateSerialPort(port)) {
    throw new PlatformIOError(`Invalid serial port: ${port}`, 'INVALID_PORT', {
      port,
    });
  }

  if (!validateBaudRate(baud)) {
    throw new PlatformIOError(`Invalid baud rate: ${baud}`, 'INVALID_BAUD', {
      baud,
    });
  }

  const command = buildMonitorCommand(
    'pio',
    buildMonitorArgs({ port, baud, raw: true })
  );

  const message =
    'Raw monitor mode provides unfiltered serial output.\n' +
    'Run the following command in your terminal:\n\n' +
    `  ${command}\n\n` +
    'Press Ctrl+C to exit the monitor.';

  return {
    success: true,
    message,
    command,
    mode: 'instructions',
  };
}
