<?php

namespace KatonFajar\LaravelBlocks\Blocks;

abstract class Block
{
    private ?BlockMetadata $metadata = null;

    abstract public function name(): string;

    abstract public function label(): string;

    abstract public function view(): string;

    public function description(): ?string
    {
        return null;
    }

    public function category(): string
    {
        return 'custom';
    }

    /**
     * @return list<string>
     */
    public function keywords(): array
    {
        return [];
    }

    public function icon(): ?string
    {
        return null;
    }

    /**
     * @return list<mixed>
     */
    public function fields(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>
     */
    public function supports(): array
    {
        return [];
    }

    public function editorComponent(): ?string
    {
        return null;
    }

    final public function metadata(): BlockMetadata
    {
        return $this->metadata ??= BlockMetadata::from($this);
    }
}
