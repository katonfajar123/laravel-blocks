<?php

namespace KatonFajar\LaravelBlocks\Media;

use InvalidArgumentException;
use JsonSerializable;

final readonly class MediaCapabilities implements JsonSerializable
{
    /** @var list<string> */
    public array $allowedMimeTypes;

    /**
     * @param  list<string>  $allowedMimeTypes
     */
    public function __construct(
        public bool $browse,
        public bool $search,
        public bool $mimeFilter,
        public bool $upload,
        public bool $delete,
        public int $maxUploadBytes,
        array $allowedMimeTypes,
    ) {
        if ($maxUploadBytes < 0) {
            throw new InvalidArgumentException('Media capabilities contain invalid upload constraints.');
        }

        $normalizedMimeTypes = [];

        foreach ($allowedMimeTypes as $mimeType) {
            $mimeType = strtolower(trim($mimeType));

            if (! preg_match('/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/', $mimeType)) {
                throw new InvalidArgumentException('Media capabilities contain an invalid MIME type.');
            }

            if (! in_array($mimeType, $normalizedMimeTypes, true)) {
                $normalizedMimeTypes[] = $mimeType;
            }
        }

        $this->allowedMimeTypes = $normalizedMimeTypes;
    }

    /**
     * @return array{
     *     browse: bool,
     *     search: bool,
     *     mimeFilter: bool,
     *     upload: bool,
     *     delete: bool,
     *     maxUploadBytes: int,
     *     allowedMimeTypes: list<string>
     * }
     */
    public function toArray(): array
    {
        return [
            'browse' => $this->browse,
            'search' => $this->search,
            'mimeFilter' => $this->mimeFilter,
            'upload' => $this->upload,
            'delete' => $this->delete,
            'maxUploadBytes' => $this->maxUploadBytes,
            'allowedMimeTypes' => $this->allowedMimeTypes,
        ];
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
