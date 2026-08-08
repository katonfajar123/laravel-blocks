<?php

namespace KatonFajar\LaravelBlocks\Documents;

enum SchemaVersion: int
{
    case V1 = 1;

    public static function current(): self
    {
        return self::V1;
    }
}
