<?php

use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Documents\Exceptions\DocumentException;
use KatonFajar\LaravelBlocks\Documents\Exceptions\InvalidDocumentException;
use KatonFajar\LaravelBlocks\Documents\Exceptions\UnsupportedSchemaVersionException;
use KatonFajar\LaravelBlocks\Documents\SchemaVersion;

it('normalizes null to the canonical empty v1 document', function (): void {
    $document = Document::from(null);

    expect($document->toArray())->toBe([
        'type' => 'doc',
        'attrs' => [
            'schemaVersion' => 1,
        ],
        'content' => [],
    ])->and($document->toJson())
        ->toBe('{"type":"doc","attrs":{"schemaVersion":1},"content":[]}')
        ->and($document->schemaVersion())
        ->toBe(SchemaVersion::V1)
        ->and(SchemaVersion::current())
        ->toBe(SchemaVersion::V1);
});

it('normalizes array and JSON inputs to the same document', function (): void {
    $array = [
        'type' => 'doc',
        'attrs' => [
            'schemaVersion' => 1,
        ],
        'content' => [
            [
                'type' => 'futureBlock',
                'attrs' => [
                    'label' => 'Laravel Blocks',
                    'url' => 'https://example.com/editor',
                ],
            ],
        ],
    ];

    $fromArray = Document::from($array);
    $fromJson = Document::from(json_encode($array, JSON_THROW_ON_ERROR));

    expect($fromArray->toArray())
        ->toBe($array)
        ->and($fromJson->toArray())
        ->toBe($array)
        ->and(Document::from($fromArray->toJson())->toArray())
        ->toBe($array);
});

it('normalizes a missing root content member to an empty list', function (): void {
    $document = Document::from([
        'type' => 'doc',
        'attrs' => [
            'schemaVersion' => 1,
        ],
    ]);

    expect($document->toArray()['content'])->toBe([]);
});

it('does not expose mutable source or result state', function (): void {
    $source = [
        'type' => 'doc',
        'attrs' => [
            'schemaVersion' => 1,
        ],
        'content' => [
            [
                'type' => 'paragraph',
                'attrs' => [
                    'value' => 'original',
                ],
            ],
        ],
    ];

    $document = Document::from($source);
    $source['content'][0]['attrs']['value'] = 'changed at source';
    $copy = $document->toArray();
    $copy['content'][0]['attrs']['value'] = 'changed in result';

    expect($document->toArray()['content'][0]['attrs']['value'])->toBe('original');
});

it('rejects invalid document boundaries with machine-readable context', function (
    array|string|null $input,
    string $exceptionClass,
    string $reason,
    string $path,
): void {
    try {
        Document::from($input);
    } catch (DocumentException $exception) {
        expect($exception)
            ->toBeInstanceOf($exceptionClass)
            ->and($exception->reason())
            ->toBe($reason)
            ->and($exception->documentPath())
            ->toBe($path);

        return;
    }

    throw new RuntimeException('Expected document normalization to fail.');
})->with([
    'blank JSON' => ['', InvalidDocumentException::class, 'blank_json', '$'],
    'malformed JSON' => ['{"type":', InvalidDocumentException::class, 'malformed_json', '$'],
    'JSON array root' => ['[]', InvalidDocumentException::class, 'root_not_object', '$'],
    'JSON scalar root' => ['"document"', InvalidDocumentException::class, 'root_not_object', '$'],
    'PHP list root' => [[1], InvalidDocumentException::class, 'root_not_object', '$'],
    'missing root type' => [
        ['attrs' => ['schemaVersion' => 1]],
        InvalidDocumentException::class,
        'invalid_root_type',
        '$.type',
    ],
    'invalid root type' => [
        ['type' => 'paragraph', 'attrs' => ['schemaVersion' => 1]],
        InvalidDocumentException::class,
        'invalid_root_type',
        '$.type',
    ],
    'missing root attrs' => [
        ['type' => 'doc'],
        InvalidDocumentException::class,
        'missing_schema_version',
        '$.attrs.schemaVersion',
    ],
    'non-object root attrs' => [
        ['type' => 'doc', 'attrs' => 'invalid'],
        InvalidDocumentException::class,
        'invalid_root_attributes',
        '$.attrs',
    ],
    'missing schema version' => [
        ['type' => 'doc', 'attrs' => []],
        InvalidDocumentException::class,
        'missing_schema_version',
        '$.attrs.schemaVersion',
    ],
    'non-integer schema version' => [
        ['type' => 'doc', 'attrs' => ['schemaVersion' => '1']],
        InvalidDocumentException::class,
        'invalid_schema_version',
        '$.attrs.schemaVersion',
    ],
    'unsupported schema version' => [
        ['type' => 'doc', 'attrs' => ['schemaVersion' => 2]],
        UnsupportedSchemaVersionException::class,
        'unsupported_schema_version',
        '$.attrs.schemaVersion',
    ],
    'associative content' => [
        ['type' => 'doc', 'attrs' => ['schemaVersion' => 1], 'content' => ['node' => []]],
        InvalidDocumentException::class,
        'invalid_content',
        '$.content',
    ],
    'JSON object content' => [
        '{"type":"doc","attrs":{"schemaVersion":1},"content":{}}',
        InvalidDocumentException::class,
        'invalid_content',
        '$.content',
    ],
    'unexpected root key' => [
        ['type' => 'doc', 'attrs' => ['schemaVersion' => 1], 'envelope' => []],
        InvalidDocumentException::class,
        'unexpected_root_key',
        '$',
    ],
    'unexpected root attribute' => [
        ['type' => 'doc', 'attrs' => ['schemaVersion' => 1, 'locale' => 'id']],
        InvalidDocumentException::class,
        'unexpected_root_attribute',
        '$.attrs',
    ],
]);

it('reports unsupported schema version details', function (): void {
    try {
        Document::from([
            'type' => 'doc',
            'attrs' => [
                'schemaVersion' => 99,
            ],
        ]);
    } catch (UnsupportedSchemaVersionException $exception) {
        expect($exception->schemaVersion())->toBe(99);

        return;
    }

    throw new RuntimeException('Expected unsupported schema version to fail.');
});

it('rejects non-serializable content values', function (): void {
    $resource = fopen('php://memory', 'r');

    expect($resource)->toBeResource();

    try {
        Document::from([
            'type' => 'doc',
            'attrs' => [
                'schemaVersion' => 1,
            ],
            'content' => [$resource],
        ]);
    } catch (InvalidDocumentException $exception) {
        expect($exception->reason())
            ->toBe('not_json_serializable')
            ->and($exception->documentPath())
            ->toBe('$.content');

        return;
    } finally {
        fclose($resource);
    }

    throw new RuntimeException('Expected non-serializable content to fail.');
});
