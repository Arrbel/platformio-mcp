import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildProject } from '../src/tools/build.js';
import { startMonitor } from '../src/tools/monitor.js';
import {
  generateProjectCompilationDatabase,
  inspectProject,
  listProjectTargets,
} from '../src/tools/projects.js';

function resolvePlatformIOCliPath(): string | undefined {
  const envPath = process.env.PLATFORMIO_CLI_PATH;
  if (envPath) return envPath;

  // Platform-aware default path
  if (process.platform === 'win32') {
    return path.join(os.homedir(), '.platformio', 'penv', 'Scripts', 'pio.exe');
  }
  return path.join(os.homedir(), '.platformio', 'penv', 'bin', 'pio');
}

const platformioCliPath = resolvePlatformIOCliPath();
const hasLocalPlatformIO = (() => {
  if (!platformioCliPath) return false;
  try {
    execSync(`"${platformioCliPath}" --version`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
})();
const hasHostGpp = (() => {
  try {
    execSync('g++ --version', {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
})();
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

  it.skipIf(!hasHostGpp)(
    'returns resolved environment metadata for builds that use defaults',
    async () => {
    const result = await buildProject(projectDir);

    expect(result.environment).toBe('native');
    expect(result.resolvedEnvironment).toBe('native');
    expect(result.resolutionSource).toBe('platformio_default_envs');
    },
    30000
  );

  it('returns resolved monitor port metadata and an executable command', async () => {
    const result = await startMonitor({ projectDir });

    // Command contains 'device monitor' and the resolved port/baud.
    // Format varies by platform (may include cd prefix with projectDir).
    expect(result.command).toContain('device monitor');
    expect(result.command).toContain('--port COM11');
    expect(result.command).toContain('--baud 115200');
    expect(result.resolvedPort).toBe('COM11');
    expect(result.resolvedEnvironment).toBe('native');
    expect(result.resolutionSource).toBe('project_monitor_port');
  });

  it('inspect_project exposes environment truth and capabilities on a real native project', async () => {
    const result = await inspectProject(projectDir);

    expect(result.configSource).toBe('platformio_ini');
    expect(result.metadataSource).toBe('pio_project_metadata');
    expect(result.resolvedEnvironment).toBe('native');
    expect(result.environmentResolution).toBe('default_envs');
    expect(result.metadataAvailable).toBe(true);
    expect(result.projectCapabilities).toEqual(
      expect.objectContaining({
        hasMetadata: true,
        hasNativeEnvironment: true,
        canGenerateCompileCommands: true,
      })
    );
  });

  it('list_project_targets returns structured discovery status on a real native project', async () => {
    const result = await listProjectTargets(projectDir);

    expect(result.resolvedEnvironment).toBe('native');
    expect(['targets_found', 'no_targets']).toContain(
      result.targetDiscoveryStatus
    );
    expect(Array.isArray(result.targets)).toBe(true);
    expect(result.rawOutputExcerpt.length).toBeGreaterThan(0);
  });

  it('generate_compile_commands returns structured status on a real native project', async () => {
    const result = await generateProjectCompilationDatabase(projectDir);

    if (hasHostGpp) {
      expect(result.generationStatus).toBe('generated');
      expect(result.compileCommandsPath).toMatch(/compile_commands\.json$/);
    } else {
      expect(['generated', 'toolchain_unavailable', 'command_failed']).toContain(
        result.generationStatus
      );
    }
    expect(result.resolvedEnvironment).toBe('native');
  });
});
