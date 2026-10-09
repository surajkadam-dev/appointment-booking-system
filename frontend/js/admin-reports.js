"use strict";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("access_token");

let reportsLoading = false;
let monthlyLoading = false;
let peakHoursLoading = false;

document.addEventListener("DOMContentLoaded", () => {
    if (!checkAuthentication()) return;

    setupAdminName();
    initializeYear();
    initializePeakDate();
    setupEvents();
    setupExportButtons();
    loadReports();
});

function checkAuthentication() {
    if (!token) {
        window.location.href = "../login.html";
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    window.location.href = "../login.html";
}

function setupAdminName() {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const element = document.getElementById("adminName");

        if (!element) return;

        const fullName = user
            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
            : "";

        element.textContent = fullName || "Admin";
    } catch (error) {
        console.error("Unable to load admin name:", error);
    }
}

function initializeYear() {
    const select = document.getElementById("reportYear");
    if (!select) return;

    const currentYear = new Date().getFullYear();
    select.innerHTML = "";

    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
        const option = document.createElement("option");
        option.value = String(year);
        option.textContent = String(year);
        option.selected = year === currentYear;
        select.appendChild(option);
    }
}

function initializePeakDate() {
    const input = document.getElementById("peakDate");
    if (!input) return;

    const today = getLocalDateString(new Date());
    input.value = today;
    input.max = today;
}

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function setupEvents() {
    bindEvent("applyFilterBtn", "click", loadReports);
    bindEvent("clearFilterBtn", "click", clearFilter);
    bindEvent("refreshBtn", "click", loadReports);
    bindEvent("reportYear", "change", loadMonthlyReport);
    bindEvent("peakDate", "change", loadPeakHours);
    bindEvent("logoutBtn", "click", logout);

    const fromInput = document.getElementById("fromDate");
    const toInput = document.getElementById("toDate");

    if (fromInput && toInput) {
        fromInput.addEventListener("change", () => {
            if (fromInput.value) {
                toInput.min = fromInput.value;
            } else {
                toInput.removeAttribute("min");
            }

            validateDateRange();
        });

        toInput.addEventListener("change", () => {
            if (toInput.value) {
                fromInput.max = toInput.value;
            } else {
                fromInput.removeAttribute("max");
            }

            validateDateRange();
        });
    }

    document.addEventListener("click", async event => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const button = target.closest(
            "[data-report-endpoint], " +
            "[data-export-endpoint], " +
            "[data-export], " +
            ".report-download-btn"
        );

        if (!button) return;

        if (
            button.tagName === "A" &&
            button.hasAttribute("href") &&
            !button.hasAttribute("data-report-endpoint") &&
            !button.hasAttribute("data-export-endpoint") &&
            !button.hasAttribute("data-export") &&
            !button.classList.contains("report-download-btn")
        ) {
            return;
        }

        event.preventDefault();
        await handleExportButton(button);
    });
}

function bindEvent(id, eventName, callback) {
    const element = document.getElementById(id);

    if (element) {
        element.addEventListener(eventName, callback);
    }
}

function validateDateRange() {
    const from = getInputValue("fromDate");
    const to = getInputValue("toDate");

    if (from && to && from > to) {
        showError("From date cannot be after To date.");
        return false;
    }

    hideError();
    return true;
}

function getDateFilters() {
    return {
        from: getInputValue("fromDate"),
        to: getInputValue("toDate")
    };
}

function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : "";
}

function buildDateQuery(from, to) {
    const params = new URLSearchParams();

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const query = params.toString();
    return query ? `?${query}` : "";
}

function buildQuery(parameters = {}) {
    const params = new URLSearchParams();

    Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, String(value));
        }
    });

    const query = params.toString();
    return query ? `?${query}` : "";
}

function clearFilter() {
    const fromInput = document.getElementById("fromDate");
    const toInput = document.getElementById("toDate");

    if (fromInput) {
        fromInput.value = "";
        fromInput.removeAttribute("max");
    }

    if (toInput) {
        toInput.value = "";
        toInput.removeAttribute("min");
    }

    hideError();
    loadReports();
}

