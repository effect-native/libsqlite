{
  description = "Pure-Nix libsqlite3 (.dylib/.so) for extension loading";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        sqlite = pkgs.sqlite;

        # Package: exposes only the shared library files
        libOnly = pkgs.stdenv.mkDerivation {
          pname = "libsqlite3";
          version = sqlite.version;
          src = pkgs.writeText "dummy" "";
          dontConfigure = true;
          dontBuild = true;
          dontUnpack = true;
          installPhase = ''
            mkdir -p $out/lib
            # copy shared libs (dylib on darwin, so* on linux), keep symlinks
            cp -a ${sqlite.out}/lib/libsqlite3*.dylib $out/lib/ 2>/dev/null || true
            cp -a ${sqlite.out}/lib/libsqlite3*.so*   $out/lib/ 2>/dev/null || true
          '';
          meta = with pkgs.lib; {
            description = "Shared libsqlite3 from nixpkgs for ${system}";
            platforms = [ system ];
            license = licenses.publicDomain;
          };
        };

        # App: prints canonical path to the shared library
        printPath = pkgs.writeShellApplication {
          name = "sqlite-lib-path";
          text = ''
            set -euo pipefail
            dir='${libOnly}/lib'
            candidate=$(find "$dir" -name "libsqlite3*.dylib" -o -name "libsqlite3*.so*" 2>/dev/null | head -n1)
            [ -n "''${candidate:-}" ] || { echo "libsqlite3 not found" >&2; exit 1; }
            echo "$candidate"
          '';
        };

        # App: prints the SQLite version
        printVersion = pkgs.writeShellApplication {
          name = "sqlite-version";
          text = ''
            echo "${sqlite.version}"
          '';
        };

        # App: builds libraries for current platform with correct naming
        buildAllPlatforms = pkgs.writeShellApplication {
          name = "build-all-platforms";
          text = ''
            set -euo pipefail
            echo "🔨 Building SQLite library for current platform..."
            
            # Build for current platform
            nix build .#libsqlite3
            
            mkdir -p lib
            
            # Determine current platform and architecture
            current_system="${system}"
            case "$current_system" in
              x86_64-linux)
                platform="linux"
                arch="x86_64"
                ext="so"
                ;;
              aarch64-linux) 
                platform="linux"
                arch="aarch64"
                ext="so"
                ;;
              x86_64-darwin)
                platform="darwin"
                arch="x86_64" 
                ext="dylib"
                ;;
              aarch64-darwin)
                platform="darwin"
                arch="aarch64"
                ext="dylib"
                ;;
              *)
                echo "⚠️  Unsupported platform: $current_system"
                exit 1
                ;;
            esac
            
            # Copy with platform-specific naming
            echo "📦 Copying library for $platform-$arch..."
            case "$ext" in
              so)
                # Find and copy the .so file (follow symlinks)
                so_file=$(find result/lib -name "libsqlite3.so*" -type f | head -n1)
                if [ -n "$so_file" ]; then
                  cp -v "$so_file" "lib/libsqlite3-$platform-$arch.so"
                  cp -v "$so_file" "lib/libsqlite3.so"  # fallback
                fi
                ;;
              dylib)
                # Find and copy the actual .dylib file (follow symlinks) 
                dylib_file=$(find result/lib -name "libsqlite3*.dylib" -type f | head -n1)
                if [ -n "$dylib_file" ]; then
                  cp -v "$dylib_file" "lib/libsqlite3-$platform-$arch.dylib"
                  cp -v "$dylib_file" "lib/libsqlite3.dylib"  # fallback
                fi
                ;;
            esac
            
            echo "✅ Build complete for $current_system:"
            ls -la lib/
          '';
        };

        # CI check: ensure NOT compiled with OMIT_LOAD_EXTENSION
        checkExt = pkgs.runCommand "check-sqlite-ext" { } ''
          ${sqlite}/bin/sqlite3 :memory: \
            'select 1 where not exists (
               select 1 from pragma_compile_options()
               where compile_options like "%OMIT_LOAD_EXTENSION%"
             );' >/dev/null
          touch $out
        '';
      in {
        packages.libsqlite3 = libOnly;
        apps."print-path" = { type = "app"; program = "${printPath}/bin/sqlite-lib-path"; };
        apps."print-version" = { type = "app"; program = "${printVersion}/bin/sqlite-version"; };
        apps."build-all-platforms" = { type = "app"; program = "${buildAllPlatforms}/bin/build-all-platforms"; };
        checks.loadableExtensions = checkExt;
        devShells.default = pkgs.mkShell { packages = [ sqlite ]; };
      });
}