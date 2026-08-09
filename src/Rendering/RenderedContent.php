<?php

namespace KatonFajar\LaravelBlocks\Rendering;

use Illuminate\Contracts\Support\Htmlable;

final readonly class RenderedContent implements Htmlable
{
    public function __construct(private string $html) {}

    public static function empty(): self
    {
        return new self('');
    }

    public function toHtml(): string
    {
        return $this->html;
    }
}
