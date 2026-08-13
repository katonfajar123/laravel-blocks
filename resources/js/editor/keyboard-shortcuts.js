function platformModifierPressed(event) {
  return Boolean(event?.ctrlKey || event?.metaKey);
}

function keyDigit(event) {
  const code = String(event?.code ?? '');

  if (/^Digit[0-9]$/.test(code)) {
    return code.replace('Digit', '');
  }

  const key = String(event?.key ?? '').toLowerCase();

  if (/^[0-9]$/.test(key)) {
    return key;
  }

  return null;
}

export function headingShortcutCommand(event) {
  if (event?.altKey || !event?.shiftKey || !platformModifierPressed(event)) {
    return null;
  }

  const digit = keyDigit(event);

  if (!['2', '3', '4'].includes(digit)) {
    return null;
  }

  return Object.freeze({
    command: 'setHeading',
    payload: Object.freeze({ level: Number(digit) }),
  });
}

export function historyShortcutCommand(event) {
  const key = String(event?.key ?? '').toLowerCase();

  if (key !== 'z') {
    return null;
  }

  if (event.altKey || !platformModifierPressed(event)) {
    return null;
  }

  return event.shiftKey ? 'redo' : 'undo';
}

export function editorShortcutCommand(event) {
  const heading = headingShortcutCommand(event);

  if (heading) {
    return heading;
  }

  const history = historyShortcutCommand(event);

  if (!history) {
    return null;
  }

  return Object.freeze({
    command: history,
    payload: Object.freeze({}),
  });
}

export function handleEditorShortcut(event, commandRegistry) {
  const shortcut = editorShortcutCommand(event);

  if (!shortcut) {
    return false;
  }

  event.preventDefault();
  commandRegistry?.run?.(shortcut.command, shortcut.payload);

  return true;
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
