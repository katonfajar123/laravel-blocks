<?php

namespace KatonFajar\LaravelBlocks\Media;

use finfo;
use Illuminate\Contracts\Filesystem\Cloud;
use Illuminate\Contracts\Filesystem\Factory as FilesystemFactory;
use Illuminate\Http\UploadedFile;
use InvalidArgumentException;
use KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider;
use KatonFajar\LaravelBlocks\Media\Exceptions\MediaException;
use Throwable;

final readonly class LaravelFilesystemMediaProvider implements MediaProvider
{
    public function __construct(
        private FilesystemFactory $filesystems,
        private MediaConfiguration $configuration,
    ) {}

    public function name(): string
    {
        return 'laravel-filesystem';
    }

    public function capabilities(): MediaCapabilities
    {
        return new MediaCapabilities(
            browse: true,
            search: true,
            mimeFilter: true,
            upload: true,
            delete: true,
            maxUploadBytes: $this->configuration->maxUploadBytes,
            allowedMimeTypes: $this->configuration->allowedMimeTypes,
        );
    }

    public function browse(?MediaQuery $query = null): MediaPage
    {
        $query ??= new MediaQuery;
        $disk = $this->disk();

        try {
            $paths = $disk->files($this->configuration->directory);
        } catch (Throwable $exception) {
            throw $this->storageFailure('Media browsing failed.', previous: $exception);
        }

        $items = [];

        foreach ($paths as $path) {
            $id = $this->idFromPath($path);

            if ($id === null || $query->search !== null && stripos($id, $query->search) === false) {
                continue;
            }

            $item = $this->itemFromDisk($disk, $id);

            if ($item === null || $query->mimeTypes !== [] && ! in_array($item->mimeType, $query->mimeTypes, true)) {
                continue;
            }

            $items[] = $item;
        }

        usort(
            $items,
            static fn (MediaItem $left, MediaItem $right): int => [
                -($left->lastModified ?? 0),
                $left->id,
            ] <=> [
                -($right->lastModified ?? 0),
                $right->id,
            ],
        );

        $perPage = min($query->perPage, $this->configuration->maxItemsPerPage);
        $total = count($items);
        $offset = ($query->page - 1) * $perPage;

        return new MediaPage(
            items: array_slice($items, $offset, $perPage),
            page: $query->page,
            perPage: $perPage,
            total: $total,
        );
    }

    public function find(string $id): ?MediaItem
    {
        $this->assertValidId($id);

        return $this->itemFromDisk($this->disk(), $id);
    }

    public function upload(UploadedFile $file): MediaItem
    {
        [$mimeType, $bytes, $width, $height] = $this->inspectUpload($file);
        $id = bin2hex(random_bytes(20)).'.'.$this->configuration->extensionFor($mimeType);
        $disk = $this->disk();
        $stored = false;

        try {
            $stored = $disk->putFileAs(
                $this->configuration->directory,
                $file,
                $id,
                ['visibility' => $this->configuration->visibility],
            );

            if ($stored === false) {
                throw MediaException::because('storage_write_failed', 'The media provider could not store the upload.');
            }

            return $this->item(
                disk: $disk,
                id: $id,
                mimeType: $mimeType,
                bytes: $bytes,
                originalName: $this->originalName($file),
                width: $width,
                height: $height,
            );
        } catch (Throwable $exception) {
            if ($stored !== false) {
                try {
                    $disk->delete($this->path($id));
                } catch (Throwable) {
                    // Preserve the primary failure while making a best-effort rollback.
                }
            }

            if ($exception instanceof MediaException) {
                throw $exception;
            }

            throw $this->storageFailure('Media upload failed.', previous: $exception);
        }
    }

    public function delete(string $id): void
    {
        $this->assertValidId($id);
        $disk = $this->disk();
        $path = $this->path($id);

        try {
            if (! $disk->exists($path)) {
                throw MediaException::because('media_not_found', 'The requested media item does not exist.', $id);
            }

            if (! $disk->delete($path)) {
                throw MediaException::because('storage_delete_failed', 'The media provider could not delete the item.', $id);
            }
        } catch (Throwable $exception) {
            if ($exception instanceof MediaException) {
                throw $exception;
            }

            throw $this->storageFailure('Media deletion failed.', $id, $exception);
        }
    }

    /** @return array{string, int, ?int, ?int} */
    private function inspectUpload(UploadedFile $file): array
    {
        if (! $file->isValid()) {
            throw MediaException::because('invalid_upload', 'The uploaded file is not valid.');
        }

        $bytes = $file->getSize();

        if (! is_int($bytes) || $bytes < 1) {
            throw MediaException::because('empty_file', 'Empty media uploads are not accepted.');
        }

        if ($bytes > $this->configuration->maxUploadBytes) {
            throw MediaException::because('upload_too_large', 'The media upload exceeds the configured byte limit.');
        }

        try {
            $mimeType = $file->getMimeType();
        } catch (Throwable $exception) {
            throw MediaException::because('mime_detection_failed', 'The media upload type could not be detected.', previous: $exception);
        }

        if (! is_string($mimeType) || $mimeType === '') {
            throw MediaException::because('mime_detection_failed', 'The media upload type could not be detected.');
        }

        $sample = @file_get_contents($file->getPathname(), false, null, 0, 65_536);

        if (! is_string($sample) || $sample === '') {
            throw MediaException::because('mime_detection_failed', 'The media upload content could not be inspected.');
        }

        $mimeType = $this->normalizedMimeType(strtolower($mimeType), $sample);

        if ($mimeType === 'image/svg+xml') {
            throw MediaException::because('svg_not_allowed', 'SVG uploads require an application-defined sanitizing provider.');
        }

        if (! in_array($mimeType, $this->configuration->allowedMimeTypes, true)) {
            throw MediaException::because('unsupported_mime_type', 'The detected media upload type is not allowed.');
        }

        [$width, $height] = $this->imageDimensions($file, $mimeType);

        return [$mimeType, $bytes, $width, $height];
    }

    /** @return array{?int, ?int} */
    private function imageDimensions(UploadedFile $file, string $mimeType): array
    {
        if (! str_starts_with($mimeType, 'image/')) {
            return [null, null];
        }

        $dimensions = @getimagesize($file->getPathname());

        if (! is_array($dimensions)) {
            throw MediaException::because('invalid_image', 'The uploaded image content is invalid.');
        }

        $width = (int) $dimensions[0];
        $height = (int) $dimensions[1];

        if ($width < 1 || $height < 1 || $width > intdiv($this->configuration->maxImagePixels, $height)) {
            throw MediaException::because('image_too_large', 'The uploaded image exceeds the configured pixel limit.');
        }

        return [$width, $height];
    }

    private function itemFromDisk(Cloud $disk, string $id): ?MediaItem
    {
        $path = $this->path($id);

        try {
            if (! $disk->exists($path)) {
                return null;
            }

            $mimeType = $this->storedMimeType($disk, $path);

            if ($mimeType === 'image/svg+xml' || ! in_array($mimeType, $this->configuration->allowedMimeTypes, true)) {
                return null;
            }

            return $this->item(
                disk: $disk,
                id: $id,
                mimeType: $mimeType,
                bytes: $disk->size($path),
                lastModified: $disk->lastModified($path),
            );
        } catch (Throwable $exception) {
            if ($exception instanceof MediaException) {
                throw $exception;
            }

            throw $this->storageFailure('Media metadata could not be read.', $id, $exception);
        }
    }

    private function item(
        Cloud $disk,
        string $id,
        string $mimeType,
        int $bytes,
        ?string $originalName = null,
        ?int $width = null,
        ?int $height = null,
        ?int $lastModified = null,
    ): MediaItem {
        try {
            return new MediaItem(
                id: $id,
                provider: $this->name(),
                url: $disk->url($this->path($id)),
                mimeType: $mimeType,
                bytes: $bytes,
                originalName: $originalName,
                width: $width,
                height: $height,
                lastModified: $lastModified ?? $disk->lastModified($this->path($id)),
            );
        } catch (InvalidArgumentException $exception) {
            throw MediaException::because('invalid_media_metadata', 'The media provider returned invalid public metadata.', $id, $exception);
        }
    }

    private function storedMimeType(Cloud $disk, string $path): string
    {
        $stream = $disk->readStream($path);

        if (! is_resource($stream)) {
            throw MediaException::because('storage_read_failed', 'The media provider could not inspect stored content.');
        }

        try {
            $sample = stream_get_contents($stream, 65_536);
        } finally {
            fclose($stream);
        }

        if (! is_string($sample) || $sample === '') {
            throw MediaException::because('storage_read_failed', 'The media provider could not inspect stored content.');
        }

        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->buffer($sample);

        if (! is_string($mimeType) || $mimeType === '') {
            throw MediaException::because('mime_detection_failed', 'Stored media content type could not be detected.');
        }

        return $this->normalizedMimeType(strtolower($mimeType), $sample);
    }

    private function normalizedMimeType(string $mimeType, string $sample): string
    {
        $webVtt = $this->isWebVtt($sample);

        if ($mimeType === 'text/vtt') {
            return $webVtt ? 'text/vtt' : 'text/plain';
        }

        if ($webVtt && in_array($mimeType, ['application/octet-stream', 'text/plain'], true)) {
            return 'text/vtt';
        }

        return $mimeType;
    }

    private function isWebVtt(string $sample): bool
    {
        if (str_starts_with($sample, "\xEF\xBB\xBF")) {
            $sample = substr($sample, 3);
        }

        return preg_match('/\AWEBVTT(?:[ \t][^\r\n]*)?(?:\r\n|\n|\r)/', $sample) === 1;
    }

    private function originalName(UploadedFile $file): ?string
    {
        $name = basename(str_replace('\\', '/', $file->getClientOriginalName()));
        $name = preg_replace('/[\x00-\x1F\x7F]/', '', $name);

        if (! is_string($name) || $name === '') {
            return null;
        }

        if (! mb_check_encoding($name, 'UTF-8')) {
            return null;
        }

        return mb_substr($name, 0, 255);
    }

    private function disk(): Cloud
    {
        try {
            $disk = $this->filesystems->disk($this->configuration->disk);
        } catch (Throwable $exception) {
            throw $this->storageFailure('The configured media disk could not be resolved.', previous: $exception);
        }

        if (! $disk instanceof Cloud) {
            throw MediaException::because('unsupported_disk', 'The configured media disk does not provide public URLs.');
        }

        return $disk;
    }

    private function assertValidId(string $id): void
    {
        if (! preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/', $id) || $id === '.' || $id === '..') {
            throw MediaException::because('invalid_media_id', 'The media identifier is invalid.', $id);
        }
    }

    private function idFromPath(string $path): ?string
    {
        $prefix = $this->configuration->directory.'/';

        if (! str_starts_with($path, $prefix)) {
            return null;
        }

        $id = substr($path, strlen($prefix));

        try {
            $this->assertValidId($id);
        } catch (MediaException) {
            return null;
        }

        return $id;
    }

    private function path(string $id): string
    {
        return $this->configuration->directory.'/'.$id;
    }

    private function storageFailure(
        string $message,
        ?string $mediaId = null,
        ?Throwable $previous = null,
    ): MediaException {
        return MediaException::because('storage_failure', $message, $mediaId, $previous);
    }
}
