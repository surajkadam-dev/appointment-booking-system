
const API_BASE_URL = "http://127.0.0.1:8000/api";

let staffId = null;
let currentStaff = null;
let allServices = [];
let accessToken = localStorage.getItem("access_token");

const form = document.getElementById("staffDetailsForm");
const loadingState = document.getElementById("loadingState");
const pageMessage = document.getElementById("pageMessage");
const servicesContainer = document.getElementById("servicesContainer");
const servicesError = document.getElementById("servicesError");
const saveStaffBtn = document.getElementById("saveStaffBtn");
const toast = document.getElementById("toast");

document.addEventListener("DOMContentLoaded", initializePage);

async function initializePage() {
    staffId = new URLSearchParams(window.location.search).get("id");

    document.getElementById("logoutBtn").addEventListener("click", logout);
    form.addEventListener("submit", saveStaff);

    if (!accessToken) {
        redirectToLogin();
        return;
    }

    if (!staffId || !/^\d+$/.test(staffId)) {
        showPageMessage("Invalid staff ID. Return to the staff list and select a staff member.");
        loadingState.classList.add("hidden");
        return;
    }

    document.getElementById("staffIdLabel").textContent = `Staff ID: ${staffId}`;

    try {
        await verifyAdmin();
        await Promise.all([loadServices(), loadStaff()]);
    } catch (error) {
        showPageMessage(error.message || "Unable to load staff details.");
    } finally {
        loadingState.classList.add("hidden");
    }
}

async function apiRequest(path, options = {}) {
    accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
        redirectToLogin();
        throw new Error("Your session has expired. Please log in again.");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    if (response.status === 401) {
        logout();
        throw new Error("Your session has expired. Please log in again.");
    }

    const data = response.status === 204
        ? null
        : await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 403) {
            throw new Error("You do not have permission to edit staff.");
        }

        if (response.status === 404) {
            throw new Error("Staff member or requested resource was not found.");
        }

        throw new Error(formatApiErrors(data));
    }

    return data;
}

async function verifyAdmin() {
    const data = await apiRequest("/accounts/me/");
    const role = String(data.role || "").toUpperCase();

    if (role !== "ADMIN") {
        window.location.href = "dashboard.html";
        throw new Error("Only administrators can edit staff.");
    }

    const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
    document.getElementById("adminName").textContent = name || data.email || "Admin";
}

async function loadStaff() {
    const staff = await apiRequest(`/accounts/staff/${staffId}/`);

    currentStaff = staff;

    setFieldValue("first_name", staff.first_name);
    setFieldValue("last_name", staff.last_name);
    setFieldValue("email", staff.email);
    setFieldValue("phone", staff.phone);
    setFieldValue("staff_type", staff.staff_type);
    setFieldValue("designation", staff.designation);
    setFieldValue("department", staff.department);
    setFieldValue("is_active", staff.is_active);
    setFieldValue("is_available", staff.is_available);

    renderServices(staff.services || []);

    form.classList.remove("hidden");
}

async function loadServices() {
    const data = await apiRequest("/services/");
    allServices = Array.isArray(data) ? data : data.results || [];
    renderServices(currentStaff ? currentStaff.services || [] : []);
}

function renderServices(selectedServiceIds = []) {
    if (!allServices.length) {
        servicesContainer.innerHTML = '<p class="muted-text">No services are available.</p>';
        return;
    }

    const selectedIds = selectedServiceIds.map(service =>
        Number(typeof service === "object" ? service.id : service)
    );

    servicesContainer.innerHTML = allServices.map(service => {
        const selected = selectedIds.includes(Number(service.id));
        const name = escapeHtml(service.name || `Service #${service.id}`);
        const description = escapeHtml(service.description || "");
        const price = service.price !== undefined && service.price !== null
            ? `<small>Price: ${escapeHtml(String(service.price))}</small>`
            : "";

        return `
            <label class="service-option ${selected ? "selected" : ""}">
                <input
                    type="checkbox"
                    name="services"
                    value="${Number(service.id)}"
                    ${selected ? "checked" : ""}
                >
                <span>
                    <strong>${name}</strong>
                    ${description ? `<small>${description}</small>` : ""}
                    ${price}
                </span>
            </label>
        `;
    }).join("");

    servicesContainer.querySelectorAll('input[name="services"]').forEach(input => {
        input.addEventListener("change", () => {
            input.closest(".service-option").classList.toggle("selected", input.checked);
        });
    });
}

