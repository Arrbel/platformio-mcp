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
