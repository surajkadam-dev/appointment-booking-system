
USE appointment_booking_db;



-- 1. Display all services
SELECT
    id,
    name,
    description,
    duration,
    price,
    is_active,
    created_at,
    updated_at
FROM services_service
ORDER BY name;


-- 2. Display only active services
SELECT
    id,
    name,
    description,
    duration,
    price
FROM services_service
WHERE is_active = TRUE
ORDER BY name;


-- 3. Display inactive services
SELECT
    id,
    name,
    duration,
    price,
    created_at
FROM services_service
WHERE is_active = FALSE
ORDER BY name;


-- 4. Count total, active, and inactive services
SELECT
    COUNT(*) AS total_services,
    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END)
        AS active_services,
    SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END)
        AS inactive_services
FROM services_service;


-- 5. Search services by name
-- Change 'consultation' to the service name you want to search
SELECT
    id,
    name,
    description,
    duration,
    price,
    is_active
FROM services_service
WHERE name LIKE '%consultation%'
ORDER BY name;


-- 6. Search services within a price range
-- Change the minimum and maximum prices as required
SELECT
    id,
    name,
    duration,
    price
FROM services_service
WHERE price BETWEEN 100 AND 1000
  AND is_active = TRUE
ORDER BY price;


-- 7. Display services ordered by price (lowest first)
SELECT
    id,
    name,
    duration,
    price,
    is_active
FROM services_service
ORDER BY price ASC, name ASC;


-- 8. Display services ordered by price (highest first)
SELECT
    id,
    name,
    duration,
    price,
    is_active
FROM services_service
ORDER BY price DESC, name ASC;


-- 9. Find the cheapest active service
SELECT
    id,
    name,
    duration,
    price
FROM services_service
WHERE is_active = TRUE
ORDER BY price ASC
LIMIT 1;


-- 10. Find the most expensive active service
SELECT
    id,
    name,
    duration,
    price
FROM services_service
WHERE is_active = TRUE
ORDER BY price DESC
LIMIT 1;


-- 11. Calculate service price statistics
SELECT
    COUNT(*) AS total_services,
    MIN(price) AS minimum_price,
    MAX(price) AS maximum_price,
    ROUND(AVG(price), 2) AS average_price,
    ROUND(SUM(price), 2) AS sum_of_listed_prices
FROM services_service
WHERE is_active = TRUE;


-- 12. Group services by duration
SELECT
    duration AS duration_minutes,
    COUNT(*) AS number_of_services
FROM services_service
GROUP BY duration
ORDER BY duration;


-- 13. Find services taking 30 minutes or less
SELECT
    id,
    name,
    duration,
    price
FROM services_service
WHERE duration <= 30
  AND is_active = TRUE
ORDER BY duration, price;


-- 14. Find services taking more than 60 minutes
SELECT
    id,
    name,
    duration,
    price
FROM services_service
WHERE duration > 60
  AND is_active = TRUE
ORDER BY duration DESC;


-- 15. Find duplicate service names (case-insensitive)
-- The serializer prevents duplicates during normal validated API writes.
-- This query checks whether duplicates already exist in the database.
SELECT
    LOWER(TRIM(name)) AS normalized_service_name,
    COUNT(*) AS duplicate_count
FROM services_service
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1;


-- 16. Find services with missing or blank names
-- Useful for checking existing data quality.
SELECT
    id,
    name,
    duration,
    price
FROM services_service
WHERE name IS NULL
   OR TRIM(name) = '';


-- 17. Find services with invalid duration or price
-- These checks help identify invalid existing records.
SELECT
    id,
    name,
    duration,
    price
FROM services_service
WHERE duration <= 0
   OR price < 0;


-- 18. Display all staff members assigned to each service
SELECT
    s.id AS service_id,
    s.name AS service_name,
    s.duration AS duration_minutes,
    s.price,
    st.id AS staff_id,
    u.first_name,
    u.last_name,
    u.email,
    st.staff_type,
    st.designation,
    st.department,
    st.is_available AS staff_available
FROM services_service s
INNER JOIN accounts_staff_services ss
    ON ss.service_id = s.id
INNER JOIN accounts_staff st
    ON st.id = ss.staff_id
INNER JOIN accounts_user u
    ON u.id = st.user_id
ORDER BY s.name, u.first_name, u.last_name;


-- 19. Display services with their assigned staff, including
-- services that have no staff assigned
SELECT
    s.id AS service_id,
    s.name AS service_name,
    s.duration,
    s.price,
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    st.is_available AS staff_available
FROM services_service s
LEFT JOIN accounts_staff_services ss
    ON ss.service_id = s.id
LEFT JOIN accounts_staff st
    ON st.id = ss.staff_id
LEFT JOIN accounts_user u
    ON u.id = st.user_id
ORDER BY s.name, staff_name;


