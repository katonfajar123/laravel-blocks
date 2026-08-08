<?php

namespace KatonFajar\LaravelBlocks\Documents;

use JsonException;
use KatonFajar\LaravelBlocks\Documents\Exceptions\InvalidDocumentException;
use KatonFajar\LaravelBlocks\Documents\Exceptions\UnsupportedSchemaVersionException;
use stdClass;

final class DocumentNormalizer
{
    private const JSON_FLAGS = JSON_PRESERVE_ZERO_FRACTION
        | JSON_UNESCAPED_SLASHES
        | JSON_UNESCAPED_UNICODE;

    /**
     * @param  array<array-key, mixed>|string|null  $value
     * @return array{type: 'doc', attrs: array{schemaVersion: 1}, content: list<mixed>}
     */
    public function normalize(array|string|null $value): array
    {
        if ($value === null) {
            return $this->emptyDocument();
        }

        $root = is_string($value)
            ? $this->decodeRoot($value)
            : $this->normalizeArrayRoot($value);

        if (($root['type'] ?? null) !== 'doc') {
            throw InvalidDocumentException::invalidRootType();
        }

        if (! array_key_exists('attrs', $root)) {
            throw InvalidDocumentException::missingSchemaVersion();
        }

        $attributes = $this->normalizeRootAttributes($root['attrs']);

        if (! array_key_exists('schemaVersion', $attributes)) {
            throw InvalidDocumentException::missingSchemaVersion();
        }

        $schemaVersion = $attributes['schemaVersion'];

        if (! is_int($schemaVersion)) {
            throw InvalidDocumentException::invalidSchemaVersion();
        }

        if ($schemaVersion !== SchemaVersion::current()->value) {
            throw new UnsupportedSchemaVersionException($schemaVersion);
        }

        $content = $root['content'] ?? [];

        if (! is_array($content) || ! array_is_list($content)) {
            throw InvalidDocumentException::invalidContent();
        }

        $this->rejectUnexpectedKeys($root, ['type', 'attrs', 'content']);
        $this->rejectUnexpectedAttributes($attributes);

        return [
            'type' => 'doc',
            'attrs' => [
                'schemaVersion' => SchemaVersion::current()->value,
            ],
            'content' => $this->copyContent($content),
        ];
    }

    /**
     * @return array{type: 'doc', attrs: array{schemaVersion: 1}, content: list<mixed>}
     */
    private function emptyDocument(): array
    {
        return [
            'type' => 'doc',
            'attrs' => [
                'schemaVersion' => SchemaVersion::current()->value,
            ],
            'content' => [],
        ];
    }

    /**
     * @return array<array-key, mixed>
     */
    private function decodeRoot(string $value): array
    {
        if (trim($value) === '') {
            throw InvalidDocumentException::blankJson();
        }

        try {
            $decoded = json_decode($value, false, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw InvalidDocumentException::malformedJson($exception);
        }

        if (! $decoded instanceof stdClass) {
            throw InvalidDocumentException::rootNotObject();
        }

        return get_object_vars($decoded);
    }

    /**
     * @param  array<array-key, mixed>  $value
     * @return array<array-key, mixed>
     */
    private function normalizeArrayRoot(array $value): array
    {
        if (array_is_list($value)) {
            throw InvalidDocumentException::rootNotObject();
        }

        return $value;
    }

    /**
     * @return array<array-key, mixed>
     */
    private function normalizeRootAttributes(mixed $attributes): array
    {
        if ($attributes instanceof stdClass) {
            return get_object_vars($attributes);
        }

        if (! is_array($attributes) || ($attributes !== [] && array_is_list($attributes))) {
            throw InvalidDocumentException::invalidRootAttributes();
        }

        return $attributes;
    }

    /**
     * @param  array<array-key, mixed>  $root
     * @param  list<string>  $allowed
     */
    private function rejectUnexpectedKeys(array $root, array $allowed): void
    {
        foreach (array_keys($root) as $key) {
            if (! is_string($key) || ! in_array($key, $allowed, true)) {
                throw InvalidDocumentException::unexpectedRootKey((string) $key);
            }
        }
    }

    /**
     * @param  array<array-key, mixed>  $attributes
     */
    private function rejectUnexpectedAttributes(array $attributes): void
    {
        foreach (array_keys($attributes) as $key) {
            if ($key !== 'schemaVersion') {
                throw InvalidDocumentException::unexpectedRootAttribute((string) $key);
            }
        }
    }

    /**
     * @param  list<mixed>  $content
     * @return list<mixed>
     */
    private function copyContent(array $content): array
    {
        try {
            $encoded = json_encode($content, self::JSON_FLAGS | JSON_THROW_ON_ERROR);
            $copied = json_decode($encoded, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw InvalidDocumentException::notJsonSerializable($exception);
        }

        if (! is_array($copied) || ! array_is_list($copied)) {
            throw InvalidDocumentException::notJsonSerializable();
        }

        return $copied;
    }
}
