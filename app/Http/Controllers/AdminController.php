<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Patient;
use App\Models\Statement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use PDF;

class AdminController extends Controller
{
    /**
     * Generate QR code and link for a patient's Statement of Account
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function generateSOAQrCode(Request $request)
    {
        try {
            // Validate request
            $request->validate([
                'patient_id' => 'required|exists:users,id,role,patient',
                'statement_id' => 'required|exists:statements,id',
                'expiry_days' => 'nullable|integer|min:1|max:30'
            ]);

            // Get patient and statement data
            $patient = User::where('id', $request->patient_id)
                ->where('role', 'patient')
                ->firstOrFail();
                
            $statement = Statement::findOrFail($request->statement_id);
            
            // Check if statement belongs to patient
            if ($statement->user_id !== $patient->id) {
                return response()->json([
                    'status' => false,
                    'message' => 'Statement does not belong to this patient'
                ], 403);
            }
            
            // Generate a unique token for this statement
            $token = Str::random(64);
            
            // Set expiry time (default 7 days if not specified)
            $expiryDays = $request->expiry_days ?? 7;
            $expiryDate = now()->addDays($expiryDays);
            
            // Save token and expiry to statement
            $statement->access_token = $token;
            $statement->token_expires_at = $expiryDate;
            $statement->save();
            
            // Generate URL to access the statement
            $url = URL::temporarySignedRoute(
                'statement.view', 
                $expiryDate, 
                ['token' => $token]
            );
            
            // Generate QR code
            $qrCode = QrCode::format('png')
                            ->size(300)
                            ->errorCorrection('H')
                            ->generate($url);
                            
            // Store QR code image
            $qrCodePath = 'qrcodes/statement_' . $statement->id . '_' . time() . '.png';
            Storage::disk('public')->put($qrCodePath, $qrCode);
            
            // Generate sample SOA PDF
            $pdf = $this->generateSampleSOA($patient, $statement);
            
            // Store PDF file
            $pdfPath = 'statements/statement_' . $statement->id . '_' . time() . '.pdf';
            Storage::disk('public')->put($pdfPath, $pdf->output());
            
            // Return response with URLs
            return response()->json([
                'status' => true,
                'message' => 'QR code and statement generated successfully',
                'data' => [
                    'qr_code_url' => url(Storage::url($qrCodePath)),
                    'statement_url' => $url,
                    'pdf_url' => url(Storage::url($pdfPath)),
                    'expires_at' => $expiryDate
                ]
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to generate QR code',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Generate sample SOA PDF for a patient
     *
     * @param  \App\Models\User  $patient
     * @param  \App\Models\Statement  $statement
     * @return \Barryvdh\DomPDF\PDF
     */
    private function generateSampleSOA($patient, $statement)
    {
        // Sample data for demonstration
        $data = [
            'patient' => $patient,
            'statement' => $statement,
            'hospital_name' => 'Medical Center Hospital',
            'hospital_address' => '123 Health Avenue, Medical District',
            'hospital_contact' => '+1 (555) 123-4567',
            'date_issued' => now()->format('F d, Y'),
            'due_date' => now()->addDays(30)->format('F d, Y'),
            'services' => [
                [
                    'description' => 'Consultation',
                    'date' => now()->subDays(5)->format('M d, Y'),
                    'amount' => 150.00
                ],
                [
                    'description' => 'Laboratory Tests',
                    'date' => now()->subDays(5)->format('M d, Y'),
                    'amount' => 350.00
                ],
                [
                    'description' => 'Medication',
                    'date' => now()->subDays(5)->format('M d, Y'),
                    'amount' => 275.50
                ]
            ],
            'total_amount' => 775.50,
            'payment_instructions' => 'Please make payment before the due date. For questions, contact our billing department at billing@medicalcenter.com.'
        ];
        
        // Generate PDF using a view
        $pdf = PDF::loadView('pdf.statement_of_account', $data);
        $pdf->setPaper('a4', 'portrait');
        
        return $pdf;
    }
    
    /**
     * View a statement using a valid token
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function viewStatement(Request $request)
    {
        try {
            // Validate token
            if (!$request->hasValidSignature()) {
                abort(401, 'This link has expired or is invalid.');
            }
            
            $token = $request->token;
            
            // Find statement by token
            $statement = Statement::where('access_token', $token)
                          ->where('token_expires_at', '>=', now())
                          ->firstOrFail();
            
            // Get patient data
            $patient = User::where('id', $statement->user_id)
                      ->where('role', 'patient')
                      ->firstOrFail();
            
            // Generate PDF
            $pdf = $this->generateSampleSOA($patient, $statement);
            
            // Stream PDF to browser
            return $pdf->stream('statement_of_account.pdf');
            
        } catch (\Exception $e) {
            abort(404, 'Statement not found or link has expired.');
        }
    }
    
    /**
     * List all generated statements and QR codes
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function listStatements()
    {
        try {
            $statements = Statement::with('user')
                          ->whereNotNull('access_token')
                          ->orderBy('created_at', 'desc')
                          ->paginate(10);
            
            foreach ($statements as $statement) {
                // Check if token is still valid
                $statement->is_valid = now()->lt($statement->token_expires_at);
            }
            
            return response()->json([
                'status' => true,
                'message' => 'Statements retrieved successfully',
                'data' => $statements
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve statements',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}