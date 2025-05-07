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
        Schema::create('statements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('statement_number')->nullable();
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->timestamp('issue_date')->nullable();
            $table->timestamp('due_date')->nullable();
            $table->enum('status', ['draft', 'issued', 'paid', 'overdue'])->default('draft');
            $table->string('access_token', 64)->nullable()->unique();
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('statements');
    }
};