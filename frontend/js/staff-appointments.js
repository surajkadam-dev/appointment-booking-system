const API_BASE = "http://127.0.0.1:8000/api";

const token = localStorage.getItem("access_token");

let currentUser = null;
let staffType = "OTHER";

let appointments = [];

let filteredAppointments = [];

let currentPage = 1;

const PAGE_SIZE = 10;

document.addEventListener("DOMContentLoaded", async () => {

    checkAuthentication();

    loadUserInformation();

    setupEvents();

    setMinimumDates();

    await loadAppointments();

    if (staffType === "RECEPTIONIST") {

        await loadBookingData();

    }

});

function checkAuthentication() {

    if (!token) {

        window.location.href = "../login.html";

        return;

    }

    try {

        const storedUser =
            localStorage.getItem("user");

        if (storedUser) {

            currentUser =
                JSON.parse(storedUser);

        }

    } catch (error) {

        console.error(
            "Unable to read user data:",
            error
        );

    }

    if (
        currentUser &&
        currentUser.role &&
        currentUser.role !== "STAFF"
    ) {

        if (currentUser.role === "ADMIN") {

            window.location.href =
                "../admin/dashboard.html";

            return;

        }

        if (currentUser.role === "CUSTOMER") {

            window.location.href =
                "../customer/dashboard.html";

            return;

        }

    }

}

function loadUserInformation() {

    if (!currentUser) {

        return;

    }

    const firstName =
        currentUser.first_name || "";

    const lastName =
        currentUser.last_name || "";

    const fullName =
        `${firstName} ${lastName}`.trim() ||
        "Staff";

    staffType =
        String(
            currentUser.staff_type ||
            currentUser.staffType ||
            "OTHER"
        ).toUpperCase();

    const formattedType =
        formatStaffType(staffType);

    document.getElementById(
        "staffName"
    ).textContent = fullName;

    document.getElementById(
        "staffType"
    ).textContent = formattedType;

    document.getElementById(
        "staffSubtitle"
    ).textContent =
        `${formattedType} Appointment Management`;

    document.getElementById(
        "staffAvatar"
    ).textContent =
        getInitials(fullName);

    if (staffType !== "RECEPTIONIST") {

        document
            .querySelectorAll(".receptionist-only")
            .forEach(element => {

                element.style.display = "none";

            });

    }

}

function setupEvents() {

    const searchInput =
        document.getElementById("searchInput");

    const statusFilter =
        document.getElementById("statusFilter");

    const dateFilter =
        document.getElementById("dateFilter");

    searchInput.addEventListener(
        "input",
        applyFilters
    );

    statusFilter.addEventListener(
        "change",
        applyFilters
    );

    dateFilter.addEventListener(
        "change",
        applyFilters
    );

    document
        .getElementById("clearFiltersBtn")
        .addEventListener(
            "click",
            clearFilters
        );

    document
        .getElementById("previousBtn")
        .addEventListener(
            "click",
            previousPage
        );

    document
        .getElementById("nextBtn")
        .addEventListener(
            "click",
            nextPage
        );

    document
        .getElementById("logoutBtn")
        .addEventListener(
            "click",
            logout
        );

    const bookingButton =
        document.getElementById("bookAppointmentBtn");

    if (bookingButton) {

        bookingButton.addEventListener(
            "click",
            openBookingModal
        );

    }

    document
        .getElementById("cancelForm")
        .addEventListener(
            "submit",
            submitCancellation
        );

    document
        .getElementById("rescheduleForm")
        .addEventListener(
            "submit",
            submitReschedule
        );

    document
        .getElementById("bookingForm")
        .addEventListener(
            "submit",
            submitBooking
        );

    document
        .getElementById("confirmCompleteBtn")
        .addEventListener(
            "click",
            submitComplete
        );

    document
        .querySelectorAll("[data-close]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    closeModal(
                        button.dataset.close
                    );

                }
            );

        });

    document
        .querySelectorAll(".modal-overlay")
        .forEach(overlay => {

            overlay.addEventListener(
                "click",
                event => {

                    if (
                        event.target === overlay
                    ) {

                        overlay.classList.remove(
                            "show"
                        );

                    }

                }
            );

        });

}

