
USE appointment_booking_db;


-- 1. Display all appointments with customer, staff and service details
SELECT
    a.id AS appointment_id,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    cu.email AS customer_email,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    st.staff_type,
    sv.name AS service_name,
    sv.duration AS service_duration,
    sv.price AS listed_service_price,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.reason,
    a.cancellation_reason,
    a.created_at,
    a.updated_at
FROM appointments_appointment a
INNER JOIN accounts_customer c
    ON c.id = a.customer_id
INNER JOIN accounts_user cu
    ON cu.id = c.user_id
INNER JOIN accounts_staff st
    ON st.id = a.staff_id
INNER JOIN accounts_user su
    ON su.id = st.user_id
INNER JOIN services_service sv
    ON sv.id = a.service_id
ORDER BY a.appointment_date, a.start_time;


-- 2. Display upcoming scheduled appointments
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    sv.name AS service_name,
    a.status
FROM appointments_appointment a
INNER JOIN accounts_customer c ON c.id = a.customer_id
INNER JOIN accounts_user cu ON cu.id = c.user_id
INNER JOIN accounts_staff st ON st.id = a.staff_id
INNER JOIN accounts_user su ON su.id = st.user_id
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.status IN ('SCHEDULED', 'RESCHEDULED')
  AND (
      a.appointment_date > CURDATE()
      OR (
          a.appointment_date = CURDATE()
          AND a.start_time >= CURTIME()
      )
  )
ORDER BY a.appointment_date, a.start_time;


-- 3. Display today's appointments
SELECT
    a.id AS appointment_id,
    a.start_time,
    a.end_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    sv.name AS service_name,
    a.status
FROM appointments_appointment a
INNER JOIN accounts_customer c ON c.id = a.customer_id
INNER JOIN accounts_user cu ON cu.id = c.user_id
INNER JOIN accounts_staff st ON st.id = a.staff_id
INNER JOIN accounts_user su ON su.id = st.user_id
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.appointment_date = CURDATE()
ORDER BY a.start_time;


-- 4. Count appointments by status
SELECT
    status,
    COUNT(*) AS appointment_count
FROM appointments_appointment
GROUP BY status
ORDER BY appointment_count DESC;


-- 5. Count all appointments
SELECT
    COUNT(*) AS total_appointments
FROM appointments_appointment;


-- 6. Count appointments for today
SELECT
    COUNT(*) AS appointments_today
FROM appointments_appointment
WHERE appointment_date = CURDATE();


-- 7. Count appointments for the current month
SELECT
    COUNT(*) AS appointments_this_month
FROM appointments_appointment
WHERE appointment_date >=
      DATE_FORMAT(CURDATE(), '%Y-%m-01')
  AND appointment_date <
      DATE_ADD(
          DATE_FORMAT(CURDATE(), '%Y-%m-01'),
          INTERVAL 1 MONTH
      );


-- 8. Display appointments for a specific date
-- Change the date as required.
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    sv.name AS service_name,
    a.status
FROM appointments_appointment a
INNER JOIN accounts_customer c ON c.id = a.customer_id
INNER JOIN accounts_user cu ON cu.id = c.user_id
INNER JOIN accounts_staff st ON st.id = a.staff_id
INNER JOIN accounts_user su ON su.id = st.user_id
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.appointment_date = '2026-10-09'
ORDER BY a.start_time;


-- 9. Display appointments within a date range
-- Change the start and end dates as required.
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    sv.name AS service_name,
    a.status
FROM appointments_appointment a
INNER JOIN accounts_customer c ON c.id = a.customer_id
INNER JOIN accounts_user cu ON cu.id = c.user_id
INNER JOIN accounts_staff st ON st.id = a.staff_id
INNER JOIN accounts_user su ON su.id = st.user_id
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.appointment_date BETWEEN '2026-10-01' AND '2026-10-31'
ORDER BY a.appointment_date, a.start_time;


-- 10. Display appointments for a specific customer
-- Replace 1 with the actual Customer primary key.
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    sv.name AS service_name,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    a.status
FROM appointments_appointment a
INNER JOIN services_service sv ON sv.id = a.service_id
INNER JOIN accounts_staff st ON st.id = a.staff_id
INNER JOIN accounts_user su ON su.id = st.user_id
WHERE a.customer_id = 1
ORDER BY a.appointment_date DESC, a.start_time DESC;


-- 11. Display appointments assigned to a specific staff member
-- Replace 1 with the actual Staff primary key.
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    sv.name AS service_name,
    a.status
