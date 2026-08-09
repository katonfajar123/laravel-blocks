<?php

namespace KatonFajar\LaravelBlocks\Rendering\Exceptions;

use RuntimeException;
use Throwable;

final class BlockRenderException extends RuntimeException
{
    public function __construct(
        private readonly string $blockName,
        private readonly string $documentPath,
        ?Throwable $previous = null,
    ) {
        parent::__construct(
            sprintf('Block "%s" failed to render at "%s".', $blockName, $documentPath),
            0,
            $previous,
        );
    }

    public function blockName(): string
    {
        return $this->blockName;
    }

    public function documentPath(): string
    {
        return $this->documentPath;
    }
}
