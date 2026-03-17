import type { ExecutionResultMeta } from '../../types.js';
import { ListEnvironmentsParamsSchema } from '../../types.js';
import { listProjectEnvironments } from '../projects.js';
import { createToolResponse, defineTool } from './shared.js';

export const listEnvironmentsToolDefinition = defineTool({
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
  handler: async ({ projectDir }: { projectDir: string }) => {
    const environments = await listProjectEnvironments(projectDir);
    return createToolResponse({
      status: environments.length > 0 ? 'ok' : 'warning',
      summary:
        environments.length > 0
          ? `Project defines ${environments.length} environment(s).`
          : 'No PlatformIO environments were found.',
      data: {
        meta: {
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        } satisfies ExecutionResultMeta,
        items: environments,
      },
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
});
