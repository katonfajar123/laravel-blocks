import { h, nextTick, ref, watch } from 'vue';

import { Button } from '../ui/index.js';
import { linkAttributes } from './link-provider.js';
import { richTextToolbarStyle } from './toolbar.js';

export function linkErrorMessage(reason) {
  return {
    empty: 'Enter a URL before applying the link.',
    invalid_url: 'Enter a valid URL.',
    unsafe_scheme: 'Use http, https, mailto, tel, /, or # links.',
  }[reason] ?? 'Enter a valid URL.';
}

export function currentLinkForm(editor) {
  const attrs = editor?.getAttributes?.('link') ?? {};

  return Object.freeze({
    href: attrs.href ?? '',
    openInNewTab: attrs.target === '_blank',
  });
}

export const LinkPopover = {
  name: 'LaravelBlocksLinkPopover',
  props: {
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
    selection: {
      type: Object,
      default: null,
    },
  },
  emits: ['close'],
  setup(props, { emit, expose }) {
    const error = ref('');
    const href = ref('');
    const input = ref(null);
    const openInNewTab = ref(false);
    const popover = ref(null);
    const style = ref({});

    function focusEditor() {
      props.editor?.commands?.focus?.();
    }

    function close(reason = 'programmatic') {
      error.value = '';
      emit('close', reason);
      nextTick(focusEditor);
    }

    function resetFromEditor() {
      const form = currentLinkForm(props.editor);
      href.value = form.href;
      openInNewTab.value = form.openInNewTab;
      error.value = '';
    }

    function updatePosition() {
      if (!props.open) {
        style.value = {};

        return;
      }

      const rect = popover.value?.getBoundingClientRect?.() ?? { height: 150, width: 320 };
      style.value = richTextToolbarStyle({
        editor: props.editor,
        placement: 'bottom',
        selection: props.selection,
        toolbarRect: rect,
      });
    }

    function apply() {
      const link = linkAttributes({
        href: href.value,
        openInNewTab: openInNewTab.value,
      });

      if (!link.valid) {
        error.value = linkErrorMessage(link.reason);

        return Object.freeze({
          executed: false,
          reason: link.reason,
        });
      }

      const result = props.commandRegistry?.run?.('setLink', {
        href: link.href,
        openInNewTab: openInNewTab.value,
        selection: props.selection,
      }) ?? { executed: false };

      if (result.executed) {
        close('apply');
      }

      return result;
    }

    function unlink() {
      const result = props.commandRegistry?.run?.('unsetLink', {
        selection: props.selection,
      }) ?? { executed: false };

      if (result.executed) {
        href.value = '';
        openInNewTab.value = false;
        close('unlink');
      }

      return result;
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close('escape');
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        apply();
      }
    }

    watch(() => props.open, (open) => {
      if (!open) {
        return;
      }

      resetFromEditor();
      nextTick(() => {
        updatePosition();
        input.value?.focus?.({ preventScroll: true });
      });
    }, { immediate: true });

    watch(() => [props.selection?.from, props.selection?.to], () => nextTick(updatePosition));

    expose({
      apply,
      close,
      unlink,
    });

    return () => h('div', {
      'aria-label': 'Edit link',
      class: 'lb-ui-popover lb-link-popover',
      'data-laravel-blocks-link-popover': '',
      'data-laravel-blocks-state': props.open ? 'open' : 'closed',
      hidden: !props.open,
      ref: popover,
      role: 'dialog',
      style: style.value,
    }, [
      h('label', {
        class: 'lb-link-popover__field',
      }, [
        h('span', 'URL'),
        h('input', {
          'aria-describedby': error.value ? 'lb-link-popover-error' : undefined,
          'aria-invalid': error.value ? 'true' : 'false',
          class: 'lb-link-popover__input',
          'data-laravel-blocks-link-input': '',
          onInput: (event) => {
            href.value = event.target.value;
            error.value = '';
          },
          onKeydown,
          placeholder: 'Paste or type URL',
          ref: input,
          type: 'url',
          value: href.value,
        }),
      ]),
      h('label', {
        class: 'lb-link-popover__toggle',
      }, [
        h('input', {
          checked: openInNewTab.value,
          'data-laravel-blocks-link-target': '',
          onChange: (event) => {
            openInNewTab.value = event.target.checked;
          },
          type: 'checkbox',
        }),
        h('span', 'Open in new tab'),
      ]),
      error.value
        ? h('p', {
          class: 'lb-link-popover__error',
          'data-laravel-blocks-link-error': '',
          id: 'lb-link-popover-error',
        }, error.value)
        : null,
      h('div', {
        class: 'lb-link-popover__actions',
      }, [
        h(Button, {
          'data-laravel-blocks-link-unlink': '',
          onClick: unlink,
          variant: 'ghost',
        }, {
          default: () => 'Unlink',
        }),
        h(Button, {
          'data-laravel-blocks-link-apply': '',
          onClick: apply,
          variant: 'primary',
        }, {
          default: () => 'Apply',
        }),
      ]),
    ]);
  },
};
