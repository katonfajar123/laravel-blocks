# Roadmap

## Status policy

All milestones are planned. Nothing is considered shipped until code, tests, and the corresponding docs are present in the repository.

Public PHP APIs may change before `1.0`. Persisted document-schema changes require explicit document transforms from the first release that users can store content with; this does not imply Laravel database migrations.

This roadmap defines direction, release composition, and dependency relationships rather than a rigid execution queue. Work is prioritized by product impact, evidence, and satisfied technical dependencies.

## Milestones

| Version | Focus | Exit criteria |
| --- | --- | --- |
| `0.1` | Package skeleton, block registry, JSON schema, validator, renderer, custom-block foundation, Paragraph, Heading, List, Quote, Code, Image | Laravel 11/12/13 hosts mount package-owned compiled assets and round-trip JSON/JSONB and TEXT/LONGTEXT with no host frontend build, package table, model, or migration |
| `0.2` | Block inserter, slash commands, toolbar, block operations, drag and drop | All minimal blocks can be inserted and rearranged by mouse and keyboard without invalid documents |
| `0.3` | Media manager, upload/browser UI, Gallery, Video, File, Cover | Replaceable media adapter works and media security tests pass |
| `0.4` | Columns, Column, Group, Row, Stack, Grid, nested blocks | Parent/child schema is enforced in editor and PHP; nested drag/drop is accessible |
| `0.5` | PHP fields engine and public custom-block workflow | An application can generate and ship a PHP + Blade block without Vue |
| `0.6` | Blade component blocks and dynamic blocks | Registration is allow-listed, preview is authorized, and queries are bounded |
| `0.7` | Reusable blocks, copied patterns, and opt-in shared-persistence contracts | Copy vs. reference semantics, detach, repository replacement, optional database migrations, cycle protection, permissions, and invalidation are tested |
| `0.8` | Complete planned 50-block catalog | Every included block meets the documented block contract and has editor/render tests |
| `0.9` | Complete Editor UX contract, accessibility, performance, security hardening, documentation, upgrade tooling | The polished default editor, quality gates, and supported-browser/framework matrix pass |
| `1.0` | Stable public API and supported persisted schema | Editor UX contract, SemVer policy, upgrade guide, security policy, and release artifacts are ready |

## Implementation selection

An in-progress implementation must finish first. Otherwise the highest-value incomplete gap whose dependencies are satisfied is selected, scoped, verified, and evaluated before unrelated work begins.

Package Skeleton, Document Foundation, Block Contract + Registry, Schema Validator, safe Blade Renderer, PHP-to-editor Manifest bridge, Precompiled Asset Distribution, Minimal Editor Shell, and the internal selection/command layer are complete. The package-owned Editor UI kit and overlay infrastructure is the next dependency-safe foundation because visible toolbars, link editing, Inserter, slash commands, Inspector controls, and block menus must share reusable primitives instead of one-off UI. Blocks remain later dependency candidates rather than an instruction to advance automatically.

## B00 frozen decisions

`B00 — Implementation Readiness` resolved the fundamental `0.1` questions before code begins:

| Contract | Frozen result |
| --- | --- |
| Document version | Root `attrs.schemaVersion = 1` |
| Public value | Array, non-blank JSON string, or `null`; normalize through immutable `Document` |
| Persistence | Host-owned; core has no database, table, migration, or Eloquent model |
| Block API | Container-resolved abstract `Block` base class |
| Renderer | Immutable Laravel `Htmlable` result |
| Unknown block | Deterministic `throw`, `placeholder`, or `skip`; default `throw` |
| Shared attributes | Direct semantic attrs plus reserved `design` and `advanced` objects |
| Editor manifest | Declarative, versioned Manifest v1 generated from PHP |
| Assets | Versioned precompiled JS/CSS; no consumer Node/npm/Vite build |
| Initial schema names | Stable lower-camel node and mark identifiers |
| Default UI | Complete [Editor UX contract](editor-ux-contract.md), not an application-assembled SDK |

The exact Composer component list is decided from dependencies actually used by the package; it MUST remain inside PHP `^8.2` and Illuminate `^11.0|^12.0|^13.0`.

After the initial Image implementation, the `0.1` release gate runs the complete valid Laravel/PHP matrix, JSON/JSONB and `TEXT`/`LONGTEXT` host round trips, precompiled no-host-build installation, and zero-package-database checks. Final compatibility checks repeat and harden those claims for `1.0`; they do not defer the `0.1` evidence.

## Planned Artisan commands

| Command | Purpose | Earliest milestone |
| --- | --- | --- |
| `laravel-blocks:install` | Publish/setup core without modifying database schema | `0.1` |
| `make:block Hero` | Generate an application block and view | `0.5` |
| `laravel-blocks:list` | Inspect registered blocks | `0.1` |
| `laravel-blocks:publish` | Guided publication of package resources | `0.3` |
| `laravel-blocks:clear-cache` | Clear renderer/manifest caches | When caching ships |
| `laravel-blocks:doctor` | Read-only installation diagnostics | `0.3` |

Commands must be non-interactive when flags provide all required input and safe to run in CI where relevant.

## Test strategy

Proposed tools:

- Pest and Orchestra Testbench for PHP/package integration;
- PHPStan/Larastan for static analysis;
- Laravel Pint for PHP formatting;
- Vitest for editor units and schema/manifest behavior;
- Playwright for browser editing, keyboard, accessibility, and round-trip flows.

Core test suites should include:

- document fixtures shared between PHP and JavaScript;
- document-schema validation and transformation fixtures;
- renderer snapshots plus semantic assertions;
- property or fuzz tests for malformed JSON and deep nesting;
- package installation tests on every supported Laravel/PHP pair;
- zero-database installation tests on Laravel 11, 12, and 13;
- host-owned JSON/JSONB and TEXT/LONGTEXT round-trip fixtures;
- assertions that the core installer publishes or runs no migrations;
- browser tests for IME input, clipboard, selection, undo, nested drag/drop, and recovery;
- accessibility tests plus manual keyboard and assistive-technology review;
- the attack cases listed in [Security](security.md).

## Compatibility matrix

The frozen target matrix is PHP 8.2+ with Laravel 11, 12, and 13. CI MUST cover every valid combination defined in [Compatibility](compatibility.md). Target constraints are fixed, but support claims remain planned and unverified until that matrix passes.

## Benchmark refresh

Each milestone boundary MUST refresh the applicable Gutenberg benchmark. The refresh compares relevant editor structure, toolbars, Inserter, List View, Inspector, rich text, media, keyboard/accessibility, patterns, and major interaction changes without copying WordPress visuals, source, or React architecture.

The refresh may discover, re-prioritize, or reject gaps as not applicable. Any change to a locked product decision still requires explicit maintainer approval.

## Release discipline

Every release that changes stored JSON must include:

- old and new fixture examples;
- a forward document-schema transform;
- behavior for unknown future versions;
- upgrade documentation;
- tests proving idempotency and content preservation.

Every release that changes public APIs must update examples and note the replacement. `1.0` begins normal semantic-versioning compatibility guarantees.
