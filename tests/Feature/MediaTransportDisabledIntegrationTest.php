<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class MediaTransportDisabledIntegrationTest extends TestCase
{
    /** @param mixed $app */
    protected function defineEnvironment($app): void
    {
        $app['config']->set('laravel-blocks.media.transport.enabled', false);
    }

    #[Test]
    public function it_does_not_register_media_routes_when_transport_is_disabled(): void
    {
        self::assertNull($this->app['router']->getRoutes()->getByName('laravel-blocks.media.browse'));
        self::assertNull($this->app['router']->getRoutes()->getByName('laravel-blocks.media.upload'));
    }
}
