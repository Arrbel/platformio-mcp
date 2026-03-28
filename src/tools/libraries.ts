/**
 * Library management tools
 */

import { z } from 'zod';
import {
  execPioCommand,
  parsePioJsonOutput,
  platformioExecutor,
} from '../platformio.js';
import type {
  InstalledLibrariesResult,
  LibraryInfo,
  LibraryInstallResult,
  LibrarySearchResult,
} from '../types.js';
import {
  LibrariesArraySchema,
  PlatformIOLibrarySearchResponseSchema,
} from '../types.js';
import {
  validateLibraryName,
  validateVersion,
  validateProjectPath,
} from '../utils/validation.js';
import { LibraryError, PlatformIOError } from '../utils/errors.js';

function normalizeLibraryInfo(
  raw: Record<string, unknown>,
  context: 'search' | 'installed'
): LibraryInfo {
  const frameworks =
    context === 'search'
      ? Array.isArray(raw.frameworks)
        ? raw.frameworks
            .map((framework) =>
              typeof framework === 'object' &&
              framework !== null &&
              'name' in framework &&
              typeof framework.name === 'string'
                ? framework.name
                : undefined
            )
            .filter((value): value is string => Boolean(value))
        : undefined
      : Array.isArray(raw.frameworks)
        ? raw.frameworks.filter(
            (value): value is string => typeof value === 'string'
          )
        : undefined;

  const platforms =
    context === 'search'
      ? Array.isArray(raw.platforms)
        ? raw.platforms
            .map((platform) =>
              typeof platform === 'object' &&
              platform !== null &&
              'name' in platform &&
              typeof platform.name === 'string'
                ? platform.name
                : undefined
            )
            .filter((value): value is string => Boolean(value))
        : undefined
      : Array.isArray(raw.platforms)
        ? raw.platforms.filter(
            (value): value is string => typeof value === 'string'
          )
        : undefined;

  const authors =
    context === 'search'
      ? Array.isArray(raw.authornames)
        ? raw.authornames
            .filter((value): value is string => typeof value === 'string')
            .map((name) => ({ name }))
        : undefined
      : Array.isArray(raw.authors)
        ? raw.authors
            .map((author) => {
              if (
                typeof author === 'object' &&
                author !== null &&
                'name' in author &&
                typeof author.name === 'string'
              ) {
                return {
                  name: author.name,
                  email:
                    'email' in author && typeof author.email === 'string'
                      ? author.email
                      : undefined,
                  maintainer:
                    'maintainer' in author &&
                    typeof author.maintainer === 'boolean'
                      ? author.maintainer
                      : undefined,
                };
              }
              return undefined;
            })
            .filter((value): value is NonNullable<typeof value> =>
              Boolean(value)
            )
        : undefined;

  const repository =
    typeof raw.repository === 'object' &&
    raw.repository !== null &&
    'type' in raw.repository &&
    'url' in raw.repository &&
    typeof raw.repository.type === 'string' &&
    typeof raw.repository.url === 'string'
      ? { type: raw.repository.type, url: raw.repository.url }
      : undefined;

  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    name: typeof raw.name === 'string' ? raw.name : 'unknown',
    description:
      typeof raw.description === 'string' ? raw.description : undefined,
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.filter(
          (value): value is string => typeof value === 'string'
        )
      : undefined,
    authors,
    repository,
    version:
      typeof raw.version === 'string'
        ? raw.version
        : typeof raw.versionname === 'string'
          ? raw.versionname
          : undefined,
    packageType:
      typeof raw.type === 'string' &&
      ['library', 'platform', 'tool'].includes(raw.type)
        ? (raw.type as 'library' | 'platform' | 'tool')
        : 'unknown',
    owner: typeof raw.owner === 'string' ? raw.owner : undefined,
    optional: typeof raw.optional === 'boolean' ? raw.optional : undefined,
    frameworks,
    platforms,
    homepage: typeof raw.homepage === 'string' ? raw.homepage : undefined,
  };
}

/**
 * Searches for libraries in the PlatformIO registry
 */
