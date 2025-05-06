<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UsersController;

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
});