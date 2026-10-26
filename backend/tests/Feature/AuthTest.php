<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;
    protected function setUp(): void
    {
        parent::setUp();
        // Asegurar que existan los roles para las pruebas
        Role::firstOrCreate(['name' => 'usuario'], ['description' => 'Usuario']);
        Role::firstOrCreate(['name' => 'operador'], ['description' => 'Operador']);
        Role::firstOrCreate(['name' => 'administrador'], ['description' => 'Administrador']);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $role = Role::where('name', 'usuario')->first();
        $user = User::factory()->create([
            'email' => 'test_user_login@soporte.local',
            'password' => Hash::make('Secret123!'),
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test_user_login@soporte.local',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'role', 'is_active'],
                'token',
            ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'LOGIN_SUCCESS',
        ]);
    }

    public function test_user_cannot_login_with_invalid_password(): void
    {
        $role = Role::where('name', 'usuario')->first();
        $user = User::factory()->create([
            'email' => 'test_wrong_pass@soporte.local',
            'password' => Hash::make('Secret123!'),
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test_wrong_pass@soporte.local',
            'password' => 'WrongPassword999',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Credenciales incorrectas. Verifique su correo y contraseña.',
            ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'LOGIN_FAILED',
        ]);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $role = Role::where('name', 'usuario')->first();
        $user = User::factory()->create([
            'email' => 'test_inactive@soporte.local',
            'password' => Hash::make('Secret123!'),
            'role_id' => $role->id,
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test_inactive@soporte.local',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Tu cuenta ha sido desactivada. Por favor, comunícate con un administrador.',
            ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'LOGIN_BLOCKED_INACTIVE',
        ]);
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $response = $this->getJson('/api/user');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'No autenticado. Debe iniciar sesión.',
            ]);
    }

    public function test_authenticated_user_can_get_their_info(): void
    {
        $role = Role::where('name', 'usuario')->first();
        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user');

        $response->assertStatus(200)
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.role.name', 'usuario');
    }

    public function test_authenticated_user_can_logout(): void
    {
        $role = Role::where('name', 'usuario')->first();
        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Sesión cerrada correctamente.',
            ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'LOGOUT',
        ]);
    }

    public function test_login_rate_limiting_protects_against_brute_force(): void
    {
        $email = 'brute_force_test@soporte.local';

        // Realizar 5 intentos fallidos
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'email' => $email,
                'password' => 'IncorrectPass' . $i,
            ]);
        }

        // El sexto intento debe ser bloqueado con HTTP 429 Too Many Requests
        $response = $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'AnyPassword',
        ]);

        $response->assertStatus(429);
    }
}
