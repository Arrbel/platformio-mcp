import { doctor } from '../doctor.js';
import { DoctorParamsSchema } from '../../types.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const doctorToolDefinition = defineTool({
  name: 'doctor',
  description:
    'Checks Node.js, PlatformIO, project status, and connected serial devices.',
  inputSchema: {
    type: 'object',
    properties: {
      projectDir: {
        type: 'string',
        description: 'Optional PlatformIO project directory to inspect',
      },
    },
  },
  paramsSchema: DoctorParamsSchema,
  handler: async ({ projectDir }: { projectDir?: string }) => {
    const report = await doctor({ projectDir });
    return createToolResponse({
      status: report.warnings.length > 0 ? 'warning' : 'ok',
      summary:
        report.warnings.length > 0
          ? 'Environment checks completed with warnings.'
          : 'Environment checks completed successfully.',
      data: withExecutionMeta(report, {
        operationType: 'doctor',
        executionStatus: 'succeeded',
        verificationStatus: 'not_requested',
      }),
      warnings: report.warnings,
      nextActions: [
        ...(projectDir
          ? [
              {
                tool: 'inspect_project',
                reason: 'Review parsed PlatformIO configuration.',
                arguments: { projectDir },
              },
            ]
          : []),
        {
          tool: 'list_devices',
          reason: 'Review currently connected upload and monitor targets.',
        },
      ],
    });
  },
});
