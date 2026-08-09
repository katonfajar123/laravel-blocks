export function historyShortcutCommand(event) {
  const key = String(event?.key ?? '').toLowerCase();

  if (key !== 'z') {
    return null;
  }

  if (event.altKey || (!event.ctrlKey && !event.metaKey)) {
    return null;
  }

  return event.shiftKey ? 'redo' : 'undo';
}

export function handleHistoryShortcut(event, commandRegistry) {
  const command = historyShortcutCommand(event);

  if (!command) {
    return false;
  }

  event.preventDefault();
  commandRegistry?.run?.(command);

  return true;
}
