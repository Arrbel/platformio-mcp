import { z } from 'zod';

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
  testIgnore?: string[];
  testFramework?: string;
  testBuildSrc?: boolean;
  libDeps?: string[];
  libExtraDirs?: string[];
  libLdfMode?: string;
  libCompatMode?: string;
  extraScripts?: string[];
  monitorPort?: string;
  monitorSpeed?: number;
  monitorFilters?: string[];
  uploadPort?: string;
  isDefault: boolean;
  options: Record<string, string>;
}

export const ProjectEnvironmentSummarySchema = z.object({
  name: z.string(),
  platform: z.string().optional(),
  board: z.string().optional(),
  framework: z.string().optional(),
  testIgnore: z.array(z.string()).optional(),
  testFramework: z.string().optional(),
  testBuildSrc: z.boolean().optional(),
  libDeps: z.array(z.string()).optional(),
  libExtraDirs: z.array(z.string()).optional(),
  libLdfMode: z.string().optional(),
  libCompatMode: z.string().optional(),
  extraScripts: z.array(z.string()).optional(),
  monitorPort: z.string().optional(),
  monitorSpeed: z.number().optional(),
  monitorFilters: z.array(z.string()).optional(),
  uploadPort: z.string().optional(),
  isDefault: z.boolean(),
  options: z.record(z.string()),
});

export interface ProjectInspection {
  projectDir: string;
  platformioIniPath: string;
  isPlatformIOProject: boolean;
  configSource: 'platformio_ini';
  metadataSource: 'pio_project_metadata';
  defaultEnvironments: string[];
  environments: ProjectEnvironmentSummary[];
  resolvedEnvironment?: string;
  environmentResolution:
    | 'explicit'
    | 'default_envs'
    | 'single_environment_fallback'
    | 'ambiguous'
    | 'not_resolved';
  resolutionReason: string;
  resolutionWarnings: string[];
  metadataAvailable: boolean;
  metadata?: ProjectMetadata;
  targets?: string[];
  toolchain?: ProjectToolchainSummary;
  includes?: Record<string, string[]>;
  defines?: string[];
  programPath?: string;
  metadataExtra?: Record<string, unknown>;
  configComplexitySignals: string[];
  projectCapabilities: ProjectCapabilities;
  projectSummary: ProjectSummary;
  riskSummary: ProjectRiskSummary;
  warnings: string[];
}

export interface ProjectTargetsResult {
  projectDir: string;
  environment?: string;
  resolvedEnvironment?: string;
  targetDiscoveryStatus: 'targets_found' | 'no_targets';
  targets: string[];
  rawOutputExcerpt: string;
  items: string[];
}

export interface CompileCommandsResult {
  success: boolean;
  command: string;
  outputPath?: string;
  compileCommandsPath?: string;
  resolvedEnvironment?: string;
  generationStatus:
    | 'generated'
    | 'toolchain_unavailable'
    | 'environment_not_resolved'
    | 'command_failed';
  failureCategory?: string;
  rawOutputExcerpt?: string;
}

export interface ProjectToolchainSummary {
  ccPath?: string;
  cxxPath?: string;
  gdbPath?: string;
  compilerType?: string;
}

export interface ProjectMetadata {
  envName?: string;
  buildType?: string;
  toolchain?: ProjectToolchainSummary;
  includes?: Record<string, string[]>;
  defines?: string[];
  programPath?: string;
  targets?: string[];
  extra?: Record<string, unknown>;
}

export interface ProjectCapabilities {
  hasMetadata: boolean;
  hasTargets: boolean;
  canGenerateCompileCommands: boolean;
  hasTestDir: boolean;
  hasTestConfiguration: boolean;
  hasLibraryDependencyOverrides: boolean;
  hasExtraScripts: boolean;
  hasNativeEnvironment: boolean;
  hasCustomTargetsHint: boolean;
}

export interface ProjectSummary {
  environmentCount: number;
  defaultEnvironmentCount: number;
  resolvedEnvironment?: string;
  environmentResolution:
    | 'explicit'
    | 'default_envs'
    | 'single_environment_fallback'
    | 'ambiguous'
    | 'not_resolved';
  hasMetadata: boolean;
  hasTargets: boolean;
  hasTestConfiguration: boolean;
  hasLibraryDependencyOverrides: boolean;
  hasExtraScripts: boolean;
}

