#!/usr/bin/env node
// Compatibility entry: attaches only, never launches or restarts Codex.
import path from 'node:path';
import { takeRoot, requireNode, readInstallation, runNode } from './installer-common.mjs';
try {
  requireNode();
  const { root, args } = takeRoot(process.argv.slice(2));
  if (args.length && (args.length !== 1 || args[0] !== '--check')) throw new Error('Usage: attach-theme.mjs [--root directory] [--check]');
  const installation = await readInstallation(root);
  const readiness = JSON.parse(runNode(path.join(installation.release, 'runtime/scripts/runtime.mjs'), ['--ready', '--timeout-ms', '2500'], {capture: true}));
  if (!readiness.passed) throw new Error('Native Codex UI is not ready. No application was opened or closed.');
  if (args[0] === '--check') console.log(JSON.stringify({attachOnly: true, nativeUiReady: true, appStarted: false, appClosed: false, profileChanged: false, themeApplied: false, version: installation.version}));
  else runNode(path.join(root, 'mirror.mjs'), ['--root', root, 'use', 'mirror-protocol-auto', '--attach-only']);
} catch (error) { console.error(error.message); process.exitCode = 1; }
