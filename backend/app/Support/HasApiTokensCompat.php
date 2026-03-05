<?php

namespace App\Support;

if (trait_exists(\Laravel\Sanctum\HasApiTokens::class)) {
    trait HasApiTokensCompat
    {
        use \Laravel\Sanctum\HasApiTokens;
    }
} elseif (trait_exists(\Laravel\Passport\HasApiTokens::class)) {
    trait HasApiTokensCompat
    {
        use \Laravel\Passport\HasApiTokens;
    }
} else {
    trait HasApiTokensCompat
    {
    }
}
