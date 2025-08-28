#!/usr/bin/env node

import { getLibraryPath } from '../index.js';

try {
  console.log(getLibraryPath());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}