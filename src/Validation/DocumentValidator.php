<?php

namespace KatonFajar\LaravelBlocks\Validation;

use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Validation\Exceptions\DocumentValidationException;

final readonly class DocumentValidator
{
    public function __construct(
        private NodeValidator $nodes,
        private ValidationLimits $limits,
    ) {}

    /**
     * @param  array<array-key, mixed>|string|Document|null  $value
     */
    public function validate(array|string|Document|null $value): Document
    {
        if (is_string($value) && strlen($value) > $this->limits->maximumBytes) {
            $this->documentTooLarge();
        }

        $document = $value instanceof Document ? $value : Document::from($value);

        if (strlen($document->toJson()) > $this->limits->maximumBytes) {
            $this->documentTooLarge();
        }

        $context = new ValidationContext($this->limits);

        foreach ($document->toArray()['content'] as $index => $node) {
            $this->nodes->validate(
                $node,
                'doc',
                null,
                sprintf('$.content[%d]', $index),
                1,
                $context,
            );
        }

        return $document;
    }

    private function documentTooLarge(): never
    {
        throw DocumentValidationException::at(
            'maximum_document_bytes_exceeded',
            '$',
            'Document exceeds the configured byte limit.',
        );
    }
}
