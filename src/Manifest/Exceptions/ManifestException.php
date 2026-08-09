<?php

namespace KatonFajar\LaravelBlocks\Manifest\Exceptions;

use RuntimeException;

final class ManifestException extends RuntimeException
{
    private function __construct(
        private readonly string $reason,
        private readonly string $manifestPath,
        string $message,
    ) {
        parent::__construct($message);
    }

    public static function at(string $reason, string $manifestPath, string $message): self
    {
        return new self(
            reason: $reason,
            manifestPath: $manifestPath,
            message: sprintf('%s at "%s".', $message, $manifestPath),
        );
    }

    public function reason(): string
    {
        return $this->reason;
    }

    public function manifestPath(): string
    {
        return $this->manifestPath;
    }
}
