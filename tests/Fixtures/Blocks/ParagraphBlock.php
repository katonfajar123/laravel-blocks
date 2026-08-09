<?php

namespace Tests\Fixtures\Blocks;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class ParagraphBlock extends Block
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
        return 'fixtures::paragraph';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'align' => AttributeRule::string(allowedValues: ['left', 'center', 'right']),
            ],
            allowedChildren: ['text'],
            maximumChildren: null,
        );
    }
}
