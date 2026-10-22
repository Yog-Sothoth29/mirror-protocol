#!/usr/bin/env node
import fs from "node:fs/promises";
import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadTheme } from "./theme-core.mjs";
import { findBundledCodex, findOfficialApp, securePrivateDirectory, securePrivateFile, statePathFor, stateRootFor } from "./platform-runtime.mjs";
import { stopThemeWatcher, stopThemeWatchers } from "./runtime-lifecycle.mjs";
import { rollbackFailedActivation } from "./activation-safety.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const runtimePath = path.join(here, "runtime.mjs");
const stateRoot = stateRootFor();
const statePath = statePathFor();

function parseArgs(argv) {
  const options = { theme: null, port: 9335, appPath: null, foreground: false, screenshot: null, verificationTimeoutMs: 30000 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--theme") options.theme = argv[++index];
    else if (arg === "--port") options.port = Number(argv[++index]);
    else if (arg === "--profile-path") throw new Error("Profile overrides are disabled. Mirror Protocol only attaches to an existing native Codex window.");
    else if (arg === "--app-path") options.appPath = path.resolve(argv[++index]);
    else if (arg === "--restart-existing") throw new Error("Custom app restarts are disabled. Use the codexthemes.ai switcher workflow with explicit restart authorization.");
    else if (arg === "--attach-only") { /* All activation is attach-only. */ }
    else if (arg === "--foreground") options.foreground = true;
    else if (arg === "--screenshot") options.screenshot = path.resolve(argv[++index]);
    else if (arg === "--verification-timeout-ms") options.verificationTimeoutMs = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.theme) throw new Error("--theme is required");
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) throw new Error("Invalid port");
  if (!Number.isInteger(options.verificationTimeoutMs) || options.verificationTimeoutMs < 1000 || options.verificationTimeoutMs > 120000) throw new Error('Invalid verification timeout');
  return options;
}

async function cdpReady(port) {
  const result = spawnSync(process.execPath, [runtimePath, "--ready", "--port", String(port), "--timeout-ms", "1800"], { encoding: "utf8", timeout: 5000, windowsHide: true });
  return result.status === 0;
}

function runRuntime(args, options = {}) {
  return spawn(process.execPath, [runtimePath, ...args], { stdio: options.stdio ?? "inherit", detached: options.detached ?? false });
}

async function freeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

const options = parseArgs(process.argv.slice(2));
const theme = await loadTheme(options.theme);
const appearance = theme.manifest.appearance ?? {
  designedFor: theme.manifest.design?.mode ?? theme.manifest.baseTheme?.mode ?? "light",
  switchPolicy: "prompt",
};
console.log(JSON.stringify({
  status: "appearance-reminder",
  themeId: theme.manifest.id,
  designedFor: appearance.designedFor,
  message: appearance.designedFor === "dark"
    ? "This theme is designed for dark appearance. Keep Codex in dark mode to avoid mixed native surfaces."
    : "This theme is designed for light appearance. Keep Codex in light mode to avoid mixed native surfaces.",
}));
const runtimeAlreadyReady = await cdpReady(options.port);
if (!runtimeAlreadyReady) {
  throw new Error("No existing Codex app page is available. Attach-only mode did not launch, close, restart, or change the profile of any application.");
}
await securePrivateDirectory(stateRoot);
await stopThemeWatchers(runtimePath, options.port);
let executable = null;
try { executable = await findOfficialApp({ explicitPath: options.appPath ?? process.env.CODEX_THEME_STUDIO_APP_PATH }); }
catch { /* Themes without a quota card remain usable. */ }

const controlPort = await freeLoopbackPort();
const controlToken = crypto.randomBytes(32).toString("hex");
let codexPath = null;
try { if (executable) codexPath = await findBundledCodex(executable); } catch { /* Quota card reports unavailable. */ }
const controlArgs = ["--control-port", String(controlPort), "--control-token", controlToken, "--state-path", statePath, ...(codexPath ? ["--codex-path", codexPath] : [])];

