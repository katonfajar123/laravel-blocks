<?php

use KatonFajar\LaravelBlocks\Blocks\Media\Gallery;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

it('registers gallery from the default package configuration', function (): void {
    $blocks = LaravelBlocksFacade::blocks();

    expect($blocks['gallery'])
        ->toBeInstanceOf(Gallery::class)
        ->and(array_keys($blocks))
        ->toBe([
            'paragraph',
            'heading',
            'bulletList',
            'orderedList',
            'listItem',
            'blockquote',
            'codeBlock',
            'image',
            'gallery',
            'video',
            'file',
        ]);
});

it('validates and safely renders ordered image metadata', function (): void {
    $content = LaravelBlocksFacade::render(galleryDocument([
        galleryImage([
            'src' => 'https://media.example.test/first.jpg?size=large&crop=square',
            'alt' => 'First <photo>',
            'title' => 'Title "one"',
            'caption' => 'Caption <one>',
            'id' => 'first-id',
            'mimeType' => 'image/jpeg',
            'width' => 1200,
            'height' => 800,
        ]),
        galleryImage([
            'src' => 'https://media.example.test/second.png',
            'alt' => null,
            'title' => null,
            'caption' => null,
            'id' => null,
            'mimeType' => 'image/png',
            'width' => null,
            'height' => null,
        ]),
    ]));

    $html = trim($content->toHtml());

    expect($html)
        ->toContain(
            '<figure class="laravel-blocks-gallery">',
            '<div class="laravel-blocks-gallery__grid">',
            'src="https://media.example.test/first.jpg?size=large&amp;crop=square"',
            'alt="First &lt;photo&gt;"',
            'title="Title &quot;one&quot;"',
            'width="1200"',
            'height="800"',
            '<figcaption>Caption &lt;one&gt;</figcaption>',
            'src="https://media.example.test/second.png"',
            'alt=""',
        )
        ->not->toContain('<photo>', '<one>');
});

it('accepts an empty gallery placeholder without frontend output', function (): void {
    expect(LaravelBlocksFacade::render(galleryDocument([]))->toHtml())->toBe('');
});

it('accepts gallery inside quotes', function (): void {
    expect(fn () => LaravelBlocksFacade::validate([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'blockquote',
            'content' => [[
                'type' => 'gallery',
                'attrs' => [
                    'images' => [
                        galleryImage([
                            'src' => 'https://media.example.test/quoted.jpg',
                            'alt' => 'Quoted image',
                            'mimeType' => 'image/jpeg',
                        ]),
                    ],
                ],
            ]],
        ]],
    ]))->not->toThrow(DocumentValidationException::class);
});

it('rejects unsafe gallery attributes and invalid leaf content', function (array $gallery, string $reason, string $path): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [$gallery],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe($reason)
            ->and($exception->documentPath())
            ->toBe($path);

        return;
    }

    throw new RuntimeException('Expected invalid gallery validation to fail.');
})->with([
    'missing images' => [
        ['type' => 'gallery', 'attrs' => []],
        'missing_attribute',
        '$.content[0].attrs.images',
    ],
    'images must be a list' => [
        galleryNode(['first' => galleryImage()]),
        'invalid_attribute_type',
        '$.content[0].attrs.images',
    ],
    'unsafe image source scheme' => [
        galleryNode([galleryImage(['src' => 'javascript:alert(1)'])]),
        'unsafe_url_scheme',
        '$.content[0].attrs.images[0].src',
    ],
    'unsupported mime type' => [
        galleryNode([galleryImage(['mimeType' => 'text/plain'])]),
        'attribute_value_not_allowed',
        '$.content[0].attrs.images[0].mimeType',
    ],
    'undeclared image item attribute' => [
        galleryNode([[
            ...galleryImage(),
            'href' => 'https://media.example.test/extra.jpg',
        ]]),
        'undeclared_attribute',
        '$.content[0].attrs.images[0].href',
    ],
    'oversized caption' => [
        galleryNode([galleryImage(['caption' => str_repeat('g', 1001)])]),
        'attribute_too_long',
        '$.content[0].attrs.images[0].caption',
    ],
    'negative width' => [
        galleryNode([galleryImage(['width' => -1])]),
        'attribute_below_minimum',
        '$.content[0].attrs.images[0].width',
    ],
    'too many images' => [
        galleryNode(array_fill(0, 51, galleryImage())),
        'attribute_too_long',
        '$.content[0].attrs.images',
    ],
    'child content' => [
        [...galleryNode(), 'content' => [['type' => 'paragraph']]],
        'maximum_children_exceeded',
        '$.content[0].content',
    ],
]);

it('exposes gallery metadata through the editor manifest', function (): void {
    $manifest = LaravelBlocksFacade::editorManifest()->toArray();
    $gallery = collect($manifest['blocks'])->firstWhere('name', 'gallery');

    expect($gallery)
        ->toMatchArray([
            'name' => 'gallery',
            'label' => 'Gallery',
            'description' => 'Display a group of selected images.',
            'category' => 'media',
            'keywords' => ['gallery', 'images', 'photos', 'media'],
            'icon' => 'gallery',
        ])
        ->and($gallery['fields'])
        ->toBe([])
        ->and($gallery['supports']['inserter'])
        ->toBeTrue();
});

/** @param list<array<string, mixed>> $images */
function galleryDocument(array $images): array
{
    return [
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'gallery',
            'attrs' => ['images' => $images],
        ]],
    ];
}

/** @param list<array<string, mixed>> $images */
function galleryNode(array $images = []): array
{
    return [
        'type' => 'gallery',
        'attrs' => ['images' => $images],
    ];
}

/** @param array<string, mixed> $overrides */
function galleryImage(array $overrides = []): array
{
    return [
        'src' => 'https://media.example.test/gallery.jpg',
        'alt' => null,
        'title' => null,
        'caption' => null,
        'id' => null,
        'mimeType' => 'image/jpeg',
        'width' => null,
        'height' => null,
        ...$overrides,
    ];
}
