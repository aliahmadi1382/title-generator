import { readFileSync, writeFileSync } from 'node:fs';

const run = Number(process.env.GITHUB_RUN_NUMBER);
if (!Number.isSafeInteger(run) || run < 1) throw new Error('A GitHub Actions run number is required');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
if (![major, minor, patch].every(Number.isSafeInteger)) throw new Error('Use a stable numeric base version');
const version = `${major}.${minor}.${patch + run}`;
pkg.version = version;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
lock.version = version;
lock.packages[''].version = version;
writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
console.log(`Desktop release ${version}`);
