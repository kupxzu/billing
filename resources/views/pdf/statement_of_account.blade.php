<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Statement of Account</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.4;
        }
        .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .hospital-info {
            margin-bottom: 10px;
            font-size: 14px;
        }
        .statement-info {
            margin-bottom: 20px;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
            padding: 10px 0;
        }
        .patient-info {
            float: left;
            width: 50%;
        }
        .statement-details {
            float: right;
            width: 50%;
            text-align: right;
        }
        .clear {
            clear: both;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f5f5f5;
        }
        .amount {
            text-align: right;
        }
        .total {
            font-weight: bold;
            font-size: 16px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 14px;
        }
        .payment-instructions {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-left: 4px solid #2c3e50;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $hospital_name }}</h1>
            <div class="hospital-info">
                {{ $hospital_address }}<br>
                {{ $hospital_contact }}
            </div>
            <h2>Statement of Account</h2>
        </div>
        
        <div class="statement-info">
            <div class="patient-info">
                <strong>Patient:</strong> {{ $patient->name }}<br>
                <strong>Email:</strong> {{ $patient->email }}<br>
                <strong>Statement #:</strong> {{ $statement->statement_number }}
            </div>
            <div class="statement-details">
                <strong>Date Issued:</strong> {{ $date_issued }}<br>
                <strong>Due Date:</strong> {{ $due_date }}<br>
                <strong>Status:</strong> {{ $statement->status }}
            </div>
            <div class="clear"></div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Service Description</th>
                    <th>Date</th>
                    <th class="amount">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($services as $service)
                <tr>
                    <td>{{ $service->description }}</td>
                    <td>{{ $service->service_date->format('M d, Y') }}</td>
                    <td class="amount">${{ number_format($service->amount, 2) }}</td>
                </tr>
                @endforeach
                <tr class="total">
                    <td colspan="2" class="amount">Total Amount Due:</td>
                    <td class="amount">${{ number_format($total_amount, 2) }}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="payment-instructions">
            <strong>Payment Instructions:</strong><br>
            {{ $payment_instructions }}
        </div>
        
        <div class="footer">
            <p>This is a system-generated Statement of Account. For inquiries, please contact our billing department.</p>
            <p>This document is valid as of {{ now()->format('F d, Y') }}</p>
        </div>
    </div>
</body>
</html>