import { afterEach, describe, expect, it, vi } from 'vitest';

import * as devicesModule from '../src/tools/devices.js';
import * as platformioModule from '../src/platformio.js';
import * as projectsModule from '../src/tools/projects.js';
import { doctor } from '../src/tools/doctor.js';

describe('doctor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports environment, project, and device status when PlatformIO is unavailable', async () => {
    vi.spyOn(platformioModule, 'checkPlatformIOInstalled').mockResolvedValue(
      false
    );
    vi.spyOn(platformioModule, 'getPlatformIOBinaryPath').mockResolvedValue(
      undefined
    );
    vi.spyOn(projectsModule, 'inspectProject').mockResolvedValue({
      projectDir: 'E:/firmware',
      platformioIniPath: 'E:/firmware/platformio.ini',
      isPlatformIOProject: true,
      defaultEnvironments: ['esp32dev'],
      environments: [
        {
          name: 'esp32dev',
          board: 'esp32dev',
          platform: 'espressif32',
          framework: 'arduino',
          isDefault: true,
          options: { board: 'esp32dev', platform: 'espressif32' },
        },
      ],
      metadataAvailable: false,
      warnings: [],
    });
    vi.spyOn(devicesModule, 'listDevices').mockResolvedValue([]);

    const report = await doctor({ projectDir: 'E:/firmware' });

    expect(report.platformio.installed).toBe(false);
    expect(report.platformio.cliPath).toBeUndefined();
    expect(report.project).toEqual(
      expect.objectContaining({ isPlatformIOProject: true })
    );
    expect(report.devices.count).toBe(0);
    expect(report.warnings).toContainEqual(
      expect.stringMatching(/PlatformIO CLI/i)
    );
    expect(report.projectReadiness.issues).toContain('cli_not_installed');
    expect(report.deviceReadiness.issues).toContain('cli_not_installed');
    expect(report.monitorReadiness.issues).toContain('cli_not_installed');
    expect(report.remoteReadiness.issues).toContain('platformio_cli_missing');
  });

  it('reports layered readiness fields when PlatformIO is available but remote is not ready', async () => {
    vi.spyOn(platformioModule, 'checkPlatformIOInstalled').mockResolvedValue(
      true
    );
    vi.spyOn(platformioModule, 'getPlatformIOBinaryPath').mockResolvedValue(
      'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe'
    );
    vi.spyOn(platformioModule, 'isPlatformIOShellCallable').mockResolvedValue(
      false
    );
    vi.spyOn(platformioModule, 'getPlatformIOVersion').mockResolvedValue(
      '6.1.19'
    );
    vi.spyOn(platformioModule, 'execPioCommand')
      .mockResolvedValueOnce({
        stdout: 'Usage: pio remote [OPTIONS] COMMAND [ARGS]...',
        stderr: '',
        exitCode: 0,
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 1,
      });
    vi.spyOn(projectsModule, 'inspectProject').mockResolvedValue({
      projectDir: 'E:/firmware',
      platformioIniPath: 'E:/firmware/platformio.ini',
      isPlatformIOProject: true,
      defaultEnvironments: ['esp32dev'],
      environments: [
        {
          name: 'esp32dev',
          board: 'esp32dev',
          platform: 'espressif32',
          framework: 'arduino',
          monitorPort: 'COM7',
          monitorSpeed: 115200,
          isDefault: true,
          options: { board: 'esp32dev', platform: 'espressif32' },
        },
      ],
      metadataAvailable: true,
      warnings: [],
    });
    vi.spyOn(devicesModule, 'listDevices').mockResolvedValue([
      {
        port: 'COM7',
        description: 'USB Serial Device',
        hwid: 'USB VID:PID=10C4:EA60',
        deviceType: 'usb_serial_adapter',
        transportType: 'serial',
        uploadCapability: 'likely',
        uploadCandidate: true,
        monitorCandidate: true,
        detectionSource: 'serial',
        detectionEvidence: ['serial-adapter-signature'],
      },
    ]);

    const report = await doctor({ projectDir: 'E:/firmware' });

    expect(report.platformio).toEqual(
      expect.objectContaining({
        installed: true,
        version: '6.1.19',
        cliPath: 'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe',
        shellCallable: false,
      })
    );
    expect(report.projectReadiness.status).toBe('ready');
    expect(report.deviceReadiness.status).toBe('ready');
    expect(report.monitorReadiness.status).toBe('ready');
    expect(report.remoteReadiness.status).toBe('ready');
    expect(report.remoteReadiness.issues).toEqual([]);
  });

  it('flags shell-callability and missing environments as blocked readiness issues', async () => {
    vi.spyOn(platformioModule, 'checkPlatformIOInstalled').mockResolvedValue(
      true
    );
    vi.spyOn(platformioModule, 'getPlatformIOBinaryPath').mockResolvedValue(
      'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe'
    );
    vi.spyOn(platformioModule, 'isPlatformIOShellCallable').mockResolvedValue(
      false
    );
    vi.spyOn(platformioModule, 'getPlatformIOVersion').mockResolvedValue(
      '6.1.19'
    );
    vi.spyOn(platformioModule, 'checkRemoteCliAvailable').mockResolvedValue({
      available: true,
      installTriggered: false,
    });
    vi.spyOn(projectsModule, 'inspectProject').mockResolvedValue({
      projectDir: 'E:/firmware',
      platformioIniPath: 'E:/firmware/platformio.ini',
      isPlatformIOProject: true,
      defaultEnvironments: [],
      environments: [],
      metadataAvailable: false,
      warnings: [],
    });
    vi.spyOn(devicesModule, 'listDevices').mockResolvedValue([]);

    const report = await doctor({ projectDir: 'E:/firmware' });

    expect(report.projectReadiness.status).toBe('blocked');
    expect(report.projectReadiness.issues).toEqual(
      expect.arrayContaining(['environment_not_resolved'])
    );
    expect(report.deviceReadiness.status).toBe('warning');
    expect(report.deviceReadiness.issues).toEqual(
      expect.arrayContaining(['device_not_detected'])
    );
    expect(report.monitorReadiness.status).toBe('warning');
    expect(report.monitorReadiness.issues).toEqual(
      expect.arrayContaining(['monitor_configuration_missing'])
    );
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/not callable from the current shell/i),
      ])
    );
  });
});
