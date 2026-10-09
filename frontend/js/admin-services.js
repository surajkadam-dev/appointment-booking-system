const API_BASE = "http://127.0.0.1:8000/api";

let allServices = [];
let filteredServices = [];

let currentPage = 1;

const PAGE_SIZE = 10;

let viewingServiceId = null;

document.addEventListener("DOMContentLoaded", () => {

    protectAdminPage();

    setupAdminName();

    bindEvents();

    loadServices();
});

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("access")
    );
}

function getStoredUser() {

    try {

        return JSON.parse(
            localStorage.getItem("user") || "null"
        );

    } catch {

        return null;
    }
}

function protectAdminPage() {

    const user = getStoredUser();

    if (
        !getToken() ||
        !user ||
        user.role !== "ADMIN"
    ) {

        window.location.href = "../login.html";
    }
}

function setupAdminName() {

    const user = getStoredUser();

    if (!user) {
        return;
    }

    const element =
        document.getElementById("adminName");

    if (!element) {
        return;
    }

    const fullName =
        `${user.first_name || ""} ${user.last_name || ""}`.trim();

    element.textContent =
        fullName || "Admin";
}

function authHeaders(includeJson = false) {

    const headers = {
        "Authorization":
            `Bearer ${getToken()}`
    };

    if (includeJson) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

function bindEvents() {

    document
        .getElementById("addServiceBtn")
        .addEventListener(
            "click",
            openAddModal
        );

    document
        .getElementById("serviceForm")
        .addEventListener(
            "submit",
            saveService
        );

    document
        .getElementById("searchInput")
        .addEventListener(
            "input",
            applyFilters
        );

    document
        .getElementById("statusFilter")
        .addEventListener(
            "change",
            applyFilters
        );

    document
        .getElementById("clearFiltersBtn")
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById("searchInput")
                    .value = "";

                document
                    .getElementById("statusFilter")
                    .value = "ALL";

                applyFilters();
            }
        );

    document
        .getElementById("viewEditBtn")
        .addEventListener(
            "click",
            () => {

                const service =
                    allServices.find(
                        service =>
                            Number(service.id) ===
                            Number(viewingServiceId)
                    );

                if (service) {

                    closeModal("viewModal");

                    openEditModal(service);
                }
            }
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
        .getElementById("logoutBtn")
        .addEventListener(
            "click",
            logout
        );

    document
        .querySelectorAll(".modal")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (event.target === modal) {

                        modal.classList.add("hidden");
                    }
                }
            );
        });
}

async function loadServices() {

    try {

        allServices =
            await fetchAllServices();

        updateStats();

        applyFilters();

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Failed to load services.",
            true
        );

        renderTable([]);
    }
}

async function fetchAllServices() {

    const results = [];

    let url =
        `${API_BASE}/services/`;

    let safetyCounter = 0;

    while (
        url &&
        safetyCounter < 100
    ) {

        safetyCounter++;

        const response =
            await fetch(
                url,
                {
                    headers: authHeaders()
                }
            );

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            throw new Error(
                "You are not authorized to manage services."
            );
        }

        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );
        }

        const data =
            await response.json();

        if (Array.isArray(data)) {

            results.push(...data);

            break;
        }

        if (Array.isArray(data.results)) {

            results.push(...data.results);

            if (data.next) {

                url =
                    absoluteApiUrl(data.next);

            } else {

                break;
            }

        } else {

            if (Array.isArray(data.services)) {

                results.push(...data.services);
            }

            break;
        }
    }

    return results;
}

