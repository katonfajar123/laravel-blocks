<?php

namespace KatonFajar\LaravelBlocks\View\Components;

use Illuminate\Container\Container;
use Illuminate\Contracts\View\Factory as ViewFactory;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

final class Editor extends Component
{
    public function __construct(
        public ?string $id = null,
        public string $name = 'content',
        public string $placeholder = 'Start writing or type / to choose a block',
        public mixed $value = null,
    ) {}

    public function render(): View
    {
        return $this->viewFactory()->file($this->packageView('editor'));
    }

    private function packageView(string $component): string
    {
        return dirname(__DIR__, 3).'/resources/views/components/'.$component.'.blade.php';
    }

    private function viewFactory(): ViewFactory
    {
        return Container::getInstance()->make(ViewFactory::class);
    }
}