-- 20. Count staff assigned to each service
SELECT
    s.id AS service_id,
    s.name AS service_name,
    COUNT(DISTINCT ss.staff_id) AS assigned_staff_count
FROM services_service s
LEFT JOIN accounts_staff_services ss
    ON ss.service_id = s.id
GROUP BY s.id, s.name
ORDER BY assigned_staff_count DESC, s.name;


-- 21. Find active services that have no staff assigned
SELECT
    s.id,
    s.name,
    s.duration,
    s.price
FROM services_service s
LEFT JOIN accounts_staff_services ss
    ON ss.service_id = s.id
WHERE s.is_active = TRUE
  AND ss.staff_id IS NULL
ORDER BY s.name;


-- 22. Display available doctors and their assigned services
SELECT
    st.id AS doctor_staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
    u.email,
    st.designation,
    st.department,
    s.id AS service_id,
    s.name AS service_name,
    s.duration,
    s.price
FROM accounts_staff st
INNER JOIN accounts_user u
    ON u.id = st.user_id
INNER JOIN accounts_staff_services ss
    ON ss.staff_id = st.id
INNER JOIN services_service s
    ON s.id = ss.service_id
WHERE st.staff_type = 'DOCTOR'
  AND st.is_available = TRUE
  AND u.is_active = TRUE
  AND s.is_active = TRUE
ORDER BY doctor_name, s.name;


-- 23. Count active doctors assigned to each active service
SELECT
    s.id AS service_id,
    s.name AS service_name,
    COUNT(DISTINCT st.id) AS available_doctor_count
FROM services_service s
LEFT JOIN accounts_staff_services ss
    ON ss.service_id = s.id
LEFT JOIN accounts_staff st
    ON st.id = ss.staff_id
   AND st.staff_type = 'DOCTOR'
   AND st.is_available = TRUE
LEFT JOIN accounts_user u
    ON u.id = st.user_id
   AND u.is_active = TRUE
WHERE s.is_active = TRUE
GROUP BY s.id, s.name
ORDER BY available_doctor_count DESC, s.name;


-- 24. Display staff members who have no assigned services
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    u.email,
    st.staff_type,
    st.designation,
    st.department
FROM accounts_staff st
INNER JOIN accounts_user u
    ON u.id = st.user_id
LEFT JOIN accounts_staff_services ss
    ON ss.staff_id = st.id
WHERE ss.service_id IS NULL
ORDER BY staff_name;


-- 25. Display the number of services assigned to each staff member
SELECT
    st.id AS staff_id,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    st.is_available,
    COUNT(DISTINCT ss.service_id) AS assigned_service_count
FROM accounts_staff st
INNER JOIN accounts_user u
    ON u.id = st.user_id
LEFT JOIN accounts_staff_services ss
    ON ss.staff_id = st.id
GROUP BY
    st.id,
    u.first_name,
    u.last_name,
    st.staff_type,
    st.is_available
ORDER BY assigned_service_count DESC, staff_name;


-- 26. Find active services assigned to unavailable staff
SELECT
    s.id AS service_id,
    s.name AS service_name,
    CONCAT(u.first_name, ' ', u.last_name) AS staff_name,
    st.staff_type,
    st.is_available
FROM services_service s
INNER JOIN accounts_staff_services ss
    ON ss.service_id = s.id
INNER JOIN accounts_staff st
    ON st.id = ss.staff_id
INNER JOIN accounts_user u
    ON u.id = st.user_id
WHERE s.is_active = TRUE
  AND st.is_available = FALSE
ORDER BY s.name, staff_name;


-- 27. Display services created in the last 30 days
SELECT
    id,
    name,
    duration,
    price,
    created_at
FROM services_service
WHERE created_at >= NOW() - INTERVAL 30 DAY
ORDER BY created_at DESC;


-- 28. Count services created month by month
SELECT
    YEAR(created_at) AS year,
    MONTH(created_at) AS month,
    COUNT(*) AS services_created
FROM services_service
GROUP BY YEAR(created_at), MONTH(created_at)
ORDER BY year DESC, month DESC;


-- 29. Display services with the highest number of staff assignments
SELECT
    s.id AS service_id,
    s.name AS service_name,
    COUNT(DISTINCT ss.staff_id) AS assigned_staff_count
FROM services_service s
LEFT JOIN accounts_staff_services ss
    ON ss.service_id = s.id
GROUP BY s.id, s.name
ORDER BY assigned_staff_count DESC, s.name
LIMIT 5;


-- 30. Service catalogue summary
SELECT
    COUNT(*) AS total_services,
    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END)
        AS active_services,
    SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END)
        AS inactive_services,
    ROUND(AVG(CASE WHEN is_active = TRUE THEN price END), 2)
        AS average_active_service_price,
    ROUND(AVG(CASE WHEN is_active = TRUE THEN duration END), 2)
        AS average_active_service_duration
FROM services_service;
