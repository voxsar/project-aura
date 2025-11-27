<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Filament\Models\Contracts\FilamentUser;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'name' => 'Admin',
            'email' => 'miyuru@artslabcreatives.com',
            'email_verified_at' => now(),
            'password' => Hash::make('miyuru@artslabcreatives.com@123'),
            'remember_token' => Str::random(10),
        ]);
    }
}
