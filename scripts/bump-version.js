#!/usr/bin/env node
// Bumps the user-facing app version stored in version.json.
// EAS only auto-increments the build number, so this keeps `version`
// moving on every UAT/Store build.
//
// Usage:
//   node scripts/bump-version.js            -> patch bump (1.0.0 -> 1.0.1)
//   node scripts/bump-version.js minor      -> 1.0.1 -> 1.1.0
//   node scripts/bump-version.js major      -> 1.1.0 -> 2.0.0
//   node scripts/bump-version.js 2.0.0      -> set an explicit version
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'version.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const arg = process.argv[2] || 'patch';

const SEMVER = /^\d+\.\d+\.\d+$/;
if (!SEMVER.test(data.version)) {
  console.error(`version.json has an invalid version: "${data.version}"`);
  process.exit(1);
}

let next;
if (SEMVER.test(arg)) {
  next = arg;
} else {
  const [major, minor, patch] = data.version.split('.').map(Number);
  if (arg === 'major') next = `${major + 1}.0.0`;
  else if (arg === 'minor') next = `${major}.${minor + 1}.0`;
  else if (arg === 'patch') next = `${major}.${minor}.${patch + 1}`;
  else {
    console.error(`Unknown argument "${arg}". Use patch, minor, major, or x.y.z`);
    process.exit(1);
  }
}

fs.writeFileSync(file, JSON.stringify({ ...data, version: next }, null, 2) + '\n');
console.log(`Version: ${data.version} -> ${next}`);