<?php

use KatonFajar\LaravelBlocks\Blocks\Media\File;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

it('registers file from the default package configuration', function (): void {
    $blocks = LaravelBlocksFacade::blocks();

    expect($blocks['file'])
        ->toBeInstanceOf(File::class)
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

it('validates and safely renders downloadable PDF metadata', function (): void {
    $content = LaravelBlocksFacade::render(fileDocument([
        'src' => 'https://media.example.test/report.pdf?token=a&download=1',
        'title' => 'Annual <Report>',
        'filename' => 'report "final".pdf',
        'mimeType' => 'application/pdf',
        'bytes' => 2048,
    ]));

    expect(trim($content->toHtml()))
        ->toContain(
            '<div class="laravel-blocks-file">',
            'href="https://media.example.test/report.pdf?token=a&amp;download=1"',
            'download="report &quot;final&quot;.pdf"',
            'Annual &lt;Report&gt;',
            'application/pdf',
            '2048 bytes',
        )
        ->not->toContain('<Report>');
});

it('uses deterministic fallback copy for file links', function (): void {
    $content = LaravelBlocksFacade::render(fileDocument([
        'src' => 'https://media.example.test/untitled.pdf',
        'title' => null,
        'filename' => null,
        'mimeType' => null,
        'bytes' => null,
    ]));

    expect(trim($content->toHtml()))
        ->toContain('Download file')
        ->toContain('<a href="https://media.example.test/untitled.pdf" download>');
});

it('accepts an empty file placeholder without frontend download output', function (): void {
    expect(LaravelBlocksFacade::render(fileDocument([
        'src' => null,
        'title' => null,
        'filename' => null,
        'mimeType' => null,
        'bytes' => null,
    ]))->toHtml())->toBe('');
});

it('accepts file inside quotes', function (): void {
    expect(fn () => LaravelBlocksFacade::validate([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'blockquote',
            'content' => [[
                'type' => 'file',
                'attrs' => [
                    'src' => 'https://media.example.test/quoted.pdf',
                    'title' => 'Quoted file',
                    'filename' => 'quoted.pdf',
                    'mimeType' => 'application/pdf',
                    'bytes' => 1024,
                ],
            ]],
        ]],
    ]))->not->toThrow(DocumentValidationException::class);
});

it('rejects unsafe file attributes and invalid leaf content', function (array $file, string $reason, string $path): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [$file],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe($reason)
            ->and($exception->documentPath())
            ->toBe($path);

        return;
    }

    throw new RuntimeException('Expected invalid file validation to fail.');
})->with([
    'unsafe source scheme' => [
        fileNode(['src' => 'javascript:alert(1)']),
        'unsafe_url_scheme',
        '$.content[0].attrs.src',
    ],
    'child content' => [
        [...fileNode(), 'content' => [['type' => 'paragraph']]],
        'maximum_children_exceeded',
        '$.content[0].content',
    ],
    'undeclared target attribute' => [
        fileNode(['target' => '_blank']),
        'undeclared_attribute',
        '$.content[0].attrs.target',
    ],
    'unsupported mime type' => [
        fileNode(['mimeType' => 'text/plain']),
        'attribute_value_not_allowed',
        '$.content[0].attrs.mimeType',
    ],
    'oversized link text' => [
        fileNode(['title' => str_repeat('f', 501)]),
        'attribute_too_long',
        '$.content[0].attrs.title',
    ],
    'oversized filename' => [
        fileNode(['filename' => str_repeat('f', 256)]),
        'attribute_too_long',
        '$.content[0].attrs.filename',
    ],
    'negative byte size' => [
        fileNode(['bytes' => -1]),
        'attribute_below_minimum',
        '$.content[0].attrs.bytes',
    ],
]);

it('exposes file metadata and nullable constraints through the editor manifest', function (): void {
    $manifest = LaravelBlocksFacade::editorManifest()->toArray();
    $file = collect($manifest['blocks'])->firstWhere('name', 'file');

    expect($file)
        ->toMatchArray([
            'name' => 'file',
            'label' => 'File',
            'description' => 'Link to a downloadable PDF file.',
            'category' => 'media',
            'keywords' => ['file', 'download', 'pdf', 'document'],
            'icon' => 'file',
        ])
        ->and($file['fields'])
        ->toBe([
            [
                'name' => 'src',
                'path' => 'attrs.src',
                'type' => 'url',
                'group' => 'content',
                'label' => 'File URL',
                'help' => 'HTTP or HTTPS URL for a downloadable PDF.',
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
                'name' => 'title',
                'path' => 'attrs.title',
                'type' => 'text',
                'group' => 'content',
                'label' => 'Link text',
                'help' => 'Text shown for the download link.',
                'default' => null,
                'required' => false,
                'constraints' => ['nullable' => true, 'maxLength' => 500],
                'ui' => [],
            ],
            [
                'name' => 'filename',
                'path' => 'attrs.filename',
                'type' => 'text',
                'group' => 'content',
                'label' => 'Filename',
                'help' => 'Suggested download filename from the media provider.',
                'default' => null,
                'required' => false,
                'constraints' => ['nullable' => true, 'maxLength' => 255],
                'ui' => [],
            ],
            [
                'name' => 'mimeType',
                'path' => 'attrs.mimeType',
                'type' => 'select',
                'group' => 'content',
                'label' => 'File type',
                'help' => 'The first built-in File contract accepts PDFs only.',
                'default' => null,
                'required' => false,
                'constraints' => [
                    'nullable' => true,
                    'allowedValues' => ['application/pdf'],
                ],
                'ui' => [],
            ],
            [
                'name' => 'bytes',
                'path' => 'attrs.bytes',
                'type' => 'number',
                'group' => 'content',
                'label' => 'File size',
                'help' => 'Byte size reported by the media provider.',
                'default' => null,
                'required' => false,
                'constraints' => ['nullable' => true, 'min' => 0],
                'ui' => [],
            ],
        ]);
});

/** @param array<string, mixed> $attrs */
function fileDocument(array $attrs): array
{
    return [
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'file',
            'attrs' => $attrs,
        ]],
    ];
}

/** @param array<string, mixed> $attrs */
function fileNode(array $attrs = []): array
{
    return [
        'type' => 'file',
        'attrs' => [
            'src' => null,
            'title' => null,
            'filename' => null,
            'mimeType' => null,
            'bytes' => null,
            ...$attrs,
        ],
    ];
}
