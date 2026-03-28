import { CloseMonitorSessionParamsSchema } from '../../types.js';
import { closeMonitorSession } from '../monitor.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const closeMonitorSessionToolDefinition = defineTool({
  name: 'close_monitor_session',
  description: 'Closes an existing serial or socket monitor session.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: { type: 'string' },
    },
    required: ['sessionId'],
  },
  paramsSchema: CloseMonitorSessionParamsSchema,
  handler: async (args) => {
    const result = await closeMonitorSession(args);
    return createToolResponse({
      status: 'ok',
      summary: 'Monitor session closed.',
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
