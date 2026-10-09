-- =========================================================
-- APPOINTMENT & BOOKING MANAGEMENT SYSTEM
-- MODULE: ACCOUNTS
-- Source: accounts/models.py and accounts/serializers.py
-- Database: MySQL
-- =========================================================

USE appointment_booking_db;


-- =========================================================
-- 1. USER COUNT BY ROLE
-- ADMIN, STAFF, CUSTOMER
-- =========================================================

SELECT
    role,
    COUNT(*) AS total_users
FROM accounts_user
GROUP BY role
ORDER BY role;


-- =========================================================
-- 2. ACTIVE AND INACTIVE USERS
-- =========================================================

SELECT
    role,
    COUNT(*) AS total_users,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_users,
    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive_users
FROM accounts_user
GROUP BY role
ORDER BY role;


-- =========================================================
-- 3. COMPLETE USER DIRECTORY
-- =========================================================

SELECT
    id AS user_id,
    first_name,
    last_name,
    CONCAT(first_name, ' ', last_name) AS full_name,
    email,
    role,
    is_active,
    is_staff AS django_admin_access,
    created_at,
    updated_at
FROM accounts_user
ORDER BY created_at DESC;


-- =========================================================
-- 4. CUSTOMER DIRECTORY
-- User details + Customer profile
-- =========================================================

SELECT
    c.id AS customer_id,
    u.id AS user_id,
    u.first_name,
    u.last_name,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.email,
    c.phone,
    c.address,
    c.date_of_birth,
    u.is_active AS account_is_active,
    c.created_at AS profile_created_at,
    c.updated_at AS profile_updated_at
FROM accounts_customer AS c
INNER JOIN accounts_user AS u
    ON u.id = c.user_id
ORDER BY c.created_at DESC;


-- =========================================================
-- 5. STAFF DIRECTORY
-- Includes Doctor, Receptionist and Other Staff
-- =========================================================

SELECT
    s.id AS staff_id,
    u.id AS user_id,
    u.first_name,
    u.last_name,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    s.phone,
    u.role,
    s.staff_type,
    s.designation,
    s.department,
    s.is_available,
    u.is_active AS account_is_active,
    s.created_at AS profile_created_at,
    s.updated_at AS profile_updated_at
FROM accounts_staff AS s
INNER JOIN accounts_user AS u
    ON u.id = s.user_id
ORDER BY s.staff_type, u.last_name, u.first_name;


-- =========================================================
-- 6. STAFF COUNT BY STAFF TYPE
-- =========================================================

SELECT
    staff_type,
    COUNT(*) AS total_staff,
    SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) AS available_staff,
    SUM(CASE WHEN is_available = 0 THEN 1 ELSE 0 END) AS unavailable_staff
FROM accounts_staff
GROUP BY staff_type
ORDER BY staff_type;


-- =========================================================
-- 7. STAFF SERVICES
-- Uses the Staff.services ManyToManyField
-- =========================================================

SELECT
    s.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    s.staff_type,
    sv.id AS service_id,
    sv.name AS service_name,
    sv.duration AS duration_minutes,
    sv.price,
    sv.is_active AS service_is_active
FROM accounts_staff AS s
INNER JOIN accounts_user AS u
    ON u.id = s.user_id
LEFT JOIN accounts_staff_services AS ss
    ON ss.staff_id = s.id
LEFT JOIN services_service AS sv
    ON sv.id = ss.service_id
ORDER BY staff_name, service_name;


-- =========================================================
-- 8. STAFF WITH NO ASSIGNED SERVICES
-- =========================================================

SELECT
    s.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    s.staff_type,
    s.designation,
    s.department,
    s.is_available
FROM accounts_staff AS s
INNER JOIN accounts_user AS u
    ON u.id = s.user_id
LEFT JOIN accounts_staff_services AS ss
    ON ss.staff_id = s.id
WHERE ss.staff_id IS NULL
ORDER BY staff_name;


-- =========================================================
-- 9. SERVICE COUNT PER STAFF MEMBER
-- =========================================================

SELECT
    s.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    s.staff_type,
    COUNT(ss.service_id) AS total_assigned_services
FROM accounts_staff AS s
INNER JOIN accounts_user AS u
    ON u.id = s.user_id
LEFT JOIN accounts_staff_services AS ss
    ON ss.staff_id = s.id
GROUP BY
    s.id,
    u.first_name,
    u.last_name,
    s.staff_type
ORDER BY total_assigned_services DESC, staff_name;


-- =========================================================
-- 10. CUSTOMER REGISTRATIONS BY MONTH
-- =========================================================

SELECT
    YEAR(c.created_at) AS registration_year,
    MONTH(c.created_at) AS registration_month,
    DATE_FORMAT(c.created_at, '%M') AS month_name,
    COUNT(*) AS new_customers
