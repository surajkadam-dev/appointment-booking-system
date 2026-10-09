-- SQL Queries
-- Appointment & Booking Management System
-- Database: MySQL
--
-- Note:
-- The application uses Django ORM for normal database access. These are
-- MySQL queries prepared for the assignment's SQL Queries requirement and
-- correspond to the reports/data operations implemented by the project.
--
-- Confirmed Django table names from the project:
-- accounts_user
-- accounts_customer
-- accounts_staff
-- services_service
-- appointments_appointment
-- availability_availability
--
-- Run against:
-- appointment_booking_db
--
-- Review the table/column names with SHOW COLUMNS before running on a
-- different database generated from a changed model/migration.

USE appointment_booking_db;


-- ============================================================
-- 1. CUSTOMER LIST
-- ============================================================
-- Useful for the Admin customer management/reporting screen.

SELECT
    c.id AS customer_id,
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    c.phone,
    c.address,
    c.date_of_birth
FROM accounts_customer c
INNER JOIN accounts_user u
    ON u.id = c.user_id
ORDER BY u.first_name, u.last_name;


-- ============================================================
-- 2. CUSTOMER APPOINTMENT HISTORY
-- ============================================================
-- Shows appointment history for every customer.

SELECT
    c.id AS customer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.email,
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    s.name AS service_name,
    a.status,
    a.reason,
    a.cancellation_reason
FROM appointments_appointment a
INNER JOIN accounts_customer c
    ON c.id = a.customer_id
INNER JOIN accounts_user u
    ON u.id = c.user_id
INNER JOIN services_service s
    ON s.id = a.service_id
ORDER BY a.appointment_date DESC, a.start_time DESC;


-- ============================================================
-- 3. APPOINTMENT HISTORY FOR ONE CUSTOMER
-- ============================================================
-- Replace 2 with the required customer ID.

SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    s.name AS service_name,
    s.duration,
    s.price,
    a.status,
    a.reason,
    a.cancellation_reason
FROM appointments_appointment a
INNER JOIN accounts_staff st
    ON st.id = a.staff_id
INNER JOIN accounts_user su
    ON su.id = st.user_id
INNER JOIN services_service s
    ON s.id = a.service_id
WHERE a.customer_id = 2
ORDER BY a.appointment_date DESC, a.start_time DESC;


-- ============================================================
-- 4. UPCOMING SCHEDULED APPOINTMENTS
-- ============================================================

SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    s.name AS service_name,
    a.status
FROM appointments_appointment a
INNER JOIN accounts_customer c
    ON c.id = a.customer_id
INNER JOIN accounts_user cu
    ON cu.id = c.user_id
INNER JOIN accounts_staff st
    ON st.id = a.staff_id
INNER JOIN accounts_user su
    ON su.id = st.user_id
INNER JOIN services_service s
    ON s.id = a.service_id
WHERE a.status = 'SCHEDULED'
  AND (
      a.appointment_date > CURDATE()
      OR (
          a.appointment_date = CURDATE()
          AND a.start_time >= CURTIME()
      )
  )
ORDER BY a.appointment_date, a.start_time;


-- ============================================================
-- 5. DAILY APPOINTMENT REPORT
-- ============================================================
-- Example period: October 2026.
-- DATE() is used explicitly so the grouped date is returned
-- instead of NULL.

