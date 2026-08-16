<?php

use Illuminate\Auth\GenericUser;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use KatonFajar\LaravelBlocks\Http\Middleware\AuthorizeMedia;
use KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider;
use Tests\Fixtures\Media\TransportMediaProvider;
use Tests\TestCase;

it('registers named media routes behind host middleware authorization and throttles', function (): void {
    $browse = app('router')->getRoutes()->getByName('laravel-blocks.media.browse');
    $upload = app('router')->getRoutes()->getByName('laravel-blocks.media.upload');

    expect($browse)->not->toBeNull()
        ->and($browse?->uri())->toBe('laravel-blocks/media')
        ->and($browse?->methods())->toContain('GET')
        ->and($browse?->gatherMiddleware())->toContain(
            'web',
            'auth',
            'throttle:60,1',
            AuthorizeMedia::class.':browse',
        )
        ->and($upload)->not->toBeNull()
        ->and($upload?->methods())->toContain('POST')
        ->and($upload?->gatherMiddleware())->toContain(
            'web',
            'auth',
            'throttle:10,1',
            AuthorizeMedia::class.':upload',
        );
});

it('denies unauthenticated and unauthorized media requests before provider access', function (): void {
    $provider = useTransportProvider();

    $this->getJson(route('laravel-blocks.media.browse'))
        ->assertUnauthorized();

    $this->actingAs(new GenericUser(['id' => 42]));

    $this->getJson(route('laravel-blocks.media.browse'))
        ->assertForbidden()
        ->assertExactJson([
            'error' => [
                'code' => 'media_forbidden',
                'message' => 'This media action is not authorized.',
            ],
        ]);

    expect($provider->browseQueries)->toBe([]);
});

it('returns normalized authorized browse search pagination and capability data', function (): void {
    $provider = useTransportProvider();
    authorizeMediaTransport($this);

    $this->getJson(route('laravel-blocks.media.browse', [
        'search' => 'hero',
        'mimeTypes' => ['image/png'],
        'page' => 2,
        'perPage' => 12,
    ]))
        ->assertOk()
        ->assertJsonPath('data.provider', 'transport-fixture')
        ->assertJsonPath('data.capabilities.upload', true)
        ->assertJsonPath('data.page.page', 2)
        ->assertJsonPath('data.page.perPage', 12)
        ->assertJsonPath('data.page.items.0.url', 'https://media.example.test/fixture.png');

    expect($provider->browseQueries)->toHaveCount(1)
        ->and($provider->browseQueries[0]->search)->toBe('hero')
        ->and($provider->browseQueries[0]->mimeTypes)->toBe(['image/png']);
});

it('rejects malformed browse input before provider access', function (): void {
    $provider = useTransportProvider();
    authorizeMediaTransport($this);

    $this->getJson(route('laravel-blocks.media.browse').'?mimeTypes=image/png&page=zero')
        ->assertUnprocessable()
        ->assertJsonPath('error.code', 'invalid_media_request');

    expect($provider->browseQueries)->toBe([]);
});

it('uploads through the authorized provider and redacts provider failures', function (): void {
    $provider = useTransportProvider();
    authorizeMediaTransport($this);

    $this->postJson(route('laravel-blocks.media.upload'), [
        'file' => UploadedFile::fake()->create('success.png', 1, 'image/png'),
    ])
        ->assertCreated()
        ->assertJsonPath('data.item.id', 'uploaded.png')
        ->assertJsonPath('data.item.alt', 'Uploaded image');

    $failure = $this->postJson(route('laravel-blocks.media.upload'), [
        'file' => UploadedFile::fake()->create('failure.png', 1, 'image/png'),
    ]);

    $failure->assertServiceUnavailable()
        ->assertExactJson([
            'error' => [
                'code' => 'storage_failure',
                'message' => 'The media provider is temporarily unavailable.',
            ],
        ]);
    expect($failure->getContent())->not->toContain('tenant-42', 'C:\\private')
        ->and($provider->uploads)->toBe(['success.png', 'failure.png']);
});

it('requires an upload file before invoking the provider', function (): void {
    $provider = useTransportProvider();
    authorizeMediaTransport($this);

    $this->postJson(route('laravel-blocks.media.upload'))
        ->assertUnprocessable()
        ->assertJsonPath('error.code', 'invalid_media_request')
        ->assertJsonPath('error.fields.file.0', 'Choose a file to upload.');

    expect($provider->uploads)->toBe([]);
});

it('enforces the configured browse throttle before repeated provider access', function (): void {
    $provider = useTransportProvider();
    authorizeMediaTransport($this);

    foreach (range(1, 60) as $request) {
        $this->getJson(route('laravel-blocks.media.browse'))->assertOk();
    }

    $this->getJson(route('laravel-blocks.media.browse'))->assertTooManyRequests();

    expect($provider->browseQueries)->toHaveCount(60);
});

function useTransportProvider(): TransportMediaProvider
{
    $provider = new TransportMediaProvider;
    app()->forgetInstance(MediaProvider::class);
    app()->instance(MediaProvider::class, $provider);

    return $provider;
}

function authorizeMediaTransport(TestCase $testCase): void
{
    Gate::define('laravel-blocks.media.browse', fn (GenericUser $user): bool => $user->getAuthIdentifier() === 42);
    Gate::define('laravel-blocks.media.upload', fn (GenericUser $user): bool => $user->getAuthIdentifier() === 42);
    $testCase->actingAs(new GenericUser(['id' => 42]));
}
