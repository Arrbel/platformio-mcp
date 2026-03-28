/**
 * Project initialization and management tools
 */

import { mkdir, readFile } from 'fs/promises';
import path from 'path';
import {
  generateCompilationDatabase,
  getProjectMetadata,
  platformioExecutor,
} from '../platformio.js';
import type {
  CompileCommandsResult,
  ProjectCapabilities,
  ProjectEnvironmentSummary,
  ProjectInitResult,
  ProjectInspection,
  ProjectRiskSummary,
  ProjectSummary,
  ProjectTargetsResult,
} from '../types.js';
import {
  validateBoardId,
  validateFramework,
  validateProjectPath,
  checkDirectoryExists,
  checkFileExists,
} from '../utils/validation.js';
import { PlatformIOError, ProjectInitError } from '../utils/errors.js';

type ParsedPlatformIOConfig = {
  defaultEnvironments: string[];
  environments: ProjectEnvironmentSummary[];
  warnings: string[];
  complexitySignals: string[];
};

function normalizeFrameworkValue(framework?: string): string | undefined {
  if (!framework) {
    return undefined;
  }

  const normalized = framework
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized.join(', ') : undefined;
}

function parseDefaultEnvironments(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseMonitorFilters(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const filters = value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return filters.length > 0 ? filters : undefined;
}

function parseListLikeValue(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function parseBooleanLikeValue(value?: string): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parsePlatformIOIni(contents: string): ParsedPlatformIOConfig {
  const sections = new Map<string, Record<string, string>>();
  let currentSection = '';
  let currentKey = '';
  const warnings = new Set<string>();
  const complexitySignals = new Set<string>();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) {
      continue;
    }

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1).trim();
      currentKey = '';
      if (!sections.has(currentSection)) {
        sections.set(currentSection, {});
      }
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (!currentSection) {
      continue;
    }

    if (currentKey && /^\s+/.test(rawLine) && !line.startsWith('[')) {
      const existing = sections.get(currentSection)?.[currentKey] ?? '';
      sections.set(currentSection, {
        ...(sections.get(currentSection) ?? {}),
        [currentKey]: existing ? `${existing}\n${line}` : line,
      });
      continue;
    }

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    currentKey = key;
    if (key === 'extends') {
      warnings.add(
        'This project uses extends in platformio.ini. Parsed config may differ from PlatformIO Core resolution semantics.'
      );
      complexitySignals.add('extends_present');
    }
    if (key === 'extra_configs') {
      warnings.add(
        'This project uses extra_configs. Parsed config may omit settings loaded from additional files.'
      );
      complexitySignals.add('extra_configs_present');
    }
    if (value.includes('${sysenv.')) {
      warnings.add(
        'This project uses ${sysenv.*} interpolation. Runtime values may depend on shell environment variables.'
      );
      complexitySignals.add('sysenv_interpolation_present');
    }
    if (value.includes('${this.')) {
      warnings.add(
        'This project uses ${this.*} interpolation. Parsed values may not match the final resolved PlatformIO configuration.'
      );
      complexitySignals.add('this_interpolation_present');
    }
    sections.set(currentSection, {
      ...(sections.get(currentSection) ?? {}),
      [key]: value,
    });
  }

  const platformioConfig = sections.get('platformio') ?? {};
  const defaultEnvironments = parseDefaultEnvironments(
    platformioConfig.default_envs
  );

  const environments = Array.from(sections.entries())
    .filter(([sectionName]) => sectionName.startsWith('env:'))
    .map(([sectionName, options]) => {
      const name = sectionName.slice('env:'.length);
      const monitorSpeed = options.monitor_speed
        ? Number(options.monitor_speed)
        : undefined;

      return {
        name,
        platform: options.platform,
        board: options.board,
        framework: normalizeFrameworkValue(options.framework),
        testIgnore: parseListLikeValue(options.test_ignore ?? options.test_filter),
        testFramework: options.test_framework,
        testBuildSrc: parseBooleanLikeValue(options.test_build_src),
        libDeps: parseListLikeValue(options.lib_deps),
        libExtraDirs: parseListLikeValue(options.lib_extra_dirs),
        libLdfMode: options.lib_ldf_mode,
        libCompatMode: options.lib_compat_mode,
        extraScripts: parseListLikeValue(options.extra_scripts),
        monitorPort: options.monitor_port,
        monitorSpeed: Number.isFinite(monitorSpeed) ? monitorSpeed : undefined,
        monitorFilters: parseMonitorFilters(options.monitor_filters),
        uploadPort: options.upload_port,
        isDefault: defaultEnvironments.includes(name),
        options,
      } satisfies ProjectEnvironmentSummary;
    });

  return {
    defaultEnvironments,
    environments,
    warnings: Array.from(warnings),
    complexitySignals: Array.from(complexitySignals),
  };
}

