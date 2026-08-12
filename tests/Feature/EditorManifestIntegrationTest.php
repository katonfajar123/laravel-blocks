<?php

use KatonFajar\LaravelBlocks\Blocks\Block;
use KatonFajar\LaravelBlocks\Blocks\BlockSchema;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks as LaravelBlocksFacade;
use KatonFajar\LaravelBlocks\LaravelBlocks;
use KatonFajar\LaravelBlocks\Manifest\Contracts\ProvidesEditorManifestField;
use KatonFajar\LaravelBlocks\Manifest\EditorManifest;
use KatonFajar\LaravelBlocks\Manifest\EditorManifestGenerator;
use KatonFajar\LaravelBlocks\Manifest\Exceptions\ManifestException;
use KatonFajar\LaravelBlocks\Validation\AttributeRule;

beforeEach(function (): void {
    config()->set('laravel-blocks.blocks', []);
});

it('generates the frozen editor manifest envelope in deterministic registry order', function (): void {
    $hero = new class extends Block
    {
        public function name(): string
        {
            return 'hero';
        }

        public function label(): string
        {
            return 'Hero';
        }

        public function view(): string
        {
            return 'fixtures::hero';
        }

        public function description(): ?string
        {
            return 'A prominent hero section.';
        }

        public function category(): string
        {
            return 'design';
        }

        public function keywords(): array
        {
            return ['landing', 'headline'];
        }

        public function icon(): ?string
        {
            return 'layout';
        }

        public function fields(): array
        {
            return [
                [
                    'name' => 'heading',
                    'type' => 'text',
                    'help' => 'Shown as the primary headline.',
                    'ui' => [
                        'placeholder' => 'Write a headline',
                    ],
                ],
                [
                    'name' => 'style',
                    'type' => 'select',
                    'group' => 'design',
                    'label' => 'Style',
                    'default' => 'primary',
                    'constraints' => [
                        'allowedValues' => ['primary', 'dark'],
                    ],
                ],
            ];
        }

        public function supports(): array
        {
            return [
                'multiple' => false,
                'design' => [
                    'color' => true,
                ],
                'advanced' => [
                    'anchor' => true,
                    'className' => true,
                ],
            ];
        }

        public function schema(): BlockSchema
        {
            return new BlockSchema(
                attributes: [
                    'heading' => AttributeRule::string(required: true, maximumLength: 150),
                ],
            );
        }
    };

    $card = new class extends Block
    {
        public function name(): string
        {
            return 'featureCard';
        }

        public function label(): string
        {
            return 'Feature Card';
        }

        public function view(): string
        {
            return 'fixtures::feature-card';
        }

        public function category(): string
        {
            return 'design';
        }
    };

    $quote = new class extends Block
    {
        public function name(): string
        {
            return 'quote';
        }

        public function label(): string
        {
            return 'Quote';
        }

        public function view(): string
        {
            return 'fixtures::quote';
        }

        public function category(): string
        {
            return 'text';
        }
    };

    LaravelBlocksFacade::register([$hero, $card, $quote]);

    $manifest = LaravelBlocksFacade::editorManifest();

    expect($manifest)
        ->toBeInstanceOf(EditorManifest::class)
        ->and($manifest->toArray())
        ->toBe([
            'manifestVersion' => 1,
            'documentSchemaVersion' => 1,
            'categories' => [
                [
                    'name' => 'design',
                    'label' => 'Design',
                ],
                [
                    'name' => 'text',
                    'label' => 'Text',
                ],
            ],
            'blocks' => [
                [
                    'name' => 'hero',
                    'label' => 'Hero',
                    'description' => 'A prominent hero section.',
                    'category' => 'design',
                    'keywords' => ['landing', 'headline'],
                    'icon' => 'layout',
                    'fields' => [
                        [
                            'name' => 'heading',
                            'path' => 'attrs.heading',
                            'type' => 'text',
                            'group' => 'content',
                            'label' => 'Heading',
                            'help' => 'Shown as the primary headline.',
                            'default' => null,
                            'required' => true,
                            'constraints' => [
                                'maxLength' => 150,
                            ],
                            'ui' => [
                                'placeholder' => 'Write a headline',
                            ],
                        ],
                        [
                            'name' => 'style',
                            'path' => 'attrs.design.style',
                            'type' => 'select',
                            'group' => 'design',
                            'label' => 'Style',
                            'help' => null,
                            'default' => 'primary',
                            'required' => false,
                            'constraints' => [
                                'allowedValues' => ['primary', 'dark'],
                            ],
                            'ui' => [],
                        ],
                    ],
                    'supports' => [
                        'inserter' => true,
                        'multiple' => false,
                        'reusable' => true,
                        'design' => [
                            'color' => true,
                        ],
                        'advanced' => [
                            'anchor' => true,
                            'className' => true,
                        ],
                    ],
                    'editor' => [
                        'mode' => 'generated',
                        'component' => null,
                    ],
                ],
                [
                    'name' => 'featureCard',
                    'label' => 'Feature Card',
                    'description' => null,
                    'category' => 'design',
                    'keywords' => [],
                    'icon' => null,
                    'fields' => [],
                    'supports' => [
                        'inserter' => true,
                        'multiple' => true,
                        'reusable' => true,
                        'design' => [],
                        'advanced' => [],
                    ],
                    'editor' => [
                        'mode' => 'generated',
                        'component' => null,
                    ],
                ],
                [
                    'name' => 'quote',
                    'label' => 'Quote',
                    'description' => null,
                    'category' => 'text',
                    'keywords' => [],
                    'icon' => null,
                    'fields' => [],
                    'supports' => [
                        'inserter' => true,
                        'multiple' => true,
                        'reusable' => true,
                        'design' => [],
                        'advanced' => [],
                    ],
                    'editor' => [
                        'mode' => 'generated',
                        'component' => null,
                    ],
                ],
            ],
        ]);

    $json = $manifest->toJson();

    expect($json)
        ->toContain('"manifestVersion":1')
        ->toContain('"documentSchemaVersion":1')
        ->toContain('"design":{}')
        ->toContain('"advanced":{}')
        ->toContain('"ui":{}')
        ->not->toContain('fixtures::')
        ->not->toContain('EditorManifestIntegrationTest');

    expect(json_encode($manifest, JSON_THROW_ON_ERROR))
        ->toBe($json);
});

