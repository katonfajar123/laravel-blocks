<?php

namespace KatonFajar\LaravelBlocks\Validation;

use InvalidArgumentException;

final readonly class AttributeRule
{
    /**
     * @param  list<string|int|float|bool>  $allowedValues
     * @param  array<string, AttributeRule>  $properties
     * @param  list<string>  $allowedSchemes
     */
    private function __construct(
        public AttributeType $type,
        public bool $required = false,
        public bool $nullable = false,
        public ?int $minimumLength = null,
        public ?int $maximumLength = null,
        public int|float|null $minimum = null,
        public int|float|null $maximum = null,
        public array $allowedValues = [],
        public array $properties = [],
        public ?self $additionalProperties = null,
        public ?self $items = null,
        public array $allowedSchemes = [],
    ) {
        $this->guardConstraints();
    }

    /**
     * @param  list<string>  $allowedValues
     */
    public static function string(
        bool $required = false,
        bool $nullable = false,
        ?int $minimumLength = null,
        ?int $maximumLength = null,
        array $allowedValues = [],
    ): self {
        return new self(
            AttributeType::STRING,
            $required,
            $nullable,
            $minimumLength,
            $maximumLength,
            allowedValues: $allowedValues,
        );
    }

    /**
     * @param  list<int>  $allowedValues
     */
    public static function integer(
        bool $required = false,
        bool $nullable = false,
        ?int $minimum = null,
        ?int $maximum = null,
        array $allowedValues = [],
    ): self {
        return new self(
            AttributeType::INTEGER,
            $required,
            $nullable,
            minimum: $minimum,
            maximum: $maximum,
            allowedValues: $allowedValues,
        );
    }

    /**
     * @param  list<int|float>  $allowedValues
     */
    public static function number(
        bool $required = false,
        bool $nullable = false,
        int|float|null $minimum = null,
        int|float|null $maximum = null,
        array $allowedValues = [],
    ): self {
        return new self(
            AttributeType::NUMBER,
            $required,
            $nullable,
            minimum: $minimum,
            maximum: $maximum,
            allowedValues: $allowedValues,
        );
    }

    public static function boolean(bool $required = false, bool $nullable = false): self
    {
        return new self(AttributeType::BOOLEAN, $required, $nullable);
    }

    /**
     * @param  list<string>  $allowedSchemes
     */
    public static function url(
        array $allowedSchemes = ['https', 'http'],
        bool $required = false,
        bool $nullable = false,
        ?int $maximumLength = 2048,
    ): self {
        return new self(
            AttributeType::URL,
            $required,
            $nullable,
            maximumLength: $maximumLength,
            allowedSchemes: $allowedSchemes,
        );
    }

    /**
     * @param  array<string, AttributeRule>  $properties
     */
    public static function object(
        array $properties = [],
        bool $required = false,
        bool $nullable = false,
        ?self $additionalProperties = null,
    ): self {
        return new self(
            AttributeType::OBJECT,
            $required,
            $nullable,
            properties: $properties,
            additionalProperties: $additionalProperties,
        );
    }

    public static function listOf(
        self $items,
        bool $required = false,
        bool $nullable = false,
        ?int $minimumItems = null,
        ?int $maximumItems = null,
    ): self {
        return new self(
            AttributeType::LIST,
            $required,
            $nullable,
            $minimumItems,
            $maximumItems,
            items: $items,
        );
    }

    private function guardConstraints(): void
    {
        if ($this->minimumLength !== null && $this->minimumLength < 0) {
            throw new InvalidArgumentException('Minimum length must be zero or greater.');
        }

        if ($this->maximumLength !== null && $this->maximumLength < 0) {
            throw new InvalidArgumentException('Maximum length must be zero or greater.');
        }

        if ($this->minimumLength !== null
            && $this->maximumLength !== null
            && $this->minimumLength > $this->maximumLength) {
            throw new InvalidArgumentException('Minimum length cannot exceed maximum length.');
        }

        if ($this->minimum !== null && $this->maximum !== null && $this->minimum > $this->maximum) {
            throw new InvalidArgumentException('Minimum value cannot exceed maximum value.');
        }

        if ($this->type === AttributeType::LIST && $this->items === null) {
            throw new InvalidArgumentException('List attribute rules require an item rule.');
        }

        if ($this->type === AttributeType::URL && $this->allowedSchemes === []) {
            throw new InvalidArgumentException('URL attribute rules require at least one allowed scheme.');
        }

        foreach ($this->properties as $name => $rule) {
            if (preg_match('/^[a-z][A-Za-z0-9]*$/D', $name) !== 1) {
                throw new InvalidArgumentException(sprintf('Attribute name "%s" must be lower-camel.', $name));
            }

            $this->guardPropertyRule($rule, $name);
        }

        foreach ($this->allowedSchemes as $scheme) {
            if (preg_match('/^[a-z][a-z0-9+.-]*$/D', $scheme) !== 1) {
                throw new InvalidArgumentException(sprintf('URL scheme "%s" is invalid.', $scheme));
            }
        }
    }

    private function guardPropertyRule(mixed $rule, string $name): void
    {
        if (! $rule instanceof self) {
            throw new InvalidArgumentException(sprintf('Attribute "%s" must use an AttributeRule.', $name));
        }
    }
}