async function loadReports() {
    if (reportsLoading || !validateDateRange()) return;

    reportsLoading = true;

    const { from, to } = getDateFilters();

    hideError();
    showLoading();
    setButtonLoading("applyFilterBtn", true);
    setButtonLoading("refreshBtn", true);

    const reports = [
        () => loadDashboardReport(from, to),
        () => loadDailyReport(from, to),
        () => loadDoctorReport(from, to),
        () => loadServiceReport(from, to),
        () => loadCancellationReport(from, to),
        () => loadRevenueReport(from, to),
        () => loadMonthlyReport(),
        () => loadPeakHours()
    ];

    try {
        const results = await Promise.allSettled(
            reports.map(load => load())
        );

        const failedReports = results.filter(
            result => result.status === "rejected"
        );

        if (failedReports.length) {
            console.error(
                "Some reports failed:",
                failedReports.map(result => result.reason)
            );

            showError(
                `${failedReports.length} report section(s) could not load. ` +
                "Check the API response or refresh the page."
            );
        }
    } catch (error) {
        console.error("Reports error:", error);
        showError(error.message || "Unable to load reports.");
    } finally {
        reportsLoading = false;
        hideLoading();
        setButtonLoading("applyFilterBtn", false);
        setButtonLoading("refreshBtn", false);
    }
}

async function loadDashboardReport(from, to) {
    const query = buildDateQuery(from, to);
    const data = await apiRequest(
        `/reports/admin/dashboard/${query}`
    );

    const kpis = data.kpis || {};

    setText("totalAppointments", kpis.total_appointments ?? 0);
    setText("completedAppointments", kpis.completed ?? 0);
    setText("scheduledAppointments", kpis.scheduled ?? 0);
    setText("cancelledAppointments", kpis.cancelled ?? 0);

    setText(
        "completionRate",
        `${Number(kpis.completion_rate ?? 0)}%`
    );

    setText(
        "totalRevenue",
        formatCurrency(
            kpis.estimated_completed_service_value ?? 0
        )
    );
}

async function loadDailyReport(from, to) {
    if (!from || !to) {
        renderEmpty(
            "dailyTableBody",
            6,
            "Select both From and To dates to view the daily report."
        );
        return;
    }

    const data = await apiRequest(
        `/reports/admin/appointments/daily/${buildDateQuery(from, to)}`
    );

    const rows = data.data || [];
    const tbody = document.getElementById("dailyTableBody");

    if (!tbody) return;

    if (!rows.length) {
        renderEmpty(
            "dailyTableBody",
            6,
            "No appointments found for this period."
        );
        return;
    }

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td>${escapeHTML(formatDate(row.date))}</td>
            <td>${formatNumber(row.total)}</td>
            <td>${formatNumber(row.completed)}</td>
            <td>${formatNumber(row.scheduled)}</td>
            <td>${formatNumber(row.cancelled)}</td>
            <td>${formatNumber(row.rescheduled)}</td>
        </tr>
    `).join("");
}

async function loadMonthlyReport() {
    if (monthlyLoading) return;

    const year = getInputValue("reportYear");
    if (!year) return;

    monthlyLoading = true;

    try {
        const data = await apiRequest(
            `/reports/admin/appointments/monthly/${buildQuery({ year })}`
        );

        const rows = data.data || [];
        const tbody = document.getElementById("monthlyTableBody");

        if (!tbody) return;

        if (!rows.length) {
            renderEmpty(
                "monthlyTableBody",
                6,
                "No appointments found for this year."
            );
            return;
        }

        tbody.innerHTML = rows.map(row => `
            <tr>
                <td>${escapeHTML(row.month || "-")}</td>
                <td>${formatNumber(row.total)}</td>
                <td>${formatNumber(row.completed)}</td>
                <td>${formatNumber(row.scheduled)}</td>
                <td>${formatNumber(row.cancelled)}</td>
                <td>${formatNumber(row.rescheduled)}</td>
            </tr>
        `).join("");
    } catch (error) {
        renderEmpty("monthlyTableBody", 6, error.message);
        throw error;
    } finally {
        monthlyLoading = false;
    }
}

async function loadDoctorReport(from, to) {
    const data = await apiRequest(
        `/reports/admin/doctors/${buildDateQuery(from, to)}`
    );

    const sourceRows = data.data || [];
    const seenDoctors = new Set();

    const rows = sourceRows.filter(row => {
        const key = row.doctor_id ?? row.staff_id;

        if (key === undefined || key === null) return true;
        if (seenDoctors.has(String(key))) return false;

        seenDoctors.add(String(key));
        return true;
    });

    const tbody = document.getElementById("doctorTableBody");
    if (!tbody) return;

    if (!rows.length) {
        renderEmpty(
            "doctorTableBody",
            7,
            "No doctor appointment data."
        );
        return;
    }

    tbody.innerHTML = rows.map(row => {
        const total = Number(row.total_appointments ?? row.total ?? 0);
        const completed = Number(row.completed ?? 0);
        const completionRate = total
            ? (completed / total) * 100
            : 0;

        return `
            <tr>
                <td>${escapeHTML(
                    row.doctor_name || row.staff_name || "-"
                )}</td>
                <td>${formatNumber(total)}</td>
                <td>${formatNumber(completed)}</td>
                <td>${formatNumber(row.scheduled)}</td>
                <td>${formatNumber(row.cancelled)}</td>
                <td>${formatNumber(row.rescheduled)}</td>
                <td>${formatNumber(completionRate)}%</td>
            </tr>
        `;
    }).join("");
}

async function loadServiceReport(from, to) {
    const data = await apiRequest(
        `/reports/admin/services/${buildDateQuery(from, to)}`
    );

    const sourceRows = data.data || [];
    const seenServices = new Set();

    const rows = sourceRows.filter(row => {
        const key = row.service_id ?? row.service_name;

        if (key === undefined || key === null) return true;
        if (seenServices.has(String(key))) return false;

        seenServices.add(String(key));
        return true;
    });

    const tbody = document.getElementById("serviceTableBody");
    if (!tbody) return;

    if (!rows.length) {
        renderEmpty(
            "serviceTableBody",
            5,
            "No service data available."
        );
        return;
    }

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td>${escapeHTML(row.service_name || "-")}</td>
            <td>${formatNumber(row.appointments)}</td>
            <td>${formatNumber(row.completed)}</td>
            <td>${formatNumber(row.cancelled)}</td>
            <td>${formatCurrency(
                row.estimated_completed_service_value ?? row.revenue ?? 0
            )}</td>
        </tr>
    `).join("");
}

