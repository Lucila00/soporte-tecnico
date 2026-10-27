<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $operator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->admin = User::where('email', 'admin@soporte.local')->first();
        $this->operator = User::where('email', 'operador@soporte.local')->first();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Nuevo Técnico',
            'email' => 'nuevo.tecnico@soporte.local',
            'password' => 'Tecnico123!',
            'password_confirmation' => 'Tecnico123!',
            'role_id' => Role::where('name', 'operador')->value('id'),
        ], $overrides);
    }

    public function test_admin_can_create_user_with_any_role(): void
    {
        foreach (['usuario', 'operador', 'administrador'] as $i => $roleName) {
            $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/users', $this->payload([
                'email' => "nuevo{$i}@soporte.local",
                'role_id' => Role::where('name', $roleName)->value('id'),
            ]));

            $response->assertStatus(201)
                ->assertJsonPath('user.email', "nuevo{$i}@soporte.local")
                ->assertJsonPath('user.role.name', $roleName)
                ->assertJsonPath('user.is_active', true)
                ->assertJsonMissingPath('user.password');
        }

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'action' => 'USER_CREATED',
        ]);
    }

    public function test_created_user_can_log_in_with_hashed_password(): void
    {
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/users', $this->payload())->assertStatus(201);

        $user = User::where('email', 'nuevo.tecnico@soporte.local')->first();
        $this->assertNotSame('Tecnico123!', $user->password);
        $this->assertTrue(Hash::check('Tecnico123!', $user->password));

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', [
            'email' => 'nuevo.tecnico@soporte.local',
            'password' => 'Tecnico123!',
        ])->assertStatus(200)->assertJsonPath('user.role.name', 'operador');
    }

    public function test_create_user_validates_input(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/users', $this->payload([
            'email' => 'operador@soporte.local',
            'password_confirmation' => 'OtraClave123!',
            'role_id' => 999,
        ]));

        $response->assertStatus(422)->assertJsonValidationErrors(['email', 'password', 'role_id']);
    }

    public function test_non_admin_cannot_create_users(): void
    {
        $response = $this->actingAs($this->operator, 'sanctum')->postJson('/api/admin/users', $this->payload());

        $response->assertStatus(403);
        $this->assertDatabaseMissing('users', ['email' => 'nuevo.tecnico@soporte.local']);
    }
}
