<?php

namespace KatonFajar\LaravelBlocks\Documents\Exceptions;

final class UnsupportedSchemaVersionException extends DocumentException
{
    public function __construct(private readonly int $schemaVersion)
    {
        parent::__construct(
            sprintf('Document schema version %d is not supported.', $schemaVersion),
            'unsupported_schema_version',
            '$.attrs.schemaVersion',
        );
    }

    public function schemaVersion(): int
    {
        return $this->schemaVersion;
    }
}
