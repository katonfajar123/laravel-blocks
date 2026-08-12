<?php

namespace KatonFajar\LaravelBlocks\Blocks\Text;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;

final class ListItem extends Block
{
    public function name(): string
    {
        return 'listItem';
    }

    public function label(): string
    {
        return 'List Item';
    }

    public function view(): string
    {
        return 'laravel-blocks::blocks.list-item';
    }

    public function description(): string
    {
        return 'A structural item inside list blocks.';
    }

    public function category(): string
    {
        return 'text';
    }

    public function keywords(): array
    {
        return ['item'];
    }

    public function icon(): string
    {
        return 'list';
    }

    public function supports(): array
    {
        return [
            'inserter' => false,
            'reusable' => false,
        ];
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            allowedParents: ['bulletList', 'orderedList'],
            allowedChildren: ['paragraph'],
            minimumChildren: 1,
            maximumChildren: null,
        );
    }
}
