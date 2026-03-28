import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function createClient() {
  const client = new Client(
    { name: 'vitest-mcp-e2e', version: '1.0.0' },
    { capabilities: {} }
  );

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['build/index.js'],
    env: { ...process.env },
    stderr: 'ignore',
  });

  await client.connect(transport);
  return client;
}

describe('MCP e2e repair flow', () => {
  const clients: Client[] = [];

  afterEach(async () => {
    while (clients.length > 0) {
      const client = clients.pop();
      await client?.close();
    }
  });

  it(
    'lists doctor and repair_environment and applies low-risk CLI activation fixes through MCP',
    async () => {
    const client = await createClient();
    clients.push(client);

    const tools = await client.listTools();
    expect(tools.tools.some((tool) => tool.name === 'doctor')).toBe(true);
    expect(
      tools.tools.some((tool) => tool.name === 'repair_environment')
    ).toBe(true);

    const before = await client.callTool({
      name: 'doctor',
      arguments: { projectDir: 'E:/program/platformio-mcp/源码' },
    });
    const repair = await client.callTool({
      name: 'repair_environment',
      arguments: {
        projectDir: 'E:/program/platformio-mcp/源码',
        dryRun: false,
        allowInstall: false,
        allowShellProfileHints: true,
        fixIds: ['set_platformio_cli_env_hint', 'activate_local_platformio_cli'],
      },
    });
    const after = await client.callTool({
      name: 'doctor',
      arguments: { projectDir: 'E:/program/platformio-mcp/源码' },
    });

    const beforePayload = JSON.parse(before.content?.[0]?.text ?? 'null');
    const repairPayload = JSON.parse(repair.content?.[0]?.text ?? 'null');
    const afterPayload = JSON.parse(after.content?.[0]?.text ?? 'null');

    expect(beforePayload.data.platformio.installed).toBe(true);
    expect(repairPayload.data.repairStatus).toBe('applied');
    expect(repairPayload.data.postRepairDoctor.platformio.shellCallable).toBe(true);
    expect(afterPayload.data.platformio.shellCallable).toBe(true);
    expect(
      afterPayload.data.detectedProblems.map(
        (item: { problemCode: string }) => item.problemCode
      )
    ).not.toContain('platformio_cli_not_shell_callable');
    if (
      beforePayload.data.detectedProblems.some(
        (item: { problemCode: string }) =>
          item.problemCode === 'platformio_cli_not_shell_callable'
      )
    ) {
      expect(repairPayload.data.appliedFixes).toEqual([
        { fixId: 'set_platformio_cli_env_hint' },
        { fixId: 'activate_local_platformio_cli' },
      ]);
    } else {
      expect(repairPayload.data.appliedFixes).toEqual([]);
    }
    },
    90000
  );

  it(
    'persists local PlatformIO CLI activation across fresh MCP server processes',
    async () => {
      const client = await createClient();
      clients.push(client);

      const repair = await client.callTool({
        name: 'repair_environment',
        arguments: {
          projectDir: 'E:/program/platformio-mcp/源码',
          dryRun: false,
          allowShellProfileHints: true,
          fixIds: ['activate_local_platformio_cli'],
        },
      });
      const repairPayload = JSON.parse(repair.content?.[0]?.text ?? 'null');

      expect(repairPayload.data.repairStatus).toBe('applied');

      await client.close();
      clients.pop();

      const freshClient = await createClient();
      clients.push(freshClient);
      const doctor = await freshClient.callTool({
        name: 'doctor',
        arguments: { projectDir: 'E:/program/platformio-mcp/源码' },
      });
      const doctorPayload = JSON.parse(doctor.content?.[0]?.text ?? 'null');

      expect(doctorPayload.data.platformio.shellCallable).toBe(true);
      expect(
        doctorPayload.data.detectedProblems.map(
          (item: { problemCode: string }) => item.problemCode
        )
      ).not.toContain('platformio_cli_not_shell_callable');
    },
    90000
  );
});
