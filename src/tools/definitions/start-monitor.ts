import { StartMonitorParamsSchema } from '../../types.js';
import { startMonitor } from '../monitor.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const startMonitorToolDefinition = defineTool({
  name: 'start_monitor',
  description:
    'Starts serial monitoring or captures serial output for a bounded interval.',
  inputSchema: {
    type: 'object',
    properties: {
      port: { type: 'string' },
      baud: { type: 'number' },
      projectDir: { type: 'string' },
      captureDurationMs: { type: 'number' },
      maxLines: { type: 'number' },
      echo: { type: 'boolean' },
      filters: { type: 'array', items: { type: 'string' } },
      raw: { type: 'boolean' },
      eol: { type: 'string', enum: ['CR', 'LF', 'CRLF'] },
      expectedPatterns: { type: 'array', items: { type: 'string' } },
      expectedJsonFields: { type: 'array', items: { type: 'string' } },
      expectedJsonNonNull: { type: 'array', items: { type: 'string' } },
      expectedJsonValues: { type: 'object' },
      allowedNullFields: { type: 'array', items: { type: 'string' } },
      expectedCycleSeconds: { type: 'number' },
      expectedCycleToleranceSeconds: { type: 'number' },
      minJsonMessages: { type: 'number' },
    },
  },
  paramsSchema: StartMonitorParamsSchema,
  handler: async (args) => {
    const result = await startMonitor({
      port: args.port,
      baud: args.baud,
      projectDir: args.projectDir,
      captureDurationMs: args.captureDurationMs,
      maxLines: args.maxLines,
      echo: args.echo,
      filters: args.filters,
      raw: args.raw,
      eol: args.eol,
      expectedPatterns: args.expectedPatterns,
      expectedJsonFields: args.expectedJsonFields,
      expectedJsonNonNull: args.expectedJsonNonNull,
      expectedJsonValues: args.expectedJsonValues,
      allowedNullFields: args.allowedNullFields,
      expectedCycleSeconds: args.expectedCycleSeconds,
      expectedCycleToleranceSeconds: args.expectedCycleToleranceSeconds,
      minJsonMessages: args.minJsonMessages,
    });
    return createToolResponse({
      status: 'ok',
      summary:
        result.mode === 'capture'
          ? `Captured ${result.output?.length ?? 0} serial output line(s).`
          : 'Generated a serial monitor command.',
      data: withExecutionMeta(result, {
        operationType: 'monitor',
        executionStatus:
          result.monitorStatus === 'port_open_failed'
            ? 'blocked'
            : result.mode === 'instructions'
              ? 'not_applicable'
              : 'succeeded',
        verificationStatus: result.verificationStatus ?? 'not_requested',
        failureCategory: result.failureCategory,
        retryHint: result.retryHint,
        resolvedEnvironment: result.resolvedEnvironment,
        resolvedPort: result.resolvedPort,
        resolvedBaud: result.resolvedBaud,
        resolutionSource: result.resolutionSource,
      }),
      nextActions:
        result.mode === 'capture'
          ? []
          : [
              {
                tool: 'list_devices',
                reason:
                  'Check connected serial devices if the command needs a specific port.',
              },
            ],
    });
  },
});
