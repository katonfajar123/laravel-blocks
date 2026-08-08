<?php

namespace KatonFajar\LaravelBlocks\Validation\Exceptions;

use LogicException;

final class DuplicateMarkException extends LogicException
{
    public function __construct(private readonly string $markName)
    {
        parent::__construct(sprintf('Mark "%s" is already registered.', $markName));
    }

    public function markName(): string
    {
        return $this->markName;
    }
}
