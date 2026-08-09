<?php

namespace Tests\Fixtures\Blocks;

use KatonFajar\LaravelBlocks\Blocks\Block;

final class MissingViewBlock extends Block
{
    public function name(): string
    {
        return 'missingView';
    }

    public function label(): string
    {
        return 'Missing View';
    }

    public function view(): string
    {
        return 'fixtures::missing-view';
    }
}
