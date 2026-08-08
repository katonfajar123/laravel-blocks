<?php

namespace KatonFajar\LaravelBlocks\Documents\Exceptions;

use InvalidArgumentException;
use Throwable;

abstract class DocumentException extends InvalidArgumentException
{
    protected function __construct(
        string $message,
        private readonly string $reason,
        private readonly string $documentPath,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
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
