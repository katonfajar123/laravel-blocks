@php
    $start = $attrs['start'] ?? null;
    $type = $attrs['type'] ?? null;
    $orderedAttributes = '';

    if (is_int($start) && $start !== 1) {
        $orderedAttributes .= ' start="'.e((string) $start).'"';
    }

    if (is_string($type) && $type !== '' && $type !== '1') {
        $orderedAttributes .= ' type="'.e($type).'"';
    }
@endphp

<ol{!! $orderedAttributes !!}>{!! $content->toHtml() !!}</ol>
