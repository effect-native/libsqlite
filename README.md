# libsqlite3-pure-nix

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

## Programmatic example (Node)

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
  nix build github:<you>/libsqlite3-pure-nix#libsqlite3
  ```

- Get the path (great for wiring into scripts/CI):
  ```sh
  nix run github:<you>/libsqlite3-pure-nix#print-path
  ```

## Gotchas
- If your host app is hardened on macOS, still ensure entitlements/signing allow loading external dylibs. (This is OS-level, not solved by which SQLite you ship.)
- `@vlcn.io/crsqlite` will load fine as long as the host enables extension loading at runtime.