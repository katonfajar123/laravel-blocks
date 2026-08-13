import { linkAttributes } from '../rich-text/link-provider.js';
import { createBlockSelectionState } from '../block-editor/block-selection.js';
import { topLevelBlockRanges } from '../block-editor/block-drag.js';
import { blockInsertPayload } from '../block-editor/manifest.js';

const focusOptions = Object.freeze({ scrollIntoView: false });

function normalLevel(payload) {
  const level = Number(payload?.level ?? 2);

  if (!Number.isInteger(level) || level < 1 || level > 6) {
    throw new TypeError('Heading level must be an integer between 1 and 6.');
  }

  return level;
}

function commandState(command, editor, payload) {
  const enabled = command.can(editor, payload);

  return Object.freeze({
    name: command.name,
    label: command.label,
    active: command.active(editor, payload),
    enabled,
    disabledReason: enabled ? null : command.disabledReason,
  });
}

function result(command, editor, payload, executed) {
  return Object.freeze({
    name: command.name,
    executed,
    state: commandState(command, editor, payload),
  });
}

function canRun(editor, callback) {
  try {
    return Boolean(callback(editor));
  } catch {
    return false;
  }
}

function chainCan(editor, callback) {
  return canRun(editor, (candidate) => callback(candidate.can().chain().focus(undefined, focusOptions)));
}

function runChain(editor, callback) {
  return Boolean(callback(editor.chain().focus(undefined, focusOptions)).run());
}

function withStoredSelection(chain, payload) {
  const from = Number(payload?.selection?.from);
  const to = Number(payload?.selection?.to);

  if (Number.isInteger(from) && Number.isInteger(to) && from !== to) {
    return chain.setTextSelection({ from, to });
  }

  return chain;
}

function simpleCommand(name, label, can, run, active = () => false) {
  return Object.freeze({
    name,
    label,
    disabledReason: `${label} is unavailable for the current selection.`,
    active,
    can,
    run,
  });
}

function activeBlock(editor, payload = {}) {
  if (payload?.block?.active) {
    return payload.block;
  }

  return createBlockSelectionState(editor);
}

function blockNode(editor, block) {
  return block?.active ? editor.state.doc.nodeAt(block.from) : null;
}

function topLevelBlock(editor, payload = {}) {
  const block = activeBlock(editor, payload);
  const node = blockNode(editor, block);

  if (!block.active || block.depth !== 1 || !node) {
    return null;
  }

  return { block, node };
}

function canUseTopLevelBlock(editor, payload = {}) {
  return topLevelBlock(editor, payload) !== null;
}

function focusBlock(editor, position) {
  editor.commands.focus(undefined, focusOptions);

  if (Number.isInteger(position)) {
    editor.commands.setTextSelection(Math.max(1, position));
  }
}

function dispatchBlockTransaction(editor, transaction, focusPosition) {
  editor.view.dispatch(transaction);
  focusBlock(editor, focusPosition);

  return true;
}

function selectBlock(editor, payload = {}) {
  const target = topLevelBlock(editor, payload);

  if (!target) {
    return false;
  }

  focusBlock(editor, target.block.from + 1);

  return true;
}

function insertParagraph(editor, payload = {}, placement = 'after') {
  const target = topLevelBlock(editor, payload);

  if (!target) {
    return false;
  }

  const position = placement === 'before' ? target.block.from : target.block.to;
  const paragraph = editor.schema.nodes.paragraph.create();
  const transaction = editor.state.tr.insert(position, paragraph);

  return dispatchBlockTransaction(editor, transaction, position + 1);
}

function duplicateBlock(editor, payload = {}) {
  const target = topLevelBlock(editor, payload);

  if (!target) {
    return false;
  }

  const position = target.block.to;
  const transaction = editor.state.tr.insert(position, target.node.copy(target.node.content));

  return dispatchBlockTransaction(editor, transaction, position + 1);
}