async function loadCancellationReport(from, to) {
    const data = await apiRequest(
        `/reports/admin/cancellations/${buildDateQuery(from, to)}`
    );

    setText(
        "reportCancelled",
        formatNumber(data.total_cancelled ?? 0)
    );

    setText(
        "reportCancellationRate",
        `${formatNumber(data.cancellation_rate ?? 0)}%`
    );

    const rows = data.by_doctor || data.by_staff || [];
    const tbody = document.getElementById("cancellationTableBody");

    if (!tbody) return;

    if (!rows.length) {
        renderEmpty(
            "cancellationTableBody",
            2,
            "No cancellations found."
        );
        return;
    }

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td>${escapeHTML(
                row.doctor_name || row.staff_name || "-"
            )}</td>
            <td>${formatNumber(row.cancelled)}</td>
        </tr>
    `).join("");
}

async function loadPeakHours() {
    if (peakHoursLoading) return;

    const date = getInputValue("peakDate");

    if (!date) {
        renderEmpty(
            "peakHoursTableBody",
            2,
            "Select a date to view peak hours."
        );
        return;
    }

    peakHoursLoading = true;

    try {
        const data = await apiRequest(
            `/reports/admin/peak-hours/${buildQuery({ date })}`
        );

        const rows = data.peak_hours || [];
        const tbody = document.getElementById("peakHoursTableBody");

        if (!tbody) return;

        if (!rows.length) {
            renderEmpty(
                "peakHoursTableBody",
                2,
                "No appointments found for this date."
            );
            return;
        }

        tbody.innerHTML = rows.map(row => `
            <tr>
                <td>${escapeHTML(row.hour || "-")}</td>
                <td>${formatNumber(row.appointments)}</td>
            </tr>
        `).join("");
    } finally {
        peakHoursLoading = false;
    }
}

async function loadRevenueReport(from, to) {
    const data = await apiRequest(
        `/reports/admin/revenue/${buildDateQuery(from, to)}`
    );

    setText(
        "revenueAppointments",
        formatNumber(data.completed_appointments ?? 0)
    );

    setText(
        "revenueTotal",
        formatCurrency(
            data.estimated_completed_service_value ?? 0
        )
    );

    setText(
        "revenueAverage",
        formatCurrency(
            data.average_service_value_per_completed_appointment ?? 0
        )
    );

    const rows = data.service_breakdown || [];
    const tbody = document.getElementById("revenueTableBody");

    if (!tbody) return;

    if (!rows.length) {
        renderEmpty(
            "revenueTableBody",
            3,
            "No completed service data available."
        );
        return;
    }

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td>${escapeHTML(row.service_name || "-")}</td>
            <td>${formatNumber(row.appointments)}</td>
            <td>${formatCurrency(
                row.estimated_service_value ?? 0
            )}</td>
        </tr>
    `).join("");
}

