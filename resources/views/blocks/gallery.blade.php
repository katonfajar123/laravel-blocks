@php
    $images = isset($attrs['images']) && is_array($attrs['images']) ? $attrs['images'] : [];
    $images = array_values(array_filter($images, static fn ($image) => is_array($image) && isset($image['src']) && is_string($image['src']) && $image['src'] !== ''));
@endphp

@if ($images !== [])
<figure class="laravel-blocks-gallery">
    <div class="laravel-blocks-gallery__grid">
        @foreach ($images as $image)
        @php
            $alt = is_string($image['alt'] ?? null) ? $image['alt'] : '';
            $title = is_string($image['title'] ?? null) && $image['title'] !== '' ? $image['title'] : null;
            $caption = is_string($image['caption'] ?? null) && $image['caption'] !== '' ? $image['caption'] : null;
            $width = is_int($image['width'] ?? null) && $image['width'] > 0 ? $image['width'] : null;
            $height = is_int($image['height'] ?? null) && $image['height'] > 0 ? $image['height'] : null;
        @endphp
        <figure class="laravel-blocks-gallery__item">
            <img
                src="{{ $image['src'] }}"
                alt="{{ $alt }}"
                @if ($title !== null) title="{{ $title }}" @endif
                @if ($width !== null) width="{{ $width }}" @endif
                @if ($height !== null) height="{{ $height }}" @endif
                loading="lazy"
            >
            @if ($caption !== null)
            <figcaption>{{ $caption }}</figcaption>
            @endif
        </figure>
        @endforeach
    </div>
</figure>
@endif
