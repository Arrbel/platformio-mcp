/**
 * Board discovery and information tools
 */

import { execPioCommand, parsePioJsonOutput } from '../platformio.js';
import type { BoardInfo, PlatformIOBoardRaw } from '../types.js';
import { PlatformIOBoardsRawArraySchema } from '../types.js';
import { validateBoardId } from '../utils/validation.js';
import { BoardNotFoundError, PlatformIOError } from '../utils/errors.js';

function normalizeBoard(board: PlatformIOBoardRaw): BoardInfo {
  return {
    id: board.id,
    name: board.name,
    platform: board.platform,
    mcu: board.mcu,
    frequency: String(board.frequency ?? board.fcpu ?? ''),
    flash: board.flash ?? board.rom ?? 0,
    ram: board.ram ?? 0,
    frameworks: board.frameworks,
    vendor: board.vendor,
    url: board.url,
    raw: board,
  };
}

async function loadBoards(filter?: string): Promise<BoardInfo[]> {
  const args = ['boards'];
  if (filter && filter.trim().length > 0) {
    args.push(filter.trim());
  }
  args.push('--json-output');

  const result = await execPioCommand(args, { timeout: 30000 });
  if (result.exitCode !== 0) {
    throw new PlatformIOError(
      `PlatformIO command failed: boards ${filter ?? ''}`.trim(),
      'COMMAND_FAILED',
      { stderr: result.stderr, exitCode: result.exitCode, filter }
    );
  }

  const rawBoards = parsePioJsonOutput(
    result.stdout,
    PlatformIOBoardsRawArraySchema
  );
  return rawBoards.map(normalizeBoard);
}

/**
 * Lists all available PlatformIO boards with optional filtering
 */
export async function listBoards(filter?: string): Promise<BoardInfo[]> {
  try {
    const allBoards = await loadBoards(filter);

    // Apply filter if provided (PlatformIO does basic filtering, but we can enhance it)
    if (filter && filter.trim().length > 0) {
      const filterLower = filter.trim().toLowerCase();
      return allBoards.filter(
        (board) =>
          board.id.toLowerCase().includes(filterLower) ||
          board.name.toLowerCase().includes(filterLower) ||
          board.platform.toLowerCase().includes(filterLower) ||
          board.mcu.toLowerCase().includes(filterLower) ||
          board.frameworks?.some((fw) => fw.toLowerCase().includes(filterLower))
      );
    }

    return allBoards;
  } catch (error) {
    throw new PlatformIOError(
      `Failed to list boards${filter ? ` with filter '${filter}'` : ''}: ${error}`,
      'LIST_BOARDS_FAILED',
      { filter }
    );
  }
}

/**
 * Gets detailed information about a specific board
 */
export async function getBoardInfo(boardId: string): Promise<BoardInfo> {
  if (!validateBoardId(boardId)) {
    throw new BoardNotFoundError(boardId);
  }

  try {
    const boards = await loadBoards(boardId);
    const board = boards.find((item) => item.id === boardId);
    if (board) {
      return board;
    }

    // If we get here, the board wasn't found
    throw new BoardNotFoundError(boardId);
  } catch (error) {
    if (error instanceof BoardNotFoundError) {
      throw error;
    }
    throw new PlatformIOError(
      `Failed to get board info for '${boardId}': ${error}`,
      'GET_BOARD_INFO_FAILED',
      { boardId }
    );
  }
}

/**
 * Lists boards grouped by platform
 */
export async function listBoardsByPlatform(): Promise<
  Record<string, BoardInfo[]>
> {
  try {
    const boards = await loadBoards();
    const result: Record<string, BoardInfo[]> = {};

    for (const board of boards) {
      result[board.platform] ??= [];
      result[board.platform].push(board);
    }
    return result;
  } catch (error) {
    throw new PlatformIOError(
      `Failed to list boards by platform: ${error}`,
      'LIST_BOARDS_BY_PLATFORM_FAILED'
    );
  }
}

/**
 * Searches for boards matching specific criteria
 */
export async function searchBoards(criteria: {
  platform?: string;
  framework?: string;
  mcu?: string;
  name?: string;
}): Promise<BoardInfo[]> {
  const allBoards = await listBoards();

  return allBoards.filter((board) => {
    if (
      criteria.platform &&
      !board.platform.toLowerCase().includes(criteria.platform.toLowerCase())
    ) {
      return false;
    }
    if (
      criteria.framework &&
      !board.frameworks?.some((fw) =>
        fw.toLowerCase().includes(criteria.framework!.toLowerCase())
      )
    ) {
      return false;
    }
    if (
      criteria.mcu &&
      !board.mcu.toLowerCase().includes(criteria.mcu.toLowerCase())
    ) {
      return false;
    }
    if (
      criteria.name &&
      !board.name.toLowerCase().includes(criteria.name.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Gets a list of all available platforms
 */
export async function listPlatforms(): Promise<string[]> {
  const boardsByPlatform = await listBoardsByPlatform();
  return Object.keys(boardsByPlatform).sort();
}

/**
 * Gets a list of all available frameworks across all boards
 */
export async function listFrameworks(): Promise<string[]> {
  const allBoards = await listBoards();
  const frameworkSet = new Set<string>();

  for (const board of allBoards) {
    if (board.frameworks) {
      for (const framework of board.frameworks) {
        frameworkSet.add(framework);
      }
    }
  }

  return Array.from(frameworkSet).sort();
}
