import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateLineLimit,
  isExcludedFile,
  parseNumstat,
  scanArchitecture,
  validateBranch,
  validateCommits,
  validatePrBody,
} from '../../scripts/pr-gates.mjs';

const body = [
  '## User story',
  'HU-IAM-001, code-corhuila/dlc-docs#47',
  '## What changed and why',
  'x',
  '## How it was tested',
  'x',
  '## Evidence',
  'x',
  '## Known limitations',
  'x',
].join('\n');

test('norm 9.2: tests, lockfiles and generated output are excluded', () => {
  assert.equal(isExcludedFile('tests/core/a.test.mjs'), 'test file');
  assert.equal(isExcludedFile('package-lock.json'), 'lockfile');
  assert.equal(isExcludedFile('dist/main.js'), 'generated output');
  assert.equal(isExcludedFile('src/core/http/requestTarget.ts'), null);
});

test('norm 9.2: counts computable lines and fails above the limit', () => {
  const entries = parseNumstat('300\t50\tsrc/a.ts\n90\t0\ttests/a.test.mjs\n-\t-\tlogo.png\n');
  const ok = evaluateLineLimit(entries);
  assert.equal(ok.total, 350);
  assert.equal(ok.ok, true);
  assert.equal(ok.binary, 1);
  assert.equal(evaluateLineLimit(parseNumstat('401\t0\tsrc/a.ts')).ok, false);
});

test('norm 6.3: branch prefixes must match their permanent target', () => {
  assert.deepEqual(validateBranch('feat/shell-frame', 'develop'), []);
  const codes = (head, base) => validateBranch(head, base).map((f) => f.code);
  assert.deepEqual(codes('develop', 'qa'), ['BRANCH_PERMANENT_HEAD', 'BRANCH_NO_PREFIX']);
  assert.deepEqual(codes('style/x', 'develop'), ['BRANCH_UNKNOWN_PREFIX']);
  assert.deepEqual(codes('feat/x', 'main'), ['BRANCH_WRONG_TARGET']);
});

test('norm 8 / 15.2: commit subjects follow conventional commits', () => {
  assert.deepEqual(validateCommits(['chore(ci): add gates']), []);
  assert.equal(validateCommits(['WIP', 'feat: Fix.']).length, 2);
});

test('norm 9.1: the PR body has the five sections and a story reference', () => {
  assert.deepEqual(validatePrBody(body), []);
  const missing = validatePrBody(body.replace('## Evidence', '## Other'));
  assert.equal(missing[0].code, 'PR_SECTION_MISSING');
  const untraced = validatePrBody(body.replace('HU-IAM-001, code-corhuila/dlc-docs#47', 'none'));
  assert.equal(untraced[0].code, 'PR_TRACEABILITY_MISSING');
});

test('ADR-011: the compositor imports no framework or federation runtime', () => {
  const files = [
    { path: 'core/a.ts', content: "import { createRoot } from 'react-dom/client';" },
    { path: 'core/b.ts', content: "import '@angular/core';" },
    { path: 'core/c.ts', content: "import x from '@module-federation/vite';" },
    { path: 'core/d.ts', content: "import { validateRequestTarget } from './requestTarget.ts';" },
  ];
  assert.deepEqual(
    scanArchitecture(files).map((f) => f.path),
    ['core/a.ts', 'core/b.ts', 'core/c.ts'],
  );
});
