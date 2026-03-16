/**
 * MCP tool registry and structured response helpers.
 */

import { z } from 'zod';
import type { ToolResponse } from '../types.js';
import {
  BuildProjectParamsSchema,
  CleanProjectParamsSchema,
  DoctorParamsSchema,
  GetBoardInfoParamsSchema,
  InitProjectParamsSchema,
  InspectProjectParamsSchema,
  InstallLibraryParamsSchema,
  ListBoardsParamsSchema,
  ListEnvironmentsParamsSchema,
  ListInstalledLibrariesParamsSchema,
  SearchLibrariesParamsSchema,
  StartMonitorParamsSchema,
  UploadFirmwareParamsSchema,
} from '../types.js';
import { getBoardInfo, listBoards } from './boards.js';
import { buildProject, cleanProject } from './build.js';
import { listDevices } from './devices.js';
import { doctor } from './doctor.js';
import {
  installLibrary,
  listInstalledLibraries,
  searchLibraries,
} from './libraries.js';
import { startMonitor } from './monitor.js';
import {
  initProject,
  inspectProject,
  listProjectEnvironments,
} from './projects.js';
import { uploadFirmware } from './upload.js';

export type ToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  paramsSchema: TSchema;
  handler: (args: z.infer<TSchema>) => Promise<ToolResponse>;
};

function createToolResponse<TData>(
  response: Omit<ToolResponse<TData>, 'warnings' | 'nextActions'> &
    Partial<Pick<ToolResponse<TData>, 'warnings' | 'nextActions'>>
): ToolResponse<TData> {
  return {
    ...response,
    warnings: response.warnings ?? [],
    nextActions: response.nextActions ?? [],
  };
}

