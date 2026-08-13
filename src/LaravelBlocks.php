<?php

namespace KatonFajar\LaravelBlocks;

use Illuminate\Contracts\Config\Repository;
use KatonFajar\LaravelBlocks\Assets\AssetManifest;
use KatonFajar\LaravelBlocks\Assets\DistributedAsset;
use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockMetadata;
use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;
use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Manifest\EditorManifest;
use KatonFajar\LaravelBlocks\Manifest\EditorManifestGenerator;
use KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider;
use KatonFajar\LaravelBlocks\Rendering\DocumentRenderer;
use KatonFajar\LaravelBlocks\Rendering\RenderContext;
use KatonFajar\LaravelBlocks\Rendering\RenderedContent;
use KatonFajar\LaravelBlocks\Validation\DocumentValidator;
use KatonFajar\LaravelBlocks\Validation\MarkRegistry;
use KatonFajar\LaravelBlocks\Validation\MarkSchema;

final readonly class LaravelBlocks
{
    public function __construct(
        private Repository $config,
        private BlockRegistry $blocks,
        private MarkRegistry $marks,
        private DocumentValidator $validator,
        private DocumentRenderer $renderer,
        private EditorManifestGenerator $manifest,
        private AssetManifest $assets,
        private MediaProvider $media,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function configuration(): array
    {
        $configuration = $this->config->get('laravel-blocks', []);

        if (! is_array($configuration)) {
            return [];
        }

        $normalized = [];

        foreach ($configuration as $key => $value) {
            if (is_string($key)) {
                $normalized[$key] = $value;
            }
        }

        return $normalized;
    }

    /**
     * @param  class-string<Block>|Block|array<array-key, class-string<Block>|Block>  $blocks
     */
    public function register(string|Block|array $blocks): void
    {
        $this->blocks->register($blocks);
    }

    public function block(string $name): Block
    {
        return $this->blocks->get($name);
    }

    public function blockMetadata(string $name): BlockMetadata
    {
        return $this->blocks->metadata($name);
    }

    /**
     * @return array<string, Block>
     */
    public function blocks(): array
    {
        return $this->blocks->all();
    }

    /**
     * @param  MarkSchema|array<array-key, MarkSchema>  $marks
     */
    public function registerMarks(MarkSchema|array $marks): void
    {
        $this->marks->register($marks);
    }

    /**
     * @param  array<array-key, mixed>|string|Document|null  $value
     */
    public function validate(array|string|Document|null $value): Document
    {
        return $this->validator->validate($value);
    }

    /**
     * @param  array<array-key, mixed>|string|Document|null  $value
     */
    public function render(array|string|Document|null $value, ?RenderContext $context = null): RenderedContent
    {
        return $this->renderer->render($value, $context);
    }

    public function editorManifest(): EditorManifest
    {
        return $this->manifest->generate();
    }

    public function assets(): AssetManifest
    {
        return $this->assets;
    }

    public function media(): MediaProvider
    {
        return $this->media;
    }

    public function asset(string $name): DistributedAsset
    {
        return $this->assets->asset($name);
    }

    public function assetUrl(string $name): string
    {
        return $this->assets->assetUrl($name);
    }
}
