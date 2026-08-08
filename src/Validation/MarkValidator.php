<?php

namespace KatonFajar\LaravelBlocks\Validation;

use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

final readonly class MarkValidator
{
    public function __construct(
        private MarkRegistry $marks,
        private AttributeValidator $attributes,
    ) {}

    /**
     * @param  list<string>  $allowedMarks
     */
    public function validate(
        mixed $marks,
        array $allowedMarks,
        string $path,
        int $maximumAttributeBytes,
    ): void {
        if (! is_array($marks) || ! array_is_list($marks)) {
            throw DocumentValidationException::at(
                'invalid_marks',
                $path,
                'Text marks must be an ordered array.',
            );
        }

        $seen = [];

        foreach ($marks as $index => $mark) {
            $markPath = sprintf('%s[%d]', $path, $index);

            if (! is_array($mark) || $mark === [] || array_is_list($mark)) {
                throw DocumentValidationException::at(
                    'invalid_mark',
                    $markPath,
                    'Each mark must be an object.',
                );
            }

            foreach (array_keys($mark) as $key) {
                if (! in_array($key, ['type', 'attrs'], true)) {
                    throw DocumentValidationException::at(
                        'unexpected_mark_key',
                        $markPath.'.'.$key,
                        'Mark contains an unsupported key.',
                    );
                }
            }

            $name = $mark['type'] ?? null;

            if (! is_string($name) || preg_match('/^[a-z][A-Za-z0-9]*$/D', $name) !== 1) {
                throw DocumentValidationException::at(
                    'invalid_mark_type',
                    $markPath.'.type',
                    'Mark type must be a stable lower-camel identifier.',
                );
            }

            if (array_key_exists($name, $seen)) {
                throw DocumentValidationException::at(
                    'duplicate_mark',
                    $markPath.'.type',
                    'A text node cannot contain the same mark twice.',
                );
            }

            $seen[$name] = true;

            if (! $this->marks->has($name)) {
                throw DocumentValidationException::at(
                    'unknown_mark',
                    $markPath.'.type',
                    'Mark type is not registered.',
                );
            }

            if (! in_array($name, $allowedMarks, true)) {
                throw DocumentValidationException::at(
                    'mark_not_allowed',
                    $markPath.'.type',
                    'Mark is not allowed by the parent block.',
                );
            }

            $this->attributes->validate(
                $mark['attrs'] ?? [],
                $this->marks->get($name)->attributes,
                $markPath.'.attrs',
                $maximumAttributeBytes,
            );
        }
    }
}
