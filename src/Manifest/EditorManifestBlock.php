<?php

namespace KatonFajar\LaravelBlocks\Manifest;

use JsonSerializable;

final readonly class EditorManifestBlock implements JsonSerializable
{
    /**
     * @param  list<string>  $keywords
     * @param  list<EditorManifestField>  $fields
     * @param  array<string, mixed>  $supports
     */
    public function __construct(
        public string $name,
        public string $label,
        public ?string $description,
        public string $category,
        public array $keywords,
        public ?string $icon,
        public array $fields,
        public array $supports,
        public EditorManifestEditor $editor,
    ) {}

    /**
     * @return array{
     *     name: string,
     *     label: string,
     *     description: string|null,
     *     category: string,
     *     keywords: list<string>,
     *     icon: string|null,
     *     fields: list<array<string, mixed>>,
     *     supports: array<string, mixed>,
     *     editor: array{mode: string, component: string|null}
     * }
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'description' => $this->description,
            'category' => $this->category,
            'keywords' => $this->keywords,
            'icon' => $this->icon,
            'fields' => array_map(
                static fn (EditorManifestField $field): array => $field->toArray(),
                $this->fields,
            ),
            'supports' => $this->supports,
            'editor' => $this->editor->toArray(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return $this->toJsonReadyArray();
    }

    /**
     * @return array<string, mixed>
     */
    public function toJsonReadyArray(): array
    {
        $supports = $this->supports;

        foreach (['design', 'advanced'] as $objectKey) {
            if (($supports[$objectKey] ?? null) === []) {
                $supports[$objectKey] = EditorManifest::emptyObject();
            }
        }

        return [
            'name' => $this->name,
            'label' => $this->label,
            'description' => $this->description,
            'category' => $this->category,
            'keywords' => $this->keywords,
            'icon' => $this->icon,
            'fields' => array_map(
                static fn (EditorManifestField $field): array => $field->toJsonReadyArray(),
                $this->fields,
            ),
            'supports' => $supports,
            'editor' => $this->editor->toArray(),
        ];
    }
}
