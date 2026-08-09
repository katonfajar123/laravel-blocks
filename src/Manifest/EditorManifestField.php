<?php

namespace KatonFajar\LaravelBlocks\Manifest;

use JsonSerializable;

final readonly class EditorManifestField implements JsonSerializable
{
    /**
     * @param  array<string, mixed>  $constraints
     * @param  array<string, mixed>  $ui
     */
    public function __construct(
        public string $name,
        public string $path,
        public string $type,
        public string $group,
        public string $label,
        public ?string $help,
        public mixed $default,
        public bool $required,
        public array $constraints,
        public array $ui,
    ) {}

    /**
     * @return array{
     *     name: string,
     *     path: string,
     *     type: string,
     *     group: string,
     *     label: string,
     *     help: string|null,
     *     default: mixed,
     *     required: bool,
     *     constraints: array<string, mixed>,
     *     ui: array<string, mixed>
     * }
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'path' => $this->path,
            'type' => $this->type,
            'group' => $this->group,
            'label' => $this->label,
            'help' => $this->help,
            'default' => $this->default,
            'required' => $this->required,
            'constraints' => $this->constraints,
            'ui' => $this->ui,
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
        $field = $this->toArray();

        if ($field['constraints'] === []) {
            $field['constraints'] = EditorManifest::emptyObject();
        }

        if ($field['ui'] === []) {
            $field['ui'] = EditorManifest::emptyObject();
        }

        return $field;
    }
}
