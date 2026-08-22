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
            'file',
        ]);
});

it('validates and safely renders user-controlled video metadata', function (): void {
    $content = LaravelBlocksFacade::render(videoDocument([
        'src' => 'https://media.example.test/movie.mp4?token=a&quality=high',
        'poster' => 'https://media.example.test/poster.jpg?crop=wide&size=large',
        'title' => 'A <safe> "video"',
        'captionSrc' => 'https://media.example.test/captions.vtt?token=a&locale=id',
        'captionLanguage' => 'id-ID',
        'captionLabel' => 'Bahasa <Indonesia>',
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
            '<track kind="captions"',
            'src="https://media.example.test/captions.vtt?token=a&amp;locale=id"',
            'srclang="id-ID"',
            'label="Bahasa &lt;Indonesia&gt;"',
            'default',
            'Video playback is not supported by this browser.</video>',
        )
        ->not->toContain('<safe>', 'autoplay');
});

it('renders deterministic caption fallbacks while preserving legacy video documents', function (): void {
    $legacy = videoDocument([
        'src' => 'https://media.example.test/legacy.mp4',
        'poster' => null,
        'title' => null,
    ]);
    $captioned = videoDocument([
        'src' => 'https://media.example.test/captioned.mp4',
        'poster' => null,
        'title' => null,
        'captionSrc' => 'https://media.example.test/captions.vtt',
        'captionLanguage' => null,
        'captionLabel' => null,
    ]);

    expect(LaravelBlocksFacade::render($legacy)->toHtml())
        ->not->toContain('<track')
        ->and(LaravelBlocksFacade::render($captioned)->toHtml())
        ->toContain(
            '<track kind="captions"',
            'srclang="und"',
            'label="Captions"',
        );
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
    'unsafe caption source scheme' => [
        videoNode(['captionSrc' => 'javascript:alert(1)']),
        'unsafe_url_scheme',
        '$.content[0].attrs.captionSrc',
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
    'oversized caption language' => [
        videoNode(['captionLanguage' => str_repeat('l', 36)]),
        'attribute_too_long',
        '$.content[0].attrs.captionLanguage',
    ],
    'oversized caption label' => [
        videoNode(['captionLabel' => str_repeat('c', 201)]),
        'attribute_too_long',
        '$.content[0].attrs.captionLabel',
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
            [
                'name' => 'captionSrc',
                'path' => 'attrs.captionSrc',
                'type' => 'url',
                'group' => 'content',
                'label' => 'Caption track URL',
                'help' => 'Optional HTTP or HTTPS URL for a WebVTT captions file.',
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
                'name' => 'captionLanguage',
                'path' => 'attrs.captionLanguage',
                'type' => 'text',
                'group' => 'content',
                'label' => 'Caption language',
                'help' => 'BCP 47 language tag such as en, en-US, or id.',
                'default' => null,
                'required' => false,
                'constraints' => ['nullable' => true, 'maxLength' => 35],
                'ui' => [],
            ],
            [
                'name' => 'captionLabel',
                'path' => 'attrs.captionLabel',
                'type' => 'text',
                'group' => 'content',
                'label' => 'Caption label',
                'help' => 'Human-readable track name such as English or Bahasa Indonesia.',
                'default' => null,
                'required' => false,
                'constraints' => ['nullable' => true, 'maxLength' => 200],
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
            'captionSrc' => null,
            'captionLanguage' => null,
            'captionLabel' => null,
            ...$attrs,
        ],
    ];
}
