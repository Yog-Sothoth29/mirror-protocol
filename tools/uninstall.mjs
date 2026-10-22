#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { takeRoot, requireNode, readInstallation, managerState, inside, runNode } from './installer-common.mjs';
try {
  requireNode();
  const { root, args } = takeRoot(process.argv.slice(2));
  if (args.length) throw new Error('Usage: node uninstall.mjs [--root directory]');
  let installation;
  try { installation = await readInstallation(root); }
  catch (error) { if (error.code === 'ENOENT') { console.log(JSON.stringify({ removed: false, reason: 'not-installed' })); process.exit(0); } throw error; }
  const manager = await managerState(installation);
  if (manager?.owned) {
    const previousRuntime = path.dirname(path.dirname(path.dirname(path.resolve(manager.state.theme))));
    const previousCli = path.join(previousRuntime, 'scripts/theme.mjs');
    if (!inside(installation.root, previousCli)) throw new Error('Refusing manager cleanup outside this installation.');
    runNode(previousCli, ['restore']);
    const remaining = await managerState(installation);
    if (remaining?.owned && remaining.alive) throw new Error('Theme manager still active; keeping installation files.');
  }
  // Check the resolved deletion target immediately before the recursive delete.
  const deletionTarget = await fs.realpath(root);
  if (deletionTarget !== installation.root || [os.homedir(), path.parse(deletionTarget).root, process.cwd()].some(p => path.resolve(p).toLowerCase() === deletionTarget.toLowerCase())) throw new Error('Unsafe uninstall target.');
  await fs.rm(deletionTarget, { recursive: true });
  console.log(JSON.stringify({ removed: true, root: deletionTarget, restoredOwnManager: Boolean(manager?.owned), codexRestarted: false }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
