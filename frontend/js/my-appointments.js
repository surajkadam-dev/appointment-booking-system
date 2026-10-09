const API_BASE_URL = "http://127.0.0.1:8000/api";

let appointments = [];
let currentFilter = "ALL";
let selectedAppointment = null;

const appointmentsList =
    document.getElementById("appointments-list");

const appointmentsLoading =
    document.getElementById("appointments-loading");

const appointmentsEmpty =
    document.getElementById("appointments-empty");

const appointmentsMessage =
    document.getElementById("appointments-message");

const logoutButton =
    document.getElementById("logout-btn");

const cancelModal =
    document.getElementById("cancel-modal");

const closeCancelModal =
    document.getElementById("close-cancel-modal");

const cancelModalCloseBtn =
    document.getElementById("cancel-modal-close-btn");

const confirmCancelBtn =
    document.getElementById("confirm-cancel-btn");

const cancellationReason =
    document.getElementById("cancellation-reason");

const cancelService =
    document.getElementById("cancel-service");

const cancelDate =
    document.getElementById("cancel-date");

const cancelError =
    document.getElementById("cancel-error");

const rescheduleModal =
    document.getElementById("reschedule-modal");

const closeRescheduleModal =
    document.getElementById("close-reschedule-modal");

const rescheduleModalCloseBtn =
    document.getElementById("reschedule-modal-close-btn");

const confirmRescheduleBtn =
    document.getElementById("confirm-reschedule-btn");

const rescheduleService =
    document.getElementById("reschedule-service");

const rescheduleDoctor =
    document.getElementById("reschedule-doctor");

const rescheduleDate =
    document.getElementById("reschedule-date");

const rescheduleTime =
    document.getElementById("reschedule-time");

const rescheduleError =
    document.getElementById("reschedule-error");

document.addEventListener("DOMContentLoaded", () => {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "../login.html";
        return;
    }

    setupFilters();
    setupLogout();
    setupCancelModal();
    setupRescheduleModal();
    loadAppointments();
});

function getAuthHeaders() {

    const token =
        localStorage.getItem("access_token");

    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

async function loadAppointments() {

    showLoading();
    clearMessage();

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load appointments.");
        }

        const data = await response.json();

        appointments =
            Array.isArray(data)
                ? data
                : data.results || [];

        hideLoading();
        renderAppointments();

    } catch (error) {

        console.error("Appointments loading error:", error);

        hideLoading();

        showMessage(
            "Unable to load your appointments. Please try again.",
            "error"
        );
    }
}

function setupFilters() {

    const filterButtons =
        document.querySelectorAll(".filter-btn");

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            filterButtons.forEach(item =>
                item.classList.remove("active")
            );

            button.classList.add("active");

            currentFilter = button.dataset.filter;

            renderAppointments();
        });
    });
}

function renderAppointments() {

    appointmentsList.innerHTML = "";
    appointmentsEmpty.hidden = true;

    let filtered = getFilteredAppointments();

    filtered.sort((a, b) => {

        const dateA =
            new Date(`${a.appointment_date}T${a.start_time}`);

        const dateB =
            new Date(`${b.appointment_date}T${b.start_time}`);

        return dateB - dateA;
    });

    if (filtered.length === 0) {
        appointmentsEmpty.hidden = false;
        return;
    }

    filtered.forEach(appointment => {

        const card = createAppointmentCard(appointment);
        appointmentsList.appendChild(card);
    });
}

function getFilteredAppointments() {

    if (currentFilter === "ALL") {
        return [...appointments];
    }

    if (currentFilter === "UPCOMING") {
        return appointments.filter(appointment =>
            isUpcoming(appointment)
        );
    }

    return appointments.filter(appointment =>
        appointment.status === currentFilter
    );
}

function isUpcoming(appointment) {

    if (
        appointment.status !== "SCHEDULED" &&
        appointment.status !== "RESCHEDULED"
    ) {
        return false;
    }

    const appointmentDateTime =
        new Date(`${appointment.appointment_date}T${appointment.start_time}`);

    return appointmentDateTime > new Date();
}

