/**
 * Project initialization and management tools
 */

import { mkdir, readFile } from 'fs/promises';
import path from 'path';
import { platformioExecutor } from '../platformio.js';
import type {
  ProjectEnvironmentSummary,
  ProjectInitResult,
  ProjectInspection,
} from '../types.js';
import {
  validateBoardId,
  validateFramework,
  validateProjectPath,
  checkDirectoryExists,
  checkFileExists,
} from '../utils/validation.js';
import { ProjectInitError } from '../utils/errors.js';

type ParsedPlatformIOConfig = {
  defaultEnvironments: string[];
  environments: ProjectEnvironmentSummary[];
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

function parsePlatformIOIni(contents: string): ParsedPlatformIOConfig {
  const sections = new Map<string, Record<string, string>>();
  let currentSection = '';

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) {
      continue;
    }

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1).trim();
      if (!sections.has(currentSection)) {
        sections.set(currentSection, {});
      }
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1 || !currentSection) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
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
        monitorPort: options.monitor_port,
        monitorSpeed: Number.isFinite(monitorSpeed) ? monitorSpeed : undefined,
        uploadPort: options.upload_port,
        isDefault: defaultEnvironments.includes(name),
        options,
      } satisfies ProjectEnvironmentSummary;
    });

  return {
    defaultEnvironments,
    environments,
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

  return {
    projectDir: validatedPath,
    platformioIniPath,
    isPlatformIOProject: true,
    defaultEnvironments: parsed.defaultEnvironments,
    environments: parsed.environments,
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
  return loadProjectInspection(projectDir);
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

  const defaultEnvironment = inspection.defaultEnvironments[0];
  if (defaultEnvironment) {
    return inspection.environments.find(
      (entry) => entry.name === defaultEnvironment
    );
  }

  return inspection.environments[0];
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
