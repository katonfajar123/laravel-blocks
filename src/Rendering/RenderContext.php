<?php

namespace KatonFajar\LaravelBlocks\Rendering;

final readonly class RenderContext
{
    public function __construct(
        private ?UnknownBlockPolicy $unknownBlockPolicy = null,
    ) {}

    public static function withUnknownBlocks(UnknownBlockPolicy|string $policy): self
    {
        return new self($policy instanceof UnknownBlockPolicy ? $policy : UnknownBlockPolicy::fromConfiguredValue($policy));
    }

    public function unknownBlockPolicy(): ?UnknownBlockPolicy
    {
        return $this->unknownBlockPolicy;
    }
}