export interface ProjectRiskSummary {
  hasEnvironmentRisk: boolean;
  hasConfigurationRisk: boolean;
  hasWarnings: boolean;
}

export const ProjectToolchainSummarySchema = z.object({
  ccPath: z.string().optional(),
  cxxPath: z.string().optional(),
  gdbPath: z.string().optional(),
  compilerType: z.string().optional(),
});

export const ProjectMetadataSchema = z.object({
  envName: z.string().optional(),
  buildType: z.string().optional(),
  toolchain: ProjectToolchainSummarySchema.optional(),
  includes: z.record(z.array(z.string())).optional(),
  defines: z.array(z.string()).optional(),
  programPath: z.string().optional(),
  targets: z.array(z.string()).optional(),
  extra: z.record(z.unknown()).optional(),
});

export const ProjectInspectionSchema = z.object({
  projectDir: z.string(),
  platformioIniPath: z.string(),
  isPlatformIOProject: z.boolean(),
  configSource: z.literal('platformio_ini'),
  metadataSource: z.literal('pio_project_metadata'),
  defaultEnvironments: z.array(z.string()),
  environments: z.array(ProjectEnvironmentSummarySchema),
  resolvedEnvironment: z.string().optional(),
  environmentResolution: z.enum([
    'explicit',
    'default_envs',
    'single_environment_fallback',
    'ambiguous',
    'not_resolved',
  ]),
  resolutionReason: z.string(),
  resolutionWarnings: z.array(z.string()),
  metadataAvailable: z.boolean(),
  metadata: ProjectMetadataSchema.optional(),
  targets: z.array(z.string()).optional(),
  toolchain: ProjectToolchainSummarySchema.optional(),
  includes: z.record(z.array(z.string())).optional(),
  defines: z.array(z.string()).optional(),
  programPath: z.string().optional(),
  metadataExtra: z.record(z.unknown()).optional(),
  configComplexitySignals: z.array(z.string()),
  projectCapabilities: z.object({
    hasMetadata: z.boolean(),
    hasTargets: z.boolean(),
    canGenerateCompileCommands: z.boolean(),
    hasTestDir: z.boolean(),
    hasTestConfiguration: z.boolean(),
    hasLibraryDependencyOverrides: z.boolean(),
    hasExtraScripts: z.boolean(),
    hasNativeEnvironment: z.boolean(),
    hasCustomTargetsHint: z.boolean(),
  }),
  projectSummary: z.object({
    environmentCount: z.number(),
    defaultEnvironmentCount: z.number(),
    resolvedEnvironment: z.string().optional(),
    environmentResolution: z.enum([
      'explicit',
      'default_envs',
      'single_environment_fallback',
      'ambiguous',
      'not_resolved',
    ]),
    hasMetadata: z.boolean(),
    hasTargets: z.boolean(),
    hasTestConfiguration: z.boolean(),
    hasLibraryDependencyOverrides: z.boolean(),
    hasExtraScripts: z.boolean(),
  }),
  riskSummary: z.object({
    hasEnvironmentRisk: z.boolean(),
    hasConfigurationRisk: z.boolean(),
    hasWarnings: z.boolean(),
  }),
  warnings: z.array(z.string()),
});

export const ProjectTargetsResultSchema = z.object({
  projectDir: z.string(),
  environment: z.string().optional(),
  resolvedEnvironment: z.string().optional(),
  targetDiscoveryStatus: z.enum(['targets_found', 'no_targets']),
  targets: z.array(z.string()),
  rawOutputExcerpt: z.string(),
  items: z.array(z.string()),
});

export const CompileCommandsResultSchema = z.object({
  success: z.boolean(),
  command: z.string(),
  outputPath: z.string().optional(),
  compileCommandsPath: z.string().optional(),
  resolvedEnvironment: z.string().optional(),
  generationStatus: z.enum([
    'generated',
    'toolchain_unavailable',
    'environment_not_resolved',
    'command_failed',
  ]),
  failureCategory: z.string().optional(),
  rawOutputExcerpt: z.string().optional(),
});
