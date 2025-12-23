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
 * 7. Error handling and user feedback
 */

// Global state for current calendar view
let currentMonth = new Date();
let currentDayForAppointments = null;
const allClients = [];
const allStaff = [];
const allServices = [];
const allAppointments = [];

// Bootstrap modals (cached for performance)
let clientModalInstance = null;
let staffModalInstance = null;
let serviceModalInstance = null;
let appointmentModalInstance = null;
let dayViewModalInstance = null;

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
 * FETCH: Load clients from /php/clients.php
 * Uses cache: 'no-store' to bypass browser caching
 */
async function loadClientsData() {
  try {
    const response = await fetch('/php/clients.php?action=list', { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      allClients.length = 0;
      allClients.push(...result.data);
      populateClientDropdowns();
    }
  } catch (error) {
    console.error('Error loading clients:', error);
  }
}

/**
 * FETCH: Load staff from /php/staff.php
 * Uses cache: 'no-store' to bypass browser caching
 */
async function loadStaffData() {
  try {
    const response = await fetch('/php/staff.php?action=list', { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      allStaff.length = 0;
      allStaff.push(...result.data);
      populateStaffDropdowns();
    }
  } catch (error) {
    console.error('Error loading staff:', error);
  }
}

/**
 * FETCH: Load services from /php/services.php
 * Uses cache: 'no-store' to bypass browser caching
 */
async function loadServicesData() {
  try {
    const response = await fetch('/php/services.php?action=list', { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      allServices.length = 0;
      allServices.push(...result.data);
      populateServiceDropdowns();
    }
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

/**
 * FETCH: Load appointments from /php/appointments.php
 * Uses cache: 'no-store' to bypass browser caching
 */
async function loadAppointmentsData() {
  try {
    const response = await fetch('/php/appointments.php?action=list', { 
      cache: 'no-store' 
    });
    const result = await response.json();
    if (result.success) {
      allAppointments.length = 0;
      allAppointments.push(...result.data);
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
}

/**
 * Load and display clients in table
 * FETCH with cache: 'no-store' to ensure fresh data
 */
async function loadClients() {
  try {
    const response = await fetch('/php/clients.php?action=list', { 
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
    const response = await fetch('/php/staff.php?action=list', { 
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
    const response = await fetch('/php/services.php?action=list', { 
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
  
  const clientData = {
    id: clientId ? parseInt(clientId) : undefined,
    name: document.getElementById('clientName').value,
    email: document.getElementById('clientEmail').value,
    phone: document.getElementById('clientPhone').value,
    notes: document.getElementById('clientNotes').value,
    isVIP: document.getElementById('clientVIP').checked,
    isBadClient: document.getElementById('clientBad').checked,
    appointments: clientId ? (allClients.find(c => c.id == clientId)?.appointments || []) : []
  };
  
  try {
    const response = await fetch('/php/clients.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data: clientData })
    });
    const result = await response.json();
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
  
  try {
    const response = await fetch('/php/clients.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: clientId })
    });
    const result = await response.json();
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
  
  const staffData = {
    id: staffId ? parseInt(staffId) : undefined,
    name: document.getElementById('staffName').value,
    role: document.getElementById('staffRole').value,
    email: document.getElementById('staffEmail').value
  };
  
  try {
    const response = await fetch('/php/staff.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data: staffData })
    });
    const result = await response.json();
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
  
  try {
    const response = await fetch('/php/staff.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: staffId })
    });
    const result = await response.json();
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
  
  const serviceData = {
    id: serviceId ? parseInt(serviceId) : undefined,
    name: document.getElementById('serviceName').value,
    duration: parseInt(document.getElementById('serviceDuration').value),
    price: parseFloat(document.getElementById('servicePrice').value)
  };
  
  try {
    const response = await fetch('/php/services.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data: serviceData })
    });
    const result = await response.json();
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
  
  try {
    const response = await fetch('/php/services.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: serviceId })
    });
    const result = await response.json();
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
  
  const appointmentData = {
    id: appointmentId ? parseInt(appointmentId) : undefined,
    clientId: parseInt(document.getElementById('appointmentClient').value),
    staffId: parseInt(document.getElementById('appointmentStaff').value),
    serviceId: parseInt(document.getElementById('appointmentService').value),
    date: document.getElementById('appointmentDate').value,
    time: document.getElementById('appointmentTime').value,
    status: document.getElementById('appointmentStatus').value
  };
  
  try {
    const response = await fetch('/php/appointments.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data: appointmentData })
    });
    const result = await response.json();
    if (result.success) {
      showAlert(`Appointment ${action === 'add' ? 'created' : 'updated'} successfully! Email sent to client.`, 'success');
      appointmentModalInstance.hide();
      dayViewModalInstance.hide();
      loadAppointmentsData().then(() => renderCalendar());
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
  
  try {
    const response = await fetch('/php/appointments.php', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: appointmentId })
    });
    const result = await response.json();
    if (result.success) {
      showAlert('Appointment deleted! Notification sent to client.', 'success');
      loadAppointmentsData().then(() => renderCalendar());
      dayViewModalInstance.hide();
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
