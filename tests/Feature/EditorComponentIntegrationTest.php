<?php

use Illuminate\Support\Facades\Blade;
use KatonFajar\LaravelBlocks\Documents\Document;

it('renders the editor component with assets, mount payload, and canonical hidden input', function (): void {
    $rendered = Blade::render(<<<'BLADE'
        <x-laravel-blocks::editor
            id="editor-a"
            name="content"
        />
        BLADE);
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
        BLADE, ['document' => $document]);
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
        BLADE, ['document' => $document]);
    $payload = extract_editor_payload($rendered);

    expect($rendered)
        ->toContain('data-laravel-blocks-editor')
        ->not->toContain('laravel-blocks.css?id=')
        ->not->toContain('laravel-blocks.js?id=')
        ->and($payload['document'])
        ->toBe(Document::from($document)->toArray());
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
