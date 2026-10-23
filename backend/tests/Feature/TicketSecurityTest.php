<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class TicketSecurityTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $operator;
    protected User $user1;
    protected User $user2;
    protected Ticket $ticketUser1;
    protected Ticket $ticketUser2;

    protected function setUp(): void
    {
        parent::setUp();

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
}
