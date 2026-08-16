<?php

use KatonFajar\LaravelBlocks\Blocks\Media\Image;
use KatonFajar\LaravelBlocks\Blocks\Media\Video;
use KatonFajar\LaravelBlocks\Blocks\Text\BulletList;
use KatonFajar\LaravelBlocks\Blocks\Text\Code;
use KatonFajar\LaravelBlocks\Blocks\Text\Heading;
use KatonFajar\LaravelBlocks\Blocks\Text\ListItem;
use KatonFajar\LaravelBlocks\Blocks\Text\OrderedList;
use KatonFajar\LaravelBlocks\Blocks\Text\Paragraph;
use KatonFajar\LaravelBlocks\Blocks\Text\Quote;
use KatonFajar\LaravelBlocks\Media\LaravelFilesystemMediaProvider;

return [
    'blocks' => [
        Paragraph::class,
        Heading::class,
        BulletList::class,
        OrderedList::class,
        ListItem::class,
        Quote::class,
        Code::class,
        Image::class,
        Video::class,
    ],

    'marks' => [
        'bold',
        'italic',
        'highlight',
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

    'media' => [
        'provider' => LaravelFilesystemMediaProvider::class,
        'disk' => 'public',
        'directory' => 'laravel-blocks',
        'visibility' => 'public',
        'max_upload_bytes' => 10_485_760,
        'max_image_pixels' => 40_000_000,
        'max_items_per_page' => 100,
        'allowed_mime_types' => [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/avif',
            'video/mp4',
            'video/webm',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'application/pdf',
        ],
        'extensions' => [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/avif' => 'avif',
            'video/mp4' => 'mp4',
            'video/webm' => 'webm',
            'audio/mpeg' => 'mp3',
            'audio/wav' => 'wav',
            'audio/ogg' => 'ogg',
            'application/pdf' => 'pdf',
        ],
        'transport' => [
            'enabled' => true,
            'prefix' => 'laravel-blocks/media',
            'name_prefix' => 'laravel-blocks.media.',
            'middleware' => ['web', 'auth'],
            'abilities' => [
                'browse' => 'laravel-blocks.media.browse',
                'upload' => 'laravel-blocks.media.upload',
            ],
            'browse_requests_per_minute' => 60,
            'upload_requests_per_minute' => 10,
        ],
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
