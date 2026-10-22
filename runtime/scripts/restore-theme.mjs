#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { statePathFor } from "./platform-runtime.mjs";
import { stopThemeWatchers, watcherLockPath } from "./runtime-lifecycle.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const runtimePath = path.join(here, "runtime.mjs");
const statePath = statePathFor();
let port = 9335;
let state = null;
try { state = JSON.parse(await fs.readFile(statePath, "utf8")); port = Number(state.port) || port; } catch { /* already restored */ }
const stoppedWatcherPids = await stopThemeWatchers(runtimePath, port);
const removal = spawnSync(process.execPath, [runtimePath, "--remove", "--port", String(port), "--timeout-ms", "2500"], { encoding: 'utf8', timeout: 15000, windowsHide: true });
if (removal.status !== 0) {
  let endpointAlive = false;
  try { endpointAlive = (await fetch(`http://127.0.0.1:${port}/json/list`, {signal: AbortSignal.timeout(1500)})).ok; } catch { /* App already exited. */ }
  if (endpointAlive) throw new Error('Renderer removal was not confirmed. Recovery state was retained; no application was closed.');
}
await fs.rm(statePath, { force: true });
await fs.rm(watcherLockPath(statePath, port), { force: true });
console.log(JSON.stringify({ restored: true, port, stoppedWatcherPids }, null, 2));
