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
  // Detect platform and architecture
  const platform = process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const ext = platform === 'darwin' ? 'dylib' : 'so';
  
  const libDir = resolve(__dirname, 'lib');
  
  // Try platform-specific library first (highest priority)
  const specificLib = resolve(libDir, `libsqlite3-${platform}-${arch}.${ext}`);
  if (existsSync(specificLib)) {
    return specificLib;
  }
  
  // If we have a build-time path and it exists, use it as fallback
  if (SQLITE_LIB_PATH && existsSync(SQLITE_LIB_PATH)) {
    return SQLITE_LIB_PATH;
  }
  
  // Fallback to generic libraries (for development/backwards compatibility)
  const fallbackCandidates = [
    resolve(libDir, `libsqlite3.${ext}`),        // Generic for platform
    resolve(libDir, 'libsqlite3.dylib'),         // macOS generic
    resolve(libDir, 'libsqlite3.so'),            // Linux generic
    resolve(libDir, 'libsqlite3.0.dylib'),       // macOS versioned
  ];
  
  for (const candidate of fallbackCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  
  // Helpful error message
  const expectedLib = `libsqlite3-${platform}-${arch}.${ext}`;
  throw new Error(
    `SQLite library not found for ${platform}/${arch}. ` +
    `Expected: ${expectedLib}. ` +
    `Run 'npm run bundle-lib' to build platform-specific libraries.`
  );
}

/**
 * Hip alias for getLibraryPath() - for use with Database.setCustomSQLite()
 * @returns {string} Absolute path to libsqlite3.dylib/.so
 */
export const pathToSQLite = getLibraryPath();

export default getLibraryPath;