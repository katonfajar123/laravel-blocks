<?php

namespace KatonFajar\LaravelBlocks\Blocks;

use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;
use KatonFajar\LaravelBlocks\Blocks\Exceptions\DuplicateBlockException;
use KatonFajar\LaravelBlocks\Blocks\Exceptions\InvalidBlockNameException;
use KatonFajar\LaravelBlocks\Blocks\Exceptions\UnknownBlockException;

final class BlockRegistry
{
    /** @var array<string, Block> */
    private array $blocks = [];

    public function __construct(private readonly Container $container) {}

    /**
     * @param  class-string<Block>|Block|array<array-key, class-string<Block>|Block>  $blocks
     */
    public function register(string|Block|array $blocks): void
    {
        $definitions = is_array($blocks) ? array_values($blocks) : [$blocks];
        $pending = [];

        foreach ($definitions as $definition) {
            $block = $this->resolve($definition);
            $name = $block->metadata()->name;

            $this->assertValidName($name);

            if (array_key_exists($name, $this->blocks) || array_key_exists($name, $pending)) {
                throw new DuplicateBlockException($name);
            }

            $pending[$name] = $block;
        }

        foreach ($pending as $name => $block) {
            $this->blocks[$name] = $block;
        }
    }

    public function get(string $name): Block
    {
        if (! array_key_exists($name, $this->blocks)) {
            throw new UnknownBlockException($name);
        }

        return $this->blocks[$name];
    }

    public function metadata(string $name): BlockMetadata
    {
        return $this->get($name)->metadata();
    }

    public function has(string $name): bool
    {
        return array_key_exists($name, $this->blocks);
    }

    /**
     * @return array<string, Block>
     */
    public function all(): array
    {
        return $this->blocks;
    }

    /**
     * @return array<string, BlockMetadata>
     */
    public function allMetadata(): array
    {
        $metadata = [];

        foreach ($this->blocks as $name => $block) {
            $metadata[$name] = $block->metadata();
        }

        return $metadata;
    }

    /**
     * @param  class-string<Block>|Block  $definition
     */
    private function resolve(string|Block $definition): Block
    {
        if ($definition instanceof Block) {
            return $definition;
        }

        return $this->resolveClass($definition);
    }

    private function resolveClass(string $definition): Block
    {
        if (! is_a($definition, Block::class, true)) {
            throw new InvalidArgumentException(sprintf(
                'Block definition "%s" must be a class-string extending %s.',
                $definition,
                Block::class,
            ));
        }

        $resolved = $this->container->make($definition);

        if (! $resolved instanceof Block) {
            throw new InvalidArgumentException(sprintf(
                'Container resolution for block "%s" did not return a %s instance.',
                $definition,
                Block::class,
            ));
        }

        return $resolved;
    }

    private function assertValidName(string $name): void
    {
        if (preg_match('/^[a-z][A-Za-z0-9]*$/D', $name) !== 1) {
            throw new InvalidBlockNameException($name);
        }
    }
}
