<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Iniciar sesión con protección de rate limiting, hashing y auditoría.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        // 1. Control de fuerza bruta (máximo 5 intentos)
        $request->ensureIsNotRateLimited();

        $user = User::with('role')->where('email', $request->email)->first();

        // 2. Verificación de contraseña mediante Hash seguro (Bcrypt)
        if (!$user || !Hash::check($request->password, $user->password)) {
            $request->hitRateLimiter();

            AuditLog::create([
                'user_id' => $user?->id,
                'action' => 'LOGIN_FAILED',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'details' => ['attempted_email' => $request->email],
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Credenciales incorrectas. Verifique su correo y contraseña.',
            ], 422);
        }

        // 3. Verificación de cuenta activa
        if (!$user->is_active) {
            $request->hitRateLimiter();

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'LOGIN_BLOCKED_INACTIVE',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'details' => ['reason' => 'Cuenta desactivada'],
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Tu cuenta ha sido desactivada. Por favor, comunícate con un administrador.',
            ], 403);
        }

        // 4. Limpiar limitador de intentos
        $request->clearRateLimiter();

        // 5. Generar token de autenticación (Bearer Token)
        $token = $user->createToken('auth-token')->plainTextToken;

        // 6. Registro de auditoría
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'LOGIN_SUCCESS',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'details' => ['role' => $user->role->name],
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Inicio de sesión exitoso.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => [
                    'id' => $user->role->id,
                    'name' => $user->role->name,
                    'description' => $user->role->description,
                ],
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Obtener los datos del usuario autenticado actual.
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => [
                    'id' => $user->role->id,
                    'name' => $user->role->name,
                    'description' => $user->role->description,
                ],
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    /**
     * Cerrar sesión revocando tokens del usuario en el servidor.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'LOGOUT',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'details' => ['role' => $user->role?->name],
                'created_at' => now(),
            ]);

            // Revocar tokens personales
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    /**
     * Actualizar perfil propio (Campos autorizados únicamente).
     * Previene que un usuario intente alterar su rol o estado desde aquí.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'current_password' => ['nullable', 'required_with:new_password', 'string'],
            'new_password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ], [
            'name.required' => 'El nombre es obligatorio.',
            'new_password.min' => 'La nueva contraseña debe tener al menos 8 caracteres.',
            'new_password.confirmed' => 'La confirmación de la contraseña no coincide.',
        ]);

        $user->name = $validated['name'];

        if (!empty($validated['new_password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'La contraseña actual no es correcta.',
                ], 422);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        $user->save();

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'PROFILE_UPDATED',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'details' => ['password_changed' => !empty($validated['new_password'])],
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Perfil actualizado correctamente.',
            'user' => $user->load('role'),
        ]);
    }
}
