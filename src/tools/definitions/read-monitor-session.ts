import { ReadMonitorSessionParamsSchema } from '../../types.js';
import { readMonitorSession } from '../monitor.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const readMonitorSessionToolDefinition = defineTool({
  name: 'read_monitor_session',
  description: 'Reads additional output from an existing monitor session.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: { type: 'string' },
      durationMs: { type: 'number' },
      maxLines: { type: 'number' },
      expectedPatterns: { type: 'array', items: { type: 'string' } },
      expectedJsonFields: { type: 'array', items: { type: 'string' } },
      expectedJsonNonNull: { type: 'array', items: { type: 'string' } },
      expectedJsonValues: { type: 'object' },
      allowedNullFields: { type: 'array', items: { type: 'string' } },
      expectedCycleSeconds: { type: 'number' },
      expectedCycleToleranceSeconds: { type: 'number' },
      minJsonMessages: { type: 'number' },
    },
    required: ['sessionId'],
  },
  paramsSchema: ReadMonitorSessionParamsSchema,
  handler: async (args) => {
    const result = await readMonitorSession(args);
    return createToolResponse({
      status:
        result.monitorStatus === 'port_open_failed' ||
        result.monitorStatus === 'session_read_timeout'
          ? 'warning'
          : 'ok',
      summary:
        result.monitorStatus === 'captured_output'
          ? `Read ${result.output?.length ?? 0} serial output line(s).`
          : 'Monitor session read completed without captured output.',
      data: withExecutionMeta(result, {
        operationType: 'monitor',
        executionStatus:
          result.monitorStatus === 'port_open_failed'
            ? 'blocked'
            : result.monitorStatus === 'session_read_timeout'
              ? 'blocked'
              : 'succeeded',
        verificationStatus: result.verificationStatus ?? 'not_requested',
        failureCategory: result.failureCategory,
        retryHint: result.retryHint,
        resolvedEnvironment: result.resolvedEnvironment,
        resolvedPort: result.resolvedPort,
        resolvedBaud: result.resolvedBaud,
        resolutionSource: result.resolutionSource,
      }),
      nextActions: [
        {
          tool: 'close_monitor_session',
          reason: 'Close the monitor session when no more reads are needed.',
          arguments: { sessionId: result.sessionId },
        },
      ],
    });
  },
});
