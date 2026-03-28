import { afterEach, describe, expect, it, vi } from 'vitest';
import { access } from 'node:fs/promises';

import * as devicesModule from '../src/tools/devices.js';
import * as platformioModule from '../src/platformio.js';
import * as projectsModule from '../src/tools/projects.js';
import { doctor } from '../src/tools/doctor.js';

describe('doctor repair suggestions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports CLI and host compiler repair suggestions when PlatformIO is installed but shell/compiler are missing', async () => {
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
    vi.spyOn(platformioModule, 'getPlatformIOPythonExecutable').mockResolvedValue(
      'C:/Users/Arrebol/.platformio/penv/Scripts/python.exe'
    );
    vi.spyOn(platformioModule, 'checkRemoteCliAvailable').mockResolvedValue({
      available: true,
      installTriggered: false,
    });
    vi.spyOn(platformioModule, 'detectHostCppToolchain').mockResolvedValue({
      available: false,
      shellCallable: false,
      detectedCompilers: [],
      packageManager: 'winget',
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
          isDefault: true,
          options: { board: 'esp32dev', platform: 'espressif32' },
        },
      ],
      metadataAvailable: false,
      warnings: [],
    });
    vi.spyOn(devicesModule, 'listDevices').mockResolvedValue([]);

    const report = await doctor({ projectDir: 'E:/firmware' });

    expect(report.detectedProblems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          problemCode: 'platformio_cli_not_shell_callable',
          blocking: false,
          affects: ['all_platformio'],
        }),
        expect.objectContaining({
          problemCode: 'host_cpp_compiler_missing',
          blocking: false,
          scope: 'native_host_build_only',
          affects: ['native_build'],
        }),
      ])
    );
    expect(report.fixSuggestions[0]).toEqual(
      expect.objectContaining({
        problemCode: 'platformio_cli_not_shell_callable',
        fixId: 'activate_local_platformio_cli',
      })
    );
    expect(report.fixSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          problemCode: 'platformio_cli_not_shell_callable',
          fixId: 'set_platformio_cli_env_hint',
          canAutoFix: true,
          requiresConfirmation: false,
        }),
        expect.objectContaining({
          problemCode: 'host_cpp_compiler_missing',
          fixId: 'install_host_cpp_compiler_via_winget',
          canAutoFix: false,
          requiresConfirmation: true,
        }),
      ])
    );
    expect(report.repairReadiness).toEqual(
      expect.objectContaining({
        hasAutoFixes: true,
        hasConfirmationRequiredFixes: true,
        recommendedFixIds: ['activate_local_platformio_cli'],
        manualProblemCodes: [],
      })
    );
    expect(report.readyForBuild).toBe(true);
  });

  it('reports serial port busy suggestions when an upload-capable port is occupied', async () => {
    vi.spyOn(platformioModule, 'checkPlatformIOInstalled').mockResolvedValue(
      true
    );
    vi.spyOn(platformioModule, 'getPlatformIOBinaryPath').mockResolvedValue(
      'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe'
    );
    vi.spyOn(platformioModule, 'isPlatformIOShellCallable').mockResolvedValue(
      true
    );
    vi.spyOn(platformioModule, 'getPlatformIOVersion').mockResolvedValue(
      '6.1.19'
    );
    vi.spyOn(platformioModule, 'checkRemoteCliAvailable').mockResolvedValue({
      available: true,
      installTriggered: false,
    });
    vi.spyOn(platformioModule, 'detectHostCppToolchain').mockResolvedValue({
      available: false,
      shellCallable: false,
      detectedCompilers: [],
      packageManager: 'winget',
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
          uploadPort: 'COM9',
          monitorPort: 'COM9',
          monitorSpeed: 115200,
          isDefault: true,
          options: { board: 'esp32dev', platform: 'espressif32' },
        },
      ],
      metadataAvailable: false,
      warnings: [],
    });
    vi.spyOn(devicesModule, 'listDevices').mockResolvedValue([
      {
        port: 'COM9',
        description: 'USB-Enhanced-SERIAL CH343 (COM9)',
        hwid: 'USB VID:PID=1A86:55D3',
        deviceType: 'usb_serial_adapter',
        transportType: 'serial',
        uploadCapability: 'likely',
        uploadCandidate: true,
        monitorCandidate: true,
        detectionSource: 'serial',
        detectionEvidence: ['serial-adapter-signature'],
      },
    ]);
    vi.spyOn(platformioModule, 'probeSerialPortBusy').mockResolvedValue({
      port: 'COM9',
      busy: true,
      failureCategory: 'port_unavailable',
      retryHint: 'close_serial_consumers_and_retry',
    });

    const report = await doctor({ projectDir: 'E:/firmware' });

    expect(report.detectedProblems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          problemCode: 'serial_port_busy',
          blocking: true,
          affects: ['upload', 'monitor'],
        }),
      ])
    );
    expect(report.fixSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          problemCode: 'serial_port_busy',
          fixId: 'suggest_close_serial_consumers',
          canAutoFix: false,
        }),
      ])
    );
  });

  it('treats the standard local PlatformIO penv path as installed even when PATH is not callable', async () => {
    vi.spyOn(platformioModule, 'getPlatformIOVersion').mockResolvedValue(
      '6.1.19'
    );
    vi.spyOn(platformioModule, 'getPlatformIOPythonExecutable').mockResolvedValue(
      'C:/Users/Arrebol/.platformio/penv/Scripts/python.exe'
    );
    vi.spyOn(platformioModule, 'isPlatformIOShellCallable').mockResolvedValue(
      false
    );
    vi.spyOn(platformioModule, 'checkRemoteCliAvailable').mockResolvedValue({
      available: true,
      installTriggered: false,
    });
    vi.spyOn(platformioModule, 'detectHostCppToolchain').mockResolvedValue({
      available: true,
      shellCallable: true,
      detectedCompilers: ['g++'],
      packageManager: 'winget',
    });
    vi.spyOn(platformioModule, 'getPlatformIOBinaryPath').mockImplementation(
      async () => {
        await access('C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe');
        return 'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe';
      }
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

    expect(report.platformio.installed).toBe(true);
    expect(report.detectedProblems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          problemCode: 'platformio_cli_not_shell_callable',
          affects: ['all_platformio'],
        }),
      ])
    );
    expect(report.detectedProblems).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          problemCode: 'platformio_cli_missing',
        }),
      ])
    );
  });

  it('does not report host compiler missing when a standard local LLVM clang++ path exists', async () => {
    vi.spyOn(platformioModule, 'checkPlatformIOInstalled').mockResolvedValue(
      true
    );
    vi.spyOn(platformioModule, 'getPlatformIOBinaryPath').mockResolvedValue(
      'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe'
    );
    vi.spyOn(platformioModule, 'isPlatformIOShellCallable').mockResolvedValue(
      true
    );
    vi.spyOn(platformioModule, 'getPlatformIOVersion').mockResolvedValue(
      '6.1.19'
    );
    vi.spyOn(platformioModule, 'checkRemoteCliAvailable').mockResolvedValue({
      available: true,
      installTriggered: false,
    });
    vi.spyOn(platformioModule, 'getPlatformIOPythonExecutable').mockResolvedValue(
      'C:/Users/Arrebol/.platformio/penv/Scripts/python.exe'
    );
    vi.spyOn(platformioModule, 'detectHostCppToolchain').mockResolvedValue({
      available: true,
      shellCallable: true,
      detectedCompilers: ['C:/Program Files/LLVM/bin/clang++.exe'],
      packageManager: 'winget',
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
          isDefault: true,
          options: { board: 'esp32dev', platform: 'espressif32' },
        },
      ],
      metadataAvailable: false,
      warnings: [],
    });
    vi.spyOn(devicesModule, 'listDevices').mockResolvedValue([]);

    const report = await doctor({ projectDir: 'E:/firmware' });

    expect(
      report.detectedProblems.map((item) => item.problemCode)
    ).not.toContain('host_cpp_compiler_missing');
  });

  it('classifies detected local compiler paths as not shell callable instead of missing', async () => {
    vi.spyOn(platformioModule, 'checkPlatformIOInstalled').mockResolvedValue(
      true
    );
    vi.spyOn(platformioModule, 'getPlatformIOBinaryPath').mockResolvedValue(
      'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe'
    );
    vi.spyOn(platformioModule, 'isPlatformIOShellCallable').mockResolvedValue(
      true
    );
    vi.spyOn(platformioModule, 'getPlatformIOVersion').mockResolvedValue(
      '6.1.19'
    );
    vi.spyOn(platformioModule, 'checkRemoteCliAvailable').mockResolvedValue({
      available: true,
      installTriggered: false,
    });
    vi.spyOn(platformioModule, 'getPlatformIOPythonExecutable').mockResolvedValue(
      'C:/Users/Arrebol/.platformio/penv/Scripts/python.exe'
    );
    vi.spyOn(platformioModule, 'detectHostCppToolchain').mockResolvedValue({
      available: true,
      shellCallable: false,
      detectedCompilers: ['C:/Program Files/LLVM/bin/clang++.exe'],
      packageManager: 'winget',
    });
    vi.spyOn(projectsModule, 'inspectProject').mockResolvedValue({
      projectDir: 'E:/firmware',
      platformioIniPath: 'E:/firmware/platformio.ini',
      isPlatformIOProject: true,
      defaultEnvironments: ['native'],
      environments: [
        {
          name: 'native',
          platform: 'native',
          isDefault: true,
          options: { platform: 'native' },
        },
      ],
      metadataAvailable: false,
      warnings: [],
    });
    vi.spyOn(devicesModule, 'listDevices').mockResolvedValue([]);

    const report = await doctor({ projectDir: 'E:/firmware' });

    expect(
      report.detectedProblems.map((item) => item.problemCode)
    ).toContain('host_cpp_compiler_not_shell_callable');
    expect(
      report.detectedProblems.map((item) => item.problemCode)
    ).not.toContain('host_cpp_compiler_missing');
  });
});
