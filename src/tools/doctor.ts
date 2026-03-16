/**
 * Environment and project diagnostics.
 */

import {
  checkPlatformIOInstalled,
  getPlatformIOVersion,
} from '../platformio.js';
import type { DoctorReport } from '../types.js';
import { listDevices } from './devices.js';
import { inspectProject } from './projects.js';

export async function doctor(
  options: { projectDir?: string } = {}
): Promise<DoctorReport> {
  const warnings: string[] = [];
  const installed = await checkPlatformIOInstalled();

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

  return {
    nodeVersion: process.version,
    platformio: {
      installed,
      version,
    },
    project,
    devices: {
      count: devices.length,
      items: devices,
    },
    warnings,
  };
}
