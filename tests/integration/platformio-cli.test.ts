import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import {
  generateProjectCompilationDatabase,
  inspectProject,
  listProjectTargets,
} from '../../src/tools/projects.js';

function resolvePlatformIOCliPath(): string {
  const configured = process.env.PLATFORMIO_CLI_PATH?.trim();
  if (configured) {
    return configured;
  }

  if (process.platform === 'win32') {
    return path.join(process.env.USERPROFILE ?? '', '.platformio', 'penv', 'Scripts', 'pio.exe');
  }

  return path.join(process.env.HOME ?? '', '.platformio', 'penv', 'bin', 'pio');
}

const configuredPlatformIOPath = resolvePlatformIOCliPath();
const pioCommand =
  configuredPlatformIOPath && existsSync(configuredPlatformIOPath)
    ? configuredPlatformIOPath
    : 'pio';
const hasPlatformIO = (() => {
  try {
    execSync(`${pioCommand} --version`, {
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

const platformioCli = hasPlatformIO ? describe : describe.skip;
const PIO_TIMEOUT = 120_000;
const officialExampleDir = 'E:/program/platformio-official/platformio-examples/wiring-blink';
const officialUnitTestingExampleDir =
  'E:/program/platformio-official/platformio-examples/unit-testing/calculator';

describe('integration test environment detection', () => {
  it('recognizes the locally configured PlatformIO CLI on this host', () => {
    if (pioCommand === 'pio') {
      return;
    }

    expect(hasPlatformIO).toBe(true);
  });
});

function runPio(command: string, options?: { cwd?: string; timeout?: number }) {
  return execSync(`${pioCommand} ${command}`, {
    cwd: options?.cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: options?.timeout ?? PIO_TIMEOUT,
  });
}

platformioCli('PlatformIO CLI integration', () => {
  beforeAll(() => {
    if (pioCommand !== 'pio') {
      process.env.PLATFORMIO_CLI_PATH = pioCommand;
    }
  });

  it('pio --version returns a version string', () => {
    const output = runPio('--version', { timeout: 10_000 });
    expect(output).toMatch(/PlatformIO Core/i);
  });

  it('pio boards returns at least one board entry', () => {
    const output = runPio('boards --json-output');
    const boards = JSON.parse(output);

    expect(Array.isArray(boards)).toBe(true);
    expect(boards.length).toBeGreaterThan(0);
  });

  describe('temp project init + build', () => {
    let projectDir = '';

    beforeAll(() => {
      projectDir = mkdtempSync(path.join(tmpdir(), 'pio-mcp-test-'));
    });

    afterAll(() => {
      if (projectDir) {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });

    it.skipIf(!hasHostGpp)(
      'pio init and pio run succeed on a minimal native project',
      () => {
      // Write platformio.ini directly — 'native' is a platform, not a board ID,
      // and some PlatformIO versions reject it via --board.
      writeFileSync(
        path.join(projectDir, 'platformio.ini'),
        '[env:native]\nplatform = native\n',
        'utf8'
      );

      const srcDir = path.join(projectDir, 'src');
      if (!existsSync(srcDir)) {
        mkdirSync(srcDir, { recursive: true });
      }

      writeFileSync(
        path.join(srcDir, 'main.cpp'),
        '#include <stdio.h>\n\nint main() {\n  puts("BOOT_OK");\n  return 0;\n}\n',
        'utf8'
      );

      const output = runPio('run', { cwd: projectDir });
      expect(output).toMatch(/SUCCESS/i);
      }
    );

    it('inspect_project can resolve official project metadata on a minimal native project', async () => {
      writeFileSync(
        path.join(projectDir, 'platformio.ini'),
        '[platformio]\ndefault_envs = native\n\n[env:native]\nplatform = native\n',
        'utf8'
      );

      const srcDir = path.join(projectDir, 'src');
      if (!existsSync(srcDir)) {
        mkdirSync(srcDir, { recursive: true });
      }

      writeFileSync(
        path.join(srcDir, 'main.cpp'),
        '#include <stdio.h>\n\nint main() {\n  puts("BOOT_OK");\n  return 0;\n}\n',
        'utf8'
      );

      const result = await inspectProject(projectDir);
      expect(result.defaultEnvironments).toEqual(['native']);
      expect(result.metadataAvailable).toBe(true);
      expect(result.metadata?.envName).toBe('native');
      expect(result.projectSummary).toEqual(
        expect.objectContaining({
          environmentCount: 1,
          resolvedEnvironment: 'native',
          environmentResolution: 'default_envs',
          hasMetadata: true,
        })
      );
    });

    it('list_project_targets exposes official run --list-targets output', async () => {
      writeFileSync(
        path.join(projectDir, 'platformio.ini'),
        '[platformio]\ndefault_envs = native\n\n[env:native]\nplatform = native\n',
        'utf8'
      );

      const srcDir = path.join(projectDir, 'src');
      if (!existsSync(srcDir)) {
        mkdirSync(srcDir, { recursive: true });
      }

      writeFileSync(
        path.join(srcDir, 'main.cpp'),
        '#include <stdio.h>\n\nint main() {\n  puts("BOOT_OK");\n  return 0;\n}\n',
        'utf8'
      );

      const result = await listProjectTargets(projectDir);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it.skipIf(!hasHostGpp)(
      'generate_compile_commands produces compile_commands.json when compiledb is available',
      async () => {
      writeFileSync(
        path.join(projectDir, 'platformio.ini'),
        '[platformio]\ndefault_envs = native\n\n[env:native]\nplatform = native\n',
        'utf8'
      );

      const srcDir = path.join(projectDir, 'src');
      if (!existsSync(srcDir)) {
        mkdirSync(srcDir, { recursive: true });
      }

      writeFileSync(
        path.join(srcDir, 'main.cpp'),
        '#include <stdio.h>\n\nint main() {\n  puts("BOOT_OK");\n  return 0;\n}\n',
        'utf8'
      );

      const result = await generateProjectCompilationDatabase(projectDir);
      expect(result.success).toBe(true);
      expect(result.outputPath).toMatch(/compile_commands\.json$/);
      expect(existsSync(path.join(projectDir, 'compile_commands.json'))).toBe(true);
      }
    );
  });

  describe('official example read-only truth surfaces', () => {
    it(
      'inspect_project can explain environment truth on wiring-blink',
      async () => {
      const result = await inspectProject(officialExampleDir);

      expect(result.isPlatformIOProject).toBe(true);
      expect(result.configSource).toBe('platformio_ini');
      expect(result.metadataSource).toBe('pio_project_metadata');
      expect(result.environments.length).toBeGreaterThan(0);
      expect(
        ['default_envs', 'single_environment_fallback', 'ambiguous', 'not_resolved']
      ).toContain(result.environmentResolution);
      expect(result.projectCapabilities).toEqual(
        expect.objectContaining({
          hasTestDir: true,
          canGenerateCompileCommands: true,
        })
      );
      expect(result.projectSummary).toEqual(
        expect.objectContaining({
          environmentCount: 3,
          environmentResolution: 'ambiguous',
        })
      );
      expect(result.riskSummary).toEqual(
        expect.objectContaining({
          hasEnvironmentRisk: true,
          hasWarnings: true,
        })
      );
      },
      60000
    );

    it(
      'list_project_targets returns structured status on wiring-blink',
      async () => {
      const result = await listProjectTargets(officialExampleDir, 'featheresp32');

      expect(result.resolvedEnvironment).toBe('featheresp32');
      expect(['targets_found', 'no_targets']).toContain(
        result.targetDiscoveryStatus
      );
      expect(Array.isArray(result.targets)).toBe(true);
      expect(result.rawOutputExcerpt.length).toBeGreaterThan(0);
      },
      60000
    );

    it(
      'generate_compile_commands returns a structured result on wiring-blink',
      async () => {
      const result = await generateProjectCompilationDatabase(officialExampleDir);

      expect(
        ['generated', 'toolchain_unavailable', 'environment_not_resolved', 'command_failed']
      ).toContain(result.generationStatus);
      if (result.generationStatus === 'environment_not_resolved') {
        expect(result.resolvedEnvironment).toBeUndefined();
      } else {
        expect(result.resolvedEnvironment).toBeTruthy();
      }
      if (result.generationStatus === 'generated') {
        expect(result.compileCommandsPath).toMatch(/compile_commands\.json$/);
      }
      },
      60000
    );
  });

  describe('official unit-testing example truth surfaces', () => {
    it(
      'inspect_project detects native and test-related capabilities on calculator',
      async () => {
        const result = await inspectProject(officialUnitTestingExampleDir);

        expect(result.isPlatformIOProject).toBe(true);
        expect(result.environments.map((environment) => environment.name)).toEqual(
          expect.arrayContaining(['uno', 'native'])
        );
        expect(result.projectCapabilities).toEqual(
          expect.objectContaining({
            hasTestDir: true,
            hasTestConfiguration: true,
            hasNativeEnvironment: true,
            canGenerateCompileCommands: true,
          })
        );
        expect(result.projectSummary).toEqual(
          expect.objectContaining({
            environmentCount: 2,
            hasTestConfiguration: true,
            resolvedEnvironment: undefined,
            environmentResolution: 'ambiguous',
          })
        );
        expect(result.environments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'uno',
              testIgnore: ['test_desktop'],
            }),
            expect.objectContaining({
              name: 'native',
              testIgnore: ['test_embedded'],
            }),
          ])
        );
      },
      60000
    );
  });
});
