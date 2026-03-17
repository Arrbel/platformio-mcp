import { InspectProjectParamsSchema } from '../../types.js';
import { inspectProject } from '../projects.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const inspectProjectToolDefinition = defineTool({
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
  handler: async ({ projectDir }: { projectDir: string }) => {
    const inspection = await inspectProject(projectDir);
    return createToolResponse({
      status: 'ok',
      summary: `Inspected PlatformIO project with ${inspection.environments.length} environment(s).`,
      data: withExecutionMeta(inspection, {
        operationType: 'inspect',
        executionStatus: 'succeeded',
        verificationStatus: 'not_requested',
      }),
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
});
