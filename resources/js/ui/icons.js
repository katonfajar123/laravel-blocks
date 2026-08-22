import { h } from 'vue';

import { iconDefinitions } from './icons/index.js';

export function iconDefinition(name) {
  return iconDefinitions[name] ?? iconDefinitions.paragraph;
}

export function iconPath(name) {
  return iconDefinition(name).paths;
}

export function blockIconName(type) {
  return {
    blockquote: 'blockquote',
    bulletList: 'list',
    codeBlock: 'code',
    file: 'file',
    heading: 'heading',
    image: 'image',
    list: 'list',
    orderedList: 'list',
    paragraph: 'paragraph',
    quote: 'quote',
    video: 'video',
  }[type] ?? 'paragraph';
}

export const Icon = {
  name: 'LaravelBlocksIcon',
  props: {
    name: {
      type: String,
      required: true,
    },
    size: {
      type: [Number, String],
      default: 18,
    },
  },
  setup(props) {
    return () => h('svg', {
      'aria-hidden': 'true',
      class: 'lb-ui-icon',
      'data-laravel-blocks-icon': props.name,
      fill: 'none',
      focusable: 'false',
      height: props.size,
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '1.75',
      viewBox: '0 0 24 24',
      width: props.size,
    }, iconPath(props.name).map((d) => h('path', {
      d,
      key: d,
    })));
  },
};
