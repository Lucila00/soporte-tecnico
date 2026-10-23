<?php

namespace App\Policies;

use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class TicketPolicy
{
    /**
     * Determina si el usuario puede ver la lista general.
     */
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    /**
     * Protección contra IDOR (Insecure Direct Object Reference).
     * Solo el administrador, el operador o el dueño legítimo del ticket pueden verlo.
     */
    public function view(User $user, Ticket $ticket): Response
    {
        if (!$user->is_active) {
            return Response::deny('Tu cuenta está desactivada.');
        }

        if ($user->isAdmin() || $user->isOperator()) {
            return Response::allow();
        }

        // Verificación estricta de propiedad contra IDOR
        if ($ticket->user_id === $user->id) {
            return Response::allow();
        }

        // Registrar intento de acceso no autorizado por IDOR en auditoría
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'IDOR_ACCESS_ATTEMPT',
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'details' => [
                'target_ticket_id' => $ticket->id,
                'ticket_code' => $ticket->ticket_code,
                'owner_id' => $ticket->user_id,
            ],
            'created_at' => now(),
        ]);

        return Response::deny('No tienes autorización para acceder a esta solicitud.');
    }

    /**
     * Determina si el usuario puede crear tickets.
     */
    public function create(User $user): bool
    {
        return $user->is_active;
    }

    /**
     * Determina si el usuario puede actualizar el ticket.
     */
    public function update(User $user, Ticket $ticket): Response
    {
        if (!$user->is_active) {
            return Response::deny('Tu cuenta está desactivada.');
        }

        if ($user->isAdmin() || $user->isOperator()) {
            return Response::allow();
        }

        // El usuario solo puede editar su propio ticket y ÚNICAMENTE si está en estado 'abierto'
        if ($ticket->user_id === $user->id) {
            if ($ticket->status === 'abierto') {
                return Response::allow();
            }
            return Response::deny('No puedes modificar una solicitud que ya está en proceso o resuelta.');
        }

        return Response::deny('No tienes autorización para modificar esta solicitud.');
    }

    /**
     * Determina si el usuario puede eliminar un ticket.
     * EXCLUSIVO DEL ADMINISTRADOR.
     */
    public function delete(User $user, Ticket $ticket): Response
    {
        if ($user->isAdmin()) {
            return Response::allow();
        }

        return Response::deny('Solo los administradores pueden eliminar solicitudes del sistema.');
    }

    /**
     * Determina si el usuario puede agregar comentarios al ticket.
     */
    public function addComment(User $user, Ticket $ticket): Response
    {
        if (!$user->is_active) {
            return Response::deny('Tu cuenta está desactivada.');
        }

        if ($user->isAdmin() || $user->isOperator()) {
            return Response::allow();
        }

        // El usuario solo puede comentar en sus propios tickets y si no están cerrados
        if ($ticket->user_id === $user->id) {
            if ($ticket->status !== 'cerrado') {
                return Response::allow();
            }
            return Response::deny('No se pueden agregar comentarios a un ticket que ya fue cerrado.');
        }

        return Response::deny('No tienes autorización para comentar en este ticket.');
    }
}