FROM appointments_appointment a
INNER JOIN accounts_customer c ON c.id = a.customer_id
INNER JOIN accounts_user cu ON cu.id = c.user_id
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.staff_id = 1
ORDER BY a.appointment_date, a.start_time;


-- 12. Display cancelled appointments and their reasons
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    sv.name AS service_name,
    a.cancellation_reason,
    a.updated_at AS last_updated
FROM appointments_appointment a
INNER JOIN accounts_customer c ON c.id = a.customer_id
INNER JOIN accounts_user cu ON cu.id = c.user_id
INNER JOIN accounts_staff st ON st.id = a.staff_id
INNER JOIN accounts_user su ON su.id = st.user_id
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.status = 'CANCELLED'
ORDER BY a.updated_at DESC;


-- 13. Display completed appointments
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    sv.name AS service_name,
    sv.price AS listed_service_price
FROM appointments_appointment a
INNER JOIN accounts_customer c ON c.id = a.customer_id
INNER JOIN accounts_user cu ON cu.id = c.user_id
INNER JOIN accounts_staff st ON st.id = a.staff_id
INNER JOIN accounts_user su ON su.id = st.user_id
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.status = 'COMPLETED'
ORDER BY a.appointment_date DESC, a.start_time DESC;


-- 14. Display appointments that have been marked rescheduled
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
    sv.name AS service_name,
    a.status,
    a.updated_at
FROM appointments_appointment a
INNER JOIN accounts_customer c ON c.id = a.customer_id
INNER JOIN accounts_user cu ON cu.id = c.user_id
INNER JOIN accounts_staff st ON st.id = a.staff_id
INNER JOIN accounts_user su ON su.id = st.user_id
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.status = 'RESCHEDULED'
ORDER BY a.appointment_date, a.start_time;


-- 15. Count appointments per day
SELECT
    appointment_date,
    COUNT(*) AS total_appointments,
    SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END)
        AS scheduled_count,
    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)
        AS completed_count,
    SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)
        AS cancelled_count,
    SUM(CASE WHEN status = 'RESCHEDULED' THEN 1 ELSE 0 END)
        AS rescheduled_count
FROM appointments_appointment
GROUP BY appointment_date
ORDER BY appointment_date DESC;


-- 16. Monthly appointment report
SELECT
    YEAR(appointment_date) AS report_year,
    MONTH(appointment_date) AS report_month,
    COUNT(*) AS total_appointments,
    SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END)
        AS scheduled_count,
    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)
        AS completed_count,
    SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)
        AS cancelled_count,
    SUM(CASE WHEN status = 'RESCHEDULED' THEN 1 ELSE 0 END)
        AS rescheduled_count
FROM appointments_appointment
GROUP BY YEAR(appointment_date), MONTH(appointment_date)
ORDER BY report_year DESC, report_month DESC;


-- 17. Find the most frequently booked services
SELECT
    sv.id AS service_id,
    sv.name AS service_name,
    COUNT(a.id) AS total_bookings,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END)
        AS completed_appointments,
    SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END)
        AS cancelled_appointments
FROM services_service sv
LEFT JOIN appointments_appointment a
    ON a.service_id = sv.id
GROUP BY sv.id, sv.name
ORDER BY total_bookings DESC, sv.name;


-- 18. Count appointments by staff member
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    COUNT(a.id) AS total_appointments,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END)
        AS completed_appointments,
    SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END)
        AS cancelled_appointments
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
LEFT JOIN appointments_appointment a
    ON a.staff_id = st.id
GROUP BY st.id, u.first_name, u.last_name, st.staff_type
ORDER BY total_appointments DESC, staff_name;


-- 19. Count appointments by customer
SELECT
    c.id AS customer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.email,
    COUNT(a.id) AS total_appointments,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END)
        AS completed_appointments,
    SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END)
        AS cancelled_appointments
FROM accounts_customer c
INNER JOIN accounts_user u ON u.id = c.user_id
LEFT JOIN appointments_appointment a
    ON a.customer_id = c.id
GROUP BY c.id, u.first_name, u.last_name, u.email
ORDER BY total_appointments DESC, customer_name;


-- 20. Find customers who have never booked an appointment
SELECT
    c.id AS customer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.email,
    c.phone
FROM accounts_customer c
INNER JOIN accounts_user u ON u.id = c.user_id
LEFT JOIN appointments_appointment a
    ON a.customer_id = c.id
WHERE a.id IS NULL
ORDER BY customer_name;


