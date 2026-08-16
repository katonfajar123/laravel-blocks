const contexts = Object.freeze({
  image: Object.freeze({
    blockType: 'image',
    commandName: 'setImageMedia',
    guidance: 'Describe meaningful images in Alternative text after choosing them. Leave it empty only for decorative images.',
    icon: 'image',
    mimePrefixes: Object.freeze(['image/']),
    noun: 'image',
    plural: 'images',
    preview: 'image',
    sourceAttribute: 'src',
  }),
  video: Object.freeze({
    blockType: 'video',
    commandName: 'setVideoMedia',
    guidance: 'Add an accessible title after choosing a video. Publish captions with the media when they are required.',
    icon: 'video',
    mimePrefixes: Object.freeze(['video/']),
    noun: 'video',
    plural: 'videos',
    preview: 'icon',
    sourceAttribute: 'src',
  }),
});

export function mediaContextForBlock(block) {
  return contexts[String(block?.type ?? '')] ?? null;
}

export function mediaItemMatchesContext(item, context) {
  const mimeType = String(item?.mimeType ?? '').toLowerCase();

  return Boolean(
    context
    && typeof item?.url === 'string'
    && context.mimePrefixes.some((prefix) => mimeType.startsWith(prefix)),
  );
}

export function mediaMimeTypes(context, capabilities) {
  if (!context || !Array.isArray(capabilities?.allowedMimeTypes)) {
    return Object.freeze([]);
  }

  return Object.freeze(capabilities.allowedMimeTypes.filter((mimeType) => context.mimePrefixes
    .some((prefix) => String(mimeType).toLowerCase().startsWith(prefix))));
}
