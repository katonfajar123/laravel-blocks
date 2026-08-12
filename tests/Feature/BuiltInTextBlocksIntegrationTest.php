<?php

use KatonFajar\LaravelBlocks\Blocks\Text\Heading;
use KatonFajar\LaravelBlocks\Blocks\Text\Paragraph;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;
use KatonFajar\LaravelBlocks\Validation\MarkRegistry;

it('registers paragraph and heading blocks from the default package configuration', function (): void {
    $blocks = LaravelBlocksFacade::blocks();

    expect(array_keys($blocks))
        ->toBe(['paragraph', 'heading'])
        ->and($blocks['paragraph'])
        ->toBeInstanceOf(Paragraph::class)
        ->and($blocks['heading'])
        ->toBeInstanceOf(Heading::class);

    expect(array_keys($this->app->make(MarkRegistry::class)->all()))
        ->toBe(['bold', 'italic', 'link']);
});

it('allows applications to choose a default block subset through configuration', function (): void {
    config()->set('laravel-blocks.blocks', [Heading::class]);

    $blocks = LaravelBlocksFacade::blocks();

    expect(array_keys($blocks))
        ->toBe(['heading'])
        ->and($blocks['heading'])
        ->toBeInstanceOf(Heading::class);
});

it('validates and renders package-owned paragraph and heading documents', function (): void {
    $content = LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [
            [
                'type' => 'paragraph',
                'attrs' => [
                    'design' => [],
                    'advanced' => [],
                ],
                'content' => [[
                    'type' => 'text',
                    'text' => 'Hello <Laravel>',
                    'marks' => [
                        ['type' => 'bold'],
                        ['type' => 'italic'],
                        [
                            'type' => 'link',
                            'attrs' => [
                                'href' => 'https://example.test/docs',
                                'target' => null,
                                'rel' => null,
                            ],
                        ],
                    ],
                ]],
            ],
            [
                'type' => 'heading',
                'attrs' => [
                    'level' => 3,
                    'design' => [],
                    'advanced' => [],
                ],
                'content' => [[
                    'type' => 'text',
                    'text' => 'Package heading',
                ]],
            ],
        ],
    ]);

    $html = preg_replace('/>\s+</', '><', trim($content->toHtml()));

    expect($html)
        ->toBe('<p>Hello &lt;Laravel&gt;</p><h3>Package heading</h3>');
});

it('fails invalid heading levels with typed validation context', function (): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [[
                'type' => 'heading',
                'attrs' => ['level' => 7],
            ]],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe('attribute_value_not_allowed')
            ->and($exception->documentPath())
            ->toBe('$.content[0].attrs.level');

        return;
    }

    throw new RuntimeException('Expected invalid heading level validation to fail.');
});

it('rejects unsafe default link mark URLs for package-owned text blocks', function (): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [[
                'type' => 'paragraph',
                'content' => [[
                    'type' => 'text',
                    'text' => 'Unsafe link',
                    'marks' => [[
                        'type' => 'link',
                        'attrs' => [
                            'href' => 'javascript:alert(1)',
                        ],
                    ]],
                ]],
            ]],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe('unsafe_url_scheme')
            ->and($exception->documentPath())
            ->toBe('$.content[0].content[0].marks[0].attrs.href');

        return;
    }

    throw new RuntimeException('Expected unsafe link mark validation to fail.');
});

it('exposes paragraph and heading metadata through the editor manifest', function (): void {
    $manifest = LaravelBlocksFacade::editorManifest()->toArray();

    expect($manifest['categories'])
        ->toBe([[
            'name' => 'text',
            'label' => 'Text',
        ]])
        ->and(array_column($manifest['blocks'], 'name'))
        ->toBe(['paragraph', 'heading'])
        ->and($manifest['blocks'][0])
        ->toMatchArray([
            'name' => 'paragraph',
            'label' => 'Paragraph',
            'description' => 'Write a text paragraph.',
            'category' => 'text',
            'keywords' => ['text', 'copy', 'body'],
            'icon' => 'paragraph',
            'fields' => [],
        ])
        ->and($manifest['blocks'][1])
        ->toMatchArray([
            'name' => 'heading',
            'label' => 'Heading',
            'description' => 'Introduce a section with a heading.',
            'category' => 'text',
            'keywords' => ['title', 'headline', 'section'],
            'icon' => 'heading',
        ])
        ->and($manifest['blocks'][1]['fields'])
        ->toMatchArray([[
            'name' => 'level',
            'path' => 'attrs.level',
            'type' => 'select',
            'group' => 'content',
            'label' => 'Level',
            'help' => 'Choose the heading level.',
            'default' => 2,
            'required' => true,
            'constraints' => [
                'allowedValues' => [1, 2, 3, 4, 5, 6],
            ],
            'ui' => [],
        ]]);
});