-- =========================================================
-- SECTION B: AVAILABILITY / STAFF WORKING HOURS
-- =========================================================

-- 21. Display all staff availability schedules
SELECT
    av.id AS availability_id,
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    av.day_of_week,
    CASE av.day_of_week
        WHEN 0 THEN 'Monday'
        WHEN 1 THEN 'Tuesday'
        WHEN 2 THEN 'Wednesday'
        WHEN 3 THEN 'Thursday'
        WHEN 4 THEN 'Friday'
        WHEN 5 THEN 'Saturday'
        WHEN 6 THEN 'Sunday'
        ELSE 'Unknown'
    END AS day_name,
    av.start_time,
    av.end_time,
    av.is_available
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
ORDER BY av.day_of_week, av.start_time, staff_name;


-- 22. Display only available working schedules
SELECT
    av.id AS availability_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    av.day_of_week,
    CASE av.day_of_week
        WHEN 0 THEN 'Monday'
        WHEN 1 THEN 'Tuesday'
        WHEN 2 THEN 'Wednesday'
        WHEN 3 THEN 'Thursday'
        WHEN 4 THEN 'Friday'
        WHEN 5 THEN 'Saturday'
        WHEN 6 THEN 'Sunday'
    END AS day_name,
    av.start_time,
    av.end_time
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.is_available = TRUE
  AND st.is_available = TRUE
  AND u.is_active = TRUE
ORDER BY av.day_of_week, av.start_time;


-- 23. Display unavailable schedules
SELECT
    av.id AS availability_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    av.day_of_week,
    av.start_time,
    av.end_time,
    av.is_available
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.is_available = FALSE
ORDER BY av.day_of_week, av.start_time;


-- 24. Count availability slots by weekday
SELECT
    day_of_week,
    CASE day_of_week
        WHEN 0 THEN 'Monday'
        WHEN 1 THEN 'Tuesday'
        WHEN 2 THEN 'Wednesday'
        WHEN 3 THEN 'Thursday'
        WHEN 4 THEN 'Friday'
        WHEN 5 THEN 'Saturday'
        WHEN 6 THEN 'Sunday'
    END AS day_name,
    COUNT(*) AS total_schedule_slots,
    SUM(CASE WHEN is_available = TRUE THEN 1 ELSE 0 END)
        AS available_slots,
    SUM(CASE WHEN is_available = FALSE THEN 1 ELSE 0 END)
        AS unavailable_slots
FROM appointments_availability
GROUP BY day_of_week
ORDER BY day_of_week;


-- 25. Display weekly schedules for a specific staff member
-- Replace 1 with the actual Staff primary key.
SELECT
    av.day_of_week,
    CASE av.day_of_week
        WHEN 0 THEN 'Monday'
        WHEN 1 THEN 'Tuesday'
        WHEN 2 THEN 'Wednesday'
        WHEN 3 THEN 'Thursday'
        WHEN 4 THEN 'Friday'
        WHEN 5 THEN 'Saturday'
        WHEN 6 THEN 'Sunday'
    END AS day_name,
    av.start_time,
    av.end_time,
    av.is_available
FROM appointments_availability av
WHERE av.staff_id = 1
ORDER BY av.day_of_week, av.start_time;


-- 26. Find staff members with no availability schedule
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    st.is_available
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
LEFT JOIN appointments_availability av
    ON av.staff_id = st.id
WHERE av.id IS NULL
ORDER BY staff_name;


-- 27. Find duplicate availability slots
-- The model constraint should prevent duplicates when migrations
-- have successfully created the unique constraint.
SELECT
    staff_id,
    day_of_week,
    start_time,
    end_time,
    COUNT(*) AS duplicate_count
FROM appointments_availability
GROUP BY staff_id, day_of_week, start_time, end_time
HAVING COUNT(*) > 1;


-- 28. Find invalid availability time ranges
-- The serializer checks that end_time is later than start_time.
SELECT
    id,
    staff_id,
    day_of_week,
    start_time,
    end_time
FROM appointments_availability
WHERE end_time <= start_time;




-- 29. Find overlapping scheduled or rescheduled appointments
-- Checks appointments assigned to the same staff member on the
-- same date. Adjacent slots are not considered overlapping.
SELECT
    a1.id AS appointment_id_1,
    a2.id AS appointment_id_2,
    a1.staff_id,
    a1.appointment_date,
    a1.start_time AS start_time_1,
    a1.end_time AS end_time_1,
    a2.start_time AS start_time_2,
    a2.end_time AS end_time_2
