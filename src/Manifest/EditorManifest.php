<?php

namespace KatonFajar\LaravelBlocks\Manifest;

use JsonException;
use JsonSerializable;
use KatonFajar\LaravelBlocks\Documents\SchemaVersion;
use LogicException;
use stdClass;

final readonly class EditorManifest implements JsonSerializable
{
    public const VERSION = 1;

    /**
     * @param  list<EditorManifestCategory>  $categories
     * @param  list<EditorManifestBlock>  $blocks
     */
    public function __construct(
        public array $categories,
        public array $blocks,
        public int $manifestVersion = self::VERSION,
        public int $documentSchemaVersion = SchemaVersion::V1->value,
    ) {}

    /**
     * @return array{
     *     manifestVersion: int,
     *     documentSchemaVersion: int,
     *     categories: list<array{name: string, label: string}>,
     *     blocks: list<array<string, mixed>>
     * }
     */
    public function toArray(): array
    {
        return [
            'manifestVersion' => $this->manifestVersion,
            'documentSchemaVersion' => $this->documentSchemaVersion,
            'categories' => array_map(
                static fn (EditorManifestCategory $category): array => $category->toArray(),
                $this->categories,
            ),
            'blocks' => array_map(
                static fn (EditorManifestBlock $block): array => $block->toArray(),
                $this->blocks,
            ),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return $this->toJsonReadyArray();
    }

    public function toJson(): string
    {
        try {
            return json_encode(
                $this->toJsonReadyArray(),
                JSON_PRESERVE_ZERO_FRACTION | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
            );
        } catch (JsonException $exception) {
            throw new LogicException('Editor manifest serialization failed.', 0, $exception);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function toJsonReadyArray(): array
    {
        return [
            'manifestVersion' => $this->manifestVersion,
            'documentSchemaVersion' => $this->documentSchemaVersion,
            'categories' => array_map(
                static fn (EditorManifestCategory $category): array => $category->toArray(),
                $this->categories,
            ),
            'blocks' => array_map(
                static fn (EditorManifestBlock $block): array => $block->toJsonReadyArray(),
                $this->blocks,
            ),
        ];
    }

    public static function emptyObject(): stdClass
    {
        return new stdClass;
    }
}
