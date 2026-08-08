<?php

namespace KatonFajar\LaravelBlocks\Validation;

use InvalidArgumentException;

final readonly class MarkSchema
{
    /**
     * @param  array<string, AttributeRule>  $attributes
     */
    public function __construct(
        public string $name,
        public array $attributes = [],
    ) {
        if (preg_match('/^[a-z][A-Za-z0-9]*$/D', $this->name) !== 1) {
            throw new InvalidArgumentException(sprintf(
                'Mark name "%s" must be a non-empty lower-camel identifier.',
                $this->name,
            ));
        }

        foreach ($this->attributes as $name => $rule) {
            if (preg_match('/^[a-z][A-Za-z0-9]*$/D', $name) !== 1) {
                throw new InvalidArgumentException(sprintf('Mark attribute "%s" must be lower-camel.', $name));
            }

            $this->guardAttributeRule($rule, $name);
        }
    }

    private function guardAttributeRule(mixed $rule, string $name): void
    {
        if (! $rule instanceof AttributeRule) {
            throw new InvalidArgumentException(sprintf(
                'Mark attribute "%s" must use an AttributeRule.',
                $name,
            ));
        }
    }
}
