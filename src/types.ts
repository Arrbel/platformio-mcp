/**
 * Type definitions and Zod schemas for PlatformIO MCP Server
 */

import { z } from 'zod';

// ============================================================================
// Command Result Types
// ============================================================================

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ============================================================================
// Board Types
// ============================================================================

export interface BoardInfo {
  id: string;
  name: string;
  platform: string;
  mcu: string;
  frequency: string;
  flash: number;
  ram: number;
  frameworks?: string[];
  vendor?: string;
  url?: string;
  raw?: Record<string, unknown>;
}

export const BoardInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.string(),
  mcu: z.string(),
  frequency: z.string(),
  flash: z.number(),
  ram: z.number(),
  frameworks: z.array(z.string()).optional(),
  vendor: z.string().optional(),
  url: z.string().optional(),
  raw: z.record(z.unknown()).optional(),
});

export const BoardsArraySchema = z.array(BoardInfoSchema);

export const PlatformIOBoardRawSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    platform: z.string(),
    mcu: z.string(),
    frameworks: z.array(z.string()).optional(),
    vendor: z.string().optional(),
    url: z.string().optional(),
    fcpu: z.number().optional(),
    rom: z.number().optional(),
    ram: z.number().optional(),
    frequency: z.union([z.string(), z.number()]).optional(),
    flash: z.number().optional(),
  })
  .passthrough();

export type PlatformIOBoardRaw = z.infer<typeof PlatformIOBoardRawSchema>;
export const PlatformIOBoardsRawArraySchema = z.array(PlatformIOBoardRawSchema);

// ============================================================================
// Device Types
// ============================================================================

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

// ============================================================================
// Project Types
// ============================================================================

export interface ProjectConfig {
  board: string;
  framework?: string;
  projectDir?: string;
  platformOptions?: Record<string, string>;
}

export const ProjectConfigSchema = z.object({
  board: z.string().min(1, 'Board ID is required'),
  framework: z.string().optional(),
  projectDir: z.string().optional(),
  platformOptions: z.record(z.string()).optional(),
});

export interface ProjectInitResult {
  success: boolean;
  path: string;
  message: string;
}

export interface ProjectEnvironmentSummary {
  name: string;
  platform?: string;
  board?: string;
  framework?: string;
  monitorPort?: string;
  monitorSpeed?: number;
  uploadPort?: string;
  isDefault: boolean;
  options: Record<string, string>;
}

export const ProjectEnvironmentSummarySchema = z.object({
  name: z.string(),
  platform: z.string().optional(),
  board: z.string().optional(),
  framework: z.string().optional(),
  monitorPort: z.string().optional(),
  monitorSpeed: z.number().optional(),
  uploadPort: z.string().optional(),
  isDefault: z.boolean(),
  options: z.record(z.string()),
});

export interface ProjectInspection {
  projectDir: string;
  platformioIniPath: string;
  isPlatformIOProject: boolean;
  defaultEnvironments: string[];
  environments: ProjectEnvironmentSummary[];
}

export const ProjectInspectionSchema = z.object({
  projectDir: z.string(),
  platformioIniPath: z.string(),
  isPlatformIOProject: z.boolean(),
  defaultEnvironments: z.array(z.string()),
  environments: z.array(ProjectEnvironmentSummarySchema),
});

// ============================================================================
// Build Types
// ============================================================================

export interface BuildResult {
  success: boolean;
  environment: string;
  resolvedEnvironment?: string;
  resolutionSource?: string;
  output: string;
  errors?: string[];
}

export interface CleanResult {
  success: boolean;
  message: string;
}

// ============================================================================
// Upload Types
// ============================================================================

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

// ============================================================================
// Monitor Types
// ============================================================================

export interface MonitorConfig {
  port?: string;
  baud?: number;
  projectDir?: string;
}

export const MonitorConfigSchema = z.object({
  port: z.string().optional(),
  baud: z.number().positive().optional(),
  projectDir: z.string().optional(),
});

