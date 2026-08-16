<?php

use Illuminate\Contracts\Filesystem\Cloud;
use Illuminate\Contracts\Filesystem\Factory as FilesystemFactory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\LaravelBlocks;
use KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider;
use KatonFajar\LaravelBlocks\Media\Exceptions\MediaException;
use KatonFajar\LaravelBlocks\Media\LaravelFilesystemMediaProvider;
use KatonFajar\LaravelBlocks\Media\MediaConfiguration;
use KatonFajar\LaravelBlocks\Media\MediaQuery;
use Tests\Fixtures\Media\InMemoryMediaProvider;

it('resolves the configured provider as a shared replaceable service', function (): void {
    expect($this->app->make(MediaProvider::class))
        ->toBeInstanceOf(LaravelFilesystemMediaProvider::class)
        ->toBe($this->app->make(MediaProvider::class))
        ->toBe(LaravelBlocksFacade::media());

    LaravelBlocksFacade::clearResolvedInstance(LaravelBlocks::class);
    $this->app->forgetInstance(LaravelBlocks::class);
    $this->app->forgetInstance(MediaProvider::class);
    $this->app->make('config')->set('laravel-blocks.media.provider', InMemoryMediaProvider::class);

    expect($this->app->make(MediaProvider::class))
        ->toBeInstanceOf(InMemoryMediaProvider::class)
        ->and($this->app->make(LaravelBlocks::class)->media()->name())
        ->toBe('test-memory');
});

it('rejects configured classes that do not implement the provider contract', function (): void {
    $this->app->make('config')->set('laravel-blocks.media.provider', stdClass::class);
    $this->app->forgetInstance(MediaProvider::class);

    expect(fn () => $this->app->make(MediaProvider::class))
        ->toThrow(InvalidArgumentException::class);
});

it('uploads content-inspected media with a generated confined identifier', function (): void {
    $provider = configuredFilesystemProvider();
    $upload = testUpload('misleading-name.jpg', testPng());

    try {
        $item = $provider->upload($upload);
    } finally {
        @unlink($upload->getPathname());
    }

    expect($item->provider)
        ->toBe('laravel-filesystem')
        ->and($item->id)
        ->toMatch('/^[a-f0-9]{40}\.png$/')
        ->and($item->url)
        ->toBe('https://media.example.test/laravel-blocks/'.$item->id)
        ->and($item->mimeType)
        ->toBe('image/png')
        ->and($item->originalName)
        ->toBe('misleading-name.jpg')
        ->and([$item->width, $item->height])
        ->toBe([1, 1])
        ->and(json_encode($item, JSON_THROW_ON_ERROR))
        ->not->toContain($upload->getPathname())
        ->and(Storage::disk('laravel-blocks-media')->exists('laravel-blocks/'.$item->id))
        ->toBeTrue()
        ->and($provider->find($item->id)?->toArray())
        ->toMatchArray([
            'id' => $item->id,
            'mimeType' => 'image/png',
            'originalName' => null,
        ])
        ->and($provider->capabilities()->toArray())
        ->toMatchArray([
            'browse' => true,
            'search' => true,
            'mimeFilter' => true,
            'upload' => true,
            'delete' => true,
            'maxUploadBytes' => 10_485_760,
        ]);
});

it('stores genuine WebVTT captions with exact MIME filtering', function (): void {
    $provider = configuredFilesystemProvider();
    $upload = testUpload('renamed-captions.txt', testWebVtt());

    try {
        $item = $provider->upload($upload);
    } finally {
        @unlink($upload->getPathname());
    }

    $captions = $provider->browse(new MediaQuery(mimeTypes: ['text/vtt']));
    $videos = $provider->browse(new MediaQuery(mimeTypes: ['video/mp4']));

    expect($item->id)
        ->toMatch('/^[a-f0-9]{40}\.vtt$/')
        ->and($item->mimeType)
        ->toBe('text/vtt')
        ->and($item->originalName)
        ->toBe('renamed-captions.txt')
        ->and([$item->width, $item->height])
        ->toBe([null, null])
        ->and($provider->find($item->id)?->mimeType)
        ->toBe('text/vtt')
        ->and($provider->capabilities()->allowedMimeTypes)
        ->toContain('text/vtt')
        ->and($captions->total)
        ->toBe(1)
        ->and($captions->items[0]->id)
        ->toBe($item->id)
        ->and($videos->total)
        ->toBe(0);
});

it('browses searches filters and paginates deterministically before explicit deletion', function (): void {
    $provider = configuredFilesystemProvider(['max_items_per_page' => 1]);
    $firstUpload = testUpload('first.png', testPng());
    $secondUpload = testUpload('second.png', testPng());

    try {
        $first = $provider->upload($firstUpload);
        $second = $provider->upload($secondUpload);
    } finally {
        @unlink($firstUpload->getPathname());
        @unlink($secondUpload->getPathname());
    }

    $page = $provider->browse(new MediaQuery(perPage: 20));
    $search = $provider->browse(new MediaQuery(search: substr($first->id, 0, 12)));
    $filtered = $provider->browse(new MediaQuery(mimeTypes: ['application/pdf']));

    expect($page->perPage)
        ->toBe(1)
        ->and($page->total)
        ->toBe(2)
        ->and($page->hasMore())
        ->toBeTrue()
        ->and($search->total)
        ->toBe(1)
        ->and($search->items[0]->id)
        ->toBe($first->id)
        ->and($filtered->total)
        ->toBe(0);

    $provider->delete($second->id);

    expect($provider->find($second->id))
        ->toBeNull()
        ->and(Storage::disk('laravel-blocks-media')->exists('laravel-blocks/'.$first->id))
        ->toBeTrue();
});

