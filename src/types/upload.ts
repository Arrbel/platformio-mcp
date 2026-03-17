import { z } from 'zod';

export interface UploadConfig {
  projectDir: string;
  port?: string;
  environment?: string;
}

export const UploadConfigSchema = z.object({
  projectDir: z.string().min(1, 'Project directory is required'),
  port: z.string().optional(),
  environment: z.string().optional(),
});

export interface UploadResult {
  success: boolean;
  port?: string;
  resolvedPort?: string;
  resolvedEnvironment?: string;
  resolutionSource?: string;
  uploadStatus?:
    | 'uploaded'
    | 'device_not_found'
    | 'port_unavailable'
    | 'uploader_failed'
    | 'manual_boot_required'
    | 'unknown_failure';
  failureCategory?: string;
  retryHint?: string;
  rawOutput?: string;
  output: string;
  errors?: string[];
}
