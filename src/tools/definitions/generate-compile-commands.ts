import type { ExecutionResultMeta } from '../../types.js';
import { GenerateCompileCommandsParamsSchema } from '../../types.js';
import { generateProjectCompilationDatabase } from '../projects.js';
import { createToolResponse, defineTool } from './shared.js';

export const generateCompileCommandsToolDefinition = defineTool({
  name: 'generate_compile_commands',
  description:
    'Generates compile_commands.json using the official PlatformIO compiledb target.',
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
  paramsSchema: GenerateCompileCommandsParamsSchema,
  handler: async ({ projectDir }: { projectDir: string }) => {
    const result = await generateProjectCompilationDatabase(projectDir);
    const success =
      result.generationStatus === 'generated' ||
      (result.success === true &&
        result.generationStatus === undefined &&
        Boolean(result.outputPath));
    return createToolResponse({
      status: success ? 'ok' : 'warning',
      summary: success
        ? 'Generated compile_commands.json.'
        : `compile_commands.json was not generated (${result.generationStatus ?? 'command_failed'}).`,
      data: {
        meta: {
          operationType: 'inspect',
          executionStatus: success ? 'succeeded' : 'failed',
          verificationStatus: 'not_requested',
          failureCategory: result.failureCategory,
          resolvedEnvironment: result.resolvedEnvironment,
        } satisfies ExecutionResultMeta,
        ...result,
      },
      warnings: success
        ? []
        : [
            result.failureCategory === 'toolchain_unavailable'
              ? 'Host toolchain is unavailable for this environment on the current machine.'
              : 'PlatformIO could not generate compile_commands.json for the selected project state.',
          ],
      nextActions: success
        ? [
            {
              tool: 'inspect_project',
              reason: 'Re-inspect the project after generating the compilation database.',
              arguments: { projectDir },
            },
          ]
        : [],
    });
  },
});
