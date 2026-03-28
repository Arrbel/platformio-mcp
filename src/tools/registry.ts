/**
 * MCP tool registry and structured response helpers.
 */

import type { ToolResponse } from '../types.js';
import { buildProjectToolDefinition } from './definitions/build-project.js';
import { cleanProjectToolDefinition } from './definitions/clean-project.js';
import { closeMonitorSessionToolDefinition } from './definitions/close-monitor-session.js';
import { doctorToolDefinition } from './definitions/doctor.js';
import { generateCompileCommandsToolDefinition } from './definitions/generate-compile-commands.js';
import { getBoardInfoToolDefinition } from './definitions/get-board-info.js';
import { initProjectToolDefinition } from './definitions/init-project.js';
import { installLibraryToolDefinition } from './definitions/install-library.js';
import { inspectProjectToolDefinition } from './definitions/inspect-project.js';
import { listInstalledLibrariesToolDefinition } from './definitions/list-installed-libraries.js';
import { listBoardsToolDefinition } from './definitions/list-boards.js';
import { listDevicesToolDefinition } from './definitions/list-devices.js';
import { listEnvironmentsToolDefinition } from './definitions/list-environments.js';
import { listProjectTargetsToolDefinition } from './definitions/list-project-targets.js';
import { openMonitorSessionToolDefinition } from './definitions/open-monitor-session.js';
import { readMonitorSessionToolDefinition } from './definitions/read-monitor-session.js';
import { repairEnvironmentToolDefinition } from './definitions/repair-environment.js';
import { searchLibrariesToolDefinition } from './definitions/search-libraries.js';
import { startMonitorToolDefinition } from './definitions/start-monitor.js';
import { type ToolDefinition } from './definitions/shared.js';
import { uploadFirmwareToolDefinition } from './definitions/upload-firmware.js';
import { writeMonitorSessionToolDefinition } from './definitions/write-monitor-session.js';

const toolRegistry: ToolDefinition[] = [
  listBoardsToolDefinition,
  getBoardInfoToolDefinition,
  listDevicesToolDefinition,
  initProjectToolDefinition,
  inspectProjectToolDefinition,
  listProjectTargetsToolDefinition,
  generateCompileCommandsToolDefinition,
  listEnvironmentsToolDefinition,
  buildProjectToolDefinition,
  cleanProjectToolDefinition,
  uploadFirmwareToolDefinition,
  startMonitorToolDefinition,
  openMonitorSessionToolDefinition,
  readMonitorSessionToolDefinition,
  writeMonitorSessionToolDefinition,
  closeMonitorSessionToolDefinition,
  searchLibrariesToolDefinition,
  installLibraryToolDefinition,
  listInstalledLibrariesToolDefinition,
  doctorToolDefinition,
  repairEnvironmentToolDefinition,
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
