# @effect-native/libsqlite

Builds a fresh `libsqlite3` (`.dylib` on macOS, `.so` on Linux) from nixpkgs-unstable.
Useful when system SQLite can't load extensions.

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
import { getLibraryPath } from '@effect-native/libsqlite'
const lib = getLibraryPath()
// Database.setCustomSQLite(lib)
```

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

## Automatic Versioning

The package version automatically syncs with the SQLite version from nixpkgs-unstable:

```bash
npm run sync-version  # Updates package.json to match SQLite version
nix run .#print-version  # Shows current SQLite version
```

Pre-release suffixes are preserved (e.g., `3.50.2-beta.1` stays as `3.50.2-beta.1`).

## Gotchas
- If your host app is hardened on macOS, still ensure entitlements/signing allow loading external dylibs. (This is OS-level, not solved by which SQLite you ship.)
- `@vlcn.io/crsqlite` will load fine as long as the host enables extension loading at runtime.