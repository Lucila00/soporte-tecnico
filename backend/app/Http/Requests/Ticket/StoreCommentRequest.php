<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active ?? false;
    }

    public function rules(): array
    {
        return [
            'comment' => ['required', 'string', 'min:2', 'max:2000'],
            'is_internal' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'comment.required' => 'El comentario no puede estar vacío.',
            'comment.min' => 'El comentario debe tener al menos 2 caracteres.',
            'comment.max' => 'El comentario no puede exceder los 2000 caracteres.',
        ];
    }
}
