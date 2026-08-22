import { computed, h, ref, shallowRef, watch } from 'vue';

import { Button, Icon, IconButton, Modal } from '../ui/index.js';
import { MediaClientError, createMediaClient, normalizeCapabilities } from './client.js';
import {
  mediaContextForBlock,
  mediaItemMatchesContext,
  mediaMimeTypes,
} from './context.js';

function itemLabel(item) {
  return item.alt || item.originalName || item.id;
}

function humanBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function blockHasMedia(block, context) {
  const source = block?.attrs?.[context?.sourceAttribute ?? 'src'];

  return Array.isArray(source)
    ? source.length > 0
    : typeof source === 'string' && source !== '';
}

function sameMediaItem(first, second) {
  if (!first || !second) {
    return false;
  }

  if (first.id && second.id) {
    return first.id === second.id;
  }

  return first.url === second.url;
}

export const MediaLibrary = {
  name: 'LaravelBlocksMediaLibrary',
  props: {
    block: {
      type: Object,
      required: true,
    },
    commandRegistry: {
      type: Object,
      default: null,
    },
    open: {
      type: Boolean,
      default: false,
    },
    purpose: {
      type: String,
      default: 'primary',
    },
    transport: {
      type: Object,
      required: true,
    },
  },
  emits: ['close', 'selected'],
  setup(props, { emit, expose }) {
    const capabilities = ref(normalizeCapabilities(props.transport.capabilities));
    const client = createMediaClient(props.transport);
    const context = computed(() => mediaContextForBlock(props.block, props.purpose));
    const error = ref(null);
    const items = ref([]);
    const loading = ref(false);
    const page = ref(1);
    const hasMore = ref(false);
    const query = ref('');
    const selected = shallowRef(null);
    const selectedItems = shallowRef([]);
    const status = ref('');
    const uploadProgress = ref(null);
    const uploadInput = ref(null);
    let browseController = null;
    let retryAction = null;
    let uploadController = null;

    const acceptedMimeTypes = computed(() => mediaMimeTypes(context.value, capabilities.value));
    const accept = computed(() => acceptedMimeTypes.value.join(','));
    const multiple = computed(() => Boolean(context.value?.multiple));
    const selectedCount = computed(() => (multiple.value ? selectedItems.value.length : (selected.value ? 1 : 0)));
    const dialogTitle = computed(() => {
      const activeContext = context.value;
      const label = activeContext?.multiple ? activeContext.plural : activeContext?.noun ?? 'media';

      return `${blockHasMedia(props.block, activeContext) ? 'Replace' : 'Choose'} ${label}`;
    });

    function setError(next, retry = null) {
      error.value = next instanceof Error ? next : new Error(String(next));
      retryAction = retry;
      status.value = '';
    }

    function clearError() {
      error.value = null;
      retryAction = null;
    }

    function chooseExistingItem() {
      const activeContext = context.value;

      if (activeContext?.multiple) {
        if (selectedItems.value.length > 0) {
          return;
        }

        const current = Array.isArray(props.block?.attrs?.[activeContext.sourceAttribute])
          ? props.block.attrs[activeContext.sourceAttribute]
          : [];
        const byUrl = new Map(items.value.map((item) => [item.url, item]));
        const existing = current
          .map((image) => byUrl.get(image?.src))
          .filter((item) => item && mediaItemMatchesContext(item, activeContext));

        if (existing.length > 0) {
          selectedItems.value = existing;
          selected.value = existing.at(-1) ?? null;
        }

        return;
      }

      const source = props.block?.attrs?.[activeContext?.sourceAttribute ?? 'src'];
      selected.value = items.value.find((item) => item.url === source) ?? selected.value;
    }

    async function load({ append = false } = {}) {
      const requestedContext = context.value;

      if (!requestedContext) {
        setError(new MediaClientError('unsupported_media_block', 'This block does not support the Media Library.'));

        return;
      }

      browseController?.abort();
      browseController = new AbortController();
      loading.value = true;
      clearError();
      status.value = append ? 'Loading more media...' : 'Loading media library...';
      const requestedPage = append ? page.value + 1 : 1;

      try {
        const result = await client.browse({
          mimeTypes: acceptedMimeTypes.value,
          page: requestedPage,
          perPage: 24,
          search: query.value.trim(),
        }, { signal: browseController.signal });
        capabilities.value = result.capabilities;
        const matchingItems = result.items.filter((item) => mediaItemMatchesContext(item, requestedContext));
        items.value = append ? [...items.value, ...matchingItems] : matchingItems;
        page.value = result.page;
        hasMore.value = result.hasMore;
        status.value = `${items.value.length} ${items.value.length === 1 ? requestedContext.noun : requestedContext.plural} available.`;
        chooseExistingItem();
      } catch (failure) {
        if (failure?.code !== 'media_request_cancelled') {
          setError(failure, () => load({ append }));
        }
      } finally {
        loading.value = false;
      }
    }

    function close(reason = 'close') {
      browseController?.abort();
      uploadController?.abort();
      emit('close', reason);
    }

    function selectItem(item) {
      if (multiple.value) {
        const exists = selectedItems.value.some((candidate) => sameMediaItem(candidate, item));

        selectedItems.value = exists
          ? selectedItems.value.filter((candidate) => !sameMediaItem(candidate, item))
          : [...selectedItems.value, item];
        selected.value = selectedItems.value.at(-1) ?? null;
        status.value = selectedItems.value.length === 0
          ? `No ${context.value?.plural ?? 'media'} selected.`
          : `${selectedItems.value.length} ${selectedItems.value.length === 1 ? context.value.noun : context.value.plural} selected.`;

        return;
      }

      selected.value = item;
      status.value = `${itemLabel(item)} selected.`;
    }

    function itemSelected(item) {
      if (multiple.value) {
        return selectedItems.value.some((candidate) => sameMediaItem(candidate, item));
      }

      return sameMediaItem(selected.value, item);
    }

    function mediaActionLabel(activeContext) {
      if (activeContext?.multiple) {
        const count = selectedCount.value;

        return count === 1
          ? `Use 1 ${activeContext.noun}`
          : `Use ${count} ${activeContext.plural}`;
      }

      return `Use ${activeContext?.noun ?? 'media'}`;
    }

    function useSelected() {
      const requestedContext = context.value;
      const selection = requestedContext?.multiple
        ? selectedItems.value.filter((item) => mediaItemMatchesContext(item, requestedContext))
        : selected.value;

      if (requestedContext?.multiple && selection.length === 0) {
        return;
      }

      if (!requestedContext?.multiple && (!selection || !mediaItemMatchesContext(selection, requestedContext))) {
        return;
      }

      const result = props.commandRegistry?.run?.(
        requestedContext.commandName,
        requestedContext.multiple
          ? { block: props.block, items: selection }
          : { block: props.block, item: selection },
      ) ?? { executed: false };

      if (!result.executed) {
        setError(new MediaClientError(
          'media_selection_failed',
          `The selected ${requestedContext.noun} could not be applied to this block.`,
        ));

        return;
      }

      emit('selected', selection);
      close('selected');
    }

    async function uploadFile(file) {
      const requestedContext = context.value;

      if (!(file instanceof File)) {
        return;
      }

      if (accept.value && !acceptedMimeTypes.value.includes(file.type)) {
        setError(new MediaClientError('unsupported_mime_type', `Choose a supported ${requestedContext?.noun ?? 'media'} file.`));

        return;
      }

      if (capabilities.value.maxUploadBytes > 0 && file.size > capabilities.value.maxUploadBytes) {
        setError(new MediaClientError('upload_too_large', 'The selected file is larger than the allowed upload limit.'));

        return;
      }

      uploadController?.abort();
      uploadController = new AbortController();
      uploadProgress.value = 0;
      clearError();
      status.value = `Uploading ${file.name}...`;

      try {
        const item = await client.upload(file, {
          onProgress: (progress) => {
            uploadProgress.value = progress;
            status.value = `Uploading ${file.name}: ${progress}%`;
          },
          signal: uploadController.signal,
        });

        if (!mediaItemMatchesContext(item, requestedContext)) {
          throw new MediaClientError(
            'unexpected_media_type',
            `The media provider returned a file that is not a supported ${requestedContext.noun}.`,
          );
        }

        items.value = [item, ...items.value.filter((candidate) => candidate.id !== item.id)];

        if (multiple.value) {
          selectedItems.value = selectedItems.value
            .filter((candidate) => !sameMediaItem(candidate, item))
            .concat(item);
          selected.value = item;
          status.value = `${file.name} uploaded and selected. ${selectedItems.value.length} ${selectedItems.value.length === 1 ? requestedContext.noun : requestedContext.plural} selected.`;
        } else {
          selected.value = item;
          status.value = `${file.name} uploaded and selected.`;
        }
      } catch (failure) {
        if (failure?.code === 'media_request_cancelled') {
          status.value = 'Upload cancelled.';
        } else {
          setError(failure, () => uploadFile(file));
        }
      } finally {
        uploadProgress.value = null;
      }
    }

    function handleFiles(files) {
      const [file] = [...(files ?? [])];

      if (file) {
        uploadFile(file);
      }
    }

    function handleGridKeydown(event) {
      if (!['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home'].includes(event.key)) {
        return;
      }

      const controls = [...event.currentTarget.querySelectorAll('[data-laravel-blocks-media-item]')];
      const current = Math.max(0, controls.indexOf(event.target.closest('[data-laravel-blocks-media-item]')));
      const columns = globalThis.innerWidth <= 640 ? 2 : 4;
      const next = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? controls.length - 1
          : event.key === 'ArrowLeft'
            ? current - 1
            : event.key === 'ArrowRight'
              ? current + 1
              : event.key === 'ArrowUp'
                ? current - columns
                : current + columns;

      event.preventDefault();
      controls[Math.min(controls.length - 1, Math.max(0, next))]?.focus?.({ preventScroll: true });
    }

    watch(() => [props.open, props.purpose], ([open]) => {
      if (open) {
        items.value = [];
        page.value = 1;
        hasMore.value = false;
        query.value = '';
        selected.value = null;
        selectedItems.value = [];
        load();
      } else {
        browseController?.abort();
        uploadController?.abort();
      }
    });

    expose({ close, load, selectItem, uploadFile, useSelected });

    function itemPreview(item) {
      if (context.value?.preview === 'image') {
        return h('img', {
          alt: '',
          loading: 'lazy',
          src: item.url,
        });
      }

      return h('span', {
        'aria-hidden': 'true',
        class: 'lb-media-library__item-preview lb-media-library__item-preview--icon',
      }, [
        h(Icon, { name: context.value?.icon ?? 'image', size: 32 }),
        h('small', {}, item.mimeType),
      ]);
    }

    function mediaGrid() {
      const activeContext = context.value;

      if (!loading.value && items.value.length === 0 && !error.value) {
        return h('div', {
          class: 'lb-media-library__empty',
          'data-laravel-blocks-media-empty': '',
        }, [
          h(Icon, { name: activeContext.icon, size: 28 }),
          h('strong', {}, query.value ? `No matching ${activeContext.plural}` : `No ${activeContext.plural} yet`),
          h('span', {}, query.value
            ? `Try another search or upload a ${activeContext.noun}.`
            : `Upload the first ${activeContext.noun} to this library.`),
        ]);
      }

      return h('div', {
        'aria-label': `Available ${activeContext.plural}`,
        'aria-multiselectable': activeContext.multiple ? 'true' : undefined,
        class: 'lb-media-library__grid',
        'data-laravel-blocks-media-grid': '',
        onKeydown: handleGridKeydown,
        role: 'listbox',
      }, items.value.map((item) => h('button', {
        'aria-label': itemLabel(item),
        'aria-selected': itemSelected(item) ? 'true' : 'false',
        class: [
          'lb-media-library__item',
          itemSelected(item) ? 'lb-media-library__item--selected' : null,
        ].filter(Boolean),
        'data-laravel-blocks-media-item': item.id,
        onClick: () => selectItem(item),
        onDblclick: () => {
          if (multiple.value) {
            return;
          }

          selectItem(item);
          useSelected();
        },
        role: 'option',
        type: 'button',
      }, [
        itemPreview(item),
        h('span', { class: 'lb-media-library__item-copy' }, [
          h('strong', {}, itemLabel(item)),
          h('small', {}, `${item.mimeType} / ${humanBytes(item.bytes)}`),
        ]),
      ])));
    }

    return () => {
      const activeContext = context.value;

      if (!activeContext) {
        return null;
      }

      return h(Modal, {
        label: dialogTitle.value,
        onClose: close,
        open: props.open,
      }, {
        default: () => [
        h('header', { class: 'lb-media-library__header' }, [
          h('div', {}, [
            h('span', { class: 'lb-media-library__eyebrow' }, 'MEDIA LIBRARY'),
            h('h2', { class: 'lb-media-library__title' }, dialogTitle.value),
          ]),
          h(IconButton, {
            label: 'Close media library',
            onClick: () => close('button'),
          }, { default: () => h(Icon, { name: 'x' }) }),
        ]),
        h('div', { class: 'lb-media-library__tools' }, [
          h('form', {
            class: 'lb-media-library__search',
            onSubmit: (event) => {
              event.preventDefault();
              load();
            },
            role: 'search',
          }, [
            h(Icon, { name: 'search' }),
            h('input', {
              'aria-label': 'Search media',
              'data-laravel-blocks-media-search': '',
              'data-laravel-blocks-modal-initial-focus': '',
              disabled: !capabilities.value.search,
              onInput: (event) => {
                query.value = event.target.value;
              },
              placeholder: `Search ${activeContext.plural}`,
              type: 'search',
              value: query.value,
            }),
            h(Button, {
              disabled: loading.value || !capabilities.value.search,
              size: 'sm',
              type: 'submit',
              variant: 'ghost',
            }, { default: () => 'Search' }),
          ]),
          h('input', {
            accept: accept.value,
            'data-laravel-blocks-media-upload-input': '',
            hidden: true,
            onChange: (event) => handleFiles(event.target.files),
            ref: uploadInput,
            type: 'file',
          }),
          h(Button, {
            disabled: !capabilities.value.upload || uploadProgress.value !== null,
            onClick: () => uploadInput.value?.click?.(),
            size: 'sm',
            variant: 'primary',
          }, {
            default: () => [h(Icon, { name: 'upload' }), `Upload ${activeContext.noun}`],
          }),
        ]),
        h('div', {
          class: 'lb-media-library__dropzone',
          'data-laravel-blocks-media-dropzone': '',
          onDragover: (event) => event.preventDefault(),
          onDrop: (event) => {
            event.preventDefault();
            handleFiles(event.dataTransfer?.files);
          },
        }, [
          h('span', {}, `Drop a ${activeContext.noun} here`),
          h('small', {}, capabilities.value.maxUploadBytes > 0
            ? `Maximum ${humanBytes(capabilities.value.maxUploadBytes)}`
            : 'Upload limits are provided by your media provider.'),
        ]),
        uploadProgress.value !== null
          ? h('div', {
            class: 'lb-media-library__progress',
            'data-laravel-blocks-media-progress': String(uploadProgress.value),
          }, [
            h('progress', { max: 100, value: uploadProgress.value }),
            h(Button, {
              onClick: () => uploadController?.abort(),
              size: 'sm',
              variant: 'ghost',
            }, { default: () => 'Cancel upload' }),
          ])
          : null,
        error.value
          ? h('div', {
            class: 'lb-media-library__error',
            'data-laravel-blocks-media-error': error.value.code ?? 'media_error',
            role: 'alert',
          }, [
            h('span', {}, error.value.message),
            retryAction
              ? h(Button, {
                onClick: () => retryAction?.(),
                size: 'sm',
                variant: 'ghost',
              }, { default: () => 'Retry' })
              : null,
          ])
          : null,
        h('div', {
          'aria-atomic': 'true',
          class: 'lb-media-library__status',
          'data-laravel-blocks-media-status': '',
          role: 'status',
        }, status.value),
        h('div', { class: 'lb-media-library__content' }, [
          mediaGrid(),
          hasMore.value
            ? h(Button, {
              disabled: loading.value,
              onClick: () => load({ append: true }),
              variant: 'ghost',
            }, { default: () => 'Load more' })
            : null,
        ]),
        h('footer', { class: 'lb-media-library__footer' }, [
          h('p', { class: 'lb-media-library__guidance' }, activeContext.guidance),
          h('div', { class: 'lb-media-library__actions' }, [
            h(Button, { onClick: () => close('cancel'), variant: 'ghost' }, { default: () => 'Cancel' }),
            h(Button, {
              disabled: selectedCount.value === 0,
              'data-laravel-blocks-media-use': '',
              onClick: useSelected,
              variant: 'primary',
            }, { default: () => mediaActionLabel(activeContext) }),
          ]),
        ]),
        ],
      });
    };
  },
};
