<?php

namespace KatonFajar\LaravelBlocks\Blocks\Exceptions;

use LogicException;

final class DuplicateBlockException extends LogicException
{
    public function __construct(private readonly string $blockName)
    {
        parent::__construct(sprintf('Block "%s" is already registered.', $blockName));
    }

    public function blockName(): string
    {
        return $this->blockName;
    }
}
