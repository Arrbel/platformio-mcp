import { OpenMonitorSessionParamsSchema } from '../../types.js';
import { openMonitorSession } from '../monitor.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const openMonitorSessionToolDefinition = defineTool({
  name: 'open_monitor_session',
  description: 'Opens a serial or socket monitor session for incremental reads.',
  inputSchema: {
    type: 'object',
    properties: {
      port: { type: 'string' },
      baud: { type: 'number' },
      projectDir: { type: 'string' },
      echo: { type: 'boolean' },
      filters: { type: 'array', items: { type: 'string' } },
      raw: { type: 'boolean' },
      eol: { type: 'string', enum: ['CR', 'LF', 'CRLF'] },
    },
  },
  paramsSchema: OpenMonitorSessionParamsSchema,
  handler: async (args) => {
    const result = await openMonitorSession(args);
    return createToolResponse({
      status: 'ok',
      summary: 'Monitor session opened.',
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
      nextActions: [
        {
          tool: 'read_monitor_session',
          reason: 'Read runtime output from the opened monitor session.',
          arguments: { sessionId: result.sessionId },
        },
      ],
    });
  },
});
