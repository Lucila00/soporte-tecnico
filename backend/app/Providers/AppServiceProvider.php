<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Límite global de intentos de login por IP. Complementa el bloqueo por
        // email + IP de LoginRequest, que no frena a quien prueba muchos correos distintos.
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip())->response(function () {
                return response()->json([
                    'message' => 'Demasiados intentos de inicio de sesión desde esta red. Intenta nuevamente en un minuto.',
                ], 429);
            });
        });
    }
}
