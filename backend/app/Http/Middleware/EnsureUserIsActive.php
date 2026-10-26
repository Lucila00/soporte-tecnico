<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * Bloquea cualquier petición autenticada de una cuenta desactivada,
     * aunque todavía conserve un token válido emitido antes de la desactivación.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !$user->is_active) {
            return response()->json([
                'message' => 'Tu cuenta ha sido desactivada. Comunícate con el administrador.',
            ], 403);
        }

        return $next($request);
    }
}
