<?php

namespace KatonFajar\LaravelBlocks\Documents;

use JsonException;
use LogicException;

final readonly class Document
{
    private const JSON_FLAGS = JSON_PRESERVE_ZERO_FRACTION
        | JSON_UNESCAPED_SLASHES
        | JSON_UNESCAPED_UNICODE;

    /**
     * @param  array{type: 'doc', attrs: array{schemaVersion: 1}, content: list<mixed>}  $data
     */
    private function __construct(private array $data) {}

    /**
     * @param  array<array-key, mixed>|string|null  $value
     */
    public static function from(array|string|null $value): self
    {
        return new self((new DocumentNormalizer)->normalize($value));
    }

    public function schemaVersion(): SchemaVersion
    {
        return SchemaVersion::from($this->data['attrs']['schemaVersion']);
    }

    /**
     * @return array{type: 'doc', attrs: array{schemaVersion: 1}, content: list<mixed>}
     */
    public function toArray(): array
    {
        return $this->data;
    }

    public function toJson(): string
    {
        try {
            $json = json_encode($this->data, self::JSON_FLAGS | JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new LogicException('Canonical document serialization failed.', 0, $exception);
        }

        return $json;
    }
}
