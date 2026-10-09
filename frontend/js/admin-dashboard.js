const API_BASE_URL = "http://127.0.0.1:8000/api";

let allAppointments = [];

document.addEventListener("DOMContentLoaded", () => {

    if (!checkAdminAuthentication()) {
        return;
    }

    loadAdminName();

    loadDashboardData();

    document
        .getElementById("logout-btn")
        .addEventListener("click", logout);
});

function checkAdminAuthentication() {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "../login.html";
        return false;
    }

    const storedUser =
        localStorage.getItem("user");

    if (storedUser) {

        try {

            const user =
                JSON.parse(storedUser);

            if (user.role !== "ADMIN") {

                redirectByRole(user.role);

                return false;
            }

        } catch (error) {

            console.error(
                "Invalid stored user data.",
                error
            );
        }
    }

    return true;
}

function redirectByRole(role) {

    if (role === "CUSTOMER") {
        window.location.href =
            "../customer/dashboard.html";

    } else if (role === "STAFF") {
        window.location.href =
            "../staff/dashboard.html";

    } else {
        window.location.href =
            "../login.html";
    }
}

function loadAdminName() {

    const storedUser =
        localStorage.getItem("user");

    if (!storedUser) {
        return;
    }

    try {

        const user =
            JSON.parse(storedUser);

        const fullName =
            `${user.first_name || ""} ${user.last_name || ""}`
                .trim();

        document.getElementById("admin-name").textContent =
            fullName || "Admin";

    } catch (error) {

        console.error(
            "Unable to load admin information.",
            error
        );
    }
}

async function loadDashboardData() {

    try {

        await Promise.all([
            loadCustomers(),
            loadStaff(),
            loadServices(),
            loadAppointments()
        ]);

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        showMessage(
            "Some dashboard information could not be loaded.",
            "error"
        );
    }
}

async function apiRequest(endpoint) {

    const token =
        localStorage.getItem("access_token");

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
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

    const data = await response.json();

    if (!response.ok) {

        throw new Error(
            data.detail ||
            "Unable to fetch dashboard data."
        );
    }

    return data;
}

async function loadCustomers() {

    const data =
        await apiRequest(
            "/accounts/customers/"
        );

    if (!data) {
        return;
    }

    const customers =
        data.results || data;

    document.getElementById(
        "total-customers"
    ).textContent =
        Array.isArray(customers)
            ? customers.length
            : data.count || 0;
}

async function loadStaff() {

    const data =
        await apiRequest(
            "/accounts/staff/"
        );

    if (!data) {
        return;
    }

    const staff =
        data.results || data;

    const staffList =
        Array.isArray(staff)
            ? staff
            : [];

    document.getElementById(
        "total-staff"
    ).textContent =
        Array.isArray(staff)
            ? staff.length
            : data.count || 0;

    const doctorCount =
        staffList.filter(
            staffMember =>
                staffMember.staff_type === "DOCTOR"
        ).length;

    document.getElementById(
        "total-doctors"
    ).textContent =
        doctorCount;
}

async function loadServices() {

    const data =
        await apiRequest(
            "/services/"
        );

    if (!data) {
        return;
    }

    const services =
        data.results || data;

    const serviceList =
        Array.isArray(services)
            ? services
            : [];

    const activeServices =
        serviceList.filter(
            service =>
                service.is_active === true
        );

    document.getElementById(
        "total-services"
    ).textContent =
        activeServices.length;
}

async function loadAppointments() {

    const data =
        await apiRequest(
            "/appointments/"
        );

    if (!data) {
        return;
    }

    allAppointments =
        data.results || data;

    if (!Array.isArray(allAppointments)) {
        allAppointments = [];
    }

    calculateAppointmentStatistics();

    renderRecentAppointments();
}

function calculateAppointmentStatistics() {

    const today =
        getTodayDateString();

    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    allAppointments.forEach(appointment => {

        if (
            appointment.appointment_date === today
            &&
            appointment.status !== "CANCELLED"
        ) {
            todayCount++;
        }

        if (
            appointment.status === "COMPLETED"
        ) {
            completedCount++;
        }

        if (
            appointment.status === "CANCELLED"
        ) {
            cancelledCount++;
        }

        if (
            (
                appointment.status === "SCHEDULED" ||
                appointment.status === "RESCHEDULED"
            )
            &&
            isFutureAppointment(appointment)
        ) {
            upcomingCount++;
        }

    });

    document.getElementById(
        "today-appointments"
    ).textContent =
        todayCount;

    document.getElementById(
        "upcoming-appointments"
    ).textContent =
        upcomingCount;

    document.getElementById(
        "completed-appointments"
    ).textContent =
        completedCount;

    document.getElementById(
        "cancelled-appointments"
    ).textContent =
        cancelledCount;
}

function renderRecentAppointments() {

    const loading =
        document.getElementById(
            "appointments-loading"
        );

    const empty =
        document.getElementById(
            "appointments-empty"
        );

    const wrapper =
        document.getElementById(
            "recent-appointments"
        );

    const tbody =
        document.getElementById(
            "appointments-table-body"
        );

    loading.classList.add("hidden");

    if (!allAppointments.length) {

        empty.classList.remove("hidden");
        wrapper.classList.add("hidden");

        return;
    }

    empty.classList.add("hidden");
    wrapper.classList.remove("hidden");

    const recentAppointments =
        [...allAppointments]
            .sort(
                (a, b) =>
                    new Date(b.created_at) -
                    new Date(a.created_at)
            )
            .slice(0, 8);

    tbody.innerHTML = "";

    recentAppointments.forEach(
        appointment => {

            const row =
                document.createElement("tr");

            const customerName =
                appointment.customer_name ||
                "Customer";

            const doctorName =
                appointment.staff_name ||
                "Staff";

            const doctorDisplay =
                appointment.staff_type === "DOCTOR"
                    ? `Dr. ${doctorName}`
                    : doctorName;

            row.innerHTML = `
                <td>
                    <span class="customer-name">
                        ${escapeHtml(customerName)}
                    </span>
                </td>

                <td>
                    <span class="doctor-name">
                        ${escapeHtml(doctorDisplay)}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        appointment.service_name ||
                        "-"
                    )}
                </td>

                <td>
                    ${formatDate(
                        appointment.appointment_date
                    )}
                </td>

                <td>
                    ${formatTime(
                        appointment.start_time
                    )}
                </td>

                <td>
                    <span class="table-status ${getStatusClass(
                        appointment.status
                    )}">
                        ${formatStatus(
                            appointment.status
                        )}
                    </span>
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}

function getTodayDateString() {

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isFutureAppointment(appointment) {

    const appointmentDateTime =
        new Date(
            `${appointment.appointment_date}T${appointment.start_time}`
        );

    return appointmentDateTime > new Date();
}

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function formatTime(timeString) {

    if (!timeString) {
        return "-";
    }

    const [hours, minutes] =
        timeString.split(":");

    const date =
        new Date();

    date.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
    );

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function formatStatus(status) {

    if (!status) {
        return "-";
    }

    return status
        .charAt(0)
        .toUpperCase()
        +
        status
            .slice(1)
            .toLowerCase();
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

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showMessage(message, type) {

    const element =
        document.getElementById(
            "dashboard-message"
        );

    element.textContent = message;

    element.className =
        `dashboard-message ${type}`;
}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    sessionStorage.removeItem(
        "selected_service_id"
    );

    window.location.href =
        "../login.html";
}