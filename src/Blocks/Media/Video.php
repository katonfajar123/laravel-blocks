<?php

namespace KatonFajar\LaravelBlocks\Blocks\Media;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class Video extends Block
{
    public function name(): string
    {
        return 'video';
    }

    public function label(): string
    {
        return 'Video';
    }

    public function view(): string
    {
        return 'laravel-blocks::blocks.video';
    }

    public function description(): string
    {
        return 'Display an uploaded or remote video.';
    }

    public function category(): string
    {
        return 'media';
    }

    public function keywords(): array
    {
        return ['video', 'movie', 'media', 'mp4', 'webm'];
    }

    public function icon(): string
    {
        return 'video';
    }

    public function fields(): array
    {
        return [
            [
                'name' => 'src',
                'type' => 'url',
                'label' => 'Video URL',
                'help' => 'HTTP or HTTPS URL for an MP4 or WebM video.',
            ],
            [
                'name' => 'poster',
                'type' => 'url',
                'label' => 'Poster URL',
                'help' => 'Optional HTTP or HTTPS preview image.',
            ],
            [
                'name' => 'title',
                'type' => 'text',
                'label' => 'Accessible title',
                'help' => 'Briefly identify the video for assistive technology.',
            ],
            [
                'name' => 'captionSrc',
                'type' => 'url',
                'label' => 'Caption track URL',
                'help' => 'Optional HTTP or HTTPS URL for a WebVTT captions file.',
            ],
            [
                'name' => 'captionLanguage',
                'type' => 'text',
                'label' => 'Caption language',
                'help' => 'BCP 47 language tag such as en, en-US, or id.',
            ],
            [
                'name' => 'captionLabel',
                'type' => 'text',
                'label' => 'Caption label',
                'help' => 'Human-readable track name such as English or Bahasa Indonesia.',
            ],
        ];
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'src' => AttributeRule::url(nullable: true),
                'poster' => AttributeRule::url(nullable: true),
                'title' => AttributeRule::string(nullable: true, maximumLength: 500),
                'captionSrc' => AttributeRule::url(nullable: true),
                'captionLanguage' => AttributeRule::string(nullable: true, maximumLength: 35),
                'captionLabel' => AttributeRule::string(nullable: true, maximumLength: 200),
            ],
            allowedParents: ['doc', 'blockquote'],
        );
    }
}
