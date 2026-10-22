#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { owner, markerName, takeRoot, requireNode, readInstallation, inside, runNode } from './installer-common.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  requireNode();
  const { root, args } = takeRoot(process.argv.slice(2));
  const appIndex = args.indexOf('--app-path');
  let appPath = null;
  if (appIndex >= 0) {
    if (!args[appIndex + 1] || args[appIndex + 1].startsWith('--')) throw new Error('--app-path requires the official executable path.');
    appPath = path.resolve(args[appIndex + 1]); args.splice(appIndex, 2);
  }
  if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node tools/install.mjs [--root directory] [--apply]. Restart is never automatic.');
  if (appPath && !args.includes('--apply')) throw new Error('--app-path is only used with --apply.');
  if (inside(source, root) || inside(root, source) || root === source || root.toLowerCase() === path.resolve(process.cwd()).toLowerCase()) throw new Error('Install outside the source checkout and current working directory.');
  let rootStat;
  try { rootStat = await fs.lstat(root); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (rootStat) {
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('Install root is not a real directory.');
    if ((await fs.readdir(root)).length) await readInstallation(root);
  }
  // The theme compiler uses only Node built-ins; no npm install or admin rights.
  runNode(path.join(source, 'tools/build-theme.mjs'), [], { capture: true, cwd: source });
  const files = [];
  async function walk(relative) {
    const absolute = path.join(source, relative), stat = await fs.lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error('Symlinks are excluded from an install: ' + relative);
    if (stat.isDirectory()) { for (const name of (await fs.readdir(absolute)).sort()) await walk(path.join(relative, name)); }
    else if (stat.isFile()) files.push({ relative, sha256: crypto.createHash('sha256').update(await fs.readFile(absolute)).digest('hex') });
  }
  await walk('runtime');
  const version = JSON.parse(await fs.readFile(path.join(source, 'runtime/themes/mirror-protocol-auto/mirror-protocol-auto.json'), 'utf8')).version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid release version.');
  const digest = crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 12);
  await fs.mkdir(path.join(root, 'releases'), { recursive: true });
  const realRoot = await fs.realpath(root), releaseName = `${version}-${digest}`, release = path.join(realRoot, 'releases', releaseName);
  if (!inside(path.join(realRoot, 'releases'), release)) throw new Error('Release escaped installation root.');
  try { await fs.mkdir(release); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  if ((await fs.realpath(release)).toLowerCase() !== release.toLowerCase()) throw new Error('Release directory redirects outside the installation.');
  for (const file of files) {
    const destination = path.join(release, file.relative);
    if (!inside(release, destination)) throw new Error('Unsafe source filename.');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    if ((await fs.realpath(path.dirname(destination))).toLowerCase() !== path.dirname(destination).toLowerCase()) throw new Error('Installed parent directory may not be a symlink.');
    try {
      const stat = await fs.lstat(destination);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Installed file is not a regular file: ' + file.relative);
      const existing = crypto.createHash('sha256').update(await fs.readFile(destination)).digest('hex');
      if (existing !== file.sha256) throw new Error('Existing immutable release differs: ' + file.relative);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await fs.copyFile(path.join(source, file.relative), destination, fs.constants.COPYFILE_EXCL);
    }
  }
  async function copyRegular(from, destination) {
    try { if ((await fs.lstat(destination)).isSymbolicLink()) throw new Error('Refusing to overwrite a symlink: ' + path.basename(destination)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.copyFile(from, destination);
  }
  for (const file of ['LICENSE', 'ASSET-LICENSE.md', 'THIRD_PARTY_NOTICES.md', 'INSTALL.md']) await copyRegular(path.join(source, file), path.join(release, file));
  for (const file of ['mirror.mjs', 'uninstall.mjs', 'installer-common.mjs', 'activate-after-exit.mjs']) await copyRegular(path.join(source, 'tools', file), path.join(realRoot, file));
  const record = { owner, version, installRoot: realRoot, currentRelease: path.join('releases', releaseName).replaceAll('\\', '/'), sourceDigest: digest, files, installedAt: new Date().toISOString() };
  const pending = path.join(realRoot, 'installation.' + crypto.randomUUID() + '.json');
  await fs.writeFile(pending, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  await fs.rename(pending, path.join(realRoot, markerName));
  const core = await import(pathToFileURL(path.join(release, 'runtime/scripts/theme-core.mjs')).href);
  const themes = await core.listThemes();
  if (themes.length !== 4) throw new Error('Installed theme library did not contain four valid themes.');
  console.log(JSON.stringify({ installed: true, version, root: realRoot, release, themes: themes.map(t => t.id), applied: false, command: `node "${path.join(realRoot, 'mirror.mjs')}" use mirror-protocol-auto`, restore: `node "${path.join(realRoot, 'mirror.mjs')}" restore`, uninstall: `node "${path.join(realRoot, 'uninstall.mjs')}"` }, null, 2));
  if (args.includes('--apply')) runNode(path.join(realRoot, 'mirror.mjs'), ['--root', realRoot, 'use', 'mirror-protocol-auto', ...(appPath ? ['--app-path', appPath] : [])]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
