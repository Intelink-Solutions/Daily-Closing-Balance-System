@php
    $active = $active ?? 'dashboard';

    $menu = [
        ['key' => 'dashboard', 'label' => 'Dashboard', 'route' => 'dashboard'],
        ['key' => 'upload', 'label' => 'Upload Statement', 'route' => 'upload.statement'],
        ['key' => 'transactions', 'label' => 'Transactions', 'route' => 'transactions.index'],
        ['key' => 'daily-report', 'label' => 'Daily Closing Report', 'route' => 'daily.report'],
        ['key' => 'settings', 'label' => 'Settings', 'route' => 'settings.index'],
    ];
@endphp

<aside class="w-64 bg-white border-r border-slate-200 hidden md:block">
    <div class="h-16 px-6 flex items-center border-b border-slate-200">
        <h1 class="text-lg font-semibold">DCBS</h1>
    </div>

    <nav class="p-4 space-y-1">
        @foreach ($menu as $item)
            @php
                $isActive = $active === $item['key'];
            @endphp
            <a
                href="{{ Route::has($item['route']) ? route($item['route']) : '#' }}"
                class="block px-3 py-2 rounded-md text-sm font-medium transition
                    {{ $isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100' }}"
            >
                {{ $item['label'] }}
            </a>
        @endforeach
    </nav>
</aside>
