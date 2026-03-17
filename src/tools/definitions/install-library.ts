import type { ExecutionResultMeta } from '../../types.js';
import { InstallLibraryParamsSchema } from '../../types.js';
import { installLibrary } from '../libraries.js';
import { createToolResponse, defineTool } from './shared.js';

export const installLibraryToolDefinition = defineTool({
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
  handler: async ({
    library,
    projectDir,
    version,
  }: {
    library: string;
    projectDir?: string;
    version?: string;
  }) => {
    const result = await installLibrary(library, { projectDir, version });
    return createToolResponse({
      status: 'ok',
      summary: result.message,
      data: {
        meta: {
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        } satisfies ExecutionResultMeta,
        ...result,
      },
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
});