export async function searchLibraries(
  query: string,
  limit?: number
): Promise<LibrarySearchResult> {
  if (!query || query.trim().length === 0) {
    throw new LibraryError('Search query is required');
  }

  try {
    const result = await execPioCommand(
      ['pkg', 'search', query.trim(), '--json-output'],
      { timeout: 30000 }
    );
    if (result.exitCode !== 0) {
      throw new PlatformIOError(
        `PlatformIO command failed: pkg search ${query}`,
        'COMMAND_FAILED',
        {
          stderr: result.stderr,
          exitCode: result.exitCode,
        }
      );
    }
    const parsed = parsePioJsonOutput(
      result.stdout,
      PlatformIOLibrarySearchResponseSchema
    );
    const libraries = parsed.items.map((item) =>
      normalizeLibraryInfo(item, 'search')
    );
    const normalized = LibrariesArraySchema.parse(libraries);
    const items =
      limit && limit > 0 ? normalized.slice(0, limit) : normalized;

    return {
      items,
      pagination: {
        page: parsed.page ?? 1,
        perPage: parsed.perpage ?? normalized.length,
        total: parsed.total ?? normalized.length,
      },
    };
  } catch (error) {
    throw new LibraryError(
      `Failed to search libraries with query '${query}': ${error}`,
      { query }
    );
  }
}

/**
 * Installs a library (globally or to a specific project)
 */
export async function installLibrary(
  libraryName: string,
  options?: {
    projectDir?: string;
    environment?: string;
    version?: string;
  }
): Promise<LibraryInstallResult> {
  if (!validateLibraryName(libraryName)) {
    throw new LibraryError(`Invalid library name: ${libraryName}`, {
      libraryName,
    });
  }

  if (options?.version && !validateVersion(options.version)) {
    throw new LibraryError(`Invalid version format: ${options.version}`, {
      version: options.version,
    });
  }

  try {
    const failureContext: Record<string, unknown> = {
      libraryName,
      projectDir: options?.projectDir,
      environment: options?.environment,
      version: options?.version,
    };

    // Build library specification with optional version
    let librarySpec = libraryName;
    if (options?.version) {
      librarySpec = `${libraryName}@${options.version}`;
    }
    const args: string[] = ['install', '--library', librarySpec];
    if (options?.projectDir) {
      const validatedPath = validateProjectPath(options.projectDir);
      args.push('--project-dir', validatedPath);
    } else {
      args.push('--global');
    }
    if (options?.environment) {
      args.push('--environment', options.environment);
    }

    const result = await platformioExecutor.execute('pkg', args, {
      timeout: 120000,
    });

    if (result.exitCode !== 0) {
      const stderr = result.stderr.toLowerCase();
      let failureCategory = 'command_failed';
      if (stderr.includes('could not find') || stderr.includes('unknown')) {
        failureCategory = 'registry_not_found';
      } else if (
        stderr.includes('incompatible') ||
        stderr.includes('requirements')
      ) {
        failureCategory = 'compatibility_mismatch';
      } else if (
        stderr.includes('network') ||
        stderr.includes('connection') ||
        stderr.includes('timeout')
      ) {
        failureCategory = 'registry_network_error';
      } else if (stderr.includes('project') && stderr.includes('not found')) {
        failureCategory = 'environment_missing';
      }
      throw new LibraryError(
        `Failed to install library '${librarySpec}': ${result.stderr}`,
        {
          ...failureContext,
          library: librarySpec,
          stderr: result.stderr,
          failureCategory,
        }
      );
    }

    return {
      success: true,
      library: libraryName,
      message: `Successfully installed ${librarySpec}${options?.projectDir ? ' to project' : ' globally'}`,
    };
  } catch (error) {
    if (error instanceof LibraryError) {
      throw error;
    }
    throw new LibraryError(
      `Failed to install library '${libraryName}': ${error}`,
      { libraryName, options }
    );
  }
}

/**
 * Lists installed libraries (globally or for a specific project)
 */
