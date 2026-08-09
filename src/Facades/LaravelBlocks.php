<?php

namespace KatonFajar\LaravelBlocks\Facades;

use Illuminate\Support\Facades\Facade;
use KatonFajar\LaravelBlocks\Assets\AssetManifest;
use KatonFajar\LaravelBlocks\Assets\DistributedAsset;
use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockMetadata;
use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Manifest\EditorManifest;
use KatonFajar\LaravelBlocks\Rendering\RenderContext;
use KatonFajar\LaravelBlocks\Rendering\RenderedContent;
use KatonFajar\LaravelBlocks\Validation\MarkSchema;

/**
 * @method static array<string, mixed> configuration()
 * @method static void register(class-string<Block>|Block|array<array-key, class-string<Block>|Block> $blocks)
 * @method static Block block(string $name)
 * @method static BlockMetadata blockMetadata(string $name)
 * @method static array<string, Block> blocks()
 * @method static void registerMarks(MarkSchema|array<array-key, MarkSchema> $marks)
 * @method static Document validate(array<array-key, mixed>|string|Document|null $value)
 * @method static RenderedContent render(array<array-key, mixed>|string|Document|null $value, ?RenderContext $context = null)
 * @method static EditorManifest editorManifest()
 * @method static AssetManifest assets()
 * @method static DistributedAsset asset(string $name)
 * @method static string assetUrl(string $name)
 *
 * @see \KatonFajar\LaravelBlocks\LaravelBlocks
 */
final class LaravelBlocks extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \KatonFajar\LaravelBlocks\LaravelBlocks::class;
    }
}