async function loadAppointments() {

    try {

        showTableLoading();

        const response =
            await fetch(
                `${API_BASE}/appointments/`,
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

        if (!response.ok) {

            const errorData =
                await safeJson(response);

            throw new Error(
                getApiErrorMessage(
                    errorData,
                    "Unable to load appointments."
                )
            );

        }

        const data =
            await response.json();

        appointments =
            Array.isArray(data)
                ? data
                : (data.results || []);

        applyFilters();

    } catch (error) {

        console.error(
            "Load appointments error:",
            error
        );

        showTableError(
            error.message ||
            "Unable to load appointments."
        );

    }

}

function applyFilters() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .trim()
            .toLowerCase();

    const status =
        document
            .getElementById("statusFilter")
            .value;

    const date =
        document
            .getElementById("dateFilter")
            .value;

    filteredAppointments =
        appointments.filter(
            appointment => {

                const customer =
                    String(
                        appointment.customer_name || ""
                    ).toLowerCase();

                const service =
                    String(
                        appointment.service_name || ""
                    ).toLowerCase();

                const matchesSearch =
                    !search ||
                    customer.includes(search) ||
                    service.includes(search);

                const matchesStatus =
                    !status ||
                    appointment.status === status;

                const matchesDate =
                    !date ||
                    appointment.appointment_date === date;

                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesDate
                );

            }
        );

    currentPage = 1;

    updateStatistics();

    renderAppointments();

}

function clearFilters() {

    document
        .getElementById("searchInput")
        .value = "";

    document
        .getElementById("statusFilter")
        .value = "";

    document
        .getElementById("dateFilter")
        .value = "";

    applyFilters();

}

function updateStatistics() {

    document.getElementById(
        "totalCount"
    ).textContent =
        appointments.length;

    document.getElementById(
        "scheduledCount"
    ).textContent =
        appointments.filter(
            appointment =>
                appointment.status === "SCHEDULED" ||
                appointment.status === "RESCHEDULED"
        ).length;

    document.getElementById(
        "completedCount"
    ).textContent =
        appointments.filter(
            appointment =>
                appointment.status === "COMPLETED"
        ).length;

    document.getElementById(
        "cancelledCount"
    ).textContent =
        appointments.filter(
            appointment =>
                appointment.status === "CANCELLED"
        ).length;

}

