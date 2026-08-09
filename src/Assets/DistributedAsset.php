<?php

namespace KatonFajar\LaravelBlocks\Assets;

use JsonSerializable;

final readonly class DistributedAsset implements JsonSerializable
{
    public function __construct(
        public string $name,
        public string $file,
        public string $type,
        public string $url,
        public string $integrity,
        public string $sha256,
        public int $bytes,
    ) {}

    /**
     * @return array{name: string, file: string, type: string, url: string, integrity: string, sha256: string, bytes: int}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'file' => $this->file,
            'type' => $this->type,
            'url' => $this->url,
            'integrity' => $this->integrity,
            'sha256' => $this->sha256,
            'bytes' => $this->bytes,
        ];
    }

    /**
     * @return array{name: string, file: string, type: string, url: string, integrity: string, sha256: string, bytes: int}
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
