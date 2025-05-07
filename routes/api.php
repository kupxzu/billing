<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UsersController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\PatientController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/login', [UsersController::class, 'login']);

// Statement view route (accessible via signed URL)
Route::get('/statement/view/{token}', [BillingController::class, 'viewStatement'])
    ->name('statement.view')
    ->middleware('signed');

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // User routes
    Route::apiResource('users', UsersController::class);
    Route::post('/logout', [UsersController::class, 'logout']);
    
    // Current user info
    Route::get('/user', function (Request $request) {
        return response()->json([
            'status' => true,
            'message' => 'User retrieved successfully',
            'data' => new \App\Http\Resources\UserResource($request->user())
        ]);
    });
    
    // Admin/Billing routes
    Route::middleware('role:admin')->group(function () {
        // Billing routes
        Route::get('/billing/patients', [BillingController::class, 'getPatients']);
        Route::get('/billing/patients/{id}', [BillingController::class, 'getPatientDetails']);
        Route::post('/billing/statements', [BillingController::class, 'createStatement']);
        Route::post('/billing/statements/generate-qr', [BillingController::class, 'generateStatementQR']);
        Route::get('/billing/statements', [BillingController::class, 'getAllStatements']);
        Route::get('/billing/statements/{id}/qr', [BillingController::class, 'getStatementQR']);
        Route::put('/billing/statements/{id}/qr-expiration', [BillingController::class, 'updateQRExpiration']);

    });
    
    // Patient routes
    Route::middleware('role:patient')->group(function () {
        Route::get('/patient/profile', [PatientController::class, 'getProfile']);
        Route::get('/patient/statements', [PatientController::class, 'getStatements']);
        Route::get('/patient/statements/{id}', [PatientController::class, 'viewStatement']);
    });
});