function detectConfigurationWarnings(contents: string): {
  warnings: string[];
  complexitySignals: string[];
} {
  const warnings = new Set<string>();
  const complexitySignals = new Set<string>();
  if (/^\s*extra_configs\s*=/m.test(contents)) {
    warnings.add(
      'This project uses extra_configs. Parsed config may omit settings loaded from additional files.'
    );
    complexitySignals.add('extra_configs_present');
  }
  if (/^\s*extends\s*=/m.test(contents)) {
    warnings.add(
      'This project uses extends in platformio.ini. Parsed config may differ from PlatformIO Core resolution semantics.'
    );
    complexitySignals.add('extends_present');
  }
  if (contents.includes('${sysenv.') || contents.includes('PIO_BOARD')) {
    warnings.add(
      'This project uses ${sysenv.*} interpolation. Runtime values may depend on shell environment variables.'
    );
    complexitySignals.add('sysenv_interpolation_present');
    complexitySignals.add('default_env_override_possible');
  }
  if (contents.includes('${this.') || contents.includes('__env__')) {
    warnings.add(
      'This project uses ${this.*} interpolation. Parsed values may not match the final resolved PlatformIO configuration.'
    );
    complexitySignals.add('this_interpolation_present');
  }
  if (contents.includes('${PROJECT_DEFAULT_ENV}') || contents.includes('PLATFORMIO_DEFAULT_ENVS')) {
    complexitySignals.add('default_env_override_possible');
  }
  return {
    warnings: Array.from(warnings),
    complexitySignals: Array.from(complexitySignals),
  };
}

function determineEnvironmentResolution(config: ParsedPlatformIOConfig): {
  resolvedEnvironment?: string;
  environmentResolution:
    | 'explicit'
    | 'default_envs'
    | 'single_environment_fallback'
    | 'ambiguous'
    | 'not_resolved';
  resolutionReason: string;
  resolutionWarnings: string[];
} {
  if (config.defaultEnvironments.length > 0) {
    const resolvedEnvironment = config.defaultEnvironments[0];
    const matchingEnvironment = config.environments.find(
      (environment) => environment.name === resolvedEnvironment
    );

    if (!matchingEnvironment) {
      return {
        environmentResolution: 'not_resolved',
        resolutionReason:
          'platformio.default_envs is configured, but none of the listed environments exist in platformio.ini.',
        resolutionWarnings: [
          `Configured default_envs entry '${resolvedEnvironment}' does not match any declared [env:<name>] section.`,
        ],
      };
    }

    return {
      resolvedEnvironment,
      environmentResolution: 'default_envs',
      resolutionReason: `Resolved from platformio.default_envs (${config.defaultEnvironments.join(', ')}).`,
      resolutionWarnings: [],
    };
  }

  if (config.environments.length === 1) {
    return {
      resolvedEnvironment: config.environments[0]?.name,
      environmentResolution: 'single_environment_fallback',
      resolutionReason:
        'Resolved from the only environment defined in platformio.ini.',
      resolutionWarnings: [],
    };
  }

  if (config.environments.length > 1) {
    return {
      environmentResolution: 'ambiguous',
      resolutionReason:
        'Multiple environments are defined and no default_envs entry was found.',
      resolutionWarnings: [
        'Environment selection is ambiguous until a specific environment is provided or default_envs is configured.',
      ],
    };
  }

  return {
    environmentResolution: 'not_resolved',
    resolutionReason: 'No [env:<name>] sections were found in platformio.ini.',
    resolutionWarnings: [
      'Project does not currently define any PlatformIO environments.',
    ],
  };
}

