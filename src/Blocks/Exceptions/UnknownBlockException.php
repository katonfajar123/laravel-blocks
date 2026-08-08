<?php

namespace KatonFajar\LaravelBlocks\Blocks\Exceptions;

use OutOfBoundsException;

final class UnknownBlockException extends OutOfBoundsException
{
    public function __construct(private readonly string $blockName)
    {
        parent::__construct(sprintf('Block "%s" is not registered.', $blockName));
    }

    public function blockName(): string
    {
        return $this->blockName;
    }
}
