import type { ExecutionResultMeta } from '../../types.js';
import { ListProjectTargetsParamsSchema } from '../../types.js';
import { listProjectTargets } from '../projects.js';
import { createToolResponse, defineTool } from './shared.js';

export const listProjectTargetsToolDefinition = defineTool({
  name: 'list_project_targets',
  description:
    'Lists available PlatformIO build targets for a project environment.',
  inputSchema: {
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
  paramsSchema: ListProjectTargetsParamsSchema,
  handler: async ({
    projectDir,
    environment,
  }: {
    projectDir: string;
    environment?: string;
  }) => {
    const result = await listProjectTargets(projectDir, environment);
    const targets = result.targets ?? result.items ?? [];
    return createToolResponse({
      status: result.targetDiscoveryStatus === 'targets_found' ? 'ok' : 'warning',
      summary:
        result.targetDiscoveryStatus === 'targets_found'
          ? `Found ${targets.length} available target(s).`
          : 'No PlatformIO targets were reported for this project.',
      data: {
        meta: {
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        } satisfies ExecutionResultMeta,
        ...result,
      },
      warnings:
        result.targetDiscoveryStatus === 'targets_found'
          ? []
          : ['Check the selected environment and project configuration.'],
      nextActions: targets.includes('compiledb')
        ? [
            {
              tool: 'generate_compile_commands',
              reason: 'Generate compile_commands.json for editor and analysis tooling.',
              arguments: { projectDir },
            },
          ]
        : [],
    });
  },
});
