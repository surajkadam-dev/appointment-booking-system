const API_BASE_URL = "http://127.0.0.1:8000/api";

let allCustomers = [];
let allAppointments = [];

let filteredCustomers = [];

let currentPage = 1;
const customersPerPage = 10;

let selectedCustomer = null;
let modalEditMode = false;

document.addEventListener("DOMContentLoaded", async () => {

    setupEventListeners();

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "../login.html";
        return;
    }

    await initializePage();
});

async function initializePage() {

    try {

        const user = await getCurrentUser();

        if (!user) {
            logout();
            return;
        }

        console.log("Current user:", user);

        if (
            user.role !== "STAFF" ||
            user.staff_type !== "RECEPTIONIST"
        ) {

            redirectByRole(user);
            return;
        }

        localStorage.setItem(
            "currentUser",
            JSON.stringify(user)
        );

        updateUserInformation(user);

        await loadCustomers();

        applyFilters();

        await loadAppointments();

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

        showPageError(
            error.message ||
            "Failed to load customer management."
        );
    }
}

function setupEventListeners() {

    const searchInput =
        document.getElementById("searchInput");

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                currentPage = 1;
                applyFilters();
            }
        );
    }

    const dobFilter =
        document.getElementById("dobFilter");

    if (dobFilter) {

        dobFilter.addEventListener(
            "change",
            () => {

                currentPage = 1;
                applyFilters();
            }
        );
    }

    const clearFiltersBtn =
        document.getElementById("clearFiltersBtn");

    if (clearFiltersBtn) {

        clearFiltersBtn.addEventListener(
            "click",
            clearFilters
        );
    }

    const refreshBtn =
        document.getElementById("refreshBtn");

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            refreshCustomers
        );
    }

    const prevPageBtn =
        document.getElementById("prevPageBtn");

    if (prevPageBtn) {

        prevPageBtn.addEventListener(
            "click",
            () => {

                if (currentPage > 1) {

                    currentPage--;

                    renderCustomers();
                    renderPagination();
                    updateResultSummary();
                }
            }
        );
    }

    const nextPageBtn =
        document.getElementById("nextPageBtn");

    if (nextPageBtn) {

        nextPageBtn.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        filteredCustomers.length /
                        customersPerPage
                    );

                if (currentPage < totalPages) {

                    currentPage++;

                    renderCustomers();
                    renderPagination();
                    updateResultSummary();
                }
            }
        );
    }

    const customerForm =
        document.getElementById("customerForm");

    if (customerForm) {

        customerForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                if (modalEditMode) {
                    await saveCustomer();
                }
            }
        );
    }

    const closeModalBtn =
        document.getElementById("closeModalBtn");

    if (closeModalBtn) {

        closeModalBtn.addEventListener(
            "click",
            closeCustomerModal
        );
    }

    const cancelModalBtn =
        document.getElementById("cancelModalBtn");

    if (cancelModalBtn) {

        cancelModalBtn.addEventListener(
            "click",
            closeCustomerModal
        );
    }

    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );
    }

    const modal =
        document.getElementById("customerModal");

    if (modal) {

        modal.addEventListener(
            "click",
            (event) => {

                if (event.target === modal) {
                    closeCustomerModal();
                }
            }
        );
    }
}

async function getCurrentUser() {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        return null;
    }

    const response =
        await fetch(
            `${API_BASE_URL}/accounts/me/`,
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

    if (!response.ok) {

        throw new Error(
            "Unable to get current user."
        );
    }

    return await response.json();
}

function updateUserInformation(user) {

    const fullName =
        `${user.first_name || ""} ${user.last_name || ""}`
            .trim();

    const userName =
        document.getElementById("userName");

    if (userName) {

        userName.textContent =
            fullName || "Receptionist";
    }

    const userRole =
        document.getElementById("userRole");

    if (userRole) {

        userRole.textContent =
            "Receptionist";
    }

    const userAvatar =
        document.getElementById("userAvatar");

    if (userAvatar) {

        userAvatar.textContent =
            getInitials(fullName);
    }
}

