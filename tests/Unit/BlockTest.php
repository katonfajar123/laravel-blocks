<?php

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockMetadata;

it('provides frozen shared defaults', function (): void {
    $block = new class extends Block
    {
        public function name(): string
        {
            return 'hero';
        }

        public function label(): string
        {
            return 'Hero';
        }

        public function view(): string
        {
            return 'blocks.hero';
        }
    };

    expect($block->description())->toBeNull()
        ->and($block->category())->toBe('custom')
        ->and($block->keywords())->toBe([])
        ->and($block->icon())->toBeNull()
        ->and($block->fields())->toBe([])
        ->and($block->supports())->toBe([])
        ->and($block->editorComponent())->toBeNull();
});

it('captures immutable metadata once per block instance', function (): void {
    $block = new class extends Block
    {
        public int $labelCalls = 0;

        public function name(): string
        {
            return 'pricingTable';
        }

        public function label(): string
        {
            $this->labelCalls++;

            return 'Pricing Table';
        }

        public function view(): string
        {
            return 'blocks.pricing-table';
        }

        public function description(): ?string
        {
            return 'A comparison table.';
        }

        public function category(): string
        {
            return 'design';
        }

        public function keywords(): array
        {
            return ['pricing', 'comparison'];
        }

        public function icon(): ?string
        {
            return 'table';
        }

        public function editorComponent(): ?string
        {
            return 'PricingTableEditor';
        }
    };

    $metadata = $block->metadata();

    expect($metadata)->toBeInstanceOf(BlockMetadata::class)
        ->toBe($block->metadata())
        ->and($block->labelCalls)->toBe(1)
        ->and($metadata->name)->toBe('pricingTable')
        ->and($metadata->label)->toBe('Pricing Table')
        ->and($metadata->view)->toBe('blocks.pricing-table')
        ->and($metadata->description)->toBe('A comparison table.')
        ->and($metadata->category)->toBe('design')
        ->and($metadata->keywords)->toBe(['pricing', 'comparison'])
        ->and($metadata->icon)->toBe('table')
        ->and($metadata->editorComponent)->toBe('PricingTableEditor');
});
