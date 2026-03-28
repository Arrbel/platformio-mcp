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
    const summaryParts = [];

    if (inspection.projectSummary.environmentCount === 0) {
      summaryParts.push('no environments defined');
    } else {
      summaryParts.push(
        `${inspection.projectSummary.environmentCount} environment(s)`
      );
    }

    summaryParts.push(
      inspection.projectSummary.resolvedEnvironment
        ? `resolved environment '${inspection.projectSummary.resolvedEnvironment}' via ${inspection.projectSummary.environmentResolution}`
        : `environment resolution is ${inspection.projectSummary.environmentResolution}`
    );

    if (!inspection.projectSummary.hasMetadata) {
      summaryParts.push(
        inspection.resolvedEnvironment ? 'metadata unavailable' : 'metadata skipped'
      );
    }

    if (inspection.riskSummary.hasEnvironmentRisk) {
      summaryParts.push('environment risk present');
    }

    if (inspection.riskSummary.hasConfigurationRisk) {
      summaryParts.push('configuration risk present');
    }

    const nextActions: Array<{
      tool: string;
      reason: string;
      arguments: Record<string, unknown>;
    }> = [
      {
        tool: 'list_environments',
        reason: 'Review available build environments.',
        arguments: { projectDir },
      },
    ];

    if (inspection.resolvedEnvironment) {
      nextActions.push(
        {
          tool: 'list_project_targets',
          reason: 'Inspect available PlatformIO targets for the resolved environment.',
          arguments: {
            projectDir,
            environment: inspection.resolvedEnvironment,
          },
        },
        {
          tool: 'build_project',
          reason: 'Build the resolved environment directly.',
          arguments: {
            projectDir,
            environment: inspection.resolvedEnvironment,
          },
        }
      );

      if (inspection.projectCapabilities.canGenerateCompileCommands) {
        nextActions.push({
          tool: 'generate_compile_commands',
          reason: 'Generate compile_commands.json for code intelligence and static analysis.',
          arguments: { projectDir },
        });
      }
    }

    return createToolResponse({
      status: inspection.riskSummary.hasWarnings ? 'warning' : 'ok',
      summary: `Inspected PlatformIO project: ${summaryParts.join('; ')}.`,
      data: withExecutionMeta(inspection, {
        operationType: 'inspect',
        executionStatus: 'succeeded',
        verificationStatus: 'not_requested',
      }),
      warnings: Array.from(
        new Set([...inspection.warnings, ...inspection.resolutionWarnings])
      ),
      nextActions,
    });
  },
});
