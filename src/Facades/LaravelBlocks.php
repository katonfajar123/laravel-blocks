<?php

namespace KatonFajar\LaravelBlocks\Facades;

use Illuminate\Support\Facades\Facade;
use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockMetadata;

/**
 * @method static array<string, mixed> configuration()
 * @method static void register(class-string<Block>|Block|array<array-key, class-string<Block>|Block> $blocks)
 * @method static Block block(string $name)
 * @method static BlockMetadata blockMetadata(string $name)
 * @method static array<string, Block> blocks()
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
