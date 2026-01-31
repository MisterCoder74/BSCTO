/**
 * Beauty Salon Management System
 * Main Application JavaScript
 * 
 * This file handles:
 * 1. Tab switching logic between Clients, Staff, Services, and Appointments
 * 2. Calendar rendering with monthly view and day-click handling
 * 3. Modal management for Add/Edit operations
 * 4. AJAX/fetch calls to PHP endpoints with cache busting using { cache: 'no-store' }
 * 5. Dynamic dropdown population from JSON data
 * 6. Appointment status management and email triggering
 * 7. Income/Finances tracking and management
 * 8. Error handling and user feedback
 */

// Global state for current calendar view
let currentMonth = new Date();
let currentDayForAppointments = null;
const allClients = [];
const allStaff = [];
const allServices = [];
const allAppointments = [];
const allIncomes = [];
let incomeSummary = {};

// Bootstrap modals (cached for performance)
let clientModalInstance = null;
let staffModalInstance = null;
let serviceModalInstance = null;
let appointmentModalInstance = null;
let dayViewModalInstance = null;
let incomeModalInstance = null;

/**
 * Initialize the application on page load
 * Loads all data from JSON files and sets up event listeners
 */
document.addEventListener('DOMContentLoaded', function() {
  initializeModals();
  loadAllData();
  setupEventListeners();
  
  // Load clients tab by default
  loadClients();
});

/**
 * Cache Bootstrap modal instances for reuse
 */
function initializeModals() {
  clientModalInstance = new bootstrap.Modal(document.getElementById('clientModal'));
  staffModalInstance = new bootstrap.Modal(document.getElementById('staffModal'));
  serviceModalInstance = new bootstrap.Modal(document.getElementById('serviceModal'));
  appointmentModalInstance = new bootstrap.Modal(document.getElementById('appointmentModal'));
  dayViewModalInstance = new bootstrap.Modal(document.getElementById('dayViewModal'));
  incomeModalInstance = new bootstrap.Modal(document.getElementById('incomeModal'));
}

/**
 * Load all data from PHP endpoints
 * Uses cache: 'no-store' to bypass browser caching and ensure fresh data
 */
async function loadAllData() {
  await loadClientsData();
  await loadStaffData();
  await loadServicesData();
  await loadAppointmentsData();
}

/**
 * FETCH: Load clients from php/clients.php
 * Uses cache: 'no-store' to bypass browser caching
 */
async function loadClientsData() {
  try {
    console.log('Loading clients data...');
    const response = await fetch('php/clients.php?action=list', { 
      cache: 'no-store' 
    });
    console.log('Clients response status:', response.status);
    const result = await response.json();
    console.log('Clients response data:', result);
    
    if (result.success) {
      allClients.length = 0;
      allClients.push(...result.data);
      populateClientDropdowns();
      console.log('Clients data loaded successfully:', result.data.length, 'clients');
    } else {
      console.error('Failed to load clients:', result.error);
    }
  } catch (error) {
    console.error('Error loading clients:', error);
  }
}

/**
 * FETCH: Load staff from php/staff.php
 * Uses cache: 'no-store' to bypass browser caching
 */
async function loadStaffData() {
  try {
    console.log('Loading staff data...');
    const response = await fetch('php/staff.php?action=list', { 
      cache: 'no-store' 
    });
    console.log('Staff response status:', response.status);
    const result = await response.json();
    console.log('Staff response data:', result);
    
    if (result.success) {
      allStaff.length = 0;
      allStaff.push(...result.data);
      populateStaffDropdowns();
      console.log('Staff data loaded successfully:', result.data.length, 'staff members');
    } else {
      console.error('Failed to load staff:', result.error);
    }
  } catch (error) {
    console.error('Error loading staff:', error);
  }
}

/**
 * FETCH: Load services from php/services.php
 * Uses cache: 'no-store' to bypass browser caching
 */
