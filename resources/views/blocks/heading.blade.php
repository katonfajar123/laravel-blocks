@php
    $level = (int) ($attrs['level'] ?? 2);
    $tag = 'h'.min(6, max(1, $level));
@endphp

<{{ $tag }}>{!! $content->toHtml() !!}</{{ $tag }}>