async function loadCustomers() {

    const token =
        localStorage.getItem("access_token");

    if (!token) {

        logout();
        return;
    }

    console.log("Loading customers...");

    const response =
        await fetch(
            `${API_BASE_URL}/accounts/customers/`,
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

    if (response.status === 403) {

        throw new Error(
            "You do not have permission to view customers."
        );
    }

    if (!response.ok) {

        const errorData =
            await response.json().catch(() => ({}));

        throw new Error(
            extractAPIError(errorData) ||
            "Failed to load customers."
        );
    }

    const data =
        await response.json();

    console.log(
        "Customer API response:",
        data
    );

    if (Array.isArray(data)) {

        allCustomers = data;

    } else if (Array.isArray(data.results)) {

        allCustomers = data.results;

    } else if (Array.isArray(data.data)) {

        allCustomers = data.data;

    } else {

        allCustomers = [];
    }

    console.log(
        "Customers loaded:",
        allCustomers
    );

    updateStatistics();
}

async function loadAppointments() {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        logout();
        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/`,
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

            console.warn(
                "Unable to load appointments."
            );

            allAppointments = [];

            return;
        }

        const data =
            await response.json();

        if (Array.isArray(data)) {

            allAppointments = data;

        } else if (Array.isArray(data.results)) {

            allAppointments = data.results;

        } else if (Array.isArray(data.data)) {

            allAppointments = data.data;

        } else {

            allAppointments = [];
        }

        console.log(
            "Appointments loaded:",
            allAppointments
        );

    } catch (error) {

        console.warn(
            "Appointment loading failed:",
            error
        );

        allAppointments = [];
    }
}

function applyFilters() {

    const searchInput =
        document.getElementById("searchInput");

    const dobFilter =
        document.getElementById("dobFilter");

    const searchValue =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const dobValue =
        dobFilter
            ? dobFilter.value
            : "";

    filteredCustomers =
        allCustomers.filter(customer => {

            const normalized =
                normalizeCustomer(customer);

            const searchableText = [

                normalized.firstName,

                normalized.lastName,

                normalized.fullName,

                normalized.email,

                normalized.phone

            ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !searchValue ||
                searchableText.includes(searchValue);

            let matchesDOB = true;

            if (dobValue === "yes") {

                matchesDOB =
                    !!normalized.dateOfBirth;

            } else if (dobValue === "no") {

                matchesDOB =
                    !normalized.dateOfBirth;
            }

            return (
                matchesSearch &&
                matchesDOB
            );
        });

    currentPage = Math.min(
        currentPage,
        Math.max(
            1,
            Math.ceil(
                filteredCustomers.length /
                customersPerPage
            )
        )
    );

    renderCustomers();

    renderPagination();

    updateResultSummary();
}

function normalizeCustomer(customer) {

    const user =
        customer.user || {};

    const firstName =
        customer.first_name ||
        user.first_name ||
        "";

    const lastName =
        customer.last_name ||
        user.last_name ||
        "";

    const email =
        customer.email ||
        user.email ||
        "";

    const phone =
        customer.phone ||
        "";

    const dateOfBirth =
        customer.date_of_birth ||
        customer.dob ||
        "";

    const address =
        customer.address ||
        "";

    const id =
        customer.id ||
        customer.customer_id ||
        user.id ||
        null;

    const fullName =
        `${firstName} ${lastName}`
            .trim();

    return {

        id,

        firstName,

        lastName,

        fullName:
            fullName || "Unknown Customer",

        email,

        phone,

        dateOfBirth,

        address,

        createdAt:
            customer.created_at ||
            customer.registered_at ||
            user.date_joined ||
            user.created_at ||
            "",

        raw: customer
    };
}

function renderCustomers() {

    const tableBody =
        document.getElementById(
            "customerTableBody"
        );

    if (!tableBody) {

        console.error(
            "ERROR: #customerTableBody not found in HTML."
        );

        return;
    }

    const startIndex =
        (currentPage - 1) *
        customersPerPage;

    const endIndex =
        startIndex +
        customersPerPage;

    const customersToDisplay =
        filteredCustomers.slice(
            startIndex,
            endIndex
        );

    if (
        customersToDisplay.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="loading-cell"
                >
                    No customers found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML =
        customersToDisplay
            .map((customer, index) => {

                const normalized =
                    normalizeCustomer(
                        customer
                    );

                const srNo =
                    startIndex + index + 1;

                return `
                    <tr>

                        <td>
                            ${srNo}
                        </td>

                        <td>
                            <div class="customer-info">

                                <div class="customer-avatar">
                                    ${getInitials(
                                        normalized.fullName
                                    )}
                                </div>

                                <div>
                                    <strong>
                                        ${escapeHTML(
                                            normalized.fullName
                                        )}
                                    </strong>
                                </div>

                            </div>
                        </td>

                        <td>
                            ${escapeHTML(
                                normalized.email || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                normalized.phone || "-"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                normalized.dateOfBirth
                            )}
                        </td>

                        <td>
                            ${formatDateTime(
                                normalized.createdAt
                            )}
                        </td>

                        <td>

                            <div class="action-buttons">

                                <button
                                    type="button"
                                    class="btn-action btn-view"
                                    onclick="viewCustomer(${normalized.id})"
                                    title="View customer"
                                >
                                    👁
                                </button>

                                <button
                                    type="button"
                                    class="btn-action btn-edit"
                                    onclick="editCustomer(${normalized.id})"
                                    title="Edit customer"
                                >
                                    ✏️
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
            })
            .join("");
}

