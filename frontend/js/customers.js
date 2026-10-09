const API_BASE_URL = "http://127.0.0.1:8000/api";

const accessToken =
    localStorage.getItem("access_token");

const loggedInUser =
    JSON.parse(
        localStorage.getItem("user") || "null"
    );

let customers = [];
let filteredCustomers = [];

let currentPage = 1;
const ITEMS_PER_PAGE = 10;

let selectedCustomer = null;

document.addEventListener("DOMContentLoaded", () => {

    checkAdminAccess();

    setupAdminName();

    setupEvents();

    loadCustomers();
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

    element.textContent = fullName || "Admin";
}

function setupEvents() {

    document
        .getElementById("searchInput")
        .addEventListener("input", applyFilters);

    document
        .getElementById("statusFilter")
        .addEventListener("change", applyFilters);

    document
        .getElementById("clearFiltersBtn")
        .addEventListener("click", clearFilters);

    document
        .getElementById("logoutBtn")
        .addEventListener("click", logout);

    document
        .getElementById("closeViewBtn")
        .addEventListener("click", closeViewModal);

    document
        .getElementById("viewCloseAction")
        .addEventListener("click", closeViewModal);

    document
        .getElementById("viewEditBtn")
        .addEventListener("click", () => {

            closeViewModal();

            if (selectedCustomer) {
                openEditModal(selectedCustomer.id);
            }
        });

    document
        .getElementById("closeEditBtn")
        .addEventListener("click", closeEditModal);

    document
        .getElementById("cancelEditBtn")
        .addEventListener("click", closeEditModal);

    document
        .getElementById("editCustomerForm")
        .addEventListener("submit", saveCustomer);

    document
        .getElementById("viewModal")
        .addEventListener("click", event => {

            if (event.target.id === "viewModal") {
                closeViewModal();
            }
        });

    document
        .getElementById("editModal")
        .addEventListener("click", event => {

            if (event.target.id === "editModal") {
                closeEditModal();
            }
        });
}

async function loadCustomers() {

    renderLoading();

    try {

        customers = await fetchAllCustomers();

        updateStatistics();

        applyFilters();

    } catch (error) {

        console.error("Load customers error:", error);

        renderError(
            error.message || "Unable to load customers."
        );
    }
}

async function fetchAllCustomers() {

    let allCustomers = [];
    let page = 1;

    while (true) {

        const response =
            await fetch(
                `${API_BASE_URL}/accounts/customers/?page=${page}`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    }
                }
            );

        if (response.status === 401) {

            logout();
            return [];
        }

        if (response.status === 403) {

            throw new Error(
                "You do not have permission to access customers."
            );
        }

        if (!response.ok) {

            throw new Error("Unable to load customers.");
        }

        const data = await response.json();

        if (data && Array.isArray(data.results)) {

            allCustomers = allCustomers.concat(data.results);

            if (!data.next) break;

            page++;

        } else if (Array.isArray(data)) {

            allCustomers = data;
            break;

        } else {

            break;
        }
    }

    return allCustomers;
}

function updateStatistics() {

    const total = customers.length;

    const active =
        customers.filter(
            customer => customer.is_active !== false
        ).length;

    const inactive =
        customers.filter(
            customer => customer.is_active === false
        ).length;

    document
        .getElementById("totalCustomers")
        .textContent = total;

    document
        .getElementById("activeCustomers")
        .textContent = active;

    document
        .getElementById("inactiveCustomers")
        .textContent = inactive;
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

    filteredCustomers =
        customers.filter(customer => {

            const name =
                `${customer.first_name || ""} ${customer.last_name || ""}`
                    .toLowerCase();

            const email =
                (customer.email || "").toLowerCase();

            const phone =
                (customer.phone || "").toLowerCase();

            const matchesSearch =
                !search ||
                name.includes(search) ||
                email.includes(search) ||
                phone.includes(search);

            const isActive =
                customer.is_active !== false;

            const matchesStatus =
                status === "ALL" ||
                (status === "ACTIVE" && isActive) ||
                (status === "INACTIVE" && !isActive);

            return matchesSearch && matchesStatus;
        });

    currentPage = 1;

    renderCustomers();
}

function clearFilters() {

    document.getElementById("searchInput").value = "";
    document.getElementById("statusFilter").value = "ALL";

    applyFilters();
}

