/**
 * PlatformIO CLI wrapper and command execution
 */

import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import type { CommandResult } from './types.js';
import {
  PlatformIONotInstalledError,
  PlatformIOError,
  CommandTimeoutError,
  isPlatformIONotFoundError,
} from './utils/errors.js';

const execFileAsync = promisify(execFile);
const PLATFORMIO_PATH_ENV = 'PLATFORMIO_CLI_PATH';
let cachedPlatformIOBinary: string | null = null;

// Default timeout for commands (5 minutes for builds)
const DEFAULT_TIMEOUT = 300000; // 5 minutes

function getPlatformIOCandidates(): string[] {
  const configuredBinary = process.env[PLATFORMIO_PATH_ENV]?.trim();
  return [configuredBinary, 'pio', 'platformio'].filter(
    (value): value is string => Boolean(value)
  );
}

async function findPlatformIOBinary(): Promise<string> {
  if (cachedPlatformIOBinary) {
    return cachedPlatformIOBinary;
  }

  for (const candidate of getPlatformIOCandidates()) {
    try {
      await execFileAsync(candidate, ['--version'], {
        timeout: 5000,
        windowsHide: true,
      });
      cachedPlatformIOBinary = candidate;
      return candidate;
    } catch (error) {
      if (!isPlatformIONotFoundError(error)) {
        cachedPlatformIOBinary = candidate;
        return candidate;
      }
    }
  }

  throw new PlatformIONotInstalledError();
}

export async function getPlatformIOBinaryPath(): Promise<string | undefined> {
  try {
    return await findPlatformIOBinary();
  } catch (error) {
    if (error instanceof PlatformIONotInstalledError) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Executes a PlatformIO CLI command
 */
export async function execPioCommand(
  args: string[],
  options: {
    cwd?: string;
    timeout?: number;
    parseJson?: boolean;
  } = {}
): Promise<CommandResult> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  try {
    const platformioBinary = await findPlatformIOBinary();
    const result = await execFileAsync(platformioBinary, args, {
      cwd: options.cwd,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      windowsHide: true,
    });

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: 0,
    };
  } catch (error: unknown) {
    // Handle timeout
    if (
      typeof error === 'object' &&
      error !== null &&
      'killed' in error &&
      'signal' in error &&
      error.killed === true &&
      error.signal === 'SIGTERM'
    ) {
      throw new CommandTimeoutError(args.join(' '), timeout);
    }

    // Handle not found
    if (isPlatformIONotFoundError(error)) {
      throw new PlatformIONotInstalledError();
    }

    // Handle execution error with exit code
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'stdout' in error &&
      'stderr' in error
    ) {
      return {
        stdout: String(error.stdout || ''),
        stderr: String(error.stderr || ''),
        exitCode: Number(error.code),
      };
    }

    throw error;
  }
}

/**
 * Parses JSON output from PlatformIO and validates with Zod schema
 */
export function parsePioJsonOutput<T>(
  output: string,
  schema: z.ZodSchema<T>
): T {
  if (!output || output.trim().length === 0) {
    throw new PlatformIOError('Empty output from PlatformIO command');
  }

  try {
    const parsed = JSON.parse(output);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new PlatformIOError(
        `Failed to parse PlatformIO output: ${error.message}`,
        'PARSE_ERROR',
        { zodError: error.errors, output: output.substring(0, 500) }
      );
    }
    if (error instanceof SyntaxError) {
      throw new PlatformIOError(
        `Invalid JSON output from PlatformIO: ${error.message}`,
        'INVALID_JSON',
        { output: output.substring(0, 500) }
      );
    }
    throw error;
  }
}

/**
 * Checks if PlatformIO CLI is installed and accessible
 */
export async function checkPlatformIOInstalled(): Promise<boolean> {
  try {
    const result = await execPioCommand(['--version'], { timeout: 5000 });
    return result.exitCode === 0 && result.stdout.includes('PlatformIO');
  } catch (error) {
    if (error instanceof PlatformIONotInstalledError) {
      return false;
    }
    throw error;
  }
}

