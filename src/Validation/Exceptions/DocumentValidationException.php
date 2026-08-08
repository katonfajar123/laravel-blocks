<?php

namespace KatonFajar\LaravelBlocks\Validation\Exceptions;

use InvalidArgumentException;

final class DocumentValidationException extends InvalidArgumentException
{
    private function __construct(
        string $message,
        private readonly string $reason,
        private readonly string $documentPath,
    ) {
        parent::__construct($message);
    }

    public static function at(string $reason, string $documentPath, string $message): self
    {
        return new self($message, $reason, $documentPath);
    }

    public function reason(): string
    {
        return $this->reason;
    }

    public function documentPath(): string
    {
        return $this->documentPath;
    }
}