async function detectProjectCapabilities(
  projectDir: string,
  environments: ProjectEnvironmentSummary[],
  metadataAvailable: boolean,
  targets?: string[],
  metadataExtra?: Record<string, unknown>
): Promise<ProjectCapabilities> {
  const testDirExists = await checkDirectoryExists(path.join(projectDir, 'test'));
  const hasNativeEnvironment = environments.some(
    (environment) => environment.platform === 'native'
  );
  const hasTestConfiguration = environments.some(
    (environment) =>
      Boolean(environment.testFramework) ||
      Boolean(environment.testBuildSrc) ||
      Boolean(environment.testIgnore?.length)
  );
  const hasLibraryDependencyOverrides = environments.some(
    (environment) =>
      Boolean(environment.libDeps?.length) ||
      Boolean(environment.libExtraDirs?.length) ||
      Boolean(environment.libLdfMode) ||
      Boolean(environment.libCompatMode)
  );
  const hasExtraScripts = environments.some(
    (environment) => Boolean(environment.extraScripts?.length)
  );
  const targetList = targets ?? [];
  const hasCustomTargetsHint =
    targetList.some(
      (target) => !['buildprog', 'clean', 'upload', 'monitor', 'compiledb'].includes(target)
    ) || Boolean(metadataExtra?.custom_targets);

  return {
    hasMetadata: metadataAvailable,
    hasTargets: targetList.length > 0,
    canGenerateCompileCommands:
      hasNativeEnvironment ||
      environments.some((environment) => Boolean(environment.board)),
    hasTestDir: testDirExists,
    hasTestConfiguration,
    hasLibraryDependencyOverrides,
    hasExtraScripts,
    hasNativeEnvironment,
    hasCustomTargetsHint,
  };
}

function excerptOutput(output: string, maxLength = 400): string {
  return output.trim().slice(0, maxLength);
}

function buildProjectSummary(options: {
  inspection: Pick<
    ProjectInspection,
    | 'defaultEnvironments'
    | 'environments'
    | 'resolvedEnvironment'
    | 'environmentResolution'
    | 'projectCapabilities'
  >;
}): ProjectSummary {
  const { inspection } = options;
  return {
    environmentCount: inspection.environments.length,
    defaultEnvironmentCount: inspection.defaultEnvironments.length,
    resolvedEnvironment: inspection.resolvedEnvironment,
    environmentResolution: inspection.environmentResolution,
    hasMetadata: inspection.projectCapabilities.hasMetadata,
    hasTargets: inspection.projectCapabilities.hasTargets,
    hasTestConfiguration: inspection.projectCapabilities.hasTestConfiguration,
    hasLibraryDependencyOverrides:
      inspection.projectCapabilities.hasLibraryDependencyOverrides,
    hasExtraScripts: inspection.projectCapabilities.hasExtraScripts,
  };
}

function buildRiskSummary(options: {
  configComplexitySignals: string[];
  resolutionWarnings: string[];
  warnings: string[];
}): ProjectRiskSummary {
  const { configComplexitySignals, resolutionWarnings, warnings } = options;
  return {
    hasEnvironmentRisk: resolutionWarnings.length > 0,
    hasConfigurationRisk: configComplexitySignals.length > 0,
    hasWarnings: warnings.length > 0 || resolutionWarnings.length > 0,
  };
}

