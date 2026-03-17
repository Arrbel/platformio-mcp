import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import * as platformioModule from '../src/platformio.js';
import { platformioExecutor } from '../src/platformio.js';
import { getBoardInfo, listBoards } from '../src/tools/boards.js';
import { buildProject } from '../src/tools/build.js';
import {
  listInstalledLibraries,
  searchLibraries,
} from '../src/tools/libraries.js';
import { startMonitor } from '../src/tools/monitor.js';

async function createProjectFixture(contents: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'platformio-mcp-compat-'));
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, 'platformio.ini'), contents, 'utf8');
  return root;
}

describe('PlatformIO 6.1.19 compatibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts array-based board output and maps fcpu/rom fields', async () => {
    vi.spyOn(platformioModule, 'execPioCommand').mockResolvedValue({
      stdout: JSON.stringify([
        {
          id: 'uno',
          name: 'Arduino Uno',
          platform: 'atmelavr',
          mcu: 'ATMEGA328P',
          fcpu: 16000000,
          rom: 32256,
          ram: 2048,
          frameworks: ['arduino'],
          vendor: 'Arduino',
          url: 'https://example.test/uno',
        },
      ]),
      stderr: '',
      exitCode: 0,
    });

    const boards = await listBoards('uno');

    expect(boards).toEqual([
      expect.objectContaining({
        id: 'uno',
        platform: 'atmelavr',
        frequency: '16000000',
        flash: 32256,
        ram: 2048,
      }),
    ]);
  });

  it('finds a single board from array-based PlatformIO board output', async () => {
    vi.spyOn(platformioModule, 'execPioCommand').mockResolvedValue({
      stdout: JSON.stringify([
        {
          id: 'uno',
          name: 'Arduino Uno',
          platform: 'atmelavr',
          mcu: 'ATMEGA328P',
          fcpu: 16000000,
          rom: 32256,
          ram: 2048,
          frameworks: ['arduino'],
        },
      ]),
      stderr: '',
      exitCode: 0,
    });

    const board = await getBoardInfo('uno');

    expect(board.id).toBe('uno');
    expect(board.frequency).toBe('16000000');
    expect(board.flash).toBe(32256);
  });

  it('reads paginated library search results from the items array', async () => {
    vi.spyOn(platformioModule, 'execPioCommand').mockResolvedValue({
      stdout: JSON.stringify({
        page: 1,
        perpage: 10,
        total: 2,
        items: [
          {
            id: 64,
            name: 'ArduinoJson',
            description: 'JSON for embedded systems',
            versionname: '7.4.3',
            authornames: ['Benoit Blanchon'],
            keywords: ['json'],
            frameworks: [{ name: 'arduino', title: 'Arduino' }],
            platforms: [{ name: 'atmelavr', title: 'Atmel AVR' }],
          },
        ],
      }),
      stderr: '',
      exitCode: 0,
    });

    const libraries = await searchLibraries('ArduinoJson', 10);

    expect(libraries).toEqual([
      expect.objectContaining({
        id: 64,
        name: 'ArduinoJson',
        version: '7.4.3',
        authors: [expect.objectContaining({ name: 'Benoit Blanchon' })],
        frameworks: ['arduino'],
        platforms: ['atmelavr'],
      }),
    ]);
  });

  it('accepts installed library entries without an id field', async () => {
    vi.spyOn(platformioExecutor, 'execute').mockResolvedValue({
      stdout: JSON.stringify([
        {
          name: 'ArduinoJson',
          description: 'JSON for embedded systems',
          version: '7.4.3',
          keywords: ['json'],
          authors: [{ name: 'Benoit Blanchon' }],
          frameworks: ['*'],
          platforms: ['*'],
          repository: {
            type: 'git',
            url: 'https://github.com/bblanchon/ArduinoJson.git',
          },
          homepage: 'https://arduinojson.org',
        },
      ]),
      stderr: '',
      exitCode: 0,
    });

    const libraries = await listInstalledLibraries('E:/firmware');

    expect(libraries).toEqual([
      expect.objectContaining({
        id: undefined,
        name: 'ArduinoJson',
        version: '7.4.3',
      }),
    ]);
  });

  it('reports the resolved default environment name when build_project omits an explicit environment', async () => {
    const projectDir = await createProjectFixture(`
[platformio]
default_envs = uno

[env:uno]
platform = atmelavr
board = uno
framework = arduino
`);
    vi.spyOn(platformioExecutor, 'execute').mockResolvedValue({
      stdout: 'build ok',
      stderr: '',
      exitCode: 0,
    });

    try {
      const result = await buildProject(projectDir);
      expect(result.environment).toBe('uno');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('uses the configured PlatformIO executable path in instruction-mode monitor commands', async () => {
    const originalBinary = process.env.PLATFORMIO_CLI_PATH;
    process.env.PLATFORMIO_CLI_PATH =
      'C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe';

    try {
      const result = await startMonitor({
        port: 'COM3',
        baud: 9600,
        projectDir: 'E:/firmware',
      });

      expect(result.command).toContain(
        '"C:/Users/Arrebol/.platformio/penv/Scripts/pio.exe" device monitor --port COM3 --baud 9600'
      );
    } finally {
      if (originalBinary === undefined) {
        delete process.env.PLATFORMIO_CLI_PATH;
      } else {
        process.env.PLATFORMIO_CLI_PATH = originalBinary;
      }
    }
  });
});
