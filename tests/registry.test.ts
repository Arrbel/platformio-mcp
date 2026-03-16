import { afterEach, describe, expect, it, vi } from 'vitest';

import * as projectsModule from '../src/tools/projects.js';
import {
  createToolRegistry,
  invokeRegisteredTool,
} from '../src/tools/registry.js';

describe('tool registry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the new project inspection and doctor tools', () => {
    const registry = createToolRegistry();
    const names = registry.map((tool) => tool.name);

    expect(names).toContain('inspect_project');
    expect(names).toContain('list_environments');
    expect(names).toContain('doctor');
  });

  it('returns structured responses for tool invocations', async () => {
    vi.spyOn(projectsModule, 'inspectProject').mockResolvedValue({
      projectDir: 'E:/firmware',
      platformioIniPath: 'E:/firmware/platformio.ini',
      isPlatformIOProject: true,
      defaultEnvironments: ['esp32dev'],
      environments: [],
    });

    const response = await invokeRegisteredTool('inspect_project', {
      projectDir: 'E:/firmware',
    });

    expect(response).toEqual(
      expect.objectContaining({
        status: 'ok',
        data: expect.objectContaining({ projectDir: 'E:/firmware' }),
        summary: expect.stringMatching(/project/i),
        nextActions: expect.any(Array),
      })
    );
  });
});
