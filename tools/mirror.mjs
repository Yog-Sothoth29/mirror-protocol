#!/usr/bin/env node
import path from 'node:path';
import { takeRoot, requireNode, readInstallation, prepareApply, managerState, runNode } from './installer-common.mjs';
try {
  requireNode();
  const { root, args } = takeRoot(process.argv.slice(2));
  const installation = await readInstallation(root);
  const command = args[0] || 'status';
  if (command === 'verify') {
    const options = args.slice(1), supported = ['--theme', '--screenshot', '--port', '--timeout-ms'];
    for (let i = 0; i < options.length; i += 2) if (!supported.includes(options[i]) || !options[i + 1] || options[i + 1].startsWith('--')) throw new Error('Usage: mirror.mjs verify [--theme id] [--screenshot file] [--port number] [--timeout-ms number]');
    runNode(path.join(installation.release, 'runtime/scripts/runtime.mjs'), ['--verify', ...(!options.includes('--theme') ? ['--theme', 'mirror-protocol-auto'] : []), ...options]);
    process.exit(0);
  }
  if (['use', 'web'].includes(command)) await prepareApply(installation);
  if (['native', 'restore'].includes(command)) {
    const manager = await managerState(installation);
    if (manager && !manager.owned) throw new Error('Current Theme Studio state belongs to another installation; refusing to restore it through Mirror Protocol.');
  }
  runNode(path.join(installation.release, 'runtime/scripts/theme.mjs'), args.length ? args : ['status']);
} catch (error) { console.error(error.message); process.exitCode = 1; }
