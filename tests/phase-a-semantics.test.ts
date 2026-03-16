import { describe, expect, it } from 'vitest';

import {
  classifySerialDevice,
  deriveDoctorReadiness,
} from '../src/tools/devices.js';
import { classifyUploadResult } from '../src/tools/upload.js';
import { evaluateMonitorVerification } from '../src/tools/monitor.js';

describe('phase A semantics', () => {
  it('classifies bluetooth serial ports as non-uploadable devices', () => {
    const device = classifySerialDevice({
      port: 'COM3',
      description: 'Bluetooth serial (COM3)',
      hwid: 'BTHENUM\\{00001101-0000-1000-8000-00805F9B34FB}_LOCALMFG',
    });

    expect(device.deviceType).toBe('bluetooth_serial');
    expect(device.uploadCapability).toBe('unlikely');
  });

  it('classifies CH340-style adapters as likely uploadable devices', () => {
    const device = classifySerialDevice({
      port: 'COM9',
      description: 'USB-SERIAL CH340 (COM9)',
      hwid: 'USB VID:PID=1A86:7523 LOCATION=1-1',
    });

    expect(device.deviceType).toBe('usb_serial_adapter');
    expect(device.uploadCapability).toBe('likely');
  });

  it('classifies CH343 adapters as likely uploadable devices', () => {
    const device = classifySerialDevice({
      port: 'COM9',
      description: 'USB-Enhanced-SERIAL CH343 (COM9)',
      hwid: 'USB VID:PID=1A86:55D3 LOCATION=1-1',
    });

    expect(device.deviceType).toBe('usb_serial_adapter');
    expect(device.uploadCapability).toBe('likely');
  });

  it('extracts a minimal upload failure category and retry hint', () => {
    const result = classifyUploadResult(
      'Auto-detected: COM7',
      "Error: could not open port 'COM7': Permission denied"
    );

    expect(result.uploadStatus).toBe('port_unavailable');
    expect(result.failureCategory).toBe('port_unavailable');
    expect(result.retryHint).toBe('close_serial_consumers_and_retry');
  });

  it('marks monitor verification as matched when expected output is captured', () => {
    const verification = evaluateMonitorVerification(
      ['BOOT_OK', 'HEARTBEAT 1'],
      ['BOOT_OK']
    );

    expect(verification.verificationStatus).toBe('matched');
    expect(verification.matchedPatterns).toEqual(['BOOT_OK']);
  });

  it('treats monitor port-open errors as transport failures instead of missed output', () => {
    const verification = evaluateMonitorVerification(
      [
        "UserSideException: could not open port 'COM9': PermissionError(13, '拒绝访问。', None, 5)",
      ],
      ['BOOT_OK']
    );

    expect(verification.verificationStatus).toBe('indeterminate');
    expect(verification.failureCategory).toBe('port_unavailable');
    expect(verification.retryHint).toBe('close_serial_consumers_and_retry');
  });

  it('derives doctor readiness from project and device evidence', () => {
    const readiness = deriveDoctorReadiness({
      platformioInstalled: true,
      hasProject: true,
      hasEnvironment: true,
      devices: [
        {
          port: 'COM9',
          description: 'USB-SERIAL CH340 (COM9)',
          hwid: 'USB VID:PID=1A86:7523',
          deviceType: 'usb_serial_adapter',
          uploadCapability: 'likely',
          detectionEvidence: ['vidpid:1a86:7523'],
        },
      ],
      hasMonitorConfiguration: true,
    });

    expect(readiness.readyForBuild).toBe(true);
    expect(readiness.readyForUpload).toBe(true);
    expect(readiness.readyForMonitor).toBe(true);
  });
});
