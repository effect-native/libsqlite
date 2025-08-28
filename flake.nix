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
            candidate=$(ls -1 "$dir"/libsqlite3*.dylib "$dir"/libsqlite3*.so* 2>/dev/null | head -n1)
            [ -n "''${candidate:-}" ] || { echo "libsqlite3 not found" >&2; exit 1; }
            echo "$candidate"
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
        checks.loadableExtensions = checkExt;
        devShells.default = pkgs.mkShell { packages = [ sqlite ]; };
      });
}