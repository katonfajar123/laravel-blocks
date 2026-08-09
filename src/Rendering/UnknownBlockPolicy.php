<?php

namespace KatonFajar\LaravelBlocks\Rendering;

enum UnknownBlockPolicy: string
{
    case THROW = 'throw';
    case PLACEHOLDER = 'placeholder';
    case SKIP = 'skip';

    public static function fromConfiguredValue(mixed $value): self
    {
        if (is_string($value)) {
            return self::tryFrom($value) ?? self::THROW;
        }

        return self::THROW;
    }
}
