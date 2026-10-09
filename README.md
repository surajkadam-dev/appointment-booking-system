# Appointment & Booking Management System

## Overview

The Appointment & Booking Management System is a web application developed as part of a technical assignment. It helps manage customers, staff, services, staff availability, appointments, appointment history, and administrative reports.

The application uses Django and Django REST Framework for backend functionality, MySQL for database storage, and HTML, CSS, and JavaScript for the frontend.

The system supports three primary roles: Admin, Staff, and Customer. Each role has different permissions and responsibilities.

## Technology Stack

| Technology | Version / Usage |
|---|---|
| Python | 3.14.8 |
| Django | 6.1.2 |
| Django REST Framework | REST API development |
| MySQL | 8.4+ recommended |
| HTML, CSS, JavaScript | Frontend |
| Django ORM | Database operations |
| Git and GitHub | Version control |

## Prerequisites

Install the following before starting:

- Python 3.14.8
- MySQL Server 8.4 or later
- MySQL command-line client
- Git
- Visual Studio Code or another code editor

Check the installed versions:

```powershell
python --version
mysql --version
git --version
```

The project was developed using Python 3.14.8 and Django 6.1.2. Using the same versions is recommended.

## 1. Clone the Repository

Clone the project repository:

```powershell
git clone https://github.com/surajkadam-dev/appointment-booking-system.git
```

Move into the project directory:

```powershell
cd appointment-booking-system
```

If the project is already downloaded, open PowerShell in the existing project directory instead.

## 2. Create and Activate the Virtual Environment

Create a virtual environment:

```powershell
python -m venv venv
```

Activate it in Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

If using Command Prompt, run:

```cmd
venv\Scripts\activate
```

After activation, `(venv)` should appear at the beginning of the terminal prompt.

If the virtual environment already exists, activate it instead of creating another one.

## 3. Install Dependencies

With the virtual environment activated, run:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Verify the Django version:

```powershell
python -m django --version
```

Expected version:

```text
6.1.2
```

## 4. Configure MySQL

The project uses the following database configuration:

| Setting | Value |
|---|---|
| Database | `appointment_booking_db` |
| Host | `localhost` |
| Development port | `3307` |
| Database engine | MySQL |

**Important:** Use the port on which your MySQL server is actually running. If it runs on port `3306`, use `3306` instead of `3307` in the commands and Django configuration below.

Connect to MySQL on port `3307`:

```powershell
mysql -u root -p -P 3307
```

Enter your MySQL root password when prompted.

If your server runs on port `3306`, use:

```powershell
mysql -u root -p -P 3306
```

Check the connected server version and port:

```sql
SELECT VERSION();
SHOW VARIABLES LIKE 'port';
```

### Create the database

Run the following SQL command inside the MySQL client:

```sql
CREATE DATABASE appointment_booking_db;
```

Verify the database:

```sql
SHOW DATABASES;
```

Exit the MySQL client:

```sql
EXIT;
```

Django will create the application tables when migrations are applied. There is no need to create those tables manually.

## 5. Configure Django Database Settings

Open `config/settings.py` and locate the `DATABASES` setting.

Make sure the database configuration matches your local MySQL installation. For example:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": "appointment_booking_db",
        "USER": "root",
        "PASSWORD": "YOUR_MYSQL_ROOT_PASSWORD",
        "HOST": "localhost",
        "PORT": "3307",
    }
}
```

Replace `YOUR_MYSQL_ROOT_PASSWORD` with the password configured on your machine.

If your MySQL server uses port `3306`, change the `PORT` value to `"3306"`.

The username and password must match an existing MySQL account with permission to access the database. The example above follows a local setup using the root account; it does not create a new MySQL account.

The project currently does not require a separate `.env` file. Keep credentials private and do not commit real passwords to GitHub.

## 6. Apply Database Migrations

From the project root, run:

```powershell
python manage.py migrate
```

This applies the existing migration files and creates the required database tables.

Check the migration status:

```powershell
python manage.py showmigrations
```

Applied migrations are marked with `[X]`.

If you have modified model definitions and need to generate new migrations, use:

```powershell
python manage.py makemigrations
python manage.py migrate
```

For a normal fresh installation from the repository, apply the committed migrations first rather than generating new ones unnecessarily.

## 7. Create the Django Administrator

Create an administrator account for the Django admin site:

```powershell
python manage.py createsuperuser
```

Follow the prompts to enter the required username, email address if requested, and password.

The `createsuperuser` command creates a Django superuser. It is different from MySQL's `CREATE USER` command, which creates a database account.

After creating the account, run the project checks:

```powershell
python manage.py check
```

Resolve any configuration errors before starting the server.

## 8. Start the Application

Start the Django development server:

```powershell
python manage.py runserver
```

Open the application in your browser:

http://127.0.0.1:8000/

The Django admin site is available at:

http://127.0.0.1:8000/admin/

Log in using the superuser credentials created earlier.

If port `8000` is already in use, run:

```powershell
python manage.py runserver 8001
```

Then open `http://127.0.0.1:8001/`.

