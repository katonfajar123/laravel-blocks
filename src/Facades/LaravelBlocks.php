<?php

namespace KatonFajar\LaravelBlocks\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static array<string, mixed> configuration()
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
