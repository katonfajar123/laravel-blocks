<?php

use KatonFajar\LaravelBlocks\Blocks\Text\BulletList;
use KatonFajar\LaravelBlocks\Blocks\Text\ListItem;
use KatonFajar\LaravelBlocks\Blocks\Text\OrderedList;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

it('registers list blocks from the default package configuration', function (): void {
    $blocks = LaravelBlocksFacade::blocks();

    expect($blocks['bulletList'])
        ->toBeInstanceOf(BulletList::class)
        ->and($blocks['orderedList'])
        ->toBeInstanceOf(OrderedList::class)
        ->and($blocks['listItem'])
        ->toBeInstanceOf(ListItem::class)
        ->and(array_keys($blocks))
        ->toBe(['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem']);
});

it('validates and renders package-owned bullet and ordered list documents', function (): void {
    $content = LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [
            [
                'type' => 'bulletList',
                'attrs' => [
                    'design' => [],
                    'advanced' => [],
                ],
                'content' => [
                    [
                        'type' => 'listItem',
                        'content' => [[
                            'type' => 'paragraph',
                            'content' => [[
                                'type' => 'text',
                                'text' => 'First <item>',
                            ]],
                        ]],
                    ],
                    [
                        'type' => 'listItem',
                        'content' => [[
                            'type' => 'paragraph',
                            'content' => [[
                                'type' => 'text',
                                'text' => 'Second item',
                            ]],
                        ]],
                    ],
                ],
            ],
            [
                'type' => 'orderedList',
                'attrs' => [
                    'start' => 3,
                    'type' => 'A',
                    'design' => [],
                    'advanced' => [],
                ],
                'content' => [[
                    'type' => 'listItem',
                    'content' => [[
                        'type' => 'paragraph',
                        'content' => [[
                            'type' => 'text',
                            'text' => 'Third item',
                        ]],
                    ]],
                ]],
            ],
        ],
    ]);

    $html = preg_replace('/>\s+</', '><', trim($content->toHtml()));

    expect($html)
        ->toBe('<ul><li><p>First &lt;item&gt;</p></li><li><p>Second item</p></li></ul><ol start="3" type="A"><li><p>Third item</p></li></ol>');
});

it('rejects list items outside list parents', function (): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [[
                'type' => 'listItem',
                'content' => [[
                    'type' => 'paragraph',
                ]],
            ]],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe('parent_not_allowed')
            ->and($exception->documentPath())
            ->toBe('$.content[0].type');

        return;
    }

    throw new RuntimeException('Expected direct listItem validation to fail.');
});

it('rejects non-list item children inside lists', function (): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [[
                'type' => 'bulletList',
                'content' => [[
                    'type' => 'paragraph',
                ]],
            ]],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe('child_not_allowed')
            ->and($exception->documentPath())
            ->toBe('$.content[0].content[0].type');

        return;
    }

    throw new RuntimeException('Expected invalid list child validation to fail.');
});

it('requires lists and list items to contain their structural children', function (): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [[
                'type' => 'orderedList',
                'content' => [],
            ]],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe('minimum_children_not_met')
            ->and($exception->documentPath())
            ->toBe('$.content[0].content');

        return;
    }

    throw new RuntimeException('Expected empty orderedList validation to fail.');
});

it('exposes list metadata through the manifest while hiding structural list items from inserter support', function (): void {
    $manifest = LaravelBlocksFacade::editorManifest()->toArray();
    $blocks = collect($manifest['blocks'])->keyBy('name');

    expect($blocks->keys()->all())
        ->toBe(['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem'])
        ->and($blocks['bulletList'])
        ->toMatchArray([
            'name' => 'bulletList',
            'label' => 'Bullet List',
            'description' => 'Create a bulleted list.',
            'category' => 'text',
            'keywords' => ['list', 'bullet', 'unordered'],
            'icon' => 'list',
            'fields' => [],
        ])
        ->and($blocks['bulletList']['supports']['inserter'])
        ->toBeTrue()
        ->and($blocks['orderedList'])
        ->toMatchArray([
            'name' => 'orderedList',
            'label' => 'Ordered List',
            'description' => 'Create a numbered list.',
            'category' => 'text',
            'keywords' => ['list', 'numbered', 'ordered'],
            'icon' => 'list',
            'fields' => [],
        ])
        ->and($blocks['orderedList']['supports']['inserter'])
        ->toBeTrue()
        ->and($blocks['listItem'])
        ->toMatchArray([
            'name' => 'listItem',
            'label' => 'List Item',
            'category' => 'text',
            'icon' => 'list',
            'fields' => [],
        ])
        ->and($blocks['listItem']['supports']['inserter'])
        ->toBeFalse()
        ->and($blocks['listItem']['supports']['reusable'])
        ->toBeFalse();
});
