const API_BASE_URL = "http://127.0.0.1:8000/api";

const accessToken =
    localStorage.getItem("access_token");

const loggedInUser =
    JSON.parse(
        localStorage.getItem("user") || "null"
    );

const urlParams =
    new URLSearchParams(window.location.search);

const staffId =
    urlParams.get("id");

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

let staff = null;
let availability = [];

document.addEventListener("DOMContentLoaded", () => {

    checkAdminAccess();

    setupAdminName();

    if (!staffId) {

        showToast("Staff ID is missing.", "error");
        return;
    }

    setupEvents();

    loadPage();
});

function checkAdminAccess() {

    if (!accessToken || !loggedInUser) {

        window.location.href = "../login.html";
        return;
    }

    if (loggedInUser.role !== "ADMIN") {

        window.location.href = "../index.html";
    }
}

function setupAdminName() {

    const element =
        document.getElementById("adminName");

    if (!element || !loggedInUser) return;

    const fullName =
        `${loggedInUser.first_name || ""} ${loggedInUser.last_name || ""}`.trim();

    element.textContent =
        fullName || "Admin";
}

function setupEvents() {

    document
        .getElementById("addAvailabilityBtn")
        .addEventListener(
            "click",
            () => openAddAvailability(0)
        );

    document
        .getElementById("closeModalBtn")
        .addEventListener("click", closeModal);

    document
        .getElementById("cancelModalBtn")
        .addEventListener("click", closeModal);

    document
        .getElementById("availabilityForm")
        .addEventListener("submit", saveAvailability);

    document
        .getElementById("logoutBtn")
        .addEventListener("click", logout);

    document
        .getElementById("availabilityModal")
        .addEventListener("click", (event) => {

            if (event.target.id === "availabilityModal") {
                closeModal();
            }
        });
}

async function loadPage() {

    try {

        await loadStaff();
        await loadAvailability();

    } catch (error) {

        console.error(error);

        showToast(
            error.message || "Unable to load page.",
            "error"
        );
    }
}

async function loadStaff() {

    const response =
        await fetch(
            `${API_BASE_URL}/accounts/staff/${staffId}/`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            }
        );

    if (response.status === 401) {
        logout();
        return;
    }

    if (response.status === 403) {

        throw new Error(
            "You do not have permission to view this staff member."
        );
    }

    if (response.status === 404) {
        throw new Error("Staff member not found.");
    }

    if (!response.ok) {
        throw new Error(
            "Unable to load staff information."
        );
    }

    staff = await response.json();

    renderStaff();
}

function renderStaff() {

    const firstName = staff.first_name || "";
    const lastName = staff.last_name || "";

    const fullName =
        `${firstName} ${lastName}`.trim();

    document
        .getElementById("staffName")
        .textContent = fullName || "Staff";

    document
        .getElementById("staffEmail")
        .textContent = staff.email || "";

    document
        .getElementById("staffType")
        .textContent =
        formatStaffType(staff.staff_type);

    const statusElement =
        document.getElementById("staffStatus");

    if (staff.is_active) {

        statusElement.textContent = "Active";
        statusElement.classList.remove("inactive");

    } else {

        statusElement.textContent = "Inactive";
        statusElement.classList.add("inactive");
    }

    document
        .getElementById("staffSubtitle")
        .textContent =
        `Manage working days and hours for ${fullName}.`;

    document
        .getElementById("staffAvatar")
        .textContent =
        getInitials(fullName);
}

