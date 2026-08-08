<?php

namespace KatonFajar\LaravelBlocks\Blocks\Exceptions;

use InvalidArgumentException;

final class InvalidBlockNameException extends InvalidArgumentException
{
    public function __construct(private readonly string $blockName)
    {
        parent::__construct(sprintf(
            'Block name "%s" must be a non-empty lower-camel identifier.',
            $blockName,
        ));
    }

    public function blockName(): string
    {
        return $this->blockName;
    }
}
