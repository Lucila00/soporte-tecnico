<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ticket\StoreCommentRequest;
use App\Http\Requests\Ticket\StoreTicketRequest;
use App\Http\Requests\Ticket\UpdateTicketRequest;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\TicketComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TicketController extends Controller
{
    /**
     * Listado de tickets.
     * Si el solicitante es un usuario común, solo se muestran sus propios tickets.
     * Si es operador o administrador, puede listar todos con filtros avanzados.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Ticket::with(['creator:id,name,email', 'assignee:id,name,email'])
            ->withCount('comments');

        // 1. Filtrado de propiedad: El usuario común solo ve lo suyo
        if ($user->isUser()) {
            $query->where('user_id', $user->id);
        }

        // 2. Filtros opcionales (búsqueda segura parametrizada)
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('search')) {
            $searchTerm = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', $searchTerm)
                  ->orWhere('ticket_code', 'like', $searchTerm)
                  ->orWhere('description', 'like', $searchTerm);
            });
        }

        // Ordenamiento por fecha descendente
        $tickets = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($tickets);
    }

    /**
     * Crear una nueva solicitud de soporte técnico.
     */
    public function store(StoreTicketRequest $request): JsonResponse
    {
        $user = $request->user();

        // Generar código correlativo único (ej: TCK-2026-0005)
        $year = date('Y');
        $lastTicket = Ticket::whereYear('created_at', $year)->latest('id')->first();
        $nextNumber = $lastTicket ? ($lastTicket->id + 1) : 1;
        $ticketCode = sprintf('TCK-%s-%04d', $year, $nextNumber);

        $ticket = Ticket::create([
            'ticket_code' => $ticketCode,
            'user_id' => $user->id,
            'assigned_to' => null,
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'category' => $request->input('category'),
            'priority' => $request->input('priority'),
            'status' => 'abierto',
        ]);

        // Registrar en auditoría
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'TICKET_CREATED',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'details' => [
                'ticket_id' => $ticket->id,
                'ticket_code' => $ticket->ticket_code,
                'priority' => $ticket->priority,
                'category' => $ticket->category,
            ],
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Solicitud de soporte creada exitosamente.',
            'ticket' => $ticket->load(['creator:id,name,email', 'assignee:id,name,email']),
        ], 201);
    }

    /**
     * Ver el detalle de una solicitud.
     * PROTECCIÓN ANTI-IDOR: Gate::authorize('view', $ticket)
     */
    public function show(Request $request, Ticket $ticket): JsonResponse
    {
        // 1. Verificación de autorización con TicketPolicy
        Gate::authorize('view', $ticket);

        $user = $request->user();

        // 2. Cargar relaciones. Si es usuario común, ocultar notas internas de operadores
        $ticket->load([
            'creator:id,name,email',
            'assignee:id,name,email',
            'comments' => function ($q) use ($user) {
                if ($user->isUser()) {
                    $q->where('is_internal', false);
                }
                $q->with('user:id,name,role_id')->orderBy('created_at', 'asc');
            },
        ]);

        return response()->json($ticket);
    }

    /**
     * Modificar una solicitud según los permisos autorizados.
     */
    public function update(UpdateTicketRequest $request, Ticket $ticket): JsonResponse
    {
        Gate::authorize('update', $ticket);

        $user = $request->user();
        $validated = $request->validated();
        $oldStatus = $ticket->status;
        $oldAssigned = $ticket->assigned_to;

        // Si es usuario común, solo se le permite actualizar campos de texto en tickets abiertos
        if ($user->isUser()) {
            $ticket->fill($request->only(['title', 'description']));
        } else {
            // Operadores o administradores
            $ticket->fill($validated);
        }

        $ticket->save();

        // Auditoría de cambios importantes
        if ($oldStatus !== $ticket->status) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'TICKET_STATUS_CHANGED',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'details' => [
                    'ticket_code' => $ticket->ticket_code,
                    'old_status' => $oldStatus,
                    'new_status' => $ticket->status,
                ],
                'created_at' => now(),
            ]);
        }

        if ($oldAssigned !== $ticket->assigned_to) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'TICKET_REASSIGNED',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'details' => [
                    'ticket_code' => $ticket->ticket_code,
                    'assigned_to' => $ticket->assigned_to,
                ],
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Solicitud actualizada correctamente.',
            'ticket' => $ticket->load(['creator:id,name,email', 'assignee:id,name,email']),
        ]);
    }

    /**
     * Eliminar una solicitud.
     * EXCLUSIVO DEL ADMINISTRADOR.
     */
    public function destroy(Request $request, Ticket $ticket): JsonResponse
    {
        Gate::authorize('delete', $ticket);

        $ticketCode = $ticket->ticket_code;
        $ticketId = $ticket->id;

        $ticket->delete();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'TICKET_DELETED',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'details' => [
                'ticket_id' => $ticketId,
                'ticket_code' => $ticketCode,
            ],
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Solicitud eliminada exitosamente del sistema.',
        ]);
    }

    /**
     * Agregar una observación o comentario a la solicitud.
     */
    public function addComment(StoreCommentRequest $request, Ticket $ticket): JsonResponse
    {
        Gate::authorize('addComment', $ticket);

        $user = $request->user();
        $isInternal = false;

        // Solo personal de soporte puede marcar un comentario como nota interna
        if (($user->isOperator() || $user->isAdmin()) && $request->boolean('is_internal')) {
            $isInternal = true;
        }

        $comment = TicketComment::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'comment' => $request->input('comment'),
            'is_internal' => $isInternal,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'TICKET_COMMENT_ADDED',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'details' => [
                'ticket_code' => $ticket->ticket_code,
                'comment_id' => $comment->id,
                'is_internal' => $isInternal,
            ],
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Comentario registrado exitosamente.',
            'comment' => $comment->load('user:id,name,role_id'),
        ], 201);
    }
}
