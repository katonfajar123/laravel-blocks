<?php

namespace KatonFajar\LaravelBlocks\Media;

use InvalidArgumentException;

final readonly class MediaQuery
{
    public ?string $search;

    /** @var list<string> */
    public array $mimeTypes;

    /**
     * @param  list<string>  $mimeTypes
     */
    public function __construct(
        ?string $search = null,
        array $mimeTypes = [],
        public int $page = 1,
        public int $perPage = 24,
    ) {
        $search = $search === null ? null : trim($search);
        $this->search = $search === '' ? null : $search;

        if ($this->search !== null
            && (! mb_check_encoding($this->search, 'UTF-8') || mb_strlen($this->search, 'UTF-8') > 200)) {
            throw new InvalidArgumentException('Media query search must be valid UTF-8 up to 200 characters.');
        }

        $normalizedMimeTypes = [];

        foreach ($mimeTypes as $mimeType) {
            $mimeType = strtolower(trim($mimeType));

            if (! preg_match('/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/', $mimeType)) {
                throw new InvalidArgumentException('Media query MIME types must use valid type/subtype values.');
            }

            if (! in_array($mimeType, $normalizedMimeTypes, true)) {
                $normalizedMimeTypes[] = $mimeType;
            }
        }

        $this->mimeTypes = $normalizedMimeTypes;

        if ($page < 1 || $perPage < 1) {
            throw new InvalidArgumentException('Media query page values must be positive integers.');
        }
    }
}
