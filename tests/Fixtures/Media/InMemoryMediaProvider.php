<?php

namespace Tests\Fixtures\Media;

use Illuminate\Http\UploadedFile;
use KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider;
use KatonFajar\LaravelBlocks\Media\MediaCapabilities;
use KatonFajar\LaravelBlocks\Media\MediaItem;
use KatonFajar\LaravelBlocks\Media\MediaPage;
use KatonFajar\LaravelBlocks\Media\MediaQuery;
use LogicException;

final class InMemoryMediaProvider implements MediaProvider
{
    public function name(): string
    {
        return 'test-memory';
    }

    public function capabilities(): MediaCapabilities
    {
        return new MediaCapabilities(false, false, false, false, false, 1, []);
    }

    public function browse(?MediaQuery $query = null): MediaPage
    {
        return new MediaPage([], 1, 1, 0);
    }

    public function find(string $id): ?MediaItem
    {
        return null;
    }

    public function upload(UploadedFile $file): MediaItem
    {
        throw new LogicException('Uploads are disabled in this test provider.');
    }

    public function delete(string $id): void
    {
        throw new LogicException('Deletion is disabled in this test provider.');
    }
}
