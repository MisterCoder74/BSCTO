<?php
/**
 * Beauty Salon Management System - Services Endpoint
 * 
 * Handles CRUD operations for services:
 * - list: GET all services
 * - add: POST new service
 * - edit: PUT existing service
 * - delete: DELETE service
 * 
 * All operations use file locking with flock() to prevent race conditions
 * Returns JSON responses with success/error status
 */

header('Content-Type: application/json; charset=utf-8');

// Path to services JSON file
$servicesFile = __DIR__ . '/../data/services.json';

// Initialize file if it doesn't exist
if (!file_exists($servicesFile)) {
  file_put_contents($servicesFile, json_encode([]));
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
    listServices();
    break;
  case 'add':
    addService($request);
    break;
  case 'edit':
    editService($request);
    break;
  case 'delete':
    deleteService($request);
    break;
  default:
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

/**
 * List all services
 */
function listServices() {
  global $servicesFile;
  
  try {
    // Read file with shared lock
    $handle = fopen($servicesFile, 'r');
    flock($handle, LOCK_SH);
    $content = file_get_contents($servicesFile);
    flock($handle, LOCK_UN);
    fclose($handle);
    
    $services = json_decode($content, true);
    if (!is_array($services)) {
      $services = [];
    }
    
    echo json_encode([
      'success' => true,
      'data' => $services,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to read services: ' . $e->getMessage()
    ]);
  }
}

/**
 * Add new service
 */
function addService($request) {
  global $servicesFile;
  
  // Validate required fields
  if (!isset($request['data']['name']) || !isset($request['data']['duration']) || !isset($request['data']['price'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: name, duration, price']);
    return;
  }
  
  // Sanitize and validate input
  $name = sanitizeInput($request['data']['name']);
  $duration = (int)$request['data']['duration'];
  $price = (float)$request['data']['price'];
  
  // Validate duration and price
  if ($duration < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Duration must be at least 1 minute']);
    return;
  }
  
  if ($price < 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Price cannot be negative']);
    return;
  }
  
  try {
    // Read existing services with exclusive lock
    $handle = fopen($servicesFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($servicesFile);
    $services = json_decode($content, true) ?? [];
    
    // Generate new ID
    $maxId = 0;
    foreach ($services as $service) {
      if ($service['id'] > $maxId) {
        $maxId = $service['id'];
      }
    }
    $newId = $maxId + 1;
    
    // Create new service record
    $newService = [
      'id' => $newId,
      'name' => $name,
      'duration' => $duration,
      'price' => $price
    ];
    
    // Add to array and write back
    $services[] = $newService;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($services, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    echo json_encode([
      'success' => true,
      'data' => $newService,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to add service: ' . $e->getMessage()
    ]);
  }
}

/**
 * Edit existing service
 */
function editService($request) {
  global $servicesFile;
  
  // Validate required fields
  if (!isset($request['data']['id']) || !isset($request['data']['name']) || !isset($request['data']['duration']) || !isset($request['data']['price'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: id, name, duration, price']);
    return;
  }
  
  $serviceId = (int)$request['data']['id'];
  
  // Sanitize and validate input
  $name = sanitizeInput($request['data']['name']);
  $duration = (int)$request['data']['duration'];
  $price = (float)$request['data']['price'];
  
  // Validate duration and price
  if ($duration < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Duration must be at least 1 minute']);
    return;
  }
  
  if ($price < 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Price cannot be negative']);
    return;
  }
  
  try {
    // Read services with exclusive lock
    $handle = fopen($servicesFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($servicesFile);
    $services = json_decode($content, true) ?? [];
    
    // Find and update service
    $found = false;
    foreach ($services as &$service) {
      if ($service['id'] === $serviceId) {
        $service['name'] = $name;
        $service['duration'] = $duration;
        $service['price'] = $price;
        $found = true;
        break;
      }
    }
    
    if (!$found) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Service not found']);
      return;
    }
    
    // Write back
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($services, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    // Return updated service
    $updatedService = null;
    foreach ($services as $service) {
      if ($service['id'] === $serviceId) {
        $updatedService = $service;
        break;
      }
    }
    
    echo json_encode([
      'success' => true,
      'data' => $updatedService,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to edit service: ' . $e->getMessage()
    ]);
  }
}

/**
 * Delete service by ID
 */
function deleteService($request) {
  global $servicesFile;
  
  // Validate required field
  if (!isset($request['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required field: id']);
    return;
  }
  
  $serviceId = (int)$request['id'];
  
  try {
    // Read services with exclusive lock
    $handle = fopen($servicesFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($servicesFile);
    $services = json_decode($content, true) ?? [];
    
    // Remove service by filtering out the matching ID
    $originalCount = count($services);
    $services = array_filter($services, function($service) use ($serviceId) {
      return $service['id'] !== $serviceId;
    });
    
    if (count($services) === $originalCount) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Service not found']);
      return;
    }
    
    // Reindex array and write back
    $services = array_values($services);
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($services, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
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
      'error' => 'Failed to delete service: ' . $e->getMessage()
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
