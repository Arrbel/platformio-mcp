import { describe, expect, it } from 'vitest';

import { createToolRegistry } from '../src/tools/registry.js';

describe('registry compatibility', () => {
  it('preserves the ordered public MCP tool list', () => {
    const registry = createToolRegistry();

    expect(registry.map((tool) => tool.name)).toEqual([
      'list_boards',
      'get_board_info',
      'list_devices',
      'init_project',
      'inspect_project',
      'list_project_targets',
      'generate_compile_commands',
      'list_environments',
      'build_project',
      'clean_project',
      'upload_firmware',
      'start_monitor',
      'open_monitor_session',
      'read_monitor_session',
      'write_monitor_session',
      'close_monitor_session',
      'search_libraries',
      'install_library',
      'list_installed_libraries',
      'doctor',
      'repair_environment',
    ]);
  });

  it('preserves MCP-visible input schemas for all tools', () => {
    const registry = createToolRegistry();
    const schemaByTool = Object.fromEntries(
      registry.map((tool) => [tool.name, tool.inputSchema])
    );

    expect(schemaByTool).toEqual({
      list_boards: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Optional filter by platform, framework, or MCU',
          },
        },
      },
      get_board_info: {
        type: 'object',
        properties: {
          boardId: {
            type: 'string',
            description: 'Board ID such as esp32dev or uno',
          },
        },
        required: ['boardId'],
      },
      list_devices: {
        type: 'object',
        properties: {},
      },
      init_project: {
        type: 'object',
        properties: {
          board: { type: 'string' },
          framework: { type: 'string' },
          projectDir: { type: 'string' },
          platformOptions: { type: 'object' },
        },
        required: ['board', 'projectDir'],
      },
      inspect_project: {
        type: 'object',
        properties: {
          projectDir: {
            type: 'string',
            description: 'Path to the PlatformIO project directory',
          },
        },
        required: ['projectDir'],
      },
      list_project_targets: {
        type: 'object',
        properties: {
          projectDir: {
            type: 'string',
            description: 'Path to the PlatformIO project directory',
          },
          environment: {
            type: 'string',
            description: 'Optional environment name to scope available targets',
          },
        },
        required: ['projectDir'],
      },
      generate_compile_commands: {
        type: 'object',
        properties: {
          projectDir: {
            type: 'string',
            description: 'Path to the PlatformIO project directory',
          },
        },
        required: ['projectDir'],
      },
      list_environments: {
        type: 'object',
        properties: {
          projectDir: {
            type: 'string',
            description: 'Path to the PlatformIO project directory',
          },
        },
        required: ['projectDir'],
      },
      build_project: {
        type: 'object',
        properties: {
          projectDir: { type: 'string' },
          environment: { type: 'string' },
        },
        required: ['projectDir'],
      },
      clean_project: {
        type: 'object',
        properties: {
          projectDir: { type: 'string' },
        },
        required: ['projectDir'],
      },
      upload_firmware: {
        type: 'object',
        properties: {
          projectDir: { type: 'string' },
          port: { type: 'string' },
          environment: { type: 'string' },
        },
        required: ['projectDir'],
      },
      start_monitor: {
        type: 'object',
        properties: {
          port: { type: 'string' },
          baud: { type: 'number' },
          projectDir: { type: 'string' },
          captureDurationMs: { type: 'number' },
          maxLines: { type: 'number' },
          echo: { type: 'boolean' },
          filters: { type: 'array', items: { type: 'string' } },
          raw: { type: 'boolean' },
          eol: { type: 'string', enum: ['CR', 'LF', 'CRLF'] },
          expectedPatterns: { type: 'array', items: { type: 'string' } },
          expectedJsonFields: { type: 'array', items: { type: 'string' } },
          expectedJsonNonNull: {
            type: 'array',
            items: { type: 'string' },
          },
          expectedJsonValues: { type: 'object' },
          allowedNullFields: { type: 'array', items: { type: 'string' } },
          expectedCycleSeconds: { type: 'number' },
          expectedCycleToleranceSeconds: { type: 'number' },
          minJsonMessages: { type: 'number' },
        },
      },
      open_monitor_session: {
        type: 'object',
        properties: {
          port: { type: 'string' },
          baud: { type: 'number' },
          projectDir: { type: 'string' },
          echo: { type: 'boolean' },
          filters: { type: 'array', items: { type: 'string' } },
          raw: { type: 'boolean' },
          eol: { type: 'string', enum: ['CR', 'LF', 'CRLF'] },
        },
      },
      read_monitor_session: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          durationMs: { type: 'number' },
          maxLines: { type: 'number' },
          expectedPatterns: { type: 'array', items: { type: 'string' } },
          expectedJsonFields: { type: 'array', items: { type: 'string' } },
          expectedJsonNonNull: { type: 'array', items: { type: 'string' } },
          expectedJsonValues: { type: 'object' },
          allowedNullFields: { type: 'array', items: { type: 'string' } },
          expectedCycleSeconds: { type: 'number' },
          expectedCycleToleranceSeconds: { type: 'number' },
          minJsonMessages: { type: 'number' },
        },
        required: ['sessionId'],
      },
      write_monitor_session: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          data: { type: 'string' },
        },
        required: ['sessionId', 'data'],
      },
      close_monitor_session: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
        },
        required: ['sessionId'],
      },
      search_libraries: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['query'],
      },
      install_library: {
        type: 'object',
        properties: {
          library: { type: 'string' },
          projectDir: { type: 'string' },
          version: { type: 'string' },
        },
        required: ['library'],
      },
      list_installed_libraries: {
        type: 'object',
        properties: {
          projectDir: { type: 'string' },
        },
      },
      doctor: {
        type: 'object',
        properties: {
          projectDir: {
            type: 'string',
            description: 'Optional PlatformIO project directory to inspect',
          },
        },
      },
      repair_environment: {
        type: 'object',
        properties: {
          problemCodes: { type: 'array', items: { type: 'string' } },
          fixIds: { type: 'array', items: { type: 'string' } },
          projectDir: { type: 'string' },
          allowInstall: { type: 'boolean' },
          allowShellProfileHints: { type: 'boolean' },
          dryRun: { type: 'boolean' },
        },
      },
    });
  });
});
