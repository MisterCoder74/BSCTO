<?php
/**
 * Beauty Salon Management System - Clients Endpoint
 * 
 * Handles CRUD operations for clients:
 * - list: GET all clients
 * - add: POST new client
 * - edit: PUT existing client
 * - delete: DELETE client
 * 
 * All operations use file locking with flock() to prevent race conditions
 * Returns JSON responses with success/error status
 */

header('Content-Type: application/json; charset=utf-8');

// Path to clients JSON file
$clientsFile = __DIR__ . '/../data/clients.json';

// Initialize file if it doesn't exist
if (!file_exists($clientsFile)) {
  file_put_contents($clientsFile, json_encode([]));
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
    listClients();
    break;
  case 'add':
    addClient($request);
    break;
  case 'edit':
    editClient($request);
    break;
  case 'delete':
    deleteClient($request);
    break;
  default:
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

/**
 * List all clients
 * Returns array of all clients from clients.json
 */
function listClients() {
  global $clientsFile;
  
  try {
    // Read file with shared lock (allows concurrent reads)
    $handle = fopen($clientsFile, 'r');
    flock($handle, LOCK_SH);
    $content = file_get_contents($clientsFile);
    flock($handle, LOCK_UN);
    fclose($handle);
    
    $clients = json_decode($content, true);
    if (!is_array($clients)) {
      $clients = [];
    }
    
    echo json_encode([
      'success' => true,
      'data' => $clients,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to read clients: ' . $e->getMessage()
    ]);
  }
}

/**
 * Add new client
 * Validates input and assigns new ID
 */
function addClient($request) {
  global $clientsFile;
  
  // Validate required fields
  if (!isset($request['data']['name']) || !isset($request['data']['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: name, email']);
    return;
  }
  
  // Sanitize input
  $name = sanitizeInput($request['data']['name']);
  $email = sanitizeInput($request['data']['email']);
  $phone = sanitizeInput($request['data']['phone'] ?? '');
  $notes = sanitizeInput($request['data']['notes'] ?? '');
  $isVIP = (bool)($request['data']['isVIP'] ?? false);
  $isBadClient = (bool)($request['data']['isBadClient'] ?? false);
  
  // Validate email format
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email format']);
    return;
  }
  
  try {
    // Read existing clients with exclusive lock
    $handle = fopen($clientsFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($clientsFile);
    $clients = json_decode($content, true) ?? [];
    
    // Generate new ID (max existing ID + 1)
    $maxId = 0;
    foreach ($clients as $client) {
      if ($client['id'] > $maxId) {
        $maxId = $client['id'];
      }
    }
    $newId = $maxId + 1;
    
    // Create new client record
    $newClient = [
      'id' => $newId,
      'name' => $name,
      'email' => $email,
      'phone' => $phone,
      'notes' => $notes,
      'isVIP' => $isVIP,
      'isBadClient' => $isBadClient,
      'appointments' => []
    ];
    
    // Add to array and write back
    $clients[] = $newClient;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($clients, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    echo json_encode([
      'success' => true,
      'data' => $newClient,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to add client: ' . $e->getMessage()
    ]);
  }
}

/**
 * Edit existing client
 * Validates ID and updates client record
 */
function editClient($request) {
  global $clientsFile;
  
  // Validate required fields
  if (!isset($request['data']['id']) || !isset($request['data']['name']) || !isset($request['data']['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: id, name, email']);
    return;
  }
  
  $clientId = (int)$request['data']['id'];
  
  // Sanitize input
  $name = sanitizeInput($request['data']['name']);
  $email = sanitizeInput($request['data']['email']);
  $phone = sanitizeInput($request['data']['phone'] ?? '');
  $notes = sanitizeInput($request['data']['notes'] ?? '');
  $isVIP = (bool)($request['data']['isVIP'] ?? false);
  $isBadClient = (bool)($request['data']['isBadClient'] ?? false);
  
  // Validate email format
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email format']);
    return;
  }
  
  try {
    // Read clients with exclusive lock
    $handle = fopen($clientsFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($clientsFile);
    $clients = json_decode($content, true) ?? [];
    
    // Find and update client
    $found = false;
    foreach ($clients as &$client) {
      if ($client['id'] === $clientId) {
        $client['name'] = $name;
        $client['email'] = $email;
        $client['phone'] = $phone;
        $client['notes'] = $notes;
        $client['isVIP'] = $isVIP;
        $client['isBadClient'] = $isBadClient;
        // Preserve existing appointments array
        if (!isset($client['appointments'])) {
          $client['appointments'] = [];
        }
        $found = true;
        break;
      }
    }
    
    if (!$found) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Client not found']);
      return;
    }
    
    // Write back
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($clients, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($handle, LOCK_UN);
    fclose($handle);
    
    // Return updated client
    $updatedClient = null;
    foreach ($clients as $client) {
      if ($client['id'] === $clientId) {
        $updatedClient = $client;
        break;
      }
    }
    
    echo json_encode([
      'success' => true,
      'data' => $updatedClient,
      'error' => null
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'data' => null,
      'error' => 'Failed to edit client: ' . $e->getMessage()
    ]);
  }
}

/**
 * Delete client by ID
 */
function deleteClient($request) {
  global $clientsFile;
  
  // Validate required field
  if (!isset($request['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required field: id']);
    return;
  }
  
  $clientId = (int)$request['id'];
  
  try {
    // Read clients with exclusive lock
    $handle = fopen($clientsFile, 'r+');
    flock($handle, LOCK_EX);
    $content = file_get_contents($clientsFile);
    $clients = json_decode($content, true) ?? [];
    
    // Remove client by filtering out the matching ID
    $originalCount = count($clients);
    $clients = array_filter($clients, function($client) use ($clientId) {
      return $client['id'] !== $clientId;
    });
    
    if (count($clients) === $originalCount) {
      flock($handle, LOCK_UN);
      fclose($handle);
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Client not found']);
      return;
    }
    
    // Reindex array and write back
    $clients = array_values($clients);
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($clients, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
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
      'error' => 'Failed to delete client: ' . $e->getMessage()
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
