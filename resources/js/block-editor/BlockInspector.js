import { computed, h, ref, watch } from 'vue';
import { Button, Icon } from '../ui/index.js';
import { mediaContextsForBlock } from '../media/context.js';

import {
  blockManifestDefinition,
  coerceInspectorFieldValue,
  inspectorFieldValue,
  inspectorFieldsForBlock,
  inspectorGroups,
} from './fields.js';

function controlForField(field, value, update) {
  const common = {
    'aria-label': field.label,
    'data-laravel-blocks-inspector-field': field.name,
    id: `lb-inspector-field-${field.name}`,
  };

  if (field.type === 'textarea') {
    return h('textarea', {
      ...common,
      onInput: (event) => update(event.target.value),
      placeholder: field.ui.placeholder,
      value,
    });
  }

  if (field.type === 'select' && Array.isArray(field.constraints.allowedValues)) {
    return h('select', {
      ...common,
      onChange: (event) => update(event.target.value),
      value: String(value),
    }, field.constraints.allowedValues.map((option) => h('option', {
      value: String(option),
    }, String(option))));
  }

  if (['checkbox', 'toggle'].includes(field.type)) {
    return h('input', {
      ...common,
      checked: Boolean(value),
      onChange: (event) => update(event.target.checked),
      type: 'checkbox',
    });
  }

  if (['color', 'number', 'range'].includes(field.type)) {
    return h('input', {
      ...common,
      max: field.constraints.max,
      min: field.constraints.min,
      onInput: (event) => update(event.target.value),
      type: field.type === 'color' ? 'color' : field.type,
      value,
    });
  }

  return h('input', {
    ...common,
    autocomplete: field.type === 'url' ? 'url' : undefined,
    onInput: (event) => update(event.target.value),
    placeholder: field.ui.placeholder,
    spellcheck: field.type === 'url' ? 'false' : undefined,
    type: field.type === 'url' ? 'url' : 'text',
    value,
  });
}

export const BlockInspector = {
  name: 'LaravelBlocksBlockInspector',
  props: {
    block: {
      type: Object,
      required: true,
    },
    commandRegistry: {
      type: Object,
      default: null,
    },
    manifest: {
      type: Object,
      default: () => ({}),
    },
    open: {
      type: Boolean,
      default: true,
    },
    mediaAvailable: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['openMedia'],
  setup(props, { emit, expose }) {
    const activeGroup = ref('content');
    const groups = inspectorGroups();
    const definition = computed(() => blockManifestDefinition(props.manifest, props.block));
    const fields = computed(() => inspectorFieldsForBlock(props.manifest, props.block, activeGroup.value));

    function setGroup(group) {
      activeGroup.value = group;
    }

    function updateField(field, raw) {
      return props.commandRegistry?.run?.('updateBlockAttrs', {
        block: props.block,
        focus: !['text', 'textarea', 'url'].includes(field.type),
        path: field.path,
        value: coerceInspectorFieldValue(field, raw),
      }) ?? { executed: false };
    }

    watch(() => props.block.type, () => {
      activeGroup.value = 'content';
    });

    expose({
      activeGroup() {
        return activeGroup.value;
      },
      fields() {
        return fields.value;
      },
      setGroup,
    });

    function mediaControls() {
      const contexts = mediaContextsForBlock(props.block);

      if (activeGroup.value !== 'content' || contexts.length === 0) {
        return [];
      }

      return contexts.map((context) => h('div', {
        class: 'lb-block-inspector__media',
        'data-laravel-blocks-inspector-media': context.purpose === 'primary'
          ? context.blockType
          : `${context.blockType}:${context.purpose}`,
      }, [
        h(Button, {
          disabled: !props.mediaAvailable,
          onClick: (event) => emit('openMedia', props.block, event.currentTarget, context.purpose),
          variant: 'primary',
        }, { default: () => [
          h(Icon, { name: context.icon }),
          props.block.attrs?.[context.sourceAttribute]
            ? `Replace ${context.noun} from Media Library`
            : `Choose ${context.noun} from Media Library`,
        ] }),
        !props.mediaAvailable
          ? h('small', {}, 'Media transport is disabled for this editor.')
          : null,
      ]));
    }

    function fieldControls() {
      if (fields.value.length === 0) {
        return [h('p', {
          class: 'lb-block-inspector__empty',
          'data-laravel-blocks-inspector-empty': '',
        }, `No ${activeGroup.value} settings for this block yet.`)];
      }

      return fields.value.map((field) => {
        const value = inspectorFieldValue(props.block, field);

        return h('label', {
          class: 'lb-block-inspector__field',
          for: `lb-inspector-field-${field.name}`,
        }, [
          h('span', {
            class: 'lb-block-inspector__label',
          }, field.label),
          controlForField(field, value, (next) => updateField(field, next)),
          field.help
            ? h('span', {
              class: 'lb-block-inspector__help',
            }, field.help)
            : null,
        ]);
      });
    }

    return () => h('aside', {
      'aria-label': 'Block settings',
      class: 'lb-block-inspector',
      'data-laravel-blocks-inspector': '',
      hidden: !props.open || !props.block.active,
    }, [
      h('div', {
        class: 'lb-block-inspector__header',
      }, [
        h('span', {
          class: 'lb-block-inspector__eyebrow',
        }, 'BLOCK'),
        h('strong', {
          'data-laravel-blocks-inspector-title': '',
        }, definition.value?.label || props.block.label),
      ]),
      h('div', {
        class: 'lb-block-inspector__tabs',
        role: 'tablist',
      }, groups.map((group) => h('button', {
        'aria-selected': activeGroup.value === group.name ? 'true' : 'false',
        class: [
          'lb-block-inspector__tab',
          activeGroup.value === group.name ? 'lb-block-inspector__tab--active' : null,
        ].filter(Boolean),
        'data-laravel-blocks-inspector-tab': group.name,
        onClick: () => setGroup(group.name),
        role: 'tab',
        type: 'button',
      }, group.label))),
      h('div', {
        class: 'lb-block-inspector__panel',
        'data-laravel-blocks-inspector-panel': activeGroup.value,
        role: 'tabpanel',
      }, [...mediaControls(), ...fieldControls()].filter(Boolean)),
    ]);
  },
};
