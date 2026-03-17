import { GetBoardInfoParamsSchema } from '../../types.js';
import { getBoardInfo } from '../boards.js';
import { createToolResponse, defineTool } from './shared.js';

export const getBoardInfoToolDefinition = defineTool({
  name: 'get_board_info',
  description: 'Gets detailed information about a specific board.',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: {
        type: 'string',
        description: 'Board ID such as esp32dev or uno',
      },
    },
    required: ['boardId'],
  },
  paramsSchema: GetBoardInfoParamsSchema,
  handler: async ({ boardId }: { boardId: string }) => {
    const board = await getBoardInfo(boardId);
    return createToolResponse({
      status: 'ok',
      summary: `Loaded PlatformIO board metadata for '${boardId}'.`,
      data: board,
      nextActions: [
        {
          tool: 'init_project',
          reason: 'Create a PlatformIO project for this board.',
          arguments: { board: board.id },
        },
      ],
    });
  },
});
