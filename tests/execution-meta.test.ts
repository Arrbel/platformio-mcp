import { afterEach, describe, expect, it, vi } from 'vitest';

import * as buildModule from '../src/tools/build.js';
import * as doctorModule from '../src/tools/doctor.js';
import * as monitorModule from '../src/tools/monitor.js';
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
});
