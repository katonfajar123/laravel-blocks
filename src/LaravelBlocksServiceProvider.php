<?php

namespace KatonFajar\LaravelBlocks;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Container\Container;
use Illuminate\Support\ServiceProvider;
use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;

final class LaravelBlocksServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom($this->packageConfigPath(), 'laravel-blocks');

        $this->app->singleton(
            BlockRegistry::class,
            static fn (Container $app): BlockRegistry => new BlockRegistry($app),
        );

        $this->app->singleton(
            LaravelBlocks::class,
            static fn (Container $app): LaravelBlocks => new LaravelBlocks(
                $app->make(Repository::class),
                $app->make(BlockRegistry::class),
            ),
        );

        $this->app->alias(LaravelBlocks::class, 'laravel-blocks');
    }

    public function boot(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->publishes([
            $this->packageConfigPath() => config_path('laravel-blocks.php'),
        ], 'laravel-blocks-config');
    }

    private function packageConfigPath(): string
    {
        return dirname(__DIR__).'/config/laravel-blocks.php';
    }
}
