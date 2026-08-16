<?php

namespace KatonFajar\LaravelBlocks\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use InvalidArgumentException;
use KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider;
use KatonFajar\LaravelBlocks\Media\Exceptions\MediaException;
use KatonFajar\LaravelBlocks\Media\MediaQuery;
use Throwable;

final class MediaController
{
    public function __construct(private readonly MediaProvider $provider) {}

    public function browse(Request $request): JsonResponse
    {
        try {
            $page = $this->provider->browse(new MediaQuery(
                search: $this->optionalString($request, 'search'),
                mimeTypes: $this->mimeTypes($request),
                page: $this->positiveInteger($request, 'page', 1),
                perPage: $this->positiveInteger($request, 'perPage', 24),
            ));

            return response()->json([
                'data' => [
                    'provider' => $this->provider->name(),
                    'capabilities' => $this->provider->capabilities()->toArray(),
                    'page' => $page->toArray(),
                ],
            ]);
        } catch (InvalidArgumentException $exception) {
            return $this->error('invalid_media_request', $exception->getMessage(), 422);
        } catch (MediaException $exception) {
            return $this->mediaError($exception);
        } catch (Throwable $exception) {
            report($exception);

            return $this->error('media_transport_failure', 'The media library is temporarily unavailable.', 503);
        }
    }

    public function upload(Request $request): JsonResponse
    {
        $file = $request->file('file');

        if (! $file instanceof UploadedFile) {
            return $this->error('invalid_media_request', 'A media file is required.', 422, [
                'file' => ['Choose a file to upload.'],
            ]);
        }

        try {
            return response()->json([
                'data' => [
                    'item' => $this->provider->upload($file)->toArray(),
                ],
            ], 201);
        } catch (MediaException $exception) {
            return $this->mediaError($exception);
        } catch (Throwable $exception) {
            report($exception);

            return $this->error('media_transport_failure', 'The media upload could not be completed.', 503);
        }
    }

    private function mediaError(MediaException $exception): JsonResponse
    {
        $status = match ($exception->reason()) {
            'media_not_found' => 404,
            'storage_failure', 'unsupported_disk' => 503,
            default => 422,
        };

        $message = match ($exception->reason()) {
            'media_not_found' => 'The requested media item was not found.',
            'upload_too_large' => 'The selected file is larger than the allowed upload limit.',
            'unsupported_mime_type' => 'The selected file type is not allowed.',
            'excessive_image_dimensions' => 'The selected image dimensions exceed the allowed limit.',
            'empty_file' => 'The selected file is empty.',
            'invalid_upload' => 'The selected file could not be uploaded.',
            default => $status >= 500
                ? 'The media provider is temporarily unavailable.'
                : 'The media request was rejected.',
        };

        return $this->error($exception->reason(), $message, $status);
    }

    /** @param array<string, list<string>> $fields */
    private function error(string $code, string $message, int $status, array $fields = []): JsonResponse
    {
        $error = [
            'code' => $code,
            'message' => $message,
        ];

        if ($fields !== []) {
            $error['fields'] = $fields;
        }

        return response()->json(['error' => $error], $status);
    }

    /** @return list<string> */
    private function mimeTypes(Request $request): array
    {
        $value = $request->query('mimeTypes', []);

        if ($value === '') {
            return [];
        }

        if (! is_array($value) || ! array_is_list($value)) {
            throw new InvalidArgumentException('Media MIME filters must be a list.');
        }

        foreach ($value as $mimeType) {
            if (! is_string($mimeType)) {
                throw new InvalidArgumentException('Media MIME filters must contain strings.');
            }
        }

        return $value;
    }

    private function optionalString(Request $request, string $key): ?string
    {
        if (! $request->query->has($key)) {
            return null;
        }

        $value = $request->query($key);

        if ($value === '') {
            return null;
        }

        if (! is_string($value)) {
            throw new InvalidArgumentException(sprintf('Media "%s" must be a string.', $key));
        }

        return $value;
    }

    private function positiveInteger(Request $request, string $key, int $default): int
    {
        if (! $request->query->has($key)) {
            return $default;
        }

        $value = $request->query($key);

        if ($value === '') {
            return $default;
        }

        if (! is_string($value) || ! preg_match('/^[1-9][0-9]*$/', $value)) {
            throw new InvalidArgumentException(sprintf('Media "%s" must be a positive integer.', $key));
        }

        return (int) $value;
    }
}
