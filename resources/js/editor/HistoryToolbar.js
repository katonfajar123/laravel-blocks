import { h, nextTick } from 'vue';

import { Button, Toolbar, ToolbarGroup } from '../ui/index.js';

function commandState(registry, command) {
  return registry?.state?.(command) ?? {
    active: false,
    disabledReason: `${command} is unavailable.`,
    enabled: false,
  };
}

export const HistoryToolbar = {
  name: 'LaravelBlocksHistoryToolbar',
  props: {
    commandRegistry: {
      type: Object,
      default: null,
    },
    editor: {
      type: Object,
      default: null,
    },
    stateVersion: {
      type: Number,
      default: 0,
    },
  },
  setup(props, { expose }) {
    function run(command) {
      const result = props.commandRegistry?.run?.(command) ?? { executed: false };

      if (result.executed) {
        nextTick(() => props.editor?.commands?.focus?.());
      }

      return result;
    }

    function historyButton(command, label, shortcut) {
      const state = commandState(props.commandRegistry, command);

      return h(Button, {
        'aria-label': label,
        disabled: !state.enabled,
        size: 'sm',
        title: state.disabledReason || `${label} (${shortcut})`,
        variant: 'ghost',
        'data-laravel-blocks-history-command': command,
        onClick: () => run(command),
        onMousedown: (event) => event.preventDefault(),
      }, {
        default: () => label,
      });
    }

    expose({
      run,
    });

    return () => h('div', {
      class: 'lb-history-toolbar',
      'data-laravel-blocks-history-toolbar': '',
      'data-laravel-blocks-state-version': props.stateVersion,
    }, [
      h(Toolbar, {
        label: 'Document history',
      }, {
        default: () => [
          h(ToolbarGroup, {
            label: 'History',
          }, {
            default: () => [
              historyButton('undo', 'Undo', 'Ctrl/Cmd+Z'),
              historyButton('redo', 'Redo', 'Ctrl/Cmd+Shift+Z'),
            ],
          }),
        ],
      }),
    ]);
  },
};
