const API_BASE_URL = "http://127.0.0.1:8000/api";

let allAvailability = [];
let allDoctors = [];
let filteredAvailability = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let editMode = false;

const DAY_NAMES = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    3: "Thursday",
    4: "Friday",
    5: "Saturday",
    6: "Sunday"
};

document.addEventListener("DOMContentLoaded", async () => {

    setupEventListeners();

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "../login.html";
        return;
    }

    await initializePage();
});

async function initializePage() {

    try {

        const user = await getCurrentUser();

        if (!user) {
            logout();
            return;
        }

        console.log("Current user:", user);

        if (
            user.role !== "STAFF" ||
            user.staff_type !== "RECEPTIONIST"
        ) {

            redirectByRole(user);
            return;
        }

        localStorage.setItem(
            "currentUser",
            JSON.stringify(user)
        );

        updateUserInformation(user);

        await loadDoctors();
        await loadAvailability();

        populateDoctorDropdowns();
        applyFilters();

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

        showPageError(
            error.message ||
            "Failed to load doctor availability."
        );
    }
}

function setupEventListeners() {

    const addButton =
        document.getElementById("addAvailabilityBtn");

    if (addButton) {
        addButton.addEventListener("click", openAddModal);
    }

    const refreshButton =
        document.getElementById("refreshBtn");

    if (refreshButton) {
        refreshButton.addEventListener("click", refreshData);
    }

    const doctorFilter =
        document.getElementById("doctorFilter");

    if (doctorFilter) {
        doctorFilter.addEventListener("change", () => {
            currentPage = 1;
            applyFilters();
        });
    }

    const dayFilter =
        document.getElementById("dayFilter");

    if (dayFilter) {
        dayFilter.addEventListener("change", () => {
            currentPage = 1;
            applyFilters();
        });
    }

    const clearButton =
        document.getElementById("clearFiltersBtn");

    if (clearButton) {
        clearButton.addEventListener("click", clearFilters);
    }

    const previousButton =
        document.getElementById("prevPageBtn");

    if (previousButton) {
        previousButton.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderAvailability();
                renderPagination();
            }
        });
    }

    const nextButton =
        document.getElementById("nextPageBtn");

    if (nextButton) {
        nextButton.addEventListener("click", () => {

            const totalPages =
                Math.ceil(
                    filteredAvailability.length /
                    ITEMS_PER_PAGE
                );

            if (currentPage < totalPages) {
                currentPage++;
                renderAvailability();
                renderPagination();
            }
        });
    }

    const form =
        document.getElementById("availabilityForm");

    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }

    const closeButton =
        document.getElementById("closeModalBtn");

    if (closeButton) {
        closeButton.addEventListener("click", closeModal);
    }

    const cancelButton =
        document.getElementById("cancelModalBtn");

    if (cancelButton) {
        cancelButton.addEventListener("click", closeModal);
    }

    const logoutButton =
        document.getElementById("logoutBtn");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    const modal =
        document.getElementById("availabilityModal");

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
}

async function getCurrentUser() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        return null;
    }

    const response =
        await fetch(
            `${API_BASE_URL}/accounts/me/`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

    if (response.status === 401) {
        logout();
        return null;
    }

    if (!response.ok) {
        throw new Error("Unable to load current user.");
    }

    return await response.json();
}

function updateUserInformation(user) {

    const fullName =
        `${user.first_name || ""} ${user.last_name || ""}`
            .trim();

    const userName =
        document.getElementById("userName");

    if (userName) {
        userName.textContent =
            fullName || "Receptionist";
    }

    const userRole =
        document.getElementById("userRole");

    if (userRole) {
        userRole.textContent = "Receptionist";
    }

    const avatar =
        document.getElementById("userAvatar");

    if (avatar) {
        avatar.textContent = getInitials(fullName);
    }
}

