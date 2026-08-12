<?php

use KatonFajar\LaravelBlocks\Blocks\Text\Heading;
use KatonFajar\LaravelBlocks\Blocks\Text\Paragraph;

return [
    'blocks' => [
        Paragraph::class,
        Heading::class,
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
