import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Bun macro to get the SQLite library path at build time
export function getSQLiteLibPath() {
  // Get directory - works in both Bun (import.meta.dir) and Node.js
  const currentDir = typeof import.meta.dir !== 'undefined' 
    ? import.meta.dir 
    : dirname(fileURLToPath(import.meta.url));
    
  // Check if we already have a bundled library
  const libDir = resolve(currentDir, 'lib');
  
  // Try platform-specific library names
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
  
  // If no bundled lib, try to get it from Nix (dev environment)
  try {
    const result = execSync('nix run .#print-path', { 
      encoding: 'utf8',
      cwd: currentDir
    });
    return result.trim();
  } catch (error) {
    throw new Error('SQLite library not found. Run `bun run bundle-lib` first.');
  }
}