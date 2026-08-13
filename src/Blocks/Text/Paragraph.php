<?php

namespace KatonFajar\LaravelBlocks\Blocks\Text;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class Paragraph extends Block
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
        return 'laravel-blocks::blocks.paragraph';
    }

    public function description(): string
    {
        return 'Write a text paragraph.';
    }

    public function category(): string
    {
        return 'text';
    }

    public function keywords(): array
    {
        return ['text', 'copy', 'body'];
    }

    public function icon(): string
    {
        return 'paragraph';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'design' => AttributeRule::object(),
                'advanced' => AttributeRule::object(),
            ],
            allowedParents: ['doc', 'listItem', 'blockquote'],
            allowedChildren: ['text'],
            allowedMarks: ['bold', 'italic', 'highlight', 'link'],
            maximumChildren: null,
        );
    }
}