async function loadDoctors() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        logout();
        return;
    }

    console.log("Loading doctors...");

    const response =
        await fetch(
            `${API_BASE_URL}/accounts/staff/`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

    if (response.status === 401) {
        logout();
        return;
    }

    if (response.status === 403) {
        throw new Error(
            "You do not have permission to view staff."
        );
    }

    if (!response.ok) {

        const error =
            await response.json().catch(() => ({}));

        throw new Error(
            extractAPIError(error) ||
            "Failed to load doctors."
        );
    }

    const data = await response.json();

    console.log("Staff API response:", data);

    let staffList = [];

    if (Array.isArray(data)) {
        staffList = data;
    } else if (Array.isArray(data.results)) {
        staffList = data.results;
    } else if (Array.isArray(data.data)) {
        staffList = data.data;
    }

    allDoctors =
        staffList.filter(staff => {

            const type =
                staff.staff_type ||
                staff.staffType ||
                staff.type;

            return type === "DOCTOR";
        });

    console.log("Doctors:", allDoctors);

    updateStatistics();
}

async function loadAvailability() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        logout();
        return;
    }

    console.log("Loading availability...");

    const response =
        await fetch(
            `${API_BASE_URL}/appointments/availability/`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

    if (response.status === 401) {
        logout();
        return;
    }

    if (response.status === 403) {
        throw new Error(
            "You do not have permission to view availability."
        );
    }

    if (!response.ok) {

        const error =
            await response.json().catch(() => ({}));

        throw new Error(
            extractAPIError(error) ||
            "Failed to load availability."
        );
    }

    const data = await response.json();

    console.log("Availability API response:", data);

    if (Array.isArray(data)) {
        allAvailability = data;
    } else if (Array.isArray(data.results)) {
        allAvailability = data.results;
    } else if (Array.isArray(data.data)) {
        allAvailability = data.data;
    } else {
        allAvailability = [];
    }

    console.log("Availability loaded:", allAvailability);

    updateStatistics();
}

function populateDoctorDropdowns() {

    const filter =
        document.getElementById("doctorFilter");

    const modalSelect =
        document.getElementById("doctor");

    if (filter) {

        filter.innerHTML = `
            <option value="">
                All Doctors
            </option>
        `;

        allDoctors.forEach(doctor => {

            const normalized = normalizeDoctor(doctor);

            filter.innerHTML += `
                <option value="${normalized.id}">
                    ${escapeHTML(normalized.name)}
                </option>
            `;
        });
    }

    if (modalSelect) {

        modalSelect.innerHTML = `
            <option value="">
                Select Doctor
            </option>
        `;

        allDoctors.forEach(doctor => {

            const normalized = normalizeDoctor(doctor);

            modalSelect.innerHTML += `
                <option value="${normalized.id}">
                    ${escapeHTML(normalized.name)}
                </option>
            `;
        });
    }
}

function normalizeDoctor(doctor) {

    const user = doctor.user || {};

    const firstName =
        doctor.first_name ||
        user.first_name ||
        "";

    const lastName =
        doctor.last_name ||
        user.last_name ||
        "";

    const name =
        doctor.name ||
        doctor.full_name ||
        `${firstName} ${lastName}`.trim() ||
        doctor.email ||
        "Unknown Doctor";

    return {
        id:
            doctor.id ||
            doctor.staff_id ||
            null,
        name,
        staffType:
            doctor.staff_type ||
            doctor.staffType ||
            doctor.type ||
            "DOCTOR"
    };
}

function applyFilters() {

    const doctorFilter =
        document.getElementById("doctorFilter");

    const dayFilter =
        document.getElementById("dayFilter");

    const doctorId =
        doctorFilter ? doctorFilter.value : "";

    const day =
        dayFilter ? dayFilter.value : "";

    filteredAvailability =
        allAvailability.filter(item => {

            const staffId =
                item.staff ||
                item.staff_id;

            const matchesDoctor =
                !doctorId ||
                String(staffId) === String(doctorId);

            const matchesDay =
                day === "" ||
                String(item.day_of_week) === String(day);

            return matchesDoctor && matchesDay;
        });

    currentPage = Math.min(
        currentPage,
        Math.max(
            1,
            Math.ceil(
                filteredAvailability.length /
                ITEMS_PER_PAGE
            )
        )
    );

    renderAvailability();
    renderPagination();
    updateStatistics();
}

