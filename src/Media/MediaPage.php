<?php

namespace KatonFajar\LaravelBlocks\Media;

use InvalidArgumentException;
use JsonSerializable;

final readonly class MediaPage implements JsonSerializable
{
    /** @var list<MediaItem> */
    public array $items;

    /**
     * @param  array<array-key, mixed>  $items
     */
    public function __construct(
        array $items,
        public int $page,
        public int $perPage,
        public int $total,
    ) {
        if ($page < 1 || $perPage < 1 || $total < 0) {
            throw new InvalidArgumentException('Media page metadata is invalid.');
        }

        if (! array_is_list($items)) {
            throw new InvalidArgumentException('Media page items must be a list.');
        }

        foreach ($items as $item) {
            if (! $item instanceof MediaItem) {
                throw new InvalidArgumentException('Media pages may contain only MediaItem values.');
            }
        }

        $this->items = $items;
    }

    public function hasMore(): bool
    {
        return $this->page * $this->perPage < $this->total;
    }

    /**
     * @return array{
     *     items: list<array<string, mixed>>,
     *     page: int,
     *     perPage: int,
     *     total: int,
     *     hasMore: bool
     * }
     */
    public function toArray(): array
    {
        return [
            'items' => array_map(
                static fn (MediaItem $item): array => $item->toArray(),
                $this->items,
            ),
            'page' => $this->page,
            'perPage' => $this->perPage,
            'total' => $this->total,
            'hasMore' => $this->hasMore(),
        ];
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