function updateStats() {

    const active =
        allServices.filter(
            service =>
                Boolean(service.is_active)
        ).length;

    const inactive =
        allServices.length - active;

    document
        .getElementById("totalServices")
        .textContent =
        allServices.length;

    document
        .getElementById("activeServices")
        .textContent =
        active;

    document
        .getElementById("inactiveServices")
        .textContent =
        inactive;
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

    filteredServices =
        allServices.filter(
            service => {

                const name =
                    String(
                        service.name || ""
                    ).toLowerCase();

                const description =
                    String(
                        service.description || ""
                    ).toLowerCase();

                const matchesSearch =
                    !search ||
                    name.includes(search) ||
                    description.includes(search);

                const matchesStatus =
                    status === "ALL" ||
                    (
                        status === "ACTIVE" &&
                        Boolean(service.is_active)
                    ) ||
                    (
                        status === "INACTIVE" &&
                        !Boolean(service.is_active)
                    );

                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );

    currentPage = 1;

    renderTable();

    renderPagination();
}

function renderTable() {

    const tbody =
        document.getElementById(
            "servicesTableBody"
        );

    tbody.innerHTML = "";

    if (!filteredServices.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-state"
                >
                    No services found.
                </td>
            </tr>
        `;

        return;
    }

    const start =
        (currentPage - 1) * PAGE_SIZE;

    const pageItems =
        filteredServices.slice(
            start,
            start + PAGE_SIZE
        );

    pageItems.forEach(service => {

        const tr =
            document.createElement("tr");

        const description =
            service.description ||
            "No description";

        const active =
            Boolean(service.is_active);

        tr.innerHTML = `

            <td>
                <div class="service-name">
                    ${escapeHtml(service.name || "-")}
                </div>
            </td>

            <td>
                <div
                    class="service-description"
                    title="${escapeHtml(description)}"
                >
                    ${escapeHtml(description)}
                </div>
            </td>

            <td>
                ${Number(service.duration || 0)} min
            </td>

            <td>
                ${formatCurrency(service.price)}
            </td>

            <td>
                <span
                    class="status-badge ${
                        active
                            ? "status-active"
                            : "status-inactive"
                    }"
                >
                    ${active ? "Active" : "Inactive"}
                </span>
            </td>

            <td>
                <button
                    class="action-btn"
                    onclick="viewService(${service.id})"
                >
                    View
                </button>

                <button
                    class="action-btn"
                    onclick="editService(${service.id})"
                >
                    Edit
                </button>

                <button
                    class="action-btn ${
                        active
                            ? "deactivate"
                            : "activate"
                    }"
                    onclick="toggleServiceStatus(${service.id})"
                >
                    ${active ? "Deactivate" : "Activate"}
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function renderPagination() {

    const container =
        document.getElementById("pagination");

    container.innerHTML = "";

    const totalPages =
        Math.ceil(
            filteredServices.length / PAGE_SIZE
        );

    if (totalPages <= 1) return;

    const previous =
        document.createElement("button");

    previous.textContent = "Previous";

    previous.disabled =
        currentPage === 1;

    previous.onclick =
        () => changePage(currentPage - 1);

    container.appendChild(previous);

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement("button");

        button.textContent = page;

        if (page === currentPage) {

            button.className = "active";
        }

        button.onclick =
            () => changePage(page);

        container.appendChild(button);
    }

    const next =
        document.createElement("button");

    next.textContent = "Next";

    next.disabled =
        currentPage === totalPages;

    next.onclick =
        () => changePage(currentPage + 1);

    container.appendChild(next);
}

function changePage(page) {

    const totalPages =
        Math.ceil(
            filteredServices.length / PAGE_SIZE
        );

    if (
        page < 1 ||
        page > totalPages
    ) {
        return;
    }

    currentPage = page;

    renderTable();

    renderPagination();
}

function openAddModal() {

    document
        .getElementById("serviceModalTitle")
        .textContent =
        "Add Service";

    document
        .getElementById("saveServiceBtn")
        .textContent =
        "Create Service";

    document
        .getElementById("serviceForm")
        .reset();

    document
        .getElementById("serviceId")
        .value = "";

    document
        .getElementById("serviceStatus")
        .value = "true";

    clearFormError();

    openModal("serviceModal");
}

function openEditModal(service) {

    document
        .getElementById("serviceModalTitle")
        .textContent =
        "Edit Service";

    document
        .getElementById("saveServiceBtn")
        .textContent =
        "Save Changes";

    document
        .getElementById("serviceId")
        .value =
        service.id;

    document
        .getElementById("serviceName")
        .value =
        service.name || "";

    document
        .getElementById("serviceDescription")
        .value =
        service.description || "";

    document
        .getElementById("serviceDuration")
        .value =
        service.duration ?? "";

    document
        .getElementById("servicePrice")
        .value =
        service.price ?? "";

    document
        .getElementById("serviceStatus")
        .value =
        Boolean(service.is_active)
            ? "true"
            : "false";

    clearFormError();

    openModal("serviceModal");
}

window.editService = function(id) {

    const service =
        allServices.find(
            item =>
                Number(item.id) ===
                Number(id)
        );

    if (service) {
        openEditModal(service);
    }
};

