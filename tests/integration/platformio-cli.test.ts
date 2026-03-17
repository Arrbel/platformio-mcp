import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const pioCommand = process.env.PLATFORMIO_CLI_PATH?.trim() || 'pio';
const hasPlatformIO = (() => {
  try {
    execSync(`${pioCommand} --version`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
})();

const platformioCli = hasPlatformIO ? describe : describe.skip;
const PIO_TIMEOUT = 120_000;

function runPio(command: string, options?: { cwd?: string; timeout?: number }) {
  return execSync(`${pioCommand} ${command}`, {
    cwd: options?.cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: options?.timeout ?? PIO_TIMEOUT,
  });
}

platformioCli('PlatformIO CLI integration', () => {
  it('pio --version returns a version string', () => {
    const output = runPio('--version', { timeout: 10_000 });
    expect(output).toMatch(/PlatformIO Core/i);
  });

  it('pio boards returns at least one board entry', () => {
    const output = runPio('boards --json-output');
    const boards = JSON.parse(output);

    expect(Array.isArray(boards)).toBe(true);
    expect(boards.length).toBeGreaterThan(0);
  });

  describe('temp project init + build', () => {
    let projectDir = '';

    beforeAll(() => {
      projectDir = mkdtempSync(path.join(tmpdir(), 'pio-mcp-test-'));
    });

    afterAll(() => {
      if (projectDir) {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });

    it('pio init and pio run succeed on a minimal native project', () => {
      runPio('project init --board native', { cwd: projectDir });

      const srcDir = path.join(projectDir, 'src');
      if (!existsSync(srcDir)) {
        mkdirSync(srcDir, { recursive: true });
      }

      writeFileSync(
        path.join(srcDir, 'main.cpp'),
        '#include <stdio.h>\n\nint main() {\n  puts("BOOT_OK");\n  return 0;\n}\n',
        'utf8'
      );

      const output = runPio('run', { cwd: projectDir });
      expect(output).toMatch(/SUCCESS/i);
    });
  });
});
