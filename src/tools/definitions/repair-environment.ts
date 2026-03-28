import { RepairEnvironmentParamsSchema } from '../../types.js';
import { repairEnvironment } from '../repair.js';
import { createToolResponse, defineTool, withExecutionMeta } from './shared.js';

export const repairEnvironmentToolDefinition = defineTool({
  name: 'repair_environment',
  description:
    'Applies low-risk environment repairs, then automatically reruns doctor.',
  inputSchema: {
    type: 'object',
    properties: {
      problemCodes: { type: 'array', items: { type: 'string' } },
      fixIds: { type: 'array', items: { type: 'string' } },
      projectDir: { type: 'string' },
      allowInstall: { type: 'boolean' },
      allowShellProfileHints: { type: 'boolean' },
      dryRun: { type: 'boolean' },
    },
  },
  paramsSchema: RepairEnvironmentParamsSchema,
  handler: async (args) => {
    const result = await repairEnvironment(args);
    const hasRemainingProblems =
      result.recheckSummary.remainingProblemCodes.length > 0;
    const status =
      result.repairStatus === 'failed'
        ? 'error'
        : result.repairStatus === 'partial' || hasRemainingProblems
          ? 'warning'
          : 'ok';
    const summary =
      result.repairStatus === 'dry_run'
        ? result.attemptedFixes.length > 0
          ? `Environment repair plan generated for ${result.attemptedFixes.length} fix(es).`
          : 'Environment repair plan generated; no recommended fixes are currently needed.'
        : result.repairStatus === 'applied'
          ? `Environment repair actions applied and rechecked; ${result.recheckSummary.remainingProblemCodes.length} problem(s) remain.`
          : result.repairStatus === 'partial'
            ? `Environment repair partially applied; ${result.recheckSummary.remainingProblemCodes.length} problem(s) remain after recheck.`
            : 'Environment repair failed; review failed fixes and doctor output.';

    return createToolResponse({
      status,
      summary,
      data: withExecutionMeta(result, {
        operationType: 'repair',
        executionStatus:
          result.repairStatus === 'failed' ? 'failed' : 'succeeded',
        verificationStatus: 'not_requested',
      }),
      warnings: result.failedFixes.map((entry) => entry.reason),
      nextActions: [
        {
          tool: 'doctor',
          reason: 'Review the post-repair readiness and remaining problems.',
          arguments: args.projectDir ? { projectDir: args.projectDir } : {},
        },
      ],
    });
  },
});