function createAppointmentCard(appointment) {

    const card =
        document.createElement("article");

    card.className = "appointment-card";

    const statusClass = getStatusClass(appointment.status);
    const statusText = formatStatus(appointment.status);

    const canManage =
        appointment.status === "SCHEDULED" ||
        appointment.status === "RESCHEDULED";

    const reason =
        appointment.reason && appointment.reason.trim()
            ? appointment.reason
            : null;

    const cancellation =
        appointment.cancellation_reason && appointment.cancellation_reason.trim()
            ? appointment.cancellation_reason
            : null;

    card.innerHTML = `

        <div class="appointment-main">

            <div class="appointment-top">

                <div>

                    <h2 class="appointment-service">
                        ${escapeHtml(appointment.service_name || "Service")}
                    </h2>

                    <p class="appointment-doctor">
                        Dr. ${escapeHtml(appointment.staff_name || "Assigned Staff")}
                    </p>

                </div>


                <span class="appointment-status ${statusClass}">
                    ${statusText}
                </span>

            </div>


            <div class="appointment-details">

                <div class="appointment-detail">

                    <span class="detail-label">Date</span>

                    <span class="detail-value">
                        ${formatDate(appointment.appointment_date)}
                    </span>

                </div>


                <div class="appointment-detail">

                    <span class="detail-label">Time</span>

                    <span class="detail-value">
                        ${formatTime(appointment.start_time)}
                        -
                        ${formatTime(appointment.end_time)}
                    </span>

                </div>


                <div class="appointment-detail">

                    <span class="detail-label">Duration</span>

                    <span class="detail-value">
                        ${appointment.service_duration || "—"} min
                    </span>

                </div>

            </div>


            ${
                reason
                    ? `
                        <div class="appointment-reason">
                            <strong>Reason:</strong>
                            ${escapeHtml(reason)}
                        </div>
                    `
                    : ""
            }


            ${
                cancellation
                    ? `
                        <div class="cancellation-reason">
                            <strong>Cancellation reason:</strong>
                            ${escapeHtml(cancellation)}
                        </div>
                    `
                    : ""
            }

        </div>


        <div class="appointment-actions">

            ${
                canManage
                    ? `
                        <button
                            type="button"
                            class="appointment-action-btn action-reschedule"
                            data-action="reschedule"
                            data-id="${appointment.id}"
                        >
                            Reschedule
                        </button>

                        <button
                            type="button"
                            class="appointment-action-btn action-cancel"
                            data-action="cancel"
                            data-id="${appointment.id}"
                        >
                            Cancel
                        </button>
                    `
                    : ""
            }

        </div>

    `;

    setupCardActions(card);

    return card;
}

function setupCardActions(card) {

    const buttons =
        card.querySelectorAll("[data-action]");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const appointmentId =
                Number(button.dataset.id);

            const action =
                button.dataset.action;

            const appointment =
                appointments.find(
                    item => Number(item.id) === appointmentId
                );

            if (!appointment) {
                return;
            }

            if (action === "cancel") {
                openCancelModal(appointment);
            }

            if (action === "reschedule") {
                openRescheduleModal(appointment);
            }
        });
    });
}

function setupCancelModal() {

    closeCancelModal.addEventListener("click", closeCancelDialog);
    cancelModalCloseBtn.addEventListener("click", closeCancelDialog);
    confirmCancelBtn.addEventListener("click", cancelAppointment);

    cancelModal.addEventListener("click", event => {

        if (event.target === cancelModal) {
            closeCancelDialog();
        }
    });
}

function openCancelModal(appointment) {

    selectedAppointment = appointment;

    cancelService.textContent =
        appointment.service_name || "Appointment";

    cancelDate.textContent =
        `${formatDate(appointment.appointment_date)} • ${formatTime(appointment.start_time)}`;

    cancellationReason.value = "";

    cancelError.hidden = true;
    cancelError.textContent = "";

    cancelModal.hidden = false;
}

function closeCancelDialog() {

    cancelModal.hidden = true;
    selectedAppointment = null;
}