function updateStatistics() {

    const totalCustomers =
        document.getElementById(
            "totalCustomers"
        );

    const phoneCustomers =
        document.getElementById(
            "phoneCustomers"
        );

    const addressCustomers =
        document.getElementById(
            "addressCustomers"
        );

    if (totalCustomers) {

        totalCustomers.textContent =
            allCustomers.length;
    }

    const withPhone =
        allCustomers.filter(customer => {

            const normalized =
                normalizeCustomer(customer);

            return (
                normalized.phone &&
                normalized.phone.trim() !== ""
            );
        }).length;

    const withAddress =
        allCustomers.filter(customer => {

            const normalized =
                normalizeCustomer(customer);

            return (
                normalized.address &&
                normalized.address.trim() !== ""
            );
        }).length;

    if (phoneCustomers) {

        phoneCustomers.textContent =
            withPhone;
    }

    if (addressCustomers) {

        addressCustomers.textContent =
            withAddress;
    }
}

function updateResultSummary() {

    const resultSummary =
        document.getElementById(
            "resultSummary"
        );

    if (!resultSummary) {
        return;
    }

    const total =
        filteredCustomers.length;

    if (total === 0) {

        resultSummary.textContent =
            "No customers found.";

        return;
    }

    const start =
        ((currentPage - 1) *
        customersPerPage) + 1;

    const end =
        Math.min(
            start +
            customersPerPage -
            1,
            total
        );

    resultSummary.textContent =
        `Showing ${start}-${end} of ${total} customers`;
}

function renderPagination() {

    const prevButton =
        document.getElementById(
            "prevPageBtn"
        );

    const nextButton =
        document.getElementById(
            "nextPageBtn"
        );

    const pageInfo =
        document.getElementById(
            "pageInfo"
        );

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredCustomers.length /
                customersPerPage
            )
        );

    if (prevButton) {

        prevButton.disabled =
            currentPage <= 1;
    }

    if (nextButton) {

        nextButton.disabled =
            currentPage >= totalPages;
    }

    if (pageInfo) {

        pageInfo.textContent =
            `Page ${currentPage} of ${totalPages}`;
    }
}

function clearFilters() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const dobFilter =
        document.getElementById(
            "dobFilter"
        );

    if (searchInput) {

        searchInput.value = "";
    }

    if (dobFilter) {

        dobFilter.value = "";
    }

    currentPage = 1;

    applyFilters();
}

