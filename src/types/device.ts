import { z } from 'zod';

export interface SerialDevice {
  port: string;
  description: string;
  hwid: string;
  transportType?: 'serial' | 'socket' | 'rfc2217' | 'network';
  detectionSource?: 'serial' | 'logical' | 'mdns';
  deviceType?:
    | 'likely_board'
    | 'usb_serial_adapter'
    | 'bluetooth_serial'
    | 'network_endpoint'
    | 'unknown_serial';
  uploadCapability?: 'likely' | 'unlikely' | 'unknown';
  uploadCandidate?: boolean;
  monitorCandidate?: boolean;
  detectionEvidence?: string[];
}

export const SerialDeviceSchema = z.object({
  port: z.string(),
  description: z.string(),
  hwid: z.string(),
  transportType: z
    .enum(['serial', 'socket', 'rfc2217', 'network'])
    .optional(),
  detectionSource: z.enum(['serial', 'logical', 'mdns']).optional(),
  deviceType: z
    .enum([
      'likely_board',
      'usb_serial_adapter',
      'bluetooth_serial',
      'network_endpoint',
      'unknown_serial',
    ])
    .optional(),
  uploadCapability: z.enum(['likely', 'unlikely', 'unknown']).optional(),
  uploadCandidate: z.boolean().optional(),
  monitorCandidate: z.boolean().optional(),
  detectionEvidence: z.array(z.string()).optional(),
});

export const DevicesArraySchema = z.array(SerialDeviceSchema);
