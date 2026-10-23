<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    /**
     * Listar todos los usuarios del sistema con sus roles asociados (Solo Admin).
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('role')->withCount(['createdTickets', 'assignedTickets']);

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->input('role_id'));
        }

        if ($request->filled('search')) {
            $search = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('email', 'like', $search);
            });
        }

        $users = $query->orderBy('id', 'asc')->paginate(15);

        return response()->json($users);
    }

    /**
     * Modificar usuario (Cambiar rol, activar o desactivar cuenta).
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $currentUser = $request->user();

        // 1. Evitar que el administrador se desactive a sí mismo (Previene bloqueo accidental del sistema)
        if ($user->id === $currentUser->id && $request->has('is_active') && !$request->boolean('is_active')) {
            return response()->json([
                'message' => 'Por seguridad, no puedes desactivar tu propia cuenta de administrador.',
            ], 422);
        }

        // 2. Evitar que el administrador se quite su propio rol de administrador
        if ($user->id === $currentUser->id && $request->has('role_id') && (int)$request->input('role_id') !== $user->role_id) {
            return response()->json([
                'message' => 'No puedes removerte a ti mismo el rol de administrador.',
            ], 422);
        }

        $oldRoleId = $user->role_id;
        $oldIsActive = $user->is_active;

        $user->fill($request->validated());
        $user->save();

        // Registrar auditoría de cambio de rol
        if ($oldRoleId !== $user->role_id) {
            $newRole = Role::find($user->role_id);
            AuditLog::create([
                'user_id' => $currentUser->id,
                'action' => 'ROLE_CHANGED',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'details' => [
                    'target_user_id' => $user->id,
                    'target_email' => $user->email,
                    'old_role_id' => $oldRoleId,
                    'new_role' => $newRole?->name,
                ],
                'created_at' => now(),
            ]);
        }

        // Registrar auditoría de activación/desactivación
        if ($oldIsActive !== $user->is_active) {
            AuditLog::create([
                'user_id' => $currentUser->id,
                'action' => $user->is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'details' => [
                    'target_user_id' => $user->id,
                    'target_email' => $user->email,
                ],
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Usuario actualizado correctamente.',
            'user' => $user->load('role'),
        ]);
    }

    /**
     * Listar todos los roles del sistema.
     */
    public function roles(): JsonResponse
    {
        return response()->json(Role::all());
    }

    /**
     * Listar usuarios con rol operador o administrador (para asignación de tickets).
     */
    public function operators(): JsonResponse
    {
        $operators = User::whereHas('role', function ($q) {
            $q->whereIn('name', ['operador', 'administrador']);
        })->where('is_active', true)->select('id', 'name', 'email', 'role_id')->get();

        return response()->json($operators);
    }

    /**
     * Consultar logs de auditoría (Exclusivo para administradores).
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::with('user:id,name,email');

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($logs);
    }
}
