/**
 * PlatformIO CLI wrapper and command execution
 */

import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import { z } from 'zod';
import type { CommandResult, ProjectMetadata } from './types.js';
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

async function getPersistedPlatformIOCliPath(): Promise<string | undefined> {
  if (process.platform !== 'win32') {
    return undefined;
  }

  try {
    const result = await execFileAsync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `[Environment]::GetEnvironmentVariable('${PLATFORMIO_PATH_ENV}', 'User')`,
      ],
      {
        timeout: 5000,
        windowsHide: true,
      }
    );
    const value = result.stdout.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

async function getPlatformIOCandidates(): Promise<string[]> {
  const configuredBinary = process.env[PLATFORMIO_PATH_ENV]?.trim();
  const persistedBinary = await getPersistedPlatformIOCliPath();
  return [
    configuredBinary,
    persistedBinary,
    getLocalPlatformIODefaultPath(),
    'pio',
    'platformio',
  ].filter((value, index, values): value is string => {
    return Boolean(value) && values.indexOf(value) === index;
  });
}

function getLocalPlatformIODefaultPath(): string | undefined {
  if (process.platform === 'win32') {
    const profile = process.env.USERPROFILE?.trim();
    return profile
      ? `${profile}\\.platformio\\penv\\Scripts\\pio.exe`
      : undefined;
  }
  const home = process.env.HOME?.trim();
  return home ? `${home}/.platformio/penv/bin/pio` : undefined;
}

