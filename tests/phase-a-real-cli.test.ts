import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildProject } from '../src/tools/build.js';
import { startMonitor } from '../src/tools/monitor.js';

function resolvePlatformIOCliPath(): string | undefined {
  return (
    process.env.PLATFORMIO_CLI_PATH ||
    path.join(os.homedir(), '.platformio', 'penv', 'Scripts', 'pio.exe')
  );
}

const platformioCliPath = resolvePlatformIOCliPath();
const hasLocalPlatformIO = !!platformioCliPath;
const phaseAReal = hasLocalPlatformIO ? describe : describe.skip;

let projectDir = '';

phaseAReal('phase A real CLI integration', () => {
  beforeAll(async () => {
    if (!platformioCliPath) {
      return;
    }

    process.env.PLATFORMIO_CLI_PATH = platformioCliPath;
    projectDir = await mkdtemp(
      path.join(os.tmpdir(), 'platformio-mcp-phase-a-')
    );
    await mkdir(path.join(projectDir, 'src'), { recursive: true });
    await writeFile(
      path.join(projectDir, 'platformio.ini'),
      `
[platformio]
default_envs = native

[env:native]
platform = native
build_flags = -DPIO_UNIT_TEST=1
monitor_port = COM11
monitor_speed = 115200
upload_port = COM12
`,
      'utf8'
    );
    await writeFile(
      path.join(projectDir, 'src', 'main.cpp'),
      `
#include <stdio.h>

int main() {
  puts("BOOT_OK");
  return 0;
}
`,
      'utf8'
    );
  });

  afterAll(async () => {
    if (projectDir) {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('returns resolved environment metadata for builds that use defaults', async () => {
    const result = await buildProject(projectDir);

    expect(result.environment).toBe('native');
    expect(result.resolvedEnvironment).toBe('native');
    expect(result.resolutionSource).toBe('platformio_default_envs');
  }, 30000);

  it('returns resolved monitor port metadata and an executable command', async () => {
    const result = await startMonitor({ projectDir });

    expect(result.command).toContain(platformioCliPath!);
    expect(result.resolvedPort).toBe('COM11');
    expect(result.resolvedEnvironment).toBe('native');
    expect(result.resolutionSource).toBe('project_monitor_port');
  });
});
