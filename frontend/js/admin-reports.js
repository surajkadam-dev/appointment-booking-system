const API_BASE_URL = "http://127.0.0.1:8000/api";

const token =
    localStorage.getItem("access_token");

document.addEventListener("DOMContentLoaded", () => {

    if (!checkAuthentication()) return;

    setupAdminName();

    initializeYear();

    initializePeakDate();

    setupEvents();

    loadReports();
});

function checkAuthentication() {

    if (!token) {

        window.location.href = "../login.html";
        return false;
    }

    return true;
}

function setupAdminName() {

    try {

        const user =
            JSON.parse(
                localStorage.getItem("user") || "null"
            );

        if (!user) return;

        const element =
            document.getElementById("adminName");

        if (!element) return;

        const fullName =
            `${user.first_name || ""} ${user.last_name || ""}`.trim();

        element.textContent = fullName || "Admin";

    } catch (error) {

        console.error("Unable to load admin name:", error);
    }
}

function setupEvents() {

    document
        .getElementById("applyFilterBtn")
        .addEventListener("click", loadReports);

    document
        .getElementById("clearFilterBtn")
        .addEventListener("click", clearFilter);

    document
        .getElementById("refreshBtn")
        .addEventListener("click", loadReports);

    document
        .getElementById("reportYear")
        .addEventListener("change", loadMonthlyReport);

    document
        .getElementById("peakDate")
        .addEventListener("change", loadPeakHours);

    document
        .getElementById("logoutBtn")
        .addEventListener("click", logout);
}

function initializeYear() {

    const select =
        document.getElementById("reportYear");

    const currentYear =
        new Date().getFullYear();

    for (
        let year = currentYear - 5;
        year <= currentYear + 1;
        year++
    ) {

        const option =
            document.createElement("option");

        option.value = year;
        option.textContent = year;

        if (year === currentYear) {
            option.selected = true;
        }

        select.appendChild(option);
    }
}

function initializePeakDate() {

    const input =
        document.getElementById("peakDate");

    const today =
        new Date().toISOString().split("T")[0];

    input.value = today;
}

async function loadReports() {

    const from =
        document.getElementById("fromDate").value;

    const to =
        document.getElementById("toDate").value;

    if (from && to && from > to) {

        showError("From date cannot be after To date.");
        return;
    }

    hideError();

    showLoading();

    try {

        await Promise.all([
            loadDashboardReport(from, to),
            loadDailyReport(from, to),
            loadDoctorReport(from, to),
            loadServiceReport(from, to),
            loadCancellationReport(from, to),
            loadRevenueReport(from, to),
            loadMonthlyReport(),
            loadPeakHours()
        ]);

    } catch (error) {

        console.error("Reports error:", error);

        showError(
            error.message || "Unable to load reports."
        );

    } finally {

        hideLoading();
    }
}

async function loadDashboardReport(from, to) {

    const query = buildDateQuery(from, to);

    const data =
        await apiRequest(
            `/reports/admin/dashboard/${query}`
        );

    const kpis = data.kpis || {};

    document.getElementById("totalAppointments").textContent =
        kpis.total_appointments ?? 0;

    document.getElementById("completedAppointments").textContent =
        kpis.completed ?? 0;

    document.getElementById("scheduledAppointments").textContent =
        kpis.scheduled ?? 0;

    document.getElementById("cancelledAppointments").textContent =
        kpis.cancelled ?? 0;

    document.getElementById("completionRate").textContent =
        `${kpis.completion_rate ?? 0}%`;

    document.getElementById("totalRevenue").textContent =
        formatCurrency(kpis.total_revenue ?? 0);
}

async function loadDailyReport(from, to) {

    if (!from || !to) {

        renderEmpty(
            "dailyTableBody",
            6,
            "Select From and To dates."
        );

        return;
    }

    const query = buildDateQuery(from, to);

    const data =
        await apiRequest(
            `/reports/admin/appointments/daily/${query}`
        );

    const rows = data.data || [];

    const tbody =
        document.getElementById("dailyTableBody");

    if (!rows.length) {

        renderEmpty(
            "dailyTableBody",
            6,
            "No appointments found."
        );

        return;
    }

    tbody.innerHTML =
        rows.map(row => `

            <tr>
                <td>${formatDate(row.date)}</td>
                <td>${row.total ?? 0}</td>
                <td>${row.completed ?? 0}</td>
                <td>${row.scheduled ?? 0}</td>
                <td>${row.cancelled ?? 0}</td>
                <td>${row.rescheduled ?? 0}</td>
            </tr>

        `).join("");
}

async function loadMonthlyReport() {

    const year =
        document.getElementById("reportYear").value;

    const data =
        await apiRequest(
            `/reports/admin/appointments/monthly/?year=${year}`
        );

    const rows = data.data || [];

    const tbody =
        document.getElementById("monthlyTableBody");

    if (!rows.length) {

        renderEmpty(
            "monthlyTableBody",
            6,
            "No appointments found for this year."
        );

        return;
    }

    tbody.innerHTML =
        rows.map(row => `

            <tr>
                <td>${escapeHTML(row.month)}</td>
                <td>${row.total ?? 0}</td>
                <td>${row.completed ?? 0}</td>
                <td>${row.scheduled ?? 0}</td>
                <td>${row.cancelled ?? 0}</td>
                <td>${row.rescheduled ?? 0}</td>
            </tr>

        `).join("");
}

