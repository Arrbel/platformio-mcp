import { z } from 'zod';

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
