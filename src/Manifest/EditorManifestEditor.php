<?php

namespace KatonFajar\LaravelBlocks\Manifest;

use JsonSerializable;

final readonly class EditorManifestEditor implements JsonSerializable
{
    private function __construct(
        public string $mode,
        public ?string $component,
    ) {}

    public static function generated(): self
    {
        return new self('generated', null);
    }

    public static function component(string $component): self
    {
        return new self('component', $component);
    }

    /**
     * @return array{mode: string, component: string|null}
     */
    public function toArray(): array
    {
        return [
            'mode' => $this->mode,
            'component' => $this->component,
        ];
    }

    /**
     * @return array{mode: string, component: string|null}
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
