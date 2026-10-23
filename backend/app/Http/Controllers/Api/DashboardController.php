<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Resumen estadístico adaptado al rol del usuario autenticado.
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Estadísticas para Usuario Común
        if ($user->isUser()) {
            $userTickets = Ticket::where('user_id', $user->id);

            return response()->json([
                'total_tickets' => (clone $userTickets)->count(),
                'abiertos' => (clone $userTickets)->where('status', 'abierto')->count(),
                'en_proceso' => (clone $userTickets)->where('status', 'en_proceso')->count(),
                'resueltos' => (clone $userTickets)->where('status', 'resuelto')->count(),
                'cerrados' => (clone $userTickets)->where('status', 'cerrado')->count(),
                'recent_tickets' => (clone $userTickets)->with('assignee:id,name')->latest()->take(5)->get(),
            ]);
        }

        // 2. Estadísticas para Operador y Administrador
        $totalTickets = Ticket::count();
        $abiertos = Ticket::where('status', 'abierto')->count();
        $enProceso = Ticket::where('status', 'en_proceso')->count();
        $resueltos = Ticket::where('status', 'resuelto')->count();
        $cerrados = Ticket::where('status', 'cerrado')->count();

        // Tickets asignados a este operador
        $misAsignados = Ticket::where('assigned_to', $user->id)
            ->whereIn('status', ['abierto', 'en_proceso'])
            ->count();

        // Distribución por prioridad
        $porPrioridad = Ticket::select('priority', DB::raw('count(*) as total'))
            ->groupBy('priority')
            ->pluck('total', 'priority');

        // Distribución por categoría
        $porCategoria = Ticket::select('category', DB::raw('count(*) as total'))
            ->groupBy('category')
            ->pluck('total', 'category');

        $data = [
            'total_tickets' => $totalTickets,
            'abiertos' => $abiertos,
            'en_proceso' => $enProceso,
            'resueltos' => $resueltos,
            'cerrados' => $cerrados,
            'mis_asignados' => $misAsignados,
            'por_prioridad' => $porPrioridad,
            'por_categoria' => $porCategoria,
            'recent_tickets' => Ticket::with(['creator:id,name', 'assignee:id,name'])->latest()->take(6)->get(),
        ];

        // Métricas exclusivas para administradores
        if ($user->isAdmin()) {
            $data['total_users'] = User::count();
            $data['active_users'] = User::where('is_active', true)->count();
            $data['inactive_users'] = User::where('is_active', false)->count();
            $data['recent_audits'] = AuditLog::with('user:id,name')->latest()->take(5)->get();
        }

        return response()->json($data);
    }
}
