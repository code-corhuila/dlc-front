#!/usr/bin/env node
/**
 * PR quality gates for dlc-front, adapted from dlc-clinical-portal: norm 9.2
 * (400 computable lines), 6.3 (branch prefixes), 8.1/15.2 (commit subject),
 * 9.1 (traceability) and ADR-011 (compositor without framework runtime).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LINE_LIMIT = 400;
export const PERMANENT_BRANCHES = ['develop', 'qa', 'main'];
export const CHILD_PREFIXES = {
  develop: ['feat/', 'fix/', 'chore/'],
  // `qa/*` cannot coexist with refs/heads/qa in Git; `promotion/*` is the
  // controlled feeder exception agreed for qa (recorded in the evidence).
  qa: ['qa/', 'promotion/'],
  main: ['release/', 'hotfix/'],
};
export const COMMIT_SUBJECT =
  /^(feat|fix|docs|style|refactor|test|chore|perf)(\([a-z0-9.-]+\))?: [a-z]/;
export const SECTIONS = [
  'User story',
  'What changed and why',
  'How it was tested',
  'Evidence',
  'Known limitations',
];
export const TRACE_PATTERN =
  /(HU-[A-Z0-9]+-\d+|#[0-9]+|https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(issues|pull)\/\d+)/;

const PARENT_OF = Object.fromEntries(
  Object.entries(CHILD_PREFIXES).flatMap(([branch, prefixes]) =>
    prefixes.map((prefix) => [prefix, branch]),
  ),
);
const EXCLUDED = [
  [/(^|\/)(tests?|__tests__)\//, 'test file'],
  [/\.(test|spec)\.[cm]?[jt]sx?$/, 'test file'],
  [/(^|\/)(dist|coverage|__generated__)\//, 'generated output'],
  [/\.(snap|tsbuildinfo)$/, 'generated artefact'],
  [/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/, 'lockfile'],
];
// ADR-011: no framework or federation runtime is assigned to the compositor.
const FRAMEWORK_IMPORT =
  /(from\s+|import\s*\(?\s*)['"](react|react-dom|@angular\/[^'"]+|vue|next|@module-federation\/[^'"]+|@angular-architects\/native-federation)(\/[^'"]*)?['"]/;

/** Returns the exclusion reason for a path, or null when the file counts. */
export function isExcludedFile(path) {
  const rule = EXCLUDED.find(([re]) => re.test(path));
  return rule ? rule[1] : null;
}

export function parseNumstat(output) {
  return output
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [added, deleted, ...rest] = line.split('\t');
      return {
        added: added === '-' ? null : Number(added),
        deleted: deleted === '-' ? null : Number(deleted),
        path: rest.join(' '),
      };
    });
}

/** Norm 9.2: insertions + deletions of the PR diff, minus excluded files. */
export function evaluateLineLimit(entries, limit = LINE_LIMIT) {
  const excluded = [];
  let total = 0;
  let binary = 0;
  for (const { path: raw, added, deleted } of entries) {
    const path = raw.includes(' => ') ? raw.split(' => ').pop() : raw;
    if (added === null || deleted === null) binary += 1;
    const lines = added === null || deleted === null ? 0 : added + deleted;
    const reason = isExcludedFile(path);
    if (reason) excluded.push({ path, lines, reason });
    else total += lines;
  }
  return { limit, total, ok: total <= limit, excluded, binary };
}

/** Norm 6.2.2 and 6.3: child prefix and the permanent branch it targets. */
export function validateBranch(head, base) {
  const findings = [];
  const add = (code, message) =>
    findings.push({ level: 'error', code, message });
  const slash = head.indexOf('/');
  const prefix = slash > 0 ? head.slice(0, slash + 1) : null;
  if (PERMANENT_BRANCHES.includes(head))
    add('BRANCH_PERMANENT_HEAD', `${head} is permanent (6.2.2)`);
  if (!prefix) add('BRANCH_NO_PREFIX', `${head} has no prefix (6.3.1)`);
  else if (!PARENT_OF[prefix])
    add('BRANCH_UNKNOWN_PREFIX', `${prefix} not admitted (6.3.3)`);
  else if (base !== PARENT_OF[prefix])
    add('BRANCH_WRONG_TARGET', `${prefix} targets ${PARENT_OF[prefix]}`);
  return findings;
}