async function saveStaff(event) {
    event.preventDefault();
    hidePageMessage();
    servicesError.classList.add("hidden");

    if (!form.reportValidity()) {
        return;
    }

    const selectedServices = Array.from(
        form.querySelectorAll('input[name="services"]:checked')
    ).map(input => Number(input.value));

    const payload = {
        first_name: document.getElementById("first_name").value.trim(),
        last_name: document.getElementById("last_name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        staff_type: document.getElementById("staff_type").value,
        designation: document.getElementById("designation").value.trim(),
        department: document.getElementById("department").value.trim(),
        services: selectedServices,
        is_active: document.getElementById("is_active").value === "true",
        is_available: document.getElementById("is_available").value === "true"
    };

    if (!payload.first_name || !payload.last_name || !payload.email || !payload.phone) {
        showPageMessage("Please fill in all required fields.");
        return;
    }

    saveStaffBtn.disabled = true;
    saveStaffBtn.textContent = "Saving...";

    try {
        const result = await apiRequest(`/accounts/staff/${staffId}/`, {
            method: "PATCH",
            body: JSON.stringify(payload)
        });

        const updatedStaff = result && result.staff ? result.staff : result;
        const userFieldsSaved =
            updatedStaff &&
            updatedStaff.first_name === payload.first_name &&
            updatedStaff.last_name === payload.last_name &&
            updatedStaff.email === payload.email;

        const activeStatusSaved =
            updatedStaff &&
            updatedStaff.is_active === payload.is_active;

        await loadStaff();

        if (!userFieldsSaved || !activeStatusSaved) {
            showPageMessage(
                "Staff changes were submitted, but some user account fields may not have been saved. " +
                "Update StaffManagementSerializer to support first_name, last_name, email and is_active.",
                false
            );
            showToast("Some fields need a backend serializer update.", "error");
            return;
        }

        showPageMessage("Staff details updated successfully.", true);
        showToast("Staff details updated successfully.", "success");
    } catch (error) {
        showPageMessage(error.message || "Unable to update staff.");
        showToast(error.message || "Update failed.", "error");
    } finally {
        saveStaffBtn.disabled = false;
        saveStaffBtn.textContent = "Save Changes";
    }
}

function setFieldValue(id, value) {
    const field = document.getElementById(id);

    if (!field) {
        return;
    }

    if (field.tagName === "SELECT" && typeof value === "boolean") {
        field.value = String(value);
        return;
    }

    field.value = value === null || value === undefined ? "" : String(value);
}

function formatApiErrors(data) {
    if (!data || typeof data !== "object") {
        return "The request failed.";
    }

    if (typeof data.detail === "string") {
        return data.detail;
    }

    return Object.entries(data)
        .map(([field, errors]) => {
            const message = Array.isArray(errors)
                ? errors.join(", ")
                : typeof errors === "string"
                    ? errors
                    : JSON.stringify(errors);

            return `${field}: ${message}`;
        })
        .join(" | ") || "The request failed. Please check your input.";
}

function showPageMessage(message, success = false) {
    pageMessage.textContent = message;
    pageMessage.classList.remove("hidden", "success");

    if (success) {
        pageMessage.classList.add("success");
    }
}

function hidePageMessage() {
    pageMessage.textContent = "";
    pageMessage.classList.add("hidden");
    pageMessage.classList.remove("success");
}

function showToast(message, type = "") {
    toast.textContent = message;
    toast.className = `toast show ${type}`.trim();

    window.setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function redirectToLogin() {
    window.location.href = "../login.html";
}

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    redirectToLogin();
}
