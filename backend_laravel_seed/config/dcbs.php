<?php

return [
    'statement_chunk_size' => 500,
    'statement_max_rows_sync' => 1000,
    'statement_max_sync_file_kb' => (int) env('STATEMENT_MAX_SYNC_FILE_KB', 2048),
    'statement_memory_limit' => env('STATEMENT_MEMORY_LIMIT', '512M'),
    'statement_time_limit_seconds' => (int) env('STATEMENT_TIME_LIMIT_SECONDS', 300),
    'tesseract_binary' => env('TESSERACT_BINARY', 'tesseract'),
    'ocr_language' => env('OCR_LANGUAGE', 'eng'),
    'ai_timeout_seconds' => (int) env('AI_PARSER_TIMEOUT_SECONDS', 30),
    'default_currency' => 'USD',
    'auth_guard' => env('API_AUTH_GUARD', 'sanctum'),
    'auth_package' => env('API_AUTH_PACKAGE', 'sanctum'),
];
