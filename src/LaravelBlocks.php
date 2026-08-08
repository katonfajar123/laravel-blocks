<?php

namespace KatonFajar\LaravelBlocks;

use Illuminate\Contracts\Config\Repository;

final readonly class LaravelBlocks
{
    public function __construct(private Repository $config) {}

    /**
     * @return array<string, mixed>
     */
    public function configuration(): array
    {
        $configuration = $this->config->get('laravel-blocks', []);

        if (! is_array($configuration)) {
            return [];
        }

        $normalized = [];

        foreach ($configuration as $key => $value) {
            if (is_string($key)) {
                $normalized[$key] = $value;
            }
        }

        return $normalized;
    }
}
