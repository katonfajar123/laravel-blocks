# Laravel Blocks documentation

This directory is the current source of truth for the intended Laravel Blocks product and engineering contracts.

> [!NOTE]
> Laravel Blocks does not have an editor release yet. The package foundation, canonical document boundary, block registry, schema validator, Blade renderer, PHP-to-editor manifest bridge, precompiled asset distribution boundary, minimal editor shell, internal selection/command layer, first UI primitive/Popover infrastructure, first visible rich-text toolbar, and basic link popover are implemented; examples marked **Target API** remain design contracts until their owning milestone lands.

## Start here

| Document | Purpose |
| --- | --- |
| [Product definition](product.md) | Positioning, audience, goals, non-goals, and principles |
| [Compatibility](compatibility.md) | Supported Laravel/PHP versions, Composer constraints, and CI matrix |
| [Architecture](architecture.md) | System boundaries, runtime layers, dependencies, and repository layout |
| [Fundamental decisions](fundamental-decisions.md) | Contracts frozen by B00 before implementation |
| [Document schema](document-schema.md) | Canonical JSON rules, node contracts, nesting, and compatibility |
| [Editor UX contract](editor-ux-contract.md) | Mandatory complete-editor behavior, UI primitives, interactions, and asset delivery |
| [Design principles](design-principles.md) | Independent visual identity, UI principles, and design-token ownership |
| [Roadmap](roadmap.md) | Incremental milestones from `0.1` through `1.0` |

## User guides

| Document | Purpose |
| --- | --- |
| [Installation and quick start](installation.md) | Intended install, persistence, form, and rendering flow |
| [Editor](editor.md) | Editor behavior, controls, formatting, modes, and accessibility |
| [Built-in blocks](blocks.md) | The planned catalog of 50 core blocks |
| [Configuration](configuration.md) | Proposed package configuration and design tokens |

## Extension guides

| Document | Purpose |
| --- | --- |
| [Custom blocks](custom-blocks.md) | PHP block API, fields, Blade components, and dynamic blocks |
| [Rendering](rendering.md) | Validation-to-Blade rendering pipeline and view overrides |
| [Media](media.md) | Replaceable media manager contract and storage rules |
| [Patterns and reusable blocks](patterns-and-reusable-blocks.md) | Template insertion and linked shared content semantics |
| [Integrations](integrations.md) | Framework boundaries and future adapters |
| [Security](security.md) | Trust boundaries, sanitization, authorization, and unsafe features |

## Documentation conventions

The following terms are normative:

- **MUST** describes a requirement necessary for compatibility or security.
- **SHOULD** describes the preferred default; deviations require a reason.
- **MAY** describes an optional capability.
- **Target API** describes the intended public interface before implementation.
- **Open decision** identifies a contract that must be resolved before the named milestone.
- **Frozen decision** identifies a B00 implementation input that cannot drift without an explicit architecture change.

Examples favor the simplest Laravel integration. Internal editor details are documented only where they establish a package boundary or stored-data contract.

## Update policy

When code and docs disagree during pre-`1.0` development:

1. record whether the implementation or the intended contract should change;
2. update both in the same pull request;
3. add an upgrade note when persisted JSON or a documented public PHP API changes.

The public API is explicitly unstable until `1.0`, but stored content still requires document-schema transformation discipline from the first usable release.
