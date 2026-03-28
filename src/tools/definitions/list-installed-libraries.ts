import type { ExecutionResultMeta } from '../../types.js';
import { ListInstalledLibrariesParamsSchema } from '../../types.js';
import { listInstalledLibraries } from '../libraries.js';
import { createToolResponse, defineTool } from './shared.js';

export const listInstalledLibrariesToolDefinition = defineTool({
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
  handler: async ({ projectDir }: { projectDir?: string }) => {
    const libraries = await listInstalledLibraries(projectDir);
    return createToolResponse({
      status: libraries.items.length > 0 ? 'ok' : 'warning',
      summary:
        libraries.items.length > 0
          ? `Found ${libraries.items.length} installed librar${libraries.items.length === 1 ? 'y' : 'ies'}.`
          : 'No installed libraries were found.',
      data: {
        meta: {
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        } satisfies ExecutionResultMeta,
        items: libraries.items,
      },
      warnings:
        libraries.items.length > 0
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
});
