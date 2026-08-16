@props([
    'id' => null,
    'name' => 'content',
    'placeholder' => 'Start writing or type / to choose a block',
    'value' => null,
])

@php
    $document = \KatonFajar\LaravelBlocks\Documents\Document::from($value ?? null);
    $editorId = (string) ($id ?? 'laravel-blocks-editor-'.\Illuminate\Support\Str::uuid()->toString());
    $editorName = (string) $name;
    $editorPlaceholder = (string) $placeholder;
    $mediaTransport = app(\KatonFajar\LaravelBlocks\Media\MediaTransportConfiguration::class);
    $mediaPayload = $mediaTransport->enabled
        ? [
            'enabled' => true,
            'browseUrl' => route($mediaTransport->routeName('browse')),
            'uploadUrl' => route($mediaTransport->routeName('upload')),
            'csrfToken' => (string) csrf_token(),
            'capabilities' => app(\KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider::class)->capabilities()->toArray(),
        ]
        : ['enabled' => false];
    $payload = [
        'id' => $editorId,
        'name' => $editorName,
        'document' => $document->toArray(),
        'manifest' => app(\KatonFajar\LaravelBlocks\LaravelBlocks::class)->editorManifest()->toArray(),
        'media' => $mediaPayload,
        'placeholder' => $editorPlaceholder,
    ];
    $payloadJson = json_encode(
        $payload,
        JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
    );
@endphp

@if (config('laravel-blocks.assets.auto_inject', true))
    <x-laravel-blocks::assets />
@endif

<div
    {{ $attributes
        ->class(['lb-editor'])
        ->merge([
            'id' => $editorId,
            'data-laravel-blocks-root' => true,
            'data-laravel-blocks-editor' => true,
        ]) }}
>
    <input
        type="hidden"
        name="{{ $editorName }}"
        value="{{ $document->toJson() }}"
        data-laravel-blocks-input
    >

    <script type="application/json" data-laravel-blocks-payload>{!! $payloadJson !!}</script>

    <div class="lb-editor__frame" data-laravel-blocks-mount></div>
</div>
