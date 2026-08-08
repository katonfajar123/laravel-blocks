<?php

use Illuminate\Container\Container;
use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;
use KatonFajar\LaravelBlocks\Blocks\Exceptions\DuplicateBlockException;
use KatonFajar\LaravelBlocks\Blocks\Exceptions\InvalidBlockNameException;
use KatonFajar\LaravelBlocks\Blocks\Exceptions\UnknownBlockException;

it('registers instances and container-resolved class strings in deterministic order', function (): void {
    $container = new Container;
    $dependency = new RegistryTestDependency('Resolved by container');
    $container->instance(RegistryTestDependency::class, $dependency);
    $registry = new BlockRegistry($container);
    $paragraph = new RegistryNamedBlock('paragraph');

    $registry->register([
        'first' => $paragraph,
        'second' => RegistryContainerBlock::class,
    ]);

    expect(array_keys($registry->all()))->toBe(['paragraph', 'containerResolved'])
        ->and($registry->get('paragraph'))->toBe($paragraph)
        ->and($registry->get('containerResolved'))->toBeInstanceOf(RegistryContainerBlock::class)
        ->and($registry->get('containerResolved')->label())->toBe('Resolved by container')
        ->and($registry->has('paragraph'))->toBeTrue()
        ->and($registry->has('missing'))->toBeFalse()
        ->and(array_keys($registry->allMetadata()))->toBe(['paragraph', 'containerResolved'])
        ->and($registry->metadata('paragraph'))->toBe($paragraph->metadata());
});

it('accepts a single block class or instance', function (): void {
    $registry = new BlockRegistry(new Container);
    $instance = new RegistryNamedBlock('quote');

    $registry->register($instance);
    $registry->register(RegistryContainerBlock::class);

    expect($registry->get('quote'))->toBe($instance)
        ->and($registry->get('containerResolved'))->toBeInstanceOf(RegistryContainerBlock::class);
});

it('rejects duplicates without partially applying a bulk registration', function (): void {
    $registry = new BlockRegistry(new Container);
    $registry->register(new RegistryNamedBlock('paragraph'));

    try {
        $registry->register([
            new RegistryNamedBlock('heading'),
            new RegistryNamedBlock('paragraph'),
        ]);
    } catch (DuplicateBlockException $exception) {
        expect($exception->blockName())->toBe('paragraph')
            ->and($registry->has('heading'))->toBeFalse()
            ->and(array_keys($registry->all()))->toBe(['paragraph']);

        return;
    }

    throw new RuntimeException('Expected duplicate block registration to fail.');
});

it('rejects duplicate names inside the same bulk registration', function (): void {
    $registry = new BlockRegistry(new Container);

    expect(fn () => $registry->register([
        new RegistryNamedBlock('paragraph'),
        new RegistryNamedBlock('paragraph'),
    ]))->toThrow(DuplicateBlockException::class, 'Block "paragraph" is already registered.')
        ->and($registry->all())->toBe([]);
});

it('throws a typed exception with block context for unknown lookups', function (): void {
    $registry = new BlockRegistry(new Container);

    try {
        $registry->get('missingBlock');
    } catch (UnknownBlockException $exception) {
        expect($exception->blockName())->toBe('missingBlock')
            ->and($exception->getMessage())->toBe('Block "missingBlock" is not registered.');

        return;
    }

    throw new RuntimeException('Expected unknown block lookup to fail.');
});

it('enforces stable lower-camel block names', function (string $name): void {
    $registry = new BlockRegistry(new Container);

    try {
        $registry->register(new RegistryNamedBlock($name));
    } catch (InvalidBlockNameException $exception) {
        expect($exception->blockName())->toBe($name);

        return;
    }

    throw new RuntimeException('Expected invalid block name to fail.');
})->with([
    'empty' => '',
    'whitespace' => ' paragraph',
    'upper camel' => 'Paragraph',
    'kebab case' => 'media-text',
    'snake case' => 'media_text',
]);

it('rejects class strings that do not extend Block', function (): void {
    $registry = new BlockRegistry(new Container);

    expect(fn () => $registry->register(stdClass::class))
        ->toThrow(InvalidArgumentException::class, 'must be a class-string extending');
});

it('rejects container bindings that resolve a block class to another type', function (): void {
    $container = new Container;
    $container->bind(RegistryContainerBlock::class, static fn (): stdClass => new stdClass);
    $registry = new BlockRegistry($container);

    expect(fn () => $registry->register(RegistryContainerBlock::class))
        ->toThrow(InvalidArgumentException::class, 'did not return a');
});

it('accepts an empty bulk registration as a no-op', function (): void {
    $registry = new BlockRegistry(new Container);

    $registry->register([]);

    expect($registry->all())->toBe([]);
});

final readonly class RegistryTestDependency
{
    public function __construct(public string $label) {}
}

final class RegistryNamedBlock extends Block
{
    public function __construct(private readonly string $blockName) {}

    public function name(): string
    {
        return $this->blockName;
    }

    public function label(): string
    {
        return ucfirst($this->blockName);
    }

    public function view(): string
    {
        return 'blocks.test';
    }
}

final class RegistryContainerBlock extends Block
{
    public function __construct(private readonly ?RegistryTestDependency $dependency = null) {}

    public function name(): string
    {
        return 'containerResolved';
    }

    public function label(): string
    {
        return $this->dependency?->label ?? 'Container Resolved';
    }

    public function view(): string
    {
        return 'blocks.container-resolved';
    }
}
