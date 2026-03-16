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
  failureCategory?: string;
  retryHint?: string;
} {
  const combined = `${stdout}\n${stderr}`.toLowerCase();

  if (!combined.trim()) {
    return {
      uploadStatus: 'unknown_failure',
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
      failureCategory: 'manual_boot_required',
      retryHint: 'enter_boot_mode_and_retry',
    };
  }

  return {
    uploadStatus: 'uploader_failed',
    failureCategory: 'uploader_failed',
    retryHint: 'inspect_uploader_output',
  };
}

/**
 * Uploads firmware to a connected device
 */
export async function uploadFirmware(
  projectDir: string,
  port?: string,
  environment?: string
): Promise<UploadResult> {
  const validatedPath = validateProjectPath(projectDir);
  const explicitPort = port;
  const explicitEnvironment = environment;

  if (environment && !validateEnvironmentName(environment)) {
    throw new UploadError(`Invalid environment name: ${environment}`, {
      environment,
    });
  }

  if (port && !validateSerialPort(port)) {
    throw new UploadError(`Invalid serial port: ${port}`, { port });
  }

  try {
    await assertProjectEnvironmentExists(validatedPath, environment);
    const resolvedEnvironment = await resolveProjectEnvironment(
      validatedPath,
      environment
    );
    const resolvedPort = port ?? resolvedEnvironment?.uploadPort;

    const args: string[] = ['run', '--target', 'upload'];

    // Add environment if specified
    if (environment) {
      args.push('--environment', environment);
    }

    // Add upload port if specified
    if (resolvedPort) {
      args.push('--upload-port', resolvedPort);
    }

    const result = await platformioExecutor.execute('run', args.slice(1), {
      cwd: validatedPath,
      timeout: 300000, // 5 minutes
    });

    const success = result.exitCode === 0;
    const errors = success ? undefined : parseStderrErrors(result.stderr);
    const classified = success
      ? {
          uploadStatus: 'uploaded' as const,
          failureCategory: undefined,
          retryHint: undefined,
        }
      : classifyUploadResult(result.stdout, result.stderr);

    return {
      success,
      port: resolvedPort,
      resolvedPort,
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
      throw new UploadError(`Upload failed: ${error.message}`, {
        projectDir,
        port,
        environment,
      });
    }
    throw new UploadError(`Failed to upload firmware: ${error}`, {
      projectDir,
      port,
      environment,
    });
  }
}

/**
 * Uploads firmware and starts serial monitor (upload + monitor)
 */
export async function uploadAndMonitor(
  projectDir: string,
  port?: string,
  environment?: string
): Promise<UploadResult> {
  const validatedPath = validateProjectPath(projectDir);
  const explicitPort = port;
  const explicitEnvironment = environment;

  if (environment && !validateEnvironmentName(environment)) {
    throw new UploadError(`Invalid environment name: ${environment}`, {
      environment,
    });
  }

  if (port && !validateSerialPort(port)) {
    throw new UploadError(`Invalid serial port: ${port}`, { port });
  }

  try {
    await assertProjectEnvironmentExists(validatedPath, environment);
    const resolvedEnvironment = await resolveProjectEnvironment(
      validatedPath,
      environment
    );
    const resolvedPort = port ?? resolvedEnvironment?.uploadPort;

    const args: string[] = ['run', '--target', 'upload', '--target', 'monitor'];

    if (environment) {
      args.push('--environment', environment);
    }

    if (resolvedPort) {
      args.push('--upload-port', resolvedPort);
      args.push('--monitor-port', resolvedPort);
    }

    const result = await platformioExecutor.execute('run', args.slice(1), {
      cwd: validatedPath,
      timeout: 300000,
    });

    const success = result.exitCode === 0;
    const errors = success ? undefined : parseStderrErrors(result.stderr);
    const classified = success
      ? {
          uploadStatus: 'uploaded' as const,
          failureCategory: undefined,
          retryHint: undefined,
        }
      : classifyUploadResult(result.stdout, result.stderr);

    return {
      success,
      port: resolvedPort,
      resolvedPort,
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
      throw new UploadError(`Upload and monitor failed: ${error.message}`, {
        projectDir,
        port,
        environment,
      });
    }
    throw new UploadError(`Failed to upload and monitor: ${error}`, {
      projectDir,
      port,
      environment,
    });
  }
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
