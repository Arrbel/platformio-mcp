import { afterEach, describe, expect, it, vi } from 'vitest';

import { platformioExecutor } from '../src/platformio.js';
import { classifySerialDevice, listDevices } from '../src/tools/devices.js';

describe('devices', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies likely upload and monitor candidates with explicit transport metadata', () => {
    const device = classifySerialDevice({
      port: 'COM7',
      description: 'Silicon Labs CP210x USB to UART Bridge',
      hwid: 'USB VID:PID=10C4:EA60',
    });

    expect(device).toMatchObject({
      deviceType: 'usb_serial_adapter',
      transportType: 'serial',
      uploadCapability: 'likely',
      uploadCandidate: true,
      monitorCandidate: true,
    });
  });

  it('supports serial-only array output from pio device list --json-output', async () => {
    vi.spyOn(platformioExecutor, 'execute').mockResolvedValue({
      stdout: JSON.stringify([
        {
          port: 'COM7',
          description: 'USB Serial Device',
          hwid: 'USB VID:PID=10C4:EA60',
        },
      ]),
      stderr: '',
      exitCode: 0,
    });

    const devices = await listDevices();

    expect(devices).toHaveLength(1);
    expect(devices[0]).toEqual(
      expect.objectContaining({
        port: 'COM7',
        transportType: 'serial',
        detectionSource: 'serial',
      })
    );
  });

  it('supports multi-category object output from pio device list --json-output', async () => {
    vi.spyOn(platformioExecutor, 'execute').mockResolvedValue({
      stdout: JSON.stringify({
        serial: [
          {
            port: 'COM7',
            description: 'USB Serial Device',
            hwid: 'USB VID:PID=10C4:EA60',
          },
        ],
        logical: [
          {
            port: 'socket://192.168.1.20:23',
            description: 'Remote Serial Bridge',
            hwid: 'n/a',
          },
        ],
        mdns: [
          {
            port: 'sensor-node.local',
            description: 'ESP32 OTA',
            hwid: 'n/a',
          },
        ],
      }),
      stderr: '',
      exitCode: 0,
    });

    const devices = await listDevices();

    expect(devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          port: 'COM7',
          detectionSource: 'serial',
          transportType: 'serial',
        }),
        expect.objectContaining({
          port: 'socket://192.168.1.20:23',
          detectionSource: 'logical',
          transportType: 'socket',
        }),
        expect.objectContaining({
          port: 'sensor-node.local',
          detectionSource: 'mdns',
          transportType: 'network',
        }),
      ])
    );
  });
});