async function findPlatformIOBinary(): Promise<string> {
  if (cachedPlatformIOBinary) {
    return cachedPlatformIOBinary;
  }

  for (const candidate of await getPlatformIOCandidates()) {
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

export function getRecommendedPlatformIOCliPath(): string | undefined {
  return getLocalPlatformIODefaultPath();
}

export async function isPlatformIOShellCallable(): Promise<boolean> {
  const configuredBinary = process.env[PLATFORMIO_PATH_ENV]?.trim();
  if (configuredBinary) {
    return true;
  }

  const persistedBinary = await getPersistedPlatformIOCliPath();
  if (persistedBinary) {
    return true;
  }

  for (const candidate of ['pio', 'platformio']) {
    try {
      await execFileAsync(candidate, ['--version'], {
        timeout: 5000,
        windowsHide: true,
      });
      return true;
    } catch (error) {
      if (!isPlatformIONotFoundError(error)) {
        return true;
      }
    }
  }

  return false;
}

export async function getPlatformIOPythonExecutable(): Promise<
  string | undefined
> {
  const binary = await getPlatformIOBinaryPath();
  if (!binary) {
    return undefined;
  }

  const normalized = binary.replace(/\\/g, '/').toLowerCase();
  if (normalized.endsWith('/platformio.exe') || normalized.endsWith('/pio.exe')) {
    return binary.replace(/(platformio|pio)\.exe$/i, 'python.exe');
  }
  if (normalized.endsWith('/platformio') || normalized.endsWith('/pio')) {
    return binary.replace(/(platformio|pio)$/i, 'python');
  }
  return undefined;
}

export async function checkRemoteCliAvailable(): Promise<{
  available: boolean;
  installTriggered: boolean;
}> {
  const result = await execPioCommand(['remote', '--help'], { timeout: 15000 });
  const combined = `${result.stdout}\n${result.stderr}`;
  const installTriggered =
    combined.toLowerCase().includes('pioremote') ||
    combined.toLowerCase().includes('contrib-pioremote') ||
    combined.toLowerCase().includes('installing');

  return {
    available: result.exitCode === 0,
    installTriggered,
  };
}

export async function detectHostCppToolchain(): Promise<{
  available: boolean;
  shellCallable: boolean;
  detectedCompilers: string[];
  packageManager: 'winget' | 'choco' | 'none';
}> {
  const compilerCandidates =
    process.platform === 'win32'
      ? ['g++', 'cl']
      : ['g++', 'clang++'];
  const detectedCompilers: string[] = [];

  for (const candidate of compilerCandidates) {
    try {
      const args = candidate === 'cl' ? [] : ['--version'];
      await execFileAsync(candidate, args, {
        timeout: 5000,
        windowsHide: true,
      });
      detectedCompilers.push(candidate);
    } catch (error) {
      if (!isPlatformIONotFoundError(error)) {
        detectedCompilers.push(candidate);
      }
    }
  }

  if (process.platform === 'win32' && detectedCompilers.length === 0) {
    const localCandidates = [
      'C:\\Program Files\\LLVM\\bin\\clang++.exe',
      'C:\\Program Files\\LLVM\\bin\\g++.exe',
    ];

    for (const candidate of localCandidates) {
      try {
        await fs.access(candidate);
        detectedCompilers.push(candidate);
      } catch {
        // Keep probing other standard install locations.
      }
    }
  }

  let packageManager: 'winget' | 'choco' | 'none' = 'none';
  try {
    await execFileAsync('winget', ['--version'], {
      timeout: 5000,
      windowsHide: true,
    });
    packageManager = 'winget';
  } catch {
    try {
      await execFileAsync('choco', ['--version'], {
        timeout: 5000,
        windowsHide: true,
      });
      packageManager = 'choco';
    } catch {
      packageManager = 'none';
    }
  }

  return {
    available: detectedCompilers.length > 0,
    shellCallable: detectedCompilers.length > 0,
    detectedCompilers,
    packageManager,
  };
}

export async function probeSerialPortBusy(port?: string): Promise<{
  port?: string;
  busy: boolean;
  failureCategory?: string;
  retryHint?: string;
}> {
  if (!port || process.platform !== 'win32') {
    return {
      port,
      busy: false,
    };
  }

  try {
    await execFileAsync('mode', [port], {
      timeout: 5000,
      windowsHide: true,
      shell: true,
    });
    return {
      port,
      busy: false,
    };
  } catch {
    return {
      port,
      busy: true,
      failureCategory: 'port_unavailable',
      retryHint: 'close_serial_consumers_and_retry',
    };
  }
}

const ProjectMetadataEntrySchema = z.object({
  build_type: z.string().optional(),
  env_name: z.string().optional(),
  includes: z.record(z.array(z.string())).optional(),
  defines: z.array(z.string()).optional(),
  cc_path: z.string().optional(),
  cxx_path: z.string().optional(),
  gdb_path: z.string().optional(),
  prog_path: z.string().optional(),
  compiler_type: z.string().nullable().optional(),
  targets: z
    .array(
      z.union([
        z.string(),
        z.object({
          name: z.string(),
          title: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          group: z.string().optional().nullable(),
        }),
      ])
    )
    .optional(),
  extra: z.record(z.unknown()).optional(),
});

export async function getProjectMetadata(
  projectDir: string,
  environment?: string
): Promise<ProjectMetadata> {
  const args = ['project', 'metadata', '--json-output'];
  if (environment) {
    args.push('--environment', environment);
  }

  const result = await execPioCommand(args, {
    cwd: projectDir,
    timeout: 120000,
  });

  if (result.exitCode !== 0) {
    throw new PlatformIOError('Failed to read PlatformIO project metadata', 'COMMAND_FAILED', {
      stderr: result.stderr,
      exitCode: result.exitCode,
      projectDir,
      environment,
    });
  }

  const parsed = JSON.parse(result.stdout) as unknown;
  let metadataCandidate: unknown;

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    ('build_type' in parsed || 'env_name' in parsed)
  ) {
    metadataCandidate = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    metadataCandidate =
      (environment ? record[environment] : undefined) ??
      Object.values(record).find(
        (entry) => typeof entry === 'object' && entry !== null
      );
  }

  const metadata = metadataCandidate
    ? ProjectMetadataEntrySchema.parse(metadataCandidate)
    : undefined;

  if (!metadata) {
    throw new PlatformIOError(
      'Project metadata response did not contain any environment entries',
      'PARSE_ERROR',
      { projectDir, environment, output: result.stdout.substring(0, 500) }
    );
  }

  return {
    envName: metadata.env_name,
    buildType: metadata.build_type,
    toolchain: {
      ccPath: metadata.cc_path,
      cxxPath: metadata.cxx_path,
      gdbPath: metadata.gdb_path,
      compilerType: metadata.compiler_type ?? undefined,
    },
    includes: metadata.includes,
    defines: metadata.defines,
    programPath: metadata.prog_path,
    targets: metadata.targets?.map((target) =>
      typeof target === 'string' ? target : target.name
    ),
    extra: metadata.extra,
  };
}

export async function generateCompilationDatabase(projectDir: string): Promise<{
  success: boolean;
  command: string;
  outputPath: string;
}> {
  const result = await execPioCommand(['run', '-t', 'compiledb'], {
    cwd: projectDir,
    timeout: 300000,
  });

  if (result.exitCode !== 0) {
    throw new PlatformIOError('Failed to generate compile_commands.json', 'COMMAND_FAILED', {
      stderr: result.stderr,
      exitCode: result.exitCode,
      projectDir,
    });
  }

  const binary = await findPlatformIOBinary();
  return {
    success: true,
    command: `${binary} run -t compiledb`,
    outputPath: `${projectDir.replace(/\\/g, '/')}/compile_commands.json`,
  };
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

export async function spawnMonitorProcess(options: {
  args: string[];
  cwd?: string;
}): Promise<{
  command: string;
  child: ChildProcessWithoutNullStreams;
}> {
  const platformioBinary = await findPlatformIOBinary();
  const command = `${platformioBinary} ${options.args.join(' ')}`.trim();
  const child = spawn(platformioBinary, options.args, {
    cwd: options.cwd,
    windowsHide: true,
  });

  return {
    command,
    child,
  };
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