FROM accounts_customer AS c
GROUP BY
    YEAR(c.created_at),
    MONTH(c.created_at),
    DATE_FORMAT(c.created_at, '%M')
ORDER BY registration_year DESC, registration_month DESC;


-- =========================================================
-- 11. CUSTOMERS WITHOUT AN ACTIVE ACCOUNT
-- =========================================================

SELECT
    c.id AS customer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.email,
    c.phone,
    u.is_active
FROM accounts_customer AS c
INNER JOIN accounts_user AS u
    ON u.id = c.user_id
WHERE u.is_active = 0
ORDER BY customer_name;


-- =========================================================
-- 12. STAFF WHOSE USER ACCOUNT IS INACTIVE
-- =========================================================

SELECT
    s.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    s.staff_type,
    s.is_available,
    u.is_active AS account_is_active
FROM accounts_staff AS s
INNER JOIN accounts_user AS u
    ON u.id = s.user_id
WHERE u.is_active = 0
ORDER BY staff_name;


-- =========================================================
-- 13. STAFF MARKED UNAVAILABLE
-- =========================================================

SELECT
    s.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    s.staff_type,
    s.designation,
    s.department,
    s.is_available
FROM accounts_staff AS s
INNER JOIN accounts_user AS u
    ON u.id = s.user_id
WHERE s.is_available = 0
ORDER BY staff_name;


-- =========================================================
-- 14. CUSTOMERS WITH THE SAME NAME
-- Useful for identifying records that may need review.
-- This does not assume that same-name customers are duplicates.
-- =========================================================

SELECT
    u.first_name,
    u.last_name,
    COUNT(*) AS customer_count
FROM accounts_customer AS c
INNER JOIN accounts_user AS u
    ON u.id = c.user_id
GROUP BY u.first_name, u.last_name
HAVING COUNT(*) > 1
ORDER BY customer_count DESC, u.last_name, u.first_name;


-- =========================================================
-- 15. CUSTOMER PROFILE COMPLETENESS
-- Finds profiles with missing optional contact details.
-- =========================================================

SELECT
    c.id AS customer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.email,
    c.phone,
    c.address,
    c.date_of_birth
FROM accounts_customer AS c
INNER JOIN accounts_user AS u
    ON u.id = c.user_id
WHERE
    c.address IS NULL
    OR TRIM(c.address) = ''
    OR c.date_of_birth IS NULL
ORDER BY customer_name;


-- =========================================================
-- 16. STAFF PROFILE COMPLETENESS
-- Finds staff profiles without designation or department.
-- These fields are optional in the model.
-- =========================================================

SELECT
    s.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    s.staff_type,
    s.designation,
    s.department
FROM accounts_staff AS s
INNER JOIN accounts_user AS u
    ON u.id = s.user_id
WHERE
    s.designation IS NULL
    OR TRIM(s.designation) = ''
    OR s.department IS NULL
    OR TRIM(s.department) = ''
ORDER BY staff_name;


-- =========================================================
-- 17. USER COUNTS BY ACCOUNT CREATION DATE
-- =========================================================

SELECT
    DATE(created_at) AS account_creation_date,
    role,
    COUNT(*) AS total_accounts
FROM accounts_user
GROUP BY DATE(created_at), role
ORDER BY account_creation_date DESC, role;


-- =========================================================
-- 18. CUSTOMERS AND THEIR TOTAL APPOINTMENTS
-- =========================================================

SELECT
    c.id AS customer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.email,
    c.phone,
    COUNT(a.id) AS total_appointments
FROM accounts_customer AS c
INNER JOIN accounts_user AS u
    ON u.id = c.user_id
LEFT JOIN appointments_appointment AS a
    ON a.customer_id = c.id
GROUP BY
    c.id,
    u.first_name,
    u.last_name,
    u.email,
    c.phone
ORDER BY total_appointments DESC, customer_name;


-- =========================================================
-- 19. STAFF AND THEIR TOTAL APPOINTMENTS
-- =========================================================

SELECT
    s.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    s.staff_type,
    s.is_available,
    COUNT(a.id) AS total_appointments
FROM accounts_staff AS s
INNER JOIN accounts_user AS u
    ON u.id = s.user_id
LEFT JOIN appointments_appointment AS a
    ON a.staff_id = s.id
GROUP BY
    s.id,
    u.first_name,
    u.last_name,
    s.staff_type,
    s.is_available
ORDER BY total_appointments DESC, staff_name;


-- =========================================================
-- 20. VERIFY ACCOUNT TABLE COUNTS
-- =========================================================

SELECT
    (SELECT COUNT(*) FROM accounts_user) AS total_users,
    (SELECT COUNT(*) FROM accounts_customer) AS total_customers,
    (SELECT COUNT(*) FROM accounts_staff) AS total_staff;