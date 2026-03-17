import type { ExecutionResultMeta } from '../../types.js';
import { ListBoardsParamsSchema } from '../../types.js';
import { listBoards } from '../boards.js';
import { createToolResponse, defineTool } from './shared.js';

export const listBoardsToolDefinition = defineTool({
  name: 'list_boards',
  description:
    'Lists all available PlatformIO boards with optional filtering by platform, framework, or MCU.',
  inputSchema: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        description: 'Optional filter by platform, framework, or MCU',
      },
    },
  },
  paramsSchema: ListBoardsParamsSchema,
  handler: async ({ filter }: { filter?: string }) => {
    const boards = await listBoards(filter);
    return createToolResponse({
      status: boards.length > 0 ? 'ok' : 'warning',
      summary:
        boards.length > 0
          ? `Found ${boards.length} matching board(s).`
          : 'No matching boards were found.',
      data: {
        meta: {
          operationType: 'inspect',
          executionStatus: 'succeeded',
          verificationStatus: 'not_requested',
        } satisfies ExecutionResultMeta,
        items: boards,
      },
      warnings:
        boards.length > 0
          ? []
          : [
              'Try a broader board filter such as a platform or framework name.',
            ],
      nextActions:
        boards.length > 0
          ? [
              {
                tool: 'get_board_info',
                reason: 'Inspect one of the matching boards in detail.',
              },
            ]
          : [],
    });
  },
});
