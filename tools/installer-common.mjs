import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const markerName = 'installation.json';
export const owner = 'mirror-protocol-user-install-v1';
export function requireNode() {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Mirror Protocol requires Node.js 22 or newer.');
}
export function takeRoot(argv) {
  const args = [...argv], index = args.indexOf('--root');
  let requested = process.env.MIRROR_PROTOCOL_HOME || path.join(os.homedir(), '.mirror-protocol');
  if (index >= 0) {
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('--root requires a directory.');
    requested = args[index + 1]; args.splice(index, 2);
  }
  const root = path.resolve(requested);
  if ([path.parse(root).root, os.homedir()].some(p => path.resolve(p).toLowerCase() === root.toLowerCase())) throw new Error('Refusing an install root that is the drive or home directory.');
  return { root, args };
}
export function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative);
}
export async function readInstallation(root) {
  const info = await fs.lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Install root must be a real directory, not a symlink.');
  const realRoot = await fs.realpath(root);
  const data = JSON.parse(await fs.readFile(path.join(realRoot, markerName), 'utf8'));
  if (data.owner !== owner || path.resolve(data.installRoot).toLowerCase() !== realRoot.toLowerCase()) throw new Error('This directory is not an owned Mirror Protocol installation.');
  const release = path.resolve(realRoot, data.currentRelease);
  if (!inside(path.join(realRoot, 'releases'), release)) throw new Error('Invalid installation release path.');
  if (path.resolve(await fs.realpath(release)).toLowerCase() !== release.toLowerCase()) throw new Error('Release directory may not redirect outside the installation.');
  return { ...data, root: realRoot, release };
}
export function runNode(script, args = [], { capture = false, cwd = path.dirname(script) } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, windowsHide: true, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((capture ? result.stderr || result.stdout : '') || `Command failed (${result.status}): ${path.basename(script)}`);
  return result.stdout;
}
export async function managerState(installation) {
  const platform = await import(pathToFileURL(path.join(installation.release, 'runtime/scripts/platform-runtime.mjs')).href);
  let state;
  try { state = JSON.parse(await fs.readFile(platform.statePathFor(), 'utf8')); } catch { return null; }
  let alive = false;
  if (Number.isInteger(state.controlPort) && typeof state.controlToken === 'string') {
    try {
      const response = await fetch(`http://127.0.0.1:${state.controlPort}/api/themes`, { headers: { 'x-cts-token': state.controlToken }, signal: AbortSignal.timeout(1500) });
      alive = response.ok;
    } catch { /* inactive state is not a live manager */ }
  }
  return { state, alive, owned: typeof state.theme === 'string' && inside(installation.root, path.resolve(state.theme)) };
}
export async function prepareApply(installation) {
  if (!['win32', 'darwin'].includes(process.platform)) throw new Error('Desktop application is supported on Windows and macOS. Linux can build and preview.');
  const manager = await managerState(installation);
  if (manager?.alive && !manager.owned) throw new Error('A different Theme Studio installation owns the running manager. Restore it with its own theme.mjs restore command first; this installer will not silently take it over.');
  if (manager?.alive && manager.owned && !inside(installation.release, path.resolve(manager.state.theme))) {
    const previousRuntime = path.dirname(path.dirname(path.dirname(path.resolve(manager.state.theme))));
    const previousCli = path.join(previousRuntime, 'scripts/theme.mjs');
    if (!inside(installation.root, previousCli)) throw new Error('Old manager path is outside this installation.');
    runNode(previousCli, ['restore']);
  }
}
