@php
    $src = $attrs['src'] ?? null;
    $title = $attrs['title'] ?? null;
    $filename = $attrs['filename'] ?? null;
    $mimeType = $attrs['mimeType'] ?? null;
    $bytes = $attrs['bytes'] ?? null;
    $hasFilename = is_string($filename) && $filename !== '';
    $hasMimeType = is_string($mimeType) && $mimeType !== '';
    $hasBytes = is_int($bytes);
    $label = is_string($title) && $title !== ''
        ? $title
        : ($hasFilename ? $filename : 'Download file');
@endphp

@if (is_string($src) && $src !== '')
<div class="laravel-blocks-file">
    @if ($hasFilename)
    <a href="{{ $src }}" download="{{ $filename }}">
        {{ $label }}
    </a>
    @else
    <a href="{{ $src }}" download>
        {{ $label }}
    </a>
    @endif
    @if ($hasMimeType || $hasBytes)
    <span>
        @if ($hasMimeType)
            {{ $mimeType }}
        @endif
        @if ($hasMimeType && $hasBytes)
            &middot;
        @endif
        @if ($hasBytes)
            {{ $bytes }} bytes
        @endif
    </span>
    @endif
</div>
@endif
