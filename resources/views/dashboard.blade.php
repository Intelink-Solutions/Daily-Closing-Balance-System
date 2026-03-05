@extends('layouts.app')

@section('title', 'Dashboard | DCBS')

@php
    $active = 'dashboard';
    $title = 'Dashboard';
@endphp

@section('content')
    <div class="space-y-6">
        <div>
            <h3 class="text-2xl font-bold">Overview</h3>
            <p class="text-sm text-slate-500 mt-1">Financial summary and daily closing insights.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <p class="text-sm text-slate-500">Total Transactions</p>
                <p class="text-2xl font-semibold mt-2">0</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <p class="text-sm text-slate-500">Total Credits</p>
                <p class="text-2xl font-semibold mt-2">0.00</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <p class="text-sm text-slate-500">Total Debits</p>
                <p class="text-2xl font-semibold mt-2">0.00</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <p class="text-sm text-slate-500">Closing Balance</p>
                <p class="text-2xl font-semibold mt-2">0.00</p>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-5">
            <h4 class="text-base font-semibold mb-2">Daily Closing Report</h4>
            <p class="text-sm text-slate-500">No data yet. Upload a statement to populate this section.</p>
        </div>
    </div>
@endsection
