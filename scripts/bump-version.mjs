#!/usr/bin/env node
/**
 * Planalto Plus — Automatic Version Bumper
 * Synchronizes version across package.json, public/manifest.json, public/manifest.firefox.json, and root manifest.json
 */
import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function incrementPatch(versionStr) {
  const parts = String(versionStr || '1.0.0').split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '1.0.13';
  }
  parts[2] += 1;
  return parts.join('.');
}

const pkgPath = resolve(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const customVersion = process.argv[2];
const nextVersion = customVersion && /^\d+\.\d+\.\d+$/.test(customVersion)
  ? customVersion
  : incrementPatch(pkg.version);

pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

const manifestPaths = [
  resolve(rootDir, 'public/manifest.json'),
  resolve(rootDir, 'public/manifest.firefox.json'),
  resolve(rootDir, 'manifest.json'),
];

for (const mPath of manifestPaths) {
  if (fs.existsSync(mPath)) {
    const manifest = JSON.parse(fs.readFileSync(mPath, 'utf-8'));
    manifest.version = nextVersion;
    fs.writeFileSync(mPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  }
}

console.log(`✓ Version incremented to v${nextVersion} across package.json and manifests.`);
