<?php

namespace Tests;

use KatonFajar\LaravelBlocks\LaravelBlocksServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    /**
     * @param  mixed  $app
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            LaravelBlocksServiceProvider::class,
        ];
    }
}
