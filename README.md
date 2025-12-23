# Beauty Salon Management System

A lightweight, modern web application for managing beauty salon operations including clients, staff, services, and appointments. Built with vanilla JavaScript and PHP, using JSON files for data persistence—no database required.

## Project Overview

The Beauty Salon Management System (BSMS) provides a complete solution for salon owners and staff to efficiently manage daily operations. The system features a clean, intuitive interface with four functional tabs covering all essential business operations. It tracks client information, manages staff schedules, catalogs available services, and handles appointment booking with email notifications and status tracking.

## Technical Description

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6) with Bootstrap 5 via CDN
- **Backend**: PHP 7+ (no frameworks required)
- **Storage**: JSON files (no database needed)
- **Styling**: Bootstrap 5 with custom CSS
- **HTTP Client**: Native JavaScript `fetch()` API

### Architecture
- **Modular Design**: Separate PHP files for each entity (clients, staff, services, appointments)
- **No Frameworks**: Pure PHP and JavaScript for maximum portability and simplicity
- **Client-Server Communication**: AJAX/JSON-based API calls
- **Responsive Design**: Mobile-friendly interface using Bootstrap grid system

### Key Technical Features

**Cache Busting**: All fetch calls include `{ cache: 'no-store' }` parameter to prevent browser caching:
```javascript
fetch('/php/clients.php?action=list', { cache: 'no-store' })
```

**File Locking**: Uses PHP `flock()` to prevent race conditions during concurrent read/write operations:
- `LOCK_SH` (shared lock) for read operations
- `LOCK_EX` (exclusive lock) for write operations

**Email Notifications**: Built-in email system that triggers after every appointment mutation using PHP's `mail()` function.

**Error Handling**: Comprehensive validation in both JavaScript (client-side) and PHP (server-side) with user-friendly error messages.

## Functional Description

### Core Features

**4-Tab Dashboard**
1. **Clients Tab** - Manage client database with VIP/bad client tracking
2. **Staff Tab** - Staff roster management and role assignment  
3. **Services Tab** - Service catalog with duration and pricing
4. **Appointments Tab** - Calendar-based appointment scheduling

**Calendar System**
- Monthly grid view with Sun-Sat layout
- Days with appointments marked with red border
- Current day highlighted in blue
- 3-4 appointment previews per day
- Quick-add button on each day
- Click-to-view full day appointments

**CRUD Operations**
All entities support full Create, Read, Update, Delete operations via Bootstrap modals:
- **Clients**: Add/edit client details, mark VIP/bad client status
- **Staff**: Manage staff profiles with roles and emails
- **Services**: Define service offerings with duration and price
- **Appointments**: Schedule, modify, or cancel appointments

**Appointment Status Management**
Five status states for comprehensive tracking:
- `pending` - Default for new appointments
- `complete` - Successfully completed
- `deleted_by_user` - Cancelled by client
- `deleted_by_staff` - Cancelled by salon staff
- `no_show` - Client failed to appear

**Client Tracking**
- VIP client flag for special customers
- Bad client flag for problematic customers
- Appointment history per client
- Notes field for preferences/allergies

**Email Notifications**
Automatic email alerts triggered on:
- Appointment creation
- Appointment edits
- Appointment deletions
- Status changes

Emails include: date, time, service, staff, and status information.

## Operational Description / Getting Started

