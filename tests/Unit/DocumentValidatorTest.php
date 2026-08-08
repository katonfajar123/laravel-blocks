<?php

use Illuminate\Container\Container;
use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;
use KatonFajar\LaravelBlocks\Validation\AttributeValidator;
use KatonFajar\LaravelBlocks\Validation\DocumentValidator;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;
use KatonFajar\LaravelBlocks\Validation\MarkRegistry;
use KatonFajar\LaravelBlocks\Validation\MarkSchema;
use KatonFajar\LaravelBlocks\Validation\MarkValidator;
use KatonFajar\LaravelBlocks\Validation\NodeValidator;
use KatonFajar\LaravelBlocks\Validation\ValidationLimits;

function b04Validator(?ValidationLimits $limits = null): DocumentValidator
{
    $container = new Container;
    $blocks = new BlockRegistry($container);
    $blocks->register([
        B04ParagraphBlock::class,
        B04ContainerBlock::class,
        B04ImageBlock::class,
        B04LooseBlock::class,
    ]);

    $marks = new MarkRegistry;
    $marks->register([
        new MarkSchema('bold'),
        new MarkSchema('link', [
            'href' => AttributeRule::url(required: true),
            'openInNewTab' => AttributeRule::boolean(),
        ]),
    ]);

    $attributes = new AttributeValidator;
    $markValidator = new MarkValidator($marks, $attributes);
    $nodes = new NodeValidator($blocks, $attributes, $markValidator);

    return new DocumentValidator($nodes, $limits ?? new ValidationLimits);
}

/**
 * @param  array<array-key, mixed>|string|Document|null  $value
 */
function expectB04Failure(
    DocumentValidator $validator,
    array|string|Document|null $value,
    string $reason,
    string $path,
): void {
    try {
        $validator->validate($value);
    } catch (DocumentValidationException $exception) {
        expect($exception->reason())->toBe($reason)
            ->and($exception->documentPath())->toBe($path);

        return;
    }

    test()->fail(sprintf('Expected validation failure "%s" at "%s".', $reason, $path));
}

/**
 * @param  list<array<string, mixed>>  $content
 * @return array<string, mixed>
 */
function b04Document(array $content = []): array
{
    return [
        'type' => 'doc',
        'attrs' => ['schemaVersion' => 1],
        'content' => $content,
    ];
}

/**
 * @param  array<string, mixed>  $attrs
 * @param  list<array<string, mixed>>  $content
 * @return array<string, mixed>
 */
function b04Node(string $type, array $attrs = [], array $content = []): array
{
    return ['type' => $type, 'attrs' => $attrs, 'content' => $content];
}

it('validates canonical documents from every public input form', function (): void {
    $document = b04Document([
        b04Node('container', ['design' => ['tone' => 'muted']], [
            b04Node('paragraph', [
                'align' => 'center',
                'level' => 2,
                'ratio' => 1.5,
                'enabled' => true,
                'link' => null,
                'tags' => ['news', 'php'],
                'design' => ['tone' => 'primary'],
                'advanced' => ['anchor' => 'intro'],
            ], [[
                'type' => 'text',
                'text' => 'Laravel Blocks',
                'marks' => [
                    ['type' => 'bold'],
                    [
                        'type' => 'link',
                        'attrs' => [
                            'href' => 'https://example.com/docs',
                            'openInNewTab' => true,
                        ],
                    ],
                ],
            ]]),
        ]),
        b04Node('image', [
            'src' => 'https://example.com/image.png',
            'alt' => 'Example image',
        ]),
    ]);
    $validator = b04Validator();

    $fromArray = $validator->validate($document);
    $fromJson = $validator->validate(json_encode($document, JSON_THROW_ON_ERROR));
    $fromDocument = $validator->validate(Document::from($document));
    $fromNull = $validator->validate(null);

    expect($fromArray->toArray())->toBe($document)
        ->and($fromJson->toArray())->toBe($document)
        ->and($fromDocument->toArray())->toBe($document)
        ->and($fromNull->toArray())->toBe(b04Document());
});

