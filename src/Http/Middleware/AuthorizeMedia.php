<?php

namespace KatonFajar\LaravelBlocks\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\Access\Gate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use KatonFajar\LaravelBlocks\Media\MediaTransportConfiguration;
use Symfony\Component\HttpFoundation\Response;

final class AuthorizeMedia
{
    public function __construct(
        private readonly Gate $gate,
        private readonly MediaTransportConfiguration $configuration,
    ) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $action): Response
    {
        if ($request->user() === null) {
            return $this->denied(401, 'Unauthenticated media request.');
        }

        $response = $this->gate->inspect($this->configuration->ability($action));

        if ($response->denied()) {
            return $this->denied(403, 'This media action is not authorized.');
        }

        return $next($request);
    }

    private function denied(int $status, string $message): JsonResponse
    {
        return response()->json([
            'error' => [
                'code' => $status === 401 ? 'unauthenticated' : 'media_forbidden',
                'message' => $message,
            ],
        ], $status);
    }
}
