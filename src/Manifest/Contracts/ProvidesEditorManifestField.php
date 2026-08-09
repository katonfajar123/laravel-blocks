<?php

namespace KatonFajar\LaravelBlocks\Manifest\Contracts;

interface ProvidesEditorManifestField
{
    /**
     * @return array<string, mixed>
     */
    public function toEditorManifest(): array;
}
