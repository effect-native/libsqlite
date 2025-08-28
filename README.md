# @effect-native/libsqlite

**Universal SQLite library that Just Works™ everywhere.** 

Bundles fresh `libsqlite3` binaries for all platforms from nixpkgs-unstable. Automatically detects your environment and uses the right library. Perfect when system SQLite can't load extensions.

🚀 **Supports:** macOS (Intel + Apple Silicon), Linux (x86_64 + ARM64), Docker, Vercel, AWS Lambda, Raspberry Pi

## Build

```sh
nix build .#libsqlite3
ls -l result/lib/
```

## Get the absolute path (for Database.setCustomSQLite)

```sh
nix run .#print-path
# -> /nix/store/.../lib/libsqlite3.dylib  (or .so)
```

## npm Usage

```bash
npm install @effect-native/libsqlite
```

```js
// Hip API - for use with Database.setCustomSQLite()
import { pathToSQLite } from '@effect-native/libsqlite'
Database.setCustomSQLite(pathToSQLite)  // Just Works™ on any platform

// Default export - same thing
import libPath from '@effect-native/libsqlite'
Database.setCustomSQLite(libPath)  // Also Just Works™
```

### ✨ What makes it special:
- **Zero configuration** - Works on Mac, Linux, Pi, Docker without any setup
- **Insanely fast** - Pre-built binaries, no compilation needed  
- **Tiny API** - Just import and use, platform detection is automatic
- **Extension ready** - Built with extension loading enabled (unlike system SQLite)
- **React Native aware** - Dedicated exports with helpful error messages

### 📱 React Native Support

React Native automatically gets a dedicated entry point with helpful error messages:

```js
// In React Native, this import automatically resolves to react-native.js
import { pathToSQLite } from '@effect-native/libsqlite'
// ❌ Throws: "Use expo-sqlite or react-native-sqlite-storage instead"
```

The package uses conditional exports so React Native bundlers automatically get the RN-specific version with helpful guidance to use proper React Native SQLite libraries.

## Direct Nix Usage

```js
import { execFileSync } from 'node:child_process'
const lib = execFileSync('nix', ['run', '.#print-path'], { encoding: 'utf8' }).trim()
// Database.setCustomSQLite(lib)
```

## Notes
- Extension loading is implemented in SQLite but off at runtime; your app must enable it (e.g., via `sqlite3_db_config(..., SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION, 1, NULL)`), or your driver must call the equivalent.
- macOS's built-in SQLite is compiled without `.load` support—use this lib instead.

## Usage

- Build just the lib:
  ```sh
  nix build github:effect-native/libsqlite#libsqlite3
  ```

- Get the path (great for wiring into scripts/CI):
  ```sh
  nix run github:effect-native/libsqlite#print-path
  ```

## Package Details

- **Size:** ~7MB (includes binaries for all platforms)
- **Platforms:** macOS (Intel + Apple Silicon), Linux (x86_64 + ARM64)  
- **Dependencies:** Zero runtime dependencies
- **Version:** Automatically syncs with latest stable SQLite from nixpkgs

```bash
npm run sync-version  # Updates package.json to match SQLite version
nix run .#print-version  # Shows current SQLite version
```

## Gotchas
- If your host app is hardened on macOS, still ensure entitlements/signing allow loading external dylibs. (This is OS-level, not solved by which SQLite you ship.)
- `@vlcn.io/crsqlite` will load fine as long as the host enables extension loading at runtime.