<?php

namespace KatonFajar\LaravelBlocks\Documents\Exceptions;

use Throwable;

final class InvalidDocumentException extends DocumentException
{
    public static function blankJson(): self
    {
        return new self('Document JSON must not be blank.', 'blank_json', '$');
    }

    public static function malformedJson(Throwable $previous): self
    {
        return new self('Document JSON is malformed.', 'malformed_json', '$', $previous);
    }

    public static function rootNotObject(): self
    {
        return new self('Document root must be an object.', 'root_not_object', '$');
    }

    public static function invalidRootType(): self
    {
        return new self('Document root type must be "doc".', 'invalid_root_type', '$.type');
    }

    public static function invalidRootAttributes(): self
    {
        return new self('Document root attrs must be an object.', 'invalid_root_attributes', '$.attrs');
    }

    public static function missingSchemaVersion(): self
    {
        return new self(
            'Document schema version is required.',
            'missing_schema_version',
            '$.attrs.schemaVersion',
        );
    }

    public static function invalidSchemaVersion(): self
    {
        return new self(
            'Document schema version must be an integer.',
            'invalid_schema_version',
            '$.attrs.schemaVersion',
        );
    }

    public static function invalidContent(): self
    {
        return new self('Document content must be an ordered array.', 'invalid_content', '$.content');
    }

    public static function unexpectedRootKey(string $key): self
    {
        return new self(
            sprintf('Document root contains unsupported key "%s".', $key),
            'unexpected_root_key',
            '$',
        );
    }

    public static function unexpectedRootAttribute(string $key): self
    {
        return new self(
            sprintf('Document root attrs contains unsupported key "%s".', $key),
            'unexpected_root_attribute',
            '$.attrs',
        );
    }

    public static function notJsonSerializable(?Throwable $previous = null): self
    {
        return new self(
            'Document content must contain JSON-serializable values.',
            'not_json_serializable',
            '$.content',
            $previous,
        );
    }
}
