<?php

namespace KatonFajar\LaravelBlocks\Blocks;

use InvalidArgumentException;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

final readonly class BlockSchema
{
    /**
     * @param  array<string, AttributeRule>  $attributes
     * @param  list<string>|null  $allowedParents
     * @param  list<string>|null  $allowedChildren
     * @param  list<string>  $allowedMarks
     */
    public function __construct(
        public array $attributes = [],
        public ?array $allowedParents = null,
        public ?array $allowedChildren = [],
        public array $allowedMarks = [],
        public int $minimumChildren = 0,
        public ?int $maximumChildren = 0,
    ) {
        if ($this->minimumChildren < 0) {
            throw new InvalidArgumentException('Minimum children must be zero or greater.');
        }

        if ($this->maximumChildren !== null && $this->maximumChildren < $this->minimumChildren) {
            throw new InvalidArgumentException('Maximum children cannot be less than minimum children.');
        }

        foreach ($this->attributes as $name => $rule) {
            if (preg_match('/^[a-z][A-Za-z0-9]*$/D', $name) !== 1) {
                throw new InvalidArgumentException(sprintf('Attribute name "%s" must be lower-camel.', $name));
            }

            $this->guardAttributeRule($rule, $name);
        }

        $this->guardNames($this->allowedParents, 'parent');
        $this->guardNames($this->allowedChildren, 'child');
        $this->guardNames($this->allowedMarks, 'mark');
    }

    /**
     * @param  list<string>|null  $names
     */
    private function guardNames(?array $names, string $kind): void
    {
        if ($names === null) {
            return;
        }

        foreach ($names as $name) {
            if (preg_match('/^[a-z][A-Za-z0-9]*$/D', $name) !== 1) {
                throw new InvalidArgumentException(sprintf(
                    'Allowed %s name "%s" must be lower-camel.',
                    $kind,
                    $name,
                ));
            }
        }

        if (count($names) !== count(array_unique($names))) {
            throw new InvalidArgumentException(sprintf('Allowed %s names must be unique.', $kind));
        }
    }

    private function guardAttributeRule(mixed $rule, string $name): void
    {
        if (! $rule instanceof AttributeRule) {
            throw new InvalidArgumentException(sprintf('Attribute "%s" must use an AttributeRule.', $name));
        }
    }
}
