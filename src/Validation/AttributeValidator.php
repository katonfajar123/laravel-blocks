<?php

namespace KatonFajar\LaravelBlocks\Validation;

use JsonException;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

final class AttributeValidator
{
    /**
     * @param  array<string, AttributeRule>  $rules
     */
    public function validate(
        mixed $attributes,
        array $rules,
        string $path,
        int $maximumBytes,
    ): void {
        if (! $this->isObject($attributes)) {
            throw DocumentValidationException::at(
                'invalid_attributes',
                $path,
                'Attributes must be an object.',
            );
        }

        /** @var array<string, mixed> $attributes */
        $this->assertSerializedSize($attributes, $path, $maximumBytes);
        $this->validateObject($attributes, $rules, null, $path);
    }

    /**
     * @param  array<string, mixed>  $values
     * @param  array<string, AttributeRule>  $rules
     */
    private function validateObject(
        array $values,
        array $rules,
        ?AttributeRule $additionalProperties,
        string $path,
    ): void {
        foreach ($rules as $name => $rule) {
            if ($rule->required && ! array_key_exists($name, $values)) {
                throw DocumentValidationException::at(
                    'missing_attribute',
                    $path.'.'.$name,
                    'A required attribute is missing.',
                );
            }
        }

        foreach ($values as $name => $value) {
            $rule = $rules[$name] ?? $additionalProperties;

            if ($rule === null) {
                throw DocumentValidationException::at(
                    'undeclared_attribute',
                    $path.'.'.$name,
                    'An undeclared attribute is not allowed.',
                );
            }

            $this->validateValue($value, $rule, $path.'.'.$name);
        }
    }

    private function validateValue(mixed $value, AttributeRule $rule, string $path): void
    {
        if ($value === null) {
            if ($rule->nullable) {
                return;
            }

            throw DocumentValidationException::at(
                'invalid_attribute_type',
                $path,
                'Attribute value has an invalid type.',
            );
        }

        match ($rule->type) {
            AttributeType::STRING => $this->validateString($value, $rule, $path),
            AttributeType::INTEGER => $this->validateInteger($value, $rule, $path),
            AttributeType::NUMBER => $this->validateNumber($value, $rule, $path),
            AttributeType::BOOLEAN => $this->validateBoolean($value, $path),
            AttributeType::URL => $this->validateUrl($value, $rule, $path),
            AttributeType::OBJECT => $this->validateNestedObject($value, $rule, $path),
            AttributeType::LIST => $this->validateList($value, $rule, $path),
        };

        if ($rule->allowedValues !== [] && ! in_array($value, $rule->allowedValues, true)) {
            throw DocumentValidationException::at(
                'attribute_value_not_allowed',
                $path,
                'Attribute value is not allow-listed.',
            );
        }
    }

    private function validateString(mixed $value, AttributeRule $rule, string $path): void
    {
        if (! is_string($value)) {
            $this->invalidType($path);
        }

        $this->validateLength(strlen($value), $rule, $path);
    }

    private function validateInteger(mixed $value, AttributeRule $rule, string $path): void
    {
        if (! is_int($value)) {
            $this->invalidType($path);
        }

        $this->validateRange($value, $rule, $path);
    }

    private function validateNumber(mixed $value, AttributeRule $rule, string $path): void
    {
        if (! is_int($value) && ! is_float($value)) {
            $this->invalidType($path);
        }

        $this->validateRange($value, $rule, $path);
    }

    private function validateBoolean(mixed $value, string $path): void
    {
        if (! is_bool($value)) {
            $this->invalidType($path);
        }
    }

    private function validateUrl(mixed $value, AttributeRule $rule, string $path): void
    {
        if (! is_string($value)) {
            $this->invalidType($path);
        }

        $this->validateLength(strlen($value), $rule, $path);
        $scheme = parse_url($value, PHP_URL_SCHEME);

        if (! is_string($scheme) || ! in_array(strtolower($scheme), $rule->allowedSchemes, true)) {
            throw DocumentValidationException::at(
                'unsafe_url_scheme',
                $path,
                'URL scheme is not allowed.',
            );
        }

        if (in_array(strtolower($scheme), ['http', 'https'], true)
            && filter_var($value, FILTER_VALIDATE_URL) === false) {
            throw DocumentValidationException::at(
                'invalid_url',
                $path,
                'URL value is invalid.',
            );
        }
    }

    private function validateNestedObject(mixed $value, AttributeRule $rule, string $path): void
    {
        if (! $this->isObject($value)) {
            $this->invalidType($path);
        }

        /** @var array<string, mixed> $value */
        $this->validateObject($value, $rule->properties, $rule->additionalProperties, $path);
    }

    private function validateList(mixed $value, AttributeRule $rule, string $path): void
    {
        if (! is_array($value) || ! array_is_list($value)) {
            $this->invalidType($path);
        }

        $this->validateLength(count($value), $rule, $path);
        $items = $rule->items;

        if ($items === null) {
            throw new \LogicException('List attribute rule is missing its item rule.');
        }

        foreach ($value as $index => $item) {
            $this->validateValue($item, $items, sprintf('%s[%d]', $path, $index));
        }
    }

    private function validateLength(int $length, AttributeRule $rule, string $path): void
    {
        if ($rule->minimumLength !== null && $length < $rule->minimumLength) {
            throw DocumentValidationException::at(
                'attribute_too_short',
                $path,
                'Attribute value is shorter than allowed.',
            );
        }

        if ($rule->maximumLength !== null && $length > $rule->maximumLength) {
            throw DocumentValidationException::at(
                'attribute_too_long',
                $path,
                'Attribute value is longer than allowed.',
            );
        }
    }

    private function validateRange(int|float $value, AttributeRule $rule, string $path): void
    {
        if ($rule->minimum !== null && $value < $rule->minimum) {
            throw DocumentValidationException::at(
                'attribute_below_minimum',
                $path,
                'Attribute value is below the allowed minimum.',
            );
        }

        if ($rule->maximum !== null && $value > $rule->maximum) {
            throw DocumentValidationException::at(
                'attribute_above_maximum',
                $path,
                'Attribute value exceeds the allowed maximum.',
            );
        }
    }

    private function invalidType(string $path): never
    {
        throw DocumentValidationException::at(
            'invalid_attribute_type',
            $path,
            'Attribute value has an invalid type.',
        );
    }

    private function isObject(mixed $value): bool
    {
        return is_array($value) && ($value === [] || ! array_is_list($value));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function assertSerializedSize(array $attributes, string $path, int $maximumBytes): void
    {
        try {
            $encoded = json_encode($attributes, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw DocumentValidationException::at(
                'invalid_attributes',
                $path,
                'Attributes must be JSON-serializable.',
            );
        }

        if (strlen($encoded) > $maximumBytes) {
            throw DocumentValidationException::at(
                'maximum_attribute_bytes_exceeded',
                $path,
                'Attributes exceed the configured byte limit.',
            );
        }
    }
}
