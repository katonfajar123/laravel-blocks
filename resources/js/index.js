import { version as vueVersion } from 'vue';

import '../css/laravel-blocks.css';

export const packageMetadata = Object.freeze({
  name: '@katonfajar/laravel-blocks',
  vueMajor: Number.parseInt(vueVersion.split('.')[0], 10),
  vueVersion,
});