async function loadAvailability() {

    const response =
        await fetch(
            `${API_BASE_URL}/appointments/availability/?staff=${staffId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            }
        );

    if (response.status === 401) {
        logout();
        return;
    }

    if (!response.ok) {
        throw new Error(
            "Unable to load staff availability."
        );
    }

    const data = await response.json();

    availability =
        Array.isArray(data)
            ? data
            : (data.results || []);

    renderSchedule();
}

function renderSchedule() {

    const container =
        document.getElementById("scheduleContainer");

    container.innerHTML = "";

    DAYS.forEach((dayName, dayIndex) => {

        const schedules =
            availability.filter(
                item =>
                    Number(item.day_of_week) === dayIndex
            );

        const row =
            document.createElement("div");

        row.className = "day-row";

        const scheduleHtml =
            schedules.length
                ? schedules.map(renderTimeSlot).join("")
                : `<span class="no-schedule">Not Available</span>`;

        row.innerHTML = `

            <div class="day-name">
                ${dayName}
            </div>

            <div class="day-content">
                ${scheduleHtml}
            </div>

            <button
                type="button"
                class="add-day-btn"
                onclick="openAddAvailability(${dayIndex})"
            >
                + Add Time
            </button>
        `;

        container.appendChild(row);
    });
}

function renderTimeSlot(item) {

    const disabled =
        item.is_available === false;

    return `

        <div class="time-slot ${disabled ? "disabled" : ""}">

            <span>
                ${formatTime(item.start_time)} - ${formatTime(item.end_time)}
                ${disabled ? "(Unavailable)" : ""}
            </span>

            <div class="time-slot-actions">

                <button
                    type="button"
                    class="small-btn"
                    onclick="openEditAvailability(${item.id})"
                >
                    Edit
                </button>

                <button
                    type="button"
                    class="small-btn delete"
                    onclick="deleteAvailability(${item.id})"
                >
                    Delete
                </button>

            </div>

        </div>
    `;
}

function openAddAvailability(dayIndex = 0) {

    document
        .getElementById("modalTitle")
        .textContent = "Add Availability";

    document
        .getElementById("availabilityId")
        .value = "";

    document
        .getElementById("dayOfWeek")
        .value = dayIndex;

    document
        .getElementById("startTime")
        .value = "09:00";

    document
        .getElementById("endTime")
        .value = "17:00";

    document
        .getElementById("isAvailable")
        .checked = true;

    hideModalError();

    document
        .getElementById("availabilityModal")
        .classList.remove("hidden");
}

function openEditAvailability(id) {

    const item =
        availability.find(
            entry =>
                Number(entry.id) === Number(id)
        );

    if (!item) {

        showToast(
            "Availability record not found.",
            "error"
        );

        return;
    }

    document
        .getElementById("modalTitle")
        .textContent = "Edit Availability";

    document
        .getElementById("availabilityId")
        .value = item.id;

    document
        .getElementById("dayOfWeek")
        .value = item.day_of_week;

    document
        .getElementById("startTime")
        .value = item.start_time.substring(0, 5);

    document
        .getElementById("endTime")
        .value = item.end_time.substring(0, 5);

    document
        .getElementById("isAvailable")
        .checked = item.is_available;

    hideModalError();

    document
        .getElementById("availabilityModal")
        .classList.remove("hidden");
}

function closeModal() {

    document
        .getElementById("availabilityModal")
        .classList.add("hidden");
}

async function saveAvailability(event) {

    event.preventDefault();

    const availabilityId =
        document.getElementById("availabilityId").value;

    const dayOfWeek =
        Number(
            document.getElementById("dayOfWeek").value
        );

    const startTime =
        document.getElementById("startTime").value;

    const endTime =
        document.getElementById("endTime").value;

    const isAvailable =
        document.getElementById("isAvailable").checked;

    if (!startTime || !endTime) {

        showModalError(
            "Start time and end time are required."
        );

        return;
    }

    if (startTime >= endTime) {

        showModalError(
            "End time must be later than start time."
        );

        return;
    }

    const duplicate =
        availability.find(
            item =>

                Number(item.day_of_week) === dayOfWeek &&

                Number(item.id) !==
                    Number(availabilityId) &&

                item.start_time.substring(0, 5) === startTime &&

                item.end_time.substring(0, 5) === endTime
        );

    if (duplicate) {

        showModalError(
            "This availability schedule already exists."
        );

        return;
    }

    const payload = {

        staff: Number(staffId),
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: isAvailable
    };

    const saveButton =
        document.getElementById("saveAvailabilityBtn");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {

        const url =
            availabilityId
                ? `${API_BASE_URL}/appointments/availability/${availabilityId}/`
                : `${API_BASE_URL}/appointments/availability/`;

        const method =
            availabilityId ? "PATCH" : "POST";

        const response =
            await fetch(url, {
                method: method,
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

        const data =
            await response.json().catch(() => ({}));

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {

            showModalError(extractApiError(data));
            return;
        }

        closeModal();

        showToast(
            availabilityId
                ? "Availability updated successfully."
                : "Availability added successfully.",
            "success"
        );

        await loadAvailability();

    } catch (error) {

        console.error("Save availability error:", error);

        showModalError(
            "Network error. Please try again."
        );

    } finally {

        saveButton.disabled = false;
        saveButton.textContent = "Save Availability";
    }
}

async function deleteAvailability(id) {

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this availability schedule?"
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/availability/${id}/`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`
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
            throw new Error(extractApiError(data));
        }

        showToast(
            "Availability deleted successfully.",
            "success"
        );

        await loadAvailability();

    } catch (error) {

        console.error("Delete availability error:", error);

        showToast(
            error.message ||
            "Unable to delete availability.",
            "error"
        );
    }
}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "../login.html";
}

function formatStaffType(type) {

    const types = {
        DOCTOR: "Doctor",
        RECEPTIONIST: "Receptionist",
        OTHER: "Other Staff"
    };

    return (
        types[type] ||
        type ||
        "Staff"
    );
}

function formatTime(time) {

    if (!time) return "--";

    const parts =
        time.substring(0, 5).split(":");

    let hour = Number(parts[0]);

    const minute = parts[1];

    const period =
        hour >= 12 ? "PM" : "AM";

    if (hour === 0) {
        hour = 12;
    } else if (hour > 12) {
        hour -= 12;
    }

    return `${hour}:${minute} ${period}`;
}

function getInitials(name) {

    const parts =
        name.trim().split(/\s+/).filter(Boolean);

    if (!parts.length) return "--";

    return parts
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");
}

function extractApiError(data) {

    if (!data) return "Something went wrong.";

    if (typeof data === "string") return data;

    if (data.detail) return data.detail;

    const messages = [];

    Object.entries(data).forEach(([field, errors]) => {

        if (Array.isArray(errors)) {
            messages.push(`${field}: ${errors.join(", ")}`);
        } else {
            messages.push(`${field}: ${errors}`);
        }
    });

    return (
        messages.join(" | ") ||
        "Unable to complete request."
    );
}

function showModalError(message) {

    const errorElement =
        document.getElementById("modalError");

    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
}

function hideModalError() {

    document
        .getElementById("modalError")
        .classList.add("hidden");
}

function showToast(message, type = "") {

    const toast = document.getElementById("toast");

    toast.textContent = message;

    toast.className = `toast show ${type}`;

    setTimeout(() => {

        toast.className = "toast";

    }, 3000);
}

window.openAddAvailability = openAddAvailability;
window.openEditAvailability = openEditAvailability;
window.deleteAvailability = deleteAvailability;