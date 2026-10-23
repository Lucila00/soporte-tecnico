<?php

namespace Database\Seeders;

use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\User;
use Illuminate\Database\Seeder;

class TicketSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user1 = User::where('email', 'usuario@soporte.local')->first();
        $user2 = User::where('email', 'carlos@soporte.local')->first();
        $operator = User::where('email', 'operador@soporte.local')->first();

        if (!$user1 || !$user2 || !$operator) {
            return;
        }

        // Ticket 1 de Lucía: Problema de impresora (Abierto)
        $t1 = Ticket::firstOrCreate(
            ['ticket_code' => 'TCK-2026-001'],
            [
                'user_id' => $user1->id,
                'assigned_to' => null,
                'title' => 'Impresora del departamento de finanzas no responde',
                'description' => 'La impresora multifunción HP LaserJet no imprime desde la mañana. Queda en cola de impresión con error de comunicación.',
                'category' => 'hardware',
                'priority' => 'media',
                'status' => 'abierto',
            ]
        );

        TicketComment::firstOrCreate(
            ['ticket_id' => $t1->id, 'user_id' => $user1->id, 'comment' => 'He intentado reiniciar el equipo y el cable USB pero persiste.']
        );

        // Ticket 2 de Lucía: Configuración de software (En Proceso)
        $t2 = Ticket::firstOrCreate(
            ['ticket_code' => 'TCK-2026-002'],
            [
                'user_id' => $user1->id,
                'assigned_to' => $operator->id,
                'title' => 'Solicitud de instalación de software contable ERP',
                'description' => 'Requiero la instalación y licencia de la versión 2026 del ERP para la nueva estación de trabajo.',
                'category' => 'software',
                'priority' => 'alta',
                'status' => 'en_proceso',
            ]
        );

        TicketComment::firstOrCreate(
            ['ticket_id' => $t2->id, 'user_id' => $operator->id, 'comment' => 'Ticket tomado. Nos conectaremos remotamente a las 15:00 hs para realizar la instalación.', 'is_internal' => false]
        );

        // Ticket 3 de Lucía: Internet (Resuelto)
        $t3 = Ticket::firstOrCreate(
            ['ticket_code' => 'TCK-2026-003'],
            [
                'user_id' => $user1->id,
                'assigned_to' => $operator->id,
                'title' => 'Cortes intermitentes de conexión Wi-Fi en oficina 3',
                'description' => 'La señal Wi-Fi cae cada 10 minutos al realizar videollamadas.',
                'category' => 'red',
                'priority' => 'alta',
                'status' => 'resuelto',
            ]
        );

        TicketComment::firstOrCreate(
            ['ticket_id' => $t3->id, 'user_id' => $operator->id, 'comment' => 'Se reinició el punto de acceso y se reasignó el canal de 5GHz libre. Pruebas de ping estables.', 'is_internal' => false]
        );

        // Ticket 4 de Carlos: Acceso VPN (Abierto) - Útil para prueba IDOR
        Ticket::firstOrCreate(
            ['ticket_code' => 'TCK-2026-004'],
            [
                'user_id' => $user2->id,
                'assigned_to' => null,
                'title' => 'Error de autenticación al conectar a la VPN corporativa',
                'description' => 'Al ingresar mis credenciales en el cliente VPN OpenVPN, me indica que el certificado ha expirado.',
                'category' => 'acceso',
                'priority' => 'critica',
                'status' => 'abierto',
            ]
        );
    }
}
