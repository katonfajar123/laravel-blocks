<?php

namespace Tests\Fixtures\Blocks;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class ExplodingBlock extends Block
{
    public function name(): string
    {
        return 'exploding';
    }

    public function label(): string
    {
        return 'Exploding';
    }

    public function view(): string
    {
        return 'fixtures::exploding';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'title' => AttributeRule::string(required: true),
            ],
        );
    }
}
