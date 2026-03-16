import { afterEach, describe, expect, it, vi } from 'vitest';

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

    const result = await startMonitor('COM5', 115200, 'E:/firmware', 1500, 20);

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'capture',
        output: ['boot ok', 'wifi ready'],
        timedOut: true,
      })
    );
  });
});
