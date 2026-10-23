<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'role_id' => ['sometimes', 'required', 'exists:roles,id'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'role_id.exists' => 'El rol seleccionado no es válido.',
            'is_active.boolean' => 'El estado de la cuenta debe ser activo o inactivo.',
        ];
    }
}
