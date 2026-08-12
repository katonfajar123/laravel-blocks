<?php

use Illuminate\Support\Facades\Blade;
use KatonFajar\LaravelBlocks\Blocks\Exceptions\UnknownBlockException;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\Rendering\DocumentRenderer;
use KatonFajar\LaravelBlocks\Rendering\Exceptions\BlockRenderException;
use KatonFajar\LaravelBlocks\Rendering\RenderContext;
use KatonFajar\LaravelBlocks\Rendering\RenderedContent;
use KatonFajar\LaravelBlocks\Rendering\UnknownBlockPolicy;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;
use Tests\Fixtures\Blocks\ContainerBlock;
use Tests\Fixtures\Blocks\ExplodingBlock;
use Tests\Fixtures\Blocks\ImageBlock;
use Tests\Fixtures\Blocks\MissingViewBlock;
use Tests\Fixtures\Blocks\ParagraphBlock;

beforeEach(function (): void {
    config()->set('laravel-blocks.blocks', []);

    $this->app->make('view')->addNamespace('fixtures', __DIR__.'/../Fixtures/views');
});

it('renders an empty document as immutable htmlable content', function (): void {
    $content = $this->app->make(DocumentRenderer::class)->render(null);

    expect($content)
        ->toBeInstanceOf(RenderedContent::class)
        ->and($content->toHtml())
        ->toBe('');
});

it('renders validated known nodes through registered Blade views', function (): void {
    LaravelBlocksFacade::register([
        ParagraphBlock::class,
        ContainerBlock::class,
    ]);

    $content = LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'container',
            'content' => [[
                'type' => 'paragraph',
                'attrs' => ['align' => 'center'],
                'content' => [[
                    'type' => 'text',
                    'text' => 'Hello <strong>Laravel</strong>',
                ]],
            ]],
        ]],
    ]);

    $html = preg_replace('/>\s+</', '><', trim($content->toHtml()));

    expect($html)
        ->toBe('<section class="fixture-container"><p data-align="center">Hello &lt;strong&gt;Laravel&lt;/strong&gt;</p></section>');
});

it('escapes block attributes in Blade views', function (): void {
    LaravelBlocksFacade::register(ImageBlock::class);

    $content = LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'image',
            'attrs' => [
                'src' => 'https://example.com/image.png',
                'alt' => '" onerror="alert(1)',
            ],
        ]],
    ]);

    expect($content->toHtml())
        ->toContain('src="https://example.com/image.png"')
        ->toContain('alt="&quot; onerror=&quot;alert(1)"');
});

it('fails known-node validation before executing a block view', function (): void {
    LaravelBlocksFacade::register(ExplodingBlock::class);

    LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'exploding',
            'attrs' => [],
        ]],
    ]);
})->throws(DocumentValidationException::class, 'A required attribute is missing.');

it('wraps block view failures in a typed render exception', function (): void {
    LaravelBlocksFacade::register(ExplodingBlock::class);

    LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'exploding',
            'attrs' => ['title' => 'Valid'],
        ]],
    ]);
})->throws(BlockRenderException::class, 'Block "exploding" failed to render at "$.content[0]".');

it('wraps missing views in a typed render exception', function (): void {
    LaravelBlocksFacade::register(MissingViewBlock::class);

    LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'missingView',
        ]],
    ]);
})->throws(BlockRenderException::class, 'Block "missingView" failed to render at "$.content[0]".');

it('throws for unknown blocks by default with document path context', function (): void {
    LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'missingBlock',
        ]],
    ]);
})->throws(UnknownBlockException::class, 'Block "missingBlock" is not registered at "$.content[0]".');

it('renders escaped placeholders for unknown blocks without leaking attrs or child content', function (): void {
    $content = LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'missingBlock',
            'attrs' => [
                'secret' => '<script>alert(1)</script>',
            ],
            'content' => [[
                'type' => 'text',
                'text' => 'do not leak',
            ]],
        ]],
    ], RenderContext::withUnknownBlocks(UnknownBlockPolicy::PLACEHOLDER));

    expect($content->toHtml())
        ->toContain('data-laravel-blocks-unknown-block="missingBlock"')
        ->toContain('data-laravel-blocks-node-path="$.content[0]"')
        ->not->toContain('secret')
        ->not->toContain('<script>')
        ->not->toContain('do not leak');
});

it('skips the complete unknown block subtree without promoting its children', function (): void {
    $content = LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'missingBlock',
            'content' => [[
                'type' => 'text',
                'text' => 'must not promote',
            ]],
        ]],
    ], RenderContext::withUnknownBlocks('skip'));

    expect($content->toHtml())->toBe('');
});

it('keeps malformed unknown nodes unsafe even when placeholder mode is selected', function (): void {
    LaravelBlocksFacade::render([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'missingBlock',
            'attrs' => ['valid'],
        ]],
    ], RenderContext::withUnknownBlocks(UnknownBlockPolicy::PLACEHOLDER));
})->throws(DocumentValidationException::class, 'Attributes must be an object.');

it('uses the same renderer path from the Blade content component', function (): void {
    LaravelBlocksFacade::register(ParagraphBlock::class);

    $document = [
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'paragraph',
            'content' => [[
                'type' => 'text',
                'text' => 'Shared renderer',
            ]],
        ]],
    ];

    $facade = LaravelBlocksFacade::render($document)->toHtml();
    $component = Blade::render('<x-laravel-blocks::content :content="$document" />', [
        'document' => $document,
    ], deleteCachedView: true);

    expect(trim($component))->toBe(trim($facade));
});
