USE appointment_booking_db;

-- Set report values before running the queries.
SET @start_date = '2026-10-01';
SET @end_date = '2026-10-31';
SET @customer_id = 2;
SET @staff_id = 2;
SET @report_date = '2026-10-12';

-- 1. Customer list
SELECT c.id AS customer_id, u.id AS user_id, u.first_name, u.last_name,
       u.email, c.phone, c.address, c.date_of_birth
FROM accounts_customer AS c
JOIN accounts_user AS u ON u.id = c.user_id
ORDER BY u.first_name, u.last_name;

-- 2. Appointment history for all customers
SELECT a.id AS appointment_id, c.id AS customer_id,
       CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name, cu.email,
       a.appointment_date, a.start_time, a.end_time, s.name AS service_name,
       CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
       a.status, a.reason, a.cancellation_reason
FROM appointments_appointment AS a
JOIN accounts_customer AS c ON c.id = a.customer_id
JOIN accounts_user AS cu ON cu.id = c.user_id
JOIN accounts_staff AS st ON st.id = a.staff_id
JOIN accounts_user AS su ON su.id = st.user_id
JOIN services_service AS s ON s.id = a.service_id
ORDER BY a.appointment_date DESC, a.start_time DESC;

-- 3. Appointment history for one customer
SELECT a.id AS appointment_id, a.appointment_date, a.start_time, a.end_time,
       CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
       s.name AS service_name, s.duration, s.price, a.status,
       a.reason, a.cancellation_reason
FROM appointments_appointment AS a
JOIN accounts_staff AS st ON st.id = a.staff_id
JOIN accounts_user AS su ON su.id = st.user_id
JOIN services_service AS s ON s.id = a.service_id
WHERE a.customer_id = @customer_id
ORDER BY a.appointment_date DESC, a.start_time DESC;

-- 4. Upcoming scheduled appointments
SELECT a.id AS appointment_id, a.appointment_date, a.start_time, a.end_time,
       CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
       CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
       s.name AS service_name, a.status
FROM appointments_appointment AS a
JOIN accounts_customer AS c ON c.id = a.customer_id
JOIN accounts_user AS cu ON cu.id = c.user_id
JOIN accounts_staff AS st ON st.id = a.staff_id
JOIN accounts_user AS su ON su.id = st.user_id
JOIN services_service AS s ON s.id = a.service_id
WHERE a.status = 'SCHEDULED'
  AND (a.appointment_date > CURDATE()
       OR (a.appointment_date = CURDATE() AND a.start_time >= CURTIME()))
ORDER BY a.appointment_date, a.start_time;

-- 5. Daily appointment report
SELECT a.appointment_date, COUNT(*) AS total_appointments,
       SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN a.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
       SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN a.status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled
FROM appointments_appointment AS a
WHERE a.appointment_date BETWEEN @start_date AND @end_date
GROUP BY a.appointment_date
ORDER BY a.appointment_date;

-- 6. Monthly appointment report
SELECT YEAR(a.appointment_date) AS report_year,
       MONTH(a.appointment_date) AS month_number,
       MONTHNAME(a.appointment_date) AS month_name,
       COUNT(*) AS total_appointments,
       SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN a.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
       SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN a.status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled
FROM appointments_appointment AS a
WHERE a.appointment_date BETWEEN @start_date AND @end_date
GROUP BY YEAR(a.appointment_date), MONTH(a.appointment_date), MONTHNAME(a.appointment_date)
ORDER BY report_year, month_number;

-- 7. Appointment summary and rates for a date range
SELECT COUNT(*) AS total_appointments,
       SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled,
       COALESCE(ROUND(100.0 * SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)
       / NULLIF(COUNT(*), 0), 2), 0) AS completion_rate,
       COALESCE(ROUND(100.0 * SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)
       / NULLIF(COUNT(*), 0), 2), 0) AS cancellation_rate
FROM appointments_appointment
WHERE appointment_date BETWEEN @start_date AND @end_date;

-- 8. Doctor-wise appointment report
SELECT st.id AS doctor_id, CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
       COUNT(a.id) AS total_appointments,
       SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN a.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
       SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN a.status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled,
       COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END)
       / NULLIF(COUNT(a.id), 0), 2), 0) AS completion_rate
FROM accounts_staff AS st
JOIN accounts_user AS u ON u.id = st.user_id
LEFT JOIN appointments_appointment AS a
  ON a.staff_id = st.id AND a.appointment_date BETWEEN @start_date AND @end_date
