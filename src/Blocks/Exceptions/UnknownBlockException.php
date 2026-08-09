<?php

namespace KatonFajar\LaravelBlocks\Blocks\Exceptions;

use OutOfBoundsException;

final class UnknownBlockException extends OutOfBoundsException
{
    public function __construct(
        private readonly string $blockName,
        private readonly ?string $documentPath = null,
    ) {
        parent::__construct($documentPath === null
            ? sprintf('Block "%s" is not registered.', $blockName)
            : sprintf('Block "%s" is not registered at "%s".', $blockName, $documentPath));
    }

    public function blockName(): string
    {
        return $this->blockName;
    }

    public function documentPath(): ?string
    {
        return $this->documentPath;
    }
}
