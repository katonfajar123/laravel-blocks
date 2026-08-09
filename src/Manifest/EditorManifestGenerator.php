<?php

namespace KatonFajar\LaravelBlocks\Manifest;

use Illuminate\Support\Str;
use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;
use KatonFajar\LaravelBlocks\Documents\SchemaVersion;
use KatonFajar\LaravelBlocks\Manifest\Contracts\ProvidesEditorManifestField;
use KatonFajar\LaravelBlocks\Manifest\Exceptions\ManifestException;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;
use KatonFajar\LaravelBlocks\Validation\AttributeType;

final readonly class EditorManifestGenerator
{
    /** @var array<string, true> */
    private const FIELD_GROUPS = [
        'content' => true,
        'design' => true,
        'advanced' => true,
    ];

    /** @var list<string> */
    private const FIELD_KEYS = [
        'name',
        'path',
        'type',
        'group',
        'label',
        'help',
        'default',
        'required',
        'constraints',
        'ui',
    ];

    /** @var array<string, mixed> */
    private const DEFAULT_SUPPORTS = [
        'inserter' => true,
        'multiple' => true,
        'reusable' => true,
        'design' => [],
        'advanced' => [],
    ];

    public function __construct(private BlockRegistry $blocks) {}

    public function generate(): EditorManifest
    {
        $categories = [];
        $categoryIndex = [];
        $manifestBlocks = [];

        $blockIndex = 0;

        foreach ($this->blocks->all() as $block) {
            $metadata = $block->metadata();
            $blockPath = sprintf('$.blocks[%d]', $blockIndex);
            $category = $this->lowerCamelString($metadata->category, $blockPath.'.category', 'Block category');

            if (! array_key_exists($category, $categoryIndex)) {
                $categoryIndex[$category] = true;
                $categories[] = new EditorManifestCategory(
                    name: $category,
                    label: Str::headline($category),
                );
            }

            $component = $metadata->editorComponent;

            $manifestBlocks[] = new EditorManifestBlock(
                name: $metadata->name,
                label: $this->nonEmptyString($metadata->label, $blockPath.'.label', 'Block label'),
                description: $this->nullableString($metadata->description, $blockPath.'.description', 'Block description'),
                category: $category,
                keywords: $this->keywords($metadata->keywords, $blockPath.'.keywords'),
                icon: $this->nullableAlias($metadata->icon, $blockPath.'.icon', 'Block icon'),
                fields: $this->fields($block, $blockPath),
                supports: $this->supports($block->supports(), $blockPath.'.supports'),
                editor: $component === null
                    ? EditorManifestEditor::generated()
                    : EditorManifestEditor::component($this->alias($component, $blockPath.'.editor.component', 'Editor component')),
            );

            $blockIndex++;
        }

        return new EditorManifest(
            categories: $categories,
            blocks: $manifestBlocks,
            documentSchemaVersion: SchemaVersion::current()->value,
        );
    }

    /**
     * @return list<EditorManifestField>
     */
    private function fields(Block $block, string $blockPath): array
    {
        $schema = $block->schema();
        $fields = [];

        foreach ($block->fields() as $index => $field) {
            $fields[] = $this->field(
                field: $field,
                attributes: $schema->attributes,
                fieldPath: sprintf('%s.fields[%d]', $blockPath, $index),
            );
        }

        return $fields;
    }

    /**
     * @param  array<string, AttributeRule>  $attributes
     */
    private function field(mixed $field, array $attributes, string $fieldPath): EditorManifestField
    {
        if ($field instanceof ProvidesEditorManifestField) {
            $field = $field->toEditorManifest();
        }

        if (! is_array($field) || array_is_list($field)) {
            throw ManifestException::at(
                'unsupported_manifest_field',
                $fieldPath,
                'Editor manifest fields must be associative arrays or implement ProvidesEditorManifestField.',
            );
        }

        $field = $this->assertAllowedKeys($field, self::FIELD_KEYS, $fieldPath);
        $name = $this->requiredLowerCamel($field, 'name', $fieldPath);
        $type = $this->requiredLowerCamel($field, 'type', $fieldPath);
        $group = $this->fieldGroup($field['group'] ?? 'content', $fieldPath.'.group');
        $path = $this->fieldPath($field['path'] ?? $this->defaultFieldPath($name, $group), $fieldPath.'.path');
        $attributeRule = $this->attributeRuleForPath($path, $attributes);
        $schemaConstraints = $attributeRule === null
            ? []
            : $this->constraints($attributeRule);
        $fieldConstraints = $this->associativeArray($field['constraints'] ?? [], $fieldPath.'.constraints', 'Field constraints');

        return new EditorManifestField(
            name: $name,
            path: $path,
            type: $type,
            group: $group,
            label: array_key_exists('label', $field)
                ? $this->nonEmptyString($field['label'], $fieldPath.'.label', 'Field label')
                : Str::headline($name),
            help: $this->nullableString($field['help'] ?? null, $fieldPath.'.help', 'Field help'),
            default: $this->jsonValue($field['default'] ?? null, $fieldPath.'.default'),
            required: array_key_exists('required', $field)
                ? $this->boolean($field['required'], $fieldPath.'.required', 'Field required')
                : ($attributeRule === null ? false : $attributeRule->required),
            constraints: array_replace(
                $schemaConstraints,
                $fieldConstraints,
            ),
            ui: $this->associativeArray($field['ui'] ?? [], $fieldPath.'.ui', 'Field ui metadata'),
        );
    }

    /**
     * @param  array<array-key, mixed>  $supports
     * @return array<string, mixed>
     */
    private function supports(array $supports, string $path): array
    {
        if ($supports !== [] && array_is_list($supports)) {
            throw ManifestException::at(
                'invalid_manifest_supports',
                $path,
                'Block supports must be an associative array.',
            );
        }

        $normalized = self::DEFAULT_SUPPORTS;

        foreach ($supports as $key => $value) {
            if (! is_string($key) || preg_match('/^[a-z][A-Za-z0-9]*$/D', $key) !== 1) {
                throw ManifestException::at(
                    'invalid_manifest_support_key',
                    $path.'.'.((string) $key),
                    'Block support keys must be lower-camel strings.',
                );
            }

            if (in_array($key, ['inserter', 'multiple', 'reusable'], true)) {
                $normalized[$key] = $this->boolean($value, $path.'.'.$key, 'Block support');

                continue;
            }

            if (in_array($key, ['design', 'advanced'], true)) {
                $normalized[$key] = $this->associativeArray($value, $path.'.'.$key, 'Block support object');

                continue;
            }

            $normalized[$key] = $this->jsonValue($value, $path.'.'.$key);
        }

        return $normalized;
    }

    /**
     * @return array<string, mixed>
     */
    private function constraints(AttributeRule $rule): array
    {
        $constraints = [];

        if ($rule->nullable) {
            $constraints['nullable'] = true;
        }

        if ($rule->minimumLength !== null) {
            $constraints[$rule->type === AttributeType::LIST ? 'minItems' : 'minLength'] = $rule->minimumLength;
        }

        if ($rule->maximumLength !== null) {
            $constraints[$rule->type === AttributeType::LIST ? 'maxItems' : 'maxLength'] = $rule->maximumLength;
        }

        if ($rule->minimum !== null) {
            $constraints['min'] = $rule->minimum;
        }

        if ($rule->maximum !== null) {
            $constraints['max'] = $rule->maximum;
        }

        if ($rule->allowedValues !== []) {
            $constraints['allowedValues'] = $rule->allowedValues;
        }

        if ($rule->allowedSchemes !== []) {
            $constraints['allowedSchemes'] = $rule->allowedSchemes;
        }

        if ($rule->properties !== []) {
            $constraints['properties'] = $this->propertyConstraints($rule->properties);
        }

        if ($rule->additionalProperties !== null) {
            $constraints['additionalProperties'] = $this->constraints($rule->additionalProperties);
        }

        if ($rule->items !== null) {
            $constraints['items'] = $this->constraints($rule->items);
        }

        return $constraints;
    }

    /**
     * @param  array<string, AttributeRule>  $properties
     * @return array<string, mixed>
     */
    private function propertyConstraints(array $properties): array
    {
        $constraints = [];

        foreach ($properties as $name => $rule) {
            $propertyConstraints = $this->constraints($rule);

            if ($rule->required) {
                $propertyConstraints['required'] = true;
            }

            $constraints[$name] = $propertyConstraints;
        }

        return $constraints;
    }

    /**
     * @param  array<array-key, mixed>  $field
     * @param  list<string>  $allowedKeys
     * @return array<string, mixed>
     */
    private function assertAllowedKeys(array $field, array $allowedKeys, string $path): array
    {
        $allowed = array_flip($allowedKeys);
        $normalized = [];

        foreach ($field as $key => $value) {
            if (! is_string($key) || ! array_key_exists($key, $allowed)) {
                throw ManifestException::at(
                    'invalid_manifest_field_key',
                    $path.'.'.((string) $key),
                    'Editor manifest field definitions contain an unsupported key.',
                );
            }

            $normalized[$key] = $value;
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $field
     */
    private function requiredLowerCamel(array $field, string $key, string $path): string
    {
        if (! array_key_exists($key, $field)) {
            throw ManifestException::at(
                'missing_manifest_field_key',
                $path.'.'.$key,
                sprintf('Editor manifest fields require a "%s" key.', $key),
            );
        }

        return $this->lowerCamelString($field[$key], $path.'.'.$key, sprintf('Field %s', $key));
    }

    private function defaultFieldPath(string $name, string $group): string
    {
        if ($group === 'content') {
            return 'attrs.'.$name;
        }

        return sprintf('attrs.%s.%s', $group, $name);
    }

    private function fieldPath(mixed $value, string $path): string
    {
        $value = $this->nonEmptyString($value, $path, 'Field path');

        if (preg_match('/^(content|attrs\.[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)*)$/D', $value) !== 1) {
            throw ManifestException::at(
                'invalid_manifest_field_path',
                $path,
                'Field paths must target content or lower-camel attrs paths.',
            );
        }

        return $value;
    }

    private function fieldGroup(mixed $value, string $path): string
    {
        if (! is_string($value) || ! array_key_exists($value, self::FIELD_GROUPS)) {
            throw ManifestException::at(
                'invalid_manifest_field_group',
                $path,
                'Field group must be one of content, design, or advanced.',
            );
        }

        return $value;
    }

    /**
     * @param  array<string, AttributeRule>  $attributes
     */
    private function attributeRuleForPath(string $path, array $attributes): ?AttributeRule
    {
        if (preg_match('/^attrs\.([a-z][A-Za-z0-9]*)$/D', $path, $matches) !== 1) {
            return null;
        }

        $attribute = $matches[1];

        return $attributes[$attribute] ?? null;
    }

    /**
     * @param  array<array-key, mixed>  $values
     * @return list<string>
     */
    private function keywords(array $values, string $path): array
    {
        if (! array_is_list($values)) {
            throw ManifestException::at(
                'invalid_manifest_keywords',
                $path,
                'Block keywords must be a list of non-empty strings.',
            );
        }

        $keywords = [];

        foreach ($values as $index => $value) {
            $keywords[] = $this->nonEmptyString($value, sprintf('%s[%d]', $path, $index), 'Block keyword');
        }

        return $keywords;
    }

    /**
     * @return array<string, mixed>
     */
    private function associativeArray(mixed $value, string $path, string $label): array
    {
        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            throw ManifestException::at(
                'invalid_manifest_object',
                $path,
                sprintf('%s must be an associative JSON object.', $label),
            );
        }

        /** @var array<string, mixed> $safe */
        $safe = $this->jsonValue($value, $path);

        return $safe;
    }

    private function jsonValue(mixed $value, string $path): mixed
    {
        if (is_callable($value)) {
            throw ManifestException::at(
                'non_serializable_manifest_value',
                $path,
                'Editor manifest values must not contain callbacks.',
            );
        }

        if ($value === null || is_bool($value) || is_int($value) || is_string($value)) {
            return $value;
        }

        if (is_float($value)) {
            if (! is_finite($value)) {
                throw ManifestException::at(
                    'non_serializable_manifest_value',
                    $path,
                    'Editor manifest numbers must be finite.',
                );
            }

            return $value;
        }

        if (is_array($value)) {
            if ($value === []) {
                return [];
            }

            if (array_is_list($value)) {
                $list = [];

                foreach ($value as $index => $item) {
                    $list[] = $this->jsonValue($item, sprintf('%s[%d]', $path, $index));
                }

                return $list;
            }

            $object = [];

            foreach ($value as $key => $item) {
                if (! is_string($key) || $key === '') {
                    throw ManifestException::at(
                        'non_serializable_manifest_value',
                        $path.'.'.((string) $key),
                        'Editor manifest object keys must be non-empty strings.',
                    );
                }

                $object[$key] = $this->jsonValue($item, $path.'.'.$key);
            }

            return $object;
        }

        throw ManifestException::at(
            'non_serializable_manifest_value',
            $path,
            'Editor manifest values must be JSON-safe scalars, lists, or objects.',
        );
    }

    private function boolean(mixed $value, string $path, string $label): bool
    {
        if (! is_bool($value)) {
            throw ManifestException::at(
                'invalid_manifest_boolean',
                $path,
                sprintf('%s must be boolean.', $label),
            );
        }

        return $value;
    }

    private function lowerCamelString(mixed $value, string $path, string $label): string
    {
        $value = $this->nonEmptyString($value, $path, $label);

        if (preg_match('/^[a-z][A-Za-z0-9]*$/D', $value) !== 1) {
            throw ManifestException::at(
                'invalid_manifest_identifier',
                $path,
                sprintf('%s must be a lower-camel identifier.', $label),
            );
        }

        return $value;
    }

    private function nullableAlias(mixed $value, string $path, string $label): ?string
    {
        if ($value === null) {
            return null;
        }

        return $this->alias($value, $path, $label);
    }

    private function alias(mixed $value, string $path, string $label): string
    {
        $value = $this->nonEmptyString($value, $path, $label);

        if (str_contains($value, '://')
            || str_contains($value, '/')
            || str_contains($value, '\\')
            || str_contains($value, '.')
            || preg_match('/^[A-Za-z][A-Za-z0-9:_-]*$/D', $value) !== 1) {
            throw ManifestException::at(
                'invalid_manifest_alias',
                $path,
                sprintf('%s must be a registered alias, not a path, URL, import, or class name.', $label),
            );
        }

        return $value;
    }

    private function nullableString(mixed $value, string $path, string $label): ?string
    {
        if ($value === null) {
            return null;
        }

        return $this->nonEmptyString($value, $path, $label);
    }

    private function nonEmptyString(mixed $value, string $path, string $label): string
    {
        if (! is_string($value) || trim($value) === '') {
            throw ManifestException::at(
                'invalid_manifest_string',
                $path,
                sprintf('%s must be a non-empty string.', $label),
            );
        }

        return $value;
    }
}
