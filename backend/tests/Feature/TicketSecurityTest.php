<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $operator;
    protected User $user1;
    protected User $user2;
    protected Ticket $ticketUser1;
    protected Ticket $ticketUser2;

    protected function setUp(): void
    {
        parent::setUp();

        // Datos de demostración (roles, usuarios y tickets) dentro de la transacción de cada prueba
        $this->seed();

        $this->admin = User::where('email', 'admin@soporte.local')->first();
        $this->operator = User::where('email', 'operador@soporte.local')->first();
        $this->user1 = User::where('email', 'usuario@soporte.local')->first();
        $this->user2 = User::where('email', 'carlos@soporte.local')->first();

        $this->ticketUser1 = Ticket::where('user_id', $this->user1->id)->first();
        $this->ticketUser2 = Ticket::where('user_id', $this->user2->id)->first();
    }

    public function test_user_sees_only_own_tickets_in_index(): void
    {
        $response = $this->actingAs($this->user1, 'sanctum')->getJson('/api/tickets');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertNotEmpty($data);
        foreach ($data as $item) {
            $this->assertEquals($this->user1->id, $item['user_id'], 'Un usuario común no debe ver tickets ajenos en la lista.');
        }
    }

    public function test_idor_protection_user_cannot_view_another_users_ticket(): void
    {
        // Lucía intenta ver el ticket privado de Carlos
        $response = $this->actingAs($this->user1, 'sanctum')
            ->getJson("/api/tickets/{$this->ticketUser2->id}");

        $response->assertStatus(403);

        // Verificar que el intento de IDOR quedó grabado en auditoría
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->user1->id,
            'action' => 'IDOR_ACCESS_ATTEMPT',
        ]);
    }

    public function test_idor_protection_user_cannot_update_another_users_ticket(): void
    {
        // Lucía intenta modificar el ticket de Carlos
        $response = $this->actingAs($this->user1, 'sanctum')
            ->putJson("/api/tickets/{$this->ticketUser2->id}", [
                'title' => 'Título alterado indebidamente',
            ]);

        $response->assertStatus(403);
    }

    public function test_regular_user_cannot_delete_any_ticket(): void
    {
        // Lucía intenta borrar su propio ticket
        $response = $this->actingAs($this->user1, 'sanctum')
            ->deleteJson("/api/tickets/{$this->ticketUser1->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('tickets', ['id' => $this->ticketUser1->id]);
    }

    public function test_user_cannot_escalate_status_or_change_assignee(): void
    {
        // Lucía intenta cerrar su propio ticket y asignarse a un operador
        $response = $this->actingAs($this->user1, 'sanctum')
            ->putJson("/api/tickets/{$this->ticketUser1->id}", [
                'title' => 'Impresora actualizada',
                'status' => 'resuelto',
                'assigned_to' => $this->operator->id,
            ]);

        $response->assertStatus(200);

        // El título sí se actualizó porque es el dueño y está abierto
        $this->ticketUser1->refresh();
        $this->assertEquals('Impresora actualizada', $this->ticketUser1->title);

        // Pero el estado NO debe haber cambiado a 'resuelto' ni el operador asignado
        $this->assertEquals('abierto', $this->ticketUser1->status);
        $this->assertNull($this->ticketUser1->assigned_to);
    }

    public function test_operator_can_view_any_ticket_and_update_status(): void
    {
        // Operador visualiza el ticket de Carlos
        $response = $this->actingAs($this->operator, 'sanctum')
            ->getJson("/api/tickets/{$this->ticketUser2->id}");

        $response->assertStatus(200);

        // Operador cambia el estado a 'en_proceso' y se lo autoasigna
        $updateResponse = $this->actingAs($this->operator, 'sanctum')
            ->putJson("/api/tickets/{$this->ticketUser2->id}", [
                'status' => 'en_proceso',
                'assigned_to' => $this->operator->id,
            ]);

        $updateResponse->assertStatus(200);
        $this->ticketUser2->refresh();
        $this->assertEquals('en_proceso', $this->ticketUser2->status);
        $this->assertEquals($this->operator->id, $this->ticketUser2->assigned_to);
    }

    public function test_operator_cannot_delete_tickets(): void
    {
        $response = $this->actingAs($this->operator, 'sanctum')
            ->deleteJson("/api/tickets/{$this->ticketUser1->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('tickets', ['id' => $this->ticketUser1->id]);
    }

    public function test_operator_cannot_access_admin_user_management(): void
    {
        $response = $this->actingAs($this->operator, 'sanctum')
            ->getJson('/api/admin/users');

        $response->assertStatus(403);
    }

    public function test_user_cannot_access_admin_user_management(): void
    {
        $response = $this->actingAs($this->user1, 'sanctum')
            ->getJson('/api/admin/users');

        $response->assertStatus(403);
    }

    public function test_admin_can_delete_ticket(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/tickets/{$this->ticketUser1->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('tickets', ['id' => $this->ticketUser1->id]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'TICKET_DELETED',
        ]);
    }

    public function test_admin_cannot_deactivate_themselves(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/users/{$this->admin->id}", [
                'is_active' => false,
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Por seguridad, no puedes desactivar tu propia cuenta de administrador.',
            ]);
    }

    public function test_created_ticket_gets_unique_code_derived_from_id(): void
    {
        $payload = [
            'title' => 'Monitor sin señal',
            'description' => 'El monitor secundario no recibe señal desde ayer.',
            'category' => 'hardware',
            'priority' => 'baja',
        ];

        $first = $this->actingAs($this->user1, 'sanctum')->postJson('/api/tickets', $payload);
        $second = $this->actingAs($this->user1, 'sanctum')->postJson('/api/tickets', $payload);

        $first->assertStatus(201);
        $second->assertStatus(201);

        $ticket = $first->json('ticket');
        $this->assertSame(sprintf('TCK-%s-%04d', date('Y'), $ticket['id']), $ticket['ticket_code']);
        $this->assertNotSame($ticket['ticket_code'], $second->json('ticket.ticket_code'));
    }

    public function test_ticket_cannot_be_assigned_to_a_regular_user(): void
    {
        $response = $this->actingAs($this->operator, 'sanctum')
            ->putJson("/api/tickets/{$this->ticketUser2->id}", [
                'assigned_to' => $this->user1->id,
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors('assigned_to');
        $this->assertNull($this->ticketUser2->refresh()->assigned_to);
    }

    public function test_deactivated_user_with_existing_token_is_blocked(): void
    {
        $token = $this->user1->createToken('auth-token')->plainTextToken;

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/users/{$this->user1->id}", ['is_active' => false])
            ->assertStatus(200);

        // La desactivación revoca todos los tokens del usuario
        $this->assertSame(0, $this->user1->tokens()->count());

        // Aunque conserve una sesión previa, no puede seguir operando
        $this->app['auth']->forgetGuards();
        $this->actingAs($this->user1->refresh(), 'sanctum')
            ->getJson('/api/tickets')
            ->assertStatus(403);

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertStatus(401);
    }

    public function test_comment_longer_than_limit_is_rejected(): void
    {
        $response = $this->actingAs($this->user1, 'sanctum')
            ->postJson("/api/tickets/{$this->ticketUser1->id}/comments", [
                'comment' => str_repeat('a', 2001),
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors('comment');
    }

    public function test_cors_only_allows_configured_frontend_origin(): void
    {
        $allowed = $this->withHeaders(['Origin' => 'http://localhost:4200'])->getJson('/api/tickets');
        $allowed->assertHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

        $foreign = $this->withHeaders(['Origin' => 'https://sitio-malicioso.example'])->getJson('/api/tickets');
        // El navegador bloquea la respuesta si el origen permitido no coincide con el solicitante
        $this->assertNotSame('https://sitio-malicioso.example', $foreign->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $foreign->headers->get('Access-Control-Allow-Origin'));
    }
}
