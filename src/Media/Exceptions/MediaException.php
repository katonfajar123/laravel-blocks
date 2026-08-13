<?php

namespace KatonFajar\LaravelBlocks\Media\Exceptions;

use RuntimeException;
use Throwable;

final class MediaException extends RuntimeException
{
    private function __construct(
        private readonly string $reason,
        private readonly ?string $mediaId,
        string $message,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public static function because(
        string $reason,
        string $message,
        ?string $mediaId = null,
        ?Throwable $previous = null,
    ): self {
        return new self($reason, $mediaId, $message, $previous);
    }

    public function reason(): string
    {
        return $this->reason;
    }

    public function mediaId(): ?string
    {
        return $this->mediaId;
    }
}
