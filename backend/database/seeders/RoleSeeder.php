<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'name' => 'administrador',
                'description' => 'Administrador general del sistema con acceso total a usuarios, tickets, roles y auditoría.',
            ],
            [
                'name' => 'operador',
                'description' => 'Personal de soporte técnico encargado de gestionar, atender y resolver tickets.',
            ],
            [
                'name' => 'usuario',
                'description' => 'Usuario solicitante/cliente que puede reportar y seguir sus propias solicitudes de asistencia.',
            ],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(
                ['name' => $role['name']],
                ['description' => $role['description']]
            );
        }
    }
}
