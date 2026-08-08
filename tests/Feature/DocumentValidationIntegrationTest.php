<?php

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\LaravelBlocks;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;
use KatonFajar\LaravelBlocks\Validation\DocumentValidator;
use KatonFajar\LaravelBlocks\Validation\MarkRegistry;
use KatonFajar\LaravelBlocks\Validation\MarkSchema;
use KatonFajar\LaravelBlocks\Validation\ValidationLimits;

it('shares validator dependencies and validates through the service and facade', function (): void {
    LaravelBlocksFacade::register(B04FeatureParagraphBlock::class);
    LaravelBlocksFacade::registerMarks(new MarkSchema('bold'));

    $value = [
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'paragraph',
            'attrs' => ['align' => 'left'],
            'content' => [[
                'type' => 'text',
                'text' => 'Validated',
                'marks' => [['type' => 'bold']],
            ]],
        ]],
    ];
    $validator = $this->app->make(DocumentValidator::class);
    $service = $this->app->make(LaravelBlocks::class);

    expect($validator)->toBe($this->app->make(DocumentValidator::class))
        ->and($this->app->make(MarkRegistry::class))->toBe($this->app->make(MarkRegistry::class))
        ->and($service->validate($value))->toBeInstanceOf(Document::class)
        ->and(LaravelBlocksFacade::validate(json_encode($value, JSON_THROW_ON_ERROR))->toArray())
        ->toBe($value);
});

it('resolves frozen validation limits from package configuration', function (): void {
    $limits = $this->app->make(ValidationLimits::class);

    expect($limits->toArray())->toBe([
        'max_bytes' => 1_048_576,
        'max_nodes' => 10_000,
        'max_depth' => 32,
        'max_text_bytes' => 262_144,
        'max_attribute_bytes' => 65_536,
    ]);
});

final class B04FeatureParagraphBlock extends Block
{
    public function name(): string
    {
        return 'paragraph';
    }

    public function label(): string
    {
        return 'Paragraph';
    }

    public function view(): string
    {
        return 'blocks.paragraph';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'align' => AttributeRule::string(allowedValues: ['left', 'center']),
            ],
            allowedParents: ['doc'],
            allowedChildren: ['text'],
            allowedMarks: ['bold'],
            maximumChildren: null,
        );
    }
}
