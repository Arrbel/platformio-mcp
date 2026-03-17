import type { z } from 'zod';

import type { ExecutionResultMeta, ToolResponse } from '../../types.js';

export type ToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  paramsSchema: TSchema;
  handler: (args: z.infer<TSchema>) => Promise<ToolResponse>;
};

export type AnyToolDefinition = ToolDefinition<z.ZodTypeAny>;

export function defineTool<TSchema extends z.ZodTypeAny>(
  definition: ToolDefinition<TSchema>
): AnyToolDefinition {
  return definition as AnyToolDefinition;
}

export function createToolResponse<TData>(
  response: Omit<ToolResponse<TData>, 'warnings' | 'nextActions'> &
    Partial<Pick<ToolResponse<TData>, 'warnings' | 'nextActions'>>
): ToolResponse<TData> {
  return {
    ...response,
    warnings: response.warnings ?? [],
    nextActions: response.nextActions ?? [],
  };
}

export function withExecutionMeta<TData extends object>(
  data: TData,
  meta: ExecutionResultMeta
): TData & { meta: ExecutionResultMeta } {
  return {
    ...data,
    meta,
  };
}
