import { computed, h, ref, shallowRef, watch } from 'vue';

import { Button, Icon, IconButton, Modal } from '../ui/index.js';
import { MediaClientError, createMediaClient, normalizeCapabilities } from './client.js';

function imageMimeTypes(capabilities) {
  return capabilities.allowedMimeTypes.filter((mimeType) => mimeType.startsWith('image/'));
}

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
    transport: {
      type: Object,
      required: true,
    },
  },
  emits: ['close', 'selected'],
  setup(props, { emit, expose }) {
    const capabilities = ref(normalizeCapabilities(props.transport.capabilities));
    const client = createMediaClient(props.transport);
    const error = ref(null);
    const items = ref([]);
    const loading = ref(false);
    const page = ref(1);
    const hasMore = ref(false);
    const query = ref('');
    const selected = shallowRef(null);
    const status = ref('');
    const uploadProgress = ref(null);
    const uploadInput = ref(null);
    let browseController = null;
    let retryAction = null;
    let uploadController = null;

    const acceptedMimeTypes = computed(() => imageMimeTypes(capabilities.value));
    const accept = computed(() => acceptedMimeTypes.value.join(','));

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
      const source = props.block?.attrs?.src;
      selected.value = items.value.find((item) => item.url === source) ?? selected.value;
    }

    async function load({ append = false } = {}) {
      browseController?.abort();
      browseController = new AbortController();
      loading.value = true;
      clearError();
      status.value = append ? 'Loading more media…' : 'Loading media library…';
      const requestedPage = append ? page.value + 1 : 1;

      try {
        const result = await client.browse({
          mimeTypes: acceptedMimeTypes.value,
          page: requestedPage,
          perPage: 24,
          search: query.value.trim(),
        }, { signal: browseController.signal });
        capabilities.value = result.capabilities;
        const images = result.items.filter((item) => item.mimeType.startsWith('image/'));
        items.value = append ? [...items.value, ...images] : images;
        page.value = result.page;
        hasMore.value = result.hasMore;
        status.value = `${items.value.length} image${items.value.length === 1 ? '' : 's'} available.`;
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
      selected.value = item;
      status.value = `${itemLabel(item)} selected.`;
    }

    function useSelected() {
      if (!selected.value) {
        return;
      }

      const result = props.commandRegistry?.run?.('setImageMedia', {
        block: props.block,
        item: selected.value,
      }) ?? { executed: false };

      if (!result.executed) {
        setError(new MediaClientError(
          'media_selection_failed',
          'The selected image could not be applied to this block.',
        ));

        return;
      }

      emit('selected', selected.value);
      close('selected');
    }

    async function uploadFile(file) {
      if (!(file instanceof File)) {
        return;
      }

      if (accept.value && !acceptedMimeTypes.value.includes(file.type)) {
        setError(new MediaClientError('unsupported_mime_type', 'Choose a supported image file.'));

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
      status.value = `Uploading ${file.name}…`;

      try {
        const item = await client.upload(file, {
          onProgress: (progress) => {
            uploadProgress.value = progress;
            status.value = `Uploading ${file.name}: ${progress}%`;
          },
          signal: uploadController.signal,
        });
        items.value = [item, ...items.value.filter((candidate) => candidate.id !== item.id)];
        selected.value = item;
        status.value = `${file.name} uploaded and selected.`;
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

    watch(() => props.open, (open) => {
      if (open) {
        load();
      } else {
        browseController?.abort();
        uploadController?.abort();
      }
    });

    expose({ close, load, selectItem, uploadFile, useSelected });

    function mediaGrid() {
      if (!loading.value && items.value.length === 0 && !error.value) {
        return h('div', {
          class: 'lb-media-library__empty',
          'data-laravel-blocks-media-empty': '',
        }, [
          h(Icon, { name: 'image', size: 28 }),
          h('strong', {}, query.value ? 'No matching images' : 'No images yet'),
          h('span', {}, query.value ? 'Try another search or upload an image.' : 'Upload the first image to this library.'),
        ]);
      }

      return h('div', {
        'aria-label': 'Available images',
        class: 'lb-media-library__grid',
        'data-laravel-blocks-media-grid': '',
        onKeydown: handleGridKeydown,
        role: 'listbox',
      }, items.value.map((item) => h('button', {
        'aria-label': itemLabel(item),
        'aria-selected': selected.value?.id === item.id ? 'true' : 'false',
        class: [
          'lb-media-library__item',
          selected.value?.id === item.id ? 'lb-media-library__item--selected' : null,
        ].filter(Boolean),
        'data-laravel-blocks-media-item': item.id,
        onClick: () => selectItem(item),
        onDblclick: () => {
          selectItem(item);
          useSelected();
        },
        role: 'option',
        type: 'button',
      }, [
        h('img', {
          alt: '',
          loading: 'lazy',
          src: item.url,
        }),
        h('span', { class: 'lb-media-library__item-copy' }, [
          h('strong', {}, itemLabel(item)),
          h('small', {}, `${item.mimeType} · ${humanBytes(item.bytes)}`),
        ]),
      ])));
    }

    return () => h(Modal, {
      label: props.block?.attrs?.src ? 'Replace image' : 'Choose image',
      onClose: close,
      open: props.open,
    }, {
      default: () => [
        h('header', { class: 'lb-media-library__header' }, [
          h('div', {}, [
            h('span', { class: 'lb-media-library__eyebrow' }, 'MEDIA LIBRARY'),
            h('h2', { class: 'lb-media-library__title' }, props.block?.attrs?.src ? 'Replace image' : 'Choose image'),
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
              placeholder: 'Search images',
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
            default: () => [h(Icon, { name: 'upload' }), 'Upload image'],
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
          h('span', {}, 'Drop an image here'),
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
          h('p', { class: 'lb-media-library__guidance' }, 'Describe meaningful images in Alternative text after choosing them. Leave it empty only for decorative images.'),
          h('div', { class: 'lb-media-library__actions' }, [
            h(Button, { onClick: () => close('cancel'), variant: 'ghost' }, { default: () => 'Cancel' }),
            h(Button, {
              disabled: !selected.value,
              'data-laravel-blocks-media-use': '',
              onClick: useSelected,
              variant: 'primary',
            }, { default: () => props.block?.attrs?.src ? 'Replace image' : 'Use image' }),
          ]),
        ]),
      ],
    });
  },
};
