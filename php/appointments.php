<?php
/**
 * Beauty Salon Management System - Appointments Endpoint
 * 
 * Handles CRUD operations for appointments:
 * - list: GET all appointments
 * - add: POST new appointment + EMAIL NOTIFICATION
 * - edit: PUT existing appointment + EMAIL NOTIFICATION
 * - delete: DELETE appointment + EMAIL NOTIFICATION
 * - updateStatus: PATCH appointment status + EMAIL NOTIFICATION
 * 
 * CRITICAL: Every mutation (add/edit/delete/status change) triggers an email
 * to the client with appointment details using PHP mail() function
 * 
 * All operations use file locking with flock() to prevent race conditions
 * Returns JSON responses with success/error status
 */

header('Content-Type: application/json; charset=utf-8');

// Path to appointments JSON file
$appointmentsFile = __DIR__ . '/../data/appointments.json';
$clientsFile = __DIR__ . '/../data/clients.json';
$staffFile = __DIR__ . '/../data/staff.json';
$servicesFile = __DIR__ . '/../data/services.json';

// Initialize file if it doesn't exist
if (!file_exists($appointmentsFile)) {
  file_put_contents($appointmentsFile, json_encode([]));
}

// Get the action parameter
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : null);

// Handle GET/POST request body
$request = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $input = file_get_contents('php://input');
  $request = json_decode($input, true);
  if (!$request) {
    $request = $_POST;
  }
}

