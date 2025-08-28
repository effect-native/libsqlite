#!/usr/bin/env -S npx tsx

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getLibraryPath() {
  // Detect platform and architecture
  const platform = process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const ext = platform === 'darwin' ? 'dylib' : 'so';
  
  const libDir = resolve(__dirname, '..', 'lib');
  
  // Try platform-specific library first
  const specificLib = resolve(libDir, `libsqlite3-${platform}-${arch}.${ext}`);
  if (existsSync(specificLib)) {
    return specificLib;
  }
  
  // Fallback to generic libraries
  const fallbackCandidates = [
    resolve(libDir, `libsqlite3.${ext}`),
    resolve(libDir, 'libsqlite3.dylib'),
    resolve(libDir, 'libsqlite3.so'),
  ];
  
  for (const candidate of fallbackCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  
  throw new Error(`SQLite library not found for ${platform}/${arch}`);
}

// Run when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(getLibraryPath())
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}