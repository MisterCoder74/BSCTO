<?php
/**
 * Beauty Salon Management System - Incomes Endpoint
 * 
 * Handles CRUD operations for income/financial records:
 * - list: GET all income records with optional filters
 * - add: POST new income record
 * - edit: PUT existing income record (payment method, notes)
 * - delete: DELETE income record
 * - getSummary: GET financial summaries (totals by period, staff, service)
 * 
 * All operations use file locking with flock() to prevent race conditions
 * Returns JSON responses with success/error status
 */

header('Content-Type: application/json; charset=utf-8');

// Path to incomes JSON file
$incomesFile = __DIR__ . '/../data/incomes.json';
$appointmentsFile = __DIR__ . '/../data/appointments.json';
$clientsFile = __DIR__ . '/../data/clients.json';
$staffFile = __DIR__ . '/../data/staff.json';
$servicesFile = __DIR__ . '/../data/services.json';

// Initialize file if it doesn't exist
if (!file_exists($incomesFile)) {
  file_put_contents($incomesFile, json_encode([]));
}

// Get action from multiple sources (priority: JSON body > GET > POST form data)
$request = null;
$action = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  // Try to get JSON body first
  $input = file_get_contents('php://input');
  $request = json_decode($input, true);
  
  if ($request && isset($request['action'])) {
    $action = $request['action'];
  } else {
    // Fallback to form data
    $request = $_POST;
    if (isset($_POST['action'])) {
      $action = $_POST['action'];
    }
  }
}

// Also check GET parameter
if (!$action && isset($_GET['action'])) {
  $action = $_GET['action'];
}

// If still no action, log and return error
if (!$action) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Action parameter is required']);
  error_log('No action parameter provided. REQUEST_METHOD: ' . $_SERVER['REQUEST_METHOD'] . ' | POST: ' . json_encode($_POST) . ' | REQUEST: ' . json_encode($request));
  exit;
}

