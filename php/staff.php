<?php
/**
 * Beauty Salon Management System - Staff Endpoint
 * 
 * Handles CRUD operations for staff members:
 * - list: GET all staff
 * - add: POST new staff member
 * - edit: PUT existing staff member
 * - delete: DELETE staff member
 * 
 * All operations use file locking with flock() to prevent race conditions
 * Returns JSON responses with success/error status
 */

header('Content-Type: application/json; charset=utf-8');

// Path to staff JSON file
$staffFile = __DIR__ . '/../data/staff.json';

// Initialize file if it doesn't exist
if (!file_exists($staffFile)) {
  file_put_contents($staffFile, json_encode([]));
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
    listStaff();
    break;
  case 'add':
    addStaff($request);
    break;
  case 'edit':
    editStaff($request);
    break;
  case 'delete':
    deleteStaff($request);
    break;
  default:
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

/**
 * List all staff members
 */
function listStaff() {
  global $staffFile;
  
  try {
    // Read file with shared lock
    $handle = fopen($staffFile, 'r');
    flock($handle, LOCK_SH);
    $content = file_get_contents($staffFile);
    flock($handle, LOCK_UN);
    fclose($handle);
    
    $staff = json_decode($content, true);
    if (!is_array($staff)) {
      $staff = [];
    }
    
    echo json_encode([
      'success' => true,
      'data' => $staff,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to read staff: ' . $e->getMessage()
    ]);
  }
}

/**
 * Add new staff member
 */
function addStaff($request) {
  global $staffFile;
  
  // Validate required fields
  if (!isset($request['data']['name']) || !isset($request['data']['role']) || !isset($request['data']['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: name, role, email']);
    return;
  }
  
  // Sanitize input
  $name = sanitizeInput($request['data']['name']);
  $role = sanitizeInput($request['data']['role']);
  $email = sanitizeInput($request['data']['email']);
  
  // Validate email format
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email format']);
    return;
  }
  
  try {
    // Read existing staff with exclusive lock
    $handle = fopen($staffFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($staffFile);
    $staff = json_decode($content, true) ?? [];
    
    // Generate new ID
    $maxId = 0;
    foreach ($staff as $member) {
      if ($member['id'] > $maxId) {
        $maxId = $member['id'];
      }
    }
    $newId = $maxId + 1;
    
    // Create new staff record
    $newStaff = [
      'id' => $newId,
      'name' => $name,
      'role' => $role,
      'email' => $email
    ];
    
    // Add to array and write back
    $staff[] = $newStaff;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($staff, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    echo json_encode([
      'success' => true,
      'data' => $newStaff,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to add staff: ' . $e->getMessage()
    ]);
  }
}

/**
 * Edit existing staff member
 */
function editStaff($request) {
  global $staffFile;
  
  // Validate required fields
  if (!isset($request['data']['id']) || !isset($request['data']['name']) || !isset($request['data']['role']) || !isset($request['data']['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: id, name, role, email']);
    return;
  }
  
  $staffId = (int)$request['data']['id'];
  
  // Sanitize input
  $name = sanitizeInput($request['data']['name']);
  $role = sanitizeInput($request['data']['role']);
  $email = sanitizeInput($request['data']['email']);
  
  // Validate email format
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email format']);
    return;
  }
  
  try {
    // Read staff with exclusive lock
    $handle = fopen($staffFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($staffFile);
    $staff = json_decode($content, true) ?? [];
    
    // Find and update staff
    $found = false;
    foreach ($staff as &$member) {
      if ($member['id'] === $staffId) {
        $member['name'] = $name;
        $member['role'] = $role;
        $member['email'] = $email;
        $found = true;
        break;
      }
    }
    
    if (!$found) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Staff member not found']);
      return;
    }
    
    // Write back
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($staff, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    // Return updated staff
    $updatedStaff = null;
    foreach ($staff as $member) {
      if ($member['id'] === $staffId) {
        $updatedStaff = $member;
        break;
      }
    }
    
    echo json_encode([
      'success' => true,
      'data' => $updatedStaff,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to edit staff: ' . $e->getMessage()
    ]);
  }
}

/**
 * Delete staff member by ID
 */
function deleteStaff($request) {
  global $staffFile;
  
  // Validate required field
  if (!isset($request['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required field: id']);
    return;
  }
  
  $staffId = (int)$request['id'];
  
  try {
    // Read staff with exclusive lock
    $handle = fopen($staffFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($staffFile);
    $staff = json_decode($content, true) ?? [];
    
    // Remove staff by filtering out the matching ID
    $originalCount = count($staff);
    $staff = array_filter($staff, function($member) use ($staffId) {
      return $member['id'] !== $staffId;
    });
    
    if (count($staff) === $originalCount) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Staff member not found']);
      return;
    }
    
    // Reindex array and write back
    $staff = array_values($staff);
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($staff, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
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
      'error' => 'Failed to delete staff: ' . $e->getMessage()
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
