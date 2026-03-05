<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment('DCBS API running.');
})->purpose('Display a startup message');