function renderAppointments() {

    const tbody =
        document.getElementById("appointmentsBody");

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredAppointments.length / PAGE_SIZE
            )
        );

    if (currentPage > totalPages) {

        currentPage = totalPages;

    }

    const start =
        (currentPage - 1) * PAGE_SIZE;

    const end =
        start + PAGE_SIZE;

    const pageAppointments =
        filteredAppointments.slice(start, end);

    if (pageAppointments.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    No appointments found.
                </td>
            </tr>
        `;

        updatePagination();

        return;

    }

    tbody.innerHTML =
        pageAppointments
            .map(appointment =>
                createAppointmentRow(appointment)
            )
            .join("");

    updatePagination();

}

function createAppointmentRow(appointment) {

    const customer =
        escapeHtml(
            appointment.customer_name || "Customer"
        );

    const service =
        escapeHtml(
            appointment.service_name || "Service"
        );

    const date =
        formatDate(appointment.appointment_date);

    const time =
        `${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}`;

    const status =
        appointment.status || "SCHEDULED";

    const statusClass =
        status.toLowerCase();

    return `
        <tr>

            <td>
                <strong>${customer}</strong>
            </td>

            <td>${service}</td>

            <td>${date}</td>

            <td>${time}</td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${formatStatus(status)}
                </span>
            </td>

            <td>
                <div class="action-buttons">

                    <button
                        type="button"
                        class="action-btn view"
                        onclick="openViewModal(${appointment.id})"
                    >
                        View
                    </button>

                    ${
                        canReschedule(appointment)
                            ? `
                                <button
                                    type="button"
                                    class="action-btn edit"
                                    onclick="openRescheduleModal(${appointment.id})"
                                >
                                    Reschedule
                                </button>
                            `
                            : ""
                    }

                    ${
                        canComplete(appointment)
                            ? `
                                <button
                                    type="button"
                                    class="action-btn complete"
                                    onclick="openCompleteModal(${appointment.id})"
                                >
                                    Complete
                                </button>
                            `
                            : ""
                    }

                    ${
                        canCancel(appointment)
                            ? `
                                <button
                                    type="button"
                                    class="action-btn cancel"
                                    onclick="openCancelModal(${appointment.id})"
                                >
                                    Cancel
                                </button>
                            `
                            : ""
                    }

                </div>
            </td>

        </tr>
    `;

}

function canComplete(appointment) {

    return (
        staffType === "DOCTOR" &&
        (
            appointment.status === "SCHEDULED" ||
            appointment.status === "RESCHEDULED"
        )
    );

}

function canCancel(appointment) {

    return (
        (
            staffType === "DOCTOR" ||
            staffType === "RECEPTIONIST"
        ) &&
        (
            appointment.status === "SCHEDULED" ||
            appointment.status === "RESCHEDULED"
        )
    );

}

function canReschedule(appointment) {

    return (
        (
            staffType === "DOCTOR" ||
            staffType === "RECEPTIONIST"
        ) &&
        (
            appointment.status === "SCHEDULED" ||
            appointment.status === "RESCHEDULED"
        )
    );

}

async function openViewModal(id) {

    try {

        const appointment =
            await getAppointment(id);

        document.getElementById(
            "viewCustomer"
        ).textContent =
            appointment.customer_name || "-";

        document.getElementById(
            "viewService"
        ).textContent =
            appointment.service_name || "-";

        document.getElementById(
            "viewStaff"
        ).textContent =
            appointment.staff_name || "-";

        document.getElementById(
            "viewDate"
        ).textContent =
            formatDate(appointment.appointment_date);

        document.getElementById(
            "viewStartTime"
        ).textContent =
            formatTime(appointment.start_time);

        document.getElementById(
            "viewEndTime"
        ).textContent =
            formatTime(appointment.end_time);

        document.getElementById(
            "viewStatus"
        ).textContent =
            formatStatus(appointment.status);

        document.getElementById(
            "viewReason"
        ).textContent =
            appointment.reason || "-";

        document.getElementById(
            "viewCancellationReason"
        ).textContent =
            appointment.cancellation_reason || "-";

        openModal("viewModal");

    } catch (error) {

        showToast(
            error.message ||
            "Unable to load appointment."
        );

    }

}

function openCancelModal(id) {

    document.getElementById(
        "cancelAppointmentId"
    ).value = id;

    document.getElementById(
        "cancellationReason"
    ).value = "";

    openModal("cancelModal");

}

async function submitCancellation(event) {

    event.preventDefault();

    const id =
        document.getElementById(
            "cancelAppointmentId"
        ).value;

    const reason =
        document.getElementById(
            "cancellationReason"
        ).value.trim();

    if (!reason) {

        showToast(
            "Cancellation reason is required."
        );

        return;

    }

    try {

        const response =
            await fetch(
                `${API_BASE}/appointments/${id}/cancel/`,
                {
                    method: "POST",

                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        cancellation_reason: reason
                    })
                }
            );

        const data =
            await safeJson(response);

        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Unable to cancel appointment."
                )
            );

        }

        closeModal("cancelModal");

        showToast(
            "Appointment cancelled successfully."
        );

        await loadAppointments();

    } catch (error) {

        showToast(
            error.message ||
            "Unable to cancel appointment."
        );

    }

}

function openRescheduleModal(id) {

    document.getElementById(
        "rescheduleAppointmentId"
    ).value = id;

    document.getElementById(
        "rescheduleDate"
    ).value = "";

    document.getElementById(
        "rescheduleTime"
    ).value = "";

    showFormMessage(
        "rescheduleMessage",
        "",
        ""
    );

    openModal("rescheduleModal");

}

async function submitReschedule(event) {

    event.preventDefault();

    const id =
        document.getElementById(
            "rescheduleAppointmentId"
        ).value;

    const date =
        document.getElementById(
            "rescheduleDate"
        ).value;

    const time =
        document.getElementById(
            "rescheduleTime"
        ).value;

    if (!date || !time) {

        showFormMessage(
            "rescheduleMessage",
            "Date and start time are required.",
            "error"
        );

        return;

    }

    try {

        const response =
            await fetch(
                `${API_BASE}/appointments/${id}/reschedule/`,
                {
                    method: "POST",

                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        appointment_date: date,
                        start_time: time
                    })
                }
            );

        const data =
            await safeJson(response);

        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Unable to reschedule appointment."
                )
            );

        }

        closeModal("rescheduleModal");

        showToast(
            "Appointment rescheduled successfully."
        );

        await loadAppointments();

    } catch (error) {

        showFormMessage(
            "rescheduleMessage",
            error.message ||
            "Unable to reschedule appointment.",
            "error"
        );

    }

}

function openCompleteModal(id) {

    document.getElementById(
        "completeAppointmentId"
    ).value = id;

    openModal("completeModal");

}

async function submitComplete() {

    const id =
        document.getElementById(
            "completeAppointmentId"
        ).value;

    try {

        const response =
            await fetch(
                `${API_BASE}/appointments/${id}/complete/`,
                {
                    method: "POST",

                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

        const data =
            await safeJson(response);

        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Unable to complete appointment."
                )
            );

        }

        closeModal("completeModal");

        showToast(
            "Appointment completed successfully."
        );

        await loadAppointments();

    } catch (error) {

        showToast(
            error.message ||
            "Unable to complete appointment."
        );

    }

}

async function openBookingModal() {

    if (staffType !== "RECEPTIONIST") {

        return;

    }

    document.getElementById(
        "bookingForm"
    ).reset();

    showFormMessage(
        "bookingMessage",
        "",
        ""
    );

    openModal("bookingModal");

    await loadBookingData();

}

async function loadBookingData() {

    if (staffType !== "RECEPTIONIST") {

        return;

    }

    try {

        await Promise.all([
            loadCustomersForBooking(),
            loadServicesForBooking()
        ]);

    } catch (error) {

        console.error(
            "Booking data error:",
            error
        );

    }

}

async function loadCustomersForBooking() {

    const select =
        document.getElementById("bookingCustomer");

    select.innerHTML = `
        <option value="">
            Loading customers...
        </option>
    `;

    const response =
        await fetch(
            `${API_BASE}/accounts/customers/`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            getApiErrorMessage(
                data,
                "Unable to load customers."
            )
        );

    }

    const customers =
        Array.isArray(data)
            ? data
            : (data.results || []);

    select.innerHTML = `
        <option value="">
            Select customer
        </option>
    `;

    customers.forEach(customer => {

        const option =
            document.createElement("option");

        option.value = customer.id;

        const name =
            customer.name ||
            customer.full_name ||
            `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
            customer.user_name ||
            `Customer #${customer.id}`;

        option.textContent = name;

        select.appendChild(option);

    });

}

