import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as platformioModule from '../src/platformio.js';
import {
  closeMonitorSession,
  openMonitorSession,
  readMonitorSession,
  writeMonitorSession,
} from '../src/tools/monitor.js';

function createFakeMonitorChild() {
  const child = new EventEmitter() as ChildProcessWithoutNullStreams & {
    killed: boolean;
  };
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();

  child.stdout = stdout;
  child.stderr = stderr;
  child.stdin = stdin;
  child.killed = false;
  child.pid = 1234;
  child.kill = vi.fn(() => {
    child.killed = true;
    child.emit('close', 0);
    return true;
  });

  return { child, stdout, stderr, stdin };
}

describe('monitor sessions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens a session and reads captured output with parsed verification data', async () => {
    const { child, stdout, stdin } = createFakeMonitorChild();
    const writeSpy = vi.spyOn(stdin, 'write');
    vi.spyOn(platformioModule, 'spawnMonitorProcess').mockResolvedValue({
      command: 'pio device monitor --port COM9 --baud 115200',
      child,
    });

    const opened = await openMonitorSession({
      port: 'COM9',
      baud: 115200,
      projectDir: 'E:/firmware',
    });

    expect(opened.monitorStatus).toBe('session_opened');
    expect(opened.sessionId).toBeTruthy();

    stdout.write('JSON 输出\n');
    stdout.write('{"device_id":1001,"timestamp":10,"light":12,"co2":400}\n');
    stdout.write('{"device_id":1001,"timestamp":15,"light":13,"co2":405}\n');

    const read = await readMonitorSession({
      sessionId: opened.sessionId!,
      durationMs: 50,
      maxLines: 20,
      expectedPatterns: ['JSON 输出'],
      expectedJsonFields: ['device_id', 'timestamp', 'light', 'co2'],
      expectedJsonNonNull: ['device_id', 'timestamp', 'light', 'co2'],
      expectedJsonValues: { device_id: 1001 },
      expectedCycleSeconds: 5,
      expectedCycleToleranceSeconds: 1,
      minJsonMessages: 2,
    });

    expect(read.monitorStatus).toBe('captured_output');
    expect(read.verificationStatus).toBe('healthy');
    expect(read.parsedJsonMessages).toHaveLength(2);

    stdout.write('{"device_id":1001,"timestamp":20,"light":14,"co2":410}\n');

    const secondRead = await readMonitorSession({
      sessionId: opened.sessionId!,
      durationMs: 50,
      maxLines: 20,
      minJsonMessages: 1,
    });

    expect(secondRead.monitorStatus).toBe('captured_output');
    expect(secondRead.output).toEqual([
      '{"device_id":1001,"timestamp":20,"light":14,"co2":410}',
    ]);

    const writeResult = await writeMonitorSession({
      sessionId: opened.sessionId!,
      data: 'ping\n',
    });

    expect(writeResult.monitorStatus).toBe('session_opened');
    expect(writeSpy).toHaveBeenCalledWith('ping\n');
  });

  it('returns a read timeout when no output is captured in the requested window', async () => {
    const { child } = createFakeMonitorChild();
    vi.spyOn(platformioModule, 'spawnMonitorProcess').mockResolvedValue({
      command: 'pio device monitor --port COM9 --baud 115200',
      child,
    });

    const opened = await openMonitorSession({
      port: 'COM9',
      baud: 115200,
    });

    const read = await readMonitorSession({
      sessionId: opened.sessionId!,
      durationMs: 1000,
      maxLines: 10,
    });

    expect(read.monitorStatus).toBe('session_read_timeout');
    expect(read.verificationStatus).toBe('not_requested');
  });

  it('surfaces transport failures captured by the session process', async () => {
    const { child, stderr } = createFakeMonitorChild();
    vi.spyOn(platformioModule, 'spawnMonitorProcess').mockResolvedValue({
      command: 'pio device monitor --port COM9 --baud 115200',
      child,
    });

    const opened = await openMonitorSession({
      port: 'COM9',
      baud: 115200,
    });

    stderr.write("UserSideException: could not open port 'COM9': Permission denied\n");

    const read = await readMonitorSession({
      sessionId: opened.sessionId!,
      durationMs: 50,
      expectedPatterns: ['BOOT_OK'],
    });

    expect(read.resolvedPort).toBe('COM9');
    expect(read.monitorStatus).toBe('port_open_failed');
    expect(read.verificationStatus).toBe('indeterminate');
    expect(read.failureCategory).toBe('port_unavailable');
    expect(read.retryHint).toBe('close_serial_consumers_and_retry');
  });

  it('rejects reads for unknown session ids', async () => {
    await expect(
      readMonitorSession({ sessionId: 'missing-session', durationMs: 1000 })
    ).rejects.toThrow(/missing-session/i);
  });

  it('rejects writes for unknown session ids', async () => {
    await expect(
      writeMonitorSession({ sessionId: 'missing-session', data: 'ping' })
    ).rejects.toThrow(/missing-session/i);
  });

  it('rejects reads after a session is closed', async () => {
    const { child } = createFakeMonitorChild();
    vi.spyOn(platformioModule, 'spawnMonitorProcess').mockResolvedValue({
      command: 'pio device monitor --port COM9 --baud 115200',
      child,
    });

    const opened = await openMonitorSession({
      port: 'COM9',
      baud: 115200,
    });

    const closed = await closeMonitorSession({ sessionId: opened.sessionId! });
    expect(closed.monitorStatus).toBe('session_closed');
    expect(child.kill).toHaveBeenCalled();

    await expect(
      readMonitorSession({ sessionId: opened.sessionId!, durationMs: 1000 })
    ).rejects.toThrow(/closed/i);
  });
});