FROM appointments_appointment a1
INNER JOIN appointments_appointment a2
    ON a1.staff_id = a2.staff_id
   AND a1.appointment_date = a2.appointment_date
   AND a1.id < a2.id
   AND a1.start_time < a2.end_time
   AND a1.end_time > a2.start_time
WHERE a1.status IN ('SCHEDULED', 'RESCHEDULED')
  AND a2.status IN ('SCHEDULED', 'RESCHEDULED')
ORDER BY a1.appointment_date, a1.start_time;


-- 30. Find appointments outside the recorded availability schedule
-- Checks whether each appointment fits completely inside at least
-- one available schedule for that staff member on that weekday.
SELECT
    a.id AS appointment_id,
    a.staff_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status
FROM appointments_appointment a
WHERE a.status IN ('SCHEDULED', 'RESCHEDULED')
  AND NOT EXISTS (
      SELECT 1
      FROM appointments_availability av
      WHERE av.staff_id = a.staff_id
        AND av.day_of_week = WEEKDAY(a.appointment_date)
        AND av.is_available = TRUE
        AND a.start_time >= av.start_time
        AND a.end_time <= av.end_time
  )
ORDER BY a.appointment_date, a.start_time;


-- 31. Find appointments assigned to currently unavailable staff
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.is_available AS staff_available,
    a.status
FROM appointments_appointment a
INNER JOIN accounts_staff st ON st.id = a.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE a.status IN ('SCHEDULED', 'RESCHEDULED')
  AND (
      st.is_available = FALSE
      OR u.is_active = FALSE
  )
ORDER BY a.appointment_date, a.start_time;


-- 32. Find appointments using inactive services
SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    sv.name AS service_name,
    sv.is_active AS service_active,
    a.status
FROM appointments_appointment a
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE sv.is_active = FALSE
  AND a.status IN ('SCHEDULED', 'RESCHEDULED')
ORDER BY a.appointment_date, a.start_time;


-- 33. Find appointments with invalid time ranges
SELECT
    id AS appointment_id,
    appointment_date,
    start_time,
    end_time,
    status
FROM appointments_appointment
WHERE end_time <= start_time;


-- 34. Find appointments booked for dates in the past

SELECT
    id AS appointment_id,
    appointment_date,
    start_time,
    end_time,
    status
FROM appointments_appointment
WHERE appointment_date < CURDATE()
ORDER BY appointment_date DESC, start_time DESC;


-- 35. Find appointments with missing cancellation reasons
SELECT
    id AS appointment_id,
    appointment_date,
    start_time,
    status,
    cancellation_reason
FROM appointments_appointment
WHERE status = 'CANCELLED'
  AND (
      cancellation_reason IS NULL
      OR TRIM(cancellation_reason) = ''
  )
ORDER BY appointment_date DESC, start_time DESC;


-- =========================================================
-- SECTION D: REPORTING / SUMMARY QUERIES
-- =========================================================

-- 36. Daily appointment dashboard
SELECT
    appointment_date,
    COUNT(*) AS total_appointments,
    SUM(status = 'SCHEDULED') AS scheduled,
    SUM(status = 'COMPLETED') AS completed,
    SUM(status = 'CANCELLED') AS cancelled,
    SUM(status = 'RESCHEDULED') AS rescheduled
FROM appointments_appointment
WHERE appointment_date = CURDATE()
GROUP BY appointment_date;


-- 37. Appointment count by weekday
SELECT
    WEEKDAY(appointment_date) AS weekday_number,
    CASE WEEKDAY(appointment_date)
        WHEN 0 THEN 'Monday'
        WHEN 1 THEN 'Tuesday'
        WHEN 2 THEN 'Wednesday'
        WHEN 3 THEN 'Thursday'
        WHEN 4 THEN 'Friday'
        WHEN 5 THEN 'Saturday'
        WHEN 6 THEN 'Sunday'
    END AS weekday_name,
    COUNT(*) AS total_appointments
FROM appointments_appointment
GROUP BY WEEKDAY(appointment_date)
ORDER BY weekday_number;


-- 38. Busiest appointment time slots by hour
SELECT
    HOUR(start_time) AS appointment_hour,
    COUNT(*) AS total_appointments
FROM appointments_appointment
WHERE status IN ('SCHEDULED', 'COMPLETED', 'RESCHEDULED')
GROUP BY HOUR(start_time)
ORDER BY total_appointments DESC, appointment_hour;