window.viewService = function(id) {

    const service =
        allServices.find(
            item =>
                Number(item.id) ===
                Number(id)
        );

    if (!service) return;

    viewingServiceId = service.id;

    document
        .getElementById("viewName")
        .textContent =
        service.name || "-";

    document
        .getElementById("viewDescription")
        .textContent =
        service.description ||
        "No description";

    document
        .getElementById("viewDuration")
        .textContent =
        `${service.duration || 0} minutes`;

    document
        .getElementById("viewPrice")
        .textContent =
        formatCurrency(service.price);

    document
        .getElementById("viewStatus")
        .textContent =
        Boolean(service.is_active)
            ? "Active"
            : "Inactive";

    document
        .getElementById("viewCreated")
        .textContent =
        formatDate(service.created_at);

    document
        .getElementById("viewUpdated")
        .textContent =
        formatDate(service.updated_at);

    openModal("viewModal");
};

async function saveService(event) {

    event.preventDefault();

    clearFormError();

    const id =
        document
            .getElementById("serviceId")
            .value;

    const name =
        document
            .getElementById("serviceName")
            .value
            .trim();

    const description =
        document
            .getElementById("serviceDescription")
            .value
            .trim();

    const duration =
        Number(
            document
                .getElementById("serviceDuration")
                .value
        );

    const price =
        Number(
            document
                .getElementById("servicePrice")
                .value
        );

    const is_active =
        document
            .getElementById("serviceStatus")
            .value === "true";

    if (!name) {

        return showFormError(
            "Service name is required."
        );
    }

    if (
        !Number.isInteger(duration) ||
        duration <= 0
    ) {

        return showFormError(
            "Duration must be greater than 0."
        );
    }

    if (
        !Number.isFinite(price) ||
        price < 0
    ) {

        return showFormError(
            "Price must be 0 or greater."
        );
    }

    const payload = {
        name,
        description,
        duration,
        price: price.toFixed(2),
        is_active
    };

    const button =
        document.getElementById("saveServiceBtn");

    button.disabled = true;

    button.textContent =
        id ? "Saving..." : "Creating...";

    try {

        const url =
            id
                ? `${API_BASE}/services/${id}/`
                : `${API_BASE}/services/`;

        const response =
            await fetch(
                url,
                {
                    method:
                        id ? "PATCH" : "POST",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify(payload)
                }
            );

        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );
        }

        showToast(
            id
                ? "Service updated successfully."
                : "Service created successfully."
        );

        closeModal("serviceModal");

        await loadServices();

    } catch (error) {

        console.error(error);

        showFormError(
            error.message ||
            "Unable to save service."
        );

    } finally {

        button.disabled = false;

        button.textContent =
            id ? "Save Changes" : "Create Service";
    }
}

window.toggleServiceStatus = async function(id) {

    const service =
        allServices.find(
            item =>
                Number(item.id) ===
                Number(id)
        );

    if (!service) return;

    const newStatus =
        !Boolean(service.is_active);

    const action =
        newStatus ? "activate" : "deactivate";

    if (
        !confirm(
            `Are you sure you want to ${action} "${service.name}"?`
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/services/${id}/`,
                {
                    method: "PATCH",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify({
                            is_active: newStatus
                        })
                }
            );

        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );
        }

        showToast(
            `Service ${
                newStatus ? "activated" : "deactivated"
            } successfully.`
        );

        await loadServices();

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Unable to update service.",
            true
        );
    }
};

function openModal(id) {

    document
        .getElementById(id)
        .classList.remove("hidden");
}

function closeModal(id) {

    document
        .getElementById(id)
        .classList.add("hidden");
}

function clearFormError() {

    const box =
        document.getElementById("formError");

    box.textContent = "";

    box.classList.add("hidden");
}

function showFormError(message) {

    const box =
        document.getElementById("formError");

    box.textContent = message;

    box.classList.remove("hidden");
}

function showToast(message, error = false) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.className =
        `toast show${error ? " error" : ""}`;

    clearTimeout(window.toastTimer);

    window.toastTimer =
        setTimeout(
            () => {

                toast.classList.remove("show");
            },
            3000
        );
}

async function getApiError(response) {

    try {

        const data =
            await response.json();

        if (data.detail) {
            return data.detail;
        }

        if (data.message) {
            return data.message;
        }

        return Object
            .entries(data)
            .map(
                ([key, value]) =>
                    `${key}: ${
                        Array.isArray(value)
                            ? value.join(", ")
                            : value
                    }`
            )
            .join(" | ");

    } catch {

        return `Request failed (${response.status})`;
    }
}

function absoluteApiUrl(url) {

    if (!url) return null;

    if (url.startsWith("http")) {
        return url;
    }

    return `${API_BASE}${
        url.startsWith("/") ? "" : "/"
    }${url}`;
}

function formatCurrency(value) {

    const number = Number(value || 0);

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(number);
}

function formatDate(value) {

    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");

    window.location.href = "../login.html";
}