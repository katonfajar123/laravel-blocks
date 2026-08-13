import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { Icon, IconButton, blockIconName, targetIsInside } from '../ui/index.js';
import { blockRect } from './block-selection.js';
import { blockInserterItems, filterBlockInserterItems } from './manifest.js';

function groupedItems(items) {
  const groups = new Map();

  for (const item of items) {
    if (!groups.has(item.category)) {
      groups.set(item.category, {
        label: item.categoryLabel,
        name: item.category,
        items: [],
      });
    }

    groups.get(item.category).items.push(item);
  }

  return [...groups.values()];
}

export const BlockInserter = {
  name: 'LaravelBlocksBlockInserter',
  props: {
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
  },
  setup(props, { expose }) {
    const activeIndex = ref(0);
    const input = ref(null);
    const open = ref(false);
    const placement = ref('bottom');
    const query = ref('');
    const root = ref(null);
    const rootStyle = ref({});

    const items = computed(() => blockInserterItems(props.manifest));
    const filtered = computed(() => filterBlockInserterItems(items.value, query.value));
    const groups = computed(() => groupedItems(filtered.value));
    const activeItem = computed(() => filtered.value[activeIndex.value] ?? null);

    function updatePosition() {
      const rect = blockRect(props.editor, props.block);

      if (!rect) {
        rootStyle.value = {};

        return;
      }

      const viewportPadding = 8;
      const buttonSize = 40;
      const gap = 8;
      const viewportWidth = globalThis.window?.innerWidth ?? 1024;
      const viewportHeight = globalThis.window?.innerHeight ?? 768;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - buttonSize),
        viewportWidth - buttonSize - viewportPadding,
      );
      const top = Math.min(
        Math.max(viewportPadding, rect.bottom + gap),
        viewportHeight - buttonSize - viewportPadding,
      );

      placement.value = top + buttonSize + 420 > viewportHeight ? 'top' : 'bottom';
      rootStyle.value = Object.freeze({
        left: `${Math.round(left)}px`,
        position: 'fixed',
        top: `${Math.round(top)}px`,
      });
    }

    function close(reason = 'programmatic') {
      open.value = false;
      query.value = '';
      activeIndex.value = 0;
      globalThis.document?.dispatchEvent?.(new CustomEvent('laravel-blocks:overlay-close', {
        detail: {
          reason,
          source: 'block-inserter',
        },
      }));

      if (reason !== 'insert') {
        props.commandRegistry?.run?.('focus');
      }
    }

    function show() {
      open.value = true;
      updatePosition();
      globalThis.document?.dispatchEvent?.(new CustomEvent('laravel-blocks:overlay-open', {
        detail: {
          source: 'block-inserter',
        },
      }));
      nextTick(() => input.value?.focus?.({ preventScroll: true }));
    }

    function toggle() {
      if (open.value) {
        close('toggle');

        return;
      }

      show();
    }

    function handleOutsidePointer(event) {
      if (!open.value || targetIsInside(event.target, [root.value])) {
        return;
      }

      close('outside-pointer');
    }

    function insert(item = activeItem.value) {
      if (!item?.supported) {
        return {
          executed: false,
          reason: item?.disabledReason || 'No block selected.',
        };
      }

      const result = props.commandRegistry?.run?.('insertManifestBlock', {
        block: props.block,
        item,
        placement: 'after',
      }) ?? { executed: false };

      if (result.executed) {
        close('insert');
      }

      return result;
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close('escape');
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeIndex.value = Math.min(activeIndex.value + 1, Math.max(0, filtered.value.length - 1));
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex.value = Math.max(0, activeIndex.value - 1);
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        insert();
      }
    }

    watch(filtered, () => {
      activeIndex.value = 0;
    });

    onMounted(() => {
      globalThis.document?.addEventListener?.('pointerdown', handleOutsidePointer, true);
      globalThis.addEventListener?.('resize', updatePosition);
      globalThis.addEventListener?.('scroll', updatePosition, true);
      nextTick(updatePosition);
    });

    onBeforeUnmount(() => {
      globalThis.document?.removeEventListener?.('pointerdown', handleOutsidePointer, true);
      globalThis.removeEventListener?.('resize', updatePosition);
      globalThis.removeEventListener?.('scroll', updatePosition, true);
    });

    watch(
      () => [
        props.block.active,
        props.block.from,
        props.block.to,
        props.block.index,
        props.editor,
      ],
      () => nextTick(updatePosition),
      { immediate: true },
    );

    expose({
      close,
      insert,
      isOpen() {
        return open.value;
      },
      items() {
        return items.value;
      },
      open: show,
    });

    return () => h('div', {
      class: 'lb-block-inserter lb-block-inserter--trailing',
      'data-laravel-blocks-block-appender-root': '',
      'data-laravel-blocks-block-appender-placement': placement.value,
      'data-laravel-blocks-block-inserter-root': '',
      ref: root,
      style: rootStyle.value,
    }, [
      h(IconButton, {
        'aria-expanded': open.value ? 'true' : 'false',
        'aria-haspopup': 'dialog',
        class: 'lb-block-inserter__button',
        'data-laravel-blocks-block-appender': '',
        label: 'Add block',
        onClick: toggle,
        title: 'Add block after the final block',
        variant: 'ghost',
      }, {
        default: () => h(Icon, { name: 'plus' }),
      }),
      h('div', {
        'aria-label': 'Block inserter',
        class: 'lb-ui-popover lb-block-inserter__popover',
        'data-laravel-blocks-block-inserter': '',
        hidden: !open.value,
        role: 'dialog',
      }, [
        h('div', {
          class: 'lb-block-inserter__search',
        }, [
          h(Icon, {
            name: 'search',
            size: 22,
          }),
          h('input', {
            'aria-label': 'Search blocks',
            'data-laravel-blocks-block-search': '',
            onInput: (event) => {
              query.value = event.target.value;
            },
            onKeydown,
            placeholder: 'Search blocks',
            ref: input,
            type: 'search',
            value: query.value,
          }),
        ]),
        filtered.value.length === 0
          ? h('p', {
            class: 'lb-block-inserter__empty',
            'data-laravel-blocks-block-inserter-empty': '',
          }, 'No matching blocks.')
          : h('div', {
            class: 'lb-block-inserter__groups',
          }, groups.value.map((group) => h('section', {
            class: 'lb-block-inserter__group',
            'data-laravel-blocks-block-category': group.name,
          }, [
            h('h3', group.label),
            h('div', {
              class: 'lb-block-inserter__items',
              role: 'listbox',
            }, group.items.map((item) => {
              const index = filtered.value.indexOf(item);

              return h('button', {
                'aria-disabled': item.supported ? 'false' : 'true',
                class: [
                  'lb-block-inserter__item',
                  index === activeIndex.value ? 'lb-block-inserter__item--active' : null,
                ].filter(Boolean),
                'data-laravel-blocks-block-inserter-item': item.name,
                'data-laravel-blocks-block-inserter-item-state': index === activeIndex.value ? 'active' : 'idle',
                'data-laravel-blocks-block-inserter-disabled-reason': item.disabledReason,
                disabled: !item.supported,
                onClick: () => insert(item),
                role: 'option',
                title: item.disabledReason || item.description || item.label,
                type: 'button',
              }, [
                h(Icon, {
                  name: blockIconName(item.name),
                  size: 18,
                }),
                h('span', {
                  class: 'lb-block-inserter__item-label',
                }, item.label),
                item.description
                  ? h('span', {
                    class: 'lb-block-inserter__item-description',
                  }, item.description)
                  : null,
              ]);
            })),
          ]))),
        h('button', {
          class: 'lb-block-inserter__browse',
          'data-laravel-blocks-block-browse-all': '',
          onClick: (event) => {
            event.preventDefault();
            input.value?.focus?.({ preventScroll: true });
          },
          type: 'button',
        }, 'Browse all'),
      ]),
    ]);
  },
};
