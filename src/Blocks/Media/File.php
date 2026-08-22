<?php

namespace KatonFajar\LaravelBlocks\Blocks\Media;

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final class File extends Block
{
    public function name(): string
    {
        return 'file';
    }

    public function label(): string
    {
        return 'File';
    }

    public function view(): string
    {
        return 'laravel-blocks::blocks.file';
    }

    public function description(): string
    {
        return 'Link to a downloadable PDF file.';
    }

    public function category(): string
    {
        return 'media';
    }

    public function keywords(): array
    {
        return ['file', 'download', 'pdf', 'document'];
    }

    public function icon(): string
    {
        return 'file';
    }

    public function fields(): array
    {
        return [
            [
                'name' => 'src',
                'type' => 'url',
                'label' => 'File URL',
                'help' => 'HTTP or HTTPS URL for a downloadable PDF.',
            ],
            [
                'name' => 'title',
                'type' => 'text',
                'label' => 'Link text',
                'help' => 'Text shown for the download link.',
            ],
            [
                'name' => 'filename',
                'type' => 'text',
                'label' => 'Filename',
                'help' => 'Suggested download filename from the media provider.',
            ],
            [
                'name' => 'mimeType',
                'type' => 'select',
                'label' => 'File type',
                'help' => 'The first built-in File contract accepts PDFs only.',
            ],
            [
                'name' => 'bytes',
                'type' => 'number',
                'label' => 'File size',
                'help' => 'Byte size reported by the media provider.',
            ],
        ];
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'src' => AttributeRule::url(nullable: true),
                'title' => AttributeRule::string(nullable: true, maximumLength: 500),
                'filename' => AttributeRule::string(nullable: true, maximumLength: 255),
                'mimeType' => AttributeRule::string(
                    nullable: true,
                    allowedValues: ['application/pdf'],
                ),
                'bytes' => AttributeRule::integer(nullable: true, minimum: 0),
            ],
            allowedParents: ['doc', 'blockquote'],
        );
    }
}
