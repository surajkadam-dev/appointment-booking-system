const API_BASE_URL = "http://127.0.0.1:8000/api";

function getAccessToken() {
    return (
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token")
    );
}

function logout() {

    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");

    window.location.href = "../login.html";
}

async function apiRequest(endpoint) {

    const token = getAccessToken();

    if (!token) {
        window.location.href = "../login.html";
        return null;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });

    if (response.status === 401) {

        localStorage.removeItem("access_token");
        sessionStorage.removeItem("access_token");

        window.location.href = "../login.html";

        return null;
    }

    if (!response.ok) {

        throw new Error(
            `Request failed with status ${response.status}`
        );
    }

    return await response.json();
}

async function loadCustomerProfile() {

    try {

        const customer = await apiRequest(
            "/accounts/customer/me/"
        );

        if (!customer) return;

        const fullName =
            `${customer.first_name} ${customer.last_name}`.trim();

        document.getElementById("userName").textContent =
            fullName || customer.email;

        document.getElementById("welcomeName").textContent =
            customer.first_name || "there";

        if (fullName) {

            const initials =
                `${customer.first_name?.charAt(0) || ""}${customer.last_name?.charAt(0) || ""}`
                    .toUpperCase();

            document.getElementById("userAvatar").textContent =
                initials || "?";
        }

    } catch (error) {

        console.error(
            "Failed to load customer profile:",
            error
        );

        document.getElementById("userName").textContent =
            "Customer";

        document.getElementById("welcomeName").textContent =
            "there";
    }
}

function createAppointmentDateTime(appointment) {

    return new Date(
        `${appointment.appointment_date}T${appointment.start_time}`
    );
}

function formatDate(dateString) {

    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatTime(timeString) {

    const [hours, minutes] =
        timeString.split(":");

    const date = new Date();

    date.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
    );

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatStatus(status) {

    return status
        .charAt(0)
        .toUpperCase() +
        status.slice(1).toLowerCase();
}

async function loadAppointments() {

    try {

        const data = await apiRequest(
            "/appointments/"
        );

        if (!data) return;

        const appointments =
            Array.isArray(data)
                ? data
                : (data.results || []);

        const total =
            typeof data.count === "number"
                ? data.count
                : appointments.length;

        document.getElementById(
            "totalAppointments"
        ).textContent = total;

        const now = new Date();

        const upcoming =
            appointments
                .filter(appointment => {

                    if (
                        appointment.status !== "SCHEDULED" &&
                        appointment.status !== "RESCHEDULED"
                    ) {
                        return false;
                    }

                    return createAppointmentDateTime(
                        appointment
                    ) >= now;
                })
                .sort(
                    (a, b) =>
                        createAppointmentDateTime(a) -
                        createAppointmentDateTime(b)
                );

        const cancelled =
            appointments.filter(
                appointment =>
                    appointment.status === "CANCELLED"
            );

        document.getElementById(
            "upcomingAppointments"
        ).textContent = upcoming.length;

        document.getElementById(
            "cancelledAppointments"
        ).textContent = cancelled.length;

        renderNextAppointment(
            upcoming.length > 0
                ? upcoming[0]
                : null
        );

        renderUpcomingAppointments(
            upcoming.slice(0, 5)
        );

    } catch (error) {

        console.error(
            "Failed to load appointments:",
            error
        );

        document.getElementById(
            "nextAppointment"
        ).innerHTML = `
            <div class="empty-state">
                Unable to load appointment information.
            </div>
        `;

        document.getElementById(
            "upcomingAppointmentsTable"
        ).innerHTML = `
            <tr>
                <td colspan="5" class="table-message">
                    Unable to load appointments.
                </td>
            </tr>
        `;
    }
}

function renderNextAppointment(appointment) {

    const container =
        document.getElementById("nextAppointment");

    if (!appointment) {

        container.innerHTML = `
            <div class="empty-state">
                You do not have any upcoming appointments.
            </div>
        `;

        return;
    }

    container.innerHTML = `

        <div class="next-content">

            <div>

                <div class="next-service">
                    ${escapeHtml(appointment.service_name)}
                </div>

                <div class="next-details">

                    ${formatDate(appointment.appointment_date)}
                    &nbsp; · &nbsp;
                    ${formatTime(appointment.start_time)}
                    -
                    ${formatTime(appointment.end_time)}

                </div>

            </div>


            <div>

                <span class="status ${appointment.status.toLowerCase()}">
                    ${formatStatus(appointment.status)}
                </span>

            </div>

        </div>
    `;
}

function renderUpcomingAppointments(appointments) {

    const tbody =
        document.getElementById("upcomingAppointmentsTable");

    if (!appointments.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-message">
                    No upcoming appointments.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        appointments.map(appointment => `

            <tr>

                <td>
                    ${escapeHtml(appointment.service_name)}
                </td>

                <td>
                    ${formatDate(appointment.appointment_date)}
                </td>

                <td>
                    ${formatTime(appointment.start_time)}
                </td>

                <td>
                    ${escapeHtml(
                        appointment.staff_type
                            ? formatStaffType(appointment.staff_type)
                            : "Staff"
                    )}
                </td>

                <td>
                    <span class="status ${appointment.status.toLowerCase()}">
                        ${formatStatus(appointment.status)}
                    </span>
                </td>

            </tr>

        `).join("");
}

function formatStaffType(type) {

    return type
        .toLowerCase()
        .replace(
            /\b\w/g,
            character => character.toUpperCase()
        );
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

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const token = getAccessToken();

        if (!token) {

            window.location.href = "../login.html";
            return;
        }

        document
            .getElementById("logoutBtn")
            .addEventListener("click", logout);

        document
            .getElementById("bookAppointmentBtn")
            .addEventListener("click", () => {

                window.location.href = "book-appointment.html";
            });

        await Promise.all([
            loadCustomerProfile(),
            loadAppointments()
        ]);
    }
);