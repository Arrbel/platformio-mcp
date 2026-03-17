import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { platformioExecutor } from '../src/platformio.js';
import { buildProject } from '../src/tools/build.js';
import {
  inspectProject,
  listProjectEnvironments,
} from '../src/tools/projects.js';

async function createProjectFixture(contents: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'platformio-mcp-'));
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, 'platformio.ini'), contents, 'utf8');
  return root;
}

describe('project inspection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses PlatformIO environments and default_envs from platformio.ini', async () => {
    const projectDir = await createProjectFixture(`
[platformio]
default_envs = esp32dev, native

[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
monitor_port = COM7

[env:native]
platform = native
test_filter = *
`);

    try {
      const inspection = await inspectProject(projectDir);

      expect(inspection.isPlatformIOProject).toBe(true);
      expect(inspection.defaultEnvironments).toEqual(['esp32dev', 'native']);
      expect(
        inspection.environments.map((environment) => environment.name)
      ).toEqual(['esp32dev', 'native']);
      expect(inspection.environments[0]).toEqual(
        expect.objectContaining({
          name: 'esp32dev',
          board: 'esp32dev',
          framework: 'arduino',
          monitorSpeed: 115200,
          monitorPort: 'COM7',
          isDefault: true,
        })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('returns environment summaries from a valid PlatformIO project', async () => {
    const projectDir = await createProjectFixture(`
[env:uno]
platform = atmelavr
board = uno

[env:esp32]
platform = espressif32
board = esp32dev
framework = arduino
`);

    try {
      const environments = await listProjectEnvironments(projectDir);

      expect(environments).toEqual([
        expect.objectContaining({
          name: 'uno',
          board: 'uno',
          platform: 'atmelavr',
        }),
        expect.objectContaining({
          name: 'esp32',
          board: 'esp32dev',
          framework: 'arduino',
        }),
      ]);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('rejects a build when the requested environment does not exist in the project', async () => {
    const projectDir = await createProjectFixture(`
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
`);
    const executeSpy = vi
      .spyOn(platformioExecutor, 'execute')
      .mockResolvedValue({
        stdout: 'should not run',
        stderr: '',
        exitCode: 0,
      });

    try {
      await expect(buildProject(projectDir, 'missing-env')).rejects.toThrow(
        /missing-env/i
      );
      expect(executeSpy).not.toHaveBeenCalled();
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});
