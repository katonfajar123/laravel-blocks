<?php

namespace KatonFajar\LaravelBlocks\Assets;

use Illuminate\Contracts\Config\Repository;
use JsonException;
use KatonFajar\LaravelBlocks\Assets\Exceptions\AssetManifestException;

final class AssetManifest
{
    public const SCRIPT = 'script';

    public const STYLE = 'style';

    public const PUBLIC_PATH = 'vendor/laravel-blocks';

    /** @var array{version: string, assets: array<string, array{file: string, type: string, sha256: string, integrity: string, bytes: int}>}|null */
    private ?array $manifest = null;

    public function __construct(
        private readonly Repository $config,
        private readonly ?string $distPath = null,
    ) {}

    public function script(): DistributedAsset
    {
        return $this->asset(self::SCRIPT);
    }

    public function stylesheet(): DistributedAsset
    {
        return $this->asset(self::STYLE);
    }

    public function asset(string $name): DistributedAsset
    {
        $manifest = $this->manifest();
        $asset = $manifest['assets'][$name] ?? null;

        if ($asset === null) {
            throw AssetManifestException::at(
                'missing_asset_entry',
                '$.assets.'.$name,
                sprintf('Asset "%s" is not declared in the Laravel Blocks distribution manifest.', $name),
            );
        }

        return new DistributedAsset(
            name: $name,
            file: $asset['file'],
            type: $asset['type'],
            url: $this->buildAssetUrl($asset['file'], $asset['sha256']),
            integrity: $asset['integrity'],
            sha256: $asset['sha256'],
            bytes: $asset['bytes'],
        );
    }

    public function assetUrl(string $name): string
    {
        return $this->asset($name)->url;
    }

    /**
     * @return array{version: string, assets: array<string, array{file: string, type: string, sha256: string, integrity: string, bytes: int}>}
     */
    public function toArray(): array
    {
        return $this->manifest();
    }

    public function distPath(): string
    {
        return $this->distPath ?? dirname(__DIR__, 2).'/dist';
    }

    public function publicPath(): string
    {
        return self::PUBLIC_PATH;
    }

    /**
     * @return array{version: string, assets: array<string, array{file: string, type: string, sha256: string, integrity: string, bytes: int}>}
     */
    private function manifest(): array
    {
        if ($this->manifest === null) {
            $this->manifest = $this->loadManifest();
        }

        return $this->manifest;
    }

    /**
     * @return array{version: string, assets: array<string, array{file: string, type: string, sha256: string, integrity: string, bytes: int}>}
     */
    private function loadManifest(): array
    {
        $path = $this->distPath().'/manifest.json';

        if (! is_file($path)) {
            throw AssetManifestException::at(
                'missing_asset_manifest',
                '$',
                sprintf('Laravel Blocks distribution manifest was not found at "%s".', $path),
            );
        }

        $contents = file_get_contents($path);

        if (! is_string($contents)) {
            throw AssetManifestException::at(
                'unreadable_asset_manifest',
                '$',
                sprintf('Laravel Blocks distribution manifest at "%s" could not be read.', $path),
            );
        }

        try {
            $decoded = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw AssetManifestException::at(
                'malformed_asset_manifest',
                '$',
                sprintf('Laravel Blocks distribution manifest at "%s" is not valid JSON.', $path),
                $exception,
            );
        }

        if (! is_array($decoded) || array_is_list($decoded)) {
            throw AssetManifestException::at(
                'invalid_asset_manifest',
                '$',
                'Laravel Blocks distribution manifest must be a JSON object.',
            );
        }

        return $this->normalizeManifest($decoded);
    }

    /**
     * @param  array<array-key, mixed>  $decoded
     * @return array{version: string, assets: array<string, array{file: string, type: string, sha256: string, integrity: string, bytes: int}>}
     */
    private function normalizeManifest(array $decoded): array
    {
        $version = $this->requiredString($decoded, 'version', '$.version');
        $assets = $this->requiredObject($decoded, 'assets', '$.assets');
        $normalizedAssets = [];

        foreach ([self::SCRIPT, self::STYLE] as $requiredAsset) {
            if (! array_key_exists($requiredAsset, $assets)) {
                throw AssetManifestException::at(
                    'missing_asset_entry',
                    '$.assets.'.$requiredAsset,
                    sprintf('Laravel Blocks distribution manifest must declare "%s".', $requiredAsset),
                );
            }
        }

        foreach ($assets as $name => $asset) {
            if (! is_string($name) || preg_match('/^[a-z][A-Za-z0-9]*$/D', $name) !== 1) {
                throw AssetManifestException::at(
                    'invalid_asset_name',
                    '$.assets.'.((string) $name),
                    'Distribution asset names must be lower-camel strings.',
                );
            }

            $normalizedAssets[$name] = $this->normalizeAsset($name, $asset, '$.assets.'.$name);
        }

        return [
            'version' => $version,
            'assets' => $normalizedAssets,
        ];
    }

