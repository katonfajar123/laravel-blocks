<?php

use KatonFajar\LaravelBlocks\Blocks\Media\Image;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

it('registers image from the default package configuration', function (): void {
    $blocks = LaravelBlocksFacade::blocks();

    expect($blocks['image'])
        ->toBeInstanceOf(Image::class)
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
        ]);
});

it('validates and safely renders image URLs and metadata', function (): void {
    $content = LaravelBlocksFacade::render(imageDocument([
        'src' => 'https://example.com/photo.png?size=large&crop=square',
        'alt' => 'A <safe> description',
        'title' => 'Photo "title"',
    ]));

    expect(trim($content->toHtml()))
        ->toBe('<img src="https://example.com/photo.png?size=large&amp;crop=square" alt="A &lt;safe&gt; description" title="Photo &quot;title&quot;">')
        ->not->toContain('<safe>');
});

it('accepts an empty image placeholder without frontend image output', function (): void {
    expect(LaravelBlocksFacade::render(imageDocument([
        'src' => null,
        'alt' => null,
        'title' => null,
    ]))->toHtml())->toBe('');
});

it('accepts image inside quotes', function (): void {
    expect(fn () => LaravelBlocksFacade::validate([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'blockquote',
            'content' => [[
                'type' => 'image',
                'attrs' => [
                    'src' => 'https://example.com/inside-quote.jpg',
                    'alt' => 'Quoted image',
                    'title' => null,
                ],
            ]],
        ]],
    ]))->not->toThrow(DocumentValidationException::class);
});

it('rejects unsafe image URLs and invalid leaf content', function (array $image, string $reason, string $path): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [$image],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe($reason)
            ->and($exception->documentPath())
            ->toBe($path);

        return;
    }

    throw new RuntimeException('Expected invalid image validation to fail.');
})->with([
    'unsafe URL scheme' => [
        [
            'type' => 'image',
            'attrs' => ['src' => 'javascript:alert(1)', 'alt' => null, 'title' => null],
        ],
        'unsafe_url_scheme',
        '$.content[0].attrs.src',
    ],
    'child content' => [
        [
            'type' => 'image',
            'attrs' => ['src' => null, 'alt' => null, 'title' => null],
            'content' => [['type' => 'paragraph']],
        ],
        'maximum_children_exceeded',
        '$.content[0].content',
    ],
    'block marks' => [
        [
            'type' => 'image',
            'attrs' => ['src' => null, 'alt' => null, 'title' => null],
            'marks' => [['type' => 'bold']],
        ],
        'unexpected_node_key',
        '$.content[0].marks',
    ],
    'undeclared attribute' => [
        [
            'type' => 'image',
            'attrs' => ['src' => null, 'alt' => null, 'title' => null, 'mediaId' => 21],
        ],
        'undeclared_attribute',
        '$.content[0].attrs.mediaId',
    ],
    'oversized alternative text' => [
        [
            'type' => 'image',
            'attrs' => ['src' => null, 'alt' => str_repeat('a', 501), 'title' => null],
        ],
        'attribute_too_long',
        '$.content[0].attrs.alt',
    ],
]);

it('exposes image metadata and nullable constraints through the editor manifest', function (): void {
    $manifest = LaravelBlocksFacade::editorManifest()->toArray();
    $image = collect($manifest['blocks'])->firstWhere('name', 'image');

    expect($image)
        ->toMatchArray([
            'name' => 'image',
            'label' => 'Image',
            'description' => 'Display an image from a URL.',
            'category' => 'media',
            'keywords' => ['image', 'photo', 'picture', 'media'],
            'icon' => 'image',
        ])
        ->and($image['fields'])
        ->toBe([
            [
                'name' => 'src',
                'path' => 'attrs.src',
                'type' => 'url',
                'group' => 'content',
                'label' => 'Image URL',
                'help' => 'HTTP or HTTPS URL.',
                'default' => null,
                'required' => false,
                'constraints' => [
                    'nullable' => true,
                    'maxLength' => 2048,
                    'allowedSchemes' => ['https', 'http'],
                ],
                'ui' => [],
            ],
            [
                'name' => 'alt',
                'path' => 'attrs.alt',
                'type' => 'text',
                'group' => 'content',
                'label' => 'Alternative text',
                'help' => null,
                'default' => null,
                'required' => false,
                'constraints' => ['nullable' => true, 'maxLength' => 500],
                'ui' => [],
            ],
            [
                'name' => 'title',
                'path' => 'attrs.title',
                'type' => 'text',
                'group' => 'content',
                'label' => 'Title',
                'help' => null,
                'default' => null,
                'required' => false,
                'constraints' => ['nullable' => true, 'maxLength' => 500],
                'ui' => [],
            ],
        ]);
});

/** @param array<string, mixed> $attrs */
function imageDocument(array $attrs): array
{
    return [
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'image',
            'attrs' => $attrs,
        ]],
    ];
}