## 9. Initial Application Setup

After starting the application, configure the initial data in this order:

1. Log in as an administrator.
2. Create the services that customers can book.
3. Create staff accounts.
4. Assign the relevant services to staff.
5. Configure recurring weekly staff availability.
6. Register a customer account through the customer registration flow.
7. Log in as the customer and book an appointment.

Staff accounts are managed by the administrator; staff do not register through the customer registration page.

### Staff availability

Configure each staff member's working days and working hours.

For example:

| Setting | Example |
|---|---|
| Working day | Tuesday |
| Start time | 09:00 |
| End time | 17:00 |
| Available | Yes |

The current implementation uses recurring weekly availability. One-time leave and holiday exceptions are not implemented.

## 10. Appointment Booking Workflow

Customers can select a service, staff member, appointment date, and start time through the booking flow.

Authorized staff can also book appointments for customers, which supports receptionist-assisted booking.

The backend validates appointment requests, including:

- The appointment is not in the past.
- The selected service exists and is active.
- The selected staff member is available.
- The selected time falls within working hours.
- The requested appointment does not overlap an existing booking.
- The appointment end time is calculated using the service duration.

For example, a service lasting 45 minutes booked at 10:00 has an end time of 10:45.

The system also supports appointment cancellation, rescheduling, appointment history, and administrative reports.

## 11. API Overview

The backend exposes REST API endpoints for the application's main resources and operations.

The principal API route groups include:

```text
/api/accounts/customers/
/api/accounts/staff/
/api/services/
/api/availability/
/api/appointments/
/api/reports/admin/
```

Appointment-specific actions include:

```text
/api/appointments/staff-book/
/api/appointments/{id}/cancel/
/api/appointments/{id}/reschedule/
/api/appointments/{id}/complete/
```

These routes are listed for orientation. Consult the project's API documentation and URL configuration for the supported HTTP methods, authentication requirements, request payloads, and response formats.

## 12. Common Django Commands

Run these commands from the project root with the virtual environment activated.

| Purpose | Command |
|---|---|
| Check project configuration | `python manage.py check` |
| Create migrations after model changes | `python manage.py makemigrations` |
| Apply migrations | `python manage.py migrate` |
| View migration status | `python manage.py showmigrations` |
| Create an administrator | `python manage.py createsuperuser` |
| Start development server | `python manage.py runserver` |
| Open Django shell | `python manage.py shell` |
| Check Django version | `python -m django --version` |

## 13. Troubleshooting

### MySQL connection failure

If Django cannot connect to MySQL, check that:

- The MySQL server is running.
- The database `appointment_booking_db` exists.
- The username and password are correct.
- The MySQL port matches the port configured in `config/settings.py`.

Test the connection using:

```powershell
mysql -u root -p -P 3307
```

Replace `3307` with the actual server port if necessary.

### Missing database tables or columns

Apply the committed migrations:

```powershell
python manage.py migrate
```

Check their status:

```powershell
python manage.py showmigrations
```

If a required migration is missing, inspect the model definitions and migration history before generating new migrations.

### Django command not found

Activate the virtual environment:

```powershell
.\venv\Scripts\Activate.ps1
```

Then install dependencies:

```powershell
pip install -r requirements.txt
```

### Port 8000 is already in use

Start the server on another port:

```powershell
python manage.py runserver 8001
```

## 14. Project Structure

The main project directories include:

```text
appointment-booking-system/
├── appointments/
│   └── migrations/
├── config/
│   └── settings.py
├── frontend/
│   ├── admin/
│   ├── css/
│   └── js/
├── reports/
│   ├── urls.py
│   └── views.py
├── manage.py
├── requirements.txt
└── README.md
```

The `appointments` application contains appointment-related functionality and migrations. The `config` directory contains the Django project settings. The `frontend` directory contains HTML, CSS, and JavaScript files, while `reports` handles administrative reporting functionality.

Other application directories and files may also be present in the repository.

## 15. Security and Development Notes

- Do not commit database passwords or other private credentials.
- Keep the Python virtual environment and compiled Python files out of version control.
- Commit migration files when model changes require schema updates.
- Apply new migrations after pulling code that introduces them.
- Use Django's development server for local development, not as a production deployment server.

## 16. Assignment Scope

This project was developed for a technical assignment covering appointment and booking management.

The assignment scope includes role-based access, customer and staff management, service management, availability, appointment booking, cancellation, rescheduling, appointment history, reports, API testing, manual test cases, and useful SQL queries.

Refer to the project's API documentation, database schema documentation, and test documentation for further details.

## License

This project was developed as part of a technical evaluation assignment. Add a separate license if one is applicable.
