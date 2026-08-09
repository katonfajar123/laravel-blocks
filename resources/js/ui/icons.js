import { h } from 'vue';

const icons = Object.freeze({
  arrowDown: ['M12 5v14', 'M18 13l-6 6-6-6'],
  arrowUp: ['M12 19V5', 'M6 11l6-6 6 6'],
  blockquote: ['M8 9h5v6H7v-4c0-3 1.5-5 5-6', 'M18 9h5v6h-6v-4c0-3 1.5-5 5-6'],
  code: ['M9 8l-4 4 4 4', 'M15 8l4 4-4 4'],
  dragHandle: ['M8 7h.01', 'M8 12h.01', 'M8 17h.01', 'M14 7h.01', 'M14 12h.01', 'M14 17h.01'],
  heading: ['M6 5v14', 'M18 5v14', 'M6 12h12'],
  link: ['M10 13a5 5 0 0 0 7.07 0l1.42-1.42a5 5 0 0 0-7.07-7.07L10 5.93', 'M14 11a5 5 0 0 0-7.07 0l-1.42 1.42a5 5 0 0 0 7.07 7.07L14 18.07'],
  list: ['M8 6h11', 'M8 12h11', 'M8 18h11', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  moreVertical: ['M12 6.5v.01', 'M12 12v.01', 'M12 17.5v.01'],
  paragraph: ['M9 19V5h5a4 4 0 0 1 0 8H9', 'M14 5v14'],
  plus: ['M12 5v14', 'M5 12h14'],
  quote: ['M8 9h5v6H7v-4c0-3 1.5-5 5-6', 'M18 9h5v6h-6v-4c0-3 1.5-5 5-6'],
  redo: ['M15 7l4 4-4 4', 'M19 11H9a5 5 0 0 0 0 10h2'],
  search: ['M11 19a8 8 0 1 1 5.66-13.66A8 8 0 0 1 11 19Z', 'm21 21-4.35-4.35'],
  settings: ['M4 7h10', 'M17 7h3', 'M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z', 'M4 17h3', 'M10 17h10', 'M7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z'],
  sparkle: ['M12 3l1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9L12 3Z', 'M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14Z'],
  undo: ['M9 7l-4 4 4 4', 'M5 11h10a5 5 0 0 1 0 10h-2'],
});

export function iconPath(name) {
  return icons[name] ?? icons.paragraph;
}

export function blockIconName(type) {
  return {
    blockquote: 'blockquote',
    bulletList: 'list',
    codeBlock: 'code',
    heading: 'heading',
    list: 'list',
    orderedList: 'paragraph',
    paragraph: 'paragraph',
    quote: 'quote',
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
      fill: 'none',
      focusable: 'false',
      height: props.size,
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '1.9',
      viewBox: '0 0 24 24',
      width: props.size,
    }, iconPath(props.name).map((d) => h('path', { d })));
  },
};