SELECT
    a.appointment_date AS appointment_date,
    COUNT(*) AS total,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN a.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
    SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
    SUM(CASE WHEN a.status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled
FROM appointments_appointment a
WHERE a.appointment_date BETWEEN '2026-10-01' AND '2026-10-31'
GROUP BY a.appointment_date
ORDER BY a.appointment_date;


-- ============================================================
-- 6. MONTHLY APPOINTMENT REPORT
-- ============================================================

SELECT
    MONTH(a.appointment_date) AS month_number,
    MONTHNAME(a.appointment_date) AS month_name,
    COUNT(*) AS total,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN a.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
    SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
    SUM(CASE WHEN a.status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled
FROM appointments_appointment a
WHERE YEAR(a.appointment_date) = 2026
  AND MONTH(a.appointment_date) = 10
GROUP BY MONTH(a.appointment_date), MONTHNAME(a.appointment_date)
ORDER BY month_number;


-- ============================================================
-- 7. DATE-RANGE APPOINTMENT SUMMARY
-- ============================================================

SELECT
    COUNT(*) AS total_appointments,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN a.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
    SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
    SUM(CASE WHEN a.status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled,
    ROUND(
        100.0 * SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0),
        2
    ) AS completion_rate,
    ROUND(
        100.0 * SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0),
        2
    ) AS cancellation_rate
FROM appointments_appointment a
WHERE a.appointment_date BETWEEN '2026-10-01' AND '2026-10-31';


-- ============================================================
-- 8. DOCTOR-WISE APPOINTMENT REPORT
-- ============================================================

SELECT
    st.id AS doctor_id,
    CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
    COUNT(a.id) AS total_appointments,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN a.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
    SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
    SUM(CASE WHEN a.status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled,
    ROUND(
        100.0 * SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(a.id), 0),
        2
    ) AS completion_rate
FROM accounts_staff st
INNER JOIN accounts_user u
    ON u.id = st.user_id
LEFT JOIN appointments_appointment a
    ON a.staff_id = st.id
WHERE st.staff_type = 'DOCTOR'
GROUP BY st.id, u.first_name, u.last_name
ORDER BY total_appointments DESC;


-- ============================================================
-- 9. SERVICE-WISE APPOINTMENT REPORT
-- ============================================================
-- Revenue is calculated from completed appointments.

SELECT
    s.id AS service_id,
    s.name AS service_name,
    COUNT(a.id) AS appointments,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
    COALESCE(
        SUM(
            CASE
                WHEN a.status = 'COMPLETED' THEN s.price
                ELSE 0
            END
        ),
        0
    ) AS revenue
FROM services_service s
LEFT JOIN appointments_appointment a
    ON a.service_id = s.id
GROUP BY s.id, s.name
ORDER BY appointments DESC;


-- ============================================================
-- 10. CANCELLATION SUMMARY
-- ============================================================

SELECT
    COUNT(*) AS total_cancelled,
    ROUND(
        100.0 * COUNT(*)
        / NULLIF((SELECT COUNT(*) FROM appointments_appointment), 0),
        2
    ) AS cancellation_rate
FROM appointments_appointment
WHERE status = 'CANCELLED';


-- ============================================================
-- 11. CANCELLATIONS BY DATE
-- ============================================================

SELECT
    a.appointment_date,
    COUNT(*) AS cancelled
FROM appointments_appointment a
WHERE a.status = 'CANCELLED'
GROUP BY a.appointment_date
ORDER BY a.appointment_date DESC;


-- ============================================================
-- 12. CANCELLATIONS BY DOCTOR
-- ============================================================

SELECT
    st.id AS doctor_id,
    CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
    COUNT(a.id) AS cancelled
FROM appointments_appointment a
INNER JOIN accounts_staff st
    ON st.id = a.staff_id
INNER JOIN accounts_user u
    ON u.id = st.user_id
WHERE a.status = 'CANCELLED'
  AND st.staff_type = 'DOCTOR'
GROUP BY st.id, u.first_name, u.last_name
ORDER BY cancelled DESC;


-- ============================================================
-- 13. PEAK APPOINTMENT HOURS
-- ============================================================
-- Example date: 2026-10-12.

SELECT
    HOUR(a.start_time) AS appointment_hour,
    COUNT(*) AS appointments
FROM appointments_appointment a
WHERE a.appointment_date = '2026-10-12'
GROUP BY HOUR(a.start_time)
ORDER BY appointments DESC, appointment_hour;


-- ============================================================
-- 14. REVENUE REPORT
-- ============================================================
-- Revenue is based only on completed appointments.

SELECT
    COUNT(*) AS completed_appointments,
    COALESCE(SUM(s.price), 0) AS total_revenue,
    COALESCE(ROUND(AVG(s.price), 2), 0) AS average_revenue_per_appointment
FROM appointments_appointment a
INNER JOIN services_service s
    ON s.id = a.service_id
WHERE a.status = 'COMPLETED';


-- ============================================================
-- 15. REVENUE BY SERVICE
-- ============================================================

SELECT
    s.id AS service_id,
    s.name AS service_name,
    COUNT(a.id) AS appointments,
    COALESCE(SUM(s.price), 0) AS revenue
FROM appointments_appointment a
INNER JOIN services_service s
    ON s.id = a.service_id
WHERE a.status = 'COMPLETED'
GROUP BY s.id, s.name
ORDER BY revenue DESC;


-- ============================================================
-- 16. DOCTOR DAILY SCHEDULE
-- ============================================================
-- Replace 2 with the staff/doctor ID and the date as required.

SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    s.name AS service_name,
    a.status
FROM appointments_appointment a
INNER JOIN accounts_customer c
    ON c.id = a.customer_id
INNER JOIN accounts_user cu
    ON cu.id = c.user_id
INNER JOIN services_service s
    ON s.id = a.service_id
WHERE a.staff_id = 2
  AND a.appointment_date = '2026-10-12'
ORDER BY a.start_time;


-- ============================================================
-- 17. STAFF AVAILABILITY
-- ============================================================

SELECT
    av.id,
    av.staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    av.day_of_week,
    av.start_time,
    av.end_time,
    av.is_available
FROM availability_availability av
INNER JOIN accounts_staff st
    ON st.id = av.staff_id
INNER JOIN accounts_user u
    ON u.id = st.user_id
ORDER BY av.staff_id, av.day_of_week, av.start_time;


-- ============================================================
-- 18. ACTIVE SERVICES
-- ============================================================

SELECT
    id,
    name,
    description,
    duration,
    price,
    is_active
FROM services_service
WHERE is_active = 1
ORDER BY name;


-- ============================================================
-- 19. ACTIVE DOCTORS / STAFF
-- ============================================================

SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    st.staff_type,
    st.designation,
    st.department,
    st.phone,
    st.is_available
FROM accounts_staff st
INNER JOIN accounts_user u
    ON u.id = st.user_id
WHERE u.is_active = 1
  AND st.is_available = 1
ORDER BY st.staff_type, u.first_name, u.last_name;


-- ============================================================
-- 20. APPOINTMENT STATUS SUMMARY
-- ============================================================

SELECT
    status,
    COUNT(*) AS total
FROM appointments_appointment
GROUP BY status
ORDER BY total DESC;


-- ============================================================
-- 21. NEW CUSTOMERS IN A DATE RANGE
-- ============================================================
-- Used as the basis for the dashboard "new customers" KPI.

SELECT
    COUNT(*) AS new_customers
FROM accounts_customer c
WHERE c.created_at >= '2026-10-01 00:00:00'
  AND c.created_at <  '2026-11-01 00:00:00';


-- ============================================================
-- 22. ADMIN DASHBOARD KPI SUMMARY
-- ============================================================
-- This combines the main appointment KPIs into one result.

SELECT
    COUNT(*) AS total_appointments,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN a.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
    SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
    SUM(CASE WHEN a.status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled,
    ROUND(
        100.0 * SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0),
        2
    ) AS completion_rate,
    ROUND(
        100.0 * SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0),
        2
    ) AS cancellation_rate,
    COALESCE(
        SUM(
            CASE
                WHEN a.status = 'COMPLETED' THEN s.price
                ELSE 0
            END
        ),
        0
    ) AS total_revenue
