<?php

namespace Tests\Fixtures\Blocks;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class ImageBlock extends Block
{
    public function name(): string
    {
        return 'image';
    }

    public function label(): string
    {
        return 'Image';
    }

    public function view(): string
    {
        return 'fixtures::image';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'alt' => AttributeRule::string(required: true),
                'src' => AttributeRule::url(required: true),
            ],
            maximumChildren: 0,
        );
    }
}
