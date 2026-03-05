@php
    $title = $title ?? 'Dashboard';
@endphp

<header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
    <div>
        <h2 class="text-lg font-semibold text-slate-900">{{ $title }}</h2>
    </div>

    <div class="flex items-center gap-3">
        <button type="button" class="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">
            Notifications
        </button>
        <div class="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
            A
        </div>
    </div>
</header>