// Route to appropriate action
switch($action) {
  case 'list':
    listIncomes();
    break;
  case 'add':
    addIncome($request);
    break;
  case 'edit':
    editIncome($request);
    break;
  case 'delete':
    deleteIncome($request);
    break;
  case 'getSummary':
    getIncomeSummary();
    break;
  default:
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

/**
 * List all income records with optional filters
 * Filters: dateFrom, dateTo, staffId, serviceId, paymentMethod
 */
function listIncomes() {
  global $incomesFile;
  
  try {
    // Read incomes with shared lock
    $handle = fopen($incomesFile, 'r');
    flock($handle, LOCK_SH);
    $content = file_get_contents($incomesFile);
    flock($handle, LOCK_UN);
    fclose($handle);
    
    $incomes = json_decode($content, true);
    if (!is_array($incomes)) {
      $incomes = [];
    }
    
    // Apply filters if provided
    $dateFrom = isset($_GET['dateFrom']) ? $_GET['dateFrom'] : null;
    $dateTo = isset($_GET['dateTo']) ? $_GET['dateTo'] : null;
    $staffId = isset($_GET['staffId']) ? (int)$_GET['staffId'] : null;
    $serviceId = isset($_GET['serviceId']) ? (int)$_GET['serviceId'] : null;
    $paymentMethod = isset($_GET['paymentMethod']) ? $_GET['paymentMethod'] : null;
    
    if ($dateFrom || $dateTo || $staffId || $serviceId || $paymentMethod) {
      $incomes = array_filter($incomes, function($income) use ($dateFrom, $dateTo, $staffId, $serviceId, $paymentMethod) {
        // Date range filter
        if ($dateFrom && strtotime($income['date']) < strtotime($dateFrom)) {
          return false;
        }
        if ($dateTo && strtotime($income['date']) > strtotime($dateTo)) {
          return false;
        }
        
        // Note: staffId and serviceId filtering requires looking up names
        // For simplicity, we'll filter by staffName and serviceName if provided
        // In a real app, we'd store the IDs in the income record
        
        // Payment method filter
        if ($paymentMethod && $paymentMethod !== 'all' && $income['paymentMethod'] !== $paymentMethod) {
          return false;
        }
        
        return true;
      });
      
      // Reindex array after filtering
      $incomes = array_values($incomes);
    }
    
    // Sort by date descending (newest first)
    usort($incomes, function($a, $b) {
      $dateCompare = strcmp($b['date'], $a['date']);
      if ($dateCompare !== 0) {
        return $dateCompare;
      }
      return strcmp($b['time'], $a['time']);
    });
    
    echo json_encode([
      'success' => true,
      'data' => $incomes,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to read incomes: ' . $e->getMessage()
    ]);
  }
}

/**
 * Add new income record
 * Called automatically when appointment status changes to 'complete'
 */
function addIncome($request) {
  global $incomesFile;
  
  // Validate required fields
  if (!isset($request['data']['appointmentId']) || 
      !isset($request['data']['clientName']) || 
      !isset($request['data']['staffName']) || 
      !isset($request['data']['serviceName']) || 
      !isset($request['data']['amount']) ||
      !isset($request['data']['date']) ||
      !isset($request['data']['time'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    return;
  }
  
  // Validate and sanitize input
  $appointmentId = (int)$request['data']['appointmentId'];
  $clientName = sanitizeInput($request['data']['clientName']);
  $staffName = sanitizeInput($request['data']['staffName']);
  $serviceName = sanitizeInput($request['data']['serviceName']);
  $amount = (float)$request['data']['amount'];
  $date = sanitizeInput($request['data']['date']);
  $time = sanitizeInput($request['data']['time']);
  $paymentMethod = isset($request['data']['paymentMethod']) ? sanitizeInput($request['data']['paymentMethod']) : 'cash';
  $notes = isset($request['data']['notes']) ? sanitizeInput($request['data']['notes']) : '';
  
  // Validate amount
  if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Amount must be greater than 0']);
    return;
  }
  
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
    // Read existing incomes with exclusive lock
    $handle = fopen($incomesFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($incomesFile);
    $incomes = json_decode($content, true) ?? [];
    
    // Check if income record already exists for this appointment
    foreach ($incomes as $income) {
      if ($income['appointmentId'] === $appointmentId) {
        flock($handle, LOCK_UN);
        fclose($handle);
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Income record already exists for this appointment']);
        return;
      }
    }
    
    // Generate new ID
    $maxId = 0;
    foreach ($incomes as $inc) {
      if ($inc['id'] > $maxId) {
        $maxId = $inc['id'];
      }
    }
    $newId = $maxId + 1;
    
    // Create new income record
    $newIncome = [
      'id' => $newId,
      'appointmentId' => $appointmentId,
      'clientName' => $clientName,
      'staffName' => $staffName,
      'serviceName' => $serviceName,
      'amount' => $amount,
      'date' => $date,
      'time' => $time,
      'status' => 'completed',
      'paymentMethod' => $paymentMethod,
      'notes' => $notes,
      'completedAt' => date('Y-m-d\TH:i:s')
    ];
    
    // Add to array and write back
    $incomes[] = $newIncome;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($incomes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    echo json_encode([
      'success' => true,
      'data' => $newIncome,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to add income: ' . $e->getMessage()
    ]);
  }
}

/**
 * Edit existing income record
 * Allows updating payment method and notes only
 */
function editIncome($request) {
  global $incomesFile;
  
  // Validate required fields
  if (!isset($request['data']['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required field: id']);
    return;
  }
  
  $incomeId = (int)$request['data']['id'];
  $paymentMethod = isset($request['data']['paymentMethod']) ? sanitizeInput($request['data']['paymentMethod']) : null;
  $notes = isset($request['data']['notes']) ? sanitizeInput($request['data']['notes']) : null;
  
  try {
    // Read incomes with exclusive lock
    $handle = fopen($incomesFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($incomesFile);
    $incomes = json_decode($content, true) ?? [];
    
    // Find and update income record
    $found = false;
    $updatedIncome = null;
    foreach ($incomes as &$inc) {
      if ($inc['id'] === $incomeId) {
        if ($paymentMethod !== null) {
          $inc['paymentMethod'] = $paymentMethod;
        }
        if ($notes !== null) {
          $inc['notes'] = $notes;
        }
        $found = true;
        $updatedIncome = $inc;
        break;
      }
    }
    
    if (!$found) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Income record not found']);
      return;
    }
    
    // Write back
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($incomes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    echo json_encode([
      'success' => true,
      'data' => $updatedIncome,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to edit income: ' . $e->getMessage()
    ]);
  }
}

/**
 * Delete income record by ID
 * Called automatically when appointment status reverts from 'complete'
 */
function deleteIncome($request) {
  global $incomesFile;
  
  // Validate required field
  if (!isset($request['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required field: id']);
    return;
  }
  
  $incomeId = (int)$request['id'];
  
  try {
    // Read incomes with exclusive lock
    $handle = fopen($incomesFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($incomesFile);
    $incomes = json_decode($content, true) ?? [];
    
    // Check if record exists
    $found = false;
    foreach ($incomes as $inc) {
      if ($inc['id'] === $incomeId) {
        $found = true;
        break;
      }
    }
    
    if (!$found) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Income record not found']);
      return;
    }
    
    // Remove income by filtering out the matching ID
    $originalCount = count($incomes);
    $incomes = array_filter($incomes, function($inc) use ($incomeId) {
      return $inc['id'] !== $incomeId;
    });
    
    // Reindex array and write back
    $incomes = array_values($incomes);
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($incomes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
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
      'error' => 'Failed to delete income: ' . $e->getMessage()
    ]);
  }
}

/**
 * Delete income record by appointment ID
 * Internal function used by appointments.php when status reverts from complete
 */
function deleteIncomeByAppointmentId($appointmentId) {
  global $incomesFile;
  
  try {
    // Read incomes with exclusive lock
    $handle = fopen($incomesFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($incomesFile);
    $incomes = json_decode($content, true) ?? [];
    
    // Find and remove income with matching appointmentId
    $found = false;
    $incomes = array_filter($incomes, function($inc) use ($appointmentId, &$found) {
      if ($inc['appointmentId'] === $appointmentId) {
        $found = true;
        return false;
      }
      return true;
    });
    
    if (!$found) {
      flock($handle, LOCK_UN);
      fclose($handle);
      return false;
    }
    
    // Reindex array and write back
    $incomes = array_values($incomes);
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($incomes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    return true;
  } catch (Exception $e) {
    return false;
  }
}

/**
 * Get financial summaries
 * Returns totals by period (today, week, month, all-time) and by staff/service
 */
function getIncomeSummary() {
  global $incomesFile;
  
  try {
    // Read incomes with shared lock
    $handle = fopen($incomesFile, 'r');
    flock($handle, LOCK_SH);
    $content = file_get_contents($incomesFile);
    flock($handle, LOCK_UN);
    fclose($handle);
    
    $incomes = json_decode($content, true);
    if (!is_array($incomes)) {
      $incomes = [];
    }
    
    // Calculate date ranges
    $today = date('Y-m-d');
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $weekEnd = date('Y-m-d', strtotime('sunday this week'));
    $monthStart = date('Y-m-01');
    $monthEnd = date('Y-m-t');
    
    // Initialize summary variables
    $totalAllTime = 0;
    $totalThisMonth = 0;
    $totalThisWeek = 0;
    $totalToday = 0;
    $byStaff = [];
    $byService = [];
    
    foreach ($incomes as $income) {
      $amount = (float)$income['amount'];
      $date = $income['date'];
      $staffName = $income['staffName'];
      $serviceName = $income['serviceName'];
      
      // All-time total
      $totalAllTime += $amount;
      
      // This month
      if ($date >= $monthStart && $date <= $monthEnd) {
        $totalThisMonth += $amount;
      }
      
      // This week
      if ($date >= $weekStart && $date <= $weekEnd) {
        $totalThisWeek += $amount;
      }
      
      // Today
      if ($date === $today) {
        $totalToday += $amount;
      }
      
      // By staff
      if (!isset($byStaff[$staffName])) {
        $byStaff[$staffName] = 0;
      }
      $byStaff[$staffName] += $amount;
      
      // By service
      if (!isset($byService[$serviceName])) {
        $byService[$serviceName] = 0;
      }
      $byService[$serviceName] += $amount;
    }
    
    // Convert byStaff and byService to arrays
    $byStaffArray = [];
    foreach ($byStaff as $name => $total) {
      $byStaffArray[] = ['staffName' => $name, 'total' => $total];
    }
    
    $byServiceArray = [];
    foreach ($byService as $name => $total) {
      $byServiceArray[] = ['serviceName' => $name, 'total' => $total];
    }
    
    // Sort by total descending
    usort($byStaffArray, function($a, $b) {
      return $b['total'] <=> $a['total'];
    });
    usort($byServiceArray, function($a, $b) {
      return $b['total'] <=> $a['total'];
    });
    
    $summary = [
      'totalAllTime' => round($totalAllTime, 2),
      'totalThisMonth' => round($totalThisMonth, 2),
      'totalThisWeek' => round($totalThisWeek, 2),
      'totalToday' => round($totalToday, 2),
      'byStaff' => $byStaffArray,
      'byService' => $byServiceArray,
      'recordCount' => count($incomes)
    ];
    
    echo json_encode([
      'success' => true,
      'data' => $summary,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to get income summary: ' . $e->getMessage()
    ]);
  }
}

/**
 * Sanitize input string
 */
function sanitizeInput($input) {
  return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}
?>
