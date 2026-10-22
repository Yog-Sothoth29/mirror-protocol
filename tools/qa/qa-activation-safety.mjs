import assert from 'node:assert/strict';
import test from 'node:test';
import { rollbackFailedActivation } from '../../runtime/scripts/activation-safety.mjs';

test('failed activation stops its watcher, removes page paint, then clears state', async () => {
  const steps = [];
  const result = await rollbackFailedActivation({ stopWatcher: async () => steps.push('stop'), removeTheme: async () => steps.push('remove'), clearState: async () => steps.push('clear') });
  assert.deepEqual(steps, ['stop', 'remove', 'clear']);
  assert.equal(result.cleanupConfirmed, true);
});
test('watcher failure still attempts renderer cleanup and preserves recovery state', async () => {
  let removed = false, cleared = false;
  const result = await rollbackFailedActivation({ stopWatcher: async () => { throw new Error('stop failed'); }, removeTheme: async () => { removed = true; }, clearState: async () => { cleared = true; } });
  assert.equal(removed, true); assert.equal(cleared, false); assert.equal(result.cleanupConfirmed, false);
});
test('renderer removal failure is reported instead of pretending restoration succeeded', async () => {
  let cleared = false;
  const result = await rollbackFailedActivation({ stopWatcher: async () => {}, removeTheme: async () => { throw new Error('page unavailable'); }, clearState: async () => { cleared = true; } });
  assert.equal(cleared, false); assert.equal(result.cleanupConfirmed, false);
  assert.equal(result.errors[0].step, 'remove-renderer-theme');
});
