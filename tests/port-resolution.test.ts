import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { platformioExecutor } from '../src/platformio.js';
import { startMonitor } from '../src/tools/monitor.js';
import { uploadFirmware } from '../src/tools/upload.js';

async function createProjectFixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'platformio-mcp-ports-'));
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(
    path.join(root, 'platformio.ini'),
    `
[platformio]
default_envs = release

[env:release]
platform = espressif32
board = esp32dev
framework = arduino
upload_port = COM9
monitor_port = COM7
monitor_speed = 115200
`,
    'utf8'
  );
  return root;
}

describe('project-based port resolution', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the configured upload_port when no upload port is passed explicitly', async () => {
    const projectDir = await createProjectFixture();
    const executeSpy = vi
      .spyOn(platformioExecutor, 'execute')
      .mockResolvedValue({
        stdout: 'uploaded',
        stderr: '',
        exitCode: 0,
      });

    try {
      await uploadFirmware(projectDir);

      expect(executeSpy).toHaveBeenCalledWith(
        'run',
        ['--target', 'upload', '--upload-port', 'COM9'],
        expect.objectContaining({ cwd: expect.any(String) })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('uses the configured monitor_port when no monitor port is passed explicitly', async () => {
    const projectDir = await createProjectFixture();

    try {
      const result = await startMonitor(undefined, undefined, projectDir);

      expect(result.command).toContain('--port COM7');
      expect(result.command).toContain('--baud 115200');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});
