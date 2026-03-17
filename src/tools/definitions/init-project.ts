import type { ExecutionResultMeta } from '../../types.js';
import { InitProjectParamsSchema } from '../../types.js';
import { initProject } from '../projects.js';
import { createToolResponse, defineTool } from './shared.js';

export const initProjectToolDefinition = defineTool({
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
  handler: async (args: {
    board: string;
    framework?: string;
    projectDir: string;
    platformOptions?: Record<string, string>;
  }) => {
    const result = await initProject(args);
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
});
