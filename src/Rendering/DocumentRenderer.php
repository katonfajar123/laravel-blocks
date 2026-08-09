<?php

namespace KatonFajar\LaravelBlocks\Rendering;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\View\Factory as ViewFactory;
use JsonException;
use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockRegistry;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Blocks\Exceptions\UnknownBlockException;
use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Rendering\Exceptions\BlockRenderException;
use KatonFajar\LaravelBlocks\Validation\AttributeValidator;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;
use KatonFajar\LaravelBlocks\Validation\MarkValidator;
use KatonFajar\LaravelBlocks\Validation\ValidationContext;
use KatonFajar\LaravelBlocks\Validation\ValidationLimits;
use Throwable;

final readonly class DocumentRenderer
{
    public function __construct(
        private Repository $config,
        private ViewFactory $views,
        private BlockRegistry $blocks,
        private AttributeValidator $attributes,
        private MarkValidator $marks,
        private ValidationLimits $limits,
    ) {}

    /**
     * @param  array<array-key, mixed>|string|Document|null  $value
     */
    public function render(array|string|Document|null $value, ?RenderContext $context = null): RenderedContent
    {
        $this->assertRawDocumentBytes($value);

        $document = $value instanceof Document ? $value : Document::from($value);
        $this->assertCanonicalDocumentBytes($document);

        $policy = $context?->unknownBlockPolicy()
            ?? UnknownBlockPolicy::fromConfiguredValue($this->config->get('laravel-blocks.document.unknown_blocks'));

        $validation = new ValidationContext($this->limits);

        return new RenderedContent($this->renderCheckedChildren(
            $document->toArray()['content'],
            'doc',
            null,
            '$',
            1,
            $validation,
            $policy,
        ));
    }

    /**
     * @param  list<mixed>  $children
     */
    private function renderCheckedChildren(
        array $children,
        string $parentType,
        ?BlockSchema $parentSchema,
        string $parentPath,
        int $depth,
        ValidationContext $context,
        UnknownBlockPolicy $policy,
    ): string {
        $html = '';

        foreach ($children as $index => $child) {
            $html .= $this->renderCheckedNode(
                $child,
                $parentType,
                $parentSchema,
                sprintf('%s.content[%d]', $parentPath, $index),
                $depth,
                $context,
                $policy,
            );
        }

        return $html;
    }

    private function renderCheckedNode(
        mixed $node,
        string $parentType,
        ?BlockSchema $parentSchema,
        string $path,
        int $depth,
        ValidationContext $context,
        UnknownBlockPolicy $policy,
    ): string {
        $context->enterNode($depth, $path);
        $node = $this->nodeObject($node, $path);
        $type = $this->nodeType($node, $path);

        if ($type === 'text') {
            $this->validateText($node, $parentSchema, $path, $context);

            return $this->renderText($node);
        }

        if ($type === 'doc') {
            throw DocumentValidationException::at(
                'reserved_node_type',
                $path.'.type',
                'The document root cannot be nested as a block node.',
            );
        }

        if (! $this->blocks->has($type)) {
            if ($policy === UnknownBlockPolicy::THROW) {
                throw new UnknownBlockException($type, $path);
            }

            $this->validateUnknownNode($node, $path, $depth, $context);

            return $policy === UnknownBlockPolicy::PLACEHOLDER
                ? $this->renderUnknownPlaceholder($type, $path)
                : '';
        }

        $block = $this->blocks->get($type);
        $schema = $block->schema();
        $children = $this->validateKnownBlock($node, $type, $parentType, $parentSchema, $schema, $path, $context);
        $content = $this->renderCheckedChildren($children, $type, $schema, $path, $depth + 1, $context, $policy);

        return $this->renderBlockView($block, $node, $path, $content);
    }

    /**
     * @param  array<string, mixed>  $node
     * @return list<mixed>
     */
    private function validateKnownBlock(
        array $node,
        string $type,
        string $parentType,
        ?BlockSchema $parentSchema,
        BlockSchema $schema,
        string $path,
        ValidationContext $context,
    ): array {
        $this->rejectUnexpectedKeys($node, ['type', 'attrs', 'content'], $path, 'node');

        if ($parentSchema !== null
            && $parentSchema->allowedChildren !== null
            && ! in_array($type, $parentSchema->allowedChildren, true)) {
            throw DocumentValidationException::at(
                'child_not_allowed',
                $path.'.type',
                'Child node is not allowed by its parent schema.',
            );
        }

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
        }

        return $content;
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
     * @param  array<string, mixed>  $node
     */
    private function validateUnknownNode(array $node, string $path, int $depth, ValidationContext $context): void
    {
        $this->rejectUnexpectedKeys($node, ['type', 'attrs', 'content'], $path, 'node');
        $this->validateUnknownAttributes($node['attrs'] ?? [], $path.'.attrs');

        $content = $node['content'] ?? [];

        if (! is_array($content) || ! array_is_list($content)) {
            throw DocumentValidationException::at(
                'invalid_content',
                $path.'.content',
                'Node content must be an ordered array.',
            );
        }

        foreach ($content as $index => $child) {
            $childPath = sprintf('%s.content[%d]', $path, $index);
            $context->enterNode($depth + 1, $childPath);
            $child = $this->nodeObject($child, $childPath);
            $childType = $this->nodeType($child, $childPath);

            if ($childType === 'text') {
                $this->validateUnknownText($child, $childPath, $context);

                continue;
            }

            if ($childType === 'doc') {
                throw DocumentValidationException::at(
                    'reserved_node_type',
                    $childPath.'.type',
                    'The document root cannot be nested as a block node.',
                );
            }

            $this->validateUnknownNode($child, $childPath, $depth + 1, $context);
        }
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function validateUnknownText(array $node, string $path, ValidationContext $context): void
    {
        $this->rejectUnexpectedKeys($node, ['type', 'text', 'marks'], $path, 'text node');

        $text = $node['text'] ?? null;

        if (! is_string($text) || $text === '') {
            throw DocumentValidationException::at(
                'invalid_text',
                $path.'.text',
                'Text node content must be a non-empty string.',
            );
        }

        $context->addTextBytes(strlen($text), $path.'.text');
        $this->validateUnknownMarks($node['marks'] ?? [], $path.'.marks');
    }

    private function validateUnknownAttributes(mixed $attributes, string $path): void
    {
        if (! is_array($attributes) || ($attributes !== [] && array_is_list($attributes))) {
            throw DocumentValidationException::at(
                'invalid_attributes',
                $path,
                'Attributes must be an object.',
            );
        }

        foreach (array_keys($attributes) as $key) {
            if (! is_string($key)) {
                throw DocumentValidationException::at(
                    'invalid_attributes',
                    $path,
                    'Attribute keys must be strings.',
                );
            }
        }

        try {
            $encoded = json_encode($attributes, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw DocumentValidationException::at(
                'invalid_attributes',
                $path,
                'Attributes must be JSON-serializable.',
            );
        }

        if (strlen($encoded) > $this->limits->maximumAttributeBytes) {
            throw DocumentValidationException::at(
                'maximum_attribute_bytes_exceeded',
                $path,
                'Attributes exceed the configured byte limit.',
            );
        }
    }

    private function validateUnknownMarks(mixed $marks, string $path): void
    {
        if ($marks === []) {
            return;
        }

        if (! is_array($marks) || ! array_is_list($marks)) {
            throw DocumentValidationException::at(
                'invalid_marks',
                $path,
                'Marks must be an ordered array.',
            );
        }

        foreach ($marks as $index => $mark) {
            $markPath = sprintf('%s[%d]', $path, $index);

            if (! is_array($mark) || $mark === [] || array_is_list($mark)) {
                throw DocumentValidationException::at(
                    'invalid_mark',
                    $markPath,
                    'Each mark must be an object.',
                );
            }

            $markObject = [];

            foreach ($mark as $key => $value) {
                if (! is_string($key)) {
                    throw DocumentValidationException::at(
                        'invalid_mark',
                        $markPath,
                        'Mark keys must be strings.',
                    );
                }

                $markObject[$key] = $value;
            }

            $this->rejectUnexpectedKeys($markObject, ['type', 'attrs'], $markPath, 'mark');
            $markType = $markObject['type'] ?? null;

            if (! is_string($markType) || preg_match('/^[a-z][A-Za-z0-9]*$/D', $markType) !== 1) {
                throw DocumentValidationException::at(
                    'invalid_mark_type',
                    $markPath.'.type',
                    'Mark type must be a stable lower-camel identifier.',
                );
            }

            $this->validateUnknownAttributes($markObject['attrs'] ?? [], $markPath.'.attrs');
        }
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function renderBlockView(Block $block, array $node, string $path, string $content): string
    {
        $attributes = isset($node['attrs']) && is_array($node['attrs']) && ! array_is_list($node['attrs'])
            ? $node['attrs']
            : [];

        try {
            return $this->views->make($block->view(), [
                'attrs' => $attributes,
                'attributes' => $attributes,
                'content' => new RenderedContent($content),
                'node' => $node,
                'block' => $block->metadata(),
            ])->render();
        } catch (Throwable $exception) {
            throw new BlockRenderException($block->name(), $path, $exception);
        }
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function renderText(array $node): string
    {
        $text = $node['text'] ?? '';

        return e(is_string($text) ? $text : '');
    }

    private function renderUnknownPlaceholder(string $type, string $path): string
    {
        return sprintf(
            '<div data-laravel-blocks-unknown-block="%s" data-laravel-blocks-node-path="%s"></div>',
            e($type),
            e($path),
        );
    }

    private function assertRawDocumentBytes(mixed $value): void
    {
        if (is_string($value) && strlen($value) > $this->limits->maximumBytes) {
            $this->documentTooLarge();
        }
    }

    private function assertCanonicalDocumentBytes(Document $document): void
    {
        if (strlen($document->toJson()) > $this->limits->maximumBytes) {
            $this->documentTooLarge();
        }
    }

    private function documentTooLarge(): never
    {
        throw DocumentValidationException::at(
            'maximum_document_bytes_exceeded',
            '$',
            'Document exceeds the configured byte limit.',
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