FROM appointments_appointment a
INNER JOIN services_service s
    ON s.id = a.service_id;


-- ============================================================
-- 23. CHECK FOR POSSIBLE APPOINTMENT OVERLAPS
-- ============================================================
-- Useful for data-quality verification.
-- Only active booking states are considered.

SELECT
    a1.id AS appointment_1,
    a2.id AS appointment_2,
    a1.staff_id,
    a1.appointment_date,
    a1.start_time AS start_1,
    a1.end_time AS end_1,
    a2.start_time AS start_2,
    a2.end_time AS end_2
FROM appointments_appointment a1
INNER JOIN appointments_appointment a2
    ON a1.staff_id = a2.staff_id
   AND a1.appointment_date = a2.appointment_date
   AND a1.id < a2.id
   AND a1.status IN ('SCHEDULED', 'RESCHEDULED')
   AND a2.status IN ('SCHEDULED', 'RESCHEDULED')
   AND a1.start_time < a2.end_time
   AND a2.start_time < a1.end_time
ORDER BY a1.appointment_date, a1.staff_id, a1.start_time;


-- ============================================================
-- 24. APPOINTMENTS OUTSIDE RECURRENT WORKING HOURS
-- ============================================================
-- Data-quality query. It checks appointments against the matching
-- weekly availability record.

