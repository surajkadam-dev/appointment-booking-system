
USE appointment_booking_db;

-- 1. Display all staff availability schedules
SELECT
    av.id AS availability_id,
    av.staff_id,
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
    av.end_time,
    av.is_available,
    av.created_at,
    av.updated_at
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
ORDER BY av.day_of_week, av.start_time, staff_name;


-- 2. Display only available schedules
SELECT
    av.id AS availability_id,
    av.staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    av.day_of_week,
    av.start_time,
    av.end_time
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.is_available = TRUE
  AND st.is_available = TRUE
  AND u.is_active = TRUE
ORDER BY av.day_of_week, av.start_time;


-- 3. Display unavailable schedules
SELECT
    av.id AS availability_id,
    av.staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    av.day_of_week,
    av.start_time,
    av.end_time
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.is_available = FALSE
ORDER BY av.day_of_week, av.start_time;


-- 4. Display schedules for a specific staff member
-- Replace 1 with the actual staff ID
SELECT
    av.id AS availability_id,
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


-- 5. Display availability for a specific day
-- Use 0 for Monday and 6 for Sunday
SELECT
    av.id AS availability_id,
    av.staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    av.start_time,
    av.end_time,
    av.is_available
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.day_of_week = 0
  AND av.is_available = TRUE
  AND st.is_available = TRUE
  AND u.is_active = TRUE
ORDER BY av.start_time;


-- 6. Count schedules by day of the week
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
    COUNT(*) AS total_schedules,
    SUM(CASE WHEN is_available = TRUE THEN 1 ELSE 0 END)
        AS available_schedules,
    SUM(CASE WHEN is_available = FALSE THEN 1 ELSE 0 END)
        AS unavailable_schedules
FROM appointments_availability
GROUP BY day_of_week
ORDER BY day_of_week;


-- 7. Count availability schedules for each staff member
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    COUNT(av.id) AS total_schedules,
    SUM(CASE WHEN av.is_available = TRUE THEN 1 ELSE 0 END)
        AS available_schedules,
    SUM(CASE WHEN av.is_available = FALSE THEN 1 ELSE 0 END)
        AS unavailable_schedules
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
LEFT JOIN appointments_availability av ON av.staff_id = st.id
GROUP BY st.id, u.first_name, u.last_name, st.staff_type
ORDER BY staff_name;


-- 8. Find staff members without any availability schedule
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    st.is_available
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
LEFT JOIN appointments_availability av ON av.staff_id = st.id
WHERE av.id IS NULL
ORDER BY staff_name;


-- 9. Find staff members who have no available schedule
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
LEFT JOIN appointments_availability av
    ON av.staff_id = st.id
   AND av.is_available = TRUE
WHERE av.id IS NULL
ORDER BY staff_name;


-- 10. Find staff members marked available but with no available schedule
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    st.is_available
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE st.is_available = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM appointments_availability av
      WHERE av.staff_id = st.id
        AND av.is_available = TRUE
  )
ORDER BY staff_name;


-- 11. Find schedules with invalid time ranges
SELECT
    id AS availability_id,
    staff_id,
    day_of_week,
    start_time,
    end_time
FROM appointments_availability
WHERE end_time <= start_time;


-- 12. Find duplicate availability schedules
-- The unique_staff_availability constraint should prevent these duplicates
SELECT
    staff_id,
    day_of_week,
    start_time,
    end_time,
    COUNT(*) AS duplicate_count
FROM appointments_availability
GROUP BY staff_id, day_of_week, start_time, end_time
HAVING COUNT(*) > 1;


-- 13. Find staff with multiple schedules on the same day
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
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
    COUNT(av.id) AS schedule_count
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
INNER JOIN appointments_availability av ON av.staff_id = st.id
GROUP BY
    st.id,
    u.first_name,
    u.last_name,
    av.day_of_week
HAVING COUNT(av.id) > 1
ORDER BY staff_name, av.day_of_week;


-- 14. Find overlapping availability schedules for the same staff member
-- Adjacent schedules where one ends as another begins are not overlapping
SELECT
    av1.id AS schedule_id_1,
    av2.id AS schedule_id_2,
    av1.staff_id,
    av1.day_of_week,
    av1.start_time AS start_time_1,
    av1.end_time AS end_time_1,
    av2.start_time AS start_time_2,
    av2.end_time AS end_time_2
FROM appointments_availability av1
INNER JOIN appointments_availability av2
    ON av1.staff_id = av2.staff_id
   AND av1.day_of_week = av2.day_of_week
   AND av1.id < av2.id
   AND av1.start_time < av2.end_time
   AND av1.end_time > av2.start_time
WHERE av1.is_available = TRUE
  AND av2.is_available = TRUE
ORDER BY av1.staff_id, av1.day_of_week, av1.start_time;


-- 15. Display availability schedules for doctors
SELECT
    av.id AS availability_id,
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
    st.designation,
    st.department,
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
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE st.staff_type = 'DOCTOR'
ORDER BY av.day_of_week, av.start_time, doctor_name;


-- 16. Display availability schedules for receptionists
SELECT
    av.id AS availability_id,
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS receptionist_name,
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
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE st.staff_type = 'RECEPTIONIST'
ORDER BY av.day_of_week, av.start_time, receptionist_name;


-- 17. Find availability schedules for inactive user accounts
SELECT
    av.id AS availability_id,
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    av.day_of_week,
    av.start_time,
    av.end_time,
    av.is_available
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE u.is_active = FALSE
ORDER BY staff_name, av.day_of_week;


