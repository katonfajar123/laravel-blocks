<?php

use KatonFajar\LaravelBlocks\Blocks\Text\Code;
use KatonFajar\LaravelBlocks\Blocks\Text\Quote;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

it('registers quote and code blocks from the default package configuration', function (): void {
    $blocks = LaravelBlocksFacade::blocks();

    expect($blocks['blockquote'])
        ->toBeInstanceOf(Quote::class)
        ->and($blocks['codeBlock'])
        ->toBeInstanceOf(Code::class)
        ->and(array_keys($blocks))
        ->toBe(['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock']);
});

it('validates and safely renders package-owned quote and code documents', function (): void {
    $content = LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [
            [
                'type' => 'blockquote',
                'attrs' => [
                    'design' => [],
                    'advanced' => [],
                ],
                'content' => [
                    [
                        'type' => 'paragraph',
                        'content' => [[
                            'type' => 'text',
                            'text' => 'Quoted <text>',
                        ]],
                    ],
                    [
                        'type' => 'codeBlock',
                        'attrs' => ['language' => 'php'],
                        'content' => [[
                            'type' => 'text',
                            'text' => '<?php echo "inside"; ?>',
                        ]],
                    ],
                ],
            ],
            [
                'type' => 'codeBlock',
                'attrs' => [
                    'language' => 'php"><script>alert(1)</script>',
                    'design' => [],
                    'advanced' => [],
                ],
                'content' => [[
                    'type' => 'text',
                    'text' => '<script>alert("code")</script>',
                ]],
            ],
        ],
    ]);

    $html = preg_replace('/>\s+</', '><', trim($content->toHtml()));

    expect($html)
        ->toBe('<blockquote><p>Quoted &lt;text&gt;</p><pre><code class="language-php">&lt;?php echo &quot;inside&quot;; ?&gt;</code></pre></blockquote><pre><code class="language-php&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;">&lt;script&gt;alert(&quot;code&quot;)&lt;/script&gt;</code></pre>')
        ->not->toContain('<script>');
});

it('accepts the current block catalog inside quotes', function (): void {
    expect(fn () => LaravelBlocksFacade::validate([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'blockquote',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 3],
                ],
                [
                    'type' => 'bulletList',
                    'content' => [[
                        'type' => 'listItem',
                        'content' => [['type' => 'paragraph']],
                    ]],
                ],
                [
                    'type' => 'blockquote',
                    'content' => [['type' => 'paragraph']],
                ],
            ],
        ]],
    ]))->not->toThrow(DocumentValidationException::class);
});

it('rejects empty quotes and unsupported direct quote children', function (array $quote, string $reason, string $path): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [$quote],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe($reason)
            ->and($exception->documentPath())
            ->toBe($path);

        return;
    }

    throw new RuntimeException('Expected invalid quote validation to fail.');
})->with([
    'empty quote' => [
        ['type' => 'blockquote'],
        'minimum_children_not_met',
        '$.content[0].content',
    ],
    'direct text child' => [
        [
            'type' => 'blockquote',
            'content' => [[
                'type' => 'text',
                'text' => 'Direct text',
            ]],
        ],
        'child_not_allowed',
        '$.content[0].content[0].type',
    ],
    'direct structural list item' => [
        [
            'type' => 'blockquote',
            'content' => [[
                'type' => 'listItem',
                'content' => [['type' => 'paragraph']],
            ]],
        ],
        'child_not_allowed',
        '$.content[0].content[0].type',
    ],
]);

it('rejects block children and marks inside code', function (array $code, string $reason, string $path): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [$code],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe($reason)
            ->and($exception->documentPath())
            ->toBe($path);

        return;
    }

    throw new RuntimeException('Expected invalid code validation to fail.');
})->with([
    'block child' => [
        [
            'type' => 'codeBlock',
            'content' => [['type' => 'paragraph']],
        ],
        'child_not_allowed',
        '$.content[0].content[0].type',
    ],
    'bold mark' => [
        [
            'type' => 'codeBlock',
            'content' => [[
                'type' => 'text',
                'text' => 'marked',
                'marks' => [['type' => 'bold']],
            ]],
        ],
        'mark_not_allowed',
        '$.content[0].content[0].marks[0].type',
    ],
]);

it('bounds code language metadata', function (): void {
    try {
        LaravelBlocksFacade::validate([
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [[
                'type' => 'codeBlock',
                'attrs' => ['language' => str_repeat('x', 101)],
            ]],
        ]);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())
            ->toBe('attribute_too_long')
            ->and($exception->documentPath())
            ->toBe('$.content[0].attrs.language');

        return;
    }

    throw new RuntimeException('Expected oversized code language validation to fail.');
});

it('exposes quote and code metadata through the editor manifest', function (): void {
    $blocks = collect(LaravelBlocksFacade::editorManifest()->toArray()['blocks'])->keyBy('name');

    expect($blocks['blockquote'])
        ->toMatchArray([
            'name' => 'blockquote',
            'label' => 'Quote',
            'description' => 'Highlight a quotation.',
            'category' => 'text',
            'keywords' => ['quote', 'quotation', 'blockquote'],
            'icon' => 'quote',
            'fields' => [],
        ])
        ->and($blocks['blockquote']['supports']['inserter'])
        ->toBeTrue()
        ->and($blocks['codeBlock'])
        ->toMatchArray([
            'name' => 'codeBlock',
            'label' => 'Code',
            'description' => 'Display preformatted code.',
            'category' => 'text',
            'keywords' => ['code', 'preformatted', 'snippet'],
            'icon' => 'code',
            'fields' => [],
        ])
        ->and($blocks['codeBlock']['supports']['inserter'])
        ->toBeTrue();
});
