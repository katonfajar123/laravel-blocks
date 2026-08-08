<?php

namespace KatonFajar\LaravelBlocks\Validation;

enum AttributeType: string
{
    case STRING = 'string';
    case INTEGER = 'integer';
    case NUMBER = 'number';
    case BOOLEAN = 'boolean';
    case URL = 'url';
    case OBJECT = 'object';
    case LIST = 'list';
}