it('accepts field manifest provider objects and custom editor component aliases', function (): void {
    $field = new class implements ProvidesEditorManifestField
    {
        public function toEditorManifest(): array
        {
            return [
                'name' => 'summary',
                'type' => 'textarea',
                'required' => true,
            ];
        }
    };

    $block = new class($field) extends Block
    {
        public function __construct(private readonly ProvidesEditorManifestField $field) {}

        public function name(): string
        {
            return 'pricingTable';
        }

        public function label(): string
        {
            return 'Pricing Table';
        }

        public function view(): string
        {
            return 'fixtures::pricing-table';
        }

        public function fields(): array
        {
            return [$this->field];
        }

        public function editorComponent(): ?string
        {
            return 'PricingTableEditor';
        }
    };

    LaravelBlocksFacade::register($block);

    $blockManifest = LaravelBlocksFacade::editorManifest()->toArray()['blocks'][0];

    expect($blockManifest['fields'][0])
        ->toMatchArray([
            'name' => 'summary',
            'path' => 'attrs.summary',
            'type' => 'textarea',
            'group' => 'content',
            'label' => 'Summary',
            'required' => true,
        ])
        ->and($blockManifest['editor'])
        ->toBe([
            'mode' => 'component',
            'component' => 'PricingTableEditor',
        ]);
});

it('shares manifest generation through the container service and facade', function (): void {
    LaravelBlocksFacade::register(new class extends Block
    {
        public function name(): string
        {
            return 'paragraph';
        }

        public function label(): string
        {
            return 'Paragraph';
        }

        public function view(): string
        {
            return 'fixtures::paragraph';
        }
    });

    $service = $this->app->make(LaravelBlocks::class);
    $generator = $this->app->make(EditorManifestGenerator::class);

    expect($service->editorManifest()->toArray())
        ->toBe($generator->generate()->toArray())
        ->toBe(LaravelBlocksFacade::editorManifest()->toArray());
});

it('fails loudly for unsupported field definitions', function (): void {
    LaravelBlocksFacade::register(new class extends Block
    {
        public function name(): string
        {
            return 'brokenBlock';
        }

        public function label(): string
        {
            return 'Broken Block';
        }

        public function view(): string
        {
            return 'fixtures::broken';
        }

        public function fields(): array
        {
            return [(object) ['name' => 'bad']];
        }
    });

    try {
        LaravelBlocksFacade::editorManifest();
    } catch (ManifestException $exception) {
        expect($exception->reason())
            ->toBe('unsupported_manifest_field')
            ->and($exception->manifestPath())
            ->toBe('$.blocks[0].fields[0]');

        return;
    }

    throw new RuntimeException('Expected manifest generation to fail.');
});

it('rejects non-serializable manifest values instead of exposing callbacks', function (): void {
    LaravelBlocksFacade::register(new class extends Block
    {
        public function name(): string
        {
            return 'unsafeBlock';
        }

        public function label(): string
        {
            return 'Unsafe Block';
        }

        public function view(): string
        {
            return 'fixtures::unsafe';
        }

        public function fields(): array
        {
            return [[
                'name' => 'heading',
                'type' => 'text',
                'ui' => [
                    'resolver' => static fn (): string => 'secret',
                ],
            ]];
        }
    });

    try {
        LaravelBlocksFacade::editorManifest();
    } catch (ManifestException $exception) {
        expect($exception->reason())
            ->toBe('non_serializable_manifest_value')
            ->and($exception->manifestPath())
            ->toBe('$.blocks[0].fields[0].ui.resolver');

        return;
    }

    throw new RuntimeException('Expected manifest generation to fail.');
});

it('rejects arbitrary component URLs and paths in custom editor mode', function (): void {
    LaravelBlocksFacade::register(new class extends Block
    {
        public function name(): string
        {
            return 'externalEditor';
        }

        public function label(): string
        {
            return 'External Editor';
        }

        public function view(): string
        {
            return 'fixtures::external';
        }

        public function editorComponent(): ?string
        {
            return 'https://example.test/editor.js';
        }
    });

    try {
        LaravelBlocksFacade::editorManifest();
    } catch (ManifestException $exception) {
        expect($exception->reason())
            ->toBe('invalid_manifest_alias')
            ->and($exception->manifestPath())
            ->toBe('$.blocks[0].editor.component');

        return;
    }

    throw new RuntimeException('Expected manifest generation to fail.');
});
