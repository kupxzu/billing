<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'statement_id',
        'description',
        'service_date',
        'amount',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'service_date' => 'datetime',
        'amount' => 'decimal:2',
    ];

    /**
     * Get the statement that owns the service.
     */
    public function statement()
    {
        return $this->belongsTo(Statement::class);
    }
}