/**
 * Serial monitor tools
 */

import type { MonitorResult } from '../types.js';
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
  eol?: 'CR' | 'LF' | 'CRLF'
): Promise<MonitorResult> {
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

    return {
      success: true,
      message: `Captured ${capture.output.length} line(s) from the serial monitor.`,
      command: capture.command,
      mode: 'capture',
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
