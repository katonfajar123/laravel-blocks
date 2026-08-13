<?php

use KatonFajar\LaravelBlocks\Assets\AssetManifest;
use KatonFajar\LaravelBlocks\Blocks\Media\Image;
use KatonFajar\LaravelBlocks\Blocks\Text\BulletList;
use KatonFajar\LaravelBlocks\Blocks\Text\Code;
use KatonFajar\LaravelBlocks\Blocks\Text\Heading;
use KatonFajar\LaravelBlocks\Blocks\Text\ListItem;
use KatonFajar\LaravelBlocks\Blocks\Text\OrderedList;
use KatonFajar\LaravelBlocks\Blocks\Text\Paragraph;
use KatonFajar\LaravelBlocks\Blocks\Text\Quote;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\LaravelBlocks;
use KatonFajar\LaravelBlocks\LaravelBlocksServiceProvider;
use KatonFajar\LaravelBlocks\Media\LaravelFilesystemMediaProvider;

it('boots the package and resolves the facade singleton', function (): void {
    $service = $this->app->make(LaravelBlocks::class);

    expect($service)
        ->toBe($this->app->make('laravel-blocks'))
        ->toBe(LaravelBlocksFacade::getFacadeRoot())
        ->and(LaravelBlocksFacade::configuration())
        ->toBe($service->configuration());
});

it('merges serializable configuration and registers its publish group', function (): void {
    $configuration = $this->app->make('config')->get('laravel-blocks');
    $packageRoot = dirname(__DIR__, 2);
    $published = LaravelBlocksServiceProvider::pathsToPublish(
        LaravelBlocksServiceProvider::class,
        'laravel-blocks-config',
    );
    $publishedViews = LaravelBlocksServiceProvider::pathsToPublish(
        LaravelBlocksServiceProvider::class,
        'laravel-blocks-views',
    );
    $publishedRendererViews = LaravelBlocksServiceProvider::pathsToPublish(
        LaravelBlocksServiceProvider::class,
        'laravel-blocks-renderer-views',
    );
    $publishedAssets = LaravelBlocksServiceProvider::pathsToPublish(
        LaravelBlocksServiceProvider::class,
        'laravel-blocks-assets',
    );

    expect($configuration)
        ->toBeArray()
        ->and($configuration['blocks'])
        ->toBe([
            Paragraph::class,
            Heading::class,
            BulletList::class,
            OrderedList::class,
            ListItem::class,
            Quote::class,
            Code::class,
            Image::class,
        ])
        ->and($configuration['marks'])
        ->toBe(['bold', 'italic', 'link'])
        ->and($configuration['document']['unknown_blocks'])
        ->toBe('throw')
        ->and($configuration['document']['max_bytes'])
        ->toBe(1_048_576)
        ->and($configuration['document']['max_nodes'])
        ->toBe(10_000)
        ->and($configuration['document']['max_depth'])
        ->toBe(32)
        ->and($configuration['document']['max_text_bytes'])
        ->toBe(262_144)
        ->and($configuration['document']['max_attribute_bytes'])
        ->toBe(65_536)
        ->and($configuration['media']['provider'])
        ->toBe(LaravelFilesystemMediaProvider::class)
        ->and($configuration['media']['disk'])
        ->toBe('public')
        ->and($configuration['media']['directory'])
        ->toBe('laravel-blocks')
        ->and($configuration['media']['max_upload_bytes'])
        ->toBe(10_485_760)
        ->and($configuration['media']['allowed_mime_types'])
        ->not->toContain('image/svg+xml')
        ->and(json_encode($configuration, JSON_THROW_ON_ERROR))
        ->toBeString()
        ->and($published)
        ->toBe([
            $packageRoot.'/config/laravel-blocks.php' => config_path('laravel-blocks.php'),
        ])
        ->and($publishedViews)
        ->toBe([
            $packageRoot.'/resources/views/blocks' => resource_path('views/vendor/laravel-blocks/blocks'),
        ])
        ->and($publishedRendererViews)
        ->toBe([
            $packageRoot.'/resources/views/blocks' => resource_path('views/vendor/laravel-blocks/blocks'),
        ])
        ->and($publishedAssets)
        ->toBe([
            $packageRoot.'/dist' => public_path(AssetManifest::PUBLIC_PATH),
        ])
        ->and(array_keys($publishedViews))
        ->not->toContain($packageRoot.'/resources/views/components');
});

it('discovers the provider and boots without database artifacts', function (): void {
    $packageRoot = dirname(__DIR__, 2);
    $metadata = json_decode(
        file_get_contents($packageRoot.'/composer.json'),
        true,
        512,
        JSON_THROW_ON_ERROR,
    );

    expect($metadata['extra']['laravel']['providers'])
        ->toContain(LaravelBlocksServiceProvider::class)
        ->and(array_keys($metadata['require']))
        ->toContain('ext-fileinfo', 'illuminate/console', 'illuminate/filesystem', 'illuminate/http')
        ->and(array_keys($metadata['require']))
        ->not->toContain('illuminate/database')
        ->and(is_dir($packageRoot.'/database/migrations'))
        ->toBeFalse()
        ->and(is_dir($packageRoot.'/src/Models'))
        ->toBeFalse()
        ->and(LaravelBlocksServiceProvider::pathsToPublish(
            LaravelBlocksServiceProvider::class,
            'laravel-blocks-migrations',
        ))
        ->toBe([]);
});
