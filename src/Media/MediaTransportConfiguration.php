<?php

namespace KatonFajar\LaravelBlocks\Media;

use Illuminate\Contracts\Config\Repository;
use InvalidArgumentException;

final readonly class MediaTransportConfiguration
{
    public string $prefix;

    /** @var list<string> */
    public array $middleware;

    /**
     * @param  array<array-key, mixed>  $middleware
     */
    public function __construct(
        public bool $enabled,
        string $prefix,
        public string $namePrefix,
        array $middleware,
        public string $browseAbility,
        public string $uploadAbility,
        public int $browseRequestsPerMinute,
        public int $uploadRequestsPerMinute,
    ) {
        $prefix = trim($prefix, '/');

        if ($prefix === '' || ! preg_match('/^[a-z0-9][a-z0-9\/_-]*$/i', $prefix)) {
            throw new InvalidArgumentException('Laravel Blocks media transport prefix is invalid.');
        }

        if (! preg_match('/^[a-z0-9][a-z0-9_.-]*\.$/i', $namePrefix)) {
            throw new InvalidArgumentException('Laravel Blocks media transport name prefix is invalid.');
        }

        if ($middleware === [] || ! array_is_list($middleware)) {
            throw new InvalidArgumentException('Laravel Blocks media transport middleware must be a non-empty list.');
        }

        $normalizedMiddleware = [];

        foreach ($middleware as $entry) {
            if (! is_string($entry) || trim($entry) === '') {
                throw new InvalidArgumentException('Laravel Blocks media transport middleware entries must be non-empty strings.');
            }

            $normalizedMiddleware[] = trim($entry);
        }

        foreach ([$browseAbility, $uploadAbility] as $ability) {
            if (trim($ability) === '' || mb_strlen($ability, 'UTF-8') > 200) {
                throw new InvalidArgumentException('Laravel Blocks media transport abilities must be non-empty bounded strings.');
            }
        }

        if ($browseRequestsPerMinute < 1 || $uploadRequestsPerMinute < 1) {
            throw new InvalidArgumentException('Laravel Blocks media transport rate limits must be positive integers.');
        }

        $this->prefix = $prefix;
        $this->middleware = array_values(array_unique($normalizedMiddleware));
    }

    public static function fromRepository(Repository $config): self
    {
        $transport = self::configurationArray(
            $config->get('laravel-blocks.media.transport', []),
            'configuration',
        );
        $abilities = self::configurationArray($transport['abilities'] ?? [], 'abilities');
        $middleware = $transport['middleware'] ?? ['web', 'auth'];

        if (! is_array($middleware)) {
            throw new InvalidArgumentException('Laravel Blocks media transport middleware must be an array.');
        }

        return new self(
            enabled: self::boolean($transport, 'enabled', true),
            prefix: self::string($transport, 'prefix', 'laravel-blocks/media'),
            namePrefix: self::string($transport, 'name_prefix', 'laravel-blocks.media.'),
            middleware: $middleware,
            browseAbility: self::string($abilities, 'browse', 'laravel-blocks.media.browse'),
            uploadAbility: self::string($abilities, 'upload', 'laravel-blocks.media.upload'),
            browseRequestsPerMinute: self::integer($transport, 'browse_requests_per_minute', 60),
            uploadRequestsPerMinute: self::integer($transport, 'upload_requests_per_minute', 10),
        );
    }

    /** @return array<string, mixed> */
    private static function configurationArray(mixed $value, string $label): array
    {
        if (! is_array($value)) {
            throw new InvalidArgumentException(sprintf('Laravel Blocks media transport %s must be an array.', $label));
        }

        $normalized = [];

        foreach ($value as $key => $entry) {
            if (! is_string($key)) {
                throw new InvalidArgumentException(sprintf('Laravel Blocks media transport %s must use named keys.', $label));
            }

            $normalized[$key] = $entry;
        }

        return $normalized;
    }

    public function ability(string $action): string
    {
        return match ($action) {
            'browse' => $this->browseAbility,
            'upload' => $this->uploadAbility,
            default => throw new InvalidArgumentException('Unknown Laravel Blocks media transport action.'),
        };
    }

    public function routeName(string $action): string
    {
        return $this->namePrefix.$action;
    }

    /** @param array<string, mixed> $values */
    private static function boolean(array $values, string $key, bool $default): bool
    {
        $value = $values[$key] ?? $default;

        if (! is_bool($value)) {
            throw new InvalidArgumentException(sprintf('Laravel Blocks media transport "%s" must be boolean.', $key));
        }

        return $value;
    }

    /** @param array<string, mixed> $values */
    private static function integer(array $values, string $key, int $default): int
    {
        $value = $values[$key] ?? $default;

        if (! is_int($value)) {
            throw new InvalidArgumentException(sprintf('Laravel Blocks media transport "%s" must be an integer.', $key));
        }

        return $value;
    }

    /** @param array<string, mixed> $values */
    private static function string(array $values, string $key, string $default): string
    {
        $value = $values[$key] ?? $default;

        if (! is_string($value)) {
            throw new InvalidArgumentException(sprintf('Laravel Blocks media transport "%s" must be a string.', $key));
        }

        return trim($value);
    }
}
