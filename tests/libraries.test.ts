import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import * as platformioModule from '../src/platformio.js';
import { platformioExecutor } from '../src/platformio.js';
import {
  installLibrary,
  listInstalledLibraries,
  searchLibraries,
} from '../src/tools/libraries.js';

describe('libraries official pkg alignment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves pagination metadata from pkg search results', async () => {
    vi.spyOn(platformioModule, 'execPioCommand').mockResolvedValue({
      stdout: JSON.stringify({
        page: 2,
        perpage: 25,
        total: 80,
        items: [
          {
            id: 64,
            name: 'ArduinoJson',
            description: 'JSON for embedded systems',
            versionname: '7.4.3',
            authornames: ['Benoit Blanchon'],
            frameworks: [{ name: 'arduino' }],
            platforms: [{ name: 'espressif32' }],
          },
        ],
      }),
      stderr: '',
      exitCode: 0,
    });

    const result = await searchLibraries('ArduinoJson');

    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual({
      page: 2,
      perPage: 25,
      total: 80,
    });
  });

  it('returns project package tree items without requiring an id field', async () => {
    vi.spyOn(platformioExecutor, 'execute').mockResolvedValue({
      stdout: JSON.stringify([
        {
          name: 'ArduinoJson',
          version: '7.4.3',
          type: 'library',
          owner: 'bblanchon',
          optional: false,
        },
        {
          name: 'platform-espressif32',
          version: '6.12.0',
          type: 'platform',
          optional: false,
        },
      ]),
      stderr: '',
      exitCode: 0,
    });

    const result = await listInstalledLibraries('E:/firmware');

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'ArduinoJson',
          packageType: 'library',
          id: undefined,
        }),
        expect.objectContaining({
          name: 'platform-espressif32',
          packageType: 'platform',
        }),
      ])
    );
  });

  it('classifies install failures by category', async () => {
    vi.spyOn(platformioExecutor, 'execute').mockResolvedValue({
      stdout: '',
      stderr: 'Error: Could not find the package with \'UnknownLib\' requirements for your system',
      exitCode: 1,
    });

    await expect(
      installLibrary('UnknownLib', { projectDir: 'E:/firmware' })
    ).rejects.toMatchObject({
      context: expect.objectContaining({
        failureCategory: 'registry_not_found',
      }),
    });
  });

  it('installs libraries via pkg install semantics instead of legacy lib install', async () => {
    const projectDir = await mkdtemp(
      path.join(os.tmpdir(), 'platformio-mcp-library-install-')
    );
    const executeSpy = vi.spyOn(platformioExecutor, 'execute').mockResolvedValue({
      stdout: 'Installed ArduinoJson',
      stderr: '',
      exitCode: 0,
    });

    try {
      const result = await installLibrary('ArduinoJson', {
        projectDir,
        version: '7.4.3',
      });

      expect(result.success).toBe(true);
      expect(executeSpy).toHaveBeenCalledWith(
        'pkg',
        ['install', '--library', 'ArduinoJson@7.4.3', '--project-dir', projectDir],
        expect.objectContaining({ timeout: 120000 })
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});
