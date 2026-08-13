<?php

namespace KatonFajar\LaravelBlocks\Media\Contracts;

use Illuminate\Http\UploadedFile;
use KatonFajar\LaravelBlocks\Media\MediaCapabilities;
use KatonFajar\LaravelBlocks\Media\MediaItem;
use KatonFajar\LaravelBlocks\Media\MediaPage;
use KatonFajar\LaravelBlocks\Media\MediaQuery;

interface MediaProvider
{
    public function name(): string;

    public function capabilities(): MediaCapabilities;

    public function browse(?MediaQuery $query = null): MediaPage;

    public function find(string $id): ?MediaItem;

    public function upload(UploadedFile $file): MediaItem;

    public function delete(string $id): void;
}
