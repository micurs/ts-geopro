import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = process.argv[2];
const demoName = process.argv[3];
const extraArgs = process.argv.slice(4);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoDir = demoName ? path.join(rootDir, 'demos', demoName) : '';
const packageJsonPath = path.join(demoDir, 'package.json');

const usage = `Usage: pnpm ${script === 'start' ? 'start:demo' : 'dev:demo'} <demo-name>`;

if (!['dev', 'start'].includes(script)) {
  console.error('Expected "dev" or "start" as the demo command.');
  process.exit(1);
}

if (!demoName) {
  console.error(usage);
  process.exit(1);
}

if (!existsSync(packageJsonPath)) {
  console.error(`Demo "${demoName}" was not found under demos/.`);
  process.exit(1);
}

const demoPackage = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

if (!demoPackage.scripts?.[script]) {
  console.error(`Demo "${demoName}" does not define a "${script}" script.`);
  process.exit(1);
}

if (script === 'start' && demoPackage.scripts?.build) {
  const build = spawnSync('pnpm', ['--dir', demoDir, 'run', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

const child = spawnSync('pnpm', ['--dir', demoDir, 'run', script, ...extraArgs], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(child.status ?? 1);
