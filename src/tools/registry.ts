/**
 * MCP tool registry and structured response helpers.
 */

import type { ToolResponse } from '../types.js';
import { buildProjectToolDefinition } from './definitions/build-project.js';
import { cleanProjectToolDefinition } from './definitions/clean-project.js';
import { doctorToolDefinition } from './definitions/doctor.js';
import { getBoardInfoToolDefinition } from './definitions/get-board-info.js';
import { initProjectToolDefinition } from './definitions/init-project.js';
import { installLibraryToolDefinition } from './definitions/install-library.js';
import { inspectProjectToolDefinition } from './definitions/inspect-project.js';
import { listInstalledLibrariesToolDefinition } from './definitions/list-installed-libraries.js';
import { listBoardsToolDefinition } from './definitions/list-boards.js';
import { listDevicesToolDefinition } from './definitions/list-devices.js';
import { listEnvironmentsToolDefinition } from './definitions/list-environments.js';
import { searchLibrariesToolDefinition } from './definitions/search-libraries.js';
import { startMonitorToolDefinition } from './definitions/start-monitor.js';
import { type ToolDefinition } from './definitions/shared.js';
import { uploadFirmwareToolDefinition } from './definitions/upload-firmware.js';

const toolRegistry: ToolDefinition[] = [
  listBoardsToolDefinition,
  getBoardInfoToolDefinition,
  listDevicesToolDefinition,
  initProjectToolDefinition,
  inspectProjectToolDefinition,
  listEnvironmentsToolDefinition,
  buildProjectToolDefinition,
  cleanProjectToolDefinition,
  uploadFirmwareToolDefinition,
  startMonitorToolDefinition,
  searchLibrariesToolDefinition,
  installLibraryToolDefinition,
  listInstalledLibrariesToolDefinition,
  doctorToolDefinition,
];

export function createToolRegistry(): ToolDefinition[] {
  return toolRegistry;
}

export async function invokeRegisteredTool(
  name: string,
  args: unknown
): Promise<ToolResponse> {
  const tool = toolRegistry.find((entry) => entry.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const parsedArgs = tool.paramsSchema.parse(args ?? {});
  return tool.handler(parsedArgs);
}