it('reports typed structural failures with precise document paths', function (
    array $document,
    string $reason,
    string $path,
): void {
    expectB04Failure(b04Validator(), $document, $reason, $path);
})->with([
    'scalar node' => [b04Document([42]), 'invalid_node', '$.content[0]'],
    'node without type' => [b04Document([['attrs' => []]]), 'invalid_node_type', '$.content[0].type'],
    'unstable node type' => [b04Document([b04Node('Bad-Name')]), 'invalid_node_type', '$.content[0].type'],
    'unknown node' => [b04Document([b04Node('missing')]), 'unknown_node_type', '$.content[0].type'],
    'nested root node' => [b04Document([b04Node('doc')]), 'reserved_node_type', '$.content[0].type'],
    'unexpected node key' => [
        b04Document([['type' => 'image', 'attrs' => ['src' => 'https://example.com/a.png'], 'content' => [], 'html' => '<b>unsafe</b>']]),
        'unexpected_node_key',
        '$.content[0].html',
    ],
    'associative node content' => [
        b04Document([['type' => 'paragraph', 'attrs' => [], 'content' => ['first' => ['type' => 'text', 'text' => 'x']]]]),
        'invalid_content',
        '$.content[0].content',
    ],
    'direct root text' => [b04Document([['type' => 'text', 'text' => 'x']]), 'child_not_allowed', '$.content[0].type'],
    'empty text' => [b04Document([b04Node('paragraph', content: [['type' => 'text', 'text' => '']])]), 'invalid_text', '$.content[0].content[0].text'],
    'unexpected text key' => [
        b04Document([b04Node('paragraph', content: [['type' => 'text', 'text' => 'x', 'attrs' => []]])]),
        'unexpected_node_key',
        '$.content[0].content[0].attrs',
    ],
    'child rejected by parent' => [
        b04Document([b04Node('paragraph', content: [b04Node('image', ['src' => 'https://example.com/a.png'])])]),
        'child_not_allowed',
        '$.content[0].content[0].type',
    ],
    'node rejected by child parent rule' => [
        b04Document([b04Node('loose', content: [b04Node('image', ['src' => 'https://example.com/a.png'])])]),
        'parent_not_allowed',
        '$.content[0].content[0].type',
    ],
    'minimum children' => [b04Document([b04Node('container')]), 'minimum_children_not_met', '$.content[0].content'],
    'maximum children' => [
        b04Document([b04Node('container', content: [
            b04Node('paragraph'),
            b04Node('paragraph'),
            b04Node('paragraph'),
        ])]),
        'maximum_children_exceeded',
        '$.content[0].content',
    ],
]);

it('enforces declared attributes and recursive attribute rules', function (
    array $attrs,
    string $reason,
    string $path,
): void {
    expectB04Failure(
        b04Validator(),
        b04Document([b04Node('paragraph', $attrs)]),
        $reason,
        $path,
    );
})->with([
    'attributes must be an object' => [[0 => 'value'], 'invalid_attributes', '$.content[0].attrs'],
    'undeclared attribute' => [['unknown' => true], 'undeclared_attribute', '$.content[0].attrs.unknown'],
    'wrong scalar type' => [['align' => 1], 'invalid_attribute_type', '$.content[0].attrs.align'],
    'string allow-list' => [['align' => 'right'], 'attribute_value_not_allowed', '$.content[0].attrs.align'],
    'integer below minimum' => [['level' => 0], 'attribute_below_minimum', '$.content[0].attrs.level'],
    'number above maximum' => [['ratio' => 3.1], 'attribute_above_maximum', '$.content[0].attrs.ratio'],
    'boolean type' => [['enabled' => 1], 'invalid_attribute_type', '$.content[0].attrs.enabled'],
    'nullable does not accept wrong values' => [['link' => false], 'invalid_attribute_type', '$.content[0].attrs.link'],
    'unsafe URL scheme' => [['link' => 'javascript:alert(1)'], 'unsafe_url_scheme', '$.content[0].attrs.link'],
    'invalid HTTP URL' => [['link' => 'https://exa mple.com'], 'invalid_url', '$.content[0].attrs.link'],
    'list must be ordered' => [['tags' => ['first' => 'php']], 'invalid_attribute_type', '$.content[0].attrs.tags'],
    'too many list items' => [['tags' => ['one', 'two', 'three', 'four']], 'attribute_too_long', '$.content[0].attrs.tags'],
    'invalid list item' => [['tags' => ['valid', 2]], 'invalid_attribute_type', '$.content[0].attrs.tags[1]'],
    'nested object required value' => [['design' => []], 'missing_attribute', '$.content[0].attrs.design.tone'],
    'nested object undeclared value' => [
        ['advanced' => ['custom' => true]],
        'undeclared_attribute',
        '$.content[0].attrs.advanced.custom',
    ],
    'nested string length' => [
        ['advanced' => ['anchor' => str_repeat('a', 21)]],
        'attribute_too_long',
        '$.content[0].attrs.advanced.anchor',
    ],
]);

