<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StatementResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
// StatementResource.php
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'statement_number' => $this->statement_number,
        'total_amount' => $this->total_amount,
        'issue_date' => $this->issue_date->format('Y-m-d'),
        'due_date' => $this->due_date->format('Y-m-d'),
        'status' => $this->status,
        'services' => ServiceResource::collection($this->whenLoaded('services')),
        'created_at' => $this->created_at->format('Y-m-d H:i:s'),
        'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
    ];
}
}