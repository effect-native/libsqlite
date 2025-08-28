import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the absolute path to the libsqlite3 shared library
 * @returns {string} Absolute path to libsqlite3.dylib/.so
 */
export function getLibraryPath() {
  try {
    const result = execFileSync('nix', ['run', `${__dirname}#print-path`], { 
      encoding: 'utf8',
      cwd: __dirname 
    });
    return result.trim();
  } catch (error) {
    throw new Error(`Failed to get libsqlite3 path: ${error.message}`);
  }
}

/**
 * Alias for getLibraryPath() to match @vlcn.io/crsqlite API style
 */
export const libraryPath = getLibraryPath();

/**
 * Default export for convenience
 */
export default {
  getLibraryPath,
  libraryPath
};