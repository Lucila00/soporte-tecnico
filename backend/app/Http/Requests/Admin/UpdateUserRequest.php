<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'role_id' => [
                'sometimes',
                'required',
                // No se puede ascender a nadie a administrador desde el panel de usuarios
                Rule::exists('roles', 'id')->where(fn ($q) => $q->where('name', '!=', 'administrador')),
            ],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'role_id.exists' => 'El rol seleccionado no es válido. No se puede asignar el rol administrador.',
            'is_active.boolean' => 'El estado de la cuenta debe ser activo o inactivo.',
        ];
    }
}