export interface MonitorResult {
  success: boolean;
  message: string;
  command?: string;
  mode?: 'instructions' | 'capture';
  resolvedPort?: string;
  resolvedBaud?: number;
  resolvedEnvironment?: string;
  resolutionSource?: string;
  monitorStatus?:
    | 'instructions_only'
    | 'captured_output'
    | 'no_output'
    | 'timeout'
    | 'port_open_failed';
  verificationStatus?:
    | 'healthy'
    | 'degraded'
    | 'failed'
    | 'not_requested'
    | 'indeterminate';
  matchedPatterns?: string[];
  healthSignals?: string[];
  degradedSignals?: string[];
  failureSignals?: string[];
  parsedJsonMessages?: Record<string, unknown>[];
  rawOutputExcerpt?: string;
  failureCategory?: string;
  retryHint?: string;
  output?: string[];
  timedOut?: boolean;
}

export interface MonitorVerificationProfile {
  expectedPatterns?: string[];
  expectedJsonFields?: string[];
  expectedJsonNonNull?: string[];
  expectedJsonValues?: Record<string, string | number | boolean | null>;
  allowedNullFields?: string[];
  expectedCycleSeconds?: number;
  expectedCycleToleranceSeconds?: number;
  minJsonMessages?: number;
}

// ============================================================================
// Library Types
// ============================================================================

export interface LibraryAuthor {
  name: string;
  email?: string;
  maintainer?: boolean;
}

export interface LibraryRepository {
  type: string;
  url: string;
}

export interface LibraryInfo {
  id?: number;
  name: string;
  description?: string;
  keywords?: string[];
  authors?: LibraryAuthor[];
  repository?: LibraryRepository;
  version?: string;
  frameworks?: string[];
  platforms?: string[];
  homepage?: string;
}

export const LibraryInfoSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  authors: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().optional(),
        maintainer: z.boolean().optional(),
      })
    )
    .optional(),
  repository: z
    .object({
      type: z.string(),
      url: z.string(),
    })
    .optional(),
  version: z.string().optional(),
  frameworks: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  homepage: z.string().optional(),
});

export const LibrariesArraySchema = z.array(LibraryInfoSchema);
export const PlatformIOLibrarySearchResponseSchema = z.object({
  page: z.number().optional(),
  perpage: z.number().optional(),
  total: z.number().optional(),
  items: z.array(z.record(z.unknown())),
});

export interface LibrarySearchConfig {
  query: string;
  limit?: number;
}

export const LibrarySearchConfigSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().positive().optional(),
});

export interface LibraryInstallConfig {
  library: string;
  projectDir?: string;
  version?: string;
}

export const LibraryInstallConfigSchema = z.object({
  library: z.string().min(1, 'Library name is required'),
  projectDir: z.string().optional(),
  version: z.string().optional(),
});

export interface LibraryInstallResult {
  success: boolean;
  library: string;
  message: string;
}

// ============================================================================
// Platform Types
// ============================================================================

export interface PlatformInfo {
  name: string;
  title: string;
  version?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  frameworks?: string[];
  packages?: string[];
}

export interface ToolNextAction {
  tool: string;
  reason: string;
  arguments?: Record<string, unknown>;
}

export interface ToolResponse<TData = unknown> {
  status: 'ok' | 'warning' | 'error';
  summary: string;
  data: TData;
  warnings: string[];
  nextActions: ToolNextAction[];
}

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

// ============================================================================
// MCP Tool Parameter Schemas
// ============================================================================

// List boards parameters
export const ListBoardsParamsSchema = z.object({
  filter: z
    .string()
    .optional()
    .describe('Optional filter by platform, framework, or MCU'),
});

// Get board info parameters
export const GetBoardInfoParamsSchema = z.object({
  boardId: z.string().min(1).describe('Board ID to retrieve information for'),
});

// Init project parameters
export const InitProjectParamsSchema = z.object({
  board: z.string().min(1).describe('Board ID for the project'),
  framework: z
    .string()
    .optional()
    .describe('Framework to use (e.g., arduino, espidf)'),
  projectDir: z
    .string()
    .describe('Directory path where the project should be created'),
  platformOptions: z
    .record(z.string())
    .optional()
    .describe('Additional platform-specific options'),
});

