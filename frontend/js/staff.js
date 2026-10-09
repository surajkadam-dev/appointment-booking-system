const API_BASE_URL = "http://127.0.0.1:8000/api";

let allStaff = [];
let allServices = [];
let serviceNameMap = {};
let filteredStaff = [];

document.addEventListener("DOMContentLoaded", async () => {
    checkAdminAccess();
    setupAdminName();
    setupEventListeners();

    await loadServices();
    await loadStaff();
});

function checkAdminAccess() {
    const token = localStorage.getItem("access_token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
        window.location.href = "../login.html";
        return;
    }

    try {
        const user = JSON.parse(userData);

        if (user.role !== "ADMIN") {
            alert("You do not have permission to access this page.");
            window.location.href = "../login.html";
        }
    } catch (error) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        window.location.href = "../login.html";
    }
}

function setupAdminName() {
    const userData = localStorage.getItem("user");

    if (!userData) return;

    try {
        const user = JSON.parse(userData);
        const fullName =
            `${user.first_name || ""} ${user.last_name || ""}`.trim();

        const adminName = document.getElementById("adminName");

        if (adminName) {
            adminName.textContent = fullName || "Admin";
        }
    } catch (error) {
        const adminName = document.getElementById("adminName");

        if (adminName) {
            adminName.textContent = "Admin";
        }
    }
}

function setupEventListeners() {
    document.getElementById("searchStaff")
        ?.addEventListener("input", applyFilters);

    document.getElementById("staffTypeFilter")
        ?.addEventListener("change", applyFilters);

    document.getElementById("staffStatusFilter")
        ?.addEventListener("change", applyFilters);

    document.getElementById("retryStaffBtn")
        ?.addEventListener("click", loadStaff);

    document.getElementById("logoutBtn")
        ?.addEventListener("click", logout);

    document.getElementById("closeStaffModal")
        ?.addEventListener("click", closeStaffModal);

    document.querySelector(".staff-modal-overlay")
        ?.addEventListener("click", closeStaffModal);
}

// Load service names so the staff page shows names instead of IDs.
async function loadServices() {
    const token = localStorage.getItem("access_token");

    try {
        const response = await fetch(`${API_BASE_URL}/services/`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load services.");
        }

        const data = await response.json();

        allServices = Array.isArray(data)
            ? data
            : data.results || [];

        serviceNameMap = {};

        allServices.forEach(service => {
            serviceNameMap[String(service.id)] = service.name;
        });
    } catch (error) {
        console.error("Service loading error:", error);
        allServices = [];
        serviceNameMap = {};
    }
}

function getServiceName(service) {
    if (service && typeof service === "object") {
        if (service.name) {
            return service.name;
        }

        return serviceNameMap[String(service.id)] ||
            `Service #${service.id}`;
    }

    return serviceNameMap[String(service)] ||
        `Service #${service}`;
}

