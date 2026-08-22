<?php

namespace KatonFajar\LaravelBlocks\Blocks\Media;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class Gallery extends Block
{
    /** @var list<string> */
    private const IMAGE_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
    ];

    public function name(): string
    {
        return 'gallery';
    }

    public function label(): string
    {
        return 'Gallery';
    }

    public function view(): string
    {
        return 'laravel-blocks::blocks.gallery';
    }

    public function description(): string
    {
        return 'Display a group of selected images.';
    }

    public function category(): string
    {
        return 'media';
    }

    public function keywords(): array
    {
        return ['gallery', 'images', 'photos', 'media'];
    }

    public function icon(): string
    {
        return 'gallery';
    }

    public function fields(): array
    {
        return [];
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'images' => AttributeRule::listOf(
                    AttributeRule::object([
                        'src' => AttributeRule::url(required: true),
                        'alt' => AttributeRule::string(nullable: true, maximumLength: 500),
                        'title' => AttributeRule::string(nullable: true, maximumLength: 500),
                        'caption' => AttributeRule::string(nullable: true, maximumLength: 1000),
                        'id' => AttributeRule::string(nullable: true, maximumLength: 255),
                        'mimeType' => AttributeRule::string(
                            nullable: true,
                            maximumLength: 100,
                            allowedValues: self::IMAGE_MIME_TYPES,
                        ),
                        'width' => AttributeRule::integer(nullable: true, minimum: 0),
                        'height' => AttributeRule::integer(nullable: true, minimum: 0),
                    ]),
                    required: true,
                    maximumItems: 50,
                ),
            ],
            allowedParents: ['doc', 'blockquote'],
        );
    }
}