const toolRegistry: ToolDefinition[] = [
  {
    name: 'list_boards',
    description:
      'Lists all available PlatformIO boards with optional filtering by platform, framework, or MCU.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Optional filter by platform, framework, or MCU',
        },
      },
    },
    paramsSchema: ListBoardsParamsSchema,
    handler: async ({ filter }) => {
      const boards = await listBoards(filter);
      return createToolResponse({
        status: boards.length > 0 ? 'ok' : 'warning',
        summary:
          boards.length > 0
            ? `Found ${boards.length} matching board(s).`
            : 'No matching boards were found.',
        data: boards,
        warnings:
          boards.length > 0
            ? []
            : [
                'Try a broader board filter such as a platform or framework name.',
              ],
        nextActions:
          boards.length > 0
            ? [
                {
                  tool: 'get_board_info',
                  reason: 'Inspect one of the matching boards in detail.',
                },
              ]
            : [],
      });
    },
  },
  {
    name: 'get_board_info',
    description: 'Gets detailed information about a specific board.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: {
          type: 'string',
          description: 'Board ID such as esp32dev or uno',
        },
      },
      required: ['boardId'],
    },
    paramsSchema: GetBoardInfoParamsSchema,
    handler: async ({ boardId }) => {
      const board = await getBoardInfo(boardId);
      return createToolResponse({
        status: 'ok',
        summary: `Loaded PlatformIO board metadata for '${boardId}'.`,
        data: board,
        nextActions: [
          {
            tool: 'init_project',
            reason: 'Create a PlatformIO project for this board.',
            arguments: { board: board.id },
          },
        ],
      });
    },
  },
  {
    name: 'list_devices',
    description:
      'Lists connected serial devices that can be used for firmware upload and monitoring.',
    inputSchema: { type: 'object', properties: {} },
    paramsSchema: z.object({}),
    handler: async () => {
      const devices = await listDevices();
      return createToolResponse({
        status: devices.length > 0 ? 'ok' : 'warning',
        summary:
          devices.length > 0
            ? `Detected ${devices.length} connected serial device(s).`
            : 'No connected serial devices were detected.',
        data: devices,
        warnings:
          devices.length > 0
            ? []
            : [
                'Connect a board or verify that PlatformIO can access the serial port.',
              ],
        nextActions:
          devices.length > 0
            ? [
                {
                  tool: 'start_monitor',
                  reason: 'Capture serial output from a detected device.',
                },
              ]
            : [],
      });
    },
  },
  {
    name: 'init_project',
    description:
      'Initializes a new PlatformIO project with the specified board and optional framework.',
    inputSchema: {
      type: 'object',
      properties: {
        board: { type: 'string' },
        framework: { type: 'string' },
        projectDir: { type: 'string' },
        platformOptions: { type: 'object' },
      },
      required: ['board', 'projectDir'],
    },
    paramsSchema: InitProjectParamsSchema,
    handler: async (args) => {
      const result = await initProject(args);
      return createToolResponse({
        status: 'ok',
        summary: result.message,
        data: result,
        nextActions: [
          {
            tool: 'inspect_project',
            reason: 'Inspect the generated PlatformIO project.',
            arguments: { projectDir: result.path },
          },
          {
            tool: 'build_project',
            reason: 'Compile the new firmware project.',
            arguments: { projectDir: result.path },
          },
        ],
      });
    },
  },
  {
    name: 'inspect_project',
    description:
      'Parses platformio.ini and returns project environments, defaults, and board metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: {
          type: 'string',
          description: 'Path to the PlatformIO project directory',
        },
      },
      required: ['projectDir'],
    },
    paramsSchema: InspectProjectParamsSchema,
    handler: async ({ projectDir }) => {
      const inspection = await inspectProject(projectDir);
      return createToolResponse({
        status: 'ok',
        summary: `Inspected PlatformIO project with ${inspection.environments.length} environment(s).`,
        data: inspection,
        nextActions: [
          {
            tool: 'list_environments',
            reason: 'Review available build environments.',
            arguments: { projectDir },
          },
          {
            tool: 'build_project',
            reason: 'Build the default or chosen environment.',
            arguments: { projectDir },
          },
        ],
      });
    },
  },
  {
    name: 'list_environments',
    description:
      'Lists the environments defined in platformio.ini for a PlatformIO project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: {
          type: 'string',
          description: 'Path to the PlatformIO project directory',
        },
      },
      required: ['projectDir'],
    },
    paramsSchema: ListEnvironmentsParamsSchema,
    handler: async ({ projectDir }) => {
      const environments = await listProjectEnvironments(projectDir);
      return createToolResponse({
        status: environments.length > 0 ? 'ok' : 'warning',
        summary:
          environments.length > 0
            ? `Project defines ${environments.length} environment(s).`
            : 'No PlatformIO environments were found.',
        data: environments,
        warnings:
          environments.length > 0
            ? []
            : ['Add at least one [env:<name>] section to platformio.ini.'],
        nextActions:
          environments.length > 0
            ? [
                {
                  tool: 'build_project',
                  reason: 'Build one of the discovered environments.',
                  arguments: { projectDir },
                },
              ]
            : [],
      });
    },
  },
  {
    name: 'build_project',
    description: 'Compiles the project and generates firmware binaries.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: { type: 'string' },
        environment: { type: 'string' },
      },
      required: ['projectDir'],
    },
    paramsSchema: BuildProjectParamsSchema,
    handler: async ({ projectDir, environment }) => {
      const result = await buildProject(projectDir, environment);
      return createToolResponse({
        status: result.success ? 'ok' : 'warning',
        summary: result.success
          ? `Build completed for '${result.environment}'.`
          : `Build failed for '${result.environment}'.`,
        data: result,
        warnings: result.errors ?? [],
        nextActions: result.success
          ? [
              {
                tool: 'upload_firmware',
                reason: 'Flash the compiled firmware to connected hardware.',
                arguments: { projectDir, environment },
              },
              {
                tool: 'start_monitor',
                reason: 'Capture serial output from the device after flashing.',
                arguments: { projectDir },
              },
            ]
          : [
              {
                tool: 'inspect_project',
                reason: 'Review project environments and configuration.',
                arguments: { projectDir },
              },
            ],
      });
    },
  },
  {
    name: 'clean_project',
    description: 'Removes build artifacts from a PlatformIO project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: { type: 'string' },
      },
      required: ['projectDir'],
    },
    paramsSchema: CleanProjectParamsSchema,
    handler: async ({ projectDir }) => {
      const result = await cleanProject(projectDir);
      return createToolResponse({
        status: 'ok',
        summary: result.message,
        data: result,
        nextActions: [
          {
            tool: 'build_project',
            reason: 'Rebuild the project from a clean state.',
            arguments: { projectDir },
          },
        ],
      });
    },
  },
  {
    name: 'upload_firmware',
    description: 'Uploads compiled firmware to a connected device.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: { type: 'string' },
        port: { type: 'string' },
        environment: { type: 'string' },
      },
      required: ['projectDir'],
    },
    paramsSchema: UploadFirmwareParamsSchema,
    handler: async ({ projectDir, port, environment }) => {
      const result = await uploadFirmware(projectDir, port, environment);
      return createToolResponse({
        status: result.success ? 'ok' : 'warning',
        summary: result.success
          ? 'Firmware upload completed.'
          : 'Firmware upload failed.',
        data: result,
        warnings: result.errors ?? [],
        nextActions: [
          {
            tool: 'start_monitor',
            reason: 'Capture serial output after flashing.',
            arguments: { projectDir, port },
          },
        ],
      });
    },
  },
  {
    name: 'start_monitor',
    description:
      'Starts serial monitoring or captures serial output for a bounded interval.',
    inputSchema: {
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
        expectedJsonNonNull: { type: 'array', items: { type: 'string' } },
        expectedJsonValues: { type: 'object' },
        allowedNullFields: { type: 'array', items: { type: 'string' } },
        expectedCycleSeconds: { type: 'number' },
        expectedCycleToleranceSeconds: { type: 'number' },
        minJsonMessages: { type: 'number' },
      },
    },
    paramsSchema: StartMonitorParamsSchema,
    handler: async (args) => {
      const result = await startMonitor(
        args.port,
        args.baud,
        args.projectDir,
        args.captureDurationMs,
        args.maxLines,
        args.echo,
        args.filters,
        args.raw,
        args.eol,
        args.expectedPatterns,
        args.expectedJsonFields,
        args.expectedJsonNonNull,
        args.expectedJsonValues,
        args.allowedNullFields,
        args.expectedCycleSeconds,
        args.expectedCycleToleranceSeconds,
        args.minJsonMessages
      );
      return createToolResponse({
        status: 'ok',
        summary:
          result.mode === 'capture'
            ? `Captured ${result.output?.length ?? 0} serial output line(s).`
            : 'Generated a serial monitor command.',
        data: result,
        nextActions:
          result.mode === 'capture'
            ? []
            : [
                {
                  tool: 'list_devices',
                  reason:
                    'Check connected serial devices if the command needs a specific port.',
                },
              ],
      });
    },
  },
  {
    name: 'search_libraries',
    description: 'Searches the PlatformIO library registry.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['query'],
    },
    paramsSchema: SearchLibrariesParamsSchema,
    handler: async ({ query, limit }) => {
      const libraries = await searchLibraries(query, limit);
      return createToolResponse({
        status: libraries.length > 0 ? 'ok' : 'warning',
        summary:
          libraries.length > 0
            ? `Found ${libraries.length} matching library result(s).`
            : 'No PlatformIO libraries matched the search query.',
        data: libraries,
        warnings:
          libraries.length > 0
            ? []
            : ['Try a broader search term or search by the package name.'],
        nextActions:
          libraries.length > 0
            ? [
                {
                  tool: 'install_library',
                  reason:
                    'Install a matching library into a project or globally.',
                },
              ]
            : [],
      });
    },
  },
  {
    name: 'install_library',
    description: 'Installs a PlatformIO library globally or into a project.',
    inputSchema: {
      type: 'object',
      properties: {
        library: { type: 'string' },
        projectDir: { type: 'string' },
        version: { type: 'string' },
      },
      required: ['library'],
    },
    paramsSchema: InstallLibraryParamsSchema,
    handler: async ({ library, projectDir, version }) => {
      const result = await installLibrary(library, { projectDir, version });
      return createToolResponse({
        status: 'ok',
        summary: result.message,
        data: result,
        nextActions: projectDir
          ? [
              {
                tool: 'build_project',
                reason: 'Rebuild the project after adding a dependency.',
                arguments: { projectDir },
              },
            ]
          : [],
      });
    },
  },
  {
    name: 'list_installed_libraries',
    description:
      'Lists installed PlatformIO libraries globally or for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: { type: 'string' },
      },
    },
    paramsSchema: ListInstalledLibrariesParamsSchema,
    handler: async ({ projectDir }) => {
      const libraries = await listInstalledLibraries(projectDir);
      return createToolResponse({
        status: libraries.length > 0 ? 'ok' : 'warning',
        summary:
          libraries.length > 0
            ? `Found ${libraries.length} installed librar${libraries.length === 1 ? 'y' : 'ies'}.`
            : 'No installed libraries were found.',
        data: libraries,
        warnings:
          libraries.length > 0
            ? []
            : [
                'Install a library with install_library if the project depends on external components.',
              ],
        nextActions: projectDir
          ? [
              {
                tool: 'build_project',
                reason: 'Build the project to verify its library dependencies.',
                arguments: { projectDir },
              },
            ]
          : [],
      });
    },
  },
  {
    name: 'doctor',
    description:
      'Checks Node.js, PlatformIO, project status, and connected serial devices.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: {
          type: 'string',
          description: 'Optional PlatformIO project directory to inspect',
        },
      },
    },
    paramsSchema: DoctorParamsSchema,
    handler: async ({ projectDir }) => {
      const report = await doctor({ projectDir });
      return createToolResponse({
        status: report.warnings.length > 0 ? 'warning' : 'ok',
        summary:
          report.warnings.length > 0
            ? 'Environment checks completed with warnings.'
            : 'Environment checks completed successfully.',
        data: report,
        warnings: report.warnings,
        nextActions: [
          ...(projectDir
            ? [
                {
                  tool: 'inspect_project',
                  reason: 'Review parsed PlatformIO configuration.',
                  arguments: { projectDir },
                },
              ]
            : []),
          {
            tool: 'list_devices',
            reason: 'Review currently connected upload and monitor targets.',
          },
        ],
      });
    },
  },
];

export function createToolRegistry(): ToolDefinition[] {
  return toolRegistry;
}

export async function invokeRegisteredTool(
  name: string,
  args: unknown
): Promise<ToolResponse> {
  const tool = toolRegistry.find((entry) => entry.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const parsedArgs = tool.paramsSchema.parse(args ?? {});
  return tool.handler(parsedArgs);
}