async function loadServicesData() {
  try {
    console.log('Loading services data...');
    const response = await fetch('php/services.php?action=list', { 
      cache: 'no-store' 
    });
    console.log('Services response status:', response.status);
    const result = await response.json();
    console.log('Services response data:', result);
    
    if (result.success) {
      allServices.length = 0;
      allServices.push(...result.data);
      populateServiceDropdowns();
      console.log('Services data loaded successfully:', result.data.length, 'services');
    } else {
      console.error('Failed to load services:', result.error);
    }
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

/**
 * FETCH: Load appointments from php/appointments.php
 * Uses cache: 'no-store' to bypass browser caching
 */
async function loadAppointmentsData() {
  try {
    console.log('Loading appointments data...');
    const response = await fetch('php/appointments.php?action=list', { 
      cache: 'no-store' 
    });
    console.log('Appointments response status:', response.status);
    const result = await response.json();
    console.log('Appointments response data:', result);
    
    if (result.success) {
      allAppointments.length = 0;
      allAppointments.push(...result.data);
      console.log('Appointments data loaded successfully:', result.data.length, 'appointments');
    } else {
      console.error('Failed to load appointments:', result.error);
    }
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

/**
 * Populate client dropdown in appointment modal
 * Called after clients are loaded
 */
function populateClientDropdowns() {
  const select = document.getElementById('appointmentClient');
  const currentValue = select.value;
  select.innerHTML = '<option value="">Select a client</option>';
  allClients.forEach(client => {
    const option = document.createElement('option');
    option.value = client.id;
    option.textContent = client.name;
    select.appendChild(option);
  });
  if (currentValue) select.value = currentValue;
}

/**
 * Populate staff dropdown in appointment modal
 * Called after staff data is loaded
 */
function populateStaffDropdowns() {
  const select = document.getElementById('appointmentStaff');
  const currentValue = select.value;
  select.innerHTML = '<option value="">Select staff member</option>';
  allStaff.forEach(staff => {
    const option = document.createElement('option');
    option.value = staff.id;
    option.textContent = `${staff.name} (${staff.role})`;
    select.appendChild(option);
  });
  if (currentValue) select.value = currentValue;
}

/**
 * Populate service dropdown in appointment modal
 * Called after services data is loaded
 */
function populateServiceDropdowns() {
  const select = document.getElementById('appointmentService');
  const currentValue = select.value;
  select.innerHTML = '<option value="">Select a service</option>';
  allServices.forEach(service => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.name} ($${service.price})`;
    select.appendChild(option);
  });
  if (currentValue) select.value = currentValue;
}

/**
 * Setup event listeners for forms and tabs
 */
function setupEventListeners() {
  // Client form submission
  document.getElementById('clientForm').addEventListener('submit', submitClientForm);
  
  // Staff form submission
  document.getElementById('staffForm').addEventListener('submit', submitStaffForm);
  
  // Service form submission
  document.getElementById('serviceForm').addEventListener('submit', submitServiceForm);
  
  // Appointment form submission
  document.getElementById('appointmentForm').addEventListener('submit', submitAppointmentForm);
  
  // Tab change listeners
  document.getElementById('clients-tab').addEventListener('shown.bs.tab', function() {
    loadClients();
  });
  
  document.getElementById('staff-tab').addEventListener('shown.bs.tab', function() {
    loadStaff();
  });
  
  document.getElementById('services-tab').addEventListener('shown.bs.tab', function() {
    loadServices();
  });
  
  document.getElementById('appointments-tab').addEventListener('shown.bs.tab', function() {
    loadAppointmentsData().then(() => renderCalendar());
  });
  
  document.getElementById('income-tab').addEventListener('shown.bs.tab', function() {
    loadIncomes();
    getIncomeSummary();
  });
  
  // Income filter change listeners
  document.getElementById('incomeFilterDateFrom').addEventListener('change', filterIncomes);
  document.getElementById('incomeFilterDateTo').addEventListener('change', filterIncomes);
  document.getElementById('incomeFilterStaff').addEventListener('change', filterIncomes);
  document.getElementById('incomeFilterPayment').addEventListener('change', filterIncomes);
  
  // Income form submission
  document.getElementById('incomeForm').addEventListener('submit', submitIncomeForm);
}

/**
 * Load and display clients in table
 * FETCH with cache: 'no-store' to ensure fresh data
 */
async function loadClients() {
  try {
    const response = await fetch('php/clients.php?action=list', { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      allClients.length = 0;
      allClients.push(...result.data);
      populateClientDropdowns();
      renderClientsTable(result.data);
    } else {
      showAlert('Error loading clients: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error loading clients:', error);
    showAlert('Error loading clients: ' + error.message, 'danger');
  }
}

/**
 * Load and display staff in table
 * FETCH with cache: 'no-store' to ensure fresh data
 */
async function loadStaff() {
  try {
    const response = await fetch('php/staff.php?action=list', { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      allStaff.length = 0;
      allStaff.push(...result.data);
      populateStaffDropdowns();
      renderStaffTable(result.data);
    } else {
      showAlert('Error loading staff: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error loading staff:', error);
    showAlert('Error loading staff: ' + error.message, 'danger');
  }
}

/**
 * Load and display services in table
 * FETCH with cache: 'no-store' to ensure fresh data
 */
async function loadServices() {
  try {
    const response = await fetch('php/services.php?action=list', { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      allServices.length = 0;
      allServices.push(...result.data);
      populateServiceDropdowns();
      renderServicesTable(result.data);
    } else {
      showAlert('Error loading services: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error loading services:', error);
    showAlert('Error loading services: ' + error.message, 'danger');
  }
}

/**
 * Render clients table HTML
 */
function renderClientsTable(clients) {
  const tbody = document.getElementById('clientsTable');
  tbody.innerHTML = '';
  
  clients.forEach(client => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${client.id}</td>
      <td><strong>${client.name}</strong></td>
      <td>${client.email}</td>
      <td>${client.phone}</td>
      <td>${client.isVIP ? '<span class="vip-badge">⭐ VIP</span>' : '-'}</td>
      <td>${client.isBadClient ? '<span class="bad-client-badge">⚠️ Bad</span>' : '-'}</td>
      <td>${client.notes || '-'}</td>
      <td>
        <button class="btn btn-warning btn-action" onclick="editClient(${client.id})">Edit</button>
        <button class="btn btn-danger btn-action" onclick="deleteClient(${client.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Render staff table HTML
 */
function renderStaffTable(staff) {
  const tbody = document.getElementById('staffTable');
  tbody.innerHTML = '';
  
  staff.forEach(member => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${member.id}</td>
      <td><strong>${member.name}</strong></td>
      <td>${member.role}</td>
      <td>${member.email}</td>
      <td>
        <button class="btn btn-warning btn-action" onclick="editStaff(${member.id})">Edit</button>
        <button class="btn btn-danger btn-action" onclick="deleteStaff(${member.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Render services table HTML
 */
function renderServicesTable(services) {
  const tbody = document.getElementById('servicesTable');
  tbody.innerHTML = '';
  
  services.forEach(service => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${service.id}</td>
      <td><strong>${service.name}</strong></td>
      <td>${service.duration}</td>
      <td>$${parseFloat(service.price).toFixed(2)}</td>
      <td>
        <button class="btn btn-warning btn-action" onclick="editService(${service.id})">Edit</button>
        <button class="btn btn-danger btn-action" onclick="deleteService(${service.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Open client modal for adding new client
 * Resets form and sets up for POST action
 */
function openClientModal() {
  document.getElementById('clientForm').reset();
  document.getElementById('clientId').value = '';
  document.getElementById('clientVIP').checked = false;
  document.getElementById('clientBad').checked = false;
  document.getElementById('clientModalLabel').textContent = 'Add Client';
  clientModalInstance.show();
}

/**
 * Edit existing client
 * Populates form with client data for PUT action
 */
function editClient(clientId) {
  const client = allClients.find(c => c.id == clientId);
  if (!client) return;
  
  document.getElementById('clientId').value = client.id;
  document.getElementById('clientName').value = client.name;
  document.getElementById('clientEmail').value = client.email;
  document.getElementById('clientPhone').value = client.phone;
  document.getElementById('clientNotes').value = client.notes || '';
  document.getElementById('clientVIP').checked = client.isVIP;
  document.getElementById('clientBad').checked = client.isBadClient;
  document.getElementById('clientModalLabel').textContent = 'Edit Client';
  clientModalInstance.show();
}

/**
 * Submit client form
 * Determines whether to POST (new) or PUT (edit) based on clientId
 */
async function submitClientForm(e) {
  e.preventDefault();
  
  const clientId = document.getElementById('clientId').value;
  const action = clientId ? 'edit' : 'add';
  
  // ===== CLIENT-SIDE VALIDATION =====
  // Validate required fields
  const clientName = document.getElementById('clientName').value;
  const clientEmail = document.getElementById('clientEmail').value;
  const clientPhone = document.getElementById('clientPhone').value;
  
  if (!clientName) {
    showAlert('Please enter client name', 'danger');
    return;
  }
  
  if (!clientEmail) {
    showAlert('Please enter client email', 'danger');
    return;
  }
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    showAlert('Please enter a valid email address', 'danger');
    return;
  }
  
  if (!clientPhone) {
    showAlert('Please enter client phone', 'danger');
    return;
  }
  
  const clientData = {
    id: clientId ? parseInt(clientId) : undefined,
    name: clientName,
    email: clientEmail,
    phone: clientPhone,
    notes: document.getElementById('clientNotes').value,
    isVIP: document.getElementById('clientVIP').checked,
    isBadClient: document.getElementById('clientBad').checked,
    appointments: clientId ? (allClients.find(c => c.id == clientId)?.appointments || []) : []
  };

  // Log data for debugging (visible in browser console)
  const endpoint = 'php/clients.php';
  const body = { action, data: clientData };
  console.log('Sending request to:', endpoint);
  console.log('Request data:', body);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    
    if (result.success) {
      showAlert(`Client ${action === 'add' ? 'added' : 'updated'} successfully!`, 'success');
      clientModalInstance.hide();
      loadClients();
    } else {
      showAlert('Error: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error submitting client form:', error);
    showAlert('Error saving client: ' + error.message, 'danger');
  }
}

/**
 * Delete client by ID
 * Confirms before deletion to prevent accidents
 */
async function deleteClient(clientId) {
  if (!confirm('Are you sure you want to delete this client?')) return;
  
  const endpoint = 'php/clients.php';
  const body = { action: 'delete', id: clientId };
  console.log('Sending request to:', endpoint);
  console.log('Request data:', body);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    if (result.success) {
      showAlert('Client deleted successfully!', 'success');
      loadClients();
    } else {
      showAlert('Error: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    showAlert('Error deleting client: ' + error.message, 'danger');
  }
}

/**
 * Open staff modal for adding new staff member
 */
function openStaffModal() {
  document.getElementById('staffForm').reset();
  document.getElementById('staffId').value = '';
  document.getElementById('staffForm').querySelector('.modal-title').textContent = 'Add Staff';
  staffModalInstance.show();
}

/**
 * Edit existing staff member
 */
function editStaff(staffId) {
  const staff = allStaff.find(s => s.id == staffId);
  if (!staff) return;
  
  document.getElementById('staffId').value = staff.id;
  document.getElementById('staffName').value = staff.name;
  document.getElementById('staffRole').value = staff.role;
  document.getElementById('staffEmail').value = staff.email;
  staffModalInstance.show();
}

/**
 * Submit staff form
 */
async function submitStaffForm(e) {
  e.preventDefault();
  
  const staffId = document.getElementById('staffId').value;
  const action = staffId ? 'edit' : 'add';
  
  // ===== CLIENT-SIDE VALIDATION =====
  // Validate required fields
  const staffName = document.getElementById('staffName').value;
  const staffRole = document.getElementById('staffRole').value;
  const staffEmail = document.getElementById('staffEmail').value;
  
  if (!staffName) {
    showAlert('Please enter staff name', 'danger');
    return;
  }
  
  if (!staffRole) {
    showAlert('Please enter staff role', 'danger');
    return;
  }
  
  if (!staffEmail) {
    showAlert('Please enter staff email', 'danger');
    return;
  }
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail)) {
    showAlert('Please enter a valid email address', 'danger');
    return;
  }
  
  const staffData = {
    id: staffId ? parseInt(staffId) : undefined,
    name: staffName,
    role: staffRole,
    email: staffEmail
  };
  
  // Log data for debugging (visible in browser console)
  const endpoint = 'php/staff.php';
  const body = { action, data: staffData };
  console.log('Sending request to:', endpoint);
  console.log('Request data:', body);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    
    if (result.success) {
      showAlert(`Staff member ${action === 'add' ? 'added' : 'updated'} successfully!`, 'success');
      staffModalInstance.hide();
      loadStaff();
    } else {
      showAlert('Error: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error submitting staff form:', error);
    showAlert('Error saving staff: ' + error.message, 'danger');
  }
}

/**
 * Delete staff member by ID
 */
async function deleteStaff(staffId) {
  if (!confirm('Are you sure you want to delete this staff member?')) return;
  
  const endpoint = 'php/staff.php';
  const body = { action: 'delete', id: staffId };
  console.log('Sending request to:', endpoint);
  console.log('Request data:', body);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    if (result.success) {
      showAlert('Staff member deleted successfully!', 'success');
      loadStaff();
    } else {
      showAlert('Error: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error deleting staff:', error);
    showAlert('Error deleting staff: ' + error.message, 'danger');
  }
}

/**
 * Open service modal for adding new service
 */
function openServiceModal() {
  document.getElementById('serviceForm').reset();
  document.getElementById('serviceId').value = '';
  document.getElementById('serviceModalLabel').textContent = 'Add Service';
  serviceModalInstance.show();
}

/**
 * Edit existing service
 */
function editService(serviceId) {
  const service = allServices.find(s => s.id == serviceId);
  if (!service) return;
  
  document.getElementById('serviceId').value = service.id;
  document.getElementById('serviceName').value = service.name;
  document.getElementById('serviceDuration').value = service.duration;
  document.getElementById('servicePrice').value = parseFloat(service.price).toFixed(2);
  document.getElementById('serviceModalLabel').textContent = 'Edit Service';
  serviceModalInstance.show();
}

/**
 * Submit service form
 */
async function submitServiceForm(e) {
  e.preventDefault();
  
  const serviceId = document.getElementById('serviceId').value;
  const action = serviceId ? 'edit' : 'add';
  
  // ===== CLIENT-SIDE VALIDATION =====
  // Validate required fields
  const serviceName = document.getElementById('serviceName').value;
  const serviceDuration = document.getElementById('serviceDuration').value;
  const servicePrice = document.getElementById('servicePrice').value;
  
  if (!serviceName) {
    showAlert('Please enter service name', 'danger');
    return;
  }
  
  if (!serviceDuration) {
    showAlert('Please enter service duration', 'danger');
    return;
  }
  
  if (parseInt(serviceDuration) <= 0) {
    showAlert('Service duration must be greater than 0', 'danger');
    return;
  }
  
  if (!servicePrice) {
    showAlert('Please enter service price', 'danger');
    return;
  }
  
  if (parseFloat(servicePrice) < 0) {
    showAlert('Service price cannot be negative', 'danger');
    return;
  }
  
  const serviceData = {
    id: serviceId ? parseInt(serviceId) : undefined,
    name: serviceName,
    duration: parseInt(serviceDuration),
    price: parseFloat(servicePrice)
  };
  
  // Log data for debugging (visible in browser console)
  const endpoint = 'php/services.php';
  const body = { action, data: serviceData };
  console.log('Sending request to:', endpoint);
  console.log('Request data:', body);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    
    if (result.success) {
      showAlert(`Service ${action === 'add' ? 'added' : 'updated'} successfully!`, 'success');
      serviceModalInstance.hide();
      loadServices();
    } else {
      showAlert('Error: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error submitting service form:', error);
    showAlert('Error saving service: ' + error.message, 'danger');
  }
}

/**
 * Delete service by ID
 */
async function deleteService(serviceId) {
  if (!confirm('Are you sure you want to delete this service?')) return;
  
  const endpoint = 'php/services.php';
  const body = { action: 'delete', id: serviceId };
  console.log('Sending request to:', endpoint);
  console.log('Request data:', body);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    if (result.success) {
      showAlert('Service deleted successfully!', 'success');
      loadServices();
    } else {
      showAlert('Error: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error deleting service:', error);
    showAlert('Error deleting service: ' + error.message, 'danger');
  }
}

/**
 * ===== CALENDAR LOGIC =====
 * 
 * The calendar is a grid-based monthly view where:
 * 1. Each cell represents a date
 * 2. Days with appointments have a red border (highlight class)
 * 3. Clicking a date opens a modal showing appointments for that day
 * 4. Each day has a "[+]" button to create new appointments
 * 5. Calendar updates after each appointment mutation
 */

/**
 * Render calendar for the current month
 * Creates a grid layout with proper week layout and appointment indicators
 */
function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // Update header with current month/year
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Create calendar grid container
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';
  
  // Add day headers (Mon, Tue, Wed, etc)
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const headerContainer = document.createElement('div');
  headerContainer.className = 'calendar-header';
  dayHeaders.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    headerContainer.appendChild(header);
  });
  grid.appendChild(headerContainer);
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day other-month';
    grid.appendChild(emptyDay);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    // Highlight today
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      dayElement.classList.add('today');
    }
    
    // Get appointments for this day
    const dayAppointments = allAppointments.filter(apt => apt.date === dateStr);
    
    // Highlight days with appointments (red border)
    if (dayAppointments.length > 0) {
      dayElement.classList.add('has-appointments');
    }
    
    // Day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);
    
    // Appointment list
    const appointmentsDiv = document.createElement('div');
    appointmentsDiv.className = 'calendar-appointments';
    dayAppointments.forEach(apt => {
      const apptEl = document.createElement('div');
      apptEl.className = 'calendar-appointment';
      const staff = allStaff.find(s => s.id == apt.staffId);
      apptEl.textContent = `${apt.time} - ${staff?.name || 'Unknown'}`;
      apptEl.title = 'Click to view details';
      appointmentsDiv.appendChild(apptEl);
    });
    dayElement.appendChild(appointmentsDiv);
    
    // Add button for creating new appointment
    const addBtn = document.createElement('button');
    addBtn.className = 'calendar-add-btn';
    addBtn.textContent = '[+]';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      currentDayForAppointments = dateStr;
      openAppointmentModalForDay();
    };
    dayElement.appendChild(addBtn);
    
    // Click to view appointments for this day
    dayElement.onclick = () => viewDayAppointments(dateStr);
    
    grid.appendChild(dayElement);
  }
  
  // Add empty cells for days after month ends
  const totalCells = grid.children.length - 1; // -1 for header
  const remainingCells = 35 - totalCells; // 5 rows * 7 days
  for (let i = 0; i < remainingCells; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day other-month';
    grid.appendChild(emptyDay);
  }
}

/**
 * View appointments for a specific day
 * Opens a modal showing all appointments and allowing status changes
 */
function viewDayAppointments(dateStr) {
  currentDayForAppointments = dateStr;
  const date = new Date(dateStr);
  const dateFormatted = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  document.getElementById('dayViewDate').textContent = dateFormatted;
  
  const dayAppointments = allAppointments.filter(apt => apt.date === dateStr);
  const tbody = document.getElementById('dayAppointmentsTable');
  tbody.innerHTML = '';
  
  if (dayAppointments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No appointments scheduled</td></tr>';
  } else {
    dayAppointments.forEach(apt => {
      const client = allClients.find(c => c.id == apt.clientId);
      const staff = allStaff.find(s => s.id == apt.staffId);
      const service = allServices.find(srv => srv.id == apt.serviceId);
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${apt.time}</td>
        <td>${client?.name || 'Unknown'}</td>
        <td>${staff?.name || 'Unknown'}</td>
        <td>${service?.name || 'Unknown'}</td>
        <td><span class="badge badge-${getStatusBadgeClass(apt.status)}">${apt.status}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editAppointment(${apt.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAppointment(${apt.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  
  dayViewModalInstance.show();
}

/**
 * Get Bootstrap badge class based on appointment status
 */
function getStatusBadgeClass(status) {
  switch(status) {
    case 'complete':
      return 'success';
    case 'pending':
      return 'warning';
    case 'deleted_by_user':
    case 'deleted_by_staff':
    case 'no_show':
      return 'danger';
    default:
      return 'secondary';
  }
}

/**
 * Open appointment modal for a specific day
 */
function openAppointmentModalForDay() {
  document.getElementById('appointmentForm').reset();
  document.getElementById('appointmentId').value = '';
  document.getElementById('appointmentDate').value = currentDayForAppointments;
  document.getElementById('appointmentStatus').value = 'pending';
  document.getElementById('appointmentModalLabel').textContent = 'Add Appointment';
  appointmentModalInstance.show();
}

/**
 * Edit existing appointment
 */
function editAppointment(appointmentId) {
  const apt = allAppointments.find(a => a.id == appointmentId);
  if (!apt) return;
  
  document.getElementById('appointmentId').value = apt.id;
  document.getElementById('appointmentDate').value = apt.date;
  document.getElementById('appointmentClient').value = apt.clientId;
  document.getElementById('appointmentStaff').value = apt.staffId;
  document.getElementById('appointmentService').value = apt.serviceId;
  document.getElementById('appointmentTime').value = apt.time;
  document.getElementById('appointmentStatus').value = apt.status;
  document.getElementById('appointmentModalLabel').textContent = 'Edit Appointment';
  appointmentModalInstance.show();
}

/**
 * Submit appointment form
 * Every appointment mutation (create/edit/delete) triggers email notification
 */
async function submitAppointmentForm(e) {
  e.preventDefault();
  
  const appointmentId = document.getElementById('appointmentId').value;
  const action = appointmentId ? 'edit' : 'add';
  
  // ===== CLIENT-SIDE VALIDATION =====
  // Get form values
  const clientIdField = document.getElementById('appointmentClient').value;
  const staffIdField = document.getElementById('appointmentStaff').value;
  const serviceIdField = document.getElementById('appointmentService').value;
  const dateField = document.getElementById('appointmentDate').value;
  const timeField = document.getElementById('appointmentTime').value;
  
  // Validate each required field with specific error messages
  if (!clientIdField) {
    showAlert('Please select a client', 'danger');
    return;
  }
  
  if (!staffIdField) {
    showAlert('Please select a staff member', 'danger');
    return;
  }
  
  if (!serviceIdField) {
    showAlert('Please select a service', 'danger');
    return;
  }
  
  if (!dateField) {
    showAlert('Please select a date', 'danger');
    return;
  }
  
  if (!timeField) {
    showAlert('Please select a time', 'danger');
    return;
  }
  
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateField)) {
    showAlert('Invalid date format. Please use YYYY-MM-DD', 'danger');
    return;
  }
  
  // Validate time format (HH:MM)
  if (!/^\d{2}:\d{2}$/.test(timeField)) {
    showAlert('Invalid time format. Please use HH:MM', 'danger');
    return;
  }
  
  // Build appointment data object
  const appointmentData = {
    id: appointmentId ? parseInt(appointmentId) : undefined,
    clientId: parseInt(clientIdField),
    staffId: parseInt(staffIdField),
    serviceId: parseInt(serviceIdField),
    date: dateField,
    time: timeField,
    status: document.getElementById('appointmentStatus').value
  };
  
  // Log data for debugging (visible in browser console)
  // ===== SEND TO SERVER =====
  const endpoint = 'php/appointments.php';
  const body = { action, data: appointmentData };
  console.log('Sending request to:', endpoint);
  console.log('Request data:', body);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    // Log response status
    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response data:', result);
    
    if (result.success) {
      let message = `Appointment ${action === 'add' ? 'created' : 'updated'} successfully! Email sent to client.`;
      if (result.incomeCreated) {
        message += ' Income record created.';
      }
      if (result.incomeDeleted) {
        message += ' Income record removed.';
      }
      showAlert(message, 'success');
      appointmentModalInstance.hide();
      dayViewModalInstance.hide();
      loadAppointmentsData().then(() => renderCalendar());
      // If income tab is visible, reload incomes
      const incomeTab = document.getElementById('income-panel');
      if (incomeTab && incomeTab.classList.contains('active')) {
        loadIncomes();
        getIncomeSummary();
      }
    } else {
      showAlert('Error: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error submitting appointment form:', error);
    showAlert('Error saving appointment: ' + error.message, 'danger');
  }
}

/**
 * Delete appointment by ID
 * Triggers email notification to client
 */
async function deleteAppointment(appointmentId) {
  if (!confirm('Are you sure you want to delete this appointment?')) return;
  
  const endpoint = 'php/appointments.php';
  const body = { action: 'delete', id: appointmentId };
  console.log('Sending request to:', endpoint);
  console.log('Request data:', body);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    if (result.success) {
      showAlert('Appointment deleted! Notification sent to client.', 'success');
      loadAppointmentsData().then(() => renderCalendar());
      dayViewModalInstance.hide();
      // Reload incomes if on income tab
      const incomeTab = document.getElementById('income-panel');
      if (incomeTab && incomeTab.classList.contains('active')) {
        loadIncomes();
        getIncomeSummary();
      }
    } else {
      showAlert('Error: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    showAlert('Error deleting appointment: ' + error.message, 'danger');
  }
}

/**
 * Navigate to previous month in calendar
 */
function goToPreviousMonth() {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderCalendar();
}

/**
 * Navigate to next month in calendar
 */
function goToNextMonth() {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
}

/**
 * Display alert message to user
 * Used for success/error feedback
 */
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  const container = document.querySelector('.container-fluid');
  container.insertBefore(alertDiv, container.firstChild.nextSibling);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// ===== INCOME/FINANCES FUNCTIONS =====

/**
 * FETCH: Load all income records from php/incomes.php
 * Uses cache: 'no-store' to bypass browser caching
 */
async function loadIncomes() {
  try {
    const response = await fetch('php/incomes.php?action=list', { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      allIncomes.length = 0;
      allIncomes.push(...result.data);
      populateIncomeStaffFilter();
      renderIncomeTable(result.data);
      document.getElementById('incomeRecordCount').textContent = `${result.data.length} records`;
    } else {
      showAlert('Error loading income records: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error loading incomes:', error);
    showAlert('Error loading income records: ' + error.message, 'danger');
  }
}

/**
 * FETCH: Get income summary data from php/incomes.php?action=getSummary
 * Updates the summary cards with totals
 */
async function getIncomeSummary() {
  try {
    const response = await fetch('php/incomes.php?action=getSummary', { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      incomeSummary = result.data;
      renderIncomeDashboard();
      renderIncomeByStaff();
      renderIncomeByService();
    } else {
      showAlert('Error loading income summary: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error loading income summary:', error);
    showAlert('Error loading income summary: ' + error.message, 'danger');
  }
}

/**
 * Render income summary cards with current totals
 */
function renderIncomeDashboard() {
  document.getElementById('incomeTodayTotal').textContent = formatCurrency(incomeSummary.totalToday || 0);
  document.getElementById('incomeWeekTotal').textContent = formatCurrency(incomeSummary.totalThisWeek || 0);
  document.getElementById('incomeMonthTotal').textContent = formatCurrency(incomeSummary.totalThisMonth || 0);
  document.getElementById('incomeAllTimeTotal').textContent = formatCurrency(incomeSummary.totalAllTime || 0);
}

/**
 * Render income table with provided data
 */
function renderIncomeTable(incomes) {
  const tbody = document.getElementById('incomeTableBody');
  tbody.innerHTML = '';
  
  if (incomes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No income records found</td></tr>';
    return;
  }
  
  incomes.forEach(income => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(income.date)}</td>
      <td>${income.time}</td>
      <td><strong>${income.clientName}</strong></td>
      <td>${income.staffName}</td>
      <td>${income.serviceName}</td>
      <td class="income-amount-cell">${formatCurrency(income.amount)}</td>
      <td><span class="payment-method-badge ${getPaymentMethodBadgeClass(income.paymentMethod)}">${income.paymentMethod}</span></td>
      <td><span class="badge badge-success">${income.status}</span></td>
      <td>
        <button class="btn btn-warning btn-sm btn-action" onclick="editIncome(${income.id})">Edit</button>
        <button class="btn btn-danger btn-sm btn-action" onclick="deleteIncome(${income.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Filter incomes based on filter inputs
 */
async function filterIncomes() {
  const dateFrom = document.getElementById('incomeFilterDateFrom').value;
  const dateTo = document.getElementById('incomeFilterDateTo').value;
  const staffName = document.getElementById('incomeFilterStaff').value;
  const paymentMethod = document.getElementById('incomeFilterPayment').value;
  
  // Build query string
  const params = new URLSearchParams();
  params.append('action', 'list');
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (paymentMethod) params.append('paymentMethod', paymentMethod);
  
  try {
    const response = await fetch(`php/incomes.php?${params.toString()}`, { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      let filteredData = result.data;
      
      // Filter by staff name (client-side since we store staff name, not ID)
      if (staffName) {
        filteredData = filteredData.filter(inc => inc.staffName === staffName);
      }
      
      renderIncomeTable(filteredData);
      document.getElementById('incomeRecordCount').textContent = `${filteredData.length} records`;
    } else {
      showAlert('Error filtering income records: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error filtering incomes:', error);
    showAlert('Error filtering income records: ' + error.message, 'danger');
  }
}

/**
 * Clear all income filters
 */
function clearIncomeFilters() {
  document.getElementById('incomeFilterDateFrom').value = '';
  document.getElementById('incomeFilterDateTo').value = '';
  document.getElementById('incomeFilterStaff').value = '';
  document.getElementById('incomeFilterPayment').value = '';
  loadIncomes();
}

/**
 * Populate staff filter dropdown for income tab
 */
function populateIncomeStaffFilter() {
  const select = document.getElementById('incomeFilterStaff');
  select.innerHTML = '<option value="">All Staff</option>';
  
  allStaff.forEach(staff => {
    const option = document.createElement('option');
    option.value = staff.name;
    option.textContent = staff.name;
    select.appendChild(option);
  });
}

/**
 * Render income by staff summary table
 */
function renderIncomeByStaff() {
  const tbody = document.getElementById('incomeByStaffBody');
  tbody.innerHTML = '';
  
  if (!incomeSummary.byStaff || incomeSummary.byStaff.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No data</td></tr>';
    return;
  }
  
  incomeSummary.byStaff.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.staffName}</td>
      <td class="text-end staff-total">${formatCurrency(item.total)}</td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Render income by service summary table
 */
function renderIncomeByService() {
  const tbody = document.getElementById('incomeByServiceBody');
  tbody.innerHTML = '';
  
  if (!incomeSummary.byService || incomeSummary.byService.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No data</td></tr>';
    return;
  }
  
  incomeSummary.byService.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.serviceName}</td>
      <td class="text-end service-total">${formatCurrency(item.total)}</td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Open edit modal for income record
 */
function editIncome(incomeId) {
  const income = allIncomes.find(i => i.id == incomeId);
  if (!income) return;
  
  document.getElementById('incomeId').value = income.id;
  document.getElementById('incomeClientDisplay').textContent = income.clientName;
  document.getElementById('incomeServiceDisplay').textContent = income.serviceName;
  document.getElementById('incomeAmountDisplay').textContent = formatCurrency(income.amount);
  document.getElementById('incomePaymentMethod').value = income.paymentMethod || 'cash';
  document.getElementById('incomeNotes').value = income.notes || '';
  
  incomeModalInstance.show();
}

/**
 * Submit income form (edit only)
 */
async function submitIncomeForm(e) {
  e.preventDefault();
  
  const incomeId = parseInt(document.getElementById('incomeId').value);
  const paymentMethod = document.getElementById('incomePaymentMethod').value;
  const notes = document.getElementById('incomeNotes').value;
  
  try {
    const response = await fetch('php/incomes.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'edit', 
        data: { 
          id: incomeId, 
          paymentMethod, 
          notes 
        } 
      })
    });
    const result = await response.json();
    if (result.success) {
      showAlert('Income record updated successfully!', 'success');
      incomeModalInstance.hide();
      loadIncomes();
      getIncomeSummary();
    } else {
      showAlert('Error: ' + result.error, 'danger');
    }
  } catch (error) {
    console.error('Error updating income:', error);
    showAlert('Error updating income record: ' + error.message, 'danger');
  }
}

/**
 * Delete income record and revert appointment status
 */
async function deleteIncome(incomeId) {
  const income = allIncomes.find(i => i.id == incomeId);
  if (!income) return;
  
  if (!confirm(`Delete this income record for ${income.clientName} (${formatCurrency(income.amount)})? This will revert the appointment status to "pending".`) {
    return;
  }
  
  try {
    // First, update the appointment status back to pending
    const aptResponse = await fetch('php/appointments.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'updateStatus', 
        id: income.appointmentId, 
        status: 'pending' 
      })
    });
    const aptResult = await aptResponse.json();
    
    if (!aptResult.success) {
      showAlert('Error reverting appointment status: ' + aptResult.error, 'danger');
      return;
    }
    
    showAlert('Income record deleted and appointment status reverted to pending!', 'success');
    
    // Reload data
    loadIncomes();
    getIncomeSummary();
    loadAppointmentsData().then(() => {
      // If calendar is visible, re-render it
      const appointmentsTab = document.getElementById('appointments-panel');
      if (appointmentsTab && appointmentsTab.classList.contains('active')) {
        renderCalendar();
      }
    });
  } catch (error) {
    console.error('Error deleting income:', error);
    showAlert('Error deleting income record: ' + error.message, 'danger');
  }
}

/**
 * Get payment method badge CSS class
 */
function getPaymentMethodBadgeClass(method) {
  switch(method) {
    case 'cash': return 'payment-cash';
    case 'card': return 'payment-card';
    case 'check': return 'payment-check';
    case 'other': return 'payment-other';
    default: return 'payment-cash';
  }
}

/**
 * Format number as currency
 */
function formatCurrency(amount) {
  return '$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