function renderAvailability() {

    const tableBody =
        document.getElementById("availabilityTableBody");

    if (!tableBody) {
        console.error("#availabilityTableBody not found.");
        return;
    }

    const start =
        (currentPage - 1) * ITEMS_PER_PAGE;

    const end = start + ITEMS_PER_PAGE;

    const rows =
        filteredAvailability.slice(start, end);

    if (rows.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-cell"
                >
                    No doctor availability found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML =
        rows
            .map(availability =>
                renderAvailabilityRow(availability)
            )
            .join("");
}

function renderAvailabilityRow(availability) {

    const staffId =
        availability.staff ||
        availability.staff_id;

    const doctor =
        findDoctorById(staffId);

    let doctorName =
        availability.staff_name ||
        availability.doctor_name;

    if (!doctorName && doctor) {
        doctorName = normalizeDoctor(doctor).name;
    }

    doctorName =
        doctorName ||
        "Doctor #" + staffId;

    const staffType =
        availability.staff_type ||
        "DOCTOR";

    const dayName =
        availability.day_name ||
        DAY_NAMES[availability.day_of_week] ||
        "-";

    const isAvailable =
        availability.is_available !== false;

    return `
        <tr>

            <td>
                <div class="doctor-info">

                    <div class="doctor-avatar">
                        ${getInitials(doctorName)}
                    </div>

                    <div>
                        <div class="doctor-name">
                            ${escapeHTML(doctorName)}
                        </div>
                    </div>

                </div>
            </td>

            <td>
                <span class="staff-type">
                    ${formatStaffType(staffType)}
                </span>
            </td>

            <td>
                <strong>
                    ${escapeHTML(dayName)}
                </strong>
            </td>

            <td>
                ${formatTime(availability.start_time)}
            </td>

            <td>
                ${formatTime(availability.end_time)}
            </td>

            <td>
                <span
                    class="status-badge ${
                        isAvailable
                            ? "status-active"
                            : "status-inactive"
                    }"
                >
                    ${
                        isAvailable
                            ? "Available"
                            : "Not Available"
                    }
                </span>
            </td>

            <td>
                <div class="action-buttons">

                    <button
                        type="button"
                        class="action-btn edit-btn"
                        title="Edit"
                        onclick="editAvailability(${availability.id})"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        class="action-btn toggle-btn"
                        title="${
                            isAvailable
                                ? "Disable"
                                : "Enable"
                        }"
                        onclick="toggleAvailability(
                            ${availability.id},
                            ${isAvailable}
                        )"
                    >
                        ${
                            isAvailable
                                ? "⏸"
                                : "▶"
                        }
                    </button>

                    <button
                        type="button"
                        class="action-btn delete-btn"
                        title="Delete"
                        onclick="deleteAvailability(${availability.id})"
                    >
                        🗑
                    </button>

                </div>
            </td>

        </tr>
    `;
}

function openAddModal() {

    editMode = false;

    const modalTitle =
        document.getElementById("modalTitle");

    const modalSubtitle =
        document.getElementById("modalSubtitle");

    const form =
        document.getElementById("availabilityForm");

    if (form) {
        form.reset();
    }

    document.getElementById("availabilityId").value = "";

    if (modalTitle) {
        modalTitle.textContent = "Add Doctor Availability";
    }

    if (modalSubtitle) {
        modalSubtitle.textContent =
            "Add a weekly availability schedule.";
    }

    hideFormError();

    const modal =
        document.getElementById("availabilityModal");

    modal.classList.remove("hidden");
    modal.style.display = "flex";
}

function editAvailability(availabilityId) {

    const availability =
        allAvailability.find(item =>
            Number(item.id) === Number(availabilityId)
        );

    if (!availability) {
        showToast("Availability not found.", "error");
        return;
    }

    editMode = true;

    document.getElementById("availabilityId").value =
        availability.id;

    document.getElementById("doctor").value =
        availability.staff ||
        availability.staff_id ||
        "";

    document.getElementById("dayOfWeek").value =
        availability.day_of_week;

    document.getElementById("startTime").value =
        normalizeTime(availability.start_time);

    document.getElementById("endTime").value =
        normalizeTime(availability.end_time);

    document.getElementById("isAvailable").value =
        availability.is_available === false
            ? "false"
            : "true";

    document.getElementById("modalTitle").textContent =
        "Edit Doctor Availability";

    document.getElementById("modalSubtitle").textContent =
        "Update the doctor's weekly schedule.";

    hideFormError();

    const modal =
        document.getElementById("availabilityModal");

    modal.classList.remove("hidden");
    modal.style.display = "flex";
}

async function handleFormSubmit(event) {

    event.preventDefault();

    hideFormError();

    const doctor =
        document.getElementById("doctor").value;

    const day =
        document.getElementById("dayOfWeek").value;

    const startTime =
        document.getElementById("startTime").value;

    const endTime =
        document.getElementById("endTime").value;

    const isAvailable =
        document.getElementById("isAvailable").value === "true";

    if (!doctor) {
        showFormError("Please select a doctor.");
        return;
    }

    if (day === "") {
        showFormError("Please select a day.");
        return;
    }

    if (!startTime) {
        showFormError("Please select a start time.");
        return;
    }

    if (!endTime) {
        showFormError("Please select an end time.");
        return;
    }

    if (startTime >= endTime) {
        showFormError(
            "End time must be later than start time."
        );
        return;
    }

    const availabilityId =
        document.getElementById("availabilityId").value;

    const duplicate =
        allAvailability.find(item => {

            if (
                editMode &&
                String(item.id) === String(availabilityId)
            ) {
                return false;
            }

            const sameDoctor =
                String(item.staff || item.staff_id) ===
                String(doctor);

            const sameDay =
                String(item.day_of_week) === String(day);

            const sameStart =
                normalizeTime(item.start_time) === startTime;

            const sameEnd =
                normalizeTime(item.end_time) === endTime;

            return (
                sameDoctor &&
                sameDay &&
                sameStart &&
                sameEnd
            );
        });

    if (duplicate) {
        showFormError(
            "This availability already exists for the selected doctor."
        );
        return;
    }

    const payload = {
        staff: Number(doctor),
        day_of_week: Number(day),
        start_time: startTime + ":00",
        end_time: endTime + ":00",
        is_available: isAvailable
    };

    console.log("Availability payload:", payload);

    try {

        setSaveButtonLoading(true);

        const token =
            localStorage.getItem("access_token");

        let url =
            `${API_BASE_URL}/appointments/availability/`;

        let method = "POST";

        if (editMode && availabilityId) {

            url =
                `${API_BASE_URL}/appointments/availability/${availabilityId}/`;

            method = "PATCH";
        }

        const response =
            await fetch(url, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

        if (response.status === 401) {
            logout();
            return;
        }

        const data =
            await response.json().catch(() => ({}));

        console.log("Availability save response:", data);

        if (!response.ok) {
            throw new Error(
                extractAPIError(data) ||
                "Failed to save availability."
            );
        }

        showToast(
            editMode
                ? "Availability updated successfully."
                : "Availability created successfully.",
            "success"
        );

        closeModal();

        await loadAvailability();
        applyFilters();

    } catch (error) {

        console.error("Save availability error:", error);

        showFormError(
            error.message ||
            "Failed to save availability."
        );

    } finally {
        setSaveButtonLoading(false);
    }
}

async function toggleAvailability(availabilityId, currentStatus) {

    const availability =
        allAvailability.find(item =>
            Number(item.id) === Number(availabilityId)
        );

    if (!availability) {
        showToast("Availability not found.", "error");
        return;
    }

    const newStatus = !currentStatus;

    const confirmed =
        confirm(
            newStatus
                ? "Enable this availability slot?"
                : "Disable this availability slot?"
        );

    if (!confirmed) return;

    try {

        const token =
            localStorage.getItem("access_token");

        const payload = {
            staff: Number(
                availability.staff ||
                availability.staff_id
            ),
            day_of_week: Number(availability.day_of_week),
            start_time:
                normalizeTime(availability.start_time) + ":00",
            end_time:
                normalizeTime(availability.end_time) + ":00",
            is_available: newStatus
        };

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/availability/${availabilityId}/`,
                {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

        if (response.status === 401) {
            logout();
            return;
        }

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                extractAPIError(data) ||
                "Failed to update availability."
            );
        }

        showToast(
            newStatus
                ? "Availability enabled."
                : "Availability disabled.",
            "success"
        );

        await loadAvailability();
        applyFilters();

    } catch (error) {

        console.error("Toggle error:", error);

        showToast(
            error.message ||
            "Failed to update availability.",
            "error"
        );
    }
}

async function deleteAvailability(availabilityId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this availability?"
        );

    if (!confirmed) return;

    try {

        const token =
            localStorage.getItem("access_token");

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/availability/${availabilityId}/`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

        if (response.status === 401) {
            logout();
            return;
        }

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                extractAPIError(data) ||
                "Failed to delete availability."
            );
        }

        showToast(
            "Availability deleted successfully.",
            "success"
        );

        await loadAvailability();
        applyFilters();

    } catch (error) {

        console.error("Delete error:", error);

        showToast(
            error.message ||
            "Failed to delete availability.",
            "error"
        );
    }
}

