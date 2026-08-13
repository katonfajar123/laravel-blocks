<?php

use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\Application;
use KatonFajar\LaravelBlocks\LaravelBlocksServiceProvider;

it('installs configuration and committed assets without host build or database artifacts', function (): void {
    with_install_fixture(function (string $hostRoot): void {
        register_install_fixture_paths($this->app, $hostRoot);

        $this->artisan('laravel-blocks:install')
            ->expectsOutputToContain('Laravel Blocks configuration and precompiled assets are installed.')
            ->expectsOutputToContain('No frontend build or database migration is required.')
            ->assertSuccessful();

        $packageRoot = dirname(__DIR__, 2);
        $publishedRoot = $hostRoot.'/public/vendor/laravel-blocks';

        expect(file_get_contents($hostRoot.'/config/laravel-blocks.php'))
            ->toBe(file_get_contents($packageRoot.'/config/laravel-blocks.php'))
            ->and(install_fixture_files($publishedRoot))
            ->toBe([
                'laravel-blocks.css',
                'laravel-blocks.js',
                'manifest.json',
            ])
            ->and(hash_file('sha256', $publishedRoot.'/laravel-blocks.css'))
            ->toBe(hash_file('sha256', $packageRoot.'/dist/laravel-blocks.css'))
            ->and(hash_file('sha256', $publishedRoot.'/laravel-blocks.js'))
            ->toBe(hash_file('sha256', $packageRoot.'/dist/laravel-blocks.js'))
            ->and(hash_file('sha256', $publishedRoot.'/manifest.json'))
            ->toBe(hash_file('sha256', $packageRoot.'/dist/manifest.json'))
            ->and(is_dir($hostRoot.'/database'))
            ->toBeFalse()
            ->and(is_file($hostRoot.'/package.json'))
            ->toBeFalse();
    });
});

it('preserves host changes unless force is explicitly requested', function (): void {
    with_install_fixture(function (string $hostRoot): void {
        register_install_fixture_paths($this->app, $hostRoot);

        $this->artisan('laravel-blocks:install')->assertSuccessful();

        $configPath = $hostRoot.'/config/laravel-blocks.php';
        $scriptPath = $hostRoot.'/public/vendor/laravel-blocks/laravel-blocks.js';
        file_put_contents($configPath, '<?php return [\'host\' => true];'.PHP_EOL);
        file_put_contents($scriptPath, 'host-owned override');

        $this->artisan('laravel-blocks:install')->assertSuccessful();

        expect(file_get_contents($configPath))
            ->toBe('<?php return [\'host\' => true];'.PHP_EOL)
            ->and(file_get_contents($scriptPath))
            ->toBe('host-owned override');

        $this->artisan('laravel-blocks:install', ['--force' => true])->assertSuccessful();

        $packageRoot = dirname(__DIR__, 2);

        expect(file_get_contents($configPath))
            ->toBe(file_get_contents($packageRoot.'/config/laravel-blocks.php'))
            ->and(hash_file('sha256', $scriptPath))
            ->toBe(hash_file('sha256', $packageRoot.'/dist/laravel-blocks.js'));
    });
});

/**
 * @param  Closure(string): void  $assertions
 */
function with_install_fixture(Closure $assertions): void
{
    $filesystem = new Filesystem;
    $hostRoot = str_replace(
        '\\',
        '/',
        sys_get_temp_dir().DIRECTORY_SEPARATOR.'laravel-blocks-host-'.bin2hex(random_bytes(6)),
    );

    $filesystem->makeDirectory($hostRoot, 0755, true);

    try {
        $assertions($hostRoot);
    } finally {
        $filesystem->deleteDirectory($hostRoot);
    }
}

/**
 * @param  Application  $app
 */
function register_install_fixture_paths($app, string $hostRoot): void
{
    $app->useConfigPath($hostRoot.'/config');
    $app->usePublicPath($hostRoot.'/public');

    // Re-register publish destinations after replacing the host paths for this fixture.
    (new LaravelBlocksServiceProvider($app))->boot();
}

/**
 * @return list<string>
 */
function install_fixture_files(string $path): array
{
    $files = array_map(
        static fn (SplFileInfo $file): string => $file->getFilename(),
        iterator_to_array((new FilesystemIterator($path)), false),
    );

    sort($files);

    return $files;
}
