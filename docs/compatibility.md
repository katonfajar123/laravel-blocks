# Compatibility

## Supported versions

Laravel Blocks is planned to support Laravel 11, 12, and 13 from its first stable major release.

```text
Requirements

PHP 8.2+
Laravel 11.x, 12.x, or 13.x
Composer 2.x
```

The valid framework and PHP combinations are:

| Laravel | Supported PHP | Laravel Blocks |
| --- | --- | --- |
| 11.x | 8.2-8.4 | Planned |
| 12.x | 8.2-8.5 | Planned |
| 13.x | 8.3-8.5 | Planned |

The package-level PHP constraint is `^8.2`. Laravel 13 still requires PHP 8.3 or newer through Laravel's own dependency constraints, so Composer will reject Laravel 13 with PHP 8.2.

Laravel's upstream support lifecycle is separate from Laravel Blocks compatibility. Laravel 11 reached the end of Laravel security fixes on March 12, 2026; applications should evaluate that lifecycle independently even while this package remains installable and tested on Laravel 11.

## Composer constraint contract

Laravel Blocks is a library, so it MUST require only the Illuminate components it directly uses instead of requiring the complete `laravel/framework` package. PHP `^8.2` and the `^11.0|^12.0|^13.0` union for each used Illuminate component are frozen; the exact component subset grows only when an implementation batch proves a direct runtime need.

The current implemented runtime set is:

```json
{
  "require": {
    "php": "^8.2",
    "illuminate/contracts": "^11.0|^12.0|^13.0",
    "illuminate/support": "^11.0|^12.0|^13.0",
    "illuminate/view": "^11.0|^12.0|^13.0"
  }
}
```

The anticipated upper-bound set is:

```json
{
  "require": {
    "php": "^8.2",
    "illuminate/contracts": "^11.0|^12.0|^13.0",
    "illuminate/filesystem": "^11.0|^12.0|^13.0",
    "illuminate/support": "^11.0|^12.0|^13.0",
    "illuminate/validation": "^11.0|^12.0|^13.0",
    "illuminate/view": "^11.0|^12.0|^13.0"
  }
}
```

This example is not permission to add every component during B01. Unused entries MUST be omitted, and additional Illuminate components may be added only when implementation proves they are direct runtime dependencies.

Major constraints remain explicit because Laravel major releases may contain breaking changes. Supporting a new Laravel major requires CI coverage and a changelog entry; it must not be assumed from a permissive wildcard.

## Coding baseline

Core code MUST use the lowest common Laravel API supported by the package:

```text
Laravel Blocks core
        |
        v
APIs available since Laravel 11
        |
        +-- Laravel 11
        +-- Laravel 12
        `-- Laravel 13
```

Guidelines:

- prefer APIs available in all three supported majors;
- isolate unavoidable version differences in a compatibility class or adapter;
- avoid repeated `if Laravel 11 / 12 / 13` branches throughout the codebase;
- test behavior rather than assuming identical internals across majors;
- avoid APIs introduced only in Laravel 12 or 13 unless guarded by an isolated fallback;
- do not use named arguments when calling framework methods whose parameter names are not covered by Laravel's backward-compatibility promise.

## CI matrix

The initial GitHub Actions matrix MUST test these combinations:

| Laravel | PHP 8.2 | PHP 8.3 | PHP 8.4 | PHP 8.5 |
| --- | :---: | :---: | :---: | :---: |
| 11.x | Yes | Yes | Yes | No |
| 12.x | Yes | Yes | Yes | Yes |
| 13.x | No | Yes | Yes | Yes |

An explicit matrix avoids invalid combinations:

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - php: '8.2'
        laravel: '11.*'
      - php: '8.3'
        laravel: '11.*'
      - php: '8.4'
        laravel: '11.*'
      - php: '8.2'
        laravel: '12.*'
      - php: '8.3'
        laravel: '12.*'
      - php: '8.4'
        laravel: '12.*'
      - php: '8.5'
        laravel: '12.*'
      - php: '8.3'
        laravel: '13.*'
      - php: '8.4'
        laravel: '13.*'
      - php: '8.5'
        laravel: '13.*'
```

CI MUST use the lowest and highest compatible transitive dependencies where practical. Static analysis and browser/editor tests may run on a smaller representative subset, but PHP package integration tests MUST cover the complete table.

## Compatibility changes

Dropping a Laravel or PHP version after `1.0` is a backward-incompatible change and requires a new Laravel Blocks major version. Before `1.0`, any support change still requires an explicit changelog entry and updated compatibility documentation.

## Official references

- [Laravel 11 release notes](https://laravel.com/docs/11.x/releases)
- [Laravel 12 release notes](https://laravel.com/docs/12.x/releases)
- [Laravel 13 support-policy table](https://laravel.com/docs/13.x/releases)
- [Laravel package development](https://laravel.com/docs/13.x/packages)