export async function listInstalledLibraries(
  projectDir?: string
): Promise<InstalledLibrariesResult> {
  try {
    const execOptions: { cwd?: string; timeout?: number } = { timeout: 30000 };
    if (projectDir) {
      const validatedPath = validateProjectPath(projectDir);
      execOptions.cwd = validatedPath;
    }

    const result = await platformioExecutor.execute(
      'pkg',
      ['list', '--json-output'],
      execOptions
    );
    if (result.exitCode !== 0) {
      throw new PlatformIOError(
        'PlatformIO command failed: pkg list',
        'COMMAND_FAILED',
        {
          stderr: result.stderr,
          exitCode: result.exitCode,
        }
      );
    }
    const parsed = parsePioJsonOutput(
      result.stdout,
      z.array(z.record(z.unknown()))
    );
    const libraries = parsed.map((item) =>
      normalizeLibraryInfo(item, 'installed')
    );
    const normalized = LibrariesArraySchema.parse(libraries);

    return {
      items: normalized,
    };
  } catch (error) {
    // If no libraries are installed, return empty array
    if (error instanceof PlatformIOError) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes('no libraries') ||
        errorMessage.includes('empty')
      ) {
        return {
          items: [],
        };
      }
    }

    throw new LibraryError(
      `Failed to list installed libraries${projectDir ? ` for project at ${projectDir}` : ''}: ${error}`,
      { projectDir }
    );
  }
}

/**
 * Uninstalls a library (globally or from a specific project)
 */
export async function uninstallLibrary(
  libraryName: string,
  projectDir?: string
): Promise<{ success: boolean; message: string }> {
  if (!validateLibraryName(libraryName)) {
    throw new LibraryError(`Invalid library name: ${libraryName}`, {
      libraryName,
    });
  }

  try {
    const execOptions: { cwd?: string; timeout?: number } = { timeout: 60000 };
    if (projectDir) {
      const validatedPath = validateProjectPath(projectDir);
      execOptions.cwd = validatedPath;
    }

    const result = await platformioExecutor.execute(
      'lib',
      ['uninstall', libraryName],
      execOptions
    );

    if (result.exitCode !== 0) {
      throw new LibraryError(
        `Failed to uninstall library '${libraryName}': ${result.stderr}`,
        { library: libraryName, stderr: result.stderr }
      );
    }

    return {
      success: true,
      message: `Successfully uninstalled ${libraryName}${projectDir ? ' from project' : ' globally'}`,
    };
  } catch (error) {
    if (error instanceof LibraryError) {
      throw error;
    }
    throw new LibraryError(
      `Failed to uninstall library '${libraryName}': ${error}`,
      { libraryName, projectDir }
    );
  }
}

/**
 * Updates installed libraries (globally or for a specific project)
 */
export async function updateLibraries(
  projectDir?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const execOptions: { cwd?: string; timeout?: number } = { timeout: 180000 };
    if (projectDir) {
      const validatedPath = validateProjectPath(projectDir);
      execOptions.cwd = validatedPath;
    }

    const result = await platformioExecutor.execute(
      'lib',
      ['update'],
      execOptions
    );

    if (result.exitCode !== 0) {
      throw new LibraryError(`Failed to update libraries: ${result.stderr}`, {
        stderr: result.stderr,
      });
    }

    return {
      success: true,
      message: `Successfully updated libraries${projectDir ? ' for project' : ' globally'}`,
    };
  } catch (error) {
    if (error instanceof LibraryError) {
      throw error;
    }
    throw new LibraryError(`Failed to update libraries: ${error}`, {
      projectDir,
    });
  }
}

/**
 * Gets information about a specific library
 */
export async function getLibraryInfo(
  libraryNameOrId: string
): Promise<LibraryInfo | null> {
  try {
    const results = await searchLibraries(libraryNameOrId, 50);
    const items = results.items;

    // Try to find exact match first
    const exactMatch = items.find(
      (lib) =>
        lib.name.toLowerCase() === libraryNameOrId.toLowerCase() ||
        lib.id?.toString() === libraryNameOrId
    );

    if (exactMatch) {
      return exactMatch;
    }

    // Return first result if available
    return items.length > 0 ? items[0] : null;
  } catch (error) {
    throw new LibraryError(
      `Failed to get library info for '${libraryNameOrId}': ${error}`,
      { library: libraryNameOrId }
    );
  }
}
