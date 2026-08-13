<?php

use KatonFajar\LaravelBlocks\Media\MediaCapabilities;
use KatonFajar\LaravelBlocks\Media\MediaItem;
use KatonFajar\LaravelBlocks\Media\MediaPage;
use KatonFajar\LaravelBlocks\Media\MediaQuery;

it('serializes normalized media values without storage internals', function (): void {
    $item = new MediaItem(
        id: 'opaque-id.png',
        provider: 'fixture',
        url: 'https://media.example.test/opaque-id.png',
        mimeType: 'image/png',
        bytes: 128,
        originalName: 'photo.png',
        width: 10,
        height: 20,
        alt: 'Description',
        caption: 'Caption',
        lastModified: 1_700_000_000,
    );
    $page = new MediaPage([$item], page: 1, perPage: 1, total: 2);
    $capabilities = new MediaCapabilities(true, true, true, true, false, 1024, ['IMAGE/PNG', 'image/png']);

    expect($item->toArray())
        ->toBe([
            'id' => 'opaque-id.png',
            'provider' => 'fixture',
            'url' => 'https://media.example.test/opaque-id.png',
            'mimeType' => 'image/png',
            'bytes' => 128,
            'originalName' => 'photo.png',
            'width' => 10,
            'height' => 20,
            'alt' => 'Description',
            'caption' => 'Caption',
            'lastModified' => 1_700_000_000,
        ])
        ->and($page->toArray()['hasMore'])
        ->toBeTrue()
        ->and($capabilities->toArray())
        ->toMatchArray([
            'browse' => true,
            'upload' => true,
            'delete' => false,
            'maxUploadBytes' => 1024,
            'allowedMimeTypes' => ['image/png'],
        ])
        ->and(json_encode([$item, $page, $capabilities], JSON_THROW_ON_ERROR))
        ->not->toContain('storage', 'credential', 'C:\\');
});

it('normalizes media queries and rejects invalid public values', function (): void {
    $query = new MediaQuery('  needle  ', ['IMAGE/PNG', 'image/png'], page: 2, perPage: 12);

    expect($query->search)
        ->toBe('needle')
        ->and($query->mimeTypes)
        ->toBe(['image/png'])
        ->and($query->page)
        ->toBe(2)
        ->and(fn () => new MediaQuery(page: 0))
        ->toThrow(InvalidArgumentException::class)
        ->and(fn () => new MediaItem('id', 'fixture', 'javascript:alert(1)', 'image/png', 1))
        ->toThrow(InvalidArgumentException::class)
        ->and(fn () => new MediaItem('id', 'fixture', 'https://media.test/id', 'image/png', 1, width: 10))
        ->toThrow(InvalidArgumentException::class)
        ->and((new MediaItem('id', 'fixture', 'https://media.test/id', 'image/png', 1, alt: ''))->alt)
        ->toBe('')
        ->and(fn () => new MediaCapabilities(true, true, true, true, true, -1, []))
        ->toThrow(InvalidArgumentException::class)
        ->and(fn () => new MediaCapabilities(true, true, true, true, true, 1, ['invalid']))
        ->toThrow(InvalidArgumentException::class);
});