async function loadDoctorReport(from, to) {

    const query = buildDateQuery(from, to);

    const data =
        await apiRequest(
            `/reports/admin/doctors/${query}`
        );

    const rows = data.data || [];

    const tbody =
        document.getElementById("doctorTableBody");

    if (!rows.length) {

        renderEmpty(
            "doctorTableBody",
            7,
            "No doctor appointment data."
        );

        return;
    }

    tbody.innerHTML =
        rows.map(row => `

            <tr>
                <td>${escapeHTML(row.doctor_name || "-")}</td>
                <td>${row.total_appointments ?? 0}</td>
                <td>${row.completed ?? 0}</td>
                <td>${row.scheduled ?? 0}</td>
                <td>${row.cancelled ?? 0}</td>
                <td>${row.rescheduled ?? 0}</td>
                <td>${row.completion_rate ?? 0}%</td>
            </tr>

        `).join("");
}

async function loadServiceReport(from, to) {

    const query = buildDateQuery(from, to);

    const data =
        await apiRequest(
            `/reports/admin/services/${query}`
        );

    const rows = data.data || [];

    const tbody =
        document.getElementById("serviceTableBody");

    if (!rows.length) {

        renderEmpty(
            "serviceTableBody",
            5,
            "No service data."
        );

        return;
    }

    tbody.innerHTML =
        rows.map(row => `

            <tr>
                <td>${escapeHTML(row.service_name || "-")}</td>
                <td>${row.appointments ?? 0}</td>
                <td>${row.completed ?? 0}</td>
                <td>${row.cancelled ?? 0}</td>
                <td>${formatCurrency(row.revenue ?? 0)}</td>
            </tr>

        `).join("");
}

async function loadCancellationReport(from, to) {

    const query = buildDateQuery(from, to);

    const data =
        await apiRequest(
            `/reports/admin/cancellations/${query}`
        );

    document.getElementById("reportCancelled").textContent =
        data.total_cancelled ?? 0;

    document.getElementById("reportCancellationRate").textContent =
        `${data.cancellation_rate ?? 0}%`;

    const rows = data.by_doctor || [];

    const tbody =
        document.getElementById("cancellationTableBody");

    if (!rows.length) {

        renderEmpty(
            "cancellationTableBody",
            2,
            "No cancellations."
        );

        return;
    }

    tbody.innerHTML =
        rows.map(row => `

            <tr>
                <td>${escapeHTML(row.doctor_name || "-")}</td>
                <td>${row.cancelled ?? 0}</td>
            </tr>

        `).join("");
}

async function loadPeakHours() {

    const date =
        document.getElementById("peakDate").value;

    if (!date) return;

    const data =
        await apiRequest(
            `/reports/admin/peak-hours/?date=${date}`
        );

    const rows = data.peak_hours || [];

    const tbody =
        document.getElementById("peakHoursTableBody");

    if (!rows.length) {

        renderEmpty(
            "peakHoursTableBody",
            2,
            "No appointments for this date."
        );

        return;
    }

    tbody.innerHTML =
        rows.map(row => `

            <tr>
                <td>${escapeHTML(row.hour || "-")}</td>
                <td>${row.appointments ?? 0}</td>
            </tr>

        `).join("");
}

async function loadRevenueReport(from, to) {

    const query = buildDateQuery(from, to);

    const data =
        await apiRequest(
            `/reports/admin/revenue/${query}`
        );

    document.getElementById("revenueAppointments").textContent =
        data.completed_appointments ?? 0;

    document.getElementById("revenueTotal").textContent =
        formatCurrency(data.total_revenue ?? 0);

    document.getElementById("revenueAverage").textContent =
        formatCurrency(
            data.average_revenue_per_appointment ?? 0
        );

    const rows = data.service_breakdown || [];

    const tbody =
        document.getElementById("revenueTableBody");

    if (!rows.length) {

        renderEmpty(
            "revenueTableBody",
            3,
            "No revenue data."
        );

        return;
    }

    tbody.innerHTML =
        rows.map(row => `

            <tr>
                <td>${escapeHTML(row.service_name || "-")}</td>
                <td>${row.appointments ?? 0}</td>
                <td>${formatCurrency(row.revenue ?? 0)}</td>
            </tr>

        `).join("");
}

async function apiRequest(endpoint) {

    const response =
        await fetch(
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

        throw new Error("Your session has expired.");
    }

    const data =
        await response.json().catch(() => ({}));

    if (!response.ok) {

        throw new Error(
            data.detail || "Failed to load report."
        );
    }

    return data;
}

function buildDateQuery(from, to) {

    if (!from && !to) return "";

    const params = new URLSearchParams();

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    return `?${params.toString()}`;
}

function clearFilter() {

    document.getElementById("fromDate").value = "";
    document.getElementById("toDate").value = "";

    loadReports();
}

function showLoading() {

    document
        .getElementById("loadingState")
        .classList.remove("hidden");
}

function hideLoading() {

    document
        .getElementById("loadingState")
        .classList.add("hidden");
}

function showError(message) {

    const state =
        document.getElementById("errorState");

    document.getElementById("errorMessage").textContent =
        message;

    state.classList.remove("hidden");
}

function hideError() {

    document
        .getElementById("errorState")
        .classList.add("hidden");
}

function renderEmpty(id, colspan, message) {

    document.getElementById(id).innerHTML = `

        <tr>
            <td colspan="${colspan}" class="empty-row">
                ${escapeHTML(message)}
            </td>
        </tr>
    `;
}

function formatCurrency(value) {

    const number = Number(value) || 0;

    return `₹${number.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatDate(value) {

    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "../login.html";
}