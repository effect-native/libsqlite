#!/usr/bin/env -S npx tsx

import { Console, Effect, pipe, Array as Arr } from "effect";
import { Command, FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

interface PlatformTarget {
  readonly nixSystem: string;
  readonly platform: string;
  readonly arch: string;
  readonly extension: string;
  readonly description: string;
}

const PLATFORM_TARGETS: ReadonlyArray<PlatformTarget> = [
  {
    nixSystem: "x86_64-linux",
    platform: "linux",
    arch: "x86_64", 
    extension: "so",
    description: "Intel/AMD Linux (Docker, most servers)"
  },
  {
    nixSystem: "aarch64-linux",
    platform: "linux", 
    arch: "aarch64",
    extension: "so",
    description: "ARM64 Linux (Raspberry Pi 4+, AWS Graviton)"
  },
  {
    nixSystem: "x86_64-darwin",
    platform: "darwin",
    arch: "x86_64",
    extension: "dylib", 
    description: "Intel Mac"
  },
  {
    nixSystem: "aarch64-darwin",
    platform: "darwin",
    arch: "aarch64", 
    extension: "dylib",
    description: "Apple Silicon Mac (M1/M2/M3)"
  }
];

const cleanBuildDir = Effect.gen(function* () {
  yield* Console.log("🧹 Cleaning build directory...")
  const fs = yield* FileSystem.FileSystem
  
  // Remove existing lib directory
  yield* fs.remove("lib").pipe(Effect.ignore)
  yield* fs.remove("dist").pipe(Effect.ignore)
  
  // Create fresh directories
  yield* fs.makeDirectory("lib", { recursive: true })
  yield* fs.makeDirectory("dist", { recursive: true })
  yield* fs.makeDirectory("dist/lib", { recursive: true })
})

const buildPlatformLibrary = (target: PlatformTarget) => Effect.gen(function* () {
  yield* Console.log(`📦 Building ${target.description} (${target.nixSystem})...`)
  
  // Try to build for this platform
  const buildResult = yield* Command.make("nix", "build", `--system`, target.nixSystem, ".#libsqlite3", "--no-link").pipe(
    Command.exitCode,
    Effect.mapError(() => `Failed to build for ${target.nixSystem}`)
  )
  
  if (buildResult !== 0) {
    yield* Console.log(`⚠️  Skipping ${target.nixSystem} - not available on this system`)
    return null
  }
  
  // Get the store path
  const storePath = yield* Command.make("nix", "eval", `--system`, target.nixSystem, ".#libsqlite3", "--raw").pipe(
    Command.string,
    Effect.mapError(() => `Failed to get store path for ${target.nixSystem}`)
  )
  
  const fs = yield* FileSystem.FileSystem
  
  // Find the actual library file
  const sourceLibDir = path.join(storePath.trim(), "lib")
  const libFiles = yield* fs.readDirectory(sourceLibDir)
  
  // Look for the actual library file (not symlinks)
  const actualLibFile = libFiles.find(file => 
    file.includes(`libsqlite3`) && 
    (file.match(/libsqlite3\.\d+\.\d+\.\d+\./) || file === `libsqlite3.${target.extension}`)
  ) || libFiles.find(file => file.includes(`libsqlite3`) && file.endsWith(`.${target.extension}`))
  
  if (!actualLibFile) {
    yield* Effect.fail(`No library file found for ${target.nixSystem}`)
  }
  
  const sourcePath = path.join(sourceLibDir, actualLibFile!)
  const targetFileName = `libsqlite3-${target.platform}-${target.arch}.${target.extension}`
  const targetPath = path.join("dist", "lib", targetFileName)
  
  // Copy the library file (resolving symlinks)
  yield* Command.make("cp", "-L", sourcePath, targetPath).pipe(
    Command.exitCode,
    Effect.mapError(() => `Failed to copy ${sourcePath} to ${targetPath}`)
  )
  yield* Console.log(`✅ ${targetFileName} -> ${target.description}`)
  
  return {
    target,
    fileName: targetFileName,
    path: targetPath
  }
})

const buildAllLibraries = Effect.gen(function* () {
  yield* Console.log("🔨 Building SQLite libraries for all platforms...")
  
  // Build libraries for all platforms in parallel
  const results = yield* Effect.allSuccesses(
    Arr.map(PLATFORM_TARGETS, buildPlatformLibrary)
  )
  
  const successfulBuilds = results.filter(Boolean)
  
  yield* Console.log(`✨ Built ${successfulBuilds.length}/${PLATFORM_TARGETS.length} platform libraries`)
  
  return successfulBuilds
})

const generateOptimizedIndex = (builtLibraries: Array<any>) => Effect.gen(function* () {
  yield* Console.log("📝 Generating optimized index.js for production...")
  
  const fs = yield* FileSystem.FileSystem
  
  const indexContent = `import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get the absolute path to the bundled libsqlite3 shared library
 * Automatically detects platform and architecture
 * @returns {string} Absolute path to libsqlite3.dylib/.so
 */
export function getLibraryPath() {
  // Detect current platform and architecture
  const platform = process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const ext = platform === 'darwin' ? 'dylib' : 'so';
  
  const libDir = resolve(__dirname, 'lib');
  
  // Try platform-specific library first (highest priority)
  const specificLib = resolve(libDir, \`libsqlite3-\${platform}-\${arch}.\${ext}\`);
  if (existsSync(specificLib)) {
    return specificLib;
  }
  
  // Fallback to any available library for the current platform
  const fallbackCandidates = [
    resolve(libDir, \`libsqlite3.\${ext}\`),        // Generic for platform
    resolve(libDir, 'libsqlite3.dylib'),         // macOS generic  
    resolve(libDir, 'libsqlite3.so'),            // Linux generic
  ];
  
  for (const candidate of fallbackCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  
  // Helpful error message with available platforms
  const availablePlatforms = ${JSON.stringify(builtLibraries.map(b => `${b.target.platform}-${b.target.arch}`))};
  const expectedLib = \`libsqlite3-\${platform}-\${arch}.\${ext}\`;
  throw new Error(
    \`SQLite library not found for \${platform}/\${arch}. \` +
    \`Expected: \${expectedLib}. \` +
    \`Available platforms: \${availablePlatforms.join(', ')}. \` +
    \`This package supports: ${PLATFORM_TARGETS.map(t => t.description).join(', ')}\`
  );
}

/**
 * Hip alias for getLibraryPath() - for use with Database.setCustomSQLite()
 * @returns {string} Absolute path to libsqlite3.dylib/.so
 */
export const pathToSQLite = getLibraryPath();

/**
 * Default export
 */
export default getLibraryPath;
`;
  
  yield* fs.writeFileString("dist/index.js", indexContent)
  
  // Generate TypeScript definitions
  const dtsContent = `/**
 * Get the absolute path to the bundled libsqlite3 shared library
 * @returns Absolute path to libsqlite3.dylib/.so
 */
export declare function getLibraryPath(): string;

/**
 * Hip alias for getLibraryPath() - for use with Database.setCustomSQLite()
 */
export declare const pathToSQLite: string;

export default getLibraryPath;
`;
  
  yield* fs.writeFileString("dist/index.d.ts", dtsContent)
})

const generateOptimizedBin = Effect.gen(function* () {
  yield* Console.log("🔧 Generating optimized bin script...")
  
  const fs = yield* FileSystem.FileSystem
  yield* fs.makeDirectory("dist/bin", { recursive: true })
  
  const binContent = `#!/usr/bin/env node

import { getLibraryPath } from '../index.js';

try {
  console.log(getLibraryPath());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
`;
  
  yield* fs.writeFileString("dist/bin/sqlite-lib-path.js", binContent)
  
  // Make it executable
  yield* Command.make("chmod", "+x", "dist/bin/sqlite-lib-path.js").pipe(Command.exitCode)
})

const generateProductionPackageJson = Effect.gen(function* () {
  yield* Console.log("📦 Generating production package.json...")
  
  const fs = yield* FileSystem.FileSystem
  
  // Read current package.json
  const currentPackageJson = yield* fs.readFileString("package.json")
  const pkg = JSON.parse(currentPackageJson)
  
  // Create production version
  const prodPkg = {
    ...pkg,
    main: "index.js",
    types: "index.d.ts", 
    bin: {
      "@effect-native/libsqlite": "./bin/sqlite-lib-path.js",
      "sqlite-lib-path": "./bin/sqlite-lib-path.js"
    },
    files: [
      "index.js",
      "index.d.ts", 
      "lib/",
      "bin/",
      "README.md"
    ],
    // Remove dev-only dependencies and scripts
    dependencies: {},
    devDependencies: {},
    scripts: {
      postinstall: "echo 'SQLite libraries ready! Use: import { pathToSQLite } from @effect-native/libsqlite'"
    }
  }
  
  yield* fs.writeFileString("dist/package.json", JSON.stringify(prodPkg, null, 2))
})

const copyStaticFiles = Effect.gen(function* () {
  yield* Console.log("📋 Copying static files...")
  
  const fs = yield* FileSystem.FileSystem
  
  // Copy README and other essential files
  yield* fs.copy("README.md", "dist/README.md")
  
  // The libraries are already built directly in dist/lib by the build process
  // So we don't need to copy lib/ again
})

const generateBuildSummary = (builtLibraries: Array<any>) => Effect.gen(function* () {
  yield* Console.log("\n🎉 Production build complete!")
  yield* Console.log("📊 Build Summary:")
  yield* Console.log(`   Built libraries: ${builtLibraries.length}`)
  
  for (const lib of builtLibraries) {
    yield* Console.log(`   ✅ ${lib.fileName} - ${lib.target.description}`)
  }
  
  yield* Console.log("\n📦 Production package created in ./dist/")
  yield* Console.log("🚀 Ready for: cd dist && npm publish")
  
  const fs = yield* FileSystem.FileSystem
  const distFiles = yield* fs.readDirectory("dist")
  yield* Console.log(`📁 Package contents: ${distFiles.join(', ')}`)
})

const main = Effect.gen(function* () {
  yield* Console.log("🚀 Building production package for @effect-native/libsqlite")
  
  yield* cleanBuildDir
  const builtLibraries = yield* buildAllLibraries
  yield* generateOptimizedIndex(builtLibraries)
  yield* generateOptimizedBin  
  yield* generateProductionPackageJson
  yield* copyStaticFiles
  yield* generateBuildSummary(builtLibraries)
})

// Run when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const program = main.pipe(
    Effect.provide(BunContext.layer),
    Effect.catchAll(error => Console.error(`Build failed: ${error}`))
  )
  BunRuntime.runMain(program)
}