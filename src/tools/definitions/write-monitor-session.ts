import { WriteMonitorSessionParamsSchema } from '../../types.js';
import { writeMonitorSession } from '../monitor.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const writeMonitorSessionToolDefinition = defineTool({
  name: 'write_monitor_session',
  description: 'Writes text data to an existing serial or socket monitor session.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: { type: 'string' },
      data: { type: 'string' },
    },
    required: ['sessionId', 'data'],
  },
  paramsSchema: WriteMonitorSessionParamsSchema,
  handler: async (args) => {
    const result = await writeMonitorSession(args);
    return createToolResponse({
      status: 'ok',
      summary: 'Monitor session write completed.',
      data: withExecutionMeta(result, {
        operationType: 'monitor',
        executionStatus: 'succeeded',
        verificationStatus: result.verificationStatus ?? 'not_requested',
        failureCategory: result.failureCategory,
        retryHint: result.retryHint,
        resolvedEnvironment: result.resolvedEnvironment,
        resolvedPort: result.resolvedPort,
        resolvedBaud: result.resolvedBaud,
        resolutionSource: result.resolutionSource,
      }),
    });
  },
});
