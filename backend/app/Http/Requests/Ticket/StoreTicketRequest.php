<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:5', 'max:150'],
            'description' => ['required', 'string', 'min:10'],
            'category' => ['required', 'string', 'in:hardware,software,red,acceso,otro'],
            'priority' => ['required', 'string', 'in:baja,media,alta,critica'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'El título de la solicitud es obligatorio.',
            'title.min' => 'El título debe tener al menos 5 caracteres.',
            'title.max' => 'El título no puede exceder los 150 caracteres.',
            'description.required' => 'La descripción del problema es obligatoria.',
            'description.min' => 'Por favor detalla el problema con al menos 10 caracteres.',
            'category.required' => 'Debe seleccionar una categoría válida.',
            'category.in' => 'La categoría seleccionada no es válida.',
            'priority.required' => 'Debe seleccionar un nivel de prioridad.',
            'priority.in' => 'La prioridad debe ser: baja, media, alta o critica.',
        ];
    }
}