async function loadProjectInspection(
  projectDir: string
): Promise<ProjectInspection> {
  const validatedPath = validateProjectPath(projectDir);
  const platformioIniPath = path.join(validatedPath, 'platformio.ini');
  const hasPlatformIOIni = await checkFileExists(platformioIniPath);

  if (!hasPlatformIOIni) {
    throw new ProjectInitError(
      `PlatformIO project not found at ${validatedPath}`,
      {
        projectDir: validatedPath,
        missingFile: platformioIniPath,
      }
    );
  }

  const contents = await readFile(platformioIniPath, 'utf8');
  const parsed = parsePlatformIOIni(contents);
  const configAnalysis = detectConfigurationWarnings(contents);
  const warnings = [
    ...new Set([...parsed.warnings, ...configAnalysis.warnings]),
  ];
  const environmentResolution = determineEnvironmentResolution(parsed);
  const configComplexitySignals = [
    ...new Set([
      ...parsed.complexitySignals,
      ...configAnalysis.complexitySignals,
    ]),
  ];
  const projectCapabilities = await detectProjectCapabilities(
    validatedPath,
    parsed.environments,
    false
  );
  const resolutionWarnings = [...environmentResolution.resolutionWarnings];

  if (configComplexitySignals.includes('default_env_override_possible')) {
    resolutionWarnings.push(
      'Default environment selection may still be affected by environment variables or interpolation at runtime.'
    );
  }

  const partialInspection = {
    defaultEnvironments: parsed.defaultEnvironments,
    environments: parsed.environments,
    resolvedEnvironment: environmentResolution.resolvedEnvironment,
    environmentResolution: environmentResolution.environmentResolution,
    projectCapabilities,
  } satisfies Pick<
    ProjectInspection,
    | 'defaultEnvironments'
    | 'environments'
    | 'resolvedEnvironment'
    | 'environmentResolution'
    | 'projectCapabilities'
  >;

  return {
    projectDir: validatedPath,
    platformioIniPath,
    isPlatformIOProject: true,
    configSource: 'platformio_ini',
    metadataSource: 'pio_project_metadata',
    defaultEnvironments: parsed.defaultEnvironments,
    environments: parsed.environments,
    resolvedEnvironment: environmentResolution.resolvedEnvironment,
    environmentResolution: environmentResolution.environmentResolution,
    resolutionReason: environmentResolution.resolutionReason,
    resolutionWarnings,
    metadataAvailable: false,
    metadata: undefined,
    targets: undefined,
    toolchain: undefined,
    includes: undefined,
    defines: undefined,
    programPath: undefined,
    metadataExtra: undefined,
    configComplexitySignals,
    projectCapabilities,
    projectSummary: buildProjectSummary({
      inspection: partialInspection,
    }),
    riskSummary: buildRiskSummary({
      configComplexitySignals,
      resolutionWarnings,
      warnings,
    }),
    warnings,
  };
}

/**
 * Initializes a new PlatformIO project
 */
export async function initProject(config: {
  board: string;
  framework?: string;
  projectDir: string;
  platformOptions?: Record<string, string>;
}): Promise<ProjectInitResult> {
  // Validate inputs
  if (!validateBoardId(config.board)) {
    throw new ProjectInitError(`Invalid board ID: ${config.board}`, {
      board: config.board,
    });
  }

  if (config.framework && !validateFramework(config.framework)) {
    throw new ProjectInitError(`Invalid framework: ${config.framework}`, {
      framework: config.framework,
    });
  }

  let projectPath: string;
  try {
    projectPath = validateProjectPath(config.projectDir);
  } catch (error) {
    throw new ProjectInitError(`Invalid project directory: ${error}`, {
      projectDir: config.projectDir,
    });
  }

  try {
    // Create directory if it doesn't exist
    const dirExists = await checkDirectoryExists(projectPath);
    if (!dirExists) {
      await mkdir(projectPath, { recursive: true });
    }

    // Build command args
    const args: string[] = ['project', 'init', '--board', config.board];

    // Add optional framework
    if (config.framework) {
      args.push('--project-option', `framework=${config.framework}`);
    }

    // Add additional platform options
    if (config.platformOptions) {
      for (const [key, value] of Object.entries(config.platformOptions)) {
        args.push('--project-option', `${key}=${value}`);
      }
    }

    // Execute init command in the project directory
    const result = await platformioExecutor.execute('project', args.slice(1), {
      cwd: projectPath,
      timeout: 120000,
    });

    if (result.exitCode !== 0) {
      throw new ProjectInitError(
        `Failed to initialize project: ${result.stderr}`,
        {
          board: config.board,
          stderr: result.stderr,
          exitCode: result.exitCode,
        }
      );
    }

    return {
      success: true,
      path: projectPath,
      message: `Successfully initialized PlatformIO project for board '${config.board}' at ${projectPath}`,
    };
  } catch (error) {
    if (error instanceof ProjectInitError) {
      throw error;
    }
    throw new ProjectInitError(`Failed to initialize project: ${error}`, {
      board: config.board,
      projectDir: config.projectDir,
    });
  }
}

