import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import * as platformioModule from '../src/platformio.js';
import { startMonitor } from '../src/tools/monitor.js';

describe('monitor capture', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captures serial output when a bounded capture window is requested', async () => {
    vi.spyOn(platformioModule, 'captureMonitorOutput').mockResolvedValue({
      command: 'pio device monitor --port COM5 --baud 115200',
      output: ['boot ok', 'wifi ready'],
      timedOut: true,
    });

    const result = await startMonitor({
      port: 'COM5',
      baud: 115200,
      projectDir: 'E:/firmware',
      captureDurationMs: 1500,
      maxLines: 20,
    });

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'capture',
        output: ['boot ok', 'wifi ready'],
        timedOut: true,
        transportType: 'serial',
        endpoint: 'COM5',
        source: 'local',
      })
    );
  });

  it('recovers the resolved serial port from captured monitor command output', async () => {
    vi.spyOn(platformioModule, 'captureMonitorOutput').mockResolvedValue({
      command: 'pio device monitor',
      output: [
        '--- Terminal on COM9 | 115200 8-N-1',
        'BOOT_OK',
      ],
      timedOut: true,
    });

    const result = await startMonitor({
      baud: 115200,
      captureDurationMs: 1500,
      maxLines: 20,
    });

    expect(result.resolvedPort).toBe('COM9');
    expect(result.endpoint).toBe('COM9');
    expect(result.transportType).toBe('serial');
  });

  it('returns instruction-mode transport metadata for serial ports', async () => {
    const result = await startMonitor({
      port: 'COM7',
      baud: 115200,
      projectDir: 'E:/firmware',
      echo: false,
    });

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'instructions',
        monitorStatus: 'instructions_only',
        transportType: 'serial',
        endpoint: 'COM7',
        source: 'local',
      })
    );
    expect(result.command).toContain('--port COM7');
    expect(result.command).toContain('--baud 115200');
    expect(result.command).not.toContain('--echo');
  });

  it('detects socket transport types for URL-style ports', async () => {
    const result = await startMonitor({
      port: 'socket://127.0.0.1:9000',
      baud: 115200,
    });

    expect(result.transportType).toBe('socket');
    expect(result.endpoint).toBe('socket://127.0.0.1:9000');
  });

  it('inherits monitor filters from project configuration when not explicitly provided', async () => {
    const projectDir = await mkdtemp(path.join(os.tmpdir(), 'platformio-mcp-monitor-'));
    await mkdir(path.join(projectDir, 'src'), { recursive: true });
    await writeFile(
      path.join(projectDir, 'platformio.ini'),
      `
[env:esp32-s3-devkitc-1]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
monitor_speed = 115200
monitor_filters = esp32_exception_decoder
`,
      'utf8'
    );

    try {
      const result = await startMonitor({ projectDir });

      expect(result.filters).toEqual(['esp32_exception_decoder']);
      expect(result.command).toContain('--filter esp32_exception_decoder');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});
