import { BuildProjectParamsSchema } from '../../types.js';
import { buildProject } from '../build.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const buildProjectToolDefinition = defineTool({
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
  handler: async ({
    projectDir,
    environment,
  }: {
    projectDir: string;
    environment?: string;
  }) => {
    const result = await buildProject(projectDir, environment);
    return createToolResponse({
      status: result.success ? 'ok' : 'warning',
      summary: result.success
        ? `Build completed for '${result.environment}'.`
        : `Build failed for '${result.environment}'.`,
      data: withExecutionMeta(result, {
        operationType: 'build',
        executionStatus: result.success ? 'succeeded' : 'failed',
        verificationStatus: 'not_requested',
        failureCategory:
          result.success || !result.errors?.length ? undefined : 'build_failed',
        retryHint:
          result.success || !result.errors?.length
            ? undefined
            : 'inspect_build_output',
        resolvedEnvironment: result.resolvedEnvironment,
        resolutionSource: result.resolutionSource,
      }),
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
});
