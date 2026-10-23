<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;

    public $timestamps = false; // Maneja su propio created_at

    protected $fillable = [
        'user_id',
        'action',
        'ip_address',
        'user_agent',
        'details',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Relación: Usuario que disparó el evento auditado.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