function deleteBlock(editor, payload = {}) {
  const target = topLevelBlock(editor, payload);

  if (!target) {
    return false;
  }

  const fallback = editor.schema.nodes.paragraph.create();
  let transaction = editor.state.tr.delete(target.block.from, target.block.to);

  if (transaction.doc.childCount === 0) {
    transaction = transaction.insert(0, fallback);
  }

  return dispatchBlockTransaction(editor, transaction, Math.max(1, target.block.from + 1));
}

function moveBlock(editor, payload = {}, direction = 'up') {
  const target = topLevelBlock(editor, payload);

  if (!target) {
    return false;
  }

  if (direction === 'up' && !target.block.canMoveUp) {
    return false;
  }

  if (direction === 'down' && !target.block.canMoveDown) {
    return false;
  }

  if (direction === 'up') {
    const previous = editor.state.doc.child(target.block.index - 1);
    const insertAt = target.block.from - previous.nodeSize;
    const transaction = editor.state.tr
      .delete(target.block.from, target.block.to)
      .insert(insertAt, target.node);

    return dispatchBlockTransaction(editor, transaction, insertAt + 1);
  }

  const next = editor.state.doc.child(target.block.index + 1);
  const insertAt = target.block.from + next.nodeSize;
  const transaction = editor.state.tr
    .delete(target.block.from, target.block.to)
    .insert(insertAt, target.node);

  return dispatchBlockTransaction(editor, transaction, insertAt + 1);
}

function topLevelPositionAt(doc, index) {
  const ranges = topLevelBlockRanges({ state: { doc } });

  if (index <= 0) {
    return 0;
  }

  if (index >= ranges.length) {
    return ranges.at(-1)?.to ?? 0;
  }

  return ranges[index]?.from ?? 0;
}

function normalizedTopLevelDropIndex(editor, payload = {}) {
  const target = topLevelBlock(editor, payload);
  const toIndex = Number(payload?.toIndex);

  if (!target || !Number.isInteger(toIndex)) {
    return null;
  }

  const childCount = editor.state.doc.childCount;

  if (toIndex < 0 || toIndex > childCount) {
    return null;
  }

  if (toIndex === target.block.index || toIndex === target.block.index + 1) {
    return null;
  }

  return {
    adjustedIndex: toIndex > target.block.index ? toIndex - 1 : toIndex,
    target,
    toIndex,
  };
}

function canMoveBlockToIndex(editor, payload = {}) {
  return normalizedTopLevelDropIndex(editor, payload) !== null;
}

function moveBlockToIndex(editor, payload = {}) {
  const movement = normalizedTopLevelDropIndex(editor, payload);

  if (!movement) {
    return false;
  }

  const transaction = editor.state.tr.delete(
    movement.target.block.from,
    movement.target.block.to,
  );
  const insertAt = topLevelPositionAt(transaction.doc, movement.adjustedIndex);

  return dispatchBlockTransaction(
    editor,
    transaction.insert(insertAt, movement.target.node.copy(movement.target.node.content)),
    insertAt + 1,
  );
}

function insertManifestBlock(editor, payload = {}) {
  const insert = blockInsertPayload(payload.item);
  const block = activeBlock(editor, payload);

  if (!insert.valid || !block.active) {
    return false;
  }

  const node = editor.schema.nodeFromJSON(insert.node);
  const position = payload.placement === 'before' ? block.from : block.to;
  const transaction = payload.placement === 'replace'
    ? editor.state.tr.replaceWith(block.from, block.to, node)
    : editor.state.tr.insert(position, node);
  const focusPosition = payload.placement === 'replace' ? block.from + 1 : position + 1;

  return dispatchBlockTransaction(editor, transaction, focusPosition);
}

function valueAtPath(source, path) {
  const segments = String(path ?? '')
    .split('.')
    .filter(Boolean);
  const effective = segments[0] === 'attrs' ? segments.slice(1) : segments;

  return effective.reduce(
    (value, segment) => (value && typeof value === 'object' ? value[segment] : undefined),
    source,
  );
}

function setValueAtPath(source, path, value) {
  const segments = String(path ?? '').split('.').filter(Boolean);

  if (segments[0] !== 'attrs' || segments.length < 2) {
    return { ...source };
  }

  const next = { ...source };
  let cursor = next;

  for (const segment of segments.slice(1, -1)) {
    cursor[segment] = cursor[segment] && typeof cursor[segment] === 'object' && !Array.isArray(cursor[segment])
      ? { ...cursor[segment] }
      : {};
    cursor = cursor[segment];
  }

  cursor[segments.at(-1)] = value;

  return next;
}

