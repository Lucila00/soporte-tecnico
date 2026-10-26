<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Eliminar de la base de datos los tokens de acceso vencidos hace más de 24 horas
Schedule::command('sanctum:prune-expired --hours=24')->daily();
