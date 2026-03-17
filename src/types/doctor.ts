import type { SerialDevice } from './device.js';
import type { ProjectInspection } from './project.js';

export interface DoctorReport {
  nodeVersion: string;
  platformio: {
    installed: boolean;
    version?: string;
  };
  project?: ProjectInspection;
  devices: {
    count: number;
    items: SerialDevice[];
  };
  readyForBuild: boolean;
  readyForUpload: boolean;
  readyForMonitor: boolean;
  blockingIssues: string[];
  warnings: string[];
}
