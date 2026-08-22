const contexts = Object.freeze({
  file: Object.freeze({
    primary: Object.freeze({
      blockType: 'file',
      commandName: 'setFileMedia',
      guidance: 'Choose a PDF file. Confirm clear link text before publishing the document.',
      icon: 'file',
      mimePrefixes: Object.freeze([]),
      mimeTypes: Object.freeze(['application/pdf']),
      noun: 'file',
      plural: 'files',
      preview: 'icon',
      purpose: 'primary',
      sourceAttribute: 'src',
    }),
  }),
  image: Object.freeze({
    primary: Object.freeze({
      blockType: 'image',
      commandName: 'setImageMedia',
      guidance: 'Describe meaningful images in Alternative text after choosing them. Leave it empty only for decorative images.',
      icon: 'image',
      mimePrefixes: Object.freeze(['image/']),
      mimeTypes: Object.freeze([]),
      noun: 'image',
      plural: 'images',
      preview: 'image',
      purpose: 'primary',
      sourceAttribute: 'src',
    }),
  }),
  gallery: Object.freeze({
    primary: Object.freeze({
      blockType: 'gallery',
      commandName: 'setGalleryMedia',
      guidance: 'Choose two or more images. Selection order becomes the Gallery order.',
      icon: 'gallery',
      mimePrefixes: Object.freeze([]),
      mimeTypes: Object.freeze(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']),
      multiple: true,
      noun: 'image',
      plural: 'images',
      preview: 'image',
      purpose: 'primary',
      sourceAttribute: 'images',
    }),
  }),
  video: Object.freeze({
    primary: Object.freeze({
      blockType: 'video',
      commandName: 'setVideoMedia',
      guidance: 'Add an accessible title and captions after choosing a video.',
      icon: 'video',
      mimePrefixes: Object.freeze(['video/']),
      mimeTypes: Object.freeze([]),
      noun: 'video',
      plural: 'videos',
      preview: 'icon',
      purpose: 'primary',
      sourceAttribute: 'src',
    }),
    poster: Object.freeze({
      blockType: 'video',
      commandName: 'setVideoPosterMedia',
      guidance: 'Choose a representative image that helps viewers understand the video before playback.',
      icon: 'image',
      mimePrefixes: Object.freeze(['image/']),
      mimeTypes: Object.freeze([]),
      noun: 'poster image',
      plural: 'poster images',
      preview: 'image',
      purpose: 'poster',
      sourceAttribute: 'poster',
    }),
    captions: Object.freeze({
      blockType: 'video',
      commandName: 'setVideoCaptionMedia',
      guidance: 'Choose a WebVTT captions file, then confirm its language and readable label in block settings.',
      icon: 'captions',
      mimePrefixes: Object.freeze([]),
      mimeTypes: Object.freeze(['text/vtt']),
      noun: 'caption track',
      plural: 'caption tracks',
      preview: 'icon',
      purpose: 'captions',
      sourceAttribute: 'captionSrc',
    }),
  }),
});

export function mediaContextForBlock(block, purpose = 'primary') {
  return contexts[String(block?.type ?? '')]?.[String(purpose)] ?? null;
}

export function mediaContextsForBlock(block) {
  const blockContexts = contexts[String(block?.type ?? '')];

  return Object.freeze(blockContexts ? Object.values(blockContexts) : []);
}

function matchesMimeType(mimeType, context) {
  return context.mimeTypes.includes(mimeType)
    || context.mimePrefixes.some((prefix) => mimeType.startsWith(prefix));
}

export function mediaItemMatchesContext(item, context) {
  const mimeType = String(item?.mimeType ?? '').toLowerCase();

  return Boolean(
    context
    && typeof item?.url === 'string'
    && matchesMimeType(mimeType, context),
  );
}

export function mediaMimeTypes(context, capabilities) {
  if (!context || !Array.isArray(capabilities?.allowedMimeTypes)) {
    return Object.freeze([]);
  }

  return Object.freeze(capabilities.allowedMimeTypes.filter((mimeType) => matchesMimeType(
    String(mimeType).toLowerCase(),
    context,
  )));
}