function renderCustomers() {

    const tbody =
        document.getElementById("customerTableBody");

    const emptyState =
        document.getElementById("emptyState");

    const pagination =
        document.getElementById("pagination");

    if (!filteredCustomers.length) {

        tbody.innerHTML = "";

        emptyState.classList.remove("hidden");

        pagination.innerHTML = "";

        return;
    }

    emptyState.classList.add("hidden");

    const totalPages =
        Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    const pageCustomers =
        filteredCustomers.slice(
            start,
            start + ITEMS_PER_PAGE
        );

    tbody.innerHTML =
        pageCustomers
            .map((customer, index) =>
                createCustomerRow(
                    customer,
                    start + index + 1
                )
            )
            .join("");

    renderPagination(totalPages);
}

function createCustomerRow(customer, serialNumber) {

    const name =
        `${customer.first_name || ""} ${customer.last_name || ""}`
            .trim() || "Unnamed Customer";

    const initials = getInitials(name);

    const active =
        customer.is_active !== false;

    const statusClass =
        active ? "active" : "inactive";

    const statusText =
        active ? "Active" : "Inactive";

    const dob =
        customer.date_of_birth
            ? formatDate(customer.date_of_birth)
            : "—";

    return `

        <tr>

            <td>${serialNumber}</td>

            <td>
                <div class="customer-info">

                    <div class="customer-avatar">
                        ${initials}
                    </div>

                    <div>
                        <div class="customer-name">
                            ${escapeHtml(name)}
                        </div>

                        <div class="customer-email">
                            Customer #${customer.id}
                        </div>
                    </div>

                </div>
            </td>

            <td>
                ${escapeHtml(customer.email || "—")}
            </td>

            <td>
                ${escapeHtml(customer.phone || "—")}
            </td>

            <td>
                ${dob}
            </td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>

            <td>
                <div class="action-buttons">

                    <button
                        type="button"
                        class="action-btn"
                        onclick="openViewModal(${customer.id})"
                    >
                        View
                    </button>

                    <button
                        type="button"
                        class="action-btn"
                        onclick="openEditModal(${customer.id})"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="action-btn danger"
                        onclick="toggleCustomerStatus(${customer.id})"
                    >
                        ${active ? "Deactivate" : "Activate"}
                    </button>

                </div>
            </td>

        </tr>
    `;
}

function openViewModal(customerId) {

    const customer =
        customers.find(
            item =>
                Number(item.id) === Number(customerId)
        );

    if (!customer) {

        showToast("Customer not found.", "error");
        return;
    }

    selectedCustomer = customer;

    const name =
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

    document
        .getElementById("viewAvatar")
        .textContent = getInitials(name);

    document
        .getElementById("viewName")
        .textContent = name || "Unnamed Customer";

    document
        .getElementById("viewEmail")
        .textContent = customer.email || "—";

    document
        .getElementById("viewPhone")
        .textContent = customer.phone || "—";

    document
        .getElementById("viewDob")
        .textContent =
        customer.date_of_birth
            ? formatDate(customer.date_of_birth)
            : "—";

    document
        .getElementById("viewAddress")
        .textContent = customer.address || "—";

    document
        .getElementById("viewStatus")
        .textContent =
        customer.is_active !== false
            ? "Active"
            : "Inactive";

    document
        .getElementById("viewCreated")
        .textContent =
        customer.created_at
            ? formatDateTime(customer.created_at)
            : "—";

    document
        .getElementById("viewModal")
        .classList.remove("hidden");
}

function closeViewModal() {

    document
        .getElementById("viewModal")
        .classList.add("hidden");
}

function openEditModal(customerId) {

    const customer =
        customers.find(
            item =>
                Number(item.id) === Number(customerId)
        );

    if (!customer) {

        showToast("Customer not found.", "error");
        return;
    }

    selectedCustomer = customer;

    document
        .getElementById("editFirstName")
        .value = customer.first_name || "";

    document
        .getElementById("editLastName")
        .value = customer.last_name || "";

    document
        .getElementById("editEmail")
        .value = customer.email || "";

    document
        .getElementById("editPhone")
        .value = customer.phone || "";

    document
        .getElementById("editDob")
        .value = customer.date_of_birth || "";

    document
        .getElementById("editAddress")
        .value = customer.address || "";

    document
        .getElementById("editIsActive")
        .checked = customer.is_active !== false;

    hideEditError();

    document
        .getElementById("editModal")
        .classList.remove("hidden");
}

function closeEditModal() {

    document
        .getElementById("editModal")
        .classList.add("hidden");
}

