<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Statement;
use Illuminate\Http\Request;
use App\Http\Resources\StatementResource;
use App\Http\Resources\StatementCollection;

class PatientController extends Controller
{
    /**
     * Get patient profile
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProfile(Request $request)
    {
        try {
            $user = $request->user();
            
            // Ensure user is a patient
            if ($user->role !== 'patient') {
                return response()->json([
                    'status' => false,
                    'message' => 'Access denied. Only patients can access this resource.'
                ], 403);
            }
            
            return response()->json([
                'status' => true,
                'message' => 'Profile retrieved successfully',
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $user->created_at->format('Y-m-d H:i:s')
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get patient statements
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatements(Request $request)
    {
        try {
            $user = $request->user();
            
            // Ensure user is a patient
            if ($user->role !== 'patient') {
                return response()->json([
                    'status' => false,
                    'message' => 'Access denied. Only patients can access this resource.'
                ], 403);
            }
            
            // Add detailed logging
            \Log::info('Fetching statements for patient', ['patient_id' => $user->id]);
            
            $statements = Statement::where('user_id', $user->id)
                          ->orderBy('created_at', 'desc')
                          ->paginate(10);
            
            \Log::info('Found statements', ['count' => $statements->count()]);
            
            return response()->json([
                'status' => true,
                'message' => 'Statements retrieved successfully',
                'data' => new StatementCollection($statements)
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Failed to retrieve patient statements: ' . $e->getMessage());
            
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve statements',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * View a specific statement
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function viewStatement(Request $request, $id)
    {
        try {
            // Log details for debugging
            \Log::info('Viewing patient statement', ['statement_id' => $id, 'user_id' => $request->user()->id]);
            
            $user = $request->user();
            
            // Ensure user is a patient
            if ($user->role !== 'patient') {
                return response()->json([
                    'status' => false,
                    'message' => 'Access denied. Only patients can access this resource.'
                ], 403);
            }
            
            // Find statement with service relationships
            $statement = Statement::with('services')
                         ->where('id', $id)
                         ->where('user_id', $user->id)
                         ->first();
            
            if (!$statement) {
                \Log::warning('Statement not found', ['statement_id' => $id, 'user_id' => $user->id]);
                return response()->json([
                    'status' => false,
                    'message' => 'Statement not found or you do not have permission to view it.'
                ], 404);
            }
            
            \Log::info('Statement found', ['statement_id' => $statement->id]);
            
            return response()->json([
                'status' => true,
                'message' => 'Statement retrieved successfully',
                'data' => $statement
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Failed to retrieve statement: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve statement',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}