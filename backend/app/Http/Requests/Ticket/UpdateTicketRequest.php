<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active ?? false;
    }

    public function rules(): array
    {
        $user = $this->user();

        // 1. Si es usuario común, solo puede editar título y descripción
        if ($user->isUser()) {
            return [
                'title' => ['sometimes', 'required', 'string', 'min:5', 'max:150'],
                'description' => ['sometimes', 'required', 'string', 'min:10'],
            ];
        }

        // 2. Si es operador o administrador, puede modificar campos de gestión
        $rules = [
            'status' => ['sometimes', 'required', 'in:abierto,en_proceso,resuelto,cerrado'],
            'priority' => ['sometimes', 'required', 'in:baja,media,alta,critica'],
            'assigned_to' => ['sometimes', 'nullable', 'exists:users,id'],
        ];

        // 3. Administrador adicionalmente puede modificar título, descripción y categoría
        if ($user->isAdmin()) {
            $rules['title'] = ['sometimes', 'required', 'string', 'min:5', 'max:150'];
            $rules['description'] = ['sometimes', 'required', 'string', 'min:10'];
            $rules['category'] = ['sometimes', 'required', 'in:hardware,software,red,acceso,otro'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'status.in' => 'El estado proporcionado no es válido.',
            'priority.in' => 'La prioridad proporcionada no es válida.',
            'assigned_to.exists' => 'El operador seleccionado no existe en el sistema.',
        ];
    }
}
