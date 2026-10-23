<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory;

    /**
     * Campos permitidos para asignación masiva.
     * Note que 'ticket_code' y 'user_id' se manejan estrictamente por el sistema en el controlador.
     */
    protected $fillable = [
        'ticket_code',
        'user_id',
        'assigned_to',
        'title',
        'description',
        'category',
        'priority',
        'status',
    ];

    /**
     * Relación: Creador del ticket (Usuario solicitante).
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relación: Operador técnico asignado al ticket.
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Relación: Historial de comentarios y seguimiento del ticket.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(TicketComment::class);
    }
}
