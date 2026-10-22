// Startup failure must remove renderer-owned paint, not just stop its watcher.
export async function rollbackFailedActivation({ stopWatcher, removeTheme, clearState }) {
  const errors = [];
  for (const [step, action] of [['stop-watcher', stopWatcher], ['remove-renderer-theme', removeTheme]]) {
    try { await action(); } catch (error) { errors.push({ step, message: error.message }); }
  }
  if (!errors.length) {
    try { await clearState(); } catch (error) { errors.push({ step: 'clear-state', message: error.message }); }
  }
  return { cleanupConfirmed: errors.length === 0, errors };
}
