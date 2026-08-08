<?php

use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;
use KatonFajar\LaravelBlocks\Validation\AttributeType;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DuplicateMarkException;
use KatonFajar\LaravelBlocks\Validation\Exceptions\UnknownMarkException;
use KatonFajar\LaravelBlocks\Validation\MarkRegistry;
use KatonFajar\LaravelBlocks\Validation\MarkSchema;
use KatonFajar\LaravelBlocks\Validation\ValidationLimits;

it('builds immutable executable attribute and block schemas', function (): void {
    $rule = AttributeRule::object(
        properties: [
            'tone' => AttributeRule::string(
                required: true,
                allowedValues: ['primary', 'muted'],
            ),
        ],
        required: true,
    );
    $schema = new BlockSchema(
        attributes: ['design' => $rule],
        allowedParents: ['doc'],
        allowedChildren: ['text'],
        allowedMarks: ['bold'],
        minimumChildren: 1,
        maximumChildren: 3,
    );

    expect($rule->type)->toBe(AttributeType::OBJECT)
        ->and($schema->attributes)->toBe(['design' => $rule])
        ->and($schema->allowedParents)->toBe(['doc'])
        ->and($schema->allowedChildren)->toBe(['text'])
        ->and($schema->allowedMarks)->toBe(['bold'])
        ->and($schema->minimumChildren)->toBe(1)
        ->and($schema->maximumChildren)->toBe(3);
});

it('rejects invalid schema constraints', function (Closure $build, string $message): void {
    expect($build)->toThrow(InvalidArgumentException::class, $message);
})->with([
    'negative string length' => [
        fn (): AttributeRule => AttributeRule::string(minimumLength: -1),
        'Minimum length must be zero or greater.',
    ],
    'reversed numeric range' => [
        fn (): AttributeRule => AttributeRule::number(minimum: 5, maximum: 4),
        'Minimum value cannot exceed maximum value.',
    ],
    'empty URL scheme allow-list' => [
        fn (): AttributeRule => AttributeRule::url([]),
        'URL attribute rules require at least one allowed scheme.',
    ],
    'invalid nested attribute name' => [
        fn (): AttributeRule => AttributeRule::object(['bad-name' => AttributeRule::string()]),
        'Attribute name "bad-name" must be lower-camel.',
    ],
    'invalid block attribute name' => [
        fn (): BlockSchema => new BlockSchema(attributes: ['Bad' => AttributeRule::string()]),
        'Attribute name "Bad" must be lower-camel.',
    ],
    'duplicate allowed child' => [
        fn (): BlockSchema => new BlockSchema(allowedChildren: ['text', 'text']),
        'Allowed child names must be unique.',
    ],
    'reversed child range' => [
        fn (): BlockSchema => new BlockSchema(minimumChildren: 2, maximumChildren: 1),
        'Maximum children cannot be less than minimum children.',
    ],
]);

it('registers marks atomically and preserves deterministic order', function (): void {
    $bold = new MarkSchema('bold');
    $link = new MarkSchema('link', [
        'href' => AttributeRule::url(required: true),
    ]);
    $registry = new MarkRegistry;

    $registry->register([$bold, $link]);

    expect($registry->all())->toBe(['bold' => $bold, 'link' => $link])
        ->and($registry->has('bold'))->toBeTrue()
        ->and($registry->get('link'))->toBe($link);
});

it('rejects duplicate marks without partially applying a bulk registration', function (): void {
    $registry = new MarkRegistry;
    $registry->register(new MarkSchema('bold'));

    try {
        $registry->register([
            new MarkSchema('highlight'),
            new MarkSchema('bold'),
        ]);
    } catch (DuplicateMarkException $exception) {
        expect($exception->markName())->toBe('bold')
            ->and($registry->all())->toHaveKey('bold')
            ->not->toHaveKey('highlight');

        return;
    }

    test()->fail('Expected duplicate mark registration to fail.');
});

it('throws a typed exception for unknown marks', function (): void {
    $registry = new MarkRegistry;

    try {
        $registry->get('missing');
    } catch (UnknownMarkException $exception) {
        expect($exception->markName())->toBe('missing');

        return;
    }

    test()->fail('Expected unknown mark lookup to fail.');
});

it('normalizes validation limits from configuration', function (): void {
    $limits = ValidationLimits::fromArray([
        'max_bytes' => 100,
        'max_nodes' => 20,
        'max_depth' => 4,
        'max_text_bytes' => 50,
        'max_attribute_bytes' => 25,
    ]);

    expect($limits->toArray())->toBe([
        'max_bytes' => 100,
        'max_nodes' => 20,
        'max_depth' => 4,
        'max_text_bytes' => 50,
        'max_attribute_bytes' => 25,
    ]);
});

it('uses safe defaults for absent or invalid configured limits', function (): void {
    $limits = ValidationLimits::fromArray([
        'max_nodes' => 'many',
        'max_depth' => 0,
    ]);

    expect($limits->maximumBytes)->toBe(ValidationLimits::DEFAULT_MAX_BYTES)
        ->and($limits->maximumNodes)->toBe(ValidationLimits::DEFAULT_MAX_NODES)
        ->and($limits->maximumDepth)->toBe(ValidationLimits::DEFAULT_MAX_DEPTH)
        ->and($limits->maximumTextBytes)->toBe(ValidationLimits::DEFAULT_MAX_TEXT_BYTES)
        ->and($limits->maximumAttributeBytes)->toBe(ValidationLimits::DEFAULT_MAX_ATTRIBUTE_BYTES);
});