SELECT
    a.id AS appointment_id,
    a.staff_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    av.start_time AS availability_start,
    av.end_time AS availability_end
FROM appointments_appointment a
LEFT JOIN availability_availability av
    ON av.staff_id = a.staff_id
   AND av.day_of_week = WEEKDAY(a.appointment_date)
   AND av.is_available = 1
WHERE av.id IS NULL
   OR a.start_time < av.start_time
   OR a.end_time > av.end_time
ORDER BY a.appointment_date, a.start_time;


-- ============================================================
-- 25. SERVICE USAGE SUMMARY
-- ============================================================

SELECT
    s.id AS service_id,
    s.name AS service_name,
    s.duration,
    s.price,
    COUNT(a.id) AS total_appointments
FROM services_service s
LEFT JOIN appointments_appointment a
    ON a.service_id = s.id
GROUP BY s.id, s.name, s.duration, s.price
ORDER BY total_appointments DESC;


-- ============================================================
-- 26. STAFF SERVICE ASSIGNMENTS
-- ============================================================
-- Django creates a many-to-many intermediary table for
-- Staff.services. The exact intermediary table should be checked
-- with SHOW TABLES if the migration/model db_table was customized.
--
-- Default Django naming for the current model relationship is:
-- accounts_staff_services
--
-- This query is therefore provided for the current default naming.

SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    s.id AS service_id,
    s.name AS service_name
FROM accounts_staff_services ss
INNER JOIN accounts_staff st
    ON st.id = ss.staff_id
INNER JOIN accounts_user u
    ON u.id = st.user_id
INNER JOIN services_service s
    ON s.id = ss.service_id
ORDER BY st.id, s.name;


-- ============================================================
-- 27. TABLE / SCHEMA VERIFICATION
-- ============================================================
-- Useful before executing the reporting queries on another
-- MySQL installation.

SHOW TABLES;


-- ============================================================
-- 28. VERIFY APPOINTMENT TABLE
-- ============================================================

SHOW COLUMNS FROM appointments_appointment;


-- ============================================================
-- 29. VERIFY CUSTOMER TABLE
-- ============================================================

SHOW COLUMNS FROM accounts_customer;


-- ============================================================
-- 30. VERIFY STAFF TABLE
-- ============================================================

SHOW COLUMNS FROM accounts_staff;


-- ============================================================
-- 31. VERIFY SERVICE TABLE
-- ============================================================

SHOW COLUMNS FROM services_service;


-- ============================================================
-- 32. VERIFY AVAILABILITY TABLE
-- ============================================================

SHOW COLUMNS FROM availability_availability;


-- ============================================================
-- END
-- ============================================================
