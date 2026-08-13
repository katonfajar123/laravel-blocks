<?php

namespace KatonFajar\LaravelBlocks\Media;

use InvalidArgumentException;
use JsonSerializable;

final readonly class MediaItem implements JsonSerializable
{
    public function __construct(
        public string $id,
        public string $provider,
        public string $url,
        public string $mimeType,
        public int $bytes,
        public ?string $originalName = null,
        public ?int $width = null,
        public ?int $height = null,
        public ?string $alt = null,
        public ?string $caption = null,
        public ?int $lastModified = null,
    ) {
        if (! self::validText($id, 1024) || ! preg_match('/^[a-z][a-z0-9-]{0,63}$/', $provider)) {
            throw new InvalidArgumentException('Media item identifiers must use valid stable values.');
        }

        if (! self::isHttpUrl($url)) {
            throw new InvalidArgumentException('Media item URLs must use HTTP or HTTPS.');
        }

        if (! preg_match('/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/', $mimeType)) {
            throw new InvalidArgumentException('Media item MIME types must use a valid type/subtype value.');
        }

        if ($bytes < 0 || $width !== null && $width < 1 || $height !== null && $height < 1) {
            throw new InvalidArgumentException('Media item size and dimensions must be valid positive values.');
        }

        if (($width === null) !== ($height === null)) {
            throw new InvalidArgumentException('Media item dimensions must provide both width and height.');
        }

        if ($lastModified !== null && $lastModified < 0) {
            throw new InvalidArgumentException('Media item modification time must not be negative.');
        }

        if ($originalName !== null && ! self::validText($originalName, 255)) {
            throw new InvalidArgumentException('Media item original names must be valid UTF-8 without control characters.');
        }

        foreach ([$alt, $caption] as $metadata) {
            if ($metadata !== null && ! self::validMetadataText($metadata, 10_000)) {
                throw new InvalidArgumentException('Media item text metadata must be valid UTF-8 without control characters.');
            }
        }
    }

    /**
     * @return array{
     *     id: string,
     *     provider: string,
     *     url: string,
     *     mimeType: string,
     *     bytes: int,
     *     originalName: ?string,
     *     width: ?int,
     *     height: ?int,
     *     alt: ?string,
     *     caption: ?string,
     *     lastModified: ?int
     * }
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'provider' => $this->provider,
            'url' => $this->url,
            'mimeType' => $this->mimeType,
            'bytes' => $this->bytes,
            'originalName' => $this->originalName,
            'width' => $this->width,
            'height' => $this->height,
            'alt' => $this->alt,
            'caption' => $this->caption,
            'lastModified' => $this->lastModified,
        ];
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    private static function isHttpUrl(string $url): bool
    {
        $scheme = parse_url($url, PHP_URL_SCHEME);

        return is_string($scheme)
            && in_array(strtolower($scheme), ['http', 'https'], true)
            && filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    private static function validText(string $value, int $maximumLength): bool
    {
        return trim($value) !== ''
            && mb_check_encoding($value, 'UTF-8')
            && mb_strlen($value, 'UTF-8') <= $maximumLength
            && ! preg_match('/[\x00-\x1F\x7F]/', $value);
    }

    private static function validMetadataText(string $value, int $maximumLength): bool
    {
        return mb_check_encoding($value, 'UTF-8')
            && mb_strlen($value, 'UTF-8') <= $maximumLength
            && ! preg_match('/[\x00-\x1F\x7F]/', $value);
    }
}
