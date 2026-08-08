<?php

namespace KatonFajar\LaravelBlocks\Validation\Exceptions;

use OutOfBoundsException;

final class UnknownMarkException extends OutOfBoundsException
{
    public function __construct(private readonly string $markName)
    {
        parent::__construct(sprintf('Mark "%s" is not registered.', $markName));
    }

    public function markName(): string
    {
        return $this->markName;
    }
}
