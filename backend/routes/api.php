<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\TicketController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Sistema de Soporte Técnico
|--------------------------------------------------------------------------
*/

// 1. Autenticación Pública
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

// 2. Rutas Protegidas (Requieren autenticación y cuenta activa)
Route::middleware(['auth:sanctum', 'active'])->group(function () {

    // Perfil y Sesión
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);

    // Dashboard y Estadísticas
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    // Gestión de Solicitudes (Tickets)
    Route::get('/tickets', [TicketController::class, 'index']);
    Route::post('/tickets', [TicketController::class, 'store']);
    Route::get('/tickets/{ticket}', [TicketController::class, 'show']);
    Route::put('/tickets/{ticket}', [TicketController::class, 'update']);
    Route::delete('/tickets/{ticket}', [TicketController::class, 'destroy']);
    Route::post('/tickets/{ticket}/comments', [TicketController::class, 'addComment']);

    // Lista de técnicos para asignación de tickets (Operador o Administrador)
    Route::get('/operators', [AdminUserController::class, 'operators'])
        ->middleware('role:operador,administrador');

    // Módulo Administrativo (Exclusivo Administrador)
    Route::middleware('role:administrador')->prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::put('/users/{user}', [AdminUserController::class, 'update']);
        Route::get('/roles', [AdminUserController::class, 'roles']);
        Route::get('/audit-logs', [AdminUserController::class, 'auditLogs']);
    });
});
