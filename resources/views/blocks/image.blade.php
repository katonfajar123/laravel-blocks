@php
    $src = $attrs['src'] ?? null;
    $alt = $attrs['alt'] ?? null;
    $title = $attrs['title'] ?? null;
@endphp

@if (is_string($src) && $src !== '')
<img src="{{ $src }}" alt="{{ is_string($alt) ? $alt : '' }}"@if (is_string($title) && $title !== '') title="{{ $title }}"@endif>
@endif
