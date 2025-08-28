import { getSQLiteLibPath } from './build-macros.ts' with { type: 'macro' };
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get the library path at build time using macro
const SQLITE_LIB_PATH = getSQLiteLibPath();

/**
 * Get the absolute path to the bundled libsqlite3 shared library
 * @returns {string} Absolute path to libsqlite3.dylib/.so
 */
export function getLibraryPath() {
  // If we have a build-time path and it exists, use it
  if (SQLITE_LIB_PATH && existsSync(SQLITE_LIB_PATH)) {
    return SQLITE_LIB_PATH;
  }
  
  // Fallback to bundled library search
  const libDir = resolve(__dirname, 'lib');
  const candidates = [
    resolve(libDir, 'libsqlite3.dylib'),      // macOS
    resolve(libDir, 'libsqlite3.so'),         // Linux
    resolve(libDir, 'libsqlite3.0.dylib'),    // macOS versioned
  ];
  
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  
  throw new Error('SQLite library not found');
}

export default getLibraryPath;