/**
 * Gets the PlatformIO version
 */
export async function getPlatformIOVersion(): Promise<string> {
  try {
    const result = await execPioCommand(['--version'], { timeout: 5000 });
    if (result.exitCode === 0) {
      // Output format: "PlatformIO Core, version X.Y.Z"
      const match = result.stdout.match(/version\s+([\d.]+)/i);
      return match ? match[1] : result.stdout.trim();
    }
    throw new PlatformIOError('Failed to get PlatformIO version');
  } catch (error) {
    if (error instanceof PlatformIONotInstalledError) {
      throw error;
    }
    throw new PlatformIOError('Failed to get PlatformIO version');
  }
}

export async function captureMonitorOutput(options: {
  args: string[];
  cwd?: string;
  durationMs?: number;
  maxLines?: number;
}): Promise<{
  command: string;
  output: string[];
  timedOut: boolean;
}> {
  const platformioBinary = await findPlatformIOBinary();
  const durationMs = options.durationMs ?? 2000;
  const maxLines = options.maxLines ?? 50;

  return new Promise((resolve, reject) => {
    const command = `${platformioBinary} ${options.args.join(' ')}`.trim();
    const child = spawn(platformioBinary, options.args, {
      cwd: options.cwd,
      windowsHide: true,
    });
    const output: string[] = [];
    let settled = false;
    let timedOut = false;
    let pendingStdout = '';

    const stopCapture = () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    };

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      if (pendingStdout.trim()) {
        output.push(pendingStdout.trim());
      }
      resolve({
        command,
        output: output.slice(0, maxLines),
        timedOut,
      });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      stopCapture();
    }, durationMs);

    child.stdout.on('data', (chunk: string | Buffer) => {
      pendingStdout += chunk.toString();
      const lines = pendingStdout.split(/\r?\n/);
      pendingStdout = lines.pop() ?? '';

      for (const line of lines) {
        const normalized = line.trim();
        if (normalized) {
          output.push(normalized);
        }
        if (output.length >= maxLines) {
          stopCapture();
          break;
        }
      }
    });

    child.stderr.on('data', (chunk: string | Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        output.push(text);
      }
      if (output.length >= maxLines) {
        stopCapture();
      }
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      if (isPlatformIONotFoundError(error)) {
        reject(new PlatformIONotInstalledError());
        return;
      }
      reject(error);
    });

    child.on('close', () => {
      clearTimeout(timer);
      finish();
    });
  });
}

/**
 * Class that encapsulates PlatformIO CLI operations
 */
export class PlatformIOExecutor {
  constructor() {}

  /**
   * Executes a PlatformIO command
   */
  async execute(
    command: string,
    args: string[],
    options?: { cwd?: string; timeout?: number }
  ): Promise<CommandResult> {
    const fullArgs = [command, ...args];
    return execPioCommand(fullArgs, options);
  }

  /**
   * Checks if PlatformIO is installed
   */
  async checkInstallation(): Promise<boolean> {
    return checkPlatformIOInstalled();
  }

  /**
   * Gets PlatformIO version
   */
  async getVersion(): Promise<string> {
    return getPlatformIOVersion();
  }

  /**
   * Executes a command and parses JSON output
   */
  async executeWithJsonOutput<T>(
    command: string,
    args: string[],
    schema: z.ZodSchema<T>,
    options?: { cwd?: string; timeout?: number }
  ): Promise<T> {
    // Ensure --json-output is included
    const fullArgs = [...args];
    if (!fullArgs.includes('--json-output')) {
      fullArgs.push('--json-output');
    }

    const result = await this.execute(command, fullArgs, options);

    if (result.exitCode !== 0) {
      throw new PlatformIOError(
        `PlatformIO command failed: ${command} ${args.join(' ')}`,
        'COMMAND_FAILED',
        { stderr: result.stderr, exitCode: result.exitCode }
      );
    }

    return parsePioJsonOutput(result.stdout, schema);
  }
}

/**
 * Global executor instance
 */
export const platformioExecutor = new PlatformIOExecutor();
