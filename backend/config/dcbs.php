<?php

return [
    'statement_chunk_size' => 500,
    'statement_max_rows_sync' => 1000,
    'default_currency' => 'USD',
    'auth_guard' => env('API_AUTH_GUARD', 'sanctum'),
    'auth_package' => env('API_AUTH_PACKAGE', 'sanctum'),
];
