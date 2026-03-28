import { describe, expect, it } from 'vitest';

import { classifyUploadResult } from '../src/tools/upload.js';

describe('upload semantics', () => {
  it('extracts the auto-detected upload port from uploader output', () => {
    const result = classifyUploadResult(
      'Configuring upload protocol...\nAuto-detected: COM9\nUploading...',
      ''
    );

    expect(result.resolvedPort).toBe('COM9');
  });

  it('classifies port unavailable failures', () => {
    const result = classifyUploadResult(
      'Auto-detected: COM9',
      "Error: could not open port 'COM9': Permission denied"
    );

    expect(result.resolvedPort).toBe('COM9');
    expect(result.uploadStatus).toBe('port_unavailable');
    expect(result.failureCategory).toBe('port_unavailable');
    expect(result.retryHint).toBe('close_serial_consumers_and_retry');
  });

  it('classifies missing-device failures', () => {
    const result = classifyUploadResult(
      '',
      'Error: No device found on COM9'
    );

    expect(result.uploadStatus).toBe('device_not_found');
    expect(result.failureCategory).toBe('device_not_found');
    expect(result.retryHint).toBe('check_usb_connection_and_retry');
  });

  it('classifies manual boot requirements', () => {
    const result = classifyUploadResult(
      '',
      'A fatal error occurred: Timed out waiting for packet header'
    );

    expect(result.uploadStatus).toBe('manual_boot_required');
    expect(result.failureCategory).toBe('manual_boot_required');
    expect(result.retryHint).toBe('enter_boot_mode_and_retry');
  });

  it('falls back to uploader_failed for other uploader errors', () => {
    const result = classifyUploadResult(
      '',
      'esptool.py failed with exit code 2'
    );

    expect(result.uploadStatus).toBe('uploader_failed');
    expect(result.failureCategory).toBe('uploader_failed');
    expect(result.retryHint).toBe('inspect_uploader_output');
  });
});