export function validateCommits(subjects) {
  return subjects
    .filter((subject) => !COMMIT_SUBJECT.test(subject))
    .map((subject) => ({ level: 'error', code: 'COMMIT_SUBJECT', subject }));
}

function sectionContent(body, label) {
  const match = new RegExp(`^##\\s+${label}\\s*$`, 'm').exec(body);
  if (!match) return null;
  const rest = body.slice(match.index + match[0].length);
  const next = rest.search(/^##\s/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

/** Norm 9.1 plus the repository PR sections. */
export function validatePrBody(body = '') {
  const findings = [];
  const add = (code, message) =>
    findings.push({ level: 'error', code, message });
  for (const label of SECTIONS) {
    const content = sectionContent(body, label);
    if (content === null) add('PR_SECTION_MISSING', `missing ${label}`);
    else if (content === '') add('PR_SECTION_EMPTY', `${label} unfilled`);
  }
  const story = sectionContent(body, SECTIONS[0]) ?? '';
  if (story !== '' && !TRACE_PATTERN.test(story))
    add('PR_TRACEABILITY_MISSING', 'no HU or Issue in User story');
  return findings;
}

export function scanArchitecture(files) {
  return files
    .filter((file) => !isExcludedFile(file.path))
    .filter((file) => FRAMEWORK_IMPORT.test(file.content))
    .map((file) => ({
      level: 'error',
      code: 'ARCH_FRAMEWORK_RUNTIME',
      path: file.path,
      message: 'ADR-011: compositor has no technology of its own',
    }));
}

const git = (args) => execFileSync('git', args, { encoding: 'utf8' });

function sources(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sources(path, out);
    else if (/\.(ts|mts|js|mjs)$/.test(entry.name)) out.push(path);
  }
  return out;
}

function readBody(opts) {
  if (opts.body) return readFileSync(opts.body, 'utf8');
  if (process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'),
    );
    return event.pull_request?.body ?? '';
  }
  return null;
}

function report(name, findings) {
  for (const f of findings) {
    const where = `${name}${f.path ? ' ' + f.path : ''}`;
    console.log(`[${f.level}] ${where}: ${f.code} — ${f.message ?? f.subject}`);
  }
  const failed = findings.length > 0;
  console.log(`${name}: ${failed ? 'FAIL' : 'PASS'} (${findings.length})`);
  return failed ? 1 : 0;
}

function arg(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

const commands = {
  lines: (o) => {
    const range = o.head === 'WORKTREE' ? o.base : `${o.base}...${o.head}`;
    const result = evaluateLineLimit(
      parseNumstat(git(['diff', '--numstat', range])),
    );
    for (const e of result.excluded)
      console.log(`[info] excluded ${e.path} (${e.reason}): ${e.lines}`);
    console.log(
      `lines: ${result.total}/${result.limit} ${result.ok ? 'PASS' : 'FAIL'}`,
    );
    return result.ok ? 0 : 1;
  },
  branch: (o) => report('branch', validateBranch(o.head, o.base)),
  commits: (o) =>
    report(
      'commits',
      validateCommits(
        git(['log', '--no-merges', '--format=%s', `${o.base}..${o.head}`])
          .split('\n')
          .filter((line) => line.trim() !== ''),
      ),
    ),
  pr: (o) => {
    const body = readBody(o);
    if (body === null) {
      console.log('pr: PENDING — no pull request body (use --body <file>)');
      return 1;
    }
    return report('pr', validatePrBody(body));
  },
  arch: () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
    const files = sources(root).map((path) => ({
      path: path.replace(/\\/g, '/').split('/src/').pop(),
      content: readFileSync(path, 'utf8'),
    }));
    return report('arch', scanArchitecture(files));
  },
};

function main(argv) {
  const [command, ...rest] = argv;
  if (!commands[command]) {
    console.log(
      'usage: node scripts/pr-gates.mjs <lines|branch|commits|pr|arch> [--base ref] [--head ref] [--body file]',
    );
    return command ? 1 : 0;
  }
  return commands[command]({
    base: arg(rest, '--base') ?? 'origin/develop',
    head: arg(rest, '--head') ?? 'HEAD',
    body: arg(rest, '--body'),
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  process.exitCode = main(process.argv.slice(2));