it('requires attributes declared as mandatory', function (): void {
    expectB04Failure(
        b04Validator(),
        b04Document([b04Node('image')]),
        'missing_attribute',
        '$.content[0].attrs.src',
    );
});

it('validates mark registration, allowance, shape, duplicates, and attributes', function (
    array $marks,
    string $reason,
    string $path,
): void {
    $document = b04Document([
        b04Node('paragraph', content: [[
            'type' => 'text',
            'text' => 'marked',
            'marks' => $marks,
        ]]),
    ]);

    expectB04Failure(b04Validator(), $document, $reason, $path);
})->with([
    'marks must be a list' => [['bold' => ['type' => 'bold']], 'invalid_marks', '$.content[0].content[0].marks'],
    'mark must be an object' => [[42], 'invalid_mark', '$.content[0].content[0].marks[0]'],
    'mark type must be stable' => [[['type' => 'Bad-Mark']], 'invalid_mark_type', '$.content[0].content[0].marks[0].type'],
    'unknown mark' => [[['type' => 'missing']], 'unknown_mark', '$.content[0].content[0].marks[0].type'],
    'duplicate mark' => [[['type' => 'bold'], ['type' => 'bold']], 'duplicate_mark', '$.content[0].content[0].marks[1].type'],
    'unexpected mark key' => [[['type' => 'bold', 'html' => '<b>unsafe</b>']], 'unexpected_mark_key', '$.content[0].content[0].marks[0].html'],
    'missing mark attribute' => [[['type' => 'link']], 'missing_attribute', '$.content[0].content[0].marks[0].attrs.href'],
    'unsafe mark URL' => [
        [['type' => 'link', 'attrs' => ['href' => 'javascript:alert(1)']]],
        'unsafe_url_scheme',
        '$.content[0].content[0].marks[0].attrs.href',
    ],
]);

it('rejects registered marks that a block does not allow', function (): void {
    $document = b04Document([
        b04Node('loose', content: [[
            'type' => 'text',
            'text' => 'marked',
            'marks' => [['type' => 'bold']],
        ]]),
    ]);

    expectB04Failure(
        b04Validator(),
        $document,
        'mark_not_allowed',
        '$.content[0].content[0].marks[0].type',
    );
});

it('enforces document bytes before decoding oversized JSON', function (): void {
    expectB04Failure(
        b04Validator(new ValidationLimits(maximumBytes: 10)),
        '{"this":"input is intentionally oversized"}',
        'maximum_document_bytes_exceeded',
        '$',
    );
});

it('enforces canonical document bytes for array input', function (): void {
    $document = b04Document([b04Node('paragraph')]);

    expectB04Failure(
        b04Validator(new ValidationLimits(maximumBytes: strlen(json_encode($document, JSON_THROW_ON_ERROR)) - 1)),
        $document,
        'maximum_document_bytes_exceeded',
        '$',
    );
});

