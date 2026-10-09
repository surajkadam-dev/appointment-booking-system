-- Admin reporting queries for MySQL.
-- Adjust table names only if your Django app labels differ.

-- 1. Date-wise appointment report
SELECT
    appointment_date,
    COUNT(*) AS total_appointments,
    SUM(status = 'COMPLETED') AS completed,
    SUM(status = 'SCHEDULED') AS scheduled,
    SUM(status = 'CANCELLED') AS cancelled,
    SUM(status = 'RESCHEDULED') AS rescheduled
FROM appointments_appointment
WHERE appointment_date BETWEEN '2026-10-01' AND '2026-10-31'
GROUP BY appointment_date
ORDER BY appointment_date;

-- 2. Month-wise appointment report
SELECT
    YEAR(appointment_date) AS year,
    MONTH(appointment_date) AS month,
    COUNT(*) AS total_appointments,
    SUM(status = 'COMPLETED') AS completed,
    SUM(status = 'SCHEDULED') AS scheduled,
    SUM(status = 'CANCELLED') AS cancelled,
    SUM(status = 'RESCHEDULED') AS rescheduled
FROM appointments_appointment
WHERE YEAR(appointment_date) = 2026
GROUP BY YEAR(appointment_date), MONTH(appointment_date)
ORDER BY month;

-- 3. Doctor workload
SELECT
    s.id AS doctor_id,
    CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
    COUNT(a.id) AS total_appointments,
    SUM(a.status = 'COMPLETED') AS completed,
    SUM(a.status = 'CANCELLED') AS cancelled,
    SUM(a.status = 'SCHEDULED') AS scheduled,
    SUM(a.status = 'RESCHEDULED') AS rescheduled
FROM appointments_appointment a
JOIN accounts_staff s ON s.id = a.staff_id
JOIN accounts_user u ON u.id = s.user_id
WHERE s.staff_type = 'DOCTOR'
GROUP BY s.id, u.first_name, u.last_name
ORDER BY total_appointments DESC;

-- 4. Service utilization and revenue
SELECT
    sv.id AS service_id,
    sv.name AS service_name,
    COUNT(a.id) AS total_appointments,
    SUM(a.status = 'COMPLETED') AS completed,
    SUM(a.status = 'CANCELLED') AS cancelled,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN sv.price ELSE 0 END) AS revenue
FROM appointments_appointment a
JOIN services_service sv ON sv.id = a.service_id
GROUP BY sv.id, sv.name
ORDER BY total_appointments DESC;

-- 5. Cancellation analysis by date
SELECT
    appointment_date,
    COUNT(*) AS cancelled_appointments
FROM appointments_appointment
WHERE status = 'CANCELLED'
GROUP BY appointment_date
ORDER BY appointment_date;

-- 6. Peak appointment hours
SELECT
    HOUR(start_time) AS appointment_hour,
    COUNT(*) AS appointment_count
FROM appointments_appointment
GROUP BY HOUR(start_time)
ORDER BY appointment_count DESC;

-- 7. Completed appointment revenue
SELECT
    COUNT(a.id) AS completed_appointments,
    COALESCE(SUM(s.price), 0) AS total_revenue,
    COALESCE(AVG(s.price), 0) AS average_revenue_per_appointment
FROM appointments_appointment a
JOIN services_service s ON s.id = a.service_id
WHERE a.status = 'COMPLETED';

-- 8. Customer appointment activity
SELECT
    c.id AS customer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.email,
    COUNT(a.id) AS total_appointments,
    SUM(a.status = 'COMPLETED') AS completed,
    SUM(a.status = 'CANCELLED') AS cancelled
FROM accounts_customer c
JOIN accounts_user u ON u.id = c.user_id
LEFT JOIN appointments_appointment a ON a.customer_id = c.id
GROUP BY c.id, u.first_name, u.last_name, u.email
ORDER BY total_appointments DESC;
