<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Models\Project;
use App\Models\Stage;
use App\Models\Task;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SampleDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get departments
        $departments = Department::all();
        $designDept = $departments->where('name', 'Design')->first();
        $digitalDept = $departments->where('name', 'Digital Marketing')->first();
        $itDept = $departments->where('name', 'IT')->first();

        // Create sample users
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'department_id' => $itDept->id,
            ]
        );

        $teamLead1 = User::firstOrCreate(
            ['email' => 'design.lead@example.com'],
            [
                'name' => 'Design Team Lead',
                'password' => Hash::make('password'),
                'role' => 'team-lead',
                'department_id' => $designDept->id,
            ]
        );

        $teamLead2 = User::firstOrCreate(
            ['email' => 'digital.lead@example.com'],
            [
                'name' => 'Digital Team Lead',
                'password' => Hash::make('password'),
                'role' => 'team-lead',
                'department_id' => $digitalDept->id,
            ]
        );

        $user1 = User::firstOrCreate(
            ['email' => 'john@example.com'],
            [
                'name' => 'John Designer',
                'password' => Hash::make('password'),
                'role' => 'user',
                'department_id' => $designDept->id,
            ]
        );

        $user2 = User::firstOrCreate(
            ['email' => 'sarah@example.com'],
            [
                'name' => 'Sarah Developer',
                'password' => Hash::make('password'),
                'role' => 'user',
                'department_id' => $digitalDept->id,
            ]
        );

        // Create sample projects
        $project1 = Project::create([
            'name' => 'Website Redesign',
            'description' => 'Complete redesign of company website',
            'department_id' => $designDept->id,
            'emails' => ['client@example.com'],
            'phone_numbers' => ['+1234567890'],
        ]);

        $project2 = Project::create([
            'name' => 'Marketing Campaign',
            'description' => 'Q1 2024 Marketing Campaign',
            'department_id' => $digitalDept->id,
            'emails' => ['marketing@example.com'],
            'phone_numbers' => ['+0987654321'],
        ]);

        // Create stages for project 1
        $stage1_1 = Stage::create([
            'title' => 'Planning',
            'type' => 'project',
            'order' => 1,
            'project_id' => $project1->id,
            'main_responsible_id' => $teamLead1->id,
        ]);

        $stage1_2 = Stage::create([
            'title' => 'Design',
            'type' => 'project',
            'order' => 2,
            'project_id' => $project1->id,
            'main_responsible_id' => $user1->id,
        ]);

        $stage1_3 = Stage::create([
            'title' => 'Development',
            'type' => 'project',
            'order' => 3,
            'project_id' => $project1->id,
            'main_responsible_id' => $user2->id,
        ]);

        // Create stages for project 2
        $stage2_1 = Stage::create([
            'title' => 'Strategy',
            'type' => 'project',
            'order' => 1,
            'project_id' => $project2->id,
            'main_responsible_id' => $teamLead2->id,
        ]);

        $stage2_2 = Stage::create([
            'title' => 'Execution',
            'type' => 'project',
            'order' => 2,
            'project_id' => $project2->id,
            'main_responsible_id' => $user2->id,
        ]);

        // Create sample tasks
        Task::create([
            'title' => 'Create wireframes',
            'description' => 'Design initial wireframes for homepage',
            'user_status' => 'in-progress',
            'priority' => 'high',
            'assignee_id' => $user1->id,
            'project_id' => $project1->id,
            'project_stage_id' => $stage1_2->id,
            'due_date' => now()->addDays(7),
        ]);

        Task::create([
            'title' => 'Setup development environment',
            'description' => 'Configure local dev environment',
            'user_status' => 'pending',
            'priority' => 'medium',
            'assignee_id' => $user2->id,
            'project_id' => $project1->id,
            'project_stage_id' => $stage1_3->id,
            'due_date' => now()->addDays(3),
        ]);

        Task::create([
            'title' => 'Social media content plan',
            'description' => 'Create content calendar for social media',
            'user_status' => 'pending',
            'priority' => 'high',
            'assignee_id' => $user2->id,
            'project_id' => $project2->id,
            'project_stage_id' => $stage2_1->id,
            'due_date' => now()->addDays(5),
        ]);
    }
}