async function saveCustomer(event) {

    event.preventDefault();

    if (!selectedCustomer) return;

    const payload = {

        email:
            document.getElementById("editEmail").value.trim(),

        first_name:
            document.getElementById("editFirstName").value.trim(),

        last_name:
            document.getElementById("editLastName").value.trim(),

        phone:
            document.getElementById("editPhone").value.trim(),

        address:
            document.getElementById("editAddress").value.trim(),

        date_of_birth:
            document.getElementById("editDob").value || null,

        is_active:
            document.getElementById("editIsActive").checked
    };

    if (!payload.first_name || !payload.last_name) {

        showEditError(
            "First name and last name are required."
        );

        return;
    }

    if (!payload.email) {

        showEditError("Email is required.");
        return;
    }

    if (!payload.phone) {

        showEditError("Phone number is required.");
        return;
    }

    const button =
        document.getElementById("saveCustomerBtn");

    button.disabled = true;
    button.textContent = "Saving...";

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/accounts/customers/${selectedCustomer.id}/`,
                {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

        const data =
            await response.json().catch(() => ({}));

        if (response.status === 401) {

            logout();
            return;
        }

        if (!response.ok) {

            showEditError(extractApiError(data));
            return;
        }

        const index =
            customers.findIndex(
                item =>
                    Number(item.id) === Number(selectedCustomer.id)
            );

        if (index !== -1) {
            customers[index] = data;
        }

        selectedCustomer = data;

        closeEditModal();

        updateStatistics();
        applyFilters();

        showToast(
            "Customer updated successfully.",
            "success"
        );

    } catch (error) {

        console.error("Update customer error:", error);

        showEditError(
            "Network error. Please try again."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Save Changes";
    }
}

async function toggleCustomerStatus(customerId) {

    const customer =
        customers.find(
            item =>
                Number(item.id) === Number(customerId)
        );

    if (!customer) return;

    const currentlyActive =
        customer.is_active !== false;

    const action =
        currentlyActive ? "deactivate" : "activate";

    const confirmed =
        window.confirm(
            `Are you sure you want to ${action} this customer?`
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/accounts/customers/${customerId}/`,
                {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        is_active: !currentlyActive
                    })
                }
            );

        const data =
            await response.json().catch(() => ({}));

        if (response.status === 401) {

            logout();
            return;
        }

        if (!response.ok) {

            throw new Error(extractApiError(data));
        }

        const index =
            customers.findIndex(
                item =>
                    Number(item.id) === Number(customerId)
            );

        if (index !== -1) {
            customers[index] = data;
        }

        updateStatistics();
        applyFilters();

        showToast(
            currentlyActive
                ? "Customer deactivated successfully."
                : "Customer activated successfully.",
            "success"
        );

    } catch (error) {

        console.error("Status update error:", error);

        showToast(
            error.message ||
            "Unable to update customer status.",
            "error"
        );
    }
}

function renderPagination(totalPages) {

    const container =
        document.getElementById("pagination");

    if (totalPages <= 1) {

        container.innerHTML = "";
        return;
    }

    let html = `

        <button
            class="page-btn"
            ${currentPage === 1 ? "disabled" : ""}
            onclick="changePage(${currentPage - 1})"
        >
            ‹
        </button>
    `;

    for (let page = 1; page <= totalPages; page++) {

        html += `

            <button
                class="page-btn ${page === currentPage ? "active" : ""}"
                onclick="changePage(${page})"
            >
                ${page}
            </button>
        `;
    }

    html += `

        <button
            class="page-btn"
            ${currentPage === totalPages ? "disabled" : ""}
            onclick="changePage(${currentPage + 1})"
        >
            ›
        </button>
    `;

    container.innerHTML = html;
}

function changePage(page) {

    const totalPages =
        Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

    if (page < 1 || page > totalPages) return;

    currentPage = page;

    renderCustomers();
}

function renderLoading() {

    document
        .getElementById("customerTableBody")
        .innerHTML = `

            <tr>
                <td colspan="7" class="loading-cell">
                    <div class="loader"></div>
                    Loading customers...
                </td>
            </tr>
        `;
}

function renderError(message) {

    document
        .getElementById("customerTableBody")
        .innerHTML = `

            <tr>
                <td colspan="7" class="loading-cell">
                    ⚠️ ${escapeHtml(message)}
                </td>
            </tr>
        `;
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

function formatDate(value) {

    if (!value) return "—";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function formatDateTime(value) {

    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function escapeHtml(value) {

    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function extractApiError(data) {

    if (!data) return "Something went wrong.";

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

function showEditError(message) {

    const element =
        document.getElementById("editError");

    element.textContent = message;

    element.classList.remove("hidden");
}

function hideEditError() {

    document
        .getElementById("editError")
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

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "../login.html";
}

window.openViewModal = openViewModal;
window.openEditModal = openEditModal;
window.toggleCustomerStatus = toggleCustomerStatus;
window.changePage = changePage;