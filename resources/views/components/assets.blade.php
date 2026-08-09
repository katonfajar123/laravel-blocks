@php($assets = app(\KatonFajar\LaravelBlocks\Assets\AssetManifest::class))
@php($stylesheet = $assets->stylesheet())
@php($script = $assets->script())

@once
    <link
        rel="stylesheet"
        href="{{ $stylesheet->url }}"
        integrity="{{ $stylesheet->integrity }}"
        crossorigin="anonymous"
    >
    <script
        type="module"
        src="{{ $script->url }}"
        integrity="{{ $script->integrity }}"
        crossorigin="anonymous"
        defer
    ></script>
@endonce
