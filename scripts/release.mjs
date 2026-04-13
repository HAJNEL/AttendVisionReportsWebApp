#!/usr/bin/env node
/**
 * Release script — run via: npm run release
 *
 * What it does:
 *  1. Reads the version from package.json  →  tag = "v<version>"
 *  2. Stages all changes and commits
 *  3. Pushes the commit to origin
 *  4. Deletes the old tag (local + remote) if it already exists
 *  5. Creates a fresh local tag and pushes it to origin
 *     → This triggers the GitHub Actions release workflow
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));
const tag = `v${pkg.version}`;

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', ...opts });
  } catch (err) {
    if (opts.ignoreError) {
      console.warn(`  (ignored error)`);
    } else {
      process.exit(1);
    }
  }
}

console.log(`\nReleasing ${pkg.name} @ ${tag}\n${'─'.repeat(40)}`);

// 1. Stage & commit (skip if nothing to commit)
run('git add -A');
try {
  execSync(`git diff --cached --quiet`, { stdio: 'ignore' });
  console.log('\n> Nothing staged — skipping commit.');
} catch {
  run(`git commit -m "chore: release ${tag}"`);
}

// 2. Push commits
run('git push');

// 3. Remove old tag if it exists (local and remote — errors are safe to ignore)
run(`git tag -d ${tag}`,                     { ignoreError: true });
run(`git push origin :refs/tags/${tag}`,     { ignoreError: true });

// 4. Create and push the new tag
run(`git tag ${tag}`);
run(`git push origin ${tag}`);

console.log(`\n✓ Tag ${tag} pushed — GitHub Actions release workflow triggered.\n`);