function closeModal() {

    const modal =
        document.getElementById("availabilityModal");

    if (!modal) return;

    modal.classList.add("hidden");
    modal.style.display = "none";

    const form =
        document.getElementById("availabilityForm");

    if (form) {
        form.reset();
    }

    document.getElementById("availabilityId").value = "";

    editMode = false;

    hideFormError();
}

function clearFilters() {

    const doctorFilter =
        document.getElementById("doctorFilter");

    const dayFilter =
        document.getElementById("dayFilter");

    if (doctorFilter) doctorFilter.value = "";
    if (dayFilter) dayFilter.value = "";

    currentPage = 1;

    applyFilters();
}

async function refreshData() {

    try {

        const button =
            document.getElementById("refreshBtn");

        if (button) {
            button.disabled = true;
            button.textContent = "Refreshing...";
        }

        await loadDoctors();
        await loadAvailability();

        populateDoctorDropdowns();
        applyFilters();

        showToast(
            "Availability refreshed successfully.",
            "success"
        );

    } catch (error) {

        console.error("Refresh error:", error);

        showToast(
            error.message ||
            "Failed to refresh data.",
            "error"
        );

    } finally {

        const button =
            document.getElementById("refreshBtn");

        if (button) {
            button.disabled = false;
            button.textContent = "Refresh";
        }
    }
}

