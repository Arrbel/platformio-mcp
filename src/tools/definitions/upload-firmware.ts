import { UploadFirmwareParamsSchema } from '../../types.js';
import { uploadFirmware } from '../upload.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const uploadFirmwareToolDefinition = defineTool({
  name: 'upload_firmware',
  description: 'Uploads compiled firmware to a connected device.',
  inputSchema: {
    type: 'object',
    properties: {
      projectDir: { type: 'string' },
      port: { type: 'string' },
      environment: { type: 'string' },
    },
    required: ['projectDir'],
  },
  paramsSchema: UploadFirmwareParamsSchema,
  handler: async ({
    projectDir,
    port,
    environment,
  }: {
    projectDir: string;
    port?: string;
    environment?: string;
  }) => {
    const result = await uploadFirmware(projectDir, port, environment);
    return createToolResponse({
      status: result.success ? 'ok' : 'warning',
      summary: result.success
        ? 'Firmware upload completed.'
        : 'Firmware upload failed.',
      data: withExecutionMeta(result, {
        operationType: 'upload',
        executionStatus: result.success
          ? 'succeeded'
          : result.failureCategory === 'port_unavailable' ||
              result.failureCategory === 'device_not_found' ||
              result.failureCategory === 'manual_boot_required'
            ? 'blocked'
            : 'failed',
        verificationStatus: 'not_requested',
        failureCategory: result.failureCategory,
        retryHint: result.retryHint,
        resolvedEnvironment: result.resolvedEnvironment,
        resolvedPort: result.resolvedPort,
        resolutionSource: result.resolutionSource,
      }),
      warnings: result.errors ?? [],
      nextActions: [
        {
          tool: 'start_monitor',
          reason: 'Capture serial output after flashing.',
          arguments: { projectDir, port },
        },
      ],
    });
  },
});
