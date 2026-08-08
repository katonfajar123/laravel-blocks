<?php

use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\LaravelBlocks;
use KatonFajar\LaravelBlocks\LaravelBlocksServiceProvider;

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

    expect($configuration)
        ->toBeArray()
        ->and($configuration['document']['unknown_blocks'])
        ->toBe('throw')
        ->and(json_encode($configuration, JSON_THROW_ON_ERROR))
        ->toBeString()
        ->and($published)
        ->toBe([
            $packageRoot.'/config/laravel-blocks.php' => config_path('laravel-blocks.php'),
        ]);
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
