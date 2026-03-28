import { z } from 'zod';

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
  packageType?: 'library' | 'platform' | 'tool' | 'unknown';
  owner?: string;
  optional?: boolean;
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
  packageType: z.enum(['library', 'platform', 'tool', 'unknown']).optional(),
  owner: z.string().optional(),
  optional: z.boolean().optional(),
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

export interface LibrarySearchResult {
  items: LibraryInfo[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
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

export interface InstalledLibrariesResult {
  items: LibraryInfo[];
}
