<?php

use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\Blade;
use KatonFajar\LaravelBlocks\Documents\Document;

it('renders the editor component with assets, mount payload, and canonical hidden input', function (): void {
    $rendered = Blade::render(<<<'BLADE'
        <x-laravel-blocks::editor
            id="editor-a"
            name="content"
        />
        BLADE, deleteCachedView: true);
    $payload = extract_editor_payload($rendered);

    expect($rendered)
        ->toContain('id="editor-a"')
        ->toContain('name="content"')
        ->toContain('data-laravel-blocks-editor')
        ->toContain('data-laravel-blocks-mount')
        ->toContain('data-laravel-blocks-input')
        ->toContain('laravel-blocks.css?id=')
        ->toContain('laravel-blocks.js?id=')
        ->toContain(e(Document::from(null)->toJson()))
        ->and($payload['id'])
        ->toBe('editor-a')
        ->and($payload['name'])
        ->toBe('content')
        ->and($payload['document'])
        ->toBe(Document::from(null)->toArray())
        ->and($payload['manifest']['manifestVersion'])
        ->toBe(1)
        ->and($payload['manifest']['documentSchemaVersion'])
        ->toBe(1)
        ->and(array_column($payload['manifest']['blocks'], 'name'))
        ->toBe(['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock'])
        ->and($payload['placeholder'])
        ->toBe('Start writing or type / to choose a block');
});

it('accepts array values and escapes payload data without corrupting the document', function (): void {
    $document = [
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'paragraph',
            'content' => [[
                'type' => 'text',
                'text' => '</script><img src=x onerror=alert(1)>',
            ]],
        ]],
    ];

    $rendered = Blade::render(<<<'BLADE'
        <x-laravel-blocks::editor
            id="editor-b"
            name="body"
            :value="$document"
            placeholder="Write safely"
        />
        BLADE, ['document' => $document], deleteCachedView: true);
    $payload = extract_editor_payload($rendered);

    expect($rendered)
        ->not->toContain('<img src=x')
        ->toContain('&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;')
        ->and($payload['document'])
        ->toBe($document)
        ->and($payload['placeholder'])
        ->toBe('Write safely');
});

it('accepts JSON string values and can omit automatic asset injection', function (): void {
    config()->set('laravel-blocks.assets.auto_inject', false);

    $document = Document::from([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [],
    ])->toJson();

    $rendered = Blade::render(<<<'BLADE'
        <x-laravel-blocks::editor
            id="editor-c"
            name="summary"
            :value="$document"
        />
        BLADE, ['document' => $document], deleteCachedView: true);
    $payload = extract_editor_payload($rendered);

    expect($rendered)
        ->toContain('data-laravel-blocks-editor')
        ->not->toContain('laravel-blocks.css?id=')
        ->not->toContain('laravel-blocks.js?id=')
        ->and($payload['document'])
        ->toBe(Document::from($document)->toArray());
});

it('keeps editor, assets, and content components package-owned despite application view overrides', function (): void {
    $filesystem = new Filesystem;
    $overridePath = resource_path('views/vendor/laravel-blocks/components');

    $filesystem->ensureDirectoryExists($overridePath);
    $filesystem->put($overridePath.'/editor.blade.php', 'OVERRIDDEN EDITOR SHELL');
    $filesystem->put($overridePath.'/assets.blade.php', 'OVERRIDDEN ASSETS');
    $filesystem->put($overridePath.'/content.blade.php', 'OVERRIDDEN CONTENT COMPONENT');

    try {
        $assets = Blade::render('<x-laravel-blocks::assets />', deleteCachedView: true);

        config()->set('laravel-blocks.assets.auto_inject', false);

        $editor = Blade::render(<<<'BLADE'
            <x-laravel-blocks::editor id="locked-editor" />
            BLADE, deleteCachedView: true);

        $document = [
            'type' => 'doc',
            'attrs' => ['schemaVersion' => 1],
            'content' => [[
                'type' => 'paragraph',
                'content' => [[
                    'type' => 'text',
                    'text' => 'Package owned content component',
                ]],
            ]],
        ];
        $content = Blade::render('<x-laravel-blocks::content :content="$document" />', [
            'document' => $document,
        ], deleteCachedView: true);

        expect($assets)
            ->toContain('laravel-blocks.css?id=')
            ->toContain('laravel-blocks.js?id=')
            ->not->toContain('OVERRIDDEN ASSETS')
            ->and($editor)
            ->toContain('id="locked-editor"')
            ->toContain('data-laravel-blocks-editor')
            ->not->toContain('OVERRIDDEN EDITOR SHELL')
            ->and($content)
            ->toContain('Package owned content component')
            ->not->toContain('OVERRIDDEN CONTENT COMPONENT');
    } finally {
        $filesystem->deleteDirectory($overridePath);
    }
});

/**
 * @return array<string, mixed>
 */
function extract_editor_payload(string $html): array
{
    preg_match('/<script type="application\/json" data-laravel-blocks-payload>(.*?)<\/script>/s', $html, $matches);

    if (! isset($matches[1])) {
        throw new RuntimeException('Editor payload script was not rendered.');
    }

    $payload = json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);

    if (! is_array($payload)) {
        throw new RuntimeException('Editor payload was not a JSON object.');
    }

    return $payload;
}