function updateStatistics() {

    const totalDoctors =
        document.getElementById("totalDoctors");

    const totalAvailability =
        document.getElementById("totalAvailability");

    const activeAvailability =
        document.getElementById("activeAvailability");

    const inactiveAvailability =
        document.getElementById("inactiveAvailability");

    if (totalDoctors) {
        totalDoctors.textContent = allDoctors.length;
    }

    if (totalAvailability) {
        totalAvailability.textContent =
            allAvailability.length;
    }

    const active =
        allAvailability.filter(item =>
            item.is_available !== false
        ).length;

    const inactive =
        allAvailability.length - active;

    if (activeAvailability) {
        activeAvailability.textContent = active;
    }

    if (inactiveAvailability) {
        inactiveAvailability.textContent = inactive;
    }
}

function renderPagination() {

    const previousButton =
        document.getElementById("prevPageBtn");

    const nextButton =
        document.getElementById("nextPageBtn");

    const pageInfo =
        document.getElementById("pageInfo");

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredAvailability.length /
                ITEMS_PER_PAGE
            )
        );

    if (previousButton) {
        previousButton.disabled = currentPage <= 1;
    }

    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
    }

    if (pageInfo) {
        pageInfo.textContent =
            `Page ${currentPage} of ${totalPages}`;
    }
}

