#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Get the current directory
const cwd = process.cwd();

// Check if dist directory exists
if (!existsSync(resolve(cwd, 'dist'))) {
  console.log('Building package...');
  execSync('npm run build', { stdio: 'inherit' });
} else {
  console.log('Dist directory already exists, skipping build');
}

console.log('Package built successfully!');
console.log('Make sure to run "pnpm install" in your project root to link the workspace package');
