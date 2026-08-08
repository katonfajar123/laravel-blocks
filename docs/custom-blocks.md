# Custom blocks

## Goal

An application developer MUST be able to create a normal custom block in PHP and Blade without writing Vue. Laravel Blocks generates its Inserter entry, editable preview, Content/Design/Advanced Inspector controls, validation feedback, serialization, and frontend rendering from the registered block and field definitions.

Advanced blocks MAY provide a registered custom Tiptap extension or Vue NodeView, but that is an explicit escape hatch rather than the basic workflow.

## Generate a block

Target command:

```bash
php artisan make:block Hero
```

Proposed generated class:

```php
namespace App\Blocks;

use KatonFajar\LaravelBlocks\Block;
use KatonFajar\LaravelBlocks\Fields\Media;
use KatonFajar\LaravelBlocks\Fields\Text;
use KatonFajar\LaravelBlocks\Fields\Textarea;

class HeroBlock extends Block
{
    public function name(): string
    {
        return 'hero';
    }

    public function label(): string
    {
        return 'Hero';
    }

    public function category(): string
    {
        return 'design';
    }

    public function fields(): array
    {
        return [
            Text::make('heading')
                ->required()
                ->maxLength(150),

            Textarea::make('description'),

            Media::make('image')
                ->accept('image/*'),

            Text::make('button_text'),

            Text::make('button_url'),
        ];
    }

    public function view(): string
    {
        return 'blocks.hero';
    }
}
```

The abstract `Block` base-class direction and method-based metadata surface are frozen by B00. `name()`, `label()`, and `view()` are required; `description()`, `category()`, `keywords()`, `icon()`, `fields()`, `supports()`, and `editorComponent()` provide shared defaults. B03 may refine additive signatures without replacing the base class or changing persisted node names.

## Render view

```blade
<section class="hero">
    @if ($image)
        <img src="{{ $image->url }}" alt="{{ $image->alt }}">
    @endif

    <h2>{{ $heading }}</h2>

    @if ($description)
        <p>{{ $description }}</p>
    @endif

    @if ($button_text && $button_url)
        <a href="{{ $button_url }}">{{ $button_text }}</a>
    @endif
</section>
```

Values exposed to a view must already be normalized and validated. Blade escaping remains the default. Blocks should not expect raw document attributes to be trusted.

## Register a block

Target registration from an application service provider:

```php
use App\Blocks\HeroBlock;
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks;

public function boot(): void
{
    LaravelBlocks::register(HeroBlock::class);
}
```

Batch registration:

```php
LaravelBlocks::register([
    HeroBlock::class,
    ProductCardBlock::class,
]);
```

Registration MUST fail clearly when two blocks claim the same stable node name. Replacing a built-in block, if supported, must use a separate explicit API.

## Field engine

Planned field types:

| Field | Typical value |
| --- | --- |
| Text | Single-line string |
| Textarea | Multi-line plain text |
| Number | Integer or decimal |
| URL | Validated URL |
| Email | Validated email address |
| Select | One allow-listed value |
| Radio | One visible allow-listed value |
| Checkbox | Boolean or explicitly modeled choices |
| Toggle | Boolean |
| Range | Bounded numeric value |
| Color | Design-token reference or allowed color |
| Date | Date string with documented timezone semantics |
| Datetime | Date-time with documented timezone semantics |
| Media | Provider URL or stable managed-media reference |
| Gallery | Ordered provider URLs or managed-media references |
| Icon | Registered icon reference |
| Relation | Stable application record reference |
| Repeater | Ordered homogeneous field groups |
| Group | Nested named fields |
| RichText | Constrained nested rich text |
| Code | Plain code string and optional language identifier |

Each field MUST be able to produce:

- editor metadata;
- a default value;
- server validation rules;
- normalization and serialization behavior;
- a safe rendering value;
- localized labels, help text, and errors.

Each Field MUST serialize declarative metadata into Editor Manifest v1 and resolve through a precompiled field-control registry. Content fields default to direct semantic attribute paths; shared supports generate Design and Advanced controls. A missing field renderer is an editor initialization error, never a silently omitted setting. Server validation remains authoritative; client constraints are feedback hints.

Conditional visibility in the editor must not replace server validation. Hidden values need an explicit preservation or clearing policy.

## Blade component blocks

Blade component blocks expose application-registered components in the editor.

Target registration:

```php
use App\Models\Product;
use KatonFajar\LaravelBlocks\Blocks\BladeComponentBlock;
use KatonFajar\LaravelBlocks\Fields\ModelSelect;

LaravelBlocks::register(
    BladeComponentBlock::make('product-card')
        ->label('Product Card')
        ->component('product-card')
        ->fields([
            ModelSelect::make('product')
                ->model(Product::class),
        ]),
);
```

Stored node:

```json
{
  "type": "bladeComponent",
  "attrs": {
    "component": "product-card",
    "props": {
      "product": 82
    },
    "design": {},
    "advanced": {}
  }
}
```

Only components registered by application code may render. A document MUST NOT be allowed to choose an arbitrary component name, class, model class, or view path.

Relation fields store stable identifiers. The renderer resolves records through the registered field definition, applies authorization or visibility policy, and defines behavior for missing records.

## Dynamic blocks

Dynamic blocks store configuration and resolve current server data while rendering.

Conceptual registration:

```php
use App\Models\Property;
use KatonFajar\LaravelBlocks\Blocks\DynamicBlock;
use KatonFajar\LaravelBlocks\Fields\Number;
use KatonFajar\LaravelBlocks\Fields\Select;

LaravelBlocks::register(
    DynamicBlock::make('latest-properties')
        ->label('Latest Properties')
        ->fields([
            Number::make('limit')
                ->default(6)
                ->min(1)
                ->max(24),

            Select::make('type')
                ->options([
                    'house' => 'House',
                    'apartment' => 'Apartment',
                ]),
        ])
        ->renderUsing(function (array $data) {
            return Property::query()
                ->where('type', $data['type'])
                ->latest()
                ->limit($data['limit'])
                ->get();
        }),
);
```

The callback is registered in executable application code, never serialized into config or content JSON. Inputs MUST be bounded and used through predefined query logic.

Dynamic blocks need explicit policies for:

- preview authorization;
- missing data;
- query limits and eager loading;
- renderer cache keys and invalidation;
- queue or request contexts where authentication is absent;
- API/headless representations.

## Nested custom blocks

A container block must declare its content model. The eventual API should express allowed child node groups without requiring application developers to write raw ProseMirror schema strings for ordinary cases.

Conceptual example:

```php
class FeatureGridBlock extends Block
{
    public function accepts(): array
    {
        return [FeatureCardBlock::class];
    }

    public function minChildren(): int
    {
        return 1;
    }
}
```

The actual nesting API is an **open decision for `0.4`**.

## Advanced JavaScript extension

Some blocks require bespoke interactive editing. `editorComponent()` MAY return a registered component alias such as `PricingTableEditor`. The manifest then declares `editor.mode = component` and that alias; it MUST NOT contain a filesystem path, arbitrary URL, module import, PHP class, or executable callback.

When `editorComponent()` returns `null`, Laravel Blocks uses its precompiled generic NodeView and generated Inspector. A custom NodeView replaces only the canvas presentation. It MUST keep the PHP registry's stable node name, shared command layer, manifest, attribute schema, validation, and serialization contracts; the generated Inspector remains active unless a later explicit Inspector-extension contract is introduced.

Package component aliases ship inside the Composer bundle. Application-authored aliases are an advanced opt-in and may require host build integration, but that exception MUST NOT weaken the no-Node/no-Vite contract for the default editor or normal PHP blocks.