-- 39. Appointment cancellation rate
SELECT
    COUNT(*) AS total_appointments,
    SUM(status = 'CANCELLED') AS cancelled_appointments,
    ROUND(
        100.0 * SUM(status = 'CANCELLED') / NULLIF(COUNT(*), 0),
        2
    ) AS cancellation_percentage
FROM appointments_appointment;


-- 40. Estimated listed service value for completed appointments
-- This is not actual revenue received because no payment model
-- is included in the models provided.
SELECT
    COUNT(a.id) AS completed_appointments,
    ROUND(COALESCE(SUM(sv.price), 0), 2)
        AS estimated_listed_service_value
FROM appointments_appointment a
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.status = 'COMPLETED';


-- 41. Completed appointment value by month
-- Uses the current service price, not a historical price snapshot.
SELECT
    YEAR(a.appointment_date) AS report_year,
    MONTH(a.appointment_date) AS report_month,
    COUNT(a.id) AS completed_appointments,
    ROUND(SUM(sv.price), 2) AS estimated_listed_service_value
FROM appointments_appointment a
INNER JOIN services_service sv ON sv.id = a.service_id
WHERE a.status = 'COMPLETED'
GROUP BY YEAR(a.appointment_date), MONTH(a.appointment_date)
ORDER BY report_year DESC, report_month DESC;


-- 42. Top staff members by completed appointments
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    COUNT(a.id) AS completed_appointments
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
INNER JOIN appointments_appointment a ON a.staff_id = st.id
WHERE a.status = 'COMPLETED'
GROUP BY st.id, u.first_name, u.last_name, st.staff_type
ORDER BY completed_appointments DESC, staff_name
LIMIT 10;


-- 43. Top customers by number of bookings
SELECT
    c.id AS customer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    COUNT(a.id) AS total_bookings
FROM accounts_customer c
INNER JOIN accounts_user u ON u.id = c.user_id
INNER JOIN appointments_appointment a ON a.customer_id = c.id
GROUP BY c.id, u.first_name, u.last_name
ORDER BY total_bookings DESC, customer_name
LIMIT 10;


-- 44. Appointment summary by service
SELECT
    sv.id AS service_id,
    sv.name AS service_name,
    COUNT(a.id) AS total_appointments,
    SUM(a.status = 'SCHEDULED') AS scheduled,
    SUM(a.status = 'COMPLETED') AS completed,
    SUM(a.status = 'CANCELLED') AS cancelled,
    SUM(a.status = 'RESCHEDULED') AS rescheduled
FROM services_service sv
LEFT JOIN appointments_appointment a
    ON a.service_id = sv.id
GROUP BY sv.id, sv.name
ORDER BY total_appointments DESC, sv.name;


-- 45. Appointment summary by staff type
SELECT
    st.staff_type,
    COUNT(a.id) AS total_appointments,
    SUM(a.status = 'SCHEDULED') AS scheduled,
    SUM(a.status = 'COMPLETED') AS completed,
    SUM(a.status = 'CANCELLED') AS cancelled,
    SUM(a.status = 'RESCHEDULED') AS rescheduled
FROM accounts_staff st
LEFT JOIN appointments_appointment a
    ON a.staff_id = st.id
GROUP BY st.staff_type
ORDER BY total_appointments DESC;


-- 46. Find appointments created in the last 30 days
SELECT
    id AS appointment_id,
    appointment_date,
    start_time,
    end_time,
    status,
    created_at
FROM appointments_appointment
WHERE created_at >= NOW() - INTERVAL 30 DAY
ORDER BY created_at DESC;


-- 47. Count appointments created month by month
SELECT
    YEAR(created_at) AS report_year,
    MONTH(created_at) AS report_month,
    COUNT(*) AS appointments_created
FROM appointments_appointment
GROUP BY YEAR(created_at), MONTH(created_at)
ORDER BY report_year DESC, report_month DESC;


-- 48. Overall appointment system summary
SELECT
    COUNT(*) AS total_appointments,
    SUM(status = 'SCHEDULED') AS scheduled_appointments,
    SUM(status = 'COMPLETED') AS completed_appointments,
    SUM(status = 'CANCELLED') AS cancelled_appointments,
    SUM(status = 'RESCHEDULED') AS rescheduled_appointments,
    COUNT(DISTINCT customer_id) AS customers_with_appointments,
    COUNT(DISTINCT staff_id) AS staff_with_appointments,
    COUNT(DISTINCT service_id) AS services_booked
FROM appointments_appointment;
