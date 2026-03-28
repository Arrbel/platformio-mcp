import { z } from 'zod';

export const ListBoardsParamsSchema = z.object({
  filter: z
    .string()
    .optional()
    .describe('Optional filter by platform, framework, or MCU'),
});

export const GetBoardInfoParamsSchema = z.object({
  boardId: z.string().min(1).describe('Board ID to retrieve information for'),
});

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

export const ListProjectTargetsParamsSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .describe('Path to the PlatformIO project directory'),
  environment: z
    .string()
    .optional()
    .describe('Optional environment name to scope available targets'),
});

export const GenerateCompileCommandsParamsSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .describe('Path to the PlatformIO project directory'),
});

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

export const CleanProjectParamsSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .describe('Path to the PlatformIO project directory'),
});

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

export const OpenMonitorSessionParamsSchema = z.object({
  port: z
    .string()
    .optional()
    .describe('Serial/socket endpoint to monitor'),
  baud: z.number().optional().describe('Baud rate for serial communication'),
  projectDir: z
    .string()
    .optional()
    .describe('Project directory (for environment-specific settings)'),
  echo: z.boolean().optional(),
  filters: z.array(z.string()).optional(),
  raw: z.boolean().optional(),
  eol: z.enum(['CR', 'LF', 'CRLF']).optional(),
});

export const ReadMonitorSessionParamsSchema = z.object({
  sessionId: z.string().min(1).describe('Existing monitor session ID'),
  durationMs: z
    .number()
    .positive()
    .optional()
    .describe('Optional duration to read from the session'),
  maxLines: z
    .number()
    .positive()
    .optional()
    .describe('Optional maximum number of lines to read'),
  expectedPatterns: z.array(z.string()).optional(),
  expectedJsonFields: z.array(z.string()).optional(),
  expectedJsonNonNull: z.array(z.string()).optional(),
  expectedJsonValues: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  allowedNullFields: z.array(z.string()).optional(),
  expectedCycleSeconds: z.number().positive().optional(),
  expectedCycleToleranceSeconds: z.number().nonnegative().optional(),
  minJsonMessages: z.number().positive().optional(),
});

export const WriteMonitorSessionParamsSchema = z.object({
  sessionId: z.string().min(1).describe('Existing monitor session ID'),
  data: z.string().min(1).describe('Text payload to write to the session'),
});

export const CloseMonitorSessionParamsSchema = z.object({
  sessionId: z.string().min(1).describe('Existing monitor session ID'),
});

export const SearchLibrariesParamsSchema = z.object({
  query: z.string().min(1).describe('Search query for libraries'),
  limit: z
    .number()
    .optional()
    .default(20)
    .describe('Maximum number of results to return'),
});

export const InstallLibraryParamsSchema = z.object({
  library: z.string().min(1).describe('Library name or ID to install'),
  projectDir: z
    .string()
    .optional()
    .describe('Project directory (installs globally if not specified)'),
  version: z.string().optional().describe('Specific version to install'),
});

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

export const RepairEnvironmentParamsSchema = z.object({
  problemCodes: z
    .array(z.string())
    .optional()
    .describe('Optional problem codes from doctor output to target'),
  fixIds: z
    .array(z.string())
    .optional()
    .describe('Optional repair fix IDs to target explicitly'),
  projectDir: z
    .string()
    .optional()
    .describe('Optional PlatformIO project directory to recheck after repair'),
  allowInstall: z
    .boolean()
    .optional()
    .describe('Allow installation-type repairs to execute'),
  allowShellProfileHints: z
    .boolean()
    .optional()
    .describe('Allow shell environment hint fixes to be applied in-process'),
  dryRun: z
    .boolean()
    .optional()
    .describe('Preview the repair plan without applying changes'),
});
