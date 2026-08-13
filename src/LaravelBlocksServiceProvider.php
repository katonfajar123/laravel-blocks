<?php

namespace KatonFajar\LaravelBlocks;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Container\Container;
use Illuminate\Contracts\View\Factory as ViewFactory;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;
use KatonFajar\LaravelBlocks\Assets\AssetManifest;
use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;
use KatonFajar\LaravelBlocks\Console\InstallCommand;
use KatonFajar\LaravelBlocks\Manifest\EditorManifestGenerator;
use KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider;
use KatonFajar\LaravelBlocks\Media\LaravelFilesystemMediaProvider;
use KatonFajar\LaravelBlocks\Media\MediaConfiguration;
use KatonFajar\LaravelBlocks\Rendering\DocumentRenderer;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;
use KatonFajar\LaravelBlocks\Validation\AttributeValidator;
use KatonFajar\LaravelBlocks\Validation\DocumentValidator;
use KatonFajar\LaravelBlocks\Validation\MarkRegistry;
use KatonFajar\LaravelBlocks\Validation\MarkSchema;
use KatonFajar\LaravelBlocks\Validation\MarkValidator;
use KatonFajar\LaravelBlocks\Validation\NodeValidator;
use KatonFajar\LaravelBlocks\Validation\ValidationLimits;
use KatonFajar\LaravelBlocks\View\Components\Assets;
use KatonFajar\LaravelBlocks\View\Components\Content;
use KatonFajar\LaravelBlocks\View\Components\Editor;

final class LaravelBlocksServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom($this->packageConfigPath(), 'laravel-blocks');

        $this->app->singleton(
            BlockRegistry::class,
            static fn (Container $app): BlockRegistry => new BlockRegistry($app),
        );
        $this->registerConfiguredBlocks();

        $this->app->singleton(
            AssetManifest::class,
            static fn (Container $app): AssetManifest => new AssetManifest(
                $app->make(Repository::class),
                dirname(__DIR__).'/dist',
            ),
        );

        $this->app->singleton(MarkRegistry::class);
        $this->registerConfiguredMarks();

        $this->app->singleton(
            MediaConfiguration::class,
            static fn (Container $app): MediaConfiguration => MediaConfiguration::fromRepository(
                $app->make(Repository::class),
            ),
        );
        $this->app->singleton(LaravelFilesystemMediaProvider::class);
        $this->app->singleton(
            MediaProvider::class,
            static function (Container $app): MediaProvider {
                $provider = $app->make(Repository::class)
                    ->get('laravel-blocks.media.provider', LaravelFilesystemMediaProvider::class);

                if (! is_string($provider)
                    || $provider === MediaProvider::class
                    || ! is_a($provider, MediaProvider::class, true)) {
                    throw new InvalidArgumentException('Configured Laravel Blocks media provider must implement MediaProvider.');
                }

                $resolved = $app->make($provider);

                if (! $resolved instanceof MediaProvider) {
                    throw new InvalidArgumentException('Configured Laravel Blocks media provider did not resolve to MediaProvider.');
                }

                return $resolved;
            },
        );

        $this->app->singleton(
            EditorManifestGenerator::class,
            static fn (Container $app): EditorManifestGenerator => new EditorManifestGenerator(
                $app->make(BlockRegistry::class),
            ),
        );
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
                $app->make(EditorManifestGenerator::class),
                $app->make(AssetManifest::class),
                $app->make(MediaProvider::class),
            ),
        );

        $this->app->alias(LaravelBlocks::class, 'laravel-blocks');
    }

    public function boot(): void
    {
        $this->loadViewsFrom($this->packageViewsPath(), 'laravel-blocks');
        $this->registerBladeComponents();

        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->commands([
            InstallCommand::class,
        ]);

        $this->publishes([
            $this->packageConfigPath() => config_path('laravel-blocks.php'),
        ], 'laravel-blocks-config');

        $rendererViews = [
            $this->packageBlockViewsPath() => resource_path('views/vendor/laravel-blocks/blocks'),
        ];

        $this->publishes($rendererViews, 'laravel-blocks-renderer-views');
        $this->publishes($rendererViews, 'laravel-blocks-views');

        $this->publishes([
            $this->packageDistPath() => public_path(AssetManifest::PUBLIC_PATH),
        ], 'laravel-blocks-assets');
    }

    private function registerBladeComponents(): void
    {
        Blade::componentNamespace(
            __NAMESPACE__.'\\View\\Components',
            'laravel-blocks',
        );
        Blade::component(Editor::class, 'laravel-blocks::editor');
        Blade::component(Assets::class, 'laravel-blocks::assets');
        Blade::component(Content::class, 'laravel-blocks::content');
    }

    private function registerConfiguredBlocks(): void
    {
        $this->app->afterResolving(
            BlockRegistry::class,
            static function (BlockRegistry $registry, Container $app): void {
                $configuredBlocks = $app->make(Repository::class)
                    ->get('laravel-blocks.blocks', []);

                if (! is_array($configuredBlocks) || $configuredBlocks === []) {
                    return;
                }

                /** @var array<array-key, class-string<Block>|Block> $configuredBlocks */
                $registry->register($configuredBlocks);
            },
        );
    }

    private function registerConfiguredMarks(): void
    {
        $this->app->afterResolving(
            MarkRegistry::class,
            static function (MarkRegistry $registry, Container $app): void {
                $configuredMarks = $app->make(Repository::class)
                    ->get('laravel-blocks.marks', []);

                if (! is_array($configuredMarks) || $configuredMarks === []) {
                    return;
                }

                $schemas = array_map(
                    static fn (mixed $mark): MarkSchema => self::configuredMarkSchema($mark),
                    array_values($configuredMarks),
                );

                $registry->register($schemas);
            },
        );
    }

    private static function configuredMarkSchema(mixed $mark): MarkSchema
    {
        if ($mark instanceof MarkSchema) {
            return $mark;
        }

        if ($mark === 'link') {
            return new MarkSchema('link', [
                'href' => AttributeRule::url(
                    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
                    required: true,
                ),
                'target' => AttributeRule::string(nullable: true, allowedValues: ['_blank']),
                'rel' => AttributeRule::string(nullable: true, allowedValues: ['noopener noreferrer']),
            ]);
        }

        if (is_string($mark)) {
            return new MarkSchema($mark);
        }

        throw new InvalidArgumentException('Configured Laravel Blocks marks must be mark names or MarkSchema instances.');
    }

    private function packageConfigPath(): string
    {
        return dirname(__DIR__).'/config/laravel-blocks.php';
    }

    private function packageViewsPath(): string
    {
        return dirname(__DIR__).'/resources/views';
    }

    private function packageBlockViewsPath(): string
    {
        return dirname(__DIR__).'/resources/views/blocks';
    }

    private function packageDistPath(): string
    {
        return dirname(__DIR__).'/dist';
    }
}
