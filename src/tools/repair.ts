import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  getRecommendedPlatformIOCliPath,
} from '../platformio.js';
import type {
  DoctorFixSuggestion,
  DoctorProblem,
  DoctorRecheckSummary,
  DoctorReport,
} from '../types.js';
import { doctor } from './doctor.js';

const execFileAsync = promisify(execFile);

export type RepairCommandRunner = (
  file: string,
  args: string[]
) => Promise<void>;

export interface RepairEnvironmentOptions {
  problemCodes?: string[];
  fixIds?: string[];
  projectDir?: string;
  allowInstall?: boolean;
  allowShellProfileHints?: boolean;
  dryRun?: boolean;
}

export interface RepairEnvironmentResult {
  repairStatus: 'dry_run' | 'applied' | 'partial' | 'failed';
  attemptedFixes: Array<{ fixId: string }>;
  appliedFixes: Array<{ fixId: string }>;
  skippedFixes: Array<{ fixId: string; reason: string }>;
  failedFixes: Array<{ fixId: string; reason: string }>;
  recheckSummary: DoctorRecheckSummary;
  postRepairDoctor: DoctorReport;
}

function tokenizeCommand(command: string): string[] {
  const matches = command.match(/"[^"]*"|'[^']*'|[^\s]+/g) ?? [];
  return matches.map((token) => token.replace(/^['"]|['"]$/g, ''));
}

async function defaultRepairCommandRunner(
  file: string,
  args: string[]
): Promise<void> {
  await execFileAsync(file, args, {
    timeout: 900000,
    windowsHide: true,
    shell: false,
  });
}

async function persistPlatformIOCliPath(
  cliPath: string,
  runCommand: RepairCommandRunner
): Promise<void> {
  if (process.platform !== 'win32') {
    return;
  }

  await runCommand('setx', ['PLATFORMIO_CLI_PATH', cliPath]);
}

function filterFixSuggestions(
  report: DoctorReport,
  options: RepairEnvironmentOptions
): {
  suggestions: DoctorFixSuggestion[];
  unknownFixIds: string[];
  unknownProblemCodes: string[];
} {
  if (options.fixIds && options.fixIds.length > 0) {
    const fixIdSet = new Set(options.fixIds);
    const suggestions = report.fixSuggestions.filter((entry) =>
      fixIdSet.has(entry.fixId)
    );
    const knownFixIds = new Set<DoctorFixSuggestion['fixId']>([
      'set_platformio_cli_env_hint',
      'activate_local_platformio_cli',
      'install_host_cpp_compiler_via_winget',
      'suggest_close_serial_consumers',
      'recheck_only',
    ]);
    const unknownFixIds = options.fixIds.filter(
      (fixId) =>
        !suggestions.some((entry) => entry.fixId === fixId) &&
        !knownFixIds.has(fixId as DoctorFixSuggestion['fixId'])
    );
    return {
      suggestions,
      unknownFixIds,
      unknownProblemCodes: [],
    };
  }

  if (options.problemCodes && options.problemCodes.length > 0) {
    const problemSet = new Set(options.problemCodes);
    const suggestions = report.fixSuggestions.filter((entry) =>
      problemSet.has(entry.problemCode)
    );
    const unknownProblemCodes = options.problemCodes.filter(
      (problemCode) =>
        !report.detectedProblems.some((entry) => entry.problemCode === problemCode)
    );
    return {
      suggestions,
      unknownFixIds: [],
      unknownProblemCodes,
    };
  }

  const recommendedFixIds = new Set(report.repairReadiness.recommendedFixIds);
  return {
    suggestions: report.fixSuggestions.filter((entry) =>
      recommendedFixIds.has(entry.fixId)
    ),
    unknownFixIds: [],
    unknownProblemCodes: [],
  };
}

function buildRecheckSummary(
  before: DoctorReport,
  after: DoctorReport
): DoctorRecheckSummary {
  const beforeCodes = new Set(before.detectedProblems.map((item) => item.problemCode));
  const afterCodes = new Set(after.detectedProblems.map((item) => item.problemCode));
  const resolvedProblemCodes = Array.from(beforeCodes).filter(
    (code) => !afterCodes.has(code)
  ) as DoctorProblem['problemCode'][];
  const remainingProblemCodes = Array.from(afterCodes) as DoctorProblem['problemCode'][];
  const newProblemCodes = Array.from(afterCodes).filter(
    (code) => !beforeCodes.has(code)
  ) as DoctorProblem['problemCode'][];

  return {
    resolvedProblemCodes,
    remainingProblemCodes,
    newProblemCodes,
    stillBlocking: after.detectedProblems.some((item) => item.blocking),
    readyForBuild: after.readyForBuild,
    readyForUpload: after.readyForUpload,
    readyForMonitor: after.readyForMonitor,
  };
}

async function applyFixSuggestion(
  suggestion: DoctorFixSuggestion,
  options: RepairEnvironmentOptions,
  runCommand: RepairCommandRunner
): Promise<'applied' | 'skipped'> {
  if (suggestion.fixId === 'set_platformio_cli_env_hint') {
    if (options.allowShellProfileHints === false) {
      return 'skipped';
    }
    const recommended = getRecommendedPlatformIOCliPath();
    if (recommended) {
      process.env.PLATFORMIO_CLI_PATH = recommended;
      return 'applied';
    }
    return 'skipped';
  }

  if (suggestion.fixId === 'activate_local_platformio_cli') {
    if (options.allowShellProfileHints === false) {
      return 'skipped';
    }
    const recommended = getRecommendedPlatformIOCliPath();
    if (recommended) {
      process.env.PLATFORMIO_CLI_PATH = recommended;
      await persistPlatformIOCliPath(recommended, runCommand);
      return 'applied';
    }
    return 'skipped';
  }

  if (suggestion.fixId === 'install_host_cpp_compiler_via_winget') {
    if (!options.allowInstall) {
      return 'skipped';
    }
    const [command, ...args] = tokenizeCommand(suggestion.commands[0] ?? '');
    if (!command) {
      return 'skipped';
    }
    await runCommand(command, args);
    return 'applied';
  }

  return 'skipped';
}

export async function repairEnvironment(
  options: RepairEnvironmentOptions = {},
  runCommand: RepairCommandRunner = defaultRepairCommandRunner
): Promise<RepairEnvironmentResult> {
  const initialReport = await doctor({ projectDir: options.projectDir });
  const {
    suggestions: targetedFixes,
    unknownFixIds,
    unknownProblemCodes,
  } = filterFixSuggestions(initialReport, options);

  const attemptedFixes = targetedFixes.map((entry) => ({ fixId: entry.fixId }));
  const appliedFixes: Array<{ fixId: string }> = [];
  const skippedFixes: Array<{ fixId: string; reason: string }> = [];
  const failedFixes: Array<{ fixId: string; reason: string }> = [
    ...unknownFixIds.map((fixId) => ({ fixId, reason: 'unknown_fix_id' })),
    ...unknownProblemCodes.map((problemCode) => ({
      fixId: problemCode,
      reason: 'unknown_problem_code',
    })),
  ];

  if (!options.dryRun && failedFixes.length === 0) {
    for (const suggestion of targetedFixes) {
      if (suggestion.fixKind === 'package_install' && !options.allowInstall) {
        skippedFixes.push({
          fixId: suggestion.fixId,
          reason: 'install_not_allowed',
        });
        continue;
      }

      try {
        const outcome = await applyFixSuggestion(suggestion, options, runCommand);
        if (outcome === 'applied') {
          appliedFixes.push({ fixId: suggestion.fixId });
        } else {
          if (
            suggestion.fixKind !== 'manual_guidance' &&
            suggestion.fixKind !== 'recheck'
          ) {
            skippedFixes.push({
              fixId: suggestion.fixId,
              reason: 'not_applicable',
            });
          }
        }
      } catch (error) {
        failedFixes.push({
          fixId: suggestion.fixId,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const postRepairDoctor = await doctor({ projectDir: options.projectDir });
  const recheckSummary = buildRecheckSummary(initialReport, postRepairDoctor);
  return {
    repairStatus: options.dryRun
      ? 'dry_run'
      : failedFixes.length > 0
        ? 'failed'
        : appliedFixes.length === 0 && attemptedFixes.length > 0
          ? 'partial'
          : recheckSummary.stillBlocking || skippedFixes.length > 0
          ? 'partial'
          : 'applied',
    attemptedFixes,
    appliedFixes,
    skippedFixes,
    failedFixes,
    recheckSummary,
    postRepairDoctor,
  };
}
