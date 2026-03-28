import { afterEach, describe, expect, it, vi } from 'vitest';

import * as projectsModule from '../src/tools/projects.js';
import {
  createToolRegistry,
  invokeRegisteredTool,
} from '../src/tools/registry.js';

describe('tool registry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the new project inspection and doctor tools', () => {
    const registry = createToolRegistry();
    const names = registry.map((tool) => tool.name);

    expect(names).toContain('inspect_project');
    expect(names).toContain('list_project_targets');
    expect(names).toContain('generate_compile_commands');
    expect(names).toContain('list_environments');
    expect(names).toContain('doctor');
  });

  it('returns structured responses for tool invocations', async () => {
    vi.spyOn(projectsModule, 'inspectProject').mockResolvedValue({
      projectDir: 'E:/firmware',
      platformioIniPath: 'E:/firmware/platformio.ini',
      isPlatformIOProject: true,
      configSource: 'platformio_ini',
      metadataSource: 'pio_project_metadata',
      defaultEnvironments: ['esp32dev'],
      environments: [],
      environmentResolution: 'default_envs',
      resolvedEnvironment: 'esp32dev',
      resolutionReason: 'Resolved from platformio.default_envs (esp32dev).',
      resolutionWarnings: [],
      metadataAvailable: false,
      configComplexitySignals: [],
      projectCapabilities: {
        hasMetadata: false,
        hasTargets: false,
        canGenerateCompileCommands: true,
        hasTestDir: false,
        hasTestConfiguration: false,
        hasLibraryDependencyOverrides: false,
        hasExtraScripts: false,
        hasNativeEnvironment: false,
        hasCustomTargetsHint: false,
      },
      projectSummary: {
        environmentCount: 1,
        defaultEnvironmentCount: 1,
        resolvedEnvironment: 'esp32dev',
        environmentResolution: 'default_envs',
        hasMetadata: false,
        hasTargets: false,
        hasTestConfiguration: false,
        hasLibraryDependencyOverrides: false,
        hasExtraScripts: false,
      },
      riskSummary: {
        hasEnvironmentRisk: false,
        hasConfigurationRisk: false,
        hasWarnings: false,
      },
      warnings: [],
    });

    const response = await invokeRegisteredTool('inspect_project', {
      projectDir: 'E:/firmware',
    });

    expect(response).toEqual(
      expect.objectContaining({
        status: 'ok',
        data: expect.objectContaining({
          projectDir: 'E:/firmware',
          meta: expect.objectContaining({
            operationType: 'inspect',
            executionStatus: 'succeeded',
            verificationStatus: 'not_requested',
          }),
        }),
        summary: expect.stringMatching(/project/i),
        nextActions: expect.any(Array),
      })
    );
    expect(response.summary).toMatch(/1 environment/i);
    expect(response.summary).toMatch(/resolved environment 'esp32dev'/i);
    expect(response.summary).toMatch(/metadata unavailable/i);
    expect(response.data).toEqual(
      expect.objectContaining({
        projectSummary: expect.objectContaining({
          environmentResolution: 'default_envs',
          resolvedEnvironment: 'esp32dev',
        }),
        riskSummary: expect.objectContaining({
          hasEnvironmentRisk: false,
        }),
      })
    );
    expect(response.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tool: 'build_project',
          arguments: expect.objectContaining({
            projectDir: 'E:/firmware',
            environment: 'esp32dev',
          }),
        }),
        expect.objectContaining({
          tool: 'list_project_targets',
          arguments: expect.objectContaining({
            projectDir: 'E:/firmware',
            environment: 'esp32dev',
          }),
        }),
        expect.objectContaining({
          tool: 'generate_compile_commands',
          arguments: expect.objectContaining({
            projectDir: 'E:/firmware',
          }),
        }),
      ])
    );
  });

  it('does not suggest direct build when environment resolution is ambiguous', async () => {
    vi.spyOn(projectsModule, 'inspectProject').mockResolvedValue({
      projectDir: 'E:/firmware',
      platformioIniPath: 'E:/firmware/platformio.ini',
      isPlatformIOProject: true,
      configSource: 'platformio_ini',
      metadataSource: 'pio_project_metadata',
      defaultEnvironments: [],
      environments: [
        {
          name: 'uno',
          board: 'uno',
          platform: 'atmelavr',
          isDefault: false,
          options: { board: 'uno', platform: 'atmelavr' },
        },
        {
          name: 'esp32dev',
          board: 'esp32dev',
          platform: 'espressif32',
          isDefault: false,
          options: { board: 'esp32dev', platform: 'espressif32' },
        },
      ],
      environmentResolution: 'ambiguous',
      resolvedEnvironment: undefined,
      resolutionReason: 'Multiple environments are defined and no default_envs entry was found.',
      resolutionWarnings: [
        'Environment selection is ambiguous until a specific environment is provided or default_envs is configured.',
      ],
      metadataAvailable: false,
      configComplexitySignals: [],
      projectCapabilities: {
        hasMetadata: false,
        hasTargets: false,
        canGenerateCompileCommands: true,
        hasTestDir: false,
        hasTestConfiguration: false,
        hasLibraryDependencyOverrides: false,
        hasExtraScripts: false,
        hasNativeEnvironment: false,
        hasCustomTargetsHint: false,
      },
      projectSummary: {
        environmentCount: 2,
        defaultEnvironmentCount: 0,
        resolvedEnvironment: undefined,
        environmentResolution: 'ambiguous',
        hasMetadata: false,
        hasTargets: false,
        hasTestConfiguration: false,
        hasLibraryDependencyOverrides: false,
        hasExtraScripts: false,
      },
      riskSummary: {
        hasEnvironmentRisk: true,
        hasConfigurationRisk: false,
        hasWarnings: true,
      },
      warnings: [],
    });

    const response = await invokeRegisteredTool('inspect_project', {
      projectDir: 'E:/firmware',
    });

    expect(response.status).toBe('warning');
    expect(response.summary).toMatch(/environment resolution is ambiguous/i);
    expect(response.summary).toMatch(/2 environment\(s\)/i);
    expect(response.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/ambiguous/i),
      ])
    );
    expect(response.nextActions).toEqual([
      expect.objectContaining({
        tool: 'list_environments',
      }),
    ]);
  });

  it('summarizes projects without environments as metadata skipped and keeps next actions read-only', async () => {
    vi.spyOn(projectsModule, 'inspectProject').mockResolvedValue({
      projectDir: 'E:/firmware',
      platformioIniPath: 'E:/firmware/platformio.ini',
      isPlatformIOProject: true,
      configSource: 'platformio_ini',
      metadataSource: 'pio_project_metadata',
      defaultEnvironments: [],
      environments: [],
      environmentResolution: 'not_resolved',
      resolvedEnvironment: undefined,
      resolutionReason: 'No [env:<name>] sections were found in platformio.ini.',
      resolutionWarnings: ['Project does not currently define any PlatformIO environments.'],
      metadataAvailable: false,
      configComplexitySignals: [],
      projectCapabilities: {
        hasMetadata: false,
        hasTargets: false,
        canGenerateCompileCommands: false,
        hasTestDir: false,
        hasTestConfiguration: false,
        hasLibraryDependencyOverrides: false,
        hasExtraScripts: false,
        hasNativeEnvironment: false,
        hasCustomTargetsHint: false,
      },
      projectSummary: {
        environmentCount: 0,
        defaultEnvironmentCount: 0,
        resolvedEnvironment: undefined,
        environmentResolution: 'not_resolved',
        hasMetadata: false,
        hasTargets: false,
        hasTestConfiguration: false,
        hasLibraryDependencyOverrides: false,
        hasExtraScripts: false,
      },
      riskSummary: {
        hasEnvironmentRisk: true,
        hasConfigurationRisk: false,
        hasWarnings: true,
      },
      warnings: [],
    });

    const response = await invokeRegisteredTool('inspect_project', {
      projectDir: 'E:/firmware',
    });

    expect(response.status).toBe('warning');
    expect(response.summary).toMatch(/no environments defined/i);
    expect(response.summary).toMatch(/metadata skipped/i);
    expect(response.nextActions).toEqual([
      expect.objectContaining({
        tool: 'list_environments',
      }),
    ]);
  });

  it('returns execution meta for environment listing responses', async () => {
    vi.spyOn(projectsModule, 'listProjectEnvironments').mockResolvedValue([
      {
        name: 'esp32dev',
        board: 'esp32dev',
        platform: 'espressif32',
        framework: 'arduino',
        isDefault: true,
        options: {
          board: 'esp32dev',
          platform: 'espressif32',
          framework: 'arduino',
        },
      },
    ]);

    const response = await invokeRegisteredTool('list_environments', {
      projectDir: 'E:/firmware',
    });

    expect(response.data).toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        }),
      })
    );
  });
});
