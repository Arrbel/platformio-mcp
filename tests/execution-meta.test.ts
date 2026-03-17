import { afterEach, describe, expect, it, vi } from 'vitest';

import * as buildModule from '../src/tools/build.js';
import * as doctorModule from '../src/tools/doctor.js';
import * as boardsModule from '../src/tools/boards.js';
import * as devicesModule from '../src/tools/devices.js';
import * as librariesModule from '../src/tools/libraries.js';
import * as monitorModule from '../src/tools/monitor.js';
import * as projectsModule from '../src/tools/projects.js';
import * as uploadModule from '../src/tools/upload.js';
import { invokeRegisteredTool } from '../src/tools/registry.js';

describe('execution result meta', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds execution meta to doctor responses', async () => {
    vi.spyOn(doctorModule, 'doctor').mockResolvedValue({
      nodeVersion: 'v22.14.0',
      platformio: { installed: true, version: '6.1.19' },
      devices: { count: 0, items: [] },
      readyForBuild: false,
      readyForUpload: false,
      readyForMonitor: false,
      blockingIssues: ['project_not_available'],
      warnings: [],
    });

    const response = await invokeRegisteredTool('doctor', {});

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'doctor',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });

  it('adds execution meta to build responses', async () => {
    vi.spyOn(buildModule, 'buildProject').mockResolvedValue({
      success: true,
      environment: 'native',
      resolvedEnvironment: 'native',
      resolutionSource: 'platformio_default_envs',
      output: 'ok',
    });

    const response = await invokeRegisteredTool('build_project', {
      projectDir: 'E:/firmware',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'build',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
          resolvedEnvironment: 'native',
          resolutionSource: 'platformio_default_envs',
        }),
      })
    );
  });

  it('adds execution meta to upload responses', async () => {
    vi.spyOn(uploadModule, 'uploadFirmware').mockResolvedValue({
      success: false,
      port: 'COM9',
      resolvedPort: 'COM9',
      resolvedEnvironment: 'esp32dev',
      resolutionSource: 'explicit_argument',
      uploadStatus: 'port_unavailable',
      failureCategory: 'port_unavailable',
      retryHint: 'close_serial_consumers_and_retry',
      rawOutput: 'error',
      output: '',
      errors: ['error'],
    });

    const response = await invokeRegisteredTool('upload_firmware', {
      projectDir: 'E:/firmware',
      port: 'COM9',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'upload',
          executionStatus: 'blocked',
          verificationStatus: 'not_requested',
          failureCategory: 'port_unavailable',
          retryHint: 'close_serial_consumers_and_retry',
          resolvedPort: 'COM9',
        }),
      })
    );
  });

  it('adds execution meta to monitor responses', async () => {
    vi.spyOn(monitorModule, 'startMonitor').mockResolvedValue({
      success: true,
      message: 'Captured 2 line(s) from the serial monitor.',
      mode: 'capture',
      resolvedPort: 'COM9',
      resolvedBaud: 115200,
      resolvedEnvironment: 'esp32dev',
      resolutionSource: 'explicit_argument',
      monitorStatus: 'captured_output',
      verificationStatus: 'degraded',
      matchedPatterns: ['JSON 输出'],
      healthSignals: ['node_online_basic'],
      degradedSignals: ['allowed_null_field:co2'],
      failureSignals: [],
      parsedJsonMessages: [{ device_id: 1001 }],
      rawOutputExcerpt: 'sample',
      output: ['sample'],
      timedOut: true,
    });

    const response = await invokeRegisteredTool('start_monitor', {
      port: 'COM9',
      baud: 115200,
      captureDurationMs: 5000,
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'monitor',
          executionStatus: 'succeeded',
          verificationStatus: 'degraded',
          resolvedPort: 'COM9',
          resolvedBaud: 115200,
        }),
      })
    );
  });

  it('adds execution meta to board listing responses', async () => {
    vi.spyOn(boardsModule, 'listBoards').mockResolvedValue([
      {
        id: 'uno',
        name: 'Arduino Uno',
        platform: 'atmelavr',
        mcu: 'ATMEGA328P',
        frequency: '16000000',
        flash: 32256,
        ram: 2048,
      },
    ]);

    const response = await invokeRegisteredTool('list_boards', {
      filter: 'uno',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });

  it('adds execution meta to device listing responses', async () => {
    vi.spyOn(devicesModule, 'listDevices').mockResolvedValue([
      {
        port: 'COM9',
        description: 'USB-Enhanced-SERIAL CH343 (COM9)',
        hwid: 'USB VID:PID=1A86:55D3',
      },
    ]);

    const response = await invokeRegisteredTool('list_devices', {});

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });

  it('adds execution meta to project init responses', async () => {
    vi.spyOn(projectsModule, 'initProject').mockResolvedValue({
      success: true,
      path: 'E:/firmware',
      message: 'ok',
    });

    const response = await invokeRegisteredTool('init_project', {
      board: 'uno',
      projectDir: 'E:/firmware',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });

  it('adds execution meta to clean responses', async () => {
    vi.spyOn(buildModule, 'cleanProject').mockResolvedValue({
      success: true,
      message: 'clean ok',
    });

    const response = await invokeRegisteredTool('clean_project', {
      projectDir: 'E:/firmware',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'build',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });

  it('adds execution meta to library search responses', async () => {
    vi.spyOn(librariesModule, 'searchLibraries').mockResolvedValue([
      {
        id: 64,
        name: 'ArduinoJson',
      },
    ]);

    const response = await invokeRegisteredTool('search_libraries', {
      query: 'ArduinoJson',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });

  it('adds execution meta to library install responses', async () => {
    vi.spyOn(librariesModule, 'installLibrary').mockResolvedValue({
      success: true,
      library: 'ArduinoJson',
      message: 'installed',
    });

    const response = await invokeRegisteredTool('install_library', {
      library: 'ArduinoJson',
      projectDir: 'E:/firmware',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });

  it('adds execution meta to installed library listing responses', async () => {
    vi.spyOn(librariesModule, 'listInstalledLibraries').mockResolvedValue([
      {
        name: 'ArduinoJson',
        version: '7.4.3',
      },
    ]);

    const response = await invokeRegisteredTool('list_installed_libraries', {
      projectDir: 'E:/firmware',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });

  it('adds execution meta to get_board_info responses', async () => {
    vi.spyOn(boardsModule, 'getBoardInfo').mockResolvedValue({
      id: 'esp32dev',
      name: 'Espressif ESP32 Dev Module',
      platform: 'espressif32',
      mcu: 'ESP32',
      frequency: '240MHz',
      flash: 4194304,
      ram: 327680,
      frameworks: ['arduino', 'espidf'],
    });

    const response = await invokeRegisteredTool('get_board_info', {
      boardId: 'esp32dev',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });
});