export const InspectProjectParamsSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .describe('Path to the PlatformIO project directory'),
});

export const ListEnvironmentsParamsSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .describe('Path to the PlatformIO project directory'),
});

// Build project parameters
export const BuildProjectParamsSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .describe('Path to the PlatformIO project directory'),
  environment: z
    .string()
    .optional()
    .describe('Specific environment to build (from platformio.ini)'),
});

// Clean project parameters
export const CleanProjectParamsSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .describe('Path to the PlatformIO project directory'),
});

// Upload firmware parameters
export const UploadFirmwareParamsSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .describe('Path to the PlatformIO project directory'),
  port: z
    .string()
    .optional()
    .describe('Upload port (auto-detected if not specified)'),
  environment: z
    .string()
    .optional()
    .describe('Specific environment to upload (from platformio.ini)'),
});

// Start monitor parameters
export const StartMonitorParamsSchema = z.object({
  port: z
    .string()
    .optional()
    .describe('Serial port to monitor (auto-detected if not specified)'),
  baud: z.number().optional().describe('Baud rate for serial communication'),
  projectDir: z
    .string()
    .optional()
    .describe('Project directory (for environment-specific settings)'),
  captureDurationMs: z
    .number()
    .positive()
    .optional()
    .describe('Optional duration to capture monitor output before stopping'),
  maxLines: z
    .number()
    .positive()
    .optional()
    .describe('Optional maximum number of output lines to capture'),
  echo: z
    .boolean()
    .optional()
    .describe('Whether monitor input echo should be enabled'),
  filters: z
    .array(z.string())
    .optional()
    .describe('Optional PlatformIO monitor filters'),
  raw: z
    .boolean()
    .optional()
    .describe('Whether raw monitor mode should be used while capturing output'),
  eol: z
    .enum(['CR', 'LF', 'CRLF'])
    .optional()
    .describe('Optional line ending mode for the serial monitor'),
  expectedPatterns: z
    .array(z.string())
    .optional()
    .describe(
      'Optional output snippets that confirm the firmware is running as expected'
    ),
  expectedJsonFields: z
    .array(z.string())
    .optional()
    .describe(
      'Optional JSON fields that must exist in captured runtime output'
    ),
  expectedJsonNonNull: z
    .array(z.string())
    .optional()
    .describe('Optional JSON fields that must be present and non-null'),
  expectedJsonValues: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .describe(
      'Optional JSON field/value pairs that must match captured runtime output'
    ),
  allowedNullFields: z
    .array(z.string())
    .optional()
    .describe(
      'Optional JSON fields that may be null without failing verification'
    ),
  expectedCycleSeconds: z
    .number()
    .positive()
    .optional()
    .describe('Optional expected interval between captured runtime messages'),
  expectedCycleToleranceSeconds: z
    .number()
    .nonnegative()
    .optional()
    .describe('Allowed drift around expectedCycleSeconds'),
  minJsonMessages: z
    .number()
    .positive()
    .optional()
    .describe(
      'Minimum number of captured JSON messages required for verification'
    ),
});

// Search libraries parameters
export const SearchLibrariesParamsSchema = z.object({
  query: z.string().min(1).describe('Search query for libraries'),
  limit: z
    .number()
    .optional()
    .default(20)
    .describe('Maximum number of results to return'),
});

// Install library parameters
export const InstallLibraryParamsSchema = z.object({
  library: z.string().min(1).describe('Library name or ID to install'),
  projectDir: z
    .string()
    .optional()
    .describe('Project directory (installs globally if not specified)'),
  version: z.string().optional().describe('Specific version to install'),
});

// List installed libraries parameters
export const ListInstalledLibrariesParamsSchema = z.object({
  projectDir: z
    .string()
    .optional()
    .describe('Project directory (lists global libraries if not specified)'),
});

export const DoctorParamsSchema = z.object({
  projectDir: z
    .string()
    .optional()
    .describe('Optional PlatformIO project directory to inspect'),
});