-- 18. Find schedules for staff marked unavailable
SELECT
    av.id AS availability_id,
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    av.day_of_week,
    av.start_time,
    av.end_time,
    av.is_available AS schedule_available,
    st.is_available AS staff_available
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE st.is_available = FALSE
ORDER BY staff_name, av.day_of_week, av.start_time;


-- 19. Calculate scheduled working hours for each staff member per week
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    ROUND(
        SUM(
            CASE
                WHEN av.is_available = TRUE
                THEN TIME_TO_SEC(av.end_time) - TIME_TO_SEC(av.start_time)
                ELSE 0
            END
        ) / 3600,
        2
    ) AS weekly_scheduled_hours
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
LEFT JOIN appointments_availability av ON av.staff_id = st.id
GROUP BY st.id, u.first_name, u.last_name
ORDER BY weekly_scheduled_hours DESC, staff_name;


-- 20. Calculate available working hours by day of the week
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
    ROUND(
        SUM(
            TIME_TO_SEC(av.end_time) - TIME_TO_SEC(av.start_time)
        ) / 3600,
        2
    ) AS total_available_hours
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.is_available = TRUE
  AND st.is_available = TRUE
  AND u.is_active = TRUE
GROUP BY av.day_of_week
ORDER BY av.day_of_week;


-- 21. Display today's weekday and staff schedules for that day
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    av.start_time,
    av.end_time,
    av.is_available
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.day_of_week = WEEKDAY(CURDATE())
  AND av.is_available = TRUE
  AND st.is_available = TRUE
  AND u.is_active = TRUE
ORDER BY av.start_time, staff_name;


-- 22. Display active staff schedules for a chosen date
-- Change the date as required
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    av.start_time,
    av.end_time
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.day_of_week = WEEKDAY('2026-10-09')
  AND av.is_available = TRUE
  AND st.is_available = TRUE
  AND u.is_active = TRUE
ORDER BY av.start_time, staff_name;


-- 23. Count available and unavailable schedules overall
SELECT
    COUNT(*) AS total_schedules,
    SUM(CASE WHEN is_available = TRUE THEN 1 ELSE 0 END)
        AS available_schedules,
    SUM(CASE WHEN is_available = FALSE THEN 1 ELSE 0 END)
        AS unavailable_schedules
FROM appointments_availability;


-- 24. Find staff members who have availability on every weekday
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    COUNT(DISTINCT av.day_of_week) AS available_days
FROM accounts_staff st
INNER JOIN accounts_user u ON u.id = st.user_id
INNER JOIN appointments_availability av ON av.staff_id = st.id
WHERE av.is_available = TRUE
GROUP BY st.id, u.first_name, u.last_name
HAVING COUNT(DISTINCT av.day_of_week) = 7
ORDER BY staff_name;


-- 25. Find staff members available on weekends
SELECT DISTINCT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.day_of_week IN (5, 6)
  AND av.is_available = TRUE
  AND st.is_available = TRUE
  AND u.is_active = TRUE
ORDER BY staff_name;


-- 26. Count available doctors by weekday
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
    COUNT(DISTINCT st.id) AS available_doctors
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE st.staff_type = 'DOCTOR'
  AND av.is_available = TRUE
  AND st.is_available = TRUE
  AND u.is_active = TRUE
GROUP BY av.day_of_week
ORDER BY av.day_of_week;


-- 27. Find schedules that have appointments assigned to the staff member
SELECT
    av.id AS availability_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    av.day_of_week,
    av.start_time,
    av.end_time,
    COUNT(a.id) AS appointment_count
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
LEFT JOIN appointments_appointment a
    ON a.staff_id = av.staff_id
   AND WEEKDAY(a.appointment_date) = av.day_of_week
   AND a.start_time >= av.start_time
   AND a.end_time <= av.end_time
   AND a.status IN ('SCHEDULED', 'RESCHEDULED')
WHERE av.is_available = TRUE
GROUP BY
    av.id,
    u.first_name,
    u.last_name,
    av.day_of_week,
    av.start_time,
    av.end_time
ORDER BY appointment_count DESC, staff_name;


-- 28. Find available schedules that have no scheduled appointments
SELECT
    av.id AS availability_id,
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    av.day_of_week,
    av.start_time,
    av.end_time
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.is_available = TRUE
  AND st.is_available = TRUE
  AND u.is_active = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM appointments_appointment a
      WHERE a.staff_id = av.staff_id
        AND WEEKDAY(a.appointment_date) = av.day_of_week
        AND a.start_time < av.end_time
        AND a.end_time > av.start_time
        AND a.status IN ('SCHEDULED', 'RESCHEDULED')
  )
ORDER BY av.day_of_week, av.start_time, staff_name;


-- 29. Find availability schedules created in the last 30 days
SELECT
    av.id AS availability_id,
    av.staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    av.day_of_week,
    av.start_time,
    av.end_time,
    av.created_at
FROM appointments_availability av
INNER JOIN accounts_staff st ON st.id = av.staff_id
INNER JOIN accounts_user u ON u.id = st.user_id
WHERE av.created_at >= NOW() - INTERVAL 30 DAY
ORDER BY av.created_at DESC;


-- 30. Display the complete availability summary
SELECT
    COUNT(DISTINCT st.id) AS total_staff,
    COUNT(av.id) AS total_schedule_slots,
    SUM(CASE WHEN av.is_available = TRUE THEN 1 ELSE 0 END)
        AS available_schedule_slots,
    SUM(CASE WHEN av.is_available = FALSE THEN 1 ELSE 0 END)
        AS unavailable_schedule_slots,
    COUNT(DISTINCT CASE
        WHEN av.is_available = TRUE THEN st.id
    END) AS staff_with_available_schedules
FROM accounts_staff st
LEFT JOIN appointments_availability av ON av.staff_id = st.id;
