<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Statement extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'statement_number',
        'total_amount',
        'issue_date',
        'due_date',
        'status',
        'access_token',
        'token_expires_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'issue_date' => 'datetime',
        'due_date' => 'datetime',
        'token_expires_at' => 'datetime',
    ];

    /**
     * Get the user that owns the statement.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function services()
{
    return $this->hasMany(Service::class);
}
}