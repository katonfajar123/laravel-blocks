<?php

namespace KatonFajar\LaravelBlocks\Validation;

use InvalidArgumentException;

final readonly class ValidationLimits
{
    public const DEFAULT_MAX_BYTES = 1_048_576;

    public const DEFAULT_MAX_NODES = 10_000;

    public const DEFAULT_MAX_DEPTH = 32;

    public const DEFAULT_MAX_TEXT_BYTES = 262_144;

    public const DEFAULT_MAX_ATTRIBUTE_BYTES = 65_536;

    public function __construct(
        public int $maximumBytes = self::DEFAULT_MAX_BYTES,
        public int $maximumNodes = self::DEFAULT_MAX_NODES,
        public int $maximumDepth = self::DEFAULT_MAX_DEPTH,
        public int $maximumTextBytes = self::DEFAULT_MAX_TEXT_BYTES,
        public int $maximumAttributeBytes = self::DEFAULT_MAX_ATTRIBUTE_BYTES,
    ) {
        foreach ($this->toArray() as $name => $value) {
            if ($value < 1) {
                throw new InvalidArgumentException(sprintf('%s must be greater than zero.', $name));
            }
        }
    }

    /**
     * @param  array<array-key, mixed>  $configuration
     */
    public static function fromArray(array $configuration): self
    {
        return new self(
            maximumBytes: self::positiveInteger(
                $configuration['max_bytes'] ?? null,
                self::DEFAULT_MAX_BYTES,
            ),
            maximumNodes: self::positiveInteger(
                $configuration['max_nodes'] ?? null,
                self::DEFAULT_MAX_NODES,
            ),
            maximumDepth: self::positiveInteger(
                $configuration['max_depth'] ?? null,
                self::DEFAULT_MAX_DEPTH,
            ),
            maximumTextBytes: self::positiveInteger(
                $configuration['max_text_bytes'] ?? null,
                self::DEFAULT_MAX_TEXT_BYTES,
            ),
            maximumAttributeBytes: self::positiveInteger(
                $configuration['max_attribute_bytes'] ?? null,
                self::DEFAULT_MAX_ATTRIBUTE_BYTES,
            ),
        );
    }

    /**
     * @return array<string, int>
     */
    public function toArray(): array
    {
        return [
            'max_bytes' => $this->maximumBytes,
            'max_nodes' => $this->maximumNodes,
            'max_depth' => $this->maximumDepth,
            'max_text_bytes' => $this->maximumTextBytes,
            'max_attribute_bytes' => $this->maximumAttributeBytes,
        ];
    }

    private static function positiveInteger(mixed $value, int $default): int
    {
        return is_int($value) && $value > 0 ? $value : $default;
    }
}
