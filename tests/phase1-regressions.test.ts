import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import * as platformioModule from '../src/platformio.js';
import { platformioExecutor } from '../src/platformio.js';
import { listBoards } from '../src/tools/boards.js';
import { buildProject, buildTarget } from '../src/tools/build.js';
import {
  getMonitorCommandWithFilters,
  startMonitor,
} from '../src/tools/monitor.js';

async function createProjectFixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'platformio-mcp-phase1-'));
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(
    path.join(root, 'platformio.ini'),
    `
[env:release]
platform = espressif32
board = esp32dev
framework = arduino
`,
    'utf8'
  );
  return root;
}

describe('phase 1 regressions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes the requested environment to PlatformIO build without duplicating the run subcommand', async () => {
    const executeSpy = vi
      .spyOn(platformioExecutor, 'execute')
      .mockResolvedValue({ stdout: 'ok', stderr: '', exitCode: 0 });
    const projectDir = await createProjectFixture();

    try {
      await buildProject(projectDir, 'release');

      expect(executeSpy).toHaveBeenCalledWith(
        'run',
        ['--environment', 'release'],
        expect.objectContaining({ cwd: expect.any(String), timeout: 600000 })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('passes the requested target to PlatformIO without duplicating the run subcommand', async () => {
    const executeSpy = vi
      .spyOn(platformioExecutor, 'execute')
      .mockResolvedValue({ stdout: 'ok', stderr: '', exitCode: 0 });
    const projectDir = await createProjectFixture();

    try {
      await buildTarget(projectDir, 'upload', 'release');

      expect(executeSpy).toHaveBeenCalledWith(
        'run',
        ['--target', 'upload', '--environment', 'release'],
        expect.objectContaining({ cwd: expect.any(String), timeout: 600000 })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('forwards the optional board filter to the PlatformIO boards command', async () => {
    const executeSpy = vi
      .spyOn(platformioModule, 'execPioCommand')
      .mockResolvedValue({
        stdout: JSON.stringify([
          {
            id: 'esp32dev',
            name: 'ESP32 Dev Module',
            platform: 'espressif32',
            mcu: 'esp32',
            fcpu: 240000000,
            rom: 4194304,
            ram: 320000,
            frameworks: ['arduino'],
          },
        ]),
        stderr: '',
        exitCode: 0,
      });

    await listBoards('esp32');

    expect(executeSpy).toHaveBeenCalledWith(
      ['boards', 'esp32', '--json-output'],
      expect.objectContaining({ timeout: 30000 })
    );
  });

  it('does not add the echo flag when monitor echo is explicitly disabled', () => {
    const command = getMonitorCommandWithFilters({
      port: 'COM4',
      echo: false,
    });

    expect(command).not.toContain('--echo');
  });

  it('quotes project paths with spaces in the monitor command', async () => {
    const result = await startMonitor(
      undefined,
      115200,
      'E:/Projects/My Firmware'
    );

    expect(result.command).toMatch(/"E:[\\/]+Projects[\\/]+My Firmware"/);
  });
});
