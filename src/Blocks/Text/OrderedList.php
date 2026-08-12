<?php

namespace KatonFajar\LaravelBlocks\Blocks\Text;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class OrderedList extends Block
{
    public function name(): string
    {
        return 'orderedList';
    }

    public function label(): string
    {
        return 'Ordered List';
    }

    public function view(): string
    {
        return 'laravel-blocks::blocks.ordered-list';
    }

    public function description(): string
    {
        return 'Create a numbered list.';
    }

    public function category(): string
    {
        return 'text';
    }

    public function keywords(): array
    {
        return ['list', 'numbered', 'ordered'];
    }

    public function icon(): string
    {
        return 'list';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'start' => AttributeRule::integer(minimum: 1),
                'type' => AttributeRule::string(nullable: true, allowedValues: ['1', 'a', 'A', 'i', 'I']),
                'design' => AttributeRule::object(),
                'advanced' => AttributeRule::object(),
            ],
            allowedParents: ['doc'],
            allowedChildren: ['listItem'],
            minimumChildren: 1,
            maximumChildren: null,
        );
    }
}