if (options.foreground) {
  const child = runRuntime(["--watch", "--port", String(options.port), "--theme", theme.manifestPath, ...controlArgs]);
  await new Promise((resolve) => child.on("exit", resolve));
  process.exit(0);
}

const out = await fs.open(path.join(stateRoot, "watcher.log"), "a");
const err = await fs.open(path.join(stateRoot, "watcher-error.log"), "a");
const watcher = runRuntime(["--watch", "--port", String(options.port), "--theme", theme.manifestPath, ...controlArgs], { detached: true, stdio: ["ignore", out.fd, err.fd] });
watcher.unref();
await fs.writeFile(statePath, `${JSON.stringify({
  port: options.port,
  watcherPid: watcher.pid,
  theme: theme.manifestPath,
  activeTheme: theme.manifest.id,
  controlPort,
  controlToken,
  managerUrl: `http://127.0.0.1:${controlPort}/#${controlToken}`,
  startedAt: new Date().toISOString(),
}, null, 2)}\n`, "utf8");
await securePrivateFile(statePath);

let verified = false;
let lastVerification = null;
const verifyMode = "--verify";
const verificationDeadline = Date.now() + options.verificationTimeoutMs;
while (Date.now() < verificationDeadline) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const args = [runtimePath, verifyMode, "--port", String(options.port), "--theme", theme.manifestPath, "--timeout-ms", "5000"];
  const check = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 7000, windowsHide: true });
  lastVerification = { exitCode: check.status, signal: check.signal, error: check.error?.message ?? null, stdout: String(check.stdout ?? "").slice(0, 24000), stderr: String(check.stderr ?? "").slice(0, 12000) };
  if (check.status === 0) { verified = true; break; }
}
if (!verified) {
  const cleanup = await rollbackFailedActivation({
    stopWatcher: () => stopThemeWatcher(watcher.pid, runtimePath, options.port),
    removeTheme: async () => {
      const result = spawnSync(process.execPath, [runtimePath, "--remove", "--port", String(options.port), "--timeout-ms", "4000"], { encoding: "utf8", timeout: 10000, windowsHide: true });
      if (result.status !== 0) throw new Error("Renderer theme removal could not be confirmed after failed startup.");
    },
    clearState: () => fs.rm(statePath, { force: true }),
  });
  const diagnostics = path.join(stateRoot, "startup-verification.json");
  await fs.writeFile(diagnostics, JSON.stringify({ theme: theme.manifest.id, port: options.port, failedAt: new Date().toISOString(), lastVerification, cleanup }, null, 2));
  await securePrivateFile(diagnostics);
  if (!cleanup.cleanupConfirmed) {
    try {
      const failedState = JSON.parse(await fs.readFile(statePath, "utf8"));
      failedState.activeTheme = null; failedState.activationFailed = true; failedState.cleanupConfirmed = false;
      await fs.writeFile(statePath, JSON.stringify(failedState, null, 2));
    } catch { /* The independent diagnostic remains available. */ }
  }
  throw new Error(`Live verification failed; renderer cleanup confirmed: ${cleanup.cleanupConfirmed}. See ${diagnostics}`);
}
if (options.screenshot) {
  let captured = false;
  for (let attempt = 0; attempt < 3 && !captured; attempt += 1) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 1000));
    const capture = spawnSync(process.execPath, [runtimePath, verifyMode, "--port", String(options.port), "--theme", theme.manifestPath, "--timeout-ms", "15000", "--screenshot", options.screenshot], { stdio: "inherit", timeout: 20000 });
    captured = capture.status === 0;
  }
  if (!captured) console.warn(`Theme is active, but screenshot capture did not complete: ${options.screenshot}`);
}
console.log(JSON.stringify({ active: true, theme: theme.manifest.id, designedFor: appearance.designedFor, quality: theme.manifest.quality ?? null, port: options.port, watcherPid: watcher.pid, controlPort, webCommand: "node scripts/theme.mjs web", screenshot: options.screenshot }, null, 2));
