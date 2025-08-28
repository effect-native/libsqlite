#!/usr/bin/env -S npx tsx

import { Console, Effect } from "effect"
import { Command } from "@effect/platform"

const getLibraryPath = Effect.gen(function* () {
  const result = yield* Command.make("nix", "run", ".#print-path").pipe(
    Command.string,
    Effect.mapError(() => new Error("Failed to get library path from Nix"))
  )
  
  return result.trim()
})

const main = Effect.gen(function* () {
  const libraryPath = yield* getLibraryPath
  yield* Console.log(libraryPath)
})

// Run when called directly - lazy import Bun platform
if (import.meta.url === `file://${process.argv[1]}`) {
  const { BunContext, BunRuntime } = await import("@effect/platform-bun")
  const program = main.pipe(Effect.provide(BunContext.layer))
  BunRuntime.runMain(program)
}