import type { ExecutionResultMeta } from '../../types.js';
import { SearchLibrariesParamsSchema } from '../../types.js';
import { searchLibraries } from '../libraries.js';
import { createToolResponse, defineTool } from './shared.js';

export const searchLibrariesToolDefinition = defineTool({
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
  handler: async ({ query, limit }: { query: string; limit?: number }) => {
    const libraries = await searchLibraries(query, limit);
    return createToolResponse({
      status: libraries.length > 0 ? 'ok' : 'warning',
      summary:
        libraries.length > 0
          ? `Found ${libraries.length} matching library result(s).`
          : 'No PlatformIO libraries matched the search query.',
      data: {
        meta: {
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        } satisfies ExecutionResultMeta,
        items: libraries,
      },
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
});
