// ============================================================
// DOCTOR STAFF AVAILABILITY
// frontend/js/doctor-staff-availability.js
// ============================================================

const API_BASE_URL = "http://127.0.0.1:8000/api";

let accessToken = localStorage.getItem("access_token");
let currentUser = null;
let currentStaff = null;

let availability = [];
let editingAvailabilityId = null;
let deletingAvailabilityId = null;

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("========================================");
    console.log("Doctor Availability Page Loaded");
    console.log("========================================");

    // Get latest token
    accessToken = localStorage.getItem("access_token");

    // Get logged-in user
    loadCurrentUser();

    console.log("Access Token:", accessToken ? "FOUND" : "NOT FOUND");
    console.log("Current User:", currentUser);

    // Authentication
    if (!checkAuthentication()) {
        return;
    }

    // Setup page
    updateUserInformation();
    setupEvents();

    // Load doctor's availability
    loadAvailability();
});


// ============================================================
// LOAD CURRENT USER
// ============================================================

function loadCurrentUser() {

    try {

        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
            console.error("No user found in localStorage.");
            currentUser = null;
            return;
        }

        const parsedUser = JSON.parse(storedUser);

        console.log("Raw localStorage user:", parsedUser);

        /*
         * Support both possible structures:
         *
         * 1.
         * {
         *   id: 8,
         *   email: "...",
         *   role: "STAFF"
         * }
         *
         * 2.
         * {
         *   access: "...",
         *   user: {
         *      id: 8,
         *      email: "...",
         *      role: "STAFF"
         *   }
         * }
         */

        if (parsedUser && parsedUser.user) {
            currentUser = parsedUser.user;
        } else {
            currentUser = parsedUser;
        }

        // Normalize role
        if (currentUser && currentUser.role) {
            currentUser.role = String(currentUser.role).toUpperCase();
        }

        console.log("Normalized Current User:", currentUser);

    } catch (error) {

        console.error(
            "Unable to parse user from localStorage:",
            error
        );

        currentUser = null;
    }
}


// ============================================================
// AUTHENTICATION
// ============================================================

function checkAuthentication() {

    console.log("Checking authentication...");

    // No token
    if (!accessToken) {

        console.error("Access token missing.");

        window.location.href = "../login.html";

        return false;
    }

    // No user
    if (!currentUser) {

        console.error("Current user missing.");

        window.location.href = "../login.html";

        return false;
    }

    const role = String(
        currentUser.role || ""
    ).toUpperCase();

    console.log("Logged-in role:", role);

    // Admin
    if (role === "ADMIN") {

        console.log(
            "Admin detected. Redirecting to admin dashboard."
        );

        window.location.href = "../admin/dashboard.html";

        return false;
    }

    // Customer
    if (role === "CUSTOMER") {

        console.log(
            "Customer detected. Redirecting to customer dashboard."
        );

        window.location.href = "../customer/dashboard.html";

        return false;
    }

    // Unknown role
    if (role !== "STAFF") {

        console.error(
            "Invalid role:",
            role
        );

        alert(
            "Your account does not have permission to access this page."
        );

        window.location.href = "../index.html";

        return false;
    }

    /*
     * Staff type check.
     *
     * If staff_type is available locally,
     * only DOCTOR can manage availability.
     *
     * If staff_type is not available,
     * do NOT redirect.
     *
     * We will determine the staff profile from API.
     */

    const staffType =
        currentUser.staff_type ||
        currentUser.staffType ||
        "";

    if (
        staffType &&
        String(staffType).toUpperCase() !== "DOCTOR"
    ) {

        alert(
            "Only doctors can manage their availability."
        );

        window.location.href = "dashboard.html";

        return false;
    }

    return true;
}


// ============================================================
// USER INFORMATION
// ============================================================