    /**
     * @return array{file: string, type: string, sha256: string, integrity: string, bytes: int}
     */
    private function normalizeAsset(string $name, mixed $asset, string $path): array
    {
        if (! is_array($asset) || ($asset !== [] && array_is_list($asset))) {
            throw AssetManifestException::at(
                'invalid_asset_entry',
                $path,
                sprintf('Distribution asset "%s" must be a JSON object.', $name),
            );
        }

        $file = $this->requiredFile($asset, 'file', $path.'.file');
        $type = $this->requiredString($asset, 'type', $path.'.type');
        $sha256 = $this->requiredSha256($asset, 'sha256', $path.'.sha256');
        $integrity = $this->requiredString($asset, 'integrity', $path.'.integrity');
        $bytes = $this->requiredPositiveInteger($asset, 'bytes', $path.'.bytes');

        if ($integrity !== 'sha256-'.$sha256) {
            throw AssetManifestException::at(
                'invalid_asset_integrity',
                $path.'.integrity',
                sprintf('Distribution asset "%s" integrity must match its SHA-256 checksum.', $name),
            );
        }

        $absolutePath = $this->distPath().'/'.$file;

        if (! is_file($absolutePath)) {
            throw AssetManifestException::at(
                'missing_asset_file',
                $path.'.file',
                sprintf('Distribution asset "%s" was not found at "%s".', $name, $absolutePath),
            );
        }

        $actualHash = hash_file('sha256', $absolutePath);

        if (! is_string($actualHash) || $actualHash !== $sha256) {
            throw AssetManifestException::at(
                'asset_checksum_mismatch',
                $path.'.sha256',
                sprintf('Distribution asset "%s" checksum does not match manifest metadata.', $name),
            );
        }

        $actualBytes = filesize($absolutePath);

        if (! is_int($actualBytes) || $actualBytes !== $bytes) {
            throw AssetManifestException::at(
                'asset_size_mismatch',
                $path.'.bytes',
                sprintf('Distribution asset "%s" byte size does not match manifest metadata.', $name),
            );
        }

        return [
            'file' => $file,
            'type' => $type,
            'sha256' => $sha256,
            'integrity' => $integrity,
            'bytes' => $bytes,
        ];
    }

    /**
     * @param  array<array-key, mixed>  $source
     */
    private function requiredString(array $source, string $key, string $path): string
    {
        $value = $source[$key] ?? null;

        if (! is_string($value) || trim($value) === '') {
            throw AssetManifestException::at(
                'invalid_asset_manifest_value',
                $path,
                sprintf('Distribution manifest key "%s" must be a non-empty string.', $key),
            );
        }

        return $value;
    }

    /**
     * @param  array<array-key, mixed>  $source
     */
    private function requiredFile(array $source, string $key, string $path): string
    {
        $value = $this->requiredString($source, $key, $path);

        if (preg_match('/^[A-Za-z0-9._-]+$/D', $value) !== 1) {
            throw AssetManifestException::at(
                'invalid_asset_file',
                $path,
                'Distribution asset files must be relative filenames without path traversal.',
            );
        }

        return $value;
    }

    /**
     * @param  array<array-key, mixed>  $source
     */
    private function requiredSha256(array $source, string $key, string $path): string
    {
        $value = $this->requiredString($source, $key, $path);

        if (preg_match('/^[a-f0-9]{64}$/D', $value) !== 1) {
            throw AssetManifestException::at(
                'invalid_asset_checksum',
                $path,
                'Distribution asset checksums must be lowercase SHA-256 hex strings.',
            );
        }

        return $value;
    }

    /**
     * @param  array<array-key, mixed>  $source
     */
    private function requiredPositiveInteger(array $source, string $key, string $path): int
    {
        $value = $source[$key] ?? null;

        if (! is_int($value) || $value <= 0) {
            throw AssetManifestException::at(
                'invalid_asset_manifest_value',
                $path,
                sprintf('Distribution manifest key "%s" must be a positive integer.', $key),
            );
        }

        return $value;
    }

    /**
     * @param  array<array-key, mixed>  $source
     * @return array<array-key, mixed>
     */
    private function requiredObject(array $source, string $key, string $path): array
    {
        $value = $source[$key] ?? null;

        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            throw AssetManifestException::at(
                'invalid_asset_manifest_value',
                $path,
                sprintf('Distribution manifest key "%s" must be a JSON object.', $key),
            );
        }

        return $value;
    }

    private function buildAssetUrl(string $file, string $sha256): string
    {
        $baseUrl = $this->config->get('laravel-blocks.assets.base_url');

        if (! is_string($baseUrl) || trim($baseUrl) === '') {
            $baseUrl = '/'.self::PUBLIC_PATH;
        }

        return sprintf(
            '%s/%s?id=%s',
            rtrim($baseUrl, '/'),
            $file,
            substr($sha256, 0, 12),
        );
    }
}
