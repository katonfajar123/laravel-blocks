export function createSelectionState(editor) {
  if (!editor?.state?.selection) {
    return Object.freeze({
      type: 'unknown',
      empty: true,
      from: 0,
      to: 0,
      anchor: 0,
      head: 0,
      text: '',
    });
  }

  const selection = editor.state.selection;
  const text = selection.empty
    ? ''
    : editor.state.doc.textBetween(selection.from, selection.to, ' ');

  return Object.freeze({
    type: selection.constructor?.name || 'Selection',
    empty: Boolean(selection.empty),
    from: selection.from,
    to: selection.to,
    anchor: selection.anchor,
    head: selection.head,
    text,
  });
}
