<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // 1. Verificación de autenticación
        if (!$user) {
            return response()->json([
                'message' => 'No autenticado. Debe iniciar sesión.',
            ], 401);
        }

        // 2. Verificación de estado de la cuenta
        if (!$user->is_active) {
            return response()->json([
                'message' => 'Tu cuenta ha sido desactivada. Comunícate con el administrador.',
            ], 403);
        }

        // 3. Verificación de rol autorizado
        $userRole = strtolower($user->role?->name ?? '');
        $allowedRoles = array_map('strtolower', $roles);

        if (!in_array($userRole, $allowedRoles, true)) {
            // Registrar intento de acceso no autorizado en auditoría
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'UNAUTHORIZED_ROLE_ACCESS',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'details' => [
                    'attempted_path' => $request->path(),
                    'user_role' => $userRole,
                    'required_roles' => $allowedRoles,
                ],
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Acceso denegado: No tienes los privilegios necesarios para esta operación.',
            ], 403);
        }

        return $next($request);
    }
}
