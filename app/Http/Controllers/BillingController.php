<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Statement;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Barryvdh\DomPDF\Facade\PDF;

class BillingController extends Controller
{
    /**
     * Get all patients
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPatients()
    {
        try {
            $patients = User::where('role', 'patient')
                        ->orderBy('name')
                        ->get(['id', 'name', 'email', 'created_at']);
            
            return response()->json([
                'status' => true,
                'message' => 'Patients retrieved successfully',
                'data' => $patients
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve patients: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve patients',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get patient details
     * 
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPatientDetails($id)
    {
        try {
            $patient = User::where('id', $id)
                      ->where('role', 'patient')
                      ->firstOrFail();
            
            $statements = Statement::where('user_id', $patient->id)
                          ->orderBy('created_at', 'desc')
                          ->get();
            
            return response()->json([
                'status' => true,
                'message' => 'Patient details retrieved successfully',
                'data' => [
                    'patient' => $patient,
                    'statements' => $statements
                ]
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve patient details: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve patient details',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Create statement of account
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function createStatement(Request $request)
    {
        try {
            // Log the incoming request data
            Log::info('Statement creation request data:', $request->all());
            
            // Validate request
            $validator = Validator::make($request->all(), [
                'patient_id' => 'required|exists:users,id,role,patient',
                'issue_date' => 'required|date',
                'due_date' => 'required|date|after:issue_date',
                'services' => 'required|array|min:1',
                'services.*.description' => 'required|string|max:255',
                'services.*.date' => 'required|date',
                'services.*.amount' => 'required|numeric|min:0'
            ]);
    
            if ($validator->fails()) {
                Log::warning('Statement validation failed:', $validator->errors()->toArray());
                return response()->json([
                    'status' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            // Calculate total amount
            $totalAmount = 0;
            foreach ($request->services as $service) {
                $totalAmount += $service['amount'];
            }
            
            Log::info('Calculated total amount: ' . $totalAmount);
            
            // Generate statement number
            $statementNumber = 'SOA-' . str_pad(Statement::count() + 1, 8, '0', STR_PAD_LEFT);
            
            DB::beginTransaction();
            
            try {
                // Create statement
                $statement = Statement::create([
                    'user_id' => $request->patient_id,
                    'statement_number' => $statementNumber,
                    'total_amount' => $totalAmount,
                    'issue_date' => $request->issue_date,
                    'due_date' => $request->due_date,
                    'status' => 'issued'
                ]);
                
                Log::info('Statement created:', ['id' => $statement->id]);
                
                // Create services
                foreach ($request->services as $serviceData) {
                    Log::info('Creating service:', $serviceData);
                    
                    Service::create([
                        'statement_id' => $statement->id,
                        'description' => $serviceData['description'],
                        'service_date' => $serviceData['date'],
                        'amount' => $serviceData['amount']
                    ]);
                }
                
                DB::commit();
                
                return response()->json([
                    'status' => true,
                    'message' => 'Statement created successfully',
                    'data' => $statement
                ], 201);
                
            } catch (\Exception $innerException) {
                DB::rollBack();
                Log::error('Failed to create statement or services: ' . $innerException->getMessage());
                Log::error($innerException->getTraceAsString());
                
                throw $innerException;
            }
        } catch (\Exception $e) {
            Log::error('Statement creation failed: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            return response()->json([
                'status' => false,
                'message' => 'Failed to create statement',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }
    
    /**
     * Generate QR code and PDF for statement
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function generateStatementQR(Request $request)
    {
        try {
            // Validate request
            $request->validate([
                'statement_id' => 'required|exists:statements,id',
                'expiry_days' => 'nullable|integer|min:1|max:30'
            ]);
            
            // Get statement
            $statement = Statement::with('user')->findOrFail($request->statement_id);
            
            // Generate token
            $token = Str::random(64);
            
            // Set expiry (default 7 days)
            $expiryDays = $request->expiry_days ?? 7;
            $expiryDate = now()->addDays($expiryDays);
            
            // Save token to statement
            $statement->access_token = $token;
            $statement->token_expires_at = $expiryDate;
            $statement->save();
            
            // Generate URL
            $url = URL::temporarySignedRoute(
                'statement.view', 
                $expiryDate, 
                ['token' => $token]
            );
            
            Log::info('Generated signed URL', ['url' => $url]);
            
            // Ensure storage directories exist
            $this->ensureDirectoriesExist(['qrcodes', 'statements']);
            
            // Generate QR code
            $qrCode = QrCode::format('png')
                            ->size(300)
                            ->errorCorrection('H')
                            ->generate($url);
                            
            // Store QR code
            $qrFilename = 'statement_' . $statement->id . '_' . time() . '.png';
            $qrPath = 'qrcodes/' . $qrFilename;
            Storage::disk('public')->put($qrPath, $qrCode);
            
            $qrUrl = url(Storage::url($qrPath));
            Log::info('QR code saved', ['path' => $qrPath, 'url' => $qrUrl]);
            
            // Generate and store PDF
            try {
                // Get services
                $services = Service::where('statement_id', $statement->id)
                            ->orderBy('service_date')
                            ->get();
                
                $data = [
                    'patient' => $statement->user,
                    'statement' => $statement,
                    'hospital_name' => 'Medical Center Hospital',
                    'hospital_address' => '123 Health Avenue, Medical District',
                    'hospital_contact' => '+1 (555) 123-4567',
                    'date_issued' => $statement->issue_date->format('F d, Y'),
                    'due_date' => $statement->due_date->format('F d, Y'),
                    'services' => $services,
                    'total_amount' => $statement->total_amount,
                    'payment_instructions' => 'Please make payment before the due date. For questions, contact our billing department at billing@medicalcenter.com.'
                ];
                
                // Check if view exists
                if (!view()->exists('pdf.statement_of_account')) {
                    Log::warning('PDF view not found: pdf.statement_of_account');
                    throw new \Exception('PDF template not found.');
                }
                
                // Generate PDF
                $pdf = PDF::loadView('pdf.statement_of_account', $data);
                $pdf->setPaper('a4', 'portrait');
                
                // Store PDF
                $pdfFilename = 'statement_' . $statement->id . '_' . time() . '.pdf';
                $pdfPath = 'statements/' . $pdfFilename;
                Storage::disk('public')->put($pdfPath, $pdf->output());
                
                $pdfUrl = url(Storage::url($pdfPath));
                Log::info('PDF saved', ['path' => $pdfPath, 'url' => $pdfUrl]);
            } catch (\Exception $pdfException) {
                Log::error('PDF generation failed: ' . $pdfException->getMessage());
                $pdfUrl = null; // Set PDF URL to null if generation fails
            }
            
            // Return response with URLs
            return response()->json([
                'status' => true,
                'message' => 'QR code and statement generated successfully',
                'data' => [
                    'statement' => $statement,
                    'qr_url' => $qrUrl,
                    'pdf_url' => $pdfUrl ?? null,
                    'direct_url' => $url,
                    'expires_at' => $expiryDate
                ]
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('Statement QR code generation failed: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            return response()->json([
                'status' => false,
                'message' => 'Failed to generate QR code',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Helper method to ensure storage directories exist
     *
     * @param array $directories
     * @return void
     */
    private function ensureDirectoriesExist(array $directories)
    {
        foreach ($directories as $directory) {
            if (!Storage::disk('public')->exists($directory)) {
                Storage::disk('public')->makeDirectory($directory);
                Log::info('Created directory', ['directory' => $directory]);
            }
        }
    }
    
