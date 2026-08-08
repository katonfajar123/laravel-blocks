<?php

namespace KatonFajar\LaravelBlocks\Validation;

use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

final class ValidationContext
{
    private int $nodes = 0;

    private int $textBytes = 0;

    public function __construct(public readonly ValidationLimits $limits) {}

    public function enterNode(int $depth, string $path): void
    {
        if ($depth > $this->limits->maximumDepth) {
            throw DocumentValidationException::at(
                'maximum_depth_exceeded',
                $path,
                'Document depth exceeds the configured limit.',
            );
        }

        $this->nodes++;

        if ($this->nodes > $this->limits->maximumNodes) {
            throw DocumentValidationException::at(
                'maximum_nodes_exceeded',
                $path,
                'Document node count exceeds the configured limit.',
            );
        }
    }

    public function addTextBytes(int $bytes, string $path): void
    {
        $this->textBytes += $bytes;

        if ($this->textBytes > $this->limits->maximumTextBytes) {
            throw DocumentValidationException::at(
                'maximum_text_bytes_exceeded',
                $path,
                'Document text exceeds the configured byte limit.',
            );
        }
    }
}