### Prerequisites
- PHP 7.0 or higher
- Web server (Apache/Nginx)
- PHP's `mail()` function configured (or use error_log during development)
- Modern web browser with JavaScript enabled

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd beauty-salon-management-system
   ```

2. **Ensure data directory permissions**:
   ```bash
   chmod 775 data/
   ```

3. **Verify PHP files have execute permissions**:
   ```bash
   chmod 644 php/*.php
   ```

4. **Place in your web server document root** or configure virtual host

### Running Locally

**Using PHP's built-in server:**
```bash
cd beauty-salon-management-system
php -S localhost:8000
```

Then open: `http://localhost:8000`

**Using Apache/XAMPP/MAMP:**
- Copy files to your htdocs/wwwroot directory
- Access via `http://localhost/beauty-salon-management-system`

### Basic Usage Guide

1. **Access Dashboard**: Navigate to index.html in your browser
2. **Add Clients**: Go to Clients tab → "Add New Client" → Fill form → Save
3. **Add Staff**: Go to Staff tab → "Add New Staff" → Fill details → Save
4. **Add Services**: Go to Services tab → "Add New Service" → Set duration/price → Save
5. **Create Appointments**: Go to Appointments tab → Click calendar day or [+] button → Select client/staff/service → Set time → Save

### Email Configuration

**Development Mode**: Emails are logged to PHP's `error_log` by default. Check your web server error logs.

**Production Mode**: Configure PHP's `mail()` function:
- Set up a local MTA (Postfix, Sendmail) or SMTP relay
- Update sendmail_path in php.ini if needed
- For cloud hosting, configure email service provider (SendGrid, AWS SES, etc.)

**Testing Emails**: To enable actual emails in development, replace error_log calls in `/php/appointments.php` with actual mail() calls.

## Project Structure

```
beauty-salon-management-system/
├── index.html              # Main dashboard with 4 tabs
├── css/
│   └── style.css           # Custom styling for calendar/modals
├── js/
│   └── app.js              # Core client-side logic (CRUD, calendar, modals)
├── php/                    # Backend CRUD endpoints
│   ├── clients.php         # Client operations + file locking
│   ├── staff.php           # Staff operations + file locking
│   ├── services.php        # Service operations + file locking
│   └── appointments.php    # Appointment operations + EMAIL NOTIFICATIONS
├── data/                   # JSON data storage
│   ├── clients.json        # Client database
│   ├── staff.json          # Staff roster
│   ├── services.json       # Service catalog
│   └── appointments.json   # Appointment schedule
├── .gitignore             # Git ignore file
├── LICENSE                # MIT License
└── README.md              # This file
```

## API/Endpoints Overview

All endpoints accept GET/POST requests with `action` parameter and return JSON responses.

### Clients Endpoint
```
/php/clients.php?action=list      # GET all clients
/php/clients.php?action=add       # POST new client
/php/clients.php?action=edit      # POST update client
/php/clients.php?action=delete    # POST delete client
```

### Staff Endpoint
```
/php/staff.php?action=list        # GET all staff
/php/staff.php?action=add         # POST new staff
/php/staff.php?action=edit        # POST update staff
/php/staff.php?action=delete      # POST delete staff
```

### Services Endpoint
```
/php/services.php?action=list     # GET all services
/php/services.php?action=add      # POST new service
/php/services.php?action=edit     # POST update service
/php/services.php?action=delete   # POST delete service
```

### Appointments Endpoint
```
/php/appointments.php?action=list         # GET all appointments
/php/appointments.php?action=add          # POST new appointment + EMAIL
/php/appointments.php?action=edit         # POST update appointment + EMAIL
/php/appointments.php?action=delete       # POST delete appointment + EMAIL
/php/appointments.php?action=updateStatus # POST update status + EMAIL
```

## Data Models

### Client Structure
```json
{
  "id": 1,
  "name": "Alice Green",
  "email": "alice@example.com",
  "phone": "+1-555-0101",
  "notes": "Prefers weekends",
  "isVIP": true,
  "isBadClient": false,
  "appointments": [
    { "appointmentId": 12, "status": "complete", "note": "On time" }
  ]
}
```

### Staff Structure
```json
{
  "id": 1,
  "name": "Maria Rossi",
  "role": "Stylist",
  "email": "maria@salon.com"
}
```

### Service Structure
```json
{
  "id": 1,
  "name": "Haircut",
  "duration": 30,
  "price": 35.0
}
```

### Appointment Structure
```json
{
  "id": 12,
  "clientId": 1,
  "staffId": 1,
  "serviceId": 1,
  "date": "2024-12-23",
  "time": "10:00",
  "status": "complete"
}
```

## Important Notes

**Authentication**: No user authentication is implemented. The system opens directly to the dashboard and is designed for trusted environments (single salon, internal network).

**Data Persistence**: All data is stored as JSON files in the `/data` directory. No database server is required, but regular backups are recommended.

**Browser Compatibility**: Requires modern browser with ES6 support. Compatible with Chrome 51+, Firefox 54+, Safari 10+, and Edge 15+.

**Development vs Production**: 
- Development: Emails logged via `error_log()`
- Production: Requires proper mail server configuration

**Scalability**: This lightweight system is optimized for small to medium salons (up to ~1000 clients, ~5000 appointments). For larger operations, consider migrating to a database.

**File Locking**: Concurrent operations are handled via PHP flock(). peak load should be considered during deployment.

---

## License

MIT License - See LICENSE file for details