async function loadStaff() {
    showLoading();
    hideError();

    try {
        const token = localStorage.getItem("access_token");

        const response = await fetch(
            `${API_BASE_URL}/accounts/staff/`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (response.status === 403) {
            throw new Error("You do not have permission to view staff.");
        }

        if (!response.ok) {
            throw new Error(
                `Unable to load staff. Server returned ${response.status}.`
            );
        }

        const data = await response.json();

        allStaff = Array.isArray(data)
            ? data
            : data.results || [];

        updateStats();
        applyFilters();
    } catch (error) {
        console.error("Staff loading error:", error);

        showError(error.message || "Unable to load staff.");
    }
}

function updateStats() {
    const total = allStaff.length;

    const doctors = allStaff.filter(
        staff => staff.staff_type === "DOCTOR"
    ).length;

    const receptionists = allStaff.filter(
        staff => staff.staff_type === "RECEPTIONIST"
    ).length;

    const active = allStaff.filter(
        staff => staff.is_active === true
    ).length;

    const totalStaff = document.getElementById("totalStaff");
    const totalDoctors = document.getElementById("totalDoctors");
    const totalReceptionists =
        document.getElementById("totalReceptionists");
    const activeStaff = document.getElementById("activeStaff");

    if (totalStaff) totalStaff.textContent = total;
    if (totalDoctors) totalDoctors.textContent = doctors;
    if (totalReceptionists) totalReceptionists.textContent = receptionists;
    if (activeStaff) activeStaff.textContent = active;
}

function applyFilters() {
    const search = document.getElementById("searchStaff")
        ?.value.trim().toLowerCase() || "";

    const type = document.getElementById("staffTypeFilter")?.value || "ALL";
    const status = document.getElementById("staffStatusFilter")?.value || "ALL";

    filteredStaff = allStaff.filter(staff => {
        const name = staff.name ||
            `${staff.first_name || ""} ${staff.last_name || ""}`.trim();

        const serviceNames = (Array.isArray(staff.services)
            ? staff.services
            : []).map(getServiceName).join(" ");

        const searchableText = [
            name,
            staff.email,
            staff.phone,
            staff.department,
            staff.designation,
            serviceNames
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search || searchableText.includes(search);

        const matchesType =
            type === "ALL" || staff.staff_type === type;

        const matchesStatus =
            status === "ALL" ||
            (status === "ACTIVE" && staff.is_active === true) ||
            (status === "INACTIVE" && staff.is_active === false);

        return matchesSearch && matchesType && matchesStatus;
    });

    renderStaff();
}

function renderStaff() {
    const tableBody = document.getElementById("staffTableBody");

    if (!tableBody) return;

    hideLoading();

    if (filteredStaff.length === 0) {
        tableBody.innerHTML = "";
        showEmpty();
        return;
    }

    hideEmpty();

    tableBody.innerHTML = filteredStaff
        .map(staff => createStaffRow(staff))
        .join("");

    document.querySelectorAll(".view-staff-btn").forEach(button => {
        button.addEventListener("click", () => {
            viewStaff(Number(button.dataset.id));
        });
    });

    document.querySelectorAll(".edit-staff-btn").forEach(button => {
        button.addEventListener("click", () => {
            editStaff(Number(button.dataset.id));
        });
    });

    document.querySelectorAll(".delete-staff-btn").forEach(button => {
        button.addEventListener("click", () => {
            deleteStaff(Number(button.dataset.id));
        });
    });
}

function createStaffRow(staff) {
    const name = staff.name ||
        `${staff.first_name || ""} ${staff.last_name || ""}`.trim() ||
        "Unnamed Staff";

    const initials = getInitials(name);
    const staffType = formatStaffType(staff.staff_type);
    const typeClass = getStaffTypeClass(staff.staff_type);

    const services = Array.isArray(staff.services)
        ? staff.services
        : [];

    const servicesHtml = services.length > 0
        ? `<div class="services-list">
            ${services.map(service => `
                <span class="service-tag">
                    ${escapeHtml(getServiceName(service))}
                </span>
            `).join("")}
           </div>`
        : `<span class="no-services">No services</span>`;

    const availabilityHtml = staff.is_available
        ? `<span class="availability-badge availability-available">
               <span class="availability-dot"></span>
               Available
           </span>`
        : `<span class="availability-badge availability-unavailable">
               <span class="availability-dot"></span>
               Unavailable
           </span>`;

    const statusHtml = staff.is_active
        ? `<span class="status-badge status-active">Active</span>`
        : `<span class="status-badge status-inactive">Inactive</span>`;

    return `
        <tr>
            <td>
                <div class="staff-person">
                    <div class="staff-avatar">
                        ${escapeHtml(initials)}
                    </div>
                    <div class="staff-person-info">
                        <div class="staff-person-name">
                            ${escapeHtml(name)}
                        </div>
                        <div class="staff-person-email">
                            ${escapeHtml(staff.email || "-")}
                        </div>
                    </div>
                </div>
            </td>

            <td>
                <span class="staff-type-badge ${typeClass}">
                    ${escapeHtml(staffType)}
                </span>
            </td>

            <td>
                <div>${escapeHtml(staff.department || "-")}</div>
                ${staff.designation ? `
                    <div style="margin-top: 4px; color: #94a3b8; font-size: 11px;">
                        ${escapeHtml(staff.designation)}
                    </div>
                ` : ""}
            </td>

            <td>${servicesHtml}</td>
            <td>${availabilityHtml}</td>
            <td>${statusHtml}</td>

            <td>
                <div class="staff-actions">
                    <button type="button"
                        class="action-btn view view-staff-btn"
                        data-id="${staff.id}">
                        View
                    </button>

                    <button type="button"
                        class="action-btn edit edit-staff-btn"
                        data-id="${staff.id}">
                        Edit
                    </button>

                    <button type="button"
                        class="action-btn"
                        onclick="manageAvailability(${staff.id})">
                        Schedule
                    </button>

                    <button type="button"
                        class="action-btn delete delete-staff-btn"
                        data-id="${staff.id}">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function manageAvailability(staffId) {
    window.location.href = `staff-availability.html?id=${staffId}`;
}

function viewStaff(staffId) {
    const staff = allStaff.find(
        item => Number(item.id) === Number(staffId)
    );

    if (!staff) {
        alert("Staff member not found.");
        return;
    }

    const name = staff.name ||
        `${staff.first_name || ""} ${staff.last_name || ""}`.trim();

    const initials = getInitials(name);

    const services = Array.isArray(staff.services)
        ? staff.services
        : [];

    const servicesHtml = services.length > 0
        ? services.map(service => `
            <span class="service-tag">
                ${escapeHtml(getServiceName(service))}
            </span>
        `).join("")
        : `<span class="no-services">No services assigned</span>`;

    const modalBody = document.getElementById("staffModalBody");

    if (!modalBody) return;

    modalBody.innerHTML = `
        <div class="detail-header">
            <div class="detail-avatar">${escapeHtml(initials)}</div>
            <div>
                <h3>${escapeHtml(name)}</h3>
                <p>${escapeHtml(formatStaffType(staff.staff_type))}</p>
            </div>
        </div>

        <div class="detail-grid">
            <div>
                <div class="detail-item-label">Email</div>
                <div class="detail-item-value">
                    ${escapeHtml(staff.email || "-")}
                </div>
            </div>

            <div>
                <div class="detail-item-label">Phone</div>
                <div class="detail-item-value">
                    ${escapeHtml(staff.phone || "-")}
                </div>
            </div>

            <div>
                <div class="detail-item-label">Department</div>
                <div class="detail-item-value">
                    ${escapeHtml(staff.department || "-")}
                </div>
            </div>

            <div>
                <div class="detail-item-label">Designation</div>
                <div class="detail-item-value">
                    ${escapeHtml(staff.designation || "-")}
                </div>
            </div>

            <div>
                <div class="detail-item-label">Status</div>
                <div class="detail-item-value">
                    ${staff.is_active ? "Active" : "Inactive"}
                </div>
            </div>

            <div>
                <div class="detail-item-label">Availability</div>
                <div class="detail-item-value">
                    ${staff.is_available ? "Available" : "Unavailable"}
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Assigned Services</h4>
            <div class="services-list">${servicesHtml}</div>
        </div>
    `;

    document.getElementById("staffModal")
        ?.classList.remove("hidden");
}

function editStaff(staffId) {
    window.location.href = `staff-details.html?id=${staffId}`;
}

async function deleteStaff(staffId) {
    const staff = allStaff.find(
        item => Number(item.id) === Number(staffId)
    );

    if (!staff) return;

    const name = staff.name ||
        `${staff.first_name || ""} ${staff.last_name || ""}`.trim();

    if (!confirm(`Are you sure you want to delete ${name}?`)) {
        return;
    }

    try {
        const token = localStorage.getItem("access_token");

        const response = await fetch(
            `${API_BASE_URL}/accounts/staff/${staffId}/`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (response.status === 403) {
            alert("You do not have permission to delete staff.");
            return;
        }

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(formatApiErrors(result));
        }

        allStaff = allStaff.filter(
            item => Number(item.id) !== Number(staffId)
        );

        updateStats();
        applyFilters();

        alert("Staff member deleted successfully.");
    } catch (error) {
        console.error("Delete staff error:", error);
        alert(error.message || "Unable to delete staff.");
    }
}

function closeStaffModal() {
    document.getElementById("staffModal")
        ?.classList.add("hidden");
}

function showLoading() {
    document.getElementById("staffLoading")
        ?.classList.remove("hidden");

    document.getElementById("staffEmpty")
        ?.classList.add("hidden");

    document.getElementById("staffError")
        ?.classList.add("hidden");

    const tableBody = document.getElementById("staffTableBody");

    if (tableBody) {
        tableBody.innerHTML = "";
    }
}

function hideLoading() {
    document.getElementById("staffLoading")
        ?.classList.add("hidden");
}

function showEmpty() {
    document.getElementById("staffEmpty")
        ?.classList.remove("hidden");
}

function hideEmpty() {
    document.getElementById("staffEmpty")
        ?.classList.add("hidden");
}

function showError(message) {
    hideLoading();

    document.getElementById("staffError")
        ?.classList.remove("hidden");

    const errorMessage = document.getElementById("staffErrorMessage");

    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function hideError() {
    document.getElementById("staffError")
        ?.classList.add("hidden");
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
            return type || "Unknown";
    }
}

function getStaffTypeClass(type) {
    switch (type) {
        case "DOCTOR":
            return "staff-type-doctor";
        case "RECEPTIONIST":
            return "staff-type-receptionist";
        default:
            return "staff-type-other";
    }
}

function getInitials(name) {
    if (!name) return "S";

    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }

    return (
        words[0][0] + words[words.length - 1][0]
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

function formatApiErrors(errors) {
    if (!errors) {
        return "An unexpected error occurred.";
    }

    if (typeof errors === "string") {
        return errors;
    }

    const messages = [];

    Object.entries(errors).forEach(([field, value]) => {
        if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(", ")}`);
        } else {
            messages.push(`${field}: ${value}`);
        }
    });

    return messages.length
        ? messages.join(" ")
        : "An unexpected error occurred.";
}

function handleUnauthorized() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    sessionStorage.clear();

    alert("Your session has expired. Please login again.");
    window.location.href = "../login.html";
}

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    sessionStorage.clear();

    window.location.href = "../login.html";
}