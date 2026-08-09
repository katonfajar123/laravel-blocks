import { describe, expect, it } from 'vitest';

import { LaravelBlocks, packageMetadata } from '../../resources/js/index.js';

describe('package frontend entry', () => {
  it('exposes immutable Vue 3 build metadata', () => {
    expect(Object.isFrozen(packageMetadata)).toBe(true);
    expect(packageMetadata.name).toBe('@katonfajar/laravel-blocks');
    expect(packageMetadata.vueMajor).toBe(3);
    expect(packageMetadata.vueVersion).toMatch(/^3\./);
    expect(Object.isFrozen(LaravelBlocks)).toBe(true);
    expect(LaravelBlocks.packageMetadata).toBe(packageMetadata);
    expect(LaravelBlocks.mountEditor).toBeTypeOf('function');
    expect(LaravelBlocks.toCanonicalJson).toBeTypeOf('function');
  });
});
