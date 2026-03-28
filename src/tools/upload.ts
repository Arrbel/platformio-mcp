/**
 * Firmware upload tools
 */

import { platformioExecutor } from '../platformio.js';
import type { UploadResult } from '../types.js';
import {
  validateProjectPath,
  validateEnvironmentName,
  validateSerialPort,
} from '../utils/validation.js';
import { UploadError, PlatformIOError } from '../utils/errors.js';
import { parseStderrErrors } from '../utils/errors.js';
import {
  assertProjectEnvironmentExists,
  resolveProjectEnvironment,
} from './projects.js';

export function classifyUploadResult(
  stdout: string,
  stderr: string
): {
  uploadStatus: UploadResult['uploadStatus'];
  resolvedPort?: string;
  failureCategory?: string;
  retryHint?: string;
} {
  const combined = `${stdout}\n${stderr}`.toLowerCase();
  const resolvedPort = extractResolvedUploadPort(stdout, stderr);

  if (!combined.trim()) {
    return {
      uploadStatus: 'unknown_failure',
      resolvedPort,
      failureCategory: 'unknown_failure',
      retryHint: 'inspect_raw_output',
    };
  }

  if (
    combined.includes('permission denied') ||
    combined.includes('access is denied') ||
    combined.includes('could not open port')
  ) {
    return {
      uploadStatus: 'port_unavailable',
      resolvedPort,
      failureCategory: 'port_unavailable',
      retryHint: 'close_serial_consumers_and_retry',
    };
  }

  if (
    combined.includes('no device found') ||
    combined.includes('serial port not found') ||
    combined.includes('board is not connected')
  ) {
    return {
      uploadStatus: 'device_not_found',
      resolvedPort,
      failureCategory: 'device_not_found',
      retryHint: 'check_usb_connection_and_retry',
    };
  }

  if (
    combined.includes('waiting for download') ||
    combined.includes('timed out waiting for packet header') ||
    combined.includes('boot mode')
  ) {
    return {
      uploadStatus: 'manual_boot_required',
      resolvedPort,
      failureCategory: 'manual_boot_required',
      retryHint: 'enter_boot_mode_and_retry',
    };
  }

  return {
    uploadStatus: 'uploader_failed',
    resolvedPort,
    failureCategory: 'uploader_failed',
    retryHint: 'inspect_uploader_output',
  };
}

function extractResolvedUploadPort(
  stdout: string,
  stderr: string
): string | undefined {
  const combined = `${stdout}\n${stderr}`;
  const patterns = [
    /Auto-detected:\s*([A-Za-z0-9._:-]+)/i,
    /Uploading(?:\s+to)?\s+([A-Za-z0-9._:-]+)\b/i,
    /could not open port '([^']+)'/i,
    /No device found on\s+([A-Za-z0-9._:-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

async function executeUploadRun(options: {
  projectDir: string;
  port?: string;
  environment?: string;
  targets: string[];
  includeMonitorPort: boolean;
  platformioErrorMessage: string;
  failureMessage: string;
}): Promise<UploadResult> {
  const validatedPath = validateProjectPath(options.projectDir);
  const explicitPort = options.port;
  const explicitEnvironment = options.environment;

  if (options.environment && !validateEnvironmentName(options.environment)) {
    throw new UploadError(`Invalid environment name: ${options.environment}`, {
      environment: options.environment,
    });
  }

  if (options.port && !validateSerialPort(options.port)) {
    throw new UploadError(`Invalid serial port: ${options.port}`, {
      port: options.port,
    });
  }

  try {
    await assertProjectEnvironmentExists(validatedPath, options.environment);
    const resolvedEnvironment = await resolveProjectEnvironment(
      validatedPath,
      options.environment
    );
    const resolvedPort = options.port ?? resolvedEnvironment?.uploadPort;

    const args: string[] = ['run'];
    for (const target of options.targets) {
      args.push('--target', target);
    }

    if (options.environment) {
      args.push('--environment', options.environment);
    }

    if (resolvedPort) {
      args.push('--upload-port', resolvedPort);
      if (options.includeMonitorPort) {
        args.push('--monitor-port', resolvedPort);
      }
    }

    const result = await platformioExecutor.execute('run', args.slice(1), {
      cwd: validatedPath,
      timeout: 300000,
    });

    const success = result.exitCode === 0;
    const errors = success ? undefined : parseStderrErrors(result.stderr);
    const detectedPort = extractResolvedUploadPort(result.stdout, result.stderr);
    const classified = success
      ? {
          uploadStatus: 'uploaded' as const,
          resolvedPort: detectedPort,
          failureCategory: undefined,
          retryHint: undefined,
        }
      : classifyUploadResult(result.stdout, result.stderr);

    return {
      success,
      port: resolvedPort ?? classified.resolvedPort,
      resolvedPort: resolvedPort ?? classified.resolvedPort,
      resolvedEnvironment: resolvedEnvironment?.name,
      resolutionSource: explicitPort
        ? 'explicit_argument'
        : resolvedEnvironment?.uploadPort
          ? 'project_upload_port'
          : explicitEnvironment || resolvedEnvironment?.name
            ? 'environment_resolution'
            : undefined,
      uploadStatus: classified.uploadStatus,
      failureCategory: classified.failureCategory,
      retryHint: classified.retryHint,
      rawOutput: `${result.stdout}\n${result.stderr}`.trim(),
      output: result.stdout,
      errors,
    };
  } catch (error) {
    if (error instanceof PlatformIOError) {
      throw new UploadError(
        `${options.platformioErrorMessage}: ${error.message}`,
        {
          projectDir: options.projectDir,
          port: options.port,
          environment: options.environment,
        }
      );
    }
    throw new UploadError(`${options.failureMessage}: ${error}`, {
      projectDir: options.projectDir,
      port: options.port,
      environment: options.environment,
    });
  }
}

/**
 * Uploads firmware to a connected device
 */
export async function uploadFirmware(
  projectDir: string,
  port?: string,
  environment?: string
): Promise<UploadResult> {
  return executeUploadRun({
    projectDir,
    port,
    environment,
    targets: ['upload'],
    includeMonitorPort: false,
    platformioErrorMessage: 'Upload failed',
    failureMessage: 'Failed to upload firmware',
  });
}

/**
 * Uploads firmware and starts serial monitor (upload + monitor)
 */
export async function uploadAndMonitor(
  projectDir: string,
  port?: string,
  environment?: string
): Promise<UploadResult> {
  return executeUploadRun({
    projectDir,
    port,
    environment,
    targets: ['upload', 'monitor'],
    includeMonitorPort: true,
    platformioErrorMessage: 'Upload and monitor failed',
    failureMessage: 'Failed to upload and monitor',
  });
}

/**
 * Builds and uploads firmware in one step
 */
export async function buildAndUpload(
  projectDir: string,
  port?: string,
  environment?: string
): Promise<UploadResult> {
  // Upload target automatically builds first if needed
  return uploadFirmware(projectDir, port, environment);
}