/**
 * Checks if a directory is a valid PlatformIO project
 */
export async function isValidProject(projectDir: string): Promise<boolean> {
  try {
    const validatedPath = validateProjectPath(projectDir);
    const platformioIniPath = path.join(validatedPath, 'platformio.ini');
    return await checkFileExists(platformioIniPath);
  } catch {
    return false;
  }
}

/**
 * Gets project configuration from platformio.ini
 */
export async function getProjectConfig(
  projectDir: string
): Promise<Record<string, unknown>> {
  const validatedPath = validateProjectPath(projectDir);

  try {
    const result = await platformioExecutor.execute('project', ['config'], {
      cwd: validatedPath,
      timeout: 30000,
    });

    if (result.exitCode !== 0) {
      throw new ProjectInitError(
        `Failed to get project config: ${result.stderr}`,
        { projectDir, stderr: result.stderr }
      );
    }

    // Parse the config output (it's in INI format)
    // For now, return raw output
    return {
      rawConfig: result.stdout,
    };
  } catch (error) {
    throw new ProjectInitError(
      `Failed to get project configuration: ${error}`,
      { projectDir }
    );
  }
}

/**
 * Inspects a PlatformIO project by parsing platformio.ini.
 */
export async function inspectProject(
  projectDir: string
): Promise<ProjectInspection> {
  const inspection = await loadProjectInspection(projectDir);
  const primaryEnvironment = inspection.resolvedEnvironment;

  if (!primaryEnvironment) {
    return {
      ...inspection,
      warnings: inspection.warnings.concat(
        'PlatformIO metadata lookup was skipped because no environment could be resolved unambiguously.'
      ),
    };
  }

  try {
    const metadata = await getProjectMetadata(
      inspection.projectDir,
      primaryEnvironment
    );
    const projectCapabilities = await detectProjectCapabilities(
      inspection.projectDir,
      inspection.environments,
      true,
      metadata.targets,
      metadata.extra
    );

    return {
      ...inspection,
      metadataAvailable: true,
      metadata,
      targets: metadata.targets,
      toolchain: metadata.toolchain,
      includes: metadata.includes,
      defines: metadata.defines,
      programPath: metadata.programPath,
      metadataExtra: metadata.extra,
      projectCapabilities,
      projectSummary: buildProjectSummary({
        inspection: {
          defaultEnvironments: inspection.defaultEnvironments,
          environments: inspection.environments,
          resolvedEnvironment: inspection.resolvedEnvironment,
          environmentResolution: inspection.environmentResolution,
          projectCapabilities,
        },
      }),
      riskSummary: buildRiskSummary({
        configComplexitySignals: inspection.configComplexitySignals,
        resolutionWarnings: inspection.resolutionWarnings,
        warnings: inspection.warnings,
      }),
    };
  } catch (error) {
    const warnings = inspection.warnings.concat(
      `PlatformIO metadata could not be resolved: ${String(error)}`
    );
    const projectCapabilities = await detectProjectCapabilities(
      inspection.projectDir,
      inspection.environments,
      false
    );
    return {
      ...inspection,
      projectCapabilities,
      projectSummary: buildProjectSummary({
        inspection: {
          defaultEnvironments: inspection.defaultEnvironments,
          environments: inspection.environments,
          resolvedEnvironment: inspection.resolvedEnvironment,
          environmentResolution: inspection.environmentResolution,
          projectCapabilities,
        },
      }),
      riskSummary: buildRiskSummary({
        configComplexitySignals: inspection.configComplexitySignals,
        resolutionWarnings: inspection.resolutionWarnings,
        warnings,
      }),
      warnings,
    };
  }
}

/**
 * Lists environments defined in a PlatformIO project.
 */
export async function listProjectEnvironments(
  projectDir: string
): Promise<ProjectEnvironmentSummary[]> {
  const inspection = await loadProjectInspection(projectDir);
  return inspection.environments;
}

