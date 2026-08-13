<?php

namespace KatonFajar\LaravelBlocks\Media;

use Illuminate\Contracts\Config\Repository;
use InvalidArgumentException;

final readonly class MediaConfiguration
{
    /**
     * @param  list<string>  $allowedMimeTypes
     * @param  array<string, string>  $extensions
     */
    private function __construct(
        public string $disk,
        public string $directory,
        public string $visibility,
        public int $maxUploadBytes,
        public int $maxImagePixels,
        public int $maxItemsPerPage,
        public array $allowedMimeTypes,
        public array $extensions,
    ) {}

    public static function fromRepository(Repository $config): self
    {
        $media = $config->get('laravel-blocks.media', []);

        if (! is_array($media)) {
            throw new InvalidArgumentException('Laravel Blocks media configuration must be an array.');
        }

        $normalized = [];

        foreach ($media as $key => $value) {
            if (is_string($key)) {
                $normalized[$key] = $value;
            }
        }

        $media = $normalized;

        $disk = self::requiredString($media, 'disk');
        $directory = self::directory(self::requiredString($media, 'directory'));
        $visibility = self::requiredString($media, 'visibility');

        if ($visibility !== 'public') {
            throw new InvalidArgumentException('The default media provider currently supports only public visibility.');
        }

        $maxUploadBytes = self::positiveInteger($media, 'max_upload_bytes');
        $maxImagePixels = self::positiveInteger($media, 'max_image_pixels');
        $maxItemsPerPage = self::positiveInteger($media, 'max_items_per_page');
        $allowedMimeTypes = self::mimeTypes($media['allowed_mime_types'] ?? null);
        $extensions = self::extensions($media['extensions'] ?? null, $allowedMimeTypes);

        return new self(
            disk: $disk,
            directory: $directory,
            visibility: $visibility,
            maxUploadBytes: $maxUploadBytes,
            maxImagePixels: $maxImagePixels,
            maxItemsPerPage: $maxItemsPerPage,
            allowedMimeTypes: $allowedMimeTypes,
            extensions: $extensions,
        );
    }

    public function extensionFor(string $mimeType): string
    {
        if (! array_key_exists($mimeType, $this->extensions)) {
            throw new InvalidArgumentException(sprintf('No trusted extension is configured for MIME type "%s".', $mimeType));
        }

        return $this->extensions[$mimeType];
    }

    /** @param array<string, mixed> $configuration */
    private static function requiredString(array $configuration, string $key): string
    {
        $value = $configuration[$key] ?? null;

        if (! is_string($value) || trim($value) === '' || preg_match('/[\x00-\x1F\x7F]/', $value)) {
            throw new InvalidArgumentException(sprintf('Laravel Blocks media "%s" must be a non-empty string.', $key));
        }

        return trim($value);
    }

    private static function directory(string $directory): string
    {
        if (str_contains($directory, '\\') || str_starts_with($directory, '/') || str_ends_with($directory, '/')) {
            throw new InvalidArgumentException('Laravel Blocks media directory must be a relative normalized path.');
        }

        $segments = explode('/', $directory);

        foreach ($segments as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..' || ! preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $segment)) {
                throw new InvalidArgumentException('Laravel Blocks media directory contains an unsafe path segment.');
            }
        }

        return $directory;
    }

    /** @param array<string, mixed> $configuration */
    private static function positiveInteger(array $configuration, string $key): int
    {
        $value = $configuration[$key] ?? null;

        if (! is_int($value) || $value < 1) {
            throw new InvalidArgumentException(sprintf('Laravel Blocks media "%s" must be a positive integer.', $key));
        }

        return $value;
    }

    /** @return list<string> */
    private static function mimeTypes(mixed $value): array
    {
        if (! is_array($value) || $value === []) {
            throw new InvalidArgumentException('Laravel Blocks media allowed MIME types must be a non-empty list.');
        }

        $mimeTypes = [];

        foreach ($value as $mimeType) {
            if (! is_string($mimeType)) {
                throw new InvalidArgumentException('Laravel Blocks media MIME types must be strings.');
            }

            $mimeType = strtolower(trim($mimeType));

            if (! preg_match('/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/', $mimeType)) {
                throw new InvalidArgumentException('Laravel Blocks media contains an invalid MIME type.');
            }

            if ($mimeType === 'image/svg+xml') {
                throw new InvalidArgumentException('The default media provider does not accept SVG uploads.');
            }

            if (in_array($mimeType, $mimeTypes, true)) {
                throw new InvalidArgumentException('Laravel Blocks media MIME types must not contain duplicates.');
            }

            $mimeTypes[] = $mimeType;
        }

        return $mimeTypes;
    }

    /**
     * @param  list<string>  $allowedMimeTypes
     * @return array<string, string>
     */
    private static function extensions(mixed $value, array $allowedMimeTypes): array
    {
        if (! is_array($value)) {
            throw new InvalidArgumentException('Laravel Blocks media extensions must be an associative array.');
        }

        $extensions = [];

        foreach ($allowedMimeTypes as $mimeType) {
            $extension = $value[$mimeType] ?? null;

            if (! is_string($extension) || ! preg_match('/^[a-z0-9]{1,10}$/', $extension)) {
                throw new InvalidArgumentException(sprintf('Laravel Blocks media MIME type "%s" needs a trusted extension.', $mimeType));
            }

            $extensions[$mimeType] = $extension;
        }

        return $extensions;
    }
}
