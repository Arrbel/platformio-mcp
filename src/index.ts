#!/usr/bin/env node

/**
 * PlatformIO MCP Server
 * A board-agnostic MCP server for embedded development with PlatformIO.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { checkPlatformIOInstalled } from './platformio.js';
import { createToolRegistry, invokeRegisteredTool } from './tools/registry.js';
import type { ToolResponse } from './types.js';
import { formatPlatformIOError } from './utils/errors.js';

const toolRegistry = createToolRegistry();
const packageMetadata = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string };

export const SERVER_VERSION = packageMetadata.version;

function serializeToolResponse(response: ToolResponse): string {
  return JSON.stringify(response, null, 2);
}

const server = new Server(
  {
    name: 'platformio-mcp-server',
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolRegistry.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    const response = await invokeRegisteredTool(name, args);

    return {
      content: [
        {
          type: 'text',
          text: serializeToolResponse(response),
        },
      ],
    };
  } catch (error) {
    const errorMessage = formatPlatformIOError(error);
    return {
      content: [
        {
          type: 'text',
          text: serializeToolResponse({
            status: 'error',
            summary: 'Tool invocation failed.',
            data: null,
            warnings: [errorMessage],
            nextActions: [],
          }),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const isInstalled = await checkPlatformIOInstalled();
  if (!isInstalled) {
    console.error(
      'Warning: PlatformIO CLI not found. Please install it from https://platformio.org/install/cli'
    );
    console.error(
      'The server will start but commands will fail until PlatformIO is installed.\n'
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('PlatformIO MCP Server running on stdio');
  console.error(`Registered ${toolRegistry.length} MCP tools`);
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
