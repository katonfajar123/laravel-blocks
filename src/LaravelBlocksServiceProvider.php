<?php

namespace KatonFajar\LaravelBlocks;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Container\Container;
use Illuminate\Contracts\View\Factory as ViewFactory;
use Illuminate\Support\ServiceProvider;
use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;
use KatonFajar\LaravelBlocks\Rendering\DocumentRenderer;
use KatonFajar\LaravelBlocks\Validation\AttributeValidator;
use KatonFajar\LaravelBlocks\Validation\DocumentValidator;
use KatonFajar\LaravelBlocks\Validation\MarkRegistry;
use KatonFajar\LaravelBlocks\Validation\MarkValidator;
use KatonFajar\LaravelBlocks\Validation\NodeValidator;
use KatonFajar\LaravelBlocks\Validation\ValidationLimits;

final class LaravelBlocksServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom($this->packageConfigPath(), 'laravel-blocks');

        $this->app->singleton(
            BlockRegistry::class,
            static fn (Container $app): BlockRegistry => new BlockRegistry($app),
        );

        $this->app->singleton(MarkRegistry::class);
        $this->app->singleton(AttributeValidator::class);
        $this->app->singleton(
            ValidationLimits::class,
            static function (Container $app): ValidationLimits {
                $configuration = $app->make(Repository::class)
                    ->get('laravel-blocks.document', []);

                return ValidationLimits::fromArray(
                    is_array($configuration) ? $configuration : [],
                );
            },
        );
        $this->app->singleton(
            MarkValidator::class,
            static fn (Container $app): MarkValidator => new MarkValidator(
                $app->make(MarkRegistry::class),
                $app->make(AttributeValidator::class),
            ),
        );
        $this->app->singleton(
            NodeValidator::class,
            static fn (Container $app): NodeValidator => new NodeValidator(
                $app->make(BlockRegistry::class),
                $app->make(AttributeValidator::class),
                $app->make(MarkValidator::class),
            ),
        );
        $this->app->singleton(
            DocumentValidator::class,
            static fn (Container $app): DocumentValidator => new DocumentValidator(
                $app->make(NodeValidator::class),
                $app->make(ValidationLimits::class),
            ),
        );
        $this->app->singleton(
            DocumentRenderer::class,
            static fn (Container $app): DocumentRenderer => new DocumentRenderer(
                $app->make(Repository::class),
                $app->make(ViewFactory::class),
                $app->make(BlockRegistry::class),
                $app->make(AttributeValidator::class),
                $app->make(MarkValidator::class),
                $app->make(ValidationLimits::class),
            ),
        );

        $this->app->singleton(
            LaravelBlocks::class,
            static fn (Container $app): LaravelBlocks => new LaravelBlocks(
                $app->make(Repository::class),
                $app->make(BlockRegistry::class),
                $app->make(MarkRegistry::class),
                $app->make(DocumentValidator::class),
                $app->make(DocumentRenderer::class),
            ),
        );

        $this->app->alias(LaravelBlocks::class, 'laravel-blocks');
    }

    public function boot(): void
    {
        $this->loadViewsFrom($this->packageViewsPath(), 'laravel-blocks');

        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->publishes([
            $this->packageConfigPath() => config_path('laravel-blocks.php'),
        ], 'laravel-blocks-config');

        $this->publishes([
            $this->packageViewsPath() => resource_path('views/vendor/laravel-blocks'),
        ], 'laravel-blocks-views');
    }

    private function packageConfigPath(): string
    {
        return dirname(__DIR__).'/config/laravel-blocks.php';
    }

    private function packageViewsPath(): string
    {
        return dirname(__DIR__).'/resources/views';
    }
}