async function apiRequest(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        }
    });

    if (response.status === 401) {
        logout();
        throw new Error("Your session has expired. Please log in again.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.detail ||
            data.message ||
            `Request failed with status ${response.status}.`
        );
    }

    return data;
}

const EXPORT_ENDPOINTS = {
    exportDashboardBtn: "/reports/admin/dashboard/",
    exportDailyBtn: "/reports/admin/appointments/daily/",
    exportMonthlyBtn: "/reports/admin/appointments/monthly/",
    exportDoctorsBtn: "/reports/admin/doctors/",
    exportServicesBtn: "/reports/admin/services/",
    exportCancellationsBtn: "/reports/admin/cancellations/",
    exportPeakHoursBtn: "/reports/admin/peak-hours/",
    exportRevenueBtn: "/reports/admin/revenue/"
};

function setupExportButtons() {
    const exportButtons = document.querySelectorAll(
        "[data-report-endpoint], " +
        "[data-export-endpoint], " +
        "[data-export], " +
        ".report-download-btn"
    );

    exportButtons.forEach(button => {
        const hasEndpoint =
            button.dataset.reportEndpoint ||
            button.dataset.exportEndpoint ||
            button.dataset.export;

        if (!hasEndpoint) {
            const endpoint = EXPORT_ENDPOINTS[button.id];

            if (endpoint) {
                button.dataset.exportEndpoint = endpoint;
            }
        }
    });
}

function resolveExportEndpoint(endpoint) {
    if (!endpoint || typeof endpoint !== "string") return "";

    let path = endpoint.trim();
    if (!path) return "";

    path = path.split("?")[0].split("#")[0];

    if (!path.startsWith("/")) {
        path = `/${path}`;
    }

    if (path.startsWith("/reports/admin/")) return path;
    if (path.startsWith("/admin/")) return `/reports${path}`;
    if (path.startsWith("/reports/")) return path;

    if (
        path.startsWith("/appointments/") ||
        path.startsWith("/doctors/") ||
        path.startsWith("/services/") ||
        path.startsWith("/cancellations/") ||
        path.startsWith("/peak-hours/") ||
        path.startsWith("/revenue/") ||
        path.startsWith("/dashboard/")
    ) {
        return `/reports/admin${path}`;
    }

    return "";
}

async function handleExportButton(button) {
    const rawEndpoint =
        button.dataset.reportEndpoint ||
        button.dataset.exportEndpoint ||
        button.dataset.export ||
        EXPORT_ENDPOINTS[button.id];

    const endpoint = resolveExportEndpoint(rawEndpoint);

    if (!endpoint) {
        showToast(
            "This export button does not have a valid endpoint configured.",
            "error"
        );
        return;
    }

    if (button.dataset.exporting === "true") return;

    let exportUrl;

    try {
        exportUrl = buildExportUrl(endpoint);
    } catch (error) {
        showToast(error.message, "error");
        return;
    }

    const originalText = button.textContent;
    const wasDisabled = button.disabled;

    button.dataset.exporting = "true";
    button.disabled = true;
    button.textContent = "Preparing Excel...";

    try {
        const response = await fetch(exportUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, " +
                    "application/octet-stream, application/json"
            }
        });

        if (response.status === 401) {
            logout();
            throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(
                errorData.detail ||
                errorData.message ||
                `Excel export failed with status ${response.status}.`
            );
        }

        const contentType = response.headers.get("content-type") || "";

        if (
            contentType.includes("application/json") ||
            contentType.includes("text/html")
        ) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(
                errorData.detail ||
                errorData.message ||
                "The server did not return an Excel file."
            );
        }

        const blob = await response.blob();

        if (!blob.size) {
            throw new Error("The exported file is empty.");
        }

        const fallbackName =
            button.dataset.exportName ||
            button.dataset.reportName ||
            getDefaultFilename(endpoint);

        const filename = getDownloadFilename(response, fallbackName);

        downloadBlob(blob, filename);
        showToast("Excel report downloaded successfully.", "success");
    } catch (error) {
        console.error("Excel export error:", error);
        showToast(error.message || "Unable to export the report.", "error");
    } finally {
        button.disabled = wasDisabled;
        button.textContent = originalText;
        button.dataset.exporting = "false";
    }
}

