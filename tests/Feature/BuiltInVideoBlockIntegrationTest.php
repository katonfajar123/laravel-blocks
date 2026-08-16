<?php

use KatonFajar\LaravelBlocks\Blocks\Media\Video;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

it('registers video from the default package configuration', function (): void {
    $blocks = LaravelBlocksFacade::blocks();

    expect($blocks['video'])
        ->toBeInstanceOf(Video::class)
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
            'video',
        ]);
});

it('validates and safely renders user-controlled video metadata', function (): void {
    $content = LaravelBlocksFacade::render(videoDocument([
        'src' => 'https://media.example.test/movie.mp4?token=a&quality=high',
        'poster' => 'https://media.example.test/poster.jpg?crop=wide&size=large',
        'title' => 'A <safe> "video"',
    ]));

    expect(trim($content->toHtml()))
        ->toContain(
            '<video',
            'src="https://media.example.test/movie.mp4?token=a&amp;quality=high"',
            'controls',
            'playsinline',
            'preload="metadata"',
            'aria-label="A &lt;safe&gt; &quot;video&quot;"',
            'poster="https://media.example.test/poster.jpg?crop=wide&amp;size=large"',
            'title="A &lt;safe&gt; &quot;video&quot;"',
            'Video playback is not supported by this browser.</video>',
        )
        ->not->toContain('<safe>', 'autoplay');
});

it('accepts an empty video placeholder without frontend player output', function (): void {
    expect(LaravelBlocksFacade::render(videoDocument([
        'src' => null,
        'poster' => null,
        'title' => null,
    ]))->toHtml())->toBe('');
});

it('accepts video inside quotes', function (): void {
    expect(fn () => LaravelBlocksFacade::validate([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'blockquote',
            'content' => [[
                'type' => 'video',
                'attrs' => [
                    'src' => 'https://media.example.test/quoted.webm',
                    'poster' => null,
                    'title' => 'Quoted video',
                ],
            ]],
        ]],
    ]))->not->toThrow(DocumentValidationException::class);
});

it('rejects unsafe video attributes and invalid leaf content', function (array $video, string $reason, string $path): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [$video],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe($reason)
            ->and($exception->documentPath())
            ->toBe($path);

        return;
    }

    throw new RuntimeException('Expected invalid video validation to fail.');
})->with([
    'unsafe source scheme' => [
        videoNode(['src' => 'javascript:alert(1)']),
        'unsafe_url_scheme',
        '$.content[0].attrs.src',
    ],
    'unsafe poster scheme' => [
        videoNode(['poster' => 'data:image/png;base64,unsafe']),
        'unsafe_url_scheme',
        '$.content[0].attrs.poster',
    ],
    'child content' => [
        [...videoNode(), 'content' => [['type' => 'paragraph']]],
        'maximum_children_exceeded',
        '$.content[0].content',
    ],
    'undeclared autoplay attribute' => [
        videoNode(['autoplay' => true]),
        'undeclared_attribute',
        '$.content[0].attrs.autoplay',
    ],
    'oversized accessible title' => [
        videoNode(['title' => str_repeat('v', 501)]),
        'attribute_too_long',
        '$.content[0].attrs.title',
    ],
]);

it('exposes video metadata and nullable constraints through the editor manifest', function (): void {
    $manifest = LaravelBlocksFacade::editorManifest()->toArray();
    $video = collect($manifest['blocks'])->firstWhere('name', 'video');

    expect($video)
        ->toMatchArray([
            'name' => 'video',
            'label' => 'Video',
            'description' => 'Display an uploaded or remote video.',
            'category' => 'media',
            'keywords' => ['video', 'movie', 'media', 'mp4', 'webm'],
            'icon' => 'video',
        ])
        ->and($video['fields'])
        ->toBe([
            [
                'name' => 'src',
                'path' => 'attrs.src',
                'type' => 'url',
                'group' => 'content',
                'label' => 'Video URL',
                'help' => 'HTTP or HTTPS URL for an MP4 or WebM video.',
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
                'name' => 'poster',
                'path' => 'attrs.poster',
                'type' => 'url',
                'group' => 'content',
                'label' => 'Poster URL',
                'help' => 'Optional HTTP or HTTPS preview image.',
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
                'label' => 'Accessible title',
                'help' => 'Briefly identify the video for assistive technology.',
                'default' => null,
                'required' => false,
                'constraints' => ['nullable' => true, 'maxLength' => 500],
                'ui' => [],
            ],
        ]);
});

/** @param array<string, mixed> $attrs */
function videoDocument(array $attrs): array
{
    return [
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'video',
            'attrs' => $attrs,
        ]],
    ];
}

/** @param array<string, mixed> $attrs */
function videoNode(array $attrs = []): array
{
    return [
        'type' => 'video',
        'attrs' => [
            'src' => null,
            'poster' => null,
            'title' => null,
            ...$attrs,
        ],
    ];
}
