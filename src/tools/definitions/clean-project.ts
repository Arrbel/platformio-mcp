import type { ExecutionResultMeta } from '../../types.js';
import { CleanProjectParamsSchema } from '../../types.js';
import { cleanProject } from '../build.js';
import { createToolResponse, defineTool } from './shared.js';

export const cleanProjectToolDefinition = defineTool({
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
  handler: async ({ projectDir }: { projectDir: string }) => {
    const result = await cleanProject(projectDir);
    return createToolResponse({
      status: 'ok',
      summary: result.message,
      data: {
        meta: {
          operationType: 'build',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        } satisfies ExecutionResultMeta,
        ...result,
      },
      nextActions: [
        {
          tool: 'build_project',
          reason: 'Rebuild the project from a clean state.',
          arguments: { projectDir },
        },
      ],
    });
  },
});
