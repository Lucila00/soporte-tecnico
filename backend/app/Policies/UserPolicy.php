<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * Determina si el usuario puede listar usuarios del sistema.
     */
    public function viewAny(User $user): Response
    {
        return $user->isAdmin()
            ? Response::allow()
            : Response::deny('Solo los administradores pueden gestionar usuarios.');
    }

    /**
     * Determina si el usuario puede actualizar otro usuario.
     */
    public function update(User $user, User $targetUser): Response
    {
        if (!$user->isAdmin()) {
            return Response::deny('Solo los administradores pueden modificar usuarios.');
        }

        return Response::allow();
    }
}
