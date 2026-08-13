<?php

namespace KatonFajar\LaravelBlocks\Blocks\Text;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class Code extends Block
{
    public function name(): string
    {
        return 'codeBlock';
    }

    public function label(): string
    {
        return 'Code';
    }

    public function view(): string
    {
        return 'laravel-blocks::blocks.code';
    }

    public function description(): string
    {
        return 'Display preformatted code.';
    }

    public function category(): string
    {
        return 'text';
    }

    public function keywords(): array
    {
        return ['code', 'preformatted', 'snippet'];
    }

    public function icon(): string
    {
        return 'code';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'language' => AttributeRule::string(nullable: true, maximumLength: 100),
                'design' => AttributeRule::object(),
                'advanced' => AttributeRule::object(),
            ],
            allowedParents: ['doc', 'blockquote'],
            allowedChildren: ['text'],
            maximumChildren: null,
        );
    }
}
