<?php

namespace KatonFajar\LaravelBlocks\Manifest;

use JsonSerializable;

final readonly class EditorManifestCategory implements JsonSerializable
{
    public function __construct(
        public string $name,
        public string $label,
    ) {}

    /**
     * @return array{name: string, label: string}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
        ];
    }

    /**
     * @return array{name: string, label: string}
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
