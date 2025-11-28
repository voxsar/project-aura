<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //
		$departments = [
			'Human Resources',
			'Finance',
			'Design',
			'Digital Marketing',
			'IT',
		];

		foreach ($departments as $deptName) {
			Department::create(['name' => $deptName]);
		}
    }
}
