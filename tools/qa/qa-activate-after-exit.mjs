import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { acquireActivationLock, waitAndActivate } from '../activate-after-exit.mjs';

function fixture(sequence, ready = false, timeoutMs = 30) {
  let time = 0, calls = 0, index = 0;
  const events = [];
  return {
    events, get calls() { return calls; },
    options: { listPids: async () => sequence[Math.min(index++, sequence.length - 1)], cdpReady: async () => ready, apply: async () => { calls++; return 0; }, update: async event => events.push(event), now: () => time, sleep: async ms => { time += ms; }, timeoutMs, pollMs: 10 },
  };
}

test('running without CDP waits; it never launches before the exit observation', async () => {
  const f = fixture([[20], [20], []]);
  f.options.sleep = async () => { assert.equal(f.calls, 0); };
  const result = await waitAndActivate(f.options);
  assert.equal(result.phase, 'applied');
  assert.equal(f.calls, 1);
  assert.deepEqual(f.events.map(e => e.phase), ['waiting', 'applying', 'applied']);
});

test('all observed application processes must exit and apply is called exactly once', async () => {
  const f = fixture([[20, 21], [21], [], []]);
  await waitAndActivate(f.options);
  assert.equal(f.calls, 1);
  assert.equal(f.events.find(e => e.phase === 'applying').runningProcesses, 0);
});

test('timeout leaves a running application untouched with no launch', async () => {
  const f = fixture([[20]]);
  assert.deepEqual(await waitAndActivate(f.options), { phase: 'timed-out', exitCode: 2 });
  assert.equal(f.calls, 0);
});

test('already available CDP applies immediately without waiting or closing', async () => {
  const f = fixture([[20]], true);
  f.options.sleep = async () => { assert.fail('should not wait'); };
  await waitAndActivate(f.options);
  assert.equal(f.calls, 1);
  assert.equal(f.events[0].phase, 'applying');
});

test('failed apply is not retried', async () => {
  const f = fixture([[]]);
  f.options.apply = async () => { f.events.push({ phase: 'invoked' }); return 1; };
  assert.deepEqual(await waitAndActivate(f.options), { phase: 'failed', exitCode: 1 });
  assert.equal(f.events.filter(e => e.phase === 'invoked').length, 1);
});

test('cancellation or uninstall after waiting prevents later launch', async () => {
  const f = fixture([[20], []]);
  let checks = 0;
  f.options.checkContinue = async () => ++checks === 1;
  assert.deepEqual(await waitAndActivate(f.options), { phase: 'cancelled', exitCode: 3 });
  assert.equal(f.calls, 0);
  assert.equal(f.events.at(-1).phase, 'cancelled');
});

test('exclusive helper lock rejects a second instance and is released normally', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-activation-test-'));
  try {
    const release = await acquireActivationLock(root);
    await assert.rejects(acquireActivationLock(root), /Another activation helper/);
    await release();
    const releaseAgain = await acquireActivationLock(root);
    await releaseAgain();
  } finally {
    // Only this test-created empty directory is removed, never application data.
    await fs.rmdir(root);
  }
});
