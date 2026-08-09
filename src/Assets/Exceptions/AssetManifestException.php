<?php

namespace KatonFajar\LaravelBlocks\Assets\Exceptions;

use RuntimeException;
use Throwable;

final class AssetManifestException extends RuntimeException
{
    private function __construct(
        private readonly string $reason,
        private readonly string $manifestPath,
        string $message,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public static function at(string $reason, string $manifestPath, string $message, ?Throwable $previous = null): self
    {
        return new self(
            reason: $reason,
            manifestPath: $manifestPath,
            message: sprintf('%s at "%s".', $message, $manifestPath),
            previous: $previous,
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
