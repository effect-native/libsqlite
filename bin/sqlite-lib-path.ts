#!/usr/bin/env -S npx tsx

import { getLibraryPath } from '../index.js'

// Run when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(getLibraryPath())
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}