function parseTargetList(output: string): string[] {
  const targets = new Set<string>();

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      /^Environment\s+/i.test(trimmed) ||
      /^-+\s*/.test(trimmed)
    ) {
      continue;
    }

    const columns = trimmed.split(/\s{2,}/).filter(Boolean);
    const target =
      columns.length >= 3 ? columns[2] : columns.length === 1 ? columns[0] : undefined;
    if (target && /^[A-Za-z0-9_.-]+$/.test(target)) {
      targets.add(target);
    }
  }

  return Array.from(targets);
}

export async function listProjectTargets(
  projectDir: string,
  environment?: string
): Promise<ProjectTargetsResult> {
  const validatedPath = validateProjectPath(projectDir);
  await assertProjectEnvironmentExists(validatedPath, environment);
  const resolvedEnvironment = environment
    ? (await resolveProjectEnvironment(validatedPath, environment))?.name
    : (await resolveProjectEnvironment(validatedPath))?.name;

  const args = ['--list-targets'];
  if (environment) {
    args.push('--environment', environment);
  }

  const result = await platformioExecutor.execute('run', args, {
    cwd: validatedPath,
    timeout: 120000,
  });

  if (result.exitCode !== 0) {
    throw new ProjectInitError('Failed to list project targets', {
      projectDir: validatedPath,
      environment,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  }

  const items = parseTargetList(result.stdout);

  return {
    projectDir: validatedPath,
    environment,
    resolvedEnvironment,
    targetDiscoveryStatus: items.length > 0 ? 'targets_found' : 'no_targets',
    targets: items,
    rawOutputExcerpt: excerptOutput(result.stdout),
    items,
  };
}

export async function generateProjectCompilationDatabase(
  projectDir: string
): Promise<CompileCommandsResult> {
  const validatedPath = validateProjectPath(projectDir);
  const resolvedEnvironment = (await resolveProjectEnvironment(validatedPath))
    ?.name;

  if (!resolvedEnvironment) {
    return {
      success: false,
      command: 'pio run -t compiledb',
      generationStatus: 'environment_not_resolved',
      failureCategory: 'environment_not_resolved',
    };
  }

  try {
    const result = await generateCompilationDatabase(validatedPath);
    return {
      ...result,
      outputPath: result.outputPath,
      compileCommandsPath: result.outputPath,
      resolvedEnvironment,
      generationStatus: 'generated',
      failureCategory: undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error ? `${error.message}` : String(error);
    const lower = message.toLowerCase();
    const toolchainUnavailable =
      lower.includes('g++') ||
      lower.includes('clang') ||
      lower.includes('compiler') ||
      lower.includes('toolchain');
    const platformioError =
      error instanceof PlatformIOError ? error : undefined;

    return {
      success: false,
      command: 'pio run -t compiledb',
      resolvedEnvironment,
      generationStatus: toolchainUnavailable
        ? 'toolchain_unavailable'
        : 'command_failed',
      failureCategory: toolchainUnavailable
        ? 'toolchain_unavailable'
        : platformioError?.code?.toLowerCase() ?? 'command_failed',
      rawOutputExcerpt: excerptOutput(message),
    };
  }
}

/**
 * Resolves the effective environment for project operations.
 */
export async function resolveProjectEnvironment(
  projectDir: string,
  environment?: string
): Promise<ProjectEnvironmentSummary | undefined> {
  const inspection = await loadProjectInspection(projectDir);
  if (inspection.environments.length === 0) {
    return undefined;
  }

  if (environment) {
    return inspection.environments.find((entry) => entry.name === environment);
  }

  if (inspection.resolvedEnvironment) {
    return inspection.environments.find(
      (entry) => entry.name === inspection.resolvedEnvironment
    );
  }
  return undefined;
}

/**
 * Ensures a requested environment exists within a PlatformIO project.
 */
export async function assertProjectEnvironmentExists(
  projectDir: string,
  environment?: string
): Promise<void> {
  const inspection = await loadProjectInspection(projectDir);
  if (!environment) {
    return;
  }

  const environmentExists = inspection.environments.some(
    (entry) => entry.name === environment
  );

  if (!environmentExists) {
    throw new ProjectInitError(
      `Environment '${environment}' was not found in ${inspection.platformioIniPath}`,
      {
        projectDir: inspection.projectDir,
        environment,
        availableEnvironments: inspection.environments.map(
          (entry) => entry.name
        ),
      }
    );
  }
}