function findDoctorById(doctorId) {

    return allDoctors.find(doctor => {

        const normalized = normalizeDoctor(doctor);

        return Number(normalized.id) === Number(doctorId);
    });
}

function normalizeTime(time) {

    if (!time) return "";

    return time.toString().substring(0, 5);
}

function formatTime(time) {

    if (!time) return "-";

    const normalized = normalizeTime(time);

    const parts = normalized.split(":");

    if (parts.length < 2) {
        return normalized;
    }

    let hour = parseInt(parts[0], 10);

    const minute = parts[1];

    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${ampm}`;
}

function formatStaffType(type) {

    switch (type) {

        case "DOCTOR":
            return "Doctor";

        case "RECEPTIONIST":
            return "Receptionist";

        case "OTHER":
            return "Other Staff";

        default:
            return type || "-";
    }
}

function getInitials(name) {

    if (!name) return "?";

    const words =
        name.trim().split(/\s+/);

    if (words.length === 1) {
        return words[0].charAt(0).toUpperCase();
    }

    return (
        words[0].charAt(0) +
        words[words.length - 1].charAt(0)
    ).toUpperCase();
}

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function extractAPIError(data) {

    if (!data) return "";

    if (
        data.non_field_errors &&
        Array.isArray(data.non_field_errors)
    ) {

        const message =
            data.non_field_errors.join(" ");

        if (
            message.includes("must make a unique set")
        ) {
            return "This availability already exists for the selected doctor.";
        }

        return message;
    }

    if (data.detail) return data.detail;

    for (const [field, errors] of Object.entries(data)) {

        if (Array.isArray(errors)) {
            return `${field}: ${errors.join(" ")}`;
        }

        if (typeof errors === "string") {
            return `${field}: ${errors}`;
        }
    }

    return "";
}

function showFormError(message) {

    const error =
        document.getElementById("formError");

    if (!error) return;

    error.textContent = message;
    error.classList.remove("hidden");
}

function hideFormError() {

    const error =
        document.getElementById("formError");

    if (!error) return;

    error.textContent = "";
    error.classList.add("hidden");
}

function setSaveButtonLoading(loading) {

    const button =
        document.getElementById("saveAvailabilityBtn");

    if (!button) return;

    if (loading) {

        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = "Saving...";

    } else {

        button.disabled = false;
        button.textContent =
            button.dataset.originalText ||
            "Save Availability";
    }
}

function showPageError(message) {

    const error =
        document.getElementById("pageError");

    if (!error) {
        console.error(message);
        return;
    }

    error.textContent = message;
    error.classList.remove("hidden");
}

function showToast(message, type = "success") {

    const toast =
        document.getElementById("toast");

    const toastMessage =
        document.getElementById("toastMessage");

    if (!toast) {
        console.log(message);
        return;
    }

    if (toastMessage) {
        toastMessage.textContent = message;
    }

    toast.className = `toast ${type}`;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

function redirectByRole(user) {

    if (!user) {
        logout();
        return;
    }

    if (user.role === "ADMIN") {
        window.location.href =
            "../admin/dashboard.html";
        return;
    }

    if (user.role === "CUSTOMER") {
        window.location.href =
            "../customer/dashboard.html";
        return;
    }

    if (user.role === "STAFF") {

        if (user.staff_type === "RECEPTIONIST") {
            return;
        }

        window.location.href =
            "../staff/dashboard.html";

        return;
    }

    logout();
}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentStaff");

    window.location.href = "../login.html";
}