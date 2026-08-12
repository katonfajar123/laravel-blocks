<?php

use Illuminate\Contracts\Config\Repository;
use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\LaravelBlocks;

it('shares one registry through the container service and facade', function (): void {
    config()->set('laravel-blocks.blocks', []);

    $registry = $this->app->make(BlockRegistry::class);
    $service = $this->app->make(LaravelBlocks::class);

    LaravelBlocksFacade::register(FeatureConfiguredBlock::class);

    $block = LaravelBlocksFacade::block('configuredBlock');

    expect($registry)->toBe($this->app->make(BlockRegistry::class))
        ->and($block)->toBe($registry->get('configuredBlock'))
        ->toBe($service->block('configuredBlock'))
        ->and($block->label())->toBe('Unknown policy: throw')
        ->and($service->blocks())->toBe(['configuredBlock' => $block])
        ->and(LaravelBlocksFacade::blockMetadata('configuredBlock'))
        ->toBe($block->metadata());
});

final class FeatureConfiguredBlock extends Block
{
    public function __construct(private readonly Repository $config) {}

    public function name(): string
    {
        return 'configuredBlock';
    }

    public function label(): string
    {
        return sprintf(
            'Unknown policy: %s',
            (string) $this->config->get('laravel-blocks.document.unknown_blocks'),
        );
    }

    public function view(): string
    {
        return 'blocks.configured';
    }
}
