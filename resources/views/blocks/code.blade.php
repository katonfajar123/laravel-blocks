@php
    $language = $attrs['language'] ?? null;
    $languageAttribute = is_string($language) && $language !== ''
        ? ' class="language-'.e($language).'"'
        : '';
@endphp

<pre><code{!! $languageAttribute !!}>{!! $content->toHtml() !!}</code></pre>