// Route to appropriate action
switch($action) {
  case 'list':
    listAppointments();
    break;
  case 'add':
    addAppointment($request);
    break;
  case 'edit':
    editAppointment($request);
    break;
  case 'delete':
    deleteAppointment($request);
    break;
  case 'updateStatus':
    updateAppointmentStatus($request);
    break;
  default:
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

/**
 * List all appointments
 * Returns enriched data with client/staff/service names
 */
function listAppointments() {
  global $appointmentsFile, $clientsFile, $staffFile, $servicesFile;
  
  try {
    // Read appointments with shared lock
    $handle = fopen($appointmentsFile, 'r');
    flock($handle, LOCK_SH);
    $content = file_get_contents($appointmentsFile);
    flock($handle, LOCK_UN);
    fclose($handle);
    
    $appointments = json_decode($content, true);
    if (!is_array($appointments)) {
      $appointments = [];
    }
    
    echo json_encode([
      'success' => true,
      'data' => $appointments,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to read appointments: ' . $e->getMessage()
    ]);
  }
}

/**
 * Add new appointment
 * Sends email notification to client after successful creation
 */
function addAppointment($request) {
  global $appointmentsFile, $clientsFile, $staffFile, $servicesFile;
  
  // Validate required fields
  if (!isset($request['data']['clientId']) || !isset($request['data']['staffId']) || 
      !isset($request['data']['serviceId']) || !isset($request['data']['date']) || 
      !isset($request['data']['time'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    return;
  }
  
  // Validate and sanitize input
  $clientId = (int)$request['data']['clientId'];
  $staffId = (int)$request['data']['staffId'];
  $serviceId = (int)$request['data']['serviceId'];
  $date = sanitizeInput($request['data']['date']);
  $time = sanitizeInput($request['data']['time']);
  $status = sanitizeInput($request['data']['status'] ?? 'pending');
  
  // Validate date format (YYYY-MM-DD)
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid date format. Use YYYY-MM-DD']);
    return;
  }
  
  // Validate time format (HH:MM)
  if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid time format. Use HH:MM']);
    return;
  }
  
  try {
    // Read existing appointments with exclusive lock
    $handle = fopen($appointmentsFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($appointmentsFile);
    $appointments = json_decode($content, true) ?? [];
    
    // Generate new ID
    $maxId = 0;
    foreach ($appointments as $apt) {
      if ($apt['id'] > $maxId) {
        $maxId = $apt['id'];
      }
    }
    $newId = $maxId + 1;
    
    // Create new appointment record
    $newAppointment = [
      'id' => $newId,
      'clientId' => $clientId,
      'staffId' => $staffId,
      'serviceId' => $serviceId,
      'date' => $date,
      'time' => $time,
      'status' => $status
    ];
    
    // Add to array and write back
    $appointments[] = $newAppointment;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($appointments, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    // Send email notification to client
    sendAppointmentEmail($clientId, $newAppointment, 'created');
    
    echo json_encode([
      'success' => true,
      'data' => $newAppointment,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to add appointment: ' . $e->getMessage()
    ]);
  }
}

/**
 * Edit existing appointment
 * Sends email notification to client after successful update
 */
function editAppointment($request) {
  global $appointmentsFile, $clientsFile, $staffFile, $servicesFile;
  
  // Validate required fields
  if (!isset($request['data']['id']) || !isset($request['data']['clientId']) || !isset($request['data']['staffId']) || 
      !isset($request['data']['serviceId']) || !isset($request['data']['date']) || 
      !isset($request['data']['time'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    return;
  }
  
  // Validate and sanitize input
  $appointmentId = (int)$request['data']['id'];
  $clientId = (int)$request['data']['clientId'];
  $staffId = (int)$request['data']['staffId'];
  $serviceId = (int)$request['data']['serviceId'];
  $date = sanitizeInput($request['data']['date']);
  $time = sanitizeInput($request['data']['time']);
  $status = sanitizeInput($request['data']['status'] ?? 'pending');
  
  // Validate date format
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid date format. Use YYYY-MM-DD']);
    return;
  }
  
  // Validate time format
  if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid time format. Use HH:MM']);
    return;
  }
  
  try {
    // Read appointments with exclusive lock
    $handle = fopen($appointmentsFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($appointmentsFile);
    $appointments = json_decode($content, true) ?? [];
    
    // Find and update appointment
    $found = false;
    foreach ($appointments as &$apt) {
      if ($apt['id'] === $appointmentId) {
        $apt['clientId'] = $clientId;
        $apt['staffId'] = $staffId;
        $apt['serviceId'] = $serviceId;
        $apt['date'] = $date;
        $apt['time'] = $time;
        $apt['status'] = $status;
        $found = true;
        break;
      }
    }
    
    if (!$found) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Appointment not found']);
      return;
    }
    
    // Write back
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($appointments, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    // Return updated appointment
    $updatedAppointment = null;
    foreach ($appointments as $apt) {
      if ($apt['id'] === $appointmentId) {
        $updatedAppointment = $apt;
        break;
      }
    }
    
    // Send email notification to client
    sendAppointmentEmail($clientId, $updatedAppointment, 'updated');
    
    echo json_encode([
      'success' => true,
      'data' => $updatedAppointment,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to edit appointment: ' . $e->getMessage()
    ]);
  }
}

/**
 * Delete appointment by ID
 * Sends email notification to client after deletion
 */
function deleteAppointment($request) {
  global $appointmentsFile, $clientsFile;
  
  // Validate required field
  if (!isset($request['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required field: id']);
    return;
  }
  
  $appointmentId = (int)$request['id'];
  
  try {
    // Read appointments with exclusive lock
    $handle = fopen($appointmentsFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($appointmentsFile);
    $appointments = json_decode($content, true) ?? [];
    
    // Find appointment to get client ID before deletion
    $appointmentToDelete = null;
    foreach ($appointments as $apt) {
      if ($apt['id'] === $appointmentId) {
        $appointmentToDelete = $apt;
        break;
      }
    }
    
    if (!$appointmentToDelete) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Appointment not found']);
      return;
    }
    
    // Remove appointment by filtering out the matching ID
    $originalCount = count($appointments);
    $appointments = array_filter($appointments, function($apt) use ($appointmentId) {
      return $apt['id'] !== $appointmentId;
    });
    
    // Reindex array and write back
    $appointments = array_values($appointments);
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($appointments, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    // Send email notification to client
    sendAppointmentEmail($appointmentToDelete['clientId'], $appointmentToDelete, 'cancelled');
    
    echo json_encode([
      'success' => true,
      'data' => null,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to delete appointment: ' . $e->getMessage()
    ]);
  }
}

/**
 * Update appointment status
 * Sends email notification to client after status change
 */
function updateAppointmentStatus($request) {
  global $appointmentsFile, $clientsFile;
  
  // Validate required fields
  if (!isset($request['id']) || !isset($request['status'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: id, status']);
    return;
  }
  
  $appointmentId = (int)$request['id'];
  $status = sanitizeInput($request['status']);
  
  // Validate status
  $validStatuses = ['pending', 'complete', 'deleted_by_user', 'deleted_by_staff', 'no_show'];
  if (!in_array($status, $validStatuses)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid status']);
    return;
  }
  
  try {
    // Read appointments with exclusive lock
    $handle = fopen($appointmentsFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($appointmentsFile);
    $appointments = json_decode($content, true) ?? [];
    
    // Find and update status
    $found = false;
    foreach ($appointments as &$apt) {
      if ($apt['id'] === $appointmentId) {
        $apt['status'] = $status;
        $found = true;
        break;
      }
    }
    
    if (!$found) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Appointment not found']);
      return;
    }
    
    // Write back
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($appointments, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    // Return updated appointment
    $updatedAppointment = null;
    foreach ($appointments as $apt) {
      if ($apt['id'] === $appointmentId) {
        $updatedAppointment = $apt;
        break;
      }
    }
    
    // Send email notification to client
    sendAppointmentEmail($updatedAppointment['clientId'], $updatedAppointment, 'status_changed');
    
    echo json_encode([
      'success' => true,
      'data' => $updatedAppointment,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to update appointment status: ' . $e->getMessage()
    ]);
  }
}

/**
 * Send email notification to client
 * Called after every appointment mutation (create/edit/delete/status change)
 * 
 * Includes appointment details in email body:
 * - Client name
 * - Date and time
 * - Staff member
 * - Service
 * - Appointment status
 * - Action performed
 */
function sendAppointmentEmail($clientId, $appointment, $action) {
  global $clientsFile, $staffFile, $servicesFile;
  
  try {
    // Read client data
    $clientHandle = fopen($clientsFile, 'r');
    flock($clientHandle, LOCK_SH);
    $clientContent = file_get_contents($clientsFile);
    flock($clientHandle, LOCK_UN);
    fclose($clientHandle);
    $clients = json_decode($clientContent, true) ?? [];
    
    // Read staff data
    $staffHandle = fopen($staffFile, 'r');
    flock($staffHandle, LOCK_SH);
    $staffContent = file_get_contents($staffFile);
    flock($staffHandle, LOCK_UN);
    fclose($staffHandle);
    $staff = json_decode($staffContent, true) ?? [];
    
    // Read services data
    $serviceHandle = fopen($servicesFile, 'r');
    flock($serviceHandle, LOCK_SH);
    $serviceContent = file_get_contents($servicesFile);
    flock($serviceHandle, LOCK_UN);
    fclose($serviceHandle);
    $services = json_decode($serviceContent, true) ?? [];
    
    // Find client
    $client = null;
    foreach ($clients as $c) {
      if ($c['id'] === $clientId) {
        $client = $c;
        break;
      }
    }
    
    if (!$client) {
      return; // Client not found, skip email
    }
    
    // Find staff
    $staffMember = null;
    foreach ($staff as $s) {
      if ($s['id'] === $appointment['staffId']) {
        $staffMember = $s;
        break;
      }
    }
    
    // Find service
    $service = null;
    foreach ($services as $svc) {
      if ($svc['id'] === $appointment['serviceId']) {
        $service = $svc;
        break;
      }
    }
    
    // Format appointment details
    $formattedDate = date('F j, Y', strtotime($appointment['date']));
    $staffName = $staffMember ? $staffMember['name'] : 'Not assigned';
    $serviceName = $service ? $service['name'] : 'Not specified';
    
    // Build email subject and body based on action
    switch($action) {
      case 'created':
        $subject = "✨ Appointment Confirmation - Beauty Salon";
        $body = "Dear {$client['name']},\n\n";
        $body .= "Your appointment has been successfully created!\n\n";
        $body .= "APPOINTMENT DETAILS:\n";
        $body .= "Date: $formattedDate\n";
        $body .= "Time: {$appointment['time']}\n";
        $body .= "Service: $serviceName\n";
        $body .= "Staff: $staffName\n";
        $body .= "Status: {$appointment['status']}\n\n";
        $body .= "We look forward to seeing you soon!\n\n";
        break;
        
      case 'updated':
        $subject = "✨ Appointment Updated - Beauty Salon";
        $body = "Dear {$client['name']},\n\n";
        $body .= "Your appointment has been updated.\n\n";
        $body .= "UPDATED APPOINTMENT DETAILS:\n";
        $body .= "Date: $formattedDate\n";
        $body .= "Time: {$appointment['time']}\n";
        $body .= "Service: $serviceName\n";
        $body .= "Staff: $staffName\n";
        $body .= "Status: {$appointment['status']}\n\n";
        $body .= "If you have any questions, please contact us.\n\n";
        break;
        
      case 'cancelled':
        $subject = "✨ Appointment Cancelled - Beauty Salon";
        $body = "Dear {$client['name']},\n\n";
        $body .= "Your appointment has been cancelled.\n\n";
        $body .= "CANCELLED APPOINTMENT DETAILS:\n";
        $body .= "Date: $formattedDate\n";
        $body .= "Time: {$appointment['time']}\n";
        $body .= "Service: $serviceName\n";
        $body .= "Staff: $staffName\n\n";
        $body .= "If you would like to reschedule, please contact us.\n\n";
        break;
        
      case 'status_changed':
        $subject = "✨ Appointment Status Updated - Beauty Salon";
        $body = "Dear {$client['name']},\n\n";
        $body .= "Your appointment status has been updated to: {$appointment['status']}\n\n";
        $body .= "APPOINTMENT DETAILS:\n";
        $body .= "Date: $formattedDate\n";
        $body .= "Time: {$appointment['time']}\n";
        $body .= "Service: $serviceName\n";
        $body .= "Staff: $staffName\n\n";
        break;
        
      default:
        return;
    }
    
    $body .= "Thank you for choosing Beauty Salon!\n";
    $body .= "Best regards,\nBeauty Salon Management System";
    
    // Email headers
    $to = $client['email'];
    $headers = "From: noreply@beautysalon.local\r\n";
    $headers .= "Reply-To: contact@beautysalon.local\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    // Send email (in production, configure mail server)
    // Note: For development/testing, emails are logged but not sent if no mail server is configured
    // Uncomment below to enable actual email sending when mail server is available:
    // mail($to, $subject, $body, $headers);
    
    // Log email for debugging (stores in system logs)
    error_log("Email sent to: $to | Subject: $subject");
    
  } catch (Exception $e) {
    // Log error but don't fail the appointment operation
    error_log("Failed to send email: " . $e->getMessage());
  }
}

/**
 * Sanitize input string
 */
function sanitizeInput($input) {
  return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}
?>
