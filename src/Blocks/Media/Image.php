<?php

namespace KatonFajar\LaravelBlocks\Blocks\Media;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class Image extends Block
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
        return 'laravel-blocks::blocks.image';
    }

    public function description(): string
    {
        return 'Display an image from a URL.';
    }

    public function category(): string
    {
        return 'media';
    }

    public function keywords(): array
    {
        return ['image', 'photo', 'picture', 'media'];
    }

    public function icon(): string
    {
        return 'image';
    }

    public function fields(): array
    {
        return [
            [
                'name' => 'src',
                'type' => 'url',
                'label' => 'Image URL',
                'help' => 'HTTP or HTTPS URL.',
            ],
            [
                'name' => 'alt',
                'type' => 'text',
                'label' => 'Alternative text',
            ],
            [
                'name' => 'title',
                'type' => 'text',
                'label' => 'Title',
            ],
        ];
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'src' => AttributeRule::url(nullable: true),
                'alt' => AttributeRule::string(nullable: true, maximumLength: 500),
                'title' => AttributeRule::string(nullable: true, maximumLength: 500),
            ],
            allowedParents: ['doc', 'blockquote'],
        );
    }
}