function updateUserInformation() {

    if (!currentUser) {
        return;
    }

    const firstName =
        currentUser.first_name ||
        currentUser.firstName ||
        "";

    const lastName =
        currentUser.last_name ||
        currentUser.lastName ||
        "";

    const fullName =
        `${firstName} ${lastName}`.trim() ||
        currentUser.email ||
        "Doctor";

    const userName =
        document.getElementById("userName");

    const userRole =
        document.getElementById("userRole");

    const userAvatar =
        document.getElementById("userAvatar");

    if (userName) {
        userName.textContent = fullName;
    }

    if (userRole) {
        userRole.textContent = "Doctor";
    }

    if (userAvatar) {
        userAvatar.textContent =
            getInitials(fullName);
    }
}


// ============================================================
// EVENTS
// ============================================================

function setupEvents() {

    // Add Schedule
    document
        .getElementById("addScheduleBtn")
        ?.addEventListener(
            "click",
            function () {
                openAddSchedule("");
            }
        );


    // Empty state Add Schedule
    document
        .getElementById("emptyAddBtn")
        ?.addEventListener(
            "click",
            function () {
                openAddSchedule("");
            }
        );


    // Close schedule modal
    document
        .getElementById("closeModalBtn")
        ?.addEventListener(
            "click",
            closeScheduleModal
        );


    document
        .getElementById("cancelModalBtn")
        ?.addEventListener(
            "click",
            closeScheduleModal
        );


    // Schedule form
    document
        .getElementById("scheduleForm")
        ?.addEventListener(
            "submit",
            saveSchedule
        );


    // Delete modal
    document
        .getElementById("closeDeleteBtn")
        ?.addEventListener(
            "click",
            closeDeleteModal
        );


    document
        .getElementById("cancelDeleteBtn")
        ?.addEventListener(
            "click",
            closeDeleteModal
        );


    document
        .getElementById("confirmDeleteBtn")
        ?.addEventListener(
            "click",
            confirmDelete
        );


    // Day filter
    document
        .getElementById("dayFilter")
        ?.addEventListener(
            "change",
            renderAvailability
        );


    // Status filter
    document
        .getElementById("statusFilter")
        ?.addEventListener(
            "change",
            renderAvailability
        );


    // Clear filters
    document
        .getElementById("clearFiltersBtn")
        ?.addEventListener(
            "click",
            clearFilters
        );


    // Logout
    document
        .getElementById("logoutBtn")
        ?.addEventListener(
            "click",
            logout
        );


    // Close modal by clicking outside
    document
        .getElementById("scheduleModal")
        ?.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.id ===
                    "scheduleModal"
                ) {
                    closeScheduleModal();
                }

            }
        );


    // Close delete modal outside
    document
        .getElementById("deleteModal")
        ?.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.id ===
                    "deleteModal"
                ) {
                    closeDeleteModal();
                }

            }
        );
}


// ============================================================
// LOAD AVAILABILITY
// ============================================================