    /**
     * View statement by token
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function viewStatement(Request $request)
    {
        try {
            Log::info('Viewing statement with token', ['token' => $request->token]);
            
            // Validate signature
            if (!$request->hasValidSignature()) {
                Log::warning('Invalid signature for token', ['token' => $request->token]);
                return response()->json([
                    'status' => false,
                    'message' => 'Invalid or expired signature.'
                ], 401);
            }
            
            // Get statement by token (no login required)
            $token = $request->token;
            $statement = Statement::where('access_token', $token)
                          ->where('token_expires_at', '>=', now())
                          ->firstOrFail();
            
            Log::info('Statement found', ['id' => $statement->id]);
            
            // Get services
            $services = Service::where('statement_id', $statement->id)
                        ->orderBy('service_date')
                        ->get();
            
            $data = [
                'patient' => $statement->user,
                'statement' => $statement,
                'hospital_name' => 'Medical Center Hospital',
                'hospital_address' => '123 Health Avenue, Medical District',
                'hospital_contact' => '+1 (555) 123-4567',
                'date_issued' => $statement->issue_date->format('F d, Y'),
                'due_date' => $statement->due_date->format('F d, Y'),
                'services' => $services,
                'total_amount' => $statement->total_amount,
                'payment_instructions' => 'Please make payment before the due date. For questions, contact our billing department at billing@medicalcenter.com.'
            ];
            
            // Check if view exists
            if (!view()->exists('pdf.statement_of_account')) {
                Log::warning('PDF view not found: pdf.statement_of_account');
                return response()->json([
                    'status' => false,
                    'message' => 'PDF template not found.'
                ], 500);
            }
            
            // Generate PDF
            $pdf = PDF::loadView('pdf.statement_of_account', $data);
            $pdf->setPaper('a4', 'portrait');
            
            // Stream PDF
            return $pdf->stream('statement_' . $statement->statement_number . '.pdf');
        } catch (\Exception $e) {
            Log::error('View statement error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            return response()->json([
                'status' => false,
                'message' => 'Statement not found or link has expired.',
                'error' => $e->getMessage()
            ], 404);
        }
    }
    
    /**
     * Get all statements
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAllStatements()
    {
        try {
            $statements = Statement::with('user')
                          ->orderBy('created_at', 'desc')
                          ->paginate(10);
            
            return response()->json([
                'status' => true,
                'message' => 'Statements retrieved successfully',
                'data' => $statements
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve statements: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve statements',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    private function generateSOAPdf($statement, $qrImageData = null)
{
    // Get services
    $services = Service::where('statement_id', $statement->id)
                ->orderBy('service_date')
                ->get();
    
    // If QR code image data wasn't provided, generate it
    if (!$qrImageData) {
        // Generate URL if needed
        $url = URL::temporarySignedRoute(
            'statement.view', 
            $statement->token_expires_at ?? now()->addDays(30), 
            ['token' => $statement->access_token]
        );
        
        $qrImageData = QrCode::format('png')
                      ->size(300)
                      ->errorCorrection('H')
                      ->generate($url);
    }
    
    $data = [
        'patient' => $statement->user,
        'statement' => $statement,
        'hospital_name' => 'Medical Center Hospital',
        'hospital_address' => '123 Health Avenue, Medical District',
        'hospital_contact' => '+1 (555) 123-4567',
        'date_issued' => $statement->issue_date->format('F d, Y'),
        'due_date' => $statement->due_date->format('F d, Y'),
        'services' => $services,
        'total_amount' => $statement->total_amount,
        'payment_instructions' => 'Please make payment before the due date.',
        'qrCode' => $qrImageData  // Pass QR code to the view
    ];
    
    // Generate PDF
    $pdf = PDF::loadView('pdf.statement_of_account', $data);
    $pdf->setPaper('a4', 'portrait');
    
    return $pdf;
}


public function getStatementQR($id)
{
    try {
        // Get statement
        $statement = Statement::with('user')->findOrFail($id);
        
        // Check if statement has QR code
        if (!$statement->access_token || !$statement->token_expires_at) {
            return response()->json([
                'status' => false,
                'message' => 'This statement does not have a QR code yet.'
            ], 404);
        }
        
        // Check if token is expired
        if (now()->gt($statement->token_expires_at)) {
            return response()->json([
                'status' => false,
                'message' => 'This statement\'s QR code has expired.',
                'data' => [
                    'statement' => $statement,
                    'expires_at' => $statement->token_expires_at
                ]
            ], 200);
        }
        
        // Generate URL
        $url = URL::temporarySignedRoute(
            'statement.view', 
            $statement->token_expires_at, 
            ['token' => $statement->access_token]
        );
        
        // Get the QR code path
        $qrPath = 'qrcodes/statement_' . $statement->id . '_*.png';
        $files = Storage::disk('public')->files('qrcodes');
        $matchingFiles = preg_grep('/statement_' . $statement->id . '_[0-9]+\.png$/', $files);
        
        if (empty($matchingFiles)) {
            // If QR code file doesn't exist, generate it
            $qrCode = QrCode::format('png')
                            ->size(300)
                            ->errorCorrection('H')
                            ->generate($url);
                            
            // Store QR code
            $qrPath = 'qrcodes/statement_' . $statement->id . '_' . time() . '.png';
            Storage::disk('public')->put($qrPath, $qrCode);
        } else {
            // Use the existing QR code
            $qrPath = reset($matchingFiles);
        }
        
        // Return QR code data
        return response()->json([
            'status' => true,
            'message' => 'QR code retrieved successfully',
            'data' => [
                'statement' => $statement,
                'qr_url' => url(Storage::url($qrPath)),
                'direct_url' => $url,
                'expires_at' => $statement->token_expires_at
            ]
        ], 200);
        
    } catch (\Exception $e) {
        Log::error('Error retrieving statement QR: ' . $e->getMessage());
        Log::error($e->getTraceAsString());
        
        return response()->json([
            'status' => false,
            'message' => 'Failed to retrieve QR code',
            'error' => $e->getMessage()
        ], 500);
    }
}


    /**
 * Update QR code expiration date
 * 
 * @param \Illuminate\Http\Request $request
 * @param int $id
 * @return \Illuminate\Http\JsonResponse
 */
public function updateQRExpiration(Request $request, $id)
{
    try {
        // Validate request
        $request->validate([
            'expiry_days' => 'required|integer|min:1|max:365'
        ]);
        
        // Get statement
        $statement = Statement::with('user')->findOrFail($id);
        
        // Check if statement has QR code
        if (!$statement->access_token) {
            return response()->json([
                'status' => false,
                'message' => 'This statement does not have a QR code yet.'
            ], 404);
        }
        
        // Calculate new expiry date
        $expiryDate = now()->addDays($request->expiry_days);
        
        // Update token expiry
        $statement->token_expires_at = $expiryDate;
        $statement->save();
        
        // Generate new URL with updated expiry
        $url = URL::temporarySignedRoute(
            'statement.view', 
            $expiryDate, 
            ['token' => $statement->access_token]
        );
        
        // Get the QR code path
        $qrPath = 'qrcodes/statement_' . $statement->id . '_*.png';
        $files = Storage::disk('public')->files('qrcodes');
        $matchingFiles = preg_grep('/statement_' . $statement->id . '_[0-9]+\.png$/', $files);
        
        if (empty($matchingFiles)) {
            // If QR code file doesn't exist, generate it
            $qrCode = QrCode::format('png')
                            ->size(300)
                            ->errorCorrection('H')
                            ->generate($url);
                            
            // Store QR code
            $qrPath = 'qrcodes/statement_' . $statement->id . '_' . time() . '.png';
            Storage::disk('public')->put($qrPath, $qrCode);
        } else {
            // Use the existing QR code
            $qrPath = reset($matchingFiles);
        }
        
        // Return updated QR code data
        return response()->json([
            'status' => true,
            'message' => 'QR code expiration updated successfully',
            'data' => [
                'statement' => $statement,
                'qr_url' => url(Storage::url($qrPath)),
                'direct_url' => $url,
                'expires_at' => $expiryDate
            ]
        ], 200);
        
    } catch (\Exception $e) {
        Log::error('Error updating QR expiration: ' . $e->getMessage());
        Log::error($e->getTraceAsString());
        
        return response()->json([
            'status' => false,
            'message' => 'Failed to update QR code expiration',
            'error' => $e->getMessage()
        ], 500);
    }
}

}