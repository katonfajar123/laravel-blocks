@php
    $src = $attrs['src'] ?? null;
    $poster = $attrs['poster'] ?? null;
    $title = $attrs['title'] ?? null;
    $captionSrc = $attrs['captionSrc'] ?? null;
    $captionLanguage = $attrs['captionLanguage'] ?? null;
    $captionLabel = $attrs['captionLabel'] ?? null;
    $accessibleTitle = is_string($title) && $title !== '' ? $title : 'Video';
    $trackLanguage = is_string($captionLanguage) && $captionLanguage !== '' ? $captionLanguage : 'und';
    $trackLabel = is_string($captionLabel) && $captionLabel !== '' ? $captionLabel : 'Captions';
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
>
@if (is_string($captionSrc) && $captionSrc !== '')
    <track kind="captions" src="{{ $captionSrc }}" srclang="{{ $trackLanguage }}" label="{{ $trackLabel }}" default>
@endif
Video playback is not supported by this browser.</video>
@endif
