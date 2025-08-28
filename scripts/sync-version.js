#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

/**
 * Get SQLite version from Nix
 */
function getSQLiteVersion() {
  try {
    // Use our print-version app
    const result = execFileSync('nix', ['run', '.#print-version'], { 
      encoding: 'utf8',
      cwd: projectRoot 
    });
    return result.trim();
  } catch (error) {
    console.error('Failed to get SQLite version from Nix:', error.message);
    process.exit(1);
  }
}

/**
 * Update package.json version
 */
function updatePackageVersion(sqliteVersion) {
  const packageJsonPath = resolve(projectRoot, 'package.json');
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    // Keep any pre-release suffix from current version
    const currentVersion = packageJson.version;
    const preReleaseSuffix = currentVersion.includes('-') 
      ? '-' + currentVersion.split('-').slice(1).join('-')
      : '';
    
    const newVersion = sqliteVersion + preReleaseSuffix;
    
    if (packageJson.version === newVersion) {
      console.log(`✅ Version already up-to-date: ${newVersion}`);
      return false;
    }
    
    console.log(`📦 Updating version: ${packageJson.version} → ${newVersion}`);
    packageJson.version = newVersion;
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    return true;
  } catch (error) {
    console.error('Failed to update package.json:', error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Syncing package version with SQLite version...');
  
  const sqliteVersion = getSQLiteVersion();
  console.log(`📋 SQLite version from Nix: ${sqliteVersion}`);
  
  const wasUpdated = updatePackageVersion(sqliteVersion);
  
  if (wasUpdated) {
    console.log('✨ Package version synced successfully!');
    console.log('💡 Don\'t forget to commit the changes.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}