async function loadServicesForBooking() {

    const select =
        document.getElementById("bookingService");

    select.innerHTML = `
        <option value="">
            Loading services...
        </option>
    `;

    const response =
        await fetch(
            `${API_BASE}/services/`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            getApiErrorMessage(
                data,
                "Unable to load services."
            )
        );

    }

    const services =
        Array.isArray(data)
            ? data
            : (
                data.results ||
                data.services ||
                []
            );

    select.innerHTML = `
        <option value="">
            Select service
        </option>
    `;

    services
        .filter(service => service.is_active !== false)
        .forEach(service => {

            const option =
                document.createElement("option");

            option.value = service.id;

            option.textContent = service.name;

            select.appendChild(option);

        });

}

async function submitBooking(event) {

    event.preventDefault();

    if (staffType !== "RECEPTIONIST") {

        return;

    }

    const customer =
        document.getElementById("bookingCustomer").value;

    const service =
        document.getElementById("bookingService").value;

    const date =
        document.getElementById("bookingDate").value;

    const time =
        document.getElementById("bookingTime").value;

    const reason =
        document.getElementById("bookingReason").value.trim();

    if (
        !customer ||
        !service ||
        !date ||
        !time
    ) {

        showFormMessage(
            "bookingMessage",
            "Please fill all required fields.",
            "error"
        );

        return;

    }

    try {

        const staffId =
            await getCurrentStaffId();

        const response =
            await fetch(
                `${API_BASE}/appointments/staff-book/`,
                {
                    method: "POST",

                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        customer: Number(customer),

                        staff: staffId,

                        service: Number(service),

                        appointment_date: date,

                        start_time: time,

                        reason: reason || null

                    })
                }
            );

        const data =
            await safeJson(response);

        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Unable to book appointment."
                )
            );

        }

        closeModal("bookingModal");

        showToast(
            "Appointment booked successfully."
        );

        await loadAppointments();

    } catch (error) {

        showFormMessage(
            "bookingMessage",
            error.message ||
            "Unable to book appointment.",
            "error"
        );

    }

}