async function refreshCustomers() {

    try {

        const refreshBtn =
            document.getElementById(
                "refreshBtn"
            );

        if (refreshBtn) {

            refreshBtn.disabled = true;

            refreshBtn.textContent =
                "Refreshing...";
        }

        await loadCustomers();

        applyFilters();

        await loadAppointments();

        showToast(
            "Customer data refreshed successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Refresh error:",
            error
        );

        showPageError(
            error.message ||
            "Failed to refresh customers."
        );

    } finally {

        const refreshBtn =
            document.getElementById(
                "refreshBtn"
            );

        if (refreshBtn) {

            refreshBtn.disabled = false;

            refreshBtn.textContent =
                "Refresh";
        }
    }
}

async function viewCustomer(customerId) {

    const customer =
        findCustomerById(customerId);

    if (!customer) {

        showToast(
            "Customer not found.",
            "error"
        );

        return;
    }

    selectedCustomer =
        customer;

    modalEditMode = false;

    populateCustomerModal(
        normalizeCustomer(customer)
    );

    setModalEditable(false);

    await loadCustomerAppointmentHistory(
        customerId
    );

    openCustomerModal();
}

async function editCustomer(customerId) {

    const customer =
        findCustomerById(customerId);

    if (!customer) {

        showToast(
            "Customer not found.",
            "error"
        );

        return;
    }

    selectedCustomer =
        customer;

    modalEditMode = true;

    populateCustomerModal(
        normalizeCustomer(customer)
    );

    setModalEditable(true);

    await loadCustomerAppointmentHistory(
        customerId
    );

    openCustomerModal();
}

function populateCustomerModal(customer) {

    const customerId =
        document.getElementById(
            "customerId"
        );

    const firstName =
        document.getElementById(
            "firstName"
        );

    const lastName =
        document.getElementById(
            "lastName"
        );

    const email =
        document.getElementById(
            "email"
        );

    const phone =
        document.getElementById(
            "phone"
        );

    const dateOfBirth =
        document.getElementById(
            "dateOfBirth"
        );

    const address =
        document.getElementById(
            "address"
        );

    if (customerId) {

        customerId.value =
            customer.id;
    }

    if (firstName) {

        firstName.value =
            customer.firstName;
    }

    if (lastName) {

        lastName.value =
            customer.lastName;
    }

    if (email) {

        email.value =
            customer.email;
    }

    if (phone) {

        phone.value =
            customer.phone;
    }

    if (dateOfBirth) {

        dateOfBirth.value =
            normalizeDateForInput(
                customer.dateOfBirth
            );
    }

    if (address) {

        address.value =
            customer.address;
    }

    const modalTitle =
        document.getElementById(
            "modalTitle"
        );

    const modalSubtitle =
        document.getElementById(
            "modalSubtitle"
        );

    if (modalTitle) {

        modalTitle.textContent =
            modalEditMode
                ? "Edit Customer"
                : "Customer Details";
    }

    if (modalSubtitle) {

        modalSubtitle.textContent =
            modalEditMode
                ? "Update customer information"
                : "View customer information";
    }
}

function setModalEditable(editable) {

    const firstName =
        document.getElementById(
            "firstName"
        );

    const lastName =
        document.getElementById(
            "lastName"
        );

    const phone =
        document.getElementById(
            "phone"
        );

    const dateOfBirth =
        document.getElementById(
            "dateOfBirth"
        );

    const address =
        document.getElementById(
            "address"
        );

    [
        firstName,
        lastName,
        phone,
        dateOfBirth,
        address
    ].forEach(element => {

        if (element) {

            element.readOnly =
                !editable;
        }
    });

    const saveButton =
        document.getElementById(
            "saveCustomerBtn"
        );

    if (saveButton) {

        saveButton.style.display =
            editable
                ? "inline-flex"
                : "none";
    }
}

