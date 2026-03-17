import { z } from 'zod';

import type { ExecutionResultMeta } from '../../types.js';
import { listDevices } from '../devices.js';
import { createToolResponse, defineTool } from './shared.js';

export const listDevicesToolDefinition = defineTool({
  name: 'list_devices',
  description:
    'Lists connected serial devices that can be used for firmware upload and monitoring.',
  inputSchema: { type: 'object', properties: {} },
  paramsSchema: z.object({}),
  handler: async () => {
    const devices = await listDevices();
    return createToolResponse({
      status: devices.length > 0 ? 'ok' : 'warning',
      summary:
        devices.length > 0
          ? `Detected ${devices.length} connected serial device(s).`
          : 'No connected serial devices were detected.',
      data: {
        meta: {
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        } satisfies ExecutionResultMeta,
        items: devices,
      },
      warnings:
        devices.length > 0
          ? []
          : [
              'Connect a board or verify that PlatformIO can access the serial port.',
            ],
      nextActions:
        devices.length > 0
          ? [
              {
                tool: 'start_monitor',
                reason: 'Capture serial output from a detected device.',
              },
            ]
          : [],
    });
  },
});
