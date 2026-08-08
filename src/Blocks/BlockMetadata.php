<?php

namespace KatonFajar\LaravelBlocks\Blocks;

final readonly class BlockMetadata
{
    /**
     * @param  list<string>  $keywords
     */
    private function __construct(
        public string $name,
        public string $label,
        public string $view,
        public ?string $description,
        public string $category,
        public array $keywords,
        public ?string $icon,
        public ?string $editorComponent,
    ) {}

    public static function from(Block $block): self
    {
        return new self(
            name: $block->name(),
            label: $block->label(),
            view: $block->view(),
            description: $block->description(),
            category: $block->category(),
            keywords: $block->keywords(),
            icon: $block->icon(),
            editorComponent: $block->editorComponent(),
        );
    }
}
