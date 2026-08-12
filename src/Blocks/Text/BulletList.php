<?php

namespace KatonFajar\LaravelBlocks\Blocks\Text;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class BulletList extends Block
{
    public function name(): string
    {
        return 'bulletList';
    }

    public function label(): string
    {
        return 'Bullet List';
    }

    public function view(): string
    {
        return 'laravel-blocks::blocks.bullet-list';
    }

    public function description(): string
    {
        return 'Create a bulleted list.';
    }

    public function category(): string
    {
        return 'text';
    }

    public function keywords(): array
    {
        return ['list', 'bullet', 'unordered'];
    }

    public function icon(): string
    {
        return 'list';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
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