async function cancelAppointment() {

    if (!selectedAppointment) {
        return;
    }

    const reason =
        cancellationReason.value.trim();

    if (!reason) {

        cancelError.textContent =
            "Cancellation reason is required.";

        cancelError.hidden = false;
        return;
    }

    confirmCancelBtn.disabled = true;
    confirmCancelBtn.textContent = "Cancelling...";

    cancelError.hidden = true;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/${selectedAppointment.id}/cancel/`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        cancellation_reason: reason
                    })
                }
            );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        closeCancelDialog();

        showMessage(
            "Appointment cancelled successfully.",
            "success"
        );

        await loadAppointments();

    } catch (error) {

        console.error("Cancellation error:", error);

        cancelError.textContent =
            error.message || "Unable to cancel appointment.";

        cancelError.hidden = false;

    } finally {

        confirmCancelBtn.disabled = false;
        confirmCancelBtn.textContent = "Cancel Appointment";
    }
}

function setupRescheduleModal() {

    closeRescheduleModal.addEventListener("click", closeRescheduleDialog);
    rescheduleModalCloseBtn.addEventListener("click", closeRescheduleDialog);
    confirmRescheduleBtn.addEventListener("click", rescheduleAppointment);

    rescheduleModal.addEventListener("click", event => {

        if (event.target === rescheduleModal) {
            closeRescheduleDialog();
        }
    });

    setMinimumRescheduleDate();
}

function openRescheduleModal(appointment) {

    selectedAppointment = appointment;

    rescheduleService.textContent =
        appointment.service_name || "Appointment";

    rescheduleDoctor.textContent =
        `Dr. ${appointment.staff_name || "Assigned Staff"}`;

    rescheduleDate.value = "";
    rescheduleTime.value = "";

    rescheduleError.hidden = true;
    rescheduleError.textContent = "";

    setMinimumRescheduleDate();

    rescheduleModal.hidden = false;
}

function closeRescheduleDialog() {

    rescheduleModal.hidden = true;
    selectedAppointment = null;
}

async function rescheduleAppointment() {

    if (!selectedAppointment) {
        return;
    }

    const date = rescheduleDate.value;
    const time = rescheduleTime.value;

    if (!date) {
        showRescheduleError("Please select a new date.");
        return;
    }

    if (!time) {
        showRescheduleError("Please select a new start time.");
        return;
    }

    confirmRescheduleBtn.disabled = true;
    confirmRescheduleBtn.textContent = "Rescheduling...";

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/${selectedAppointment.id}/reschedule/`,
                {
                    method: "PATCH",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        appointment_date: date,
                        start_time: time
                    })
                }
            );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        closeRescheduleDialog();

        showMessage(
            "Appointment rescheduled successfully.",
            "success"
        );

        await loadAppointments();

    } catch (error) {

        console.error("Reschedule error:", error);

        showRescheduleError(
            error.message || "Unable to reschedule appointment."
        );

    } finally {

        confirmRescheduleBtn.disabled = false;
        confirmRescheduleBtn.textContent = "Reschedule";
    }
}

function setMinimumRescheduleDate() {

    const today = new Date();

    const year = today.getFullYear();

    const month =
        String(today.getMonth() + 1).padStart(2, "0");

    const day =
        String(today.getDate()).padStart(2, "0");

    rescheduleDate.min = `${year}-${month}-${day}`;
}

function showRescheduleError(message) {

    rescheduleError.textContent = message;
    rescheduleError.hidden = false;
}

function getStatusClass(status) {

    switch (status) {

        case "SCHEDULED":
            return "status-scheduled";

        case "COMPLETED":
            return "status-completed";

        case "CANCELLED":
            return "status-cancelled";

        case "RESCHEDULED":
            return "status-rescheduled";

        default:
            return "";
    }
}

function formatStatus(status) {

    if (!status) {
        return "Unknown";
    }

    return status
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatDate(dateString) {

    if (!dateString) {
        return "—";
    }

    const [year, month, day] =
        dateString.split("-").map(Number);

    const date =
        new Date(year, month - 1, day);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatTime(time) {

    if (!time) {
        return "—";
    }

    const [hour, minute] = time.split(":");

    const hours = Number(hour);

    const suffix = hours >= 12 ? "PM" : "AM";

    const displayHour = hours % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
}

function extractErrorMessage(data) {

    if (!data) {
        return "Something went wrong.";
    }

    if (data.detail) {
        return data.detail;
    }

    if (Array.isArray(data.non_field_errors)) {
        return data.non_field_errors.join(" ");
    }

    const messages = [];

    Object.entries(data).forEach(([field, errors]) => {

        if (Array.isArray(errors)) {
            messages.push(errors.join(" "));
        } else {
            messages.push(String(errors));
        }
    });

    if (messages.length) {
        return messages.join(" ");
    }

    return "Unable to complete the request.";
}

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showLoading() {

    appointmentsLoading.hidden = false;
    appointmentsList.innerHTML = "";
    appointmentsEmpty.hidden = true;
}

function hideLoading() {

    appointmentsLoading.hidden = true;
}

function showMessage(message, type) {

    appointmentsMessage.textContent = message;

    appointmentsMessage.className =
        `appointments-message ${type}`;

    appointmentsMessage.hidden = false;
}

function clearMessage() {

    appointmentsMessage.textContent = "";

    appointmentsMessage.className = "appointments-message";

    appointmentsMessage.hidden = true;
}

function setupLogout() {

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", () => {

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");

        sessionStorage.removeItem("selected_service_id");

        window.location.href = "../login.html";
    });
}

function handleUnauthorized() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "../login.html";
}