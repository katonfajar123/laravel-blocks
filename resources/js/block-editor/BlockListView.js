import { h, nextTick, ref, watch } from 'vue';

import { Icon, IconButton, blockIconName } from '../ui/index.js';
import { documentListItems } from './block-list.js';

function commandState(commandRegistry, name, block) {
  return commandRegistry?.state?.(name, { block }) ?? {
    enabled: false,
    disabledReason: `${name} is unavailable.`,
  };
}

export const BlockListView = {
  name: 'LaravelBlocksBlockListView',
  props: {
    block: {
      type: Object,
      default: () => ({ active: false }),
    },
    commandRegistry: {
      type: Object,
      default: null,
    },
    editor: {
      type: Object,
      default: null,
    },
    open: {
      type: Boolean,
      default: false,
    },
    stateVersion: {
      type: Number,
      default: 0,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const root = ref(null);

    function items() {
      return documentListItems(props.editor, props.block);
    }

    function itemButton(index) {
      return root.value?.querySelector(`[data-laravel-blocks-document-list-item-index="${index}"]`) ?? null;
    }

    function focusItem(index) {
      nextTick(() => itemButton(index)?.focus());
    }

    function focusInitialItem() {
      nextTick(() => {
        const currentItems = items();
        const target = currentItems.find((item) => item.selected) ?? currentItems[0];
        const targetControl = target
          ? itemButton(target.index)
          : root.value?.querySelector('[data-laravel-blocks-document-list-close]');

        targetControl?.focus();
      });
    }

    function close() {
      emit('close');
    }

    function runCommand(name, block) {
      return props.commandRegistry?.run?.(name, { block }) ?? { executed: false };
    }

    function focusAdjacent(item, offset) {
      const currentItems = items();
      const currentIndex = currentItems.findIndex((candidate) => candidate.index === item.index);
      const next = currentItems[Math.min(
        currentItems.length - 1,
        Math.max(0, currentIndex + offset),
      )];

      if (next) {
        focusItem(next.index);
      }
    }

    function onItemKeydown(event, item) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusAdjacent(item, 1);
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusAdjacent(item, -1);
      }

      if (event.key === 'Home') {
        event.preventDefault();
        focusItem(items()[0]?.index);
      }

      if (event.key === 'End') {
        event.preventDefault();
        focusItem(items().at(-1)?.index);
      }
    }

    watch(() => props.open, (open) => {
      if (open) {
        focusInitialItem();
      }
    });

    watch(() => [props.block?.index, props.stateVersion], () => {
      if (props.open && root.value?.contains(document.activeElement)) {
        focusInitialItem();
      }
    });

    function renderMoveButton(item, name, icon, label) {
      const state = commandState(props.commandRegistry, name, item);

      return h(IconButton, {
        class: 'lb-block-list-view__move',
        disabled: !state.enabled,
        label,
        title: state.disabledReason ?? label,
        variant: 'ghost',
        'data-laravel-blocks-document-list-command': name,
        'data-laravel-blocks-document-list-command-index': String(item.index),
        onClick: (event) => {
          event.stopPropagation();
          runCommand(name, item);
        },
      }, {
        default: () => h(Icon, { name: icon }),
      });
    }

    function renderItem(item) {
      return h('div', {
        class: [
          'lb-block-list-view__row',
          item.selected ? 'lb-block-list-view__row--selected' : null,
        ],
        role: 'listitem',
        'data-laravel-blocks-document-list-row': '',
        'data-laravel-blocks-document-list-row-index': String(item.index),
      }, [
        h('button', {
          'aria-current': item.selected ? 'true' : undefined,
          class: 'lb-block-list-view__item',
          type: 'button',
          'data-laravel-blocks-document-list-item': item.type,
          'data-laravel-blocks-document-list-item-index': String(item.index),
          'data-laravel-blocks-document-list-item-selected': item.selected ? 'true' : 'false',
          onClick: () => runCommand('selectBlock', item),
          onKeydown: (event) => onItemKeydown(event, item),
        }, [
          h(Icon, { name: blockIconName(item.type) }),
          h('span', { class: 'lb-block-list-view__copy' }, [
            h('span', {
              class: 'lb-block-list-view__label',
              'data-laravel-blocks-document-list-label': '',
            }, item.label),
            h('span', {
              class: 'lb-block-list-view__preview',
              'data-laravel-blocks-document-list-preview': '',
            }, item.preview),
          ]),
        ]),
        h('div', {
          class: 'lb-block-list-view__actions',
          role: 'group',
          'aria-label': `${item.label} movement`,
        }, [
          renderMoveButton(item, 'moveBlockUp', 'arrowUp', `Move ${item.label} up`),
          renderMoveButton(item, 'moveBlockDown', 'arrowDown', `Move ${item.label} down`),
        ]),
      ]);
    }

    return () => {
      void props.stateVersion;

      const currentItems = items();

      return h('aside', {
        ref: root,
        'aria-label': 'Document list view',
        class: 'lb-block-list-view',
        hidden: !props.open,
        role: 'region',
        'data-laravel-blocks-document-list': '',
        onKeydown: (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        },
      }, [
        h('div', {
          class: 'lb-block-list-view__header',
        }, [
          h('div', {
            class: 'lb-block-list-view__title',
            'data-laravel-blocks-document-list-title': '',
          }, 'List View'),
          h(IconButton, {
            label: 'Close document list view',
            title: 'Close document list view',
            variant: 'ghost',
            'data-laravel-blocks-document-list-close': '',
            onClick: () => close(),
          }, {
            default: () => h(Icon, { name: 'x' }),
          }),
        ]),
        currentItems.length === 0
          ? h('p', {
            class: 'lb-block-list-view__empty',
            'data-laravel-blocks-document-list-empty': '',
          }, 'No blocks yet.')
          : h('div', {
            'aria-label': 'Top-level blocks',
            class: 'lb-block-list-view__items',
            role: 'list',
          }, currentItems.map((item) => renderItem(item))),
      ]);
    };
  },
};
