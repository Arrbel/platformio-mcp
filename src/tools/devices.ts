/**
 * Device detection and listing tools
 */

import { platformioExecutor } from '../platformio.js';
import type { SerialDevice } from '../types.js';
import { PlatformIOError } from '../utils/errors.js';

export function classifySerialDevice(device: SerialDevice): SerialDevice {
  const description = device.description.toLowerCase();
  const hwid = device.hwid.toLowerCase();
  const detectionEvidence: string[] = [];
  const transportType =
    device.port.startsWith('socket://')
      ? 'socket'
      : device.port.startsWith('rfc2217://')
        ? 'rfc2217'
        : device.detectionSource === 'mdns'
          ? 'network'
          : 'serial';

  if (hwid.includes('bthenum')) {
    detectionEvidence.push('hwid:bthenum');
    return {
      ...device,
      transportType,
      deviceType: 'bluetooth_serial',
      uploadCapability: 'unlikely',
      uploadCandidate: false,
      monitorCandidate: true,
      detectionEvidence,
    };
  }

  if (transportType !== 'serial') {
    detectionEvidence.push(`transport:${transportType}`);
    return {
      ...device,
      transportType,
      deviceType: 'network_endpoint',
      uploadCapability: 'unknown',
      uploadCandidate: false,
      monitorCandidate: true,
      detectionEvidence,
    };
  }

  if (
    description.includes('ch340') ||
    description.includes('ch343') ||
    description.includes('cp210') ||
    description.includes('usb serial') ||
    hwid.includes('1a86:7523') ||
    hwid.includes('1a86:55d3') ||
    hwid.includes('10c4')
  ) {
    detectionEvidence.push('serial-adapter-signature');
    return {
      ...device,
      transportType,
      deviceType: 'usb_serial_adapter',
      uploadCapability: 'likely',
      uploadCandidate: true,
      monitorCandidate: true,
      detectionEvidence,
    };
  }

  if (
    description.includes('arduino') ||
    description.includes('esp32') ||
    description.includes('rp2040') ||
    description.includes('stm32')
  ) {
    detectionEvidence.push('board-name-match');
    return {
      ...device,
      transportType,
      deviceType: 'likely_board',
      uploadCapability: 'likely',
      uploadCandidate: true,
      monitorCandidate: true,
      detectionEvidence,
    };
  }

  return {
    ...device,
    transportType,
    deviceType: 'unknown_serial',
    uploadCapability: 'unknown',
    uploadCandidate: false,
    monitorCandidate: true,
    detectionEvidence,
  };
}

export function deriveDoctorReadiness(input: {
  platformioInstalled: boolean;
  hasProject: boolean;
  hasEnvironment: boolean;
  hasMonitorConfiguration: boolean;
  devices: SerialDevice[];
}): {
  readyForBuild: boolean;
  readyForUpload: boolean;
  readyForMonitor: boolean;
  blockingIssues: string[];
} {
  const blockingIssues: string[] = [];
  const hasUploadableDevice = input.devices.some(
    (device) => device.uploadCapability === 'likely'
  );

  if (!input.platformioInstalled) {
    blockingIssues.push('platformio_cli_missing');
  }
  if (!input.hasProject) {
    blockingIssues.push('project_not_available');
  }
  if (!input.hasEnvironment) {
    blockingIssues.push('environment_not_resolved');
  }
  if (!hasUploadableDevice) {
    blockingIssues.push('uploadable_device_not_detected');
  }
  if (!input.hasMonitorConfiguration) {
    blockingIssues.push('monitor_configuration_missing');
  }

  return {
    readyForBuild:
      input.platformioInstalled && input.hasProject && input.hasEnvironment,
    readyForUpload:
      input.platformioInstalled &&
      input.hasProject &&
      input.hasEnvironment &&
      hasUploadableDevice,
    readyForMonitor:
      input.platformioInstalled &&
      input.hasProject &&
      input.hasEnvironment &&
      input.hasMonitorConfiguration,
    blockingIssues,
  };
}

/**
 * Lists all connected serial devices
 */
export async function listDevices(): Promise<SerialDevice[]> {
  try {
    const result = await platformioExecutor.execute(
      'device',
      ['list', '--json-output'],
      { timeout: 10000 }
    );
    if (result.exitCode !== 0) {
      throw new PlatformIOError('PlatformIO command failed: device list', 'COMMAND_FAILED', {
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    const parsed = JSON.parse(result.stdout) as unknown;
    const items: SerialDevice[] = [];

    const normalizeItem = (
      raw: Record<string, unknown>,
      source: SerialDevice['detectionSource']
    ): SerialDevice => ({
      port: typeof raw.port === 'string' ? raw.port : 'unknown',
      description:
        typeof raw.description === 'string' ? raw.description : 'n/a',
      hwid: typeof raw.hwid === 'string' ? raw.hwid : 'n/a',
      detectionSource: source,
    });

    if (Array.isArray(parsed)) {
      for (const raw of parsed) {
        if (typeof raw === 'object' && raw !== null) {
          items.push(normalizeItem(raw as Record<string, unknown>, 'serial'));
        }
      }
    } else if (typeof parsed === 'object' && parsed !== null) {
      const grouped = parsed as Partial<
        Record<'serial' | 'logical' | 'mdns', unknown[]>
      >;
      for (const source of ['serial', 'logical', 'mdns'] as const) {
        const sourceItems = grouped[source];
        if (!Array.isArray(sourceItems)) {
          continue;
        }
        for (const raw of sourceItems) {
          if (typeof raw === 'object' && raw !== null) {
            items.push(normalizeItem(raw as Record<string, unknown>, source));
          }
        }
      }
    }

    return items.map(classifySerialDevice);
  } catch (error) {
    // If no devices are found, PlatformIO may return an error or empty array
    // Handle gracefully by returning empty array
    if (error instanceof PlatformIOError) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes('no devices') ||
        errorMessage.includes('empty')
      ) {
        return [];
      }
    }

    throw new PlatformIOError(
      `Failed to list devices: ${error}`,
      'LIST_DEVICES_FAILED'
    );
  }
}

/**
 * Finds a device by port path
 */
export async function findDeviceByPort(
  port: string
): Promise<SerialDevice | null> {
  const devices = await listDevices();
  return devices.find((device) => device.port === port) || null;
}

/**
 * Gets the first available serial device (useful for auto-detection)
 */
export async function getFirstDevice(): Promise<SerialDevice | null> {
  const devices = await listDevices();
  return devices.length > 0 ? devices[0] : null;
}

/**
 * Checks if any devices are connected
 */
export async function hasConnectedDevices(): Promise<boolean> {
  const devices = await listDevices();
  return devices.length > 0;
}

/**
 * Lists devices filtered by description (useful for finding specific board types)
 */
export async function findDevicesByDescription(
  searchTerm: string
): Promise<SerialDevice[]> {
  const devices = await listDevices();
  const searchLower = searchTerm.toLowerCase();

  return devices.filter((device) =>
    device.description.toLowerCase().includes(searchLower)
  );
}

/**
 * Lists devices filtered by hardware ID
 */
export async function findDevicesByHardwareId(
  searchTerm: string
): Promise<SerialDevice[]> {
  const devices = await listDevices();
  const searchLower = searchTerm.toLowerCase();

  return devices.filter((device) =>
    device.hwid.toLowerCase().includes(searchLower)
  );
}
