import { describe, expect, it } from 'vitest';

import { packageMetadata } from '../../resources/js/index.js';

describe('package frontend entry', () => {
  it('exposes immutable Vue 3 build metadata', () => {
    expect(Object.isFrozen(packageMetadata)).toBe(true);
    expect(packageMetadata.name).toBe('@katonfajar/laravel-blocks');
    expect(packageMetadata.vueMajor).toBe(3);
    expect(packageMetadata.vueVersion).toMatch(/^3\./);
  });
});
