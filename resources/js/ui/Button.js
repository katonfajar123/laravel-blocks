import { h } from 'vue';

function classes(base, attrs, extra = []) {
  const className = attrs.class;

  return [
    base,
    ...extra,
    className,
  ].filter(Boolean);
}

function attrsWithoutClass(attrs) {
  const { class: className, ...rest } = attrs;

  return rest;
}

export const Button = {
  name: 'LaravelBlocksButton',
  inheritAttrs: false,
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    pressed: {
      type: Boolean,
      default: undefined,
    },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['sm', 'md', 'lg'].includes(value),
    },
    type: {
      type: String,
      default: 'button',
    },
    variant: {
      type: String,
      default: 'neutral',
      validator: (value) => ['neutral', 'primary', 'ghost', 'danger'].includes(value),
    },
  },
  setup(props, { attrs, slots }) {
    return () => h('button', {
      ...attrsWithoutClass(attrs),
      'aria-pressed': props.pressed,
      class: classes('lb-ui-button', attrs, [
        `lb-ui-button--${props.variant}`,
        `lb-ui-button--${props.size}`,
      ]),
      disabled: props.disabled,
      type: props.type,
    }, slots.default?.());
  },
};

export const IconButton = {
  name: 'LaravelBlocksIconButton',
  inheritAttrs: false,
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      required: true,
    },
    pressed: {
      type: Boolean,
      default: undefined,
    },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['sm', 'md', 'lg'].includes(value),
    },
    type: {
      type: String,
      default: 'button',
    },
    variant: {
      type: String,
      default: 'ghost',
      validator: (value) => ['neutral', 'primary', 'ghost', 'danger'].includes(value),
    },
  },
  setup(props, { attrs, slots }) {
    return () => h('button', {
      ...attrsWithoutClass(attrs),
      'aria-label': props.label,
      'aria-pressed': props.pressed,
      class: classes('lb-ui-button lb-ui-icon-button', attrs, [
        `lb-ui-button--${props.variant}`,
        `lb-ui-button--${props.size}`,
      ]),
      disabled: props.disabled,
      type: props.type,
    }, slots.default?.());
  },
};