async function getCurrentStaffId() {

    if (
        currentUser &&
        currentUser.staff_id
    ) {

        return Number(currentUser.staff_id);

    }

    const response =
        await fetch(
            `${API_BASE}/accounts/staff/`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            getApiErrorMessage(
                data,
                "Unable to identify staff account."
            )
        );

    }

    const staffList =
        Array.isArray(data)
            ? data
            : (data.results || []);

    const currentEmail =
        String(currentUser?.email || "").toLowerCase();

    const currentStaff =
        staffList.find(staff => {

            const email =
                String(
                    staff.email ||
                    staff.user_email ||
                    staff.user?.email ||
                    ""
                ).toLowerCase();

            return (
                email &&
                email === currentEmail
            );

        });

    if (!currentStaff) {

        throw new Error(
            "Unable to identify your staff profile."
        );

    }

    return Number(currentStaff.id);

}

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.classList.add("show");

    }

}

function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.classList.remove("show");

    }

}

function updatePagination() {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredAppointments.length / PAGE_SIZE
            )
        );

    document.getElementById(
        "pageInfo"
    ).textContent =
        `Page ${currentPage} of ${totalPages}`;

    document.getElementById(
        "previousBtn"
    ).disabled =
        currentPage <= 1;

    document.getElementById(
        "nextBtn"
    ).disabled =
        currentPage >= totalPages;

}

function previousPage() {

    if (currentPage > 1) {

        currentPage--;

        renderAppointments();

    }

}

function nextPage() {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredAppointments.length / PAGE_SIZE
            )
        );

    if (currentPage < totalPages) {

        currentPage++;

        renderAppointments();

    }

}

function setMinimumDates() {

    const today = getLocalDateString();

    document.getElementById(
        "rescheduleDate"
    ).min = today;

    document.getElementById(
        "bookingDate"
    ).min = today;

}

function getLocalDateString() {

    const date = new Date();

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}

async function getAppointment(id) {

    const response =
        await fetch(
            `${API_BASE}/appointments/${id}/`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

    const data =
        await safeJson(response);

    if (!response.ok) {

        throw new Error(
            getApiErrorMessage(
                data,
                "Unable to load appointment."
            )
        );

    }

    return data;

}

async function safeJson(response) {

    try {

        return await response.json();

    } catch {

        return {};

    }

}

function getApiErrorMessage(data, fallback) {

    if (!data) {

        return fallback;

    }

    if (typeof data === "string") {

        return data;

    }

    if (data.detail) {

        return data.detail;

    }

    const messages = [];

    Object.keys(data).forEach(key => {

        const value = data[key];

        if (Array.isArray(value)) {

            messages.push(
                `${key}: ${value.join(", ")}`
            );

        } else if (typeof value === "string") {

            messages.push(
                `${key}: ${value}`
            );

        }

    });

    return messages.length
        ? messages.join(" | ")
        : fallback;

}

function showFormMessage(elementId, message, type) {

    const element =
        document.getElementById(elementId);

    if (!element) {

        return;

    }

    element.textContent = message;

    element.className = "form-message";

    if (message && type) {

        element.classList.add(type);

    }

}

function showTableLoading() {

    document.getElementById(
        "appointmentsBody"
    ).innerHTML = `
        <tr>
            <td colspan="6" class="loading-cell">
                Loading appointments...
            </td>
        </tr>
    `;

}

function showTableError(message) {

    document.getElementById(
        "appointmentsBody"
    ).innerHTML = `
        <tr>
            <td colspan="6" class="empty-cell">
                ${escapeHtml(message)}
            </td>
        </tr>
    `;

}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "../login.html";

}

function formatDate(date) {

    if (!date) {

        return "-";

    }

    const parts = date.split("-");

    if (parts.length !== 3) {

        return date;

    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}

function formatTime(time) {

    if (!time) {

        return "-";

    }

    const parts = time.split(":");

    let hour = parseInt(parts[0], 10);

    const minute = parts[1] || "00";

    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;

}

function formatStatus(status) {

    if (!status) {

        return "-";

    }

    return status
        .toLowerCase()
        .replace("_", " ")
        .replace(
            /\b\w/g,
            char => char.toUpperCase()
        );

}

function formatStaffType(type) {

    if (!type) {

        return "Staff";

    }

    return type
        .toLowerCase()
        .replace("_", " ")
        .replace(
            /\b\w/g,
            char => char.toUpperCase()
        );

}

function getInitials(name) {

    const parts =
        name.trim().split(/\s+/);

    if (!parts.length) {

        return "S";

    }

    if (parts.length === 1) {

        return parts[0].charAt(0).toUpperCase();

    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();

}

function escapeHtml(value) {

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

function showToast(message) {

    const toast = document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}