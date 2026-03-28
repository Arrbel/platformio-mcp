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
    const blockingProblemCount = report.detectedProblems.filter(
      (problem) => problem.blocking
    ).length;
    const problemCount = report.detectedProblems.length;
    const hasAdvisoryProblems =
      problemCount > 0 && blockingProblemCount === 0;
    const status =
      blockingProblemCount > 0
        ? 'error'
        : hasAdvisoryProblems || report.warnings.length > 0
          ? 'warning'
          : 'ok';
    const summaryParts = [
      `PlatformIO CLI ${report.platformio.installed ? 'ready' : 'not ready'}`,
      `project ${report.projectReadiness.status}`,
      `device ${report.deviceReadiness.status}`,
      `monitor ${report.monitorReadiness.status}`,
      `${problemCount} problem(s)`,
    ];

    if (blockingProblemCount > 0) {
      summaryParts.push(`${blockingProblemCount} blocking`);
    }

    return createToolResponse({
      status,
      summary: `Doctor completed: ${summaryParts.join('; ')}.`,
      data: withExecutionMeta(report, {
        operationType: 'doctor',
        executionStatus: 'succeeded',
        verificationStatus: 'not_requested',
      }),
      warnings: report.warnings,
      nextActions: [
        ...(report.repairReadiness.recommendedFixIds.length > 0
          ? [
              {
                tool: 'repair_environment',
                reason: 'Preview the recommended environment repair plan.',
                arguments: {
                  ...(projectDir ? { projectDir } : {}),
                  dryRun: true,
                },
              },
            ]
          : []),
        ...(projectDir
          ? [
              {
                tool: 'inspect_project',
                reason: 'Review parsed PlatformIO configuration and resolved environment truth.',
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