WHERE st.staff_type = 'DOCTOR'
GROUP BY st.id, u.first_name, u.last_name
ORDER BY total_appointments DESC, doctor_name;

-- 9. Service-wise appointment report
SELECT s.id AS service_id, s.name AS service_name, COUNT(a.id) AS total_appointments,
       SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN s.price ELSE 0 END), 0) AS revenue
FROM services_service AS s
LEFT JOIN appointments_appointment AS a
  ON a.service_id = s.id AND a.appointment_date BETWEEN @start_date AND @end_date
GROUP BY s.id, s.name
ORDER BY total_appointments DESC, s.name;

-- 10. Cancellation totals and rate
SELECT SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS total_cancelled,
       COUNT(*) AS total_appointments,
       COALESCE(ROUND(100.0 * SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)
       / NULLIF(COUNT(*), 0), 2), 0) AS cancellation_rate
FROM appointments_appointment
WHERE appointment_date BETWEEN @start_date AND @end_date;

-- 11. Cancelled appointments by appointment date
-- The model does not store a separate cancellation timestamp.
SELECT appointment_date, COUNT(*) AS cancelled_appointments
FROM appointments_appointment
WHERE status = 'CANCELLED'
  AND appointment_date BETWEEN @start_date AND @end_date
GROUP BY appointment_date
ORDER BY appointment_date;

-- 12. Cancelled appointments by doctor
SELECT st.id AS doctor_id, CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
       COUNT(a.id) AS cancelled_appointments
FROM appointments_appointment AS a
JOIN accounts_staff AS st ON st.id = a.staff_id
JOIN accounts_user AS u ON u.id = st.user_id
WHERE a.status = 'CANCELLED' AND st.staff_type = 'DOCTOR'
  AND a.appointment_date BETWEEN @start_date AND @end_date
GROUP BY st.id, u.first_name, u.last_name
ORDER BY cancelled_appointments DESC;

-- 13. Busiest appointment hours on a date
SELECT HOUR(start_time) AS appointment_hour, COUNT(*) AS total_appointments
FROM appointments_appointment
WHERE appointment_date = @report_date
  AND status IN ('SCHEDULED', 'RESCHEDULED', 'COMPLETED')
GROUP BY HOUR(start_time)
ORDER BY total_appointments DESC, appointment_hour;

-- 14. Revenue from completed appointments
SELECT COUNT(*) AS completed_appointments,
       COALESCE(SUM(s.price), 0) AS total_revenue,
       COALESCE(ROUND(AVG(s.price), 2), 0) AS average_revenue_per_appointment
FROM appointments_appointment AS a
JOIN services_service AS s ON s.id = a.service_id
WHERE a.status = 'COMPLETED'
  AND a.appointment_date BETWEEN @start_date AND @end_date;

-- 15. Revenue by service
SELECT s.id AS service_id, s.name AS service_name,
       COUNT(a.id) AS completed_appointments,
       COALESCE(SUM(s.price), 0) AS revenue
FROM services_service AS s
LEFT JOIN appointments_appointment AS a
  ON a.service_id = s.id AND a.status = 'COMPLETED'
  AND a.appointment_date BETWEEN @start_date AND @end_date
GROUP BY s.id, s.name
ORDER BY revenue DESC, s.name;

-- 16. Daily schedule for one staff member
SELECT a.id AS appointment_id, a.appointment_date, a.start_time, a.end_time,
       CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
       s.name AS service_name, a.status
FROM appointments_appointment AS a
JOIN accounts_customer AS c ON c.id = a.customer_id
JOIN accounts_user AS cu ON cu.id = c.user_id
JOIN services_service AS s ON s.id = a.service_id
WHERE a.staff_id = @staff_id AND a.appointment_date = @report_date
ORDER BY a.start_time;

-- 17. Recurring staff availability
SELECT av.id AS availability_id, av.staff_id,
       CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
       st.staff_type, av.day_of_week, av.start_time, av.end_time, av.is_available
FROM availability_availability AS av
JOIN accounts_staff AS st ON st.id = av.staff_id
JOIN accounts_user AS u ON u.id = st.user_id
ORDER BY av.staff_id, av.day_of_week, av.start_time;

-- 18. Active services
SELECT id, name, description, duration, price, is_active
FROM services_service
WHERE is_active = 1
ORDER BY name;

-- 19. Active staff members
SELECT st.id AS staff_id, CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
       u.email, st.staff_type, st.designation, st.department, st.phone,
       st.is_available, st.is_active
