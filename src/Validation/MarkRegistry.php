<?php

namespace KatonFajar\LaravelBlocks\Validation;

use KatonFajar\LaravelBlocks\Validation\Exceptions\DuplicateMarkException;
use KatonFajar\LaravelBlocks\Validation\Exceptions\UnknownMarkException;

final class MarkRegistry
{
    /** @var array<string, MarkSchema> */
    private array $marks = [];

    /**
     * @param  MarkSchema|array<array-key, MarkSchema>  $marks
     */
    public function register(MarkSchema|array $marks): void
    {
        $definitions = is_array($marks) ? array_values($marks) : [$marks];
        $pending = [];

        foreach ($definitions as $mark) {
            if (array_key_exists($mark->name, $this->marks)
                || array_key_exists($mark->name, $pending)) {
                throw new DuplicateMarkException($mark->name);
            }

            $pending[$mark->name] = $mark;
        }

        foreach ($pending as $name => $mark) {
            $this->marks[$name] = $mark;
        }
    }

    public function get(string $name): MarkSchema
    {
        if (! array_key_exists($name, $this->marks)) {
            throw new UnknownMarkException($name);
        }

        return $this->marks[$name];
    }

    public function has(string $name): bool
    {
        return array_key_exists($name, $this->marks);
    }

    /**
     * @return array<string, MarkSchema>
     */
    public function all(): array
    {
        return $this->marks;
    }
}
