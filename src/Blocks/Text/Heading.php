<?php

namespace KatonFajar\LaravelBlocks\Blocks\Text;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class Heading extends Block
{
    /** @var list<int> */
    private const LEVELS = [1, 2, 3, 4, 5, 6];

    public function name(): string
    {
        return 'heading';
    }

    public function label(): string
    {
        return 'Heading';
    }

    public function view(): string
    {
        return 'laravel-blocks::blocks.heading';
    }

    public function description(): string
    {
        return 'Introduce a section with a heading.';
    }

    public function category(): string
    {
        return 'text';
    }

    public function keywords(): array
    {
        return ['title', 'headline', 'section'];
    }

    public function icon(): string
    {
        return 'heading';
    }

    public function fields(): array
    {
        return [[
            'name' => 'level',
            'type' => 'select',
            'label' => 'Level',
            'default' => 2,
            'help' => 'Choose the heading level.',
        ]];
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'level' => AttributeRule::integer(required: true, allowedValues: self::LEVELS),
                'design' => AttributeRule::object(),
                'advanced' => AttributeRule::object(),
            ],
            allowedParents: ['doc', 'blockquote'],
            allowedChildren: ['text'],
            allowedMarks: ['bold', 'italic', 'highlight', 'link'],
            maximumChildren: null,
        );
    }
}
