@php
    $src = $attrs['src'] ?? null;
    $poster = $attrs['poster'] ?? null;
    $title = $attrs['title'] ?? null;
    $accessibleTitle = is_string($title) && $title !== '' ? $title : 'Video';
@endphp

@if (is_string($src) && $src !== '')
<video
    src="{{ $src }}"
    controls
    playsinline
    preload="metadata"
    aria-label="{{ $accessibleTitle }}"
    @if (is_string($poster) && $poster !== '') poster="{{ $poster }}" @endif
    @if (is_string($title) && $title !== '') title="{{ $title }}" @endif
>Video playback is not supported by this browser.</video>
@endif
