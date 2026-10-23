<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::where('name', 'administrador')->first();
        $operatorRole = Role::where('name', 'operador')->first();
        $userRole = Role::where('name', 'usuario')->first();

        $users = [
            [
                'name' => 'Super Administrador',
                'email' => 'admin@soporte.local',
                'password' => Hash::make('Admin123!'),
                'role_id' => $adminRole->id,
                'is_active' => true,
            ],
            [
                'name' => 'Técnico Especialista',
                'email' => 'operador@soporte.local',
                'password' => Hash::make('Operador123!'),
                'role_id' => $operatorRole->id,
                'is_active' => true,
            ],
            [
                'name' => 'Lucía Fernández (Cliente)',
                'email' => 'usuario@soporte.local',
                'password' => Hash::make('Usuario123!'),
                'role_id' => $userRole->id,
                'is_active' => true,
            ],
            [
                'name' => 'Carlos Gómez (Cliente 2)',
                'email' => 'carlos@soporte.local',
                'password' => Hash::make('Usuario123!'),
                'role_id' => $userRole->id,
                'is_active' => true,
            ],
            [
                'name' => 'Cuenta Desactivada',
                'email' => 'bloqueado@soporte.local',
                'password' => Hash::make('Bloqueado123!'),
                'role_id' => $userRole->id,
                'is_active' => false,
            ],
        ];

        foreach ($users as $userData) {
            User::firstOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }
    }
}
