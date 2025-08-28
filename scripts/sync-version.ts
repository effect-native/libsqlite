#!/usr/bin/env -S npx tsx

import { Console, Effect } from "effect";
import { Command, FileSystem, Path } from "@effect/platform";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PackageJson {
  version: string;
  [key: string]: unknown;
}

const getSQLiteVersion = Effect.gen(function* () {
  yield* Console.log("🔍 Getting SQLite version from Nix...");

  const result = yield* Command.make("nix", "run", ".#print-version").pipe(
    Command.string,
    Effect.withSpan("getSQLiteVersion"),
    Effect.mapError(() => new Error("Failed to get SQLite version from Nix")),
  );

  const version = result.trim();
  yield* Console.log(`📋 SQLite version from Nix: ${version}`);
  return version;
});

const updatePackageVersion = (sqliteVersion: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const projectRoot = path.resolve(__dirname, "..");
    const packageJsonPath = path.resolve(projectRoot, "package.json");

    const packageJsonContent = yield* fs.readFileString(packageJsonPath);
    const packageJson: PackageJson = JSON.parse(packageJsonContent);

    const currentVersion = packageJson.version;
    
    // Parse current version to check if it already matches SQLite version
    const [currentBase, currentSuffix] = currentVersion.includes('-') 
      ? currentVersion.split('-', 2)
      : [currentVersion, null];
    
    // If SQLite base version matches, keep the current version (including any suffix)
    if (currentBase === sqliteVersion) {
      yield* Console.log(`✅ SQLite version matches (${currentBase}), keeping current version: ${currentVersion}`);
      return false;
    }
    
    // If SQLite version changed, update to new base version (no suffix)
    const newVersion = sqliteVersion;

    yield* Console.log(
      `📦 Updating to new SQLite version: ${currentVersion} → ${newVersion}`,
    );
    packageJson.version = newVersion;

    const updatedContent = JSON.stringify(packageJson, null, 2) + "\n";
    yield* fs.writeFileString(packageJsonPath, updatedContent);

    return true;
  });

const main = Effect.gen(function* () {
  yield* Console.log("🔍 Syncing package version with SQLite version...");

  const sqliteVersion = yield* getSQLiteVersion;
  const wasUpdated = yield* updatePackageVersion(sqliteVersion);

  if (wasUpdated) {
    yield* Console.log("✨ Package version synced successfully!");
    yield* Console.log("💡 Don't forget to commit the changes.");
  }
});

// Run when called directly - lazy import Bun platform
if (import.meta.main) {
  const { BunContext, BunRuntime } = await import("@effect/platform-bun");
  const program = main.pipe(Effect.provide(BunContext.layer));
  BunRuntime.runMain(program);
}
