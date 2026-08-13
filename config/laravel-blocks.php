<?php

use KatonFajar\LaravelBlocks\Blocks\Text\BulletList;
use KatonFajar\LaravelBlocks\Blocks\Text\Code;
use KatonFajar\LaravelBlocks\Blocks\Text\Heading;
use KatonFajar\LaravelBlocks\Blocks\Text\ListItem;
use KatonFajar\LaravelBlocks\Blocks\Text\OrderedList;
use KatonFajar\LaravelBlocks\Blocks\Text\Paragraph;
use KatonFajar\LaravelBlocks\Blocks\Text\Quote;

return [
    'blocks' => [
        Paragraph::class,
        Heading::class,
        BulletList::class,
        OrderedList::class,
        ListItem::class,
        Quote::class,
        Code::class,
    ],

    'marks' => [
        'bold',
        'italic',
        'link',
    ],

    'document' => [
        'max_bytes' => 1_048_576,
        'max_nodes' => 10_000,
        'max_depth' => 32,
        'max_text_bytes' => 262_144,
        'max_attribute_bytes' => 65_536,
        'unknown_blocks' => 'throw',
    ],

    'assets' => [
        'auto_inject' => true,
        'base_url' => null,
    ],

    'persistence' => [
        'reusable_blocks' => [
            'enabled' => false,
            'repository' => null,
        ],
        'custom_patterns' => [
            'enabled' => false,
            'repository' => null,
        ],
    ],
];
