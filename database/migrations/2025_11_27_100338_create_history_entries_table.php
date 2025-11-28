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
        Schema::create('history_entries', function (Blueprint $table) {
            $table->id();
            $table->timestamp('timestamp')->useCurrent();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('action'); // CREATE_TASK, UPDATE_TASK, DELETE_TASK, etc.
            $table->unsignedBigInteger('entity_id');
            $table->enum('entity_type', ['task', 'stage', 'project']);
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->json('details')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('history_entries');
    }
};
