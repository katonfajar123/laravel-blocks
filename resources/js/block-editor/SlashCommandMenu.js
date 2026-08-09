import { computed, h } from 'vue';

import { blockInserterItems, filterBlockInserterItems } from './manifest.js';
import { blockRect } from './block-selection.js';
import { Icon, blockIconName } from '../ui/index.js';

export function slashCommandItems(manifest, query = '') {
  return filterBlockInserterItems(blockInserterItems(manifest), query);
}

export function slashCommandStyle(editor, block) {
  const rect = blockRect(editor, block);

  if (!rect) {
    return Object.freeze({});
  }

  return Object.freeze({
    left: `${Math.round(rect.left)}px`,
    position: 'fixed',
    top: `${Math.round(rect.bottom + 8)}px`,
  });
}

export const SlashCommandMenu = {
  name: 'LaravelBlocksSlashCommandMenu',
  props: {
    activeIndex: {
      type: Number,
      default: 0,
    },
    block: {
      type: Object,
      required: true,
    },
    commandRegistry: {
      type: Object,
      default: null,
    },
    editor: {
      type: Object,
      default: null,
    },
    manifest: {
      type: Object,
      default: () => ({}),
    },
    open: {
      type: Boolean,
      default: false,
    },
    query: {
      type: String,
      default: '',
    },
  },
  emits: ['close', 'insert'],
  setup(props, { emit, expose }) {
    const items = computed(() => slashCommandItems(props.manifest, props.query));

    function insert(item = items.value[props.activeIndex] ?? null) {
      if (!item?.supported) {
        return {
          executed: false,
          reason: item?.disabledReason || 'No slash command selected.',
        };
      }

      const result = props.commandRegistry?.run?.('insertManifestBlock', {
        block: props.block,
        item,
        placement: 'replace',
      }) ?? { executed: false };

      if (result.executed) {
        emit('insert', item);
      }

      return result;
    }

    expose({
      insert,
      items() {
        return items.value;
      },
    });

    return () => h('div', {
      'aria-label': 'Slash commands',
      class: 'lb-ui-popover lb-slash-command',
      'data-laravel-blocks-slash-command': '',
      'data-laravel-blocks-state': props.open ? 'open' : 'closed',
      hidden: !props.open,
      role: 'dialog',
      style: slashCommandStyle(props.editor, props.block),
    }, [
      h('div', {
        class: 'lb-slash-command__query',
        'data-laravel-blocks-slash-query': props.query,
      }, props.query === '' ? 'Type to search blocks' : `/${props.query}`),
      items.value.length === 0
        ? h('p', {
          class: 'lb-slash-command__empty',
          'data-laravel-blocks-slash-empty': '',
        }, 'No matching blocks.')
        : h('div', {
          class: 'lb-slash-command__items',
          role: 'listbox',
        }, items.value.map((item, index) => h('button', {
          'aria-disabled': item.supported ? 'false' : 'true',
          class: [
            'lb-slash-command__item',
            index === props.activeIndex ? 'lb-slash-command__item--active' : null,
          ].filter(Boolean),
          'data-laravel-blocks-slash-item': item.name,
          'data-laravel-blocks-slash-item-state': index === props.activeIndex ? 'active' : 'idle',
          'data-laravel-blocks-slash-disabled-reason': item.disabledReason,
          disabled: !item.supported,
          onClick: () => insert(item),
          onMousedown: (event) => event.preventDefault(),
          role: 'option',
          title: item.disabledReason || item.description || item.label,
          type: 'button',
        }, [
          h(Icon, {
            name: blockIconName(item.name),
            size: 19,
          }),
          h('span', {
            class: 'lb-slash-command__item-label',
          }, item.label),
          item.description
            ? h('span', {
              class: 'lb-slash-command__item-description',
            }, item.description)
            : null,
        ]))),
    ]);
  },
};
