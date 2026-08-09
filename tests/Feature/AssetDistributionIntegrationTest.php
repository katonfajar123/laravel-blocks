<?php

use Illuminate\Support\Facades\Blade;
use KatonFajar\LaravelBlocks\Assets\AssetManifest;
use KatonFajar\LaravelBlocks\Assets\DistributedAsset;
use KatonFajar\LaravelBlocks\Assets\Exceptions\AssetManifestException;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\LaravelBlocks;

it('resolves versioned package distribution assets without host build tooling', function (): void {
    $assets = $this->app->make(AssetManifest::class);
    $service = $this->app->make(LaravelBlocks::class);
    $packageRoot = dirname(__DIR__, 2);
    $packageJson = json_decode(
        file_get_contents($packageRoot.'/package.json'),
        true,
        512,
        JSON_THROW_ON_ERROR,
    );

    $script = $assets->script();
    $stylesheet = $assets->stylesheet();

    expect($script)
        ->toBeInstanceOf(DistributedAsset::class)
        ->and($script->name)->toBe('script')
        ->and($script->file)->toBe('laravel-blocks.js')
        ->and($script->type)->toBe('module')
        ->and($script->url)->toStartWith('/vendor/laravel-blocks/laravel-blocks.js?id=')
        ->and($script->integrity)->toBe('sha256-'.$script->sha256)
        ->and($script->bytes)->toBe(filesize($packageRoot.'/dist/laravel-blocks.js'))
        ->and($stylesheet->name)->toBe('style')
        ->and($stylesheet->file)->toBe('laravel-blocks.css')
        ->and($stylesheet->type)->toBe('style')
        ->and($stylesheet->url)->toStartWith('/vendor/laravel-blocks/laravel-blocks.css?id=')
        ->and($stylesheet->integrity)->toBe('sha256-'.$stylesheet->sha256)
        ->and($stylesheet->bytes)->toBe(filesize($packageRoot.'/dist/laravel-blocks.css'))
        ->and($assets->toArray()['version'])->toBe($packageJson['version'])
        ->and($service->assets())->toBe($assets)
        ->and($service->asset('script')->toArray())->toBe($script->toArray())
        ->and($service->assetUrl('style'))->toBe($stylesheet->url)
        ->and(LaravelBlocksFacade::assetUrl('script'))->toBe($script->url);
});

it('renders the package asset Blade component once with integrity metadata', function (): void {
    $rendered = Blade::render(<<<'BLADE'
        <x-laravel-blocks::assets />
        <x-laravel-blocks::assets />
        BLADE);

    expect(substr_count($rendered, 'laravel-blocks.css?id='))
        ->toBe(1)
        ->and(substr_count($rendered, 'laravel-blocks.js?id='))
        ->toBe(1)
        ->and($rendered)
        ->toContain('rel="stylesheet"')
        ->toContain('type="module"')
        ->toContain('integrity="sha256-')
        ->toContain('crossorigin="anonymous"')
        ->toContain('defer');
});

it('honors a configured base url for published or CDN assets', function (): void {
    $this->app->make('config')->set('laravel-blocks.assets.base_url', 'https://cdn.example.test/blocks/');

    $assets = new AssetManifest(
        config: $this->app->make('config'),
        distPath: dirname(__DIR__, 2).'/dist',
    );

    expect($assets->script()->url)
        ->toStartWith('https://cdn.example.test/blocks/laravel-blocks.js?id=');
});

it('resolves from a distribution-only directory without source or node modules', function (): void {
    $distPath = copy_distribution_fixture();

    $assets = new AssetManifest(
        config: $this->app->make('config'),
        distPath: $distPath,
    );

    expect($assets->script()->file)
        ->toBe('laravel-blocks.js')
        ->and($assets->stylesheet()->file)
        ->toBe('laravel-blocks.css')
        ->and(is_file($distPath.'/manifest.json'))
        ->toBeTrue();
});

it('fails clearly when the distribution manifest is missing', function (): void {
    $distPath = make_distribution_temp_dir();

    $assets = new AssetManifest(
        config: $this->app->make('config'),
        distPath: $distPath,
    );

    try {
        $assets->toArray();
    } catch (AssetManifestException $exception) {
        expect($exception->reason())
            ->toBe('missing_asset_manifest')
            ->and($exception->manifestPath())
            ->toBe('$');

        return;
    }

    throw new RuntimeException('Expected missing manifest diagnostics.');
});

it('fails clearly when distribution metadata does not match the built asset', function (): void {
    $distPath = copy_distribution_fixture();
    $manifest = json_decode(
        file_get_contents($distPath.'/manifest.json'),
        true,
        512,
        JSON_THROW_ON_ERROR,
    );
    $manifest['assets']['script']['sha256'] = str_repeat('0', 64);
    $manifest['assets']['script']['integrity'] = 'sha256-'.str_repeat('0', 64);

    file_put_contents(
        $distPath.'/manifest.json',
        json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL,
    );

    $assets = new AssetManifest(
        config: $this->app->make('config'),
        distPath: $distPath,
    );

    try {
        $assets->script();
    } catch (AssetManifestException $exception) {
        expect($exception->reason())
            ->toBe('asset_checksum_mismatch')
            ->and($exception->manifestPath())
            ->toBe('$.assets.script.sha256');

        return;
    }

    throw new RuntimeException('Expected checksum mismatch diagnostics.');
});

function make_distribution_temp_dir(): string
{
    $path = sys_get_temp_dir().DIRECTORY_SEPARATOR.'laravel-blocks-dist-'.bin2hex(random_bytes(6));

    if (! mkdir($path, 0777, true) && ! is_dir($path)) {
        throw new RuntimeException('Unable to create temporary distribution fixture.');
    }

    return str_replace('\\', '/', $path);
}

function copy_distribution_fixture(): string
{
    $source = dirname(__DIR__, 2).'/dist';
    $target = make_distribution_temp_dir();

    foreach (['laravel-blocks.js', 'laravel-blocks.css', 'manifest.json'] as $file) {
        copy($source.'/'.$file, $target.'/'.$file);
    }

    return $target;
}
