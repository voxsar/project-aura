<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->string('user_status')->default('pending');
            $table->foreignId('project_stage_id')->nullable()->constrained('stages')->nullOnDelete();
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->json('tags')->nullable();
            $table->timestamp('start_date')->nullable();
            $table->boolean('is_in_specific_stage')->default(false);
            $table->text('revision_comment')->nullable();
            $table->foreignId('previous_stage_id')->nullable()->constrained('stages')->nullOnDelete();
            $table->foreignId('original_assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
