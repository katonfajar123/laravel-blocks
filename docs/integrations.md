# Integrations

## Core boundary

The core package is Laravel-native but frontend-stack neutral for consuming applications. It MUST NOT require Filament, Livewire, Inertia, or Tailwind.

The internal editor uses Vue 3 because it ships as precompiled package infrastructure. The default editor MUST NOT require the host application's views or build pipeline to install Node.js, npm dependencies, Vue, Tiptap, ProseMirror, or configure Vite.

## Blade

Blade is part of the core integration:

```blade
<x-laravel-blocks::editor
    name="content"
    :value="$post->content"
/>

<x-laravel-blocks::content
    :content="$post->content"
/>
```

The editor, assets, and content Blade components are package-owned surfaces. They are registered as class-based components and are not a supported application view override API.

Custom PHP blocks may point at application Blade views, and frontend block renderer views may be published and overridden under the documented block-view path.

## Livewire

A future `katonfajar/laravel-blocks-livewire` adapter may provide:

- a Livewire-compatible field wrapper;
- controlled document synchronization;
- upload integration;
- validation-error mapping;
- lifecycle behavior that avoids reinitializing the editor on every render.

The core editor should expose a stable DOM/event bridge so this adapter does not import private Vue internals.

## Filament

A future `katonfajar/laravel-blocks-filament` adapter may provide a form field, table display, validation integration, and resource-page asset loading.

Filament-specific concepts MUST remain outside core. The adapter should compose the documented editor contract rather than subclass package internals.

## Inertia

Inertia applications can initially use server-rendered form endpoints or a documented JavaScript mounting API. A future adapter may improve controlled value binding and validation handling, but core does not assume an Inertia page protocol.

## Headless and API clients

Canonical JSON can be returned through application APIs. Laravel Blocks should provide schema validation and optional normalization resources, but the application owns authentication, authorization, version negotiation, and response design.

Blade component and Eloquent dynamic blocks are server concepts. Non-Laravel clients need either:

- rendered HTML from the Laravel API;
- a client renderer registered for those node types;
- a domain-specific JSON projection.

The package must not imply that every PHP custom block is automatically portable to a mobile or JavaScript client.

## Media providers

Media adapters implement the core media contract and may live in separate packages. Documents may store normalized provider URLs or stable references according to the adapter, while applications remain responsible for migrating provider-specific values.

## CSS integration

Core SHOULD ship namespaced editor styles and semantic renderer markup. It must not assume Tailwind classes in public block views. Applications can override frontend block views or map configured design tokens to their own design system. Editor control classes are package internals and are not a supported CSS customization contract.

## Adapter readiness criteria

Work on first-party ecosystem adapters should start only after core has stable contracts for:

- editor mounting and value changes;
- validation errors;
- asset discovery;
- media browsing and upload;
- block registration;
- content rendering.

Building adapters earlier would freeze accidental internal APIs.