it('enforces node, depth, cumulative text, and attribute byte limits', function (
    ValidationLimits $limits,
    array $document,
    string $reason,
    string $path,
): void {
    expectB04Failure(b04Validator($limits), $document, $reason, $path);
})->with([
    'nodes' => [
        new ValidationLimits(maximumNodes: 1),
        b04Document([b04Node('paragraph', content: [['type' => 'text', 'text' => 'x']])]),
        'maximum_nodes_exceeded',
        '$.content[0].content[0]',
    ],
    'depth' => [
        new ValidationLimits(maximumDepth: 1),
        b04Document([b04Node('container', content: [b04Node('paragraph')])]),
        'maximum_depth_exceeded',
        '$.content[0].content[0]',
    ],
    'text bytes' => [
        new ValidationLimits(maximumTextBytes: 5),
        b04Document([
            b04Node('paragraph', content: [['type' => 'text', 'text' => 'abc']]),
            b04Node('paragraph', content: [['type' => 'text', 'text' => 'def']]),
        ]),
        'maximum_text_bytes_exceeded',
        '$.content[1].content[0].text',
    ],
    'attribute bytes' => [
        new ValidationLimits(maximumAttributeBytes: 2),
        b04Document([b04Node('paragraph', ['align' => 'left'])]),
        'maximum_attribute_bytes_exceeded',
        '$.content[0].attrs',
    ],
]);

it('accepts documents exactly at every configured resource boundary', function (): void {
    $document = b04Document([
        b04Node('paragraph', content: [[
            'type' => 'text',
            'text' => 'abc',
        ]]),
    ]);
    $encoded = json_encode($document, JSON_THROW_ON_ERROR);
    $validator = b04Validator(new ValidationLimits(
        maximumBytes: strlen($encoded),
        maximumNodes: 2,
        maximumDepth: 2,
        maximumTextBytes: 3,
        maximumAttributeBytes: 2,
    ));

    expect($validator->validate($document)->toArray())->toBe($document);
});

final class B04ParagraphBlock extends Block
{
    public function name(): string
    {
        return 'paragraph';
    }

    public function label(): string
    {
        return 'Paragraph';
    }

    public function view(): string
    {
        return 'blocks.paragraph';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'align' => AttributeRule::string(allowedValues: ['left', 'center']),
                'level' => AttributeRule::integer(minimum: 1, maximum: 6),
                'ratio' => AttributeRule::number(minimum: 0.1, maximum: 3),
                'enabled' => AttributeRule::boolean(),
                'link' => AttributeRule::url(allowedSchemes: ['https'], nullable: true),
                'tags' => AttributeRule::listOf(AttributeRule::string(maximumLength: 10), maximumItems: 3),
                'design' => AttributeRule::object([
                    'tone' => AttributeRule::string(required: true, allowedValues: ['primary', 'muted']),
                ]),
                'advanced' => AttributeRule::object([
                    'anchor' => AttributeRule::string(maximumLength: 20),
                ]),
            ],
            allowedParents: ['doc', 'container'],
            allowedChildren: ['text'],
            allowedMarks: ['bold', 'link'],
            maximumChildren: null,
        );
    }
}

final class B04ContainerBlock extends Block
{
    public function name(): string
    {
        return 'container';
    }

    public function label(): string
    {
        return 'Container';
    }

    public function view(): string
    {
        return 'blocks.container';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'design' => AttributeRule::object([
                    'tone' => AttributeRule::string(required: true, allowedValues: ['primary', 'muted']),
                ]),
            ],
            allowedParents: ['doc'],
            allowedChildren: ['paragraph'],
            minimumChildren: 1,
            maximumChildren: 2,
        );
    }
}

final class B04ImageBlock extends Block
{
    public function name(): string
    {
        return 'image';
    }

    public function label(): string
    {
        return 'Image';
    }

    public function view(): string
    {
        return 'blocks.image';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            attributes: [
                'src' => AttributeRule::url(required: true),
                'alt' => AttributeRule::string(maximumLength: 200),
            ],
            allowedParents: ['doc'],
        );
    }
}

final class B04LooseBlock extends Block
{
    public function name(): string
    {
        return 'loose';
    }

    public function label(): string
    {
        return 'Loose';
    }

    public function view(): string
    {
        return 'blocks.loose';
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema(
            allowedParents: ['doc'],
            allowedChildren: null,
            maximumChildren: null,
        );
    }
}
