import { h } from 'vue';

function mergeClasses(base, attrs) {
  return [
    base,
    attrs.class,
  ].filter(Boolean);
}

function attrsWithoutClass(attrs) {
  const { class: className, ...rest } = attrs;

  return rest;
}

export const Toolbar = {
  name: 'LaravelBlocksToolbar',
  inheritAttrs: false,
  props: {
    label: {
      type: String,
      default: 'Editor toolbar',
    },
    orientation: {
      type: String,
      default: 'horizontal',
      validator: (value) => ['horizontal', 'vertical'].includes(value),
    },
  },
  setup(props, { attrs, slots }) {
    return () => h('div', {
      ...attrsWithoutClass(attrs),
      'aria-label': props.label,
      'aria-orientation': props.orientation,
      class: mergeClasses('lb-ui-toolbar', attrs),
      role: 'toolbar',
    }, slots.default?.());
  },
};

export const ToolbarGroup = {
  name: 'LaravelBlocksToolbarGroup',
  inheritAttrs: false,
  props: {
    label: {
      type: String,
      default: 'Toolbar group',
    },
  },
  setup(props, { attrs, slots }) {
    return () => h('div', {
      ...attrsWithoutClass(attrs),
      'aria-label': props.label,
      class: mergeClasses('lb-ui-toolbar-group', attrs),
      role: 'group',
    }, slots.default?.());
  },
};