function updateBlockAttrs(editor, payload = {}) {
  const target = topLevelBlock(editor, payload);

  if (!target || typeof payload.path !== 'string') {
    return false;
  }

  const nextAttrs = setValueAtPath(target.node.attrs ?? {}, payload.path, payload.value);

  if (JSON.stringify(nextAttrs) === JSON.stringify(target.node.attrs ?? {})) {
    return true;
  }

  const transaction = editor.state.tr.setNodeMarkup(
    target.block.from,
    undefined,
    nextAttrs,
    target.node.marks,
  );

  return dispatchBlockTransaction(editor, transaction, target.block.from + 1);
}

const definitions = [
  simpleCommand(
    'focus',
    'Focus',
    (editor) => canRun(editor, (candidate) => !candidate.isDestroyed),
    (editor) => Boolean(editor.commands.focus(undefined, focusOptions)),
  ),
  simpleCommand(
    'selectBlock',
    'Select block',
    (editor, payload) => canUseTopLevelBlock(editor, payload),
    (editor, payload) => selectBlock(editor, payload),
  ),
  simpleCommand(
    'toggleBold',
    'Bold',
    (editor) => chainCan(editor, (chain) => chain.toggleBold().run()),
    (editor) => runChain(editor, (chain) => chain.toggleBold()),
    (editor) => Boolean(editor.isActive('bold')),
  ),
  simpleCommand(
    'toggleItalic',
    'Italic',
    (editor) => chainCan(editor, (chain) => chain.toggleItalic().run()),
    (editor) => runChain(editor, (chain) => chain.toggleItalic()),
    (editor) => Boolean(editor.isActive('italic')),
  ),
  simpleCommand(
    'setLink',
    'Link',
    (editor, payload) => {
      const link = linkAttributes(payload);

      return link.valid && chainCan(editor, (chain) => withStoredSelection(chain, payload)
        .extendMarkRange('link')
        .setLink(link.attrs)
        .run());
    },
    (editor, payload) => {
      const link = linkAttributes(payload);

      if (!link.valid) {
        return false;
      }

      return runChain(editor, (chain) => withStoredSelection(chain, payload)
        .extendMarkRange('link')
        .setLink(link.attrs));
    },
    (editor) => Boolean(editor.isActive('link')),
  ),
  simpleCommand(
    'unsetLink',
    'Unlink',
    (editor, payload) => chainCan(editor, (chain) => withStoredSelection(chain, payload)
      .extendMarkRange('link')
      .unsetLink()
      .run()),
    (editor, payload) => runChain(editor, (chain) => withStoredSelection(chain, payload)
      .extendMarkRange('link')
      .unsetLink()),
    (editor) => Boolean(editor.isActive('link')),
  ),
  simpleCommand(
    'duplicateBlock',
    'Duplicate',
    (editor, payload) => canUseTopLevelBlock(editor, payload),
    (editor, payload) => duplicateBlock(editor, payload),
  ),
  simpleCommand(
    'deleteBlock',
    'Delete',
    (editor, payload) => canUseTopLevelBlock(editor, payload),
    (editor, payload) => deleteBlock(editor, payload),
  ),
  simpleCommand(
    'insertBlockBefore',
    'Insert before',
    (editor, payload) => canUseTopLevelBlock(editor, payload),
    (editor, payload) => insertParagraph(editor, payload, 'before'),
  ),
  simpleCommand(
    'insertBlockAfter',
    'Insert after',
    (editor, payload) => canUseTopLevelBlock(editor, payload),
    (editor, payload) => insertParagraph(editor, payload, 'after'),
  ),
  simpleCommand(
    'moveBlockUp',
    'Move up',
    (editor, payload) => Boolean(topLevelBlock(editor, payload)?.block.canMoveUp),
    (editor, payload) => moveBlock(editor, payload, 'up'),
  ),
  simpleCommand(
    'moveBlockDown',
    'Move down',
    (editor, payload) => Boolean(topLevelBlock(editor, payload)?.block.canMoveDown),
    (editor, payload) => moveBlock(editor, payload, 'down'),
  ),
  simpleCommand(
    'moveBlockToIndex',
    'Move block',
    (editor, payload) => canMoveBlockToIndex(editor, payload),
    (editor, payload) => moveBlockToIndex(editor, payload),
  ),
  simpleCommand(
    'insertManifestBlock',
    'Insert block',
    (editor, payload) => blockInsertPayload(payload?.item).valid && activeBlock(editor, payload).active,
    (editor, payload) => insertManifestBlock(editor, payload),
  ),
  simpleCommand(
    'updateBlockAttrs',
    'Update block settings',
    (editor, payload) => {
      const target = topLevelBlock(editor, payload);

      return Boolean(target && typeof payload?.path === 'string' && payload.path.startsWith('attrs.')
        && valueAtPath(target.node.attrs ?? {}, payload.path) !== payload.value);
    },
    (editor, payload) => updateBlockAttrs(editor, payload),
  ),
  simpleCommand(
    'setParagraph',
    'Paragraph',
    (editor) => chainCan(editor, (chain) => chain.setParagraph().run()),
    (editor) => runChain(editor, (chain) => chain.setParagraph()),
    (editor) => Boolean(editor.isActive('paragraph')),
  ),
  simpleCommand(
    'setHeading',
    'Heading',
    (editor, payload) => chainCan(editor, (chain) => chain.setHeading({ level: normalLevel(payload) }).run()),
    (editor, payload) => runChain(editor, (chain) => chain.setHeading({ level: normalLevel(payload) })),
    (editor, payload) => Boolean(editor.isActive('heading', { level: normalLevel(payload) })),
  ),
  simpleCommand(
    'setBlockquote',
    'Quote',
    (editor) => chainCan(editor, (chain) => chain.toggleBlockquote().run()),
    (editor) => runChain(editor, (chain) => chain.toggleBlockquote()),
    (editor) => Boolean(editor.isActive('blockquote')),
  ),
  simpleCommand(
    'setCodeBlock',
    'Code',
    (editor) => chainCan(editor, (chain) => chain.setCodeBlock().run()),
    (editor) => runChain(editor, (chain) => chain.setCodeBlock()),
    (editor) => Boolean(editor.isActive('codeBlock')),
  ),
  simpleCommand(
    'toggleBulletList',
    'List',
    (editor) => chainCan(editor, (chain) => chain.toggleBulletList().run()),
    (editor) => runChain(editor, (chain) => chain.toggleBulletList()),
    (editor) => Boolean(editor.isActive('bulletList')),
  ),
  simpleCommand(
    'undo',
    'Undo',
    (editor) => chainCan(editor, (chain) => chain.undo().run()),
    (editor) => runChain(editor, (chain) => chain.undo()),
  ),
  simpleCommand(
    'redo',
    'Redo',
    (editor) => chainCan(editor, (chain) => chain.redo().run()),
    (editor) => runChain(editor, (chain) => chain.redo()),
  ),
];

export class CommandRegistry {
  constructor(editor, commands = definitions) {
    this.editor = editor;
    this.commands = new Map(commands.map((command) => [command.name, command]));
  }

  has(name) {
    return this.commands.has(name);
  }

  state(name, payload = {}) {
    const command = this.command(name);

    return commandState(command, this.editor, payload);
  }

  snapshot(payloads = {}) {
    return Object.freeze([...this.commands.keys()].map((name) => this.state(name, payloads[name] ?? {})));
  }

  run(name, payload = {}) {
    const command = this.command(name);

    if (!command.can(this.editor, payload)) {
      return result(command, this.editor, payload, false);
    }

    return result(command, this.editor, payload, command.run(this.editor, payload));
  }

  command(name) {
    const command = this.commands.get(name);

    if (!command) {
      throw new Error(`Unknown Laravel Blocks command [${name}].`);
    }

    return command;
  }
}

export function createDefaultCommandRegistry(editor) {
  return new CommandRegistry(editor);
}
