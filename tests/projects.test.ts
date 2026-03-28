import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import * as platformioModule from '../src/platformio.js';
import { platformioExecutor } from '../src/platformio.js';
import { buildProject } from '../src/tools/build.js';
import {
  generateProjectCompilationDatabase,
  inspectProject,
  listProjectEnvironments,
  listProjectTargets,
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
monitor_filters = esp32_exception_decoder, time

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
          monitorFilters: ['esp32_exception_decoder', 'time'],
          isDefault: true,
        })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('preserves multiline platformio.ini option values instead of turning them into fake keys', async () => {
    const projectDir = await createProjectFixture(`
[env:esp32-s3-devkitc-1]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
lib_deps =
  adafruit/DHT sensor library @ ^1.4.4
  adafruit/Adafruit Unified Sensor @ ^1.1.9
build_flags =
  -DCORE_DEBUG_LEVEL=3
  -DAPP_MODE=prod
monitor_speed = 115200
`);
    vi.spyOn(platformioModule, 'getProjectMetadata').mockRejectedValue(
      new Error('metadata unavailable')
    );

    try {
      const inspection = await inspectProject(projectDir);
      const environment = inspection.environments[0];

      expect(environment.options.lib_deps).toContain(
        'adafruit/DHT sensor library @ ^1.4.4'
      );
      expect(environment.options.lib_deps).toContain(
        'adafruit/Adafruit Unified Sensor @ ^1.1.9'
      );
      expect(environment.options.build_flags).toContain('-DCORE_DEBUG_LEVEL=3');
      expect(environment.options.build_flags).toContain('-DAPP_MODE=prod');
      expect(environment.options).not.toHaveProperty('-DCORE_DEBUG_LEVEL');
      expect(environment.options).not.toHaveProperty('-DAPP_MODE');
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

  it('merges PlatformIO metadata into project inspection output', async () => {
    const projectDir = await createProjectFixture(`
[platformio]
default_envs = esp32dev

[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
`);
    vi.spyOn(platformioModule, 'getProjectMetadata').mockResolvedValue({
      envName: 'esp32dev',
      buildType: 'release',
      toolchain: {
        ccPath: '/toolchain/bin/xtensa-esp32-elf-gcc',
        cxxPath: '/toolchain/bin/xtensa-esp32-elf-g++',
      },
      programPath: `${projectDir}/.pio/build/esp32dev/firmware.elf`,
      defines: ['PLATFORMIO=60119', 'ARDUINO=10805'],
      includes: {
        build: [`${projectDir}/include`, `${projectDir}/src`],
      },
      targets: ['buildprog', 'upload', 'monitor'],
      extra: {
        flash_images: [],
        mcp: {
          capabilities: ['monitor'],
        },
      },
    });

    try {
      const inspection = await inspectProject(projectDir);

      expect(inspection.metadataAvailable).toBe(true);
      expect(inspection.configSource).toBe('platformio_ini');
      expect(inspection.metadataSource).toBe('pio_project_metadata');
      expect(inspection.metadata).toEqual(
        expect.objectContaining({
          envName: 'esp32dev',
          buildType: 'release',
        })
      );
      expect(inspection.resolvedEnvironment).toBe('esp32dev');
      expect(inspection.environmentResolution).toBe('default_envs');
      expect(inspection.resolutionReason).toMatch(/default_envs/i);
      expect(inspection.resolutionWarnings).toEqual([]);
      expect(inspection.toolchain).toEqual(
        expect.objectContaining({
          ccPath: '/toolchain/bin/xtensa-esp32-elf-gcc',
          cxxPath: '/toolchain/bin/xtensa-esp32-elf-g++',
        })
      );
      expect(inspection.programPath).toContain('firmware.elf');
      expect(inspection.targets).toEqual(['buildprog', 'upload', 'monitor']);
      expect(inspection.defines).toContain('PLATFORMIO=60119');
      expect(inspection.metadataExtra).toEqual(
        expect.objectContaining({
          mcp: expect.objectContaining({
            capabilities: ['monitor'],
          }),
        })
      );
      expect(inspection.projectCapabilities).toEqual(
        expect.objectContaining({
          hasMetadata: true,
          hasTargets: true,
          canGenerateCompileCommands: true,
          hasTestDir: false,
          hasNativeEnvironment: false,
          hasCustomTargetsHint: false,
        })
      );
      expect(inspection.projectSummary).toEqual(
        expect.objectContaining({
          environmentCount: 1,
          resolvedEnvironment: 'esp32dev',
          environmentResolution: 'default_envs',
          defaultEnvironmentCount: 1,
          hasMetadata: true,
          hasTargets: true,
        })
      );
      expect(inspection.riskSummary).toEqual(
        expect.objectContaining({
          hasEnvironmentRisk: false,
          hasConfigurationRisk: false,
          hasWarnings: false,
        })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('reports configuration complexity warnings for advanced PlatformIO features', async () => {
    const projectDir = await createProjectFixture(`
[platformio]
default_envs = esp32dev
extra_configs = extra.ini

[env]
framework = arduino

[env:esp32dev]
extends = env
platform = espressif32
board = ${'{sysenv.PIO_BOARD}'}
monitor_port = ${'{this.__env__}'}
`);
    vi.spyOn(platformioModule, 'getProjectMetadata').mockRejectedValue(
      new Error('metadata unavailable')
    );

    try {
      const inspection = await inspectProject(projectDir);

      expect(inspection.warnings).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/extra_configs/i),
          expect.stringMatching(/extends/i),
          expect.stringMatching(/\$\{sysenv\./i),
          expect.stringMatching(/\$\{this\./i),
        ])
      );
      expect(inspection.configComplexitySignals).toEqual(
        expect.arrayContaining([
          'extends_present',
          'extra_configs_present',
          'sysenv_interpolation_present',
          'this_interpolation_present',
          'default_env_override_possible',
        ])
      );
      expect(inspection.riskSummary).toEqual(
        expect.objectContaining({
          hasEnvironmentRisk: true,
          hasConfigurationRisk: true,
          hasWarnings: true,
        })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('marks environment resolution as ambiguous when multiple environments have no explicit default', async () => {
    const projectDir = await createProjectFixture(`
[env:uno]
platform = atmelavr
board = uno

[env:esp32]
platform = espressif32
board = esp32dev
framework = arduino
`);
    vi.spyOn(platformioModule, 'getProjectMetadata').mockRejectedValue(
      new Error('metadata unavailable')
    );

    try {
      const inspection = await inspectProject(projectDir);

      expect(inspection.resolvedEnvironment).toBeUndefined();
      expect(inspection.environmentResolution).toBe('ambiguous');
      expect(inspection.resolutionReason).toMatch(/multiple environments/i);
      expect(inspection.resolutionWarnings).toEqual(
        expect.arrayContaining([expect.stringMatching(/ambiguous/i)])
      );
      expect(inspection.projectSummary).toEqual(
        expect.objectContaining({
          environmentCount: 2,
          resolvedEnvironment: undefined,
          environmentResolution: 'ambiguous',
          defaultEnvironmentCount: 0,
        })
      );
      expect(inspection.riskSummary).toEqual(
        expect.objectContaining({
          hasEnvironmentRisk: true,
          hasConfigurationRisk: false,
          hasWarnings: true,
        })
      );
      expect(inspection.projectCapabilities).toEqual(
        expect.objectContaining({
          hasNativeEnvironment: false,
          hasTestDir: false,
        })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('treats invalid default_envs entries as unresolved instead of pretending they exist', async () => {
    const projectDir = await createProjectFixture(`
[platformio]
default_envs = missing_env

[env:uno]
platform = atmelavr
board = uno
`);
    vi.spyOn(platformioModule, 'getProjectMetadata').mockRejectedValue(
      new Error('metadata unavailable')
    );

    try {
      const inspection = await inspectProject(projectDir);

      expect(inspection.resolvedEnvironment).toBeUndefined();
      expect(inspection.environmentResolution).toBe('not_resolved');
      expect(inspection.resolutionReason).toMatch(/default_envs/i);
      expect(inspection.resolutionWarnings).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/missing_env/i),
          expect.stringMatching(/does not match/i),
        ])
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('adds explicit warnings when default environment override risk exists', async () => {
    const projectDir = await createProjectFixture(`
[platformio]
default_envs = uno

[env:uno]
platform = atmelavr
board = ${'{sysenv.PIO_BOARD}'}
`);
    vi.spyOn(platformioModule, 'getProjectMetadata').mockRejectedValue(
      new Error('metadata unavailable')
    );

    try {
      const inspection = await inspectProject(projectDir);

      expect(inspection.configComplexitySignals).toContain(
        'default_env_override_possible'
      );
      expect(inspection.resolutionWarnings).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/environment variables/i),
          expect.stringMatching(/default environment/i),
        ])
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('uses single environment fallback when only one environment exists', async () => {
    const projectDir = await createProjectFixture(`
[env:native]
platform = native
`);
    vi.spyOn(platformioModule, 'getProjectMetadata').mockRejectedValue(
      new Error('metadata unavailable')
    );

    try {
      const inspection = await inspectProject(projectDir);

      expect(inspection.resolvedEnvironment).toBe('native');
      expect(inspection.environmentResolution).toBe('single_environment_fallback');
      expect(inspection.projectCapabilities).toEqual(
        expect.objectContaining({
          hasNativeEnvironment: true,
          canGenerateCompileCommands: true,
        })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('parses test, library, and extra script related config fields into environment summaries', async () => {
    const projectDir = await createProjectFixture(`
[platformio]
extra_scripts = pre:global_script.py

[env:native]
platform = native
test_ignore = embedded_*
test_framework = unity
test_build_src = yes
lib_deps =
  throwtheswitch/Unity @ ^2.5.2
lib_extra_dirs = shared_libs
lib_ldf_mode = chain+
lib_compat_mode = strict
extra_scripts =
  post:native_hook.py
`);
    vi.spyOn(platformioModule, 'getProjectMetadata').mockRejectedValue(
      new Error('metadata unavailable')
    );

    try {
      const inspection = await inspectProject(projectDir);
      expect(inspection.environments[0]).toEqual(
        expect.objectContaining({
          name: 'native',
          testIgnore: ['embedded_*'],
          testFramework: 'unity',
          testBuildSrc: true,
          libDeps: ['throwtheswitch/Unity @ ^2.5.2'],
          libExtraDirs: ['shared_libs'],
          libLdfMode: 'chain+',
          libCompatMode: 'strict',
          extraScripts: ['post:native_hook.py'],
        })
      );
      expect(inspection.projectCapabilities).toEqual(
        expect.objectContaining({
          hasTestConfiguration: true,
          hasLibraryDependencyOverrides: true,
          hasExtraScripts: true,
        })
      );
      expect(inspection.projectSummary).toEqual(
        expect.objectContaining({
          hasTestConfiguration: true,
          hasLibraryDependencyOverrides: true,
          hasExtraScripts: true,
        })
      );
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

  it('lists project targets through the official PlatformIO run --list-targets surface', async () => {
    const projectDir = await createProjectFixture(`
[env:native]
platform = native
`);
    vi.spyOn(platformioExecutor, 'execute').mockResolvedValue({
      stdout: `
Environment    Group     Name          Title
-------------  --------  ------------  ---------------------
native         General   buildprog     Build
native         General   upload        Upload
native         Advanced  compiledb     Generate compilation database
`,
      stderr: '',
      exitCode: 0,
    });

    try {
      const targets = await listProjectTargets(projectDir);

      expect(targets).toEqual(
        expect.objectContaining({
          projectDir,
          resolvedEnvironment: 'native',
          targetDiscoveryStatus: 'targets_found',
          targets: ['buildprog', 'upload', 'compiledb'],
        })
      );
      expect(targets.rawOutputExcerpt).toContain('buildprog');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('reports an empty target table as no_targets instead of failing parsing', async () => {
    const projectDir = await createProjectFixture(`
[env:native]
platform = native
`);
    vi.spyOn(platformioExecutor, 'execute').mockResolvedValue({
      stdout: `
Environment    Group     Name          Title
-------------  --------  ------------  ---------------------
`,
      stderr: '',
      exitCode: 0,
    });

    try {
      const result = await listProjectTargets(projectDir);
      expect(result.targetDiscoveryStatus).toBe('no_targets');
      expect(result.targets).toEqual([]);
      expect(result.rawOutputExcerpt).toContain('Environment');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('generates compile_commands.json via the official compiledb target', async () => {
    const projectDir = await createProjectFixture(`
[env:native]
platform = native
`);
    vi.spyOn(platformioModule, 'generateCompilationDatabase').mockResolvedValue({
      success: true,
      command:
        'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe run -t compiledb',
      outputPath: `${projectDir.replace(/\\/g, '/')}/compile_commands.json`,
    });

    try {
      const result = await generateProjectCompilationDatabase(projectDir);

      expect(result).toEqual(
        expect.objectContaining({
          generationStatus: 'generated',
          resolvedEnvironment: 'native',
          compileCommandsPath: expect.stringContaining('compile_commands.json'),
        })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});
