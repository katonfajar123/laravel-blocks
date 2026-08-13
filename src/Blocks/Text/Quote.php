<?php

namespace KatonFajar\LaravelBlocks\Blocks\Text;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class Quote extends Block
{
    public function name(): string
    {
        return 'blockquote';
    }

    public function label(): string
    {
        return 'Quote';
    }

    public function view(): string
    {
        return 'laravel-blocks::blocks.quote';
    }

    public function description(): string
    {
        return 'Highlight a quotation.';
    }

    public function category(): string
    {
        return 'text';
    }

    public function keywords(): array
    {
        return ['quote', 'quotation', 'blockquote'];
    }

    public function icon(): string
    {
        return 'quote';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'design' => AttributeRule::object(),
                'advanced' => AttributeRule::object(),
            ],
            allowedParents: ['doc', 'blockquote'],
            allowedChildren: [
                'paragraph',
                'heading',
                'bulletList',
                'orderedList',
                'blockquote',
                'codeBlock',
                'image',
            ],
            minimumChildren: 1,
            maximumChildren: null,
        );
    }
}
