<?php

namespace KatonFajar\LaravelBlocks\View\Components;

use Illuminate\Container\Container;
use Illuminate\Contracts\View\Factory as ViewFactory;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

final class Content extends Component
{
    public function __construct(
        public mixed $content = null,
    ) {}

    public function render(): View
    {
        return $this->viewFactory()->file($this->packageView('content'));
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
