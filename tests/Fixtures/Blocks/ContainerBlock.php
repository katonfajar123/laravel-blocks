<?php

namespace Tests\Fixtures\Blocks;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;

final class ContainerBlock extends Block
{
    public function name(): string
    {
        return 'container';
    }

    public function label(): string
    {
        return 'Container';
    }

    public function view(): string
    {
        return 'fixtures::container';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            allowedChildren: null,
            minimumChildren: 1,
            maximumChildren: null,
        );
    }
}