it('rejects unsafe uploads with machine-readable reasons', function (string $name, string $contents, array $overrides, string $reason): void {
    $provider = configuredFilesystemProvider($overrides);
    $upload = testUpload($name, $contents);

    try {
        $provider->upload($upload);
    } catch (MediaException $exception) {
        expect($exception->reason())->toBe($reason);

        return;
    } finally {
        @unlink($upload->getPathname());
    }

    throw new RuntimeException('Expected the unsafe media upload to fail.');
})->with([
    'empty upload' => ['empty.jpg', '', [], 'empty_file'],
    'spoofed executable as JPEG' => ['shell.jpg', '<?php echo "unsafe";', [], 'unsupported_mime_type'],
    'plain text renamed as WebVTT' => ['captions.vtt', 'This is not a WebVTT captions file.', [], 'unsupported_mime_type'],
    'malformed WebVTT signature' => ['captions.vtt', 'WEBVTT without a line ending', [], 'unsupported_mime_type'],
    'SVG without sanitizer' => ['vector.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>', [], 'svg_not_allowed'],
    'oversized content' => ['large.png', testPng(), ['max_upload_bytes' => 10], 'upload_too_large'],
    'excessive image dimensions' => ['dimensions.png', testPngDimensions(2, 2), ['max_image_pixels' => 1], 'image_too_large'],
]);

it('confines identifiers and reports deterministic not-found deletion', function (): void {
    $provider = configuredFilesystemProvider();

    foreach (['../secret.txt', '..\\secret.txt', 'nested/file.png', '.'] as $id) {
        try {
            $provider->find($id);
            throw new RuntimeException('Expected unsafe media identifier to fail.');
        } catch (MediaException $exception) {
            expect($exception->reason())->toBe('invalid_media_id');
        }
    }

    try {
        $provider->delete('missing.png');
    } catch (MediaException $exception) {
        expect($exception->reason())
            ->toBe('media_not_found')
            ->and($exception->mediaId())
            ->toBe('missing.png');

        return;
    }

    throw new RuntimeException('Expected missing media deletion to fail.');
});

it('rolls back a stored upload when public metadata resolution fails', function (): void {
    $disk = Mockery::mock(Cloud::class);
    $disk->shouldReceive('putFileAs')->once()->andReturn('stored');
    $disk->shouldReceive('url')->once()->andThrow(new RuntimeException('URL unavailable'));
    $disk->shouldReceive('delete')->once()->with(Mockery::pattern('/^laravel-blocks\/[a-f0-9]{40}\.png$/'))->andReturnTrue();

    $filesystems = Mockery::mock(FilesystemFactory::class);
    $filesystems->shouldReceive('disk')->once()->with('public')->andReturn($disk);
    $provider = new LaravelFilesystemMediaProvider(
        $filesystems,
        MediaConfiguration::fromRepository($this->app->make('config')),
    );
    $upload = testUpload('photo.png', testPng());

    try {
        $provider->upload($upload);
    } catch (MediaException $exception) {
        expect($exception->reason())->toBe('storage_failure');

        return;
    } finally {
        @unlink($upload->getPathname());
    }

    throw new RuntimeException('Expected metadata resolution to fail.');
});

it('rejects invalid default-provider configuration before storage access', function (string $key, mixed $value): void {
    $this->app->make('config')->set('laravel-blocks.media.'.$key, $value);

    expect(fn () => MediaConfiguration::fromRepository($this->app->make('config')))
        ->toThrow(InvalidArgumentException::class);
})->with([
    'escaping directory' => ['directory', '../outside'],
    'private visibility without temporary URL policy' => ['visibility', 'private'],
    'non-positive limit' => ['max_upload_bytes', 0],
    'SVG allow-list entry' => ['allowed_mime_types', ['image/svg+xml']],
]);

/** @param array<string, mixed> $overrides */
function configuredFilesystemProvider(array $overrides = []): MediaProvider
{
    Storage::fake('laravel-blocks-media', ['url' => 'https://media.example.test']);
    $app = app();
    $app->make('config')->set('laravel-blocks.media.disk', 'laravel-blocks-media');

    foreach ($overrides as $key => $value) {
        $app->make('config')->set('laravel-blocks.media.'.$key, $value);
    }

    $app->forgetInstance(MediaConfiguration::class);
    $app->forgetInstance(LaravelFilesystemMediaProvider::class);
    $app->forgetInstance(MediaProvider::class);

    return $app->make(MediaProvider::class);
}

function testUpload(string $name, string $contents): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'laravel-blocks-media-');

    if ($path === false || file_put_contents($path, $contents) === false) {
        throw new RuntimeException('Unable to create media upload fixture.');
    }

    return new UploadedFile($path, $name, null, UPLOAD_ERR_OK, true);
}

function testPng(): string
{
    return base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        true,
    ) ?: throw new RuntimeException('Unable to decode PNG fixture.');
}

function testWebVtt(): string
{
    return "WEBVTT\n\n00:00.000 --> 00:01.000\nHello from Laravel Blocks.\n";
}

function testPngDimensions(int $width, int $height): string
{
    $png = testPng();
    $data = pack('NN', $width, $height).substr($png, 24, 5);
    $crc = crc32('IHDR'.$data);

    return substr($png, 0, 16).$data.pack('N', $crc).substr($png, 33);
}