async function loadAvailability() {

    showTableLoading();

    console.log(
        "Loading doctor's availability..."
    );

    try {

        const response = await fetch(
            `${API_BASE_URL}/appointments/availability/`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${accessToken}`,

                    "Content-Type":
                        "application/json"
                }
            }
        );


        console.log(
            "Availability API status:",
            response.status
        );


        // Unauthorized
        if (response.status === 401) {

            console.error(
                "401 Unauthorized."
            );

            logout();

            return;
        }


        // Forbidden
        if (response.status === 403) {

            console.error(
                "403 Forbidden."
            );

            showTableError(
                "You do not have permission to view availability."
            );

            return;
        }


        const data =
            await response
                .json()
                .catch(() => ({}));


        console.log(
            "Availability API response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                extractApiError(data)
            );
        }


        /*
         * DRF pagination:
         *
         * {
         *   count: 0,
         *   next: null,
         *   previous: null,
         *   results: []
         * }
         *
         * Non-paginated:
         *
         * []
         */

        if (Array.isArray(data)) {

            availability = data;

        } else {

            availability =
                Array.isArray(data.results)
                    ? data.results
                    : [];
        }


        console.log(
            "Doctor availability records:",
            availability
        );


        renderAvailability();
        updateStatistics();


    } catch (error) {

        console.error(
            "Availability loading error:",
            error
        );

        showTableError(
            error.message ||
            "Unable to load availability."
        );
    }
}


// ============================================================
// RENDER AVAILABILITY
// ============================================================

function renderAvailability() {

    const tbody =
        document.getElementById(
            "availabilityTableBody"
        );

    const emptyState =
        document.getElementById(
            "emptyState"
        );


    if (!tbody) {
        console.error(
            "availabilityTableBody not found."
        );

        return;
    }


    let filtered =
        [...availability];


    // Day filter
    const selectedDay =
        document.getElementById(
            "dayFilter"
        )?.value || "";


    if (selectedDay !== "") {

        filtered =
            filtered.filter(
                item =>
                    Number(item.day_of_week) ===
                    Number(selectedDay)
            );
    }


    // Status filter
    const selectedStatus =
        document.getElementById(
            "statusFilter"
        )?.value || "";


    if (selectedStatus !== "") {

        const statusBoolean =
            selectedStatus === "true";

        filtered =
            filtered.filter(
                item =>
                    Boolean(item.is_available) ===
                    statusBoolean
            );
    }


    // Sort
    filtered.sort(
        function (a, b) {

            const dayDifference =
                Number(a.day_of_week) -
                Number(b.day_of_week);

            if (dayDifference !== 0) {
                return dayDifference;
            }

            return (
                a.start_time || ""
            ).localeCompare(
                b.start_time || ""
            );
        }
    );


    // Empty
    if (filtered.length === 0) {

        tbody.innerHTML = "";

        if (emptyState) {
            emptyState.classList.remove("hidden");
        }

        return;
    }


    if (emptyState) {
        emptyState.classList.add("hidden");
    }


    tbody.innerHTML =
        filtered
            .map(
                item =>
                    renderAvailabilityRow(item)
            )
            .join("");
}


// ============================================================
// TABLE ROW
// ============================================================

function renderAvailabilityRow(item) {

    const day =
        item.day_name ||
        DAYS[Number(item.day_of_week)] ||
        "-";


    const startTime =
        formatTime(item.start_time);


    const endTime =
        formatTime(item.end_time);


    const duration =
        calculateDuration(
            item.start_time,
            item.end_time
        );


    const isActive =
        Boolean(item.is_available);


    const statusClass =
        isActive
            ? "active"
            : "inactive";


    const statusText =
        isActive
            ? "Active"
            : "Inactive";


    return `
        <tr>

            <td>
                <strong>
                    ${escapeHtml(day)}
                </strong>
            </td>

            <td>
                ${escapeHtml(startTime)}
            </td>

            <td>
                ${escapeHtml(endTime)}
            </td>

            <td>
                ${escapeHtml(duration)}
            </td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>

            <td>

                <div class="action-buttons">

                    <button
                        type="button"
                        class="action-btn edit"
                        onclick="editSchedule(${item.id})"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="action-btn toggle"
                        onclick="toggleSchedule(${item.id})"
                    >
                        ${isActive ? "Disable" : "Enable"}
                    </button>

                    <button
                        type="button"
                        class="action-btn delete"
                        onclick="openDeleteModal(${item.id})"
                    >
                        Delete
                    </button>

                </div>

            </td>

        </tr>
    `;
}


// ============================================================
// STATISTICS
// ============================================================

function updateStatistics() {

    const total =
        availability.length;


    const active =
        availability.filter(
            item =>
                Boolean(item.is_available)
        ).length;


    const inactive =
        availability.filter(
            item =>
                !Boolean(item.is_available)
        ).length;


    const totalElement =
        document.getElementById(
            "totalSchedules"
        );

    const activeElement =
        document.getElementById(
            "activeSchedules"
        );

    const inactiveElement =
        document.getElementById(
            "inactiveSchedules"
        );


    if (totalElement) {
        totalElement.textContent = total;
    }

    if (activeElement) {
        activeElement.textContent = active;
    }

    if (inactiveElement) {
        inactiveElement.textContent = inactive;
    }
}


// ============================================================
// ADD SCHEDULE
// ============================================================

function openAddSchedule(day = "") {

    editingAvailabilityId = null;


    const modalTitle =
        document.getElementById(
            "modalTitle"
        );

    const dayElement =
        document.getElementById(
            "dayOfWeek"
        );

    const startElement =
        document.getElementById(
            "startTime"
        );

    const endElement =
        document.getElementById(
            "endTime"
        );

    const availableElement =
        document.getElementById(
            "isAvailable"
        );


    if (modalTitle) {
        modalTitle.textContent =
            "Add Schedule";
    }

    if (dayElement) {
        dayElement.value = day;
    }

    if (startElement) {
        startElement.value = "09:00";
    }

    if (endElement) {
        endElement.value = "17:00";
    }

    if (availableElement) {
        availableElement.checked = true;
    }


    hideFormError();


    document
        .getElementById("scheduleModal")
        ?.classList.remove("hidden");
}


// ============================================================
// EDIT SCHEDULE
// ============================================================

function editSchedule(id) {

    const item =
        availability.find(
            entry =>
                Number(entry.id) ===
                Number(id)
        );


    if (!item) {

        showToast(
            "Availability schedule not found.",
            "error"
        );

        return;
    }


    editingAvailabilityId =
        item.id;


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Edit Schedule";


    document.getElementById(
        "dayOfWeek"
    ).value =
        item.day_of_week;


    document.getElementById(
        "startTime"
    ).value =
        (item.start_time || "")
            .substring(0, 5);


    document.getElementById(
        "endTime"
    ).value =
        (item.end_time || "")
            .substring(0, 5);


    document.getElementById(
        "isAvailable"
    ).checked =
        Boolean(item.is_available);


    hideFormError();


    document
        .getElementById("scheduleModal")
        ?.classList.remove("hidden");
}


// ============================================================
// CLOSE SCHEDULE MODAL
// ============================================================

function closeScheduleModal() {

    document
        .getElementById("scheduleModal")
        ?.classList.add("hidden");

    editingAvailabilityId = null;

    hideFormError();
}


// ============================================================
// SAVE SCHEDULE
// ============================================================

async function saveSchedule(event) {

    event.preventDefault();


    const dayOfWeek =
        document.getElementById(
            "dayOfWeek"
        )?.value || "";


    const startTime =
        document.getElementById(
            "startTime"
        )?.value || "";


    const endTime =
        document.getElementById(
            "endTime"
        )?.value || "";


    const isAvailable =
        document.getElementById(
            "isAvailable"
        )?.checked ?? true;


    // Validation
    if (dayOfWeek === "") {

        showFormError(
            "Please select a day."
        );

        return;
    }


    if (!startTime || !endTime) {

        showFormError(
            "Start time and end time are required."
        );

        return;
    }


    if (startTime >= endTime) {

        showFormError(
            "End time must be later than start time."
        );

        return;
    }


    // Check local overlap
    const conflict =
        availability.find(
            item => {

                // Ignore current record while editing
                if (
                    Number(item.id) ===
                    Number(editingAvailabilityId)
                ) {
                    return false;
                }


                // Different day
                if (
                    Number(item.day_of_week) !==
                    Number(dayOfWeek)
                ) {
                    return false;
                }


                const existingStart =
                    (item.start_time || "")
                        .substring(0, 5);


                const existingEnd =
                    (item.end_time || "")
                        .substring(0, 5);


                return (
                    startTime < existingEnd &&
                    endTime > existingStart
                );
            }
        );


    if (conflict) {

        showFormError(
            "This time overlaps with another availability schedule."
        );

        return;
    }


    // Get doctor staff ID
    const staffId =
        await getMyStaffId();


    if (!staffId) {

        showFormError(
            "Unable to identify your doctor staff profile."
        );

        return;
    }


    const payload = {

        staff: Number(staffId),

        day_of_week:
            Number(dayOfWeek),

        start_time:
            startTime,

        end_time:
            endTime,

        is_available:
            isAvailable
    };


    console.log(
        "Saving availability:",
        payload
    );


    const saveButton =
        document.getElementById(
            "saveScheduleBtn"
        );


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.textContent =
            "Saving...";
    }


    try {

        const url =
            editingAvailabilityId

                ? `${API_BASE_URL}/appointments/availability/${editingAvailabilityId}/`

                : `${API_BASE_URL}/appointments/availability/`;


        const method =
            editingAvailabilityId
                ? "PATCH"
                : "POST";


        const response =
            await fetch(
                url,
                {
                    method: method,

                    headers: {

                        "Authorization":
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        console.log(
            "Save availability response:",
            response.status,
            data
        );


        // Unauthorized
        if (response.status === 401) {

            logout();

            return;
        }


        if (!response.ok) {

            showFormError(
                extractApiError(data)
            );

            return;
        }


        closeScheduleModal();


        showToast(
            editingAvailabilityId
                ? "Schedule updated successfully."
                : "Schedule added successfully.",
            "success"
        );


        await loadAvailability();


    } catch (error) {

        console.error(
            "Save schedule error:",
            error
        );

        showFormError(
            "Network error. Please try again."
        );

    } finally {

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent =
                "Save Schedule";
        }
    }
}


// ============================================================
// TOGGLE ACTIVE / INACTIVE
// ============================================================

async function toggleSchedule(id) {

    const item =
        availability.find(
            entry =>
                Number(entry.id) ===
                Number(id)
        );


    if (!item) {

        showToast(
            "Schedule not found.",
            "error"
        );

        return;
    }


    const newStatus =
        !Boolean(item.is_available);


    console.log(
        "Changing availability status:",
        id,
        newStatus
    );


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/availability/${id}/`,
                {
                    method: "PATCH",

                    headers: {

                        "Authorization":
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            is_available:
                                newStatus
                        })
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (response.status === 401) {

            logout();

            return;
        }


        if (!response.ok) {

            throw new Error(
                extractApiError(data)
            );
        }


        showToast(
            newStatus
                ? "Schedule enabled."
                : "Schedule disabled.",
            "success"
        );


        await loadAvailability();


    } catch (error) {

        console.error(
            "Toggle schedule error:",
            error
        );

        showToast(
            error.message ||
            "Unable to update schedule.",
            "error"
        );
    }
}


// ============================================================
// DELETE MODAL
// ============================================================

function openDeleteModal(id) {

    deletingAvailabilityId = id;

    document
        .getElementById("deleteModal")
        ?.classList.remove("hidden");
}


function closeDeleteModal() {

    document
        .getElementById("deleteModal")
        ?.classList.add("hidden");

    deletingAvailabilityId = null;
}


// ============================================================
// DELETE SCHEDULE
// ============================================================

async function confirmDelete() {

    if (!deletingAvailabilityId) {
        return;
    }


    const id =
        deletingAvailabilityId;


    const deleteButton =
        document.getElementById(
            "confirmDeleteBtn"
        );


    if (deleteButton) {

        deleteButton.disabled = true;

        deleteButton.textContent =
            "Deleting...";
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/availability/${id}/`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            `Bearer ${accessToken}`
                    }
                }
            );


        if (response.status === 401) {

            logout();

            return;
        }


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                extractApiError(data)
            );
        }


        closeDeleteModal();


        showToast(
            "Schedule deleted successfully.",
            "success"
        );


        await loadAvailability();


    } catch (error) {

        console.error(
            "Delete schedule error:",
            error
        );

        showToast(
            error.message ||
            "Unable to delete schedule.",
            "error"
        );

    } finally {

        if (deleteButton) {

            deleteButton.disabled = false;

            deleteButton.textContent =
                "Delete";
        }
    }
}


// ============================================================
// GET MY STAFF ID
// ============================================================

// ============================================================
// GET CURRENT DOCTOR'S STAFF ID
// ============================================================

async function getMyStaffId() {

    console.log("Getting current doctor's Staff ID...");

    // --------------------------------------------------------
    // 1. Check if staff_id is already available in currentUser
    // --------------------------------------------------------

    if (currentUser?.staff_id) {

        const staffId =
            Number(currentUser.staff_id);

        console.log(
            "Staff ID found in currentUser:",
            staffId
        );

        // Verify staff type if available
        if (currentUser.staff_type) {

            const staffType =
                String(
                    currentUser.staff_type
                ).toUpperCase();

            console.log(
                "Staff Type:",
                staffType
            );

            if (staffType !== "DOCTOR") {

                console.error(
                    "Current staff is not a doctor:",
                    staffType
                );

                showFormError(
                    "Only doctors can manage availability."
                );

                return null;
            }
        }

        return staffId;
    }


    // --------------------------------------------------------
    // 2. If staff_id is not available, call /accounts/me/
    // --------------------------------------------------------

    try {

        console.log(
            "staff_id not found locally."
        );

        console.log(
            "Requesting current user profile..."
        );


        const response =
            await fetch(
                `${API_BASE_URL}/accounts/me/`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );


        console.log(
            "Current user API status:",
            response.status
        );


        // ----------------------------------------------------
        // Unauthorized
        // ----------------------------------------------------

        if (response.status === 401) {

            console.error(
                "Access token expired or invalid."
            );

            logout();

            return null;
        }


        // ----------------------------------------------------
        // Forbidden
        // ----------------------------------------------------

        if (response.status === 403) {

            console.error(
                "Current user is not authorized."
            );

            showFormError(
                "You are not authorized to access your profile."
            );

            return null;
        }


        // ----------------------------------------------------
        // Other errors
        // ----------------------------------------------------

        if (!response.ok) {

            const errorData =
                await response
                    .json()
                    .catch(() => ({}));


            console.error(
                "Current user API error:",
                errorData
            );


            showFormError(
                extractApiError(errorData)
            );


            return null;
        }


        // ----------------------------------------------------
        // Read response
        // ----------------------------------------------------

        const data =
            await response.json();


        console.log(
            "Current user profile:",
            data
        );


        // ----------------------------------------------------
        // Verify Staff role
        // ----------------------------------------------------

        const role =
            String(
                data.role || ""
            ).toUpperCase();


        if (role !== "STAFF") {

            console.error(
                "Current user is not Staff:",
                role
            );

            showFormError(
                "Only staff members can manage availability."
            );

            return null;
        }


        // ----------------------------------------------------
        // Verify Staff ID
        // ----------------------------------------------------

        if (!data.staff_id) {

            console.error(
                "staff_id is missing from /api/accounts/me/"
            );

            showFormError(
                "Your staff profile is not properly configured."
            );

            return null;
        }


        // ----------------------------------------------------
        // Verify Doctor
        // ----------------------------------------------------

        const staffType =
            String(
                data.staff_type || ""
            ).toUpperCase();


        if (staffType !== "DOCTOR") {

            console.error(
                "Current staff type:",
                staffType
            );

            showFormError(
                "Only doctors can manage availability."
            );

            return null;
        }


        // ----------------------------------------------------
        // Update current user
        // ----------------------------------------------------

        currentUser = {
            ...currentUser,
            ...data
        };


        // Store updated user information
        localStorage.setItem(
            "user",
            JSON.stringify(currentUser)
        );


        // Store current staff information
        currentStaff = {
            id: Number(data.staff_id),
            user_id: Number(data.id),
            staff_type: data.staff_type,
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name
        };


        console.log(
            "Doctor Staff ID found:",
            currentStaff.id
        );


        console.log(
            "Doctor Staff Type:",
            currentStaff.staff_type
        );


        return currentStaff.id;


    } catch (error) {

        console.error(
            "Error while getting doctor Staff ID:",
            error
        );


        showFormError(
            "Unable to identify your doctor staff profile."
        );


        return null;
    }
}


// ============================================================
// FILTERS
// ============================================================

function clearFilters() {

    const dayFilter =
        document.getElementById(
            "dayFilter"
        );

    const statusFilter =
        document.getElementById(
            "statusFilter"
        );


    if (dayFilter) {
        dayFilter.value = "";
    }


    if (statusFilter) {
        statusFilter.value = "";
    }


    renderAvailability();
}


// ============================================================
// FORM ERROR
// ============================================================

function showFormError(message) {

    const errorElement =
        document.getElementById(
            "formError"
        );


    if (!errorElement) {
        console.error(message);
        return;
    }


    errorElement.textContent =
        message;


    errorElement.classList.remove(
        "hidden"
    );
}


function hideFormError() {

    const errorElement =
        document.getElementById(
            "formError"
        );


    if (!errorElement) {
        return;
    }


    errorElement.textContent = "";

    errorElement.classList.add(
        "hidden"
    );
}


// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(time) {

    if (!time) {
        return "-";
    }


    const parts =
        String(time)
            .substring(0, 5)
            .split(":");


    let hour =
        Number(parts[0]);


    const minute =
        parts[1] || "00";


    const period =
        hour >= 12
            ? "PM"
            : "AM";


    if (hour === 0) {

        hour = 12;

    } else if (hour > 12) {

        hour -= 12;
    }


    return `${hour}:${minute} ${period}`;
}


// ============================================================
// CALCULATE DURATION
// ============================================================

function calculateDuration(
    startTime,
    endTime
) {

    if (
        !startTime ||
        !endTime
    ) {
        return "-";
    }


    const startParts =
        String(startTime)
            .substring(0, 5)
            .split(":")
            .map(Number);


    const endParts =
        String(endTime)
            .substring(0, 5)
            .split(":")
            .map(Number);


    const startMinutes =
        startParts[0] * 60 +
        startParts[1];


    const endMinutes =
        endParts[0] * 60 +
        endParts[1];


    const difference =
        endMinutes -
        startMinutes;


    if (difference <= 0) {
        return "-";
    }


    const hours =
        Math.floor(
            difference / 60
        );


    const minutes =
        difference % 60;


    if (hours && minutes) {

        return `${hours}h ${minutes}m`;
    }


    if (hours) {

        return `${hours}h`;
    }


    return `${minutes}m`;
}


// ============================================================
// GET INITIALS
// ============================================================

function getInitials(name) {

    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {
        return "D";
    }


    if (parts.length === 1) {

        return parts[0]
            .charAt(0)
            .toUpperCase();
    }


    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// API ERROR
// ============================================================

function extractApiError(data) {

    if (!data) {
        return "Something went wrong.";
    }


    if (typeof data === "string") {
        return data;
    }


    if (data.detail) {
        return data.detail;
    }


    const messages = [];


    Object.entries(data)
        .forEach(
            ([field, errors]) => {

                if (Array.isArray(errors)) {

                    messages.push(
                        `${field}: ${errors.join(", ")}`
                    );

                } else {

                    messages.push(
                        `${field}: ${errors}`
                    );
                }
            }
        );


    return (
        messages.join(" | ") ||
        "Unable to complete request."
    );
}


// ============================================================
// TABLE LOADING
// ============================================================

function showTableLoading() {

    const tbody =
        document.getElementById(
            "availabilityTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="loading-cell">
                Loading availability...
            </td>
        </tr>
    `;
}


// ============================================================
// TABLE ERROR
// ============================================================

function showTableError(message) {

    const tbody =
        document.getElementById(
            "availabilityTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="error-cell">
                ${escapeHtml(message)}
            </td>
        </tr>
    `;
}


// ============================================================
// TOAST
// ============================================================

function showToast(
    message,
    type = ""
) {

    const toast =
        document.getElementById(
            "toast"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    if (!toast) {
        return;
    }


    if (toastMessage) {

        toastMessage.textContent =
            message;

    } else {

        toast.textContent =
            message;
    }


    toast.className =
        `toast ${type} show`;


    setTimeout(
        function () {

            toast.className =
                "toast";

        },
        3000
    );
}


// ============================================================
// LOGOUT
// ============================================================

function logout() {

    console.log(
        "Logging out..."
    );


    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "refresh_token"
    );

    localStorage.removeItem(
        "user"
    );


    window.location.href =
        "../login.html";
}