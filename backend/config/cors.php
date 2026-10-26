<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Configuración segura para permitir comunicación exclusiva con la SPA Angular
    | permitiendo cookies de sesión seguras y cabeceras CSRF.
    |
    */

    'paths' => [
        'api/*',
    ],

    'allowed_methods' => ['*'],

    // Solo el frontend Angular puede consumir la API (lista separada por comas)
    'allowed_origins' => array_map('trim', explode(',', env('FRONTEND_URL', 'http://localhost:4200'))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
