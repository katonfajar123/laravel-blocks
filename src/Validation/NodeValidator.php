<?php

namespace KatonFajar\LaravelBlocks\Validation;

use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

final readonly class NodeValidator
{
    public function __construct(
        private BlockRegistry $blocks,
        private AttributeValidator $attributes,
        private MarkValidator $marks,
    ) {}

    public function validate(
        mixed $node,
        string $parentType,
        ?BlockSchema $parentSchema,
        string $path,
        int $depth,
        ValidationContext $context,
    ): void {
        $context->enterNode($depth, $path);
        $node = $this->nodeObject($node, $path);
        $type = $this->nodeType($node, $path);

        if ($type === 'text') {
            $this->validateText($node, $parentSchema, $path, $context);

            return;
        }

        if ($type === 'doc') {
            throw DocumentValidationException::at(
                'reserved_node_type',
                $path.'.type',
                'The document root cannot be nested as a block node.',
            );
        }

        $this->validateBlock($node, $type, $parentType, $path, $depth, $context);
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function validateBlock(
        array $node,
        string $type,
        string $parentType,
        string $path,
        int $depth,
        ValidationContext $context,
    ): void {
        $this->rejectUnexpectedKeys($node, ['type', 'attrs', 'content'], $path, 'node');

        if (! $this->blocks->has($type)) {
            throw DocumentValidationException::at(
                'unknown_node_type',
                $path.'.type',
                'Node type is not registered.',
            );
        }

        $schema = $this->blocks->get($type)->schema();

        if ($schema->allowedParents !== null
            && ! in_array($parentType, $schema->allowedParents, true)) {
            throw DocumentValidationException::at(
                'parent_not_allowed',
                $path.'.type',
                'Node is not allowed inside its parent.',
            );
        }

        $this->attributes->validate(
            $node['attrs'] ?? [],
            $schema->attributes,
            $path.'.attrs',
            $context->limits->maximumAttributeBytes,
        );

        $content = $node['content'] ?? [];

        if (! is_array($content) || ! array_is_list($content)) {
            throw DocumentValidationException::at(
                'invalid_content',
                $path.'.content',
                'Node content must be an ordered array.',
            );
        }

        $children = count($content);

        if ($children < $schema->minimumChildren) {
            throw DocumentValidationException::at(
                'minimum_children_not_met',
                $path.'.content',
                'Node has fewer children than its schema requires.',
            );
        }

        if ($schema->maximumChildren !== null && $children > $schema->maximumChildren) {
            throw DocumentValidationException::at(
                'maximum_children_exceeded',
                $path.'.content',
                'Node has more children than its schema allows.',
            );
        }

        foreach ($content as $index => $child) {
            $childPath = sprintf('%s.content[%d]', $path, $index);
            $childObject = $this->nodeObject($child, $childPath);
            $childType = $this->nodeType($childObject, $childPath);

            if ($schema->allowedChildren !== null
                && ! in_array($childType, $schema->allowedChildren, true)) {
                throw DocumentValidationException::at(
                    'child_not_allowed',
                    $childPath.'.type',
                    'Child node is not allowed by its parent schema.',
                );
            }

            $this->validate(
                $childObject,
                $type,
                $schema,
                $childPath,
                $depth + 1,
                $context,
            );
        }
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function validateText(
        array $node,
        ?BlockSchema $parentSchema,
        string $path,
        ValidationContext $context,
    ): void {
        $this->rejectUnexpectedKeys($node, ['type', 'text', 'marks'], $path, 'text node');

        if ($parentSchema === null) {
            throw DocumentValidationException::at(
                'child_not_allowed',
                $path.'.type',
                'Text nodes cannot be direct document children.',
            );
        }

        $text = $node['text'] ?? null;

        if (! is_string($text) || $text === '') {
            throw DocumentValidationException::at(
                'invalid_text',
                $path.'.text',
                'Text node content must be a non-empty string.',
            );
        }

        $context->addTextBytes(strlen($text), $path.'.text');
        $this->marks->validate(
            $node['marks'] ?? [],
            $parentSchema->allowedMarks,
            $path.'.marks',
            $context->limits->maximumAttributeBytes,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function nodeObject(mixed $node, string $path): array
    {
        if (! is_array($node) || $node === [] || array_is_list($node)) {
            throw DocumentValidationException::at(
                'invalid_node',
                $path,
                'Each document node must be an object.',
            );
        }

        $normalized = [];

        foreach ($node as $key => $value) {
            if (! is_string($key)) {
                throw DocumentValidationException::at(
                    'invalid_node',
                    $path,
                    'Document node keys must be strings.',
                );
            }

            $normalized[$key] = $value;
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function nodeType(array $node, string $path): string
    {
        $type = $node['type'] ?? null;

        if (! is_string($type) || preg_match('/^[a-z][A-Za-z0-9]*$/D', $type) !== 1) {
            throw DocumentValidationException::at(
                'invalid_node_type',
                $path.'.type',
                'Node type must be a stable lower-camel identifier.',
            );
        }

        return $type;
    }

    /**
     * @param  array<string, mixed>  $value
     * @param  list<string>  $allowed
     */
    private function rejectUnexpectedKeys(
        array $value,
        array $allowed,
        string $path,
        string $subject,
    ): void {
        foreach (array_keys($value) as $key) {
            if (! in_array($key, $allowed, true)) {
                throw DocumentValidationException::at(
                    'unexpected_node_key',
                    $path.'.'.$key,
                    ucfirst($subject).' contains an unsupported key.',
                );
            }
        }
    }
}
