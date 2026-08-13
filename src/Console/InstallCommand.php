<?php

namespace KatonFajar\LaravelBlocks\Console;

use Illuminate\Console\Command;
use KatonFajar\LaravelBlocks\LaravelBlocksServiceProvider;

final class InstallCommand extends Command
{
    /** @var string */
    protected $signature = 'laravel-blocks:install
                            {--force : Overwrite previously published configuration and assets}';

    /** @var string */
    protected $description = 'Publish Laravel Blocks configuration and precompiled assets';

    public function handle(): int
    {
        $exitCode = $this->call('vendor:publish', [
            '--provider' => LaravelBlocksServiceProvider::class,
            '--tag' => [
                'laravel-blocks-config',
                'laravel-blocks-assets',
            ],
            '--force' => (bool) $this->option('force'),
        ]);

        if ($exitCode !== self::SUCCESS) {
            $this->components->error('Laravel Blocks installation failed while publishing package files.');

            return self::FAILURE;
        }

        $this->components->info('Laravel Blocks configuration and precompiled assets are installed.');
        $this->components->info('No frontend build or database migration is required.');
        $this->line('Next: add <x-laravel-blocks::editor> to a Blade form.');

        return self::SUCCESS;
    }
}