function buildExportUrl(endpoint) {
    const normalizedEndpoint = resolveExportEndpoint(endpoint);

    if (!normalizedEndpoint) {
        throw new Error("The export endpoint is invalid.");
    }

    const url = new URL(
        `${API_BASE_URL}${normalizedEndpoint}`,
        window.location.origin
    );

    const { from, to } = getDateFilters();

    if (from && to && from > to) {
        throw new Error("From date cannot be after To date.");
    }

    if (from) url.searchParams.set("from", from);
    if (to) url.searchParams.set("to", to);

    if (normalizedEndpoint.includes("/appointments/monthly/")) {
        const year = getInputValue("reportYear");
        if (year) url.searchParams.set("year", year);
    }

    if (normalizedEndpoint.includes("/peak-hours/")) {
        const date = getInputValue("peakDate");
        if (date) url.searchParams.set("date", date);
    }

    url.searchParams.set("format", "xlsx");

    return url.toString();
}

function getDefaultFilename(endpoint) {
    const names = [
        ["/dashboard/", "dashboard-report"],
        ["/appointments/daily/", "daily-appointments"],
        ["/appointments/monthly/", "monthly-appointments"],
        ["/doctors/", "doctor-performance"],
        ["/services/", "service-utilization"],
        ["/cancellations/", "cancellation-report"],
        ["/peak-hours/", "peak-hours-report"],
        ["/revenue/", "revenue-report"]
    ];

    const match = names.find(([path]) => endpoint.includes(path));

    return match ? match[1] : "appointment-report";
}

function getDownloadFilename(response, fallbackName) {
    const disposition =
        response.headers.get("content-disposition") || "";

    const utf8Match = disposition.match(
        /filename\*=UTF-8''([^;]+)/i
    );

    if (utf8Match && utf8Match[1]) {
        try {
            return decodeURIComponent(utf8Match[1].trim());
        } catch {
            return ensureExcelExtension(fallbackName);
        }
    }

    const regularMatch = disposition.match(
        /filename="?([^";]+)"?/i
    );

    if (regularMatch && regularMatch[1]) {
        return regularMatch[1].trim();
    }

    return ensureExcelExtension(fallbackName);
}

function ensureExcelExtension(filename) {
    return filename.toLowerCase().endsWith(".xlsx")
        ? filename
        : `${filename}.xlsx`;
}

function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 1000);
}

function showLoading() {
    const element = document.getElementById("loadingState");

    if (element) {
        element.classList.remove("hidden");
    }
}

function hideLoading() {
    const element = document.getElementById("loadingState");

    if (element) {
        element.classList.add("hidden");
    }
}

function setButtonLoading(id, isLoading) {
    const button = document.getElementById(id);
    if (!button) return;

    if (isLoading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }

        button.disabled = true;
    } else {
        button.disabled = false;

        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

function showError(message) {
    const state = document.getElementById("errorState");
    const messageElement = document.getElementById("errorMessage");

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (state) {
        state.classList.remove("hidden");
    }
}

function hideError() {
    const state = document.getElementById("errorState");

    if (state) {
        state.classList.add("hidden");
    }
}

function showToast(message, type = "success") {
    let toast = document.getElementById("reportToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "reportToast";
        toast.className = "export-message";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");

        const pageContent = document.querySelector(".page-content");

        if (pageContent) {
            pageContent.prepend(toast);
        } else {
            document.body.appendChild(toast);
        }
    }

    toast.className = `export-message ${type}`;
    toast.textContent = message;
    toast.classList.remove("hidden");
}

function renderEmpty(id, colspan, message) {
    const tbody = document.getElementById(id);
    if (!tbody) return;

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = colspan;
    cell.className = "empty-row";
    cell.textContent = message;

    row.appendChild(cell);
    tbody.replaceChildren(row);
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = String(value ?? "");
    }
}

function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function formatCurrency(value) {
    const number = Number(value);
    const safeNumber = Number.isFinite(number) ? number : 0;

    return `₹${safeNumber.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatDate(value) {
    if (!value) return "-";

    const dateString = String(value);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }

    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

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