function openCustomerModal() {

    const modal =
        document.getElementById(
            "customerModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("hidden");

    modal.style.display =
        "flex";
}

function closeCustomerModal() {

    const modal =
        document.getElementById(
            "customerModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");

    modal.style.display =
        "none";

    selectedCustomer =
        null;
}

async function loadCustomerAppointmentHistory(
    customerId
) {

    const historyBody =
        document.getElementById(
            "historyTableBody"
        );

    const historySummary =
        document.getElementById(
            "historySummary"
        );

    if (!historyBody) {
        return;
    }

    const appointments =
        allAppointments.filter(
            appointment => {

                const appointmentCustomerId =
                    appointment.customer ||
                    appointment.customer_id ||
                    appointment.customer?.id;

                return (
                    Number(
                        appointmentCustomerId
                    ) ===
                    Number(customerId)
                );
            }
        );

    if (historySummary) {

        historySummary.textContent =
            `${appointments.length} appointment(s)`;
    }

    if (appointments.length === 0) {

        historyBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="loading-cell"
                >
                    No appointment history found.
                </td>
            </tr>
        `;

        return;
    }

    appointments.sort(
        (a, b) => {

            const dateA =
                `${a.appointment_date || ""} ${a.start_time || ""}`;

            const dateB =
                `${b.appointment_date || ""} ${b.start_time || ""}`;

            return dateB.localeCompare(dateA);
        }
    );

    historyBody.innerHTML =
        appointments
            .map(appointment => {

                const doctor =
                    getAppointmentStaffName(
                        appointment
                    );

                const service =
                    appointment.service_name ||
                    appointment.service?.name ||
                    "-";

                const status =
                    appointment.status ||
                    "-";

                return `
                    <tr>

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
                            ${escapeHTML(
                                doctor
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                service
                            )}
                        </td>

                        <td>

                            <span class="status-badge status-${String(status).toLowerCase()}">
                                ${formatStatus(
                                    status
                                )}
                            </span>

                        </td>

                    </tr>
                `;
            })
            .join("");
}

function getAppointmentStaffName(
    appointment
) {

    if (appointment.staff_name) {

        return appointment.staff_name;
    }

    const staff =
        appointment.staff;

    if (
        staff &&
        typeof staff === "object"
    ) {

        if (staff.name) {
            return staff.name;
        }

        if (staff.full_name) {
            return staff.full_name;
        }

        if (staff.user) {

            return (
                `${staff.user.first_name || ""} ${staff.user.last_name || ""}`
            ).trim();
        }
    }

    return "-";
}

async function saveCustomer() {

    const customerId =
        document.getElementById(
            "customerId"
        )?.value;

    if (!customerId) {

        showToast(
            "Customer ID is missing.",
            "error"
        );

        return;
    }

    const firstName =
        document.getElementById(
            "firstName"
        )?.value.trim();

    const lastName =
        document.getElementById(
            "lastName"
        )?.value.trim();

    const phone =
        document.getElementById(
            "phone"
        )?.value.trim();

    const dateOfBirth =
        document.getElementById(
            "dateOfBirth"
        )?.value;

    const address =
        document.getElementById(
            "address"
        )?.value.trim();

    if (!firstName) {

        showToast(
            "First name is required.",
            "error"
        );

        return;
    }

    if (!lastName) {

        showToast(
            "Last name is required.",
            "error"
        );

        return;
    }

    if (!phone) {

        showToast(
            "Phone number is required.",
            "error"
        );

        return;
    }

    const phonePattern =
        /^[0-9+\-\s()]{7,15}$/;

    if (!phonePattern.test(phone)) {

        showToast(
            "Please enter a valid phone number.",
            "error"
        );

        return;
    }

    const payload = {

        first_name:
            firstName,

        last_name:
            lastName,

        phone:
            phone,

        date_of_birth:
            dateOfBirth || null,

        address:
            address || null
    };

    console.log(
        "Updating customer:",
        payload
    );

    try {

        const saveButton =
            document.getElementById(
                "saveCustomerBtn"
            );

        if (saveButton) {

            saveButton.disabled = true;

            saveButton.textContent =
                "Saving...";
        }

        const token =
            localStorage.getItem(
                "access_token"
            );

        const response =
            await fetch(
                `${API_BASE_URL}/accounts/customers/${customerId}/`,
                {
                    method: "PATCH",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        if (response.status === 401) {

            logout();
            return;
        }

        const data =
            await response.json()
                .catch(() => ({}));

        console.log(
            "Update response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                extractAPIError(data) ||
                "Failed to update customer."
            );
        }

        showToast(
            "Customer updated successfully.",
            "success"
        );

        closeCustomerModal();

        await loadCustomers();

        applyFilters();

    } catch (error) {

        console.error(
            "Save customer error:",
            error
        );

        showToast(
            error.message ||
            "Failed to update customer.",
            "error"
        );

    } finally {

        const saveButton =
            document.getElementById(
                "saveCustomerBtn"
            );

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent =
                "Save Changes";
        }
    }
}

function findCustomerById(
    customerId
) {

    return allCustomers.find(
        customer => {

            const normalized =
                normalizeCustomer(
                    customer
                );

            return (
                Number(
                    normalized.id
                ) ===
                Number(customerId)
            );
        }
    );
}

function formatDate(
    dateString
) {

    if (!dateString) {
        return "-";
    }

    if (
        /^\d{4}-\d{2}-\d{2}$/
            .test(dateString)
    ) {

        const [
            year,
            month,
            day
        ] =
            dateString.split("-");

        const date =
            new Date(
                Number(year),
                Number(month) - 1,
                Number(day)
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

    const date =
        new Date(dateString);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function formatDateTime(
    dateString
) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(dateString);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function formatTime(
    timeString
) {

    if (!timeString) {
        return "-";
    }

    const parts =
        timeString.split(":");

    if (parts.length < 2) {
        return timeString;
    }

    let hour =
        parseInt(
            parts[0],
            10
        );

    const minute =
        parts[1];

    if (
        Number.isNaN(hour)
    ) {

        return timeString;
    }

    const ampm =
        hour >= 12
            ? "PM"
            : "AM";

    hour =
        hour % 12 || 12;

    return `${hour}:${minute} ${ampm}`;
}

function normalizeDateForInput(
    dateString
) {

    if (!dateString) {
        return "";
    }

    if (
        /^\d{4}-\d{2}-\d{2}$/
            .test(dateString)
    ) {

        return dateString;
    }

    const date =
        new Date(dateString);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";
    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getInitials(name) {

    if (!name) {
        return "?";
    }

    const words =
        name
            .trim()
            .split(/\s+/);

    if (words.length === 1) {

        return words[0]
            .charAt(0)
            .toUpperCase();
    }

    return (
        words[0].charAt(0) +
        words[words.length - 1].charAt(0)
    ).toUpperCase();
}

function formatStatus(status) {

    if (!status) {
        return "-";
    }

    return status
        .toString()
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

function extractAPIError(data) {

    if (!data) {
        return null;
    }

    if (typeof data === "string") {
        return data;
    }

    if (data.detail) {
        return data.detail;
    }

    if (data.message) {
        return data.message;
    }

    const keys =
        Object.keys(data);

    if (keys.length > 0) {

        const key =
            keys[0];

        const error =
            data[key];

        if (Array.isArray(error)) {

            return `${key}: ${error.join(", ")}`;
        }

        if (typeof error === "string") {

            return `${key}: ${error}`;
        }
    }

    return null;
}

function showPageError(message) {

    const errorElement =
        document.getElementById(
            "pageError"
        );

    if (!errorElement) {

        console.error(
            message
        );

        return;
    }

    errorElement.textContent =
        message;

    errorElement.classList.remove(
        "hidden"
    );
}

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );

    if (!toast) {

        console.log(
            message
        );

        return;
    }

    if (toastMessage) {

        toastMessage.textContent =
            message;
    }

    toast.className =
        `toast ${type}`;

    toast.classList.add(
        "show"
    );

    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3500
    );
}

function redirectByRole(user) {

    if (!user) {
        logout();
        return;
    }

    if (user.role === "ADMIN") {

        window.location.href =
            "../admin/dashboard.html";

        return;
    }

    if (user.role === "CUSTOMER") {

        window.location.href =
            "../customer/dashboard.html";

        return;
    }

    if (user.role === "STAFF") {

        if (
            user.staff_type ===
            "RECEPTIONIST"
        ) {

            return;
        }

        window.location.href =
            "../staff/dashboard.html";

        return;
    }

    logout();
}

function logout() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "refresh_token"
    );

    localStorage.removeItem(
        "currentUser"
    );

    localStorage.removeItem(
        "currentStaff"
    );

    window.location.href =
        "../login.html";
}

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeCustomerModal();
        }
    }
);