FROM accounts_staff AS st
JOIN accounts_user AS u ON u.id = st.user_id
WHERE u.is_active = 1 AND st.is_active = 1
ORDER BY st.staff_type, u.first_name, u.last_name;

-- 20. Appointment counts by status
SELECT status, COUNT(*) AS total_appointments
FROM appointments_appointment
GROUP BY status
ORDER BY total_appointments DESC;

-- 21. New customers in the selected date range
SELECT COUNT(*) AS new_customers
FROM accounts_customer AS c
WHERE c.created_at >= @start_date
  AND c.created_at < DATE_ADD(@end_date, INTERVAL 1 DAY);

-- 22. Dashboard appointment counts and revenue for a date range
SELECT COUNT(a.id) AS total_appointments,
       SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN a.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
       SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN a.status = 'RESCHEDULED' THEN 1 ELSE 0 END) AS rescheduled,
       COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END)
       / NULLIF(COUNT(a.id), 0), 2), 0) AS completion_rate,
       COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END)
       / NULLIF(COUNT(a.id), 0), 2), 0) AS cancellation_rate,
       COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN s.price ELSE 0 END), 0) AS total_revenue
FROM appointments_appointment AS a
LEFT JOIN services_service AS s ON s.id = a.service_id
WHERE a.appointment_date BETWEEN @start_date AND @end_date;

-- 23. Find overlapping appointments for the same staff member
SELECT a1.id AS appointment_1, a2.id AS appointment_2, a1.staff_id,
       a1.appointment_date, a1.start_time AS start_1, a1.end_time AS end_1,
       a2.start_time AS start_2, a2.end_time AS end_2
FROM appointments_appointment AS a1
JOIN appointments_appointment AS a2
  ON a1.staff_id = a2.staff_id
 AND a1.appointment_date = a2.appointment_date
 AND a1.id < a2.id
 AND a1.start_time < a2.end_time
 AND a2.start_time < a1.end_time
WHERE a1.status IN ('SCHEDULED', 'RESCHEDULED')
  AND a2.status IN ('SCHEDULED', 'RESCHEDULED')
ORDER BY a1.appointment_date, a1.staff_id, a1.start_time;

-- 24. Find active appointments outside recurring staff availability
SELECT a.id AS appointment_id, a.staff_id, a.appointment_date, a.start_time, a.end_time
FROM appointments_appointment AS a
WHERE a.status IN ('SCHEDULED', 'RESCHEDULED')
  AND NOT EXISTS (
      SELECT 1
      FROM availability_availability AS av
      WHERE av.staff_id = a.staff_id
        AND av.day_of_week = WEEKDAY(a.appointment_date)
        AND av.is_available = 1
        AND a.start_time >= av.start_time
        AND a.end_time <= av.end_time
  )
ORDER BY a.appointment_date, a.start_time;

-- 25. Service usage including services with no appointments
SELECT s.id AS service_id, s.name AS service_name, s.duration, s.price,
       COUNT(a.id) AS total_appointments
FROM services_service AS s
LEFT JOIN appointments_appointment AS a ON a.service_id = s.id
GROUP BY s.id, s.name, s.duration, s.price
ORDER BY total_appointments DESC, s.name;

-- 26. Services assigned to staff members
-- This uses Django's default many-to-many table name for Staff.services.
SELECT st.id AS staff_id, CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
       s.id AS service_id, s.name AS service_name
FROM accounts_staff_services AS ss
JOIN accounts_staff AS st ON st.id = ss.staff_id
JOIN accounts_user AS u ON u.id = st.user_id
JOIN services_service AS s ON s.id = ss.service_id
ORDER BY st.id, s.name;

-- 27. Staff members without assigned services
SELECT st.id AS staff_id, CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
       st.staff_type
FROM accounts_staff AS st
JOIN accounts_user AS u ON u.id = st.user_id
LEFT JOIN accounts_staff_services AS ss ON ss.staff_id = st.id
WHERE ss.staff_id IS NULL
ORDER BY staff_name;

-- 28. List database tables
SHOW TABLES;

-- 29. Check appointment table columns
SHOW COLUMNS FROM appointments_appointment;

-- 30. Check customer table columns
SHOW COLUMNS FROM accounts_customer;

-- 31. Check staff table columns
SHOW COLUMNS FROM accounts_staff;

-- 32. Check service table columns
SHOW COLUMNS FROM services_service;

-- 33. Check availability table columns
SHOW COLUMNS FROM availability_availability;
