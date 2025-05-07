<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Statement;

class StatementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Create a sample patient user first if not exists
        $patientExists = User::where('email', 'patient@example.com')->exists();
        
        if (!$patientExists) {
            $patient = User::create([
                'name' => 'Test Patient',
                'email' => 'patient1@example.com',
                'password' => bcrypt('patient123'),
                'role' => 'patient',
                'email_verified_at' => now(),
            ]);
        } else {
            $patient = User::where('email', 'patient@example.com')->first();
        }

        // Create sample statements for the patient
        for ($i = 1; $i <= 3; $i++) {
            Statement::create([
                'user_id' => $patient->id,
                'statement_number' => 'SOA-' . str_pad($i, 8, '0', STR_PAD_LEFT),
                'total_amount' => rand(10000, 50000) / 100, // Random amount between $100 and $500
                'issue_date' => now()->subDays(rand(1, 30)),
                'due_date' => now()->addDays(30),
                'status' => 'issued',
            ]);
        }

        $this->command->info('Sample statements created successfully!');
    }
}