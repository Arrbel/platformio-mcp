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
      { expectedPatterns: ['BOOT_OK'] }
    );

    expect(verification.verificationStatus).toBe('healthy');
    expect(verification.matchedPatterns).toEqual(['BOOT_OK']);
    expect(verification.healthSignals).toContain('expected_patterns_matched');
  });

  it('treats monitor port-open errors as transport failures instead of missed output', () => {
    const verification = evaluateMonitorVerification(
      [
        "UserSideException: could not open port 'COM9': PermissionError(13, '拒绝访问。', None, 5)",
      ],
      { expectedPatterns: ['BOOT_OK'] }
    );

    expect(verification.verificationStatus).toBe('indeterminate');
    expect(verification.failureCategory).toBe('port_unavailable');
    expect(verification.retryHint).toBe('close_serial_consumers_and_retry');
    expect(verification.failureSignals).toContain('serial_port_busy');
  });

  it('evaluates JSON-based health and degraded signals from a generic profile', () => {
    const verification = evaluateMonitorVerification(
      [
        '━━━━━━ JSON 输出 ━━━━━━',
        '{"device_id":1001,"timestamp":100,"air_temp":16.1,"air_humidity":53.4,"soil_moisture":0,"light":null,"co2":null,"tvoc":null}',
        '{"device_id":1001,"timestamp":105,"air_temp":16.1,"air_humidity":53.4,"soil_moisture":0,"light":null,"co2":null,"tvoc":null}',
      ],
      {
        expectedPatterns: ['JSON 输出'],
        expectedJsonFields: [
          'device_id',
          'timestamp',
          'air_temp',
          'air_humidity',
          'soil_moisture',
        ],
        expectedJsonNonNull: ['air_temp', 'air_humidity', 'soil_moisture'],
        expectedJsonValues: { device_id: 1001 },
        allowedNullFields: ['light', 'co2', 'tvoc'],
        expectedCycleSeconds: 5,
        expectedCycleToleranceSeconds: 1,
        minJsonMessages: 2,
      }
    );

    expect(verification.verificationStatus).toBe('degraded');
    expect(verification.healthSignals).toEqual(
      expect.arrayContaining([
        'node_online_basic',
        'node_loop_healthy',
        'sensor_core_present',
        'device_identity_match',
        'json_fields_present',
        'json_non_null_fields_present',
        'json_values_match',
        'json_message_count_sufficient',
      ])
    );
    expect(verification.degradedSignals).toEqual(
      expect.arrayContaining([
        'allowed_null_field:light',
        'allowed_null_field:co2',
        'allowed_null_field:tvoc',
      ])
    );
    expect(verification.parsedJsonMessages).toHaveLength(2);
  });

  it('returns healthy when all expected runtime sensor fields are present and non-null', () => {
    const verification = evaluateMonitorVerification(
      [
        '━━━━━━ JSON 输出 ━━━━━━',
        '{"device_id":1001,"timestamp":341,"air_temp":23.3,"air_humidity":43.7,"soil_moisture":28,"light":38,"co2":417}',
        '{"device_id":1001,"timestamp":347,"air_temp":23.3,"air_humidity":43.9,"soil_moisture":28,"light":38,"co2":442}',
        '{"device_id":1001,"timestamp":352,"air_temp":23.3,"air_humidity":44.1,"soil_moisture":28,"light":38,"co2":400}',
      ],
      {
        expectedPatterns: ['JSON 输出'],
        expectedJsonFields: [
          'device_id',
          'timestamp',
          'air_temp',
          'air_humidity',
          'soil_moisture',
          'light',
          'co2',
        ],
        expectedJsonNonNull: [
          'device_id',
          'timestamp',
          'air_temp',
          'air_humidity',
          'soil_moisture',
          'light',
          'co2',
        ],
        expectedJsonValues: { device_id: 1001 },
        expectedCycleSeconds: 5,
        expectedCycleToleranceSeconds: 2,
        minJsonMessages: 2,
      }
    );

    expect(verification.verificationStatus).toBe('healthy');
    expect(verification.healthSignals).toEqual(
      expect.arrayContaining([
        'expected_patterns_matched',
        'json_fields_present',
        'json_non_null_fields_present',
        'json_values_match',
        'json_message_count_sufficient',
        'node_loop_healthy',
        'node_online_basic',
        'sensor_core_present',
        'device_identity_match',
      ])
    );
    expect(verification.degradedSignals).toEqual([]);
    expect(verification.failureSignals).toEqual([]);
    expect(verification.parsedJsonMessages).toHaveLength(3);
  });

  it('reports stalled output as a failure when JSON timestamps stop increasing', () => {
    const verification = evaluateMonitorVerification(
      [
        '{"device_id":1001,"timestamp":100,"air_temp":16.1,"air_humidity":53.4,"soil_moisture":0,"light":null,"co2":null,"tvoc":null}',
        '{"device_id":1001,"timestamp":100,"air_temp":16.1,"air_humidity":53.4,"soil_moisture":0,"light":null,"co2":null,"tvoc":null}',
      ],
      {
        expectedJsonFields: ['device_id', 'timestamp'],
        minJsonMessages: 2,
        expectedCycleSeconds: 5,
        expectedCycleToleranceSeconds: 1,
      }
    );

    expect(verification.verificationStatus).toBe('failed');
    expect(verification.failureCategory).toBe('node_output_stalled');
    expect(verification.failureSignals).toContain('node_output_stalled');
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
