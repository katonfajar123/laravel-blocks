<?php

namespace Tests\Fixtures\Media;

use Illuminate\Http\UploadedFile;
use KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider;
use KatonFajar\LaravelBlocks\Media\Exceptions\MediaException;
use KatonFajar\LaravelBlocks\Media\MediaCapabilities;
use KatonFajar\LaravelBlocks\Media\MediaItem;
use KatonFajar\LaravelBlocks\Media\MediaPage;
use KatonFajar\LaravelBlocks\Media\MediaQuery;

final class TransportMediaProvider implements MediaProvider
{
    /** @var list<MediaQuery> */
    public array $browseQueries = [];

    /** @var list<string> */
    public array $uploads = [];

    public function name(): string
    {
        return 'transport-fixture';
    }

    public function capabilities(): MediaCapabilities
    {
        return new MediaCapabilities(true, true, true, true, false, 1_024_000, ['image/png']);
    }

    public function browse(?MediaQuery $query = null): MediaPage
    {
        $query ??= new MediaQuery;
        $this->browseQueries[] = $query;
        $items = $query->search === 'missing' ? [] : [$this->item()];

        return new MediaPage($items, $query->page, $query->perPage, count($items));
    }

    public function find(string $id): ?MediaItem
    {
        return $id === 'fixture.png' ? $this->item() : null;
    }

    public function upload(UploadedFile $file): MediaItem
    {
        $this->uploads[] = $file->getClientOriginalName();

        if ($file->getClientOriginalName() === 'failure.png') {
            throw MediaException::because(
                'storage_failure',
                'Secret storage failure at C:\\private\\tenant-42.',
            );
        }

        return $this->item('uploaded.png', 'Uploaded image');
    }

    public function delete(string $id): void {}

    private function item(string $id = 'fixture.png', string $alt = 'Fixture image'): MediaItem
    {
        return new MediaItem(
            id: $id,
            provider: $this->name(),
            url: 'https://media.example.test/'.$id,
            mimeType: 'image/png',
            bytes: 128,
            originalName: $id,
            width: 20,
            height: 10,
            alt: $alt,
            lastModified: 123,
        );
    }
}
