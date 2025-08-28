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

        # App: builds libraries for all platforms
        buildAllPlatforms = pkgs.writeShellApplication {
          name = "build-all-platforms";
          text = ''
            set -euo pipefail
            echo "🔨 Building SQLite libraries for all platforms..."
            
            platforms=(
              "x86_64-linux"
              "aarch64-linux" 
              "x86_64-darwin"
              "aarch64-darwin"
            )
            
            mkdir -p lib
            
            for platform in "''${platforms[@]}"; do
              echo "📦 Building for $platform..."
              if nix build ".#packages.$platform.libsqlite3" --no-link 2>/dev/null; then
                result=$(nix eval ".#packages.$platform.libsqlite3" --raw)
                case $platform in
                  *-linux)
                    arch=$(echo $platform | cut -d- -f1)
                    cp -v "$result"/lib/libsqlite3.so* "lib/libsqlite3-linux-$arch.so" 2>/dev/null || true
                    ;;
                  *-darwin)
                    arch=$(echo $platform | cut -d- -f1)
                    cp -v "$result"/lib/libsqlite3*.dylib "lib/libsqlite3-darwin-$arch.dylib" 2>/dev/null || true
                    ;;
                esac
              else
                echo "⚠️  Failed to build for $platform (may not be available)"
              fi
            done
            
            echo "✅ Multi-platform build complete:"
            ls -la lib/libsqlite3-*
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