import { z } from 'zod';

export interface SerialDevice {
  port: string;
  description: string;
  hwid: string;
  deviceType?:
    | 'likely_board'
    | 'usb_serial_adapter'
    | 'bluetooth_serial'
    | 'unknown_serial';
  uploadCapability?: 'likely' | 'unlikely' | 'unknown';
  detectionEvidence?: string[];
}

export const SerialDeviceSchema = z.object({
  port: z.string(),
  description: z.string(),
  hwid: z.string(),
  deviceType: z
    .enum([
      'likely_board',
      'usb_serial_adapter',
      'bluetooth_serial',
      'unknown_serial',
    ])
    .optional(),
  uploadCapability: z.enum(['likely', 'unlikely', 'unknown']).optional(),
  detectionEvidence: z.array(z.string()).optional(),
});

export const DevicesArraySchema = z.array(SerialDeviceSchema);
