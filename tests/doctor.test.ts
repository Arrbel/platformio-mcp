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
    });
    vi.spyOn(devicesModule, 'listDevices').mockResolvedValue([]);

    const report = await doctor({ projectDir: 'E:/firmware' });

    expect(report.platformio.installed).toBe(false);
    expect(report.project).toEqual(
      expect.objectContaining({ isPlatformIOProject: true })
    );
    expect(report.devices.count).toBe(0);
    expect(report.warnings).toContainEqual(
      expect.stringMatching(/PlatformIO CLI/i)
    );
  });
});
