<?php

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;

beforeEach(function (): void {
    if (! in_array('sqlite', PDO::getAvailableDrivers(), true)) {
        $this->markTestSkipped('The host persistence fixture requires the pdo_sqlite extension.');
    }

    Schema::dropIfExists('host_block_documents');
    Schema::create('host_block_documents', function (Blueprint $table): void {
        $table->id();
        $table->text('text_document')->nullable();
        $table->longText('long_text_document')->nullable();
        $table->json('json_document')->nullable();
        $table->jsonb('jsonb_document')->nullable();
    });
});

afterEach(function (): void {
    if (! in_array('sqlite', PDO::getAvailableDrivers(), true)) {
        return;
    }

    Schema::dropIfExists('host_block_documents');
});

it('round trips canonical documents through host-owned text and structured columns', function (): void {
    $document = Document::from([
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => [[
            'type' => 'paragraph',
            'attrs' => [
                'design' => [],
                'advanced' => [],
            ],
            'content' => [[
                'type' => 'text',
                'text' => 'Host-owned persistence',
                'marks' => [['type' => 'bold']],
            ]],
        ]],
    ]);

    $record = HostBlockDocument::query()->create([
        'text_document' => $document->toJson(),
        'long_text_document' => $document->toJson(),
        'json_document' => $document->toArray(),
        'jsonb_document' => $document->toArray(),
    ])->fresh();

    expect($record)->not->toBeNull();

    foreach (['text_document', 'long_text_document'] as $column) {
        $stored = $record->getAttribute($column);

        expect($stored)
            ->toBeString()
            ->and($stored)
            ->toBe($document->toJson())
            ->and(Document::from($stored)->toArray())
            ->toBe($document->toArray())
            ->and(LaravelBlocksFacade::validate($stored)->toArray())
            ->toBe($document->toArray());
    }

    foreach (['json_document', 'jsonb_document'] as $column) {
        $stored = $record->getAttribute($column);
        $raw = $record->getRawOriginal($column);

        expect($stored)
            ->toBeArray()
            ->and($stored)
            ->toBe($document->toArray())
            ->and(json_decode($raw, true, 512, JSON_THROW_ON_ERROR))
            ->toBe($document->toArray())
            ->and(Document::from($stored)->toArray())
            ->toBe($document->toArray())
            ->and(LaravelBlocksFacade::validate($stored)->toArray())
            ->toBe($document->toArray());
    }

    expect(LaravelBlocksFacade::render($record->jsonb_document)->toHtml())
        ->toContain('<p><strong>Host-owned persistence</strong></p>');
});

final class HostBlockDocument extends Model
{
    protected $table = 'host_block_documents';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'json_document' => 'array',
        'jsonb_document' => 'array',
    ];
}
