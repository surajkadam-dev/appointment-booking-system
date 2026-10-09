const API_BASE_URL = "http://127.0.0.1:8000/api";

let services = [];
let selectedServiceIds = [];


/* =========================================
   PAGE INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", async () => {

    // Check whether logged-in user is Admin
    checkAdminAccess();

    // Show Admin name in header
    setupAdminName();

    // Setup services dropdown
    setupServicesDropdown();

    // Load services from backend API
    await loadServices();

    // Staff form submit
    document
        .getElementById("addStaffForm")
        .addEventListener("submit", handleSubmit);

    // Logout
    document
        .getElementById("logoutBtn")
        .addEventListener("click", logout);
});


/* =========================================
   ADMIN AUTHENTICATION
========================================= */

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

            alert(
                "You do not have permission to access this page."
            );

            window.location.href = "../login.html";
        }

    } catch (error) {

        console.error(
            "Invalid user data:",
            error
        );

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");

        window.location.href = "../login.html";
    }
}


/* =========================================
   ADMIN NAME
========================================= */

function setupAdminName() {

    const userData =
        localStorage.getItem("user");

    if (!userData) {
        return;
    }

    try {

        const user =
            JSON.parse(userData);

        const fullName =
            `${user.first_name || ""} ${user.last_name || ""}`.trim();

        document.getElementById("adminName").textContent =
            fullName || "Admin";

    } catch (error) {

        console.error(
            "Unable to load admin name:",
            error
        );

        document.getElementById("adminName").textContent =
            "Admin";
    }
}


/* =========================================
   SERVICES DROPDOWN
========================================= */

function setupServicesDropdown() {

    const button =
        document.getElementById(
            "servicesDropdownButton"
        );

    const dropdown =
        document.getElementById(
            "servicesDropdown"
        );

    if (!button || !dropdown) {
        console.error(
            "Services dropdown elements not found."
        );
        return;
    }


    // Open / close dropdown
    button.addEventListener("click", (event) => {

        event.stopPropagation();

        dropdown.classList.toggle("open");
    });


    // Close when clicking outside
    document.addEventListener("click", (event) => {

        if (!dropdown.contains(event.target)) {

            dropdown.classList.remove("open");
        }
    });
}


/* =========================================
   LOAD SERVICES FROM API
========================================= */

async function loadServices() {

    const menu =
        document.getElementById(
            "servicesDropdownMenu"
        );

    if (!menu) {
        return;
    }


    menu.innerHTML = `
        <div class="services-loading">
            Loading services...
        </div>
    `;


    try {

        const token =
            localStorage.getItem("access_token");


        const response = await fetch(
            `${API_BASE_URL}/services/`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        if (!response.ok) {

            if (response.status === 401) {

                handleUnauthorized();

                return;
            }

            throw new Error(
                "Unable to load services."
            );
        }


        const data =
            await response.json();


        /*
         * DRF may return either:
         *
         * [
         *   {...},
         *   {...}
         * ]
         *
         * OR:
         *
         * {
         *   count: 2,
         *   results: [...]
         * }
         */

        services =
            Array.isArray(data)
                ? data
                : data.results || [];


        /*
         * Only active services should be
         * available for staff assignment.
         */

        services =
            services.filter(
                service =>
                    service.is_active === true
            );


        renderServices();

    } catch (error) {

        console.error(
            "Service loading error:",
            error
        );


        menu.innerHTML = `
            <div class="services-error">
                Unable to load services.
            </div>
        `;
    }
}


/* =========================================
   RENDER SERVICES
========================================= */

function renderServices() {

    const menu =
        document.getElementById(
            "servicesDropdownMenu"
        );


    if (!menu) {
        return;
    }


    if (services.length === 0) {

        menu.innerHTML = `
            <div class="services-empty">
                No active services available.
            </div>
        `;

        return;
    }


    menu.innerHTML =
        services.map(service => {

            return `
                <label class="service-option">

                    <input
                        type="checkbox"
                        value="${service.id}"
                        class="service-checkbox"
                    >

                    <span class="service-option-content">

                        <span class="service-name">
                            ${escapeHtml(service.name)}
                        </span>

                        <span class="service-duration">
                            ${service.duration} min
                        </span>

                    </span>

                </label>
            `;

        }).join("");


    /*
     * Add change event to every checkbox.
     */

    document
        .querySelectorAll(".service-checkbox")
        .forEach(checkbox => {

            checkbox.addEventListener(
                "change",
                handleServiceSelection
            );

        });
}


/* =========================================
   SERVICE SELECTION
========================================= */

function handleServiceSelection(event) {

    const serviceId =
        Number(event.target.value);


    if (event.target.checked) {

        /*
         * Add selected service
         */

        if (!selectedServiceIds.includes(serviceId)) {

            selectedServiceIds.push(
                serviceId
            );
        }

    } else {

        /*
         * Remove unselected service
         */

        selectedServiceIds =
            selectedServiceIds.filter(
                id => id !== serviceId
            );
    }


    updateSelectedServicesText();
}


/* =========================================
   UPDATE DROPDOWN TEXT
========================================= */

function updateSelectedServicesText() {

    const text =
        document.getElementById(
            "servicesSelectedText"
        );


    if (!text) {
        return;
    }


    if (selectedServiceIds.length === 0) {

        text.textContent =
            "Select services";

        return;
    }


    const selectedServices =
        services.filter(service =>
            selectedServiceIds.includes(
                Number(service.id)
            )
        );


    if (selectedServices.length === 0) {

        text.textContent =
            "Select services";

        return;
    }


    /*
     * Show selected service names.
     */

    text.textContent =
        selectedServices
            .map(service => service.name)
            .join(", ");
}


/* =========================================
   FORM SUBMIT
========================================= */

async function handleSubmit(event) {

    event.preventDefault();


    const createButton =
        document.getElementById(
            "createStaffBtn"
        );


    /* -------------------------------------
       Get password values
    ------------------------------------- */

    const password =
        document.getElementById(
            "password"
        ).value;


    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        ).value;


    /* -------------------------------------
       Validate password
    ------------------------------------- */

    if (password.length < 8) {

        showMessage(
            "Password must contain at least 8 characters.",
            "error"
        );

        return;
    }


    if (password !== confirmPassword) {

        showMessage(
            "Passwords do not match.",
            "error"
        );

        return;
    }


    /* -------------------------------------
       Get staff information
    ------------------------------------- */

    const firstName =
        document.getElementById(
            "firstName"
        ).value.trim();


    const lastName =
        document.getElementById(
            "lastName"
        ).value.trim();


    const email =
        document.getElementById(
            "email"
        ).value.trim();


    const phone =
        document.getElementById(
            "phone"
        ).value.trim();


    const staffType =
        document.getElementById(
            "staffType"
        ).value;


    const designation =
        document.getElementById(
            "designation"
        ).value.trim();


    const department =
        document.getElementById(
            "department"
        ).value.trim();


    /* -------------------------------------
       Basic validation
    ------------------------------------- */

    if (!firstName) {

        showMessage(
            "First name is required.",
            "error"
        );

        return;
    }


    if (!lastName) {

        showMessage(
            "Last name is required.",
            "error"
        );

        return;
    }


    if (!email) {

        showMessage(
            "Email address is required.",
            "error"
        );

        return;
    }


    if (!phone) {

        showMessage(
            "Phone number is required.",
            "error"
        );

        return;
    }


    if (!staffType) {

        showMessage(
            "Please select a staff type.",
            "error"
        );

        return;
    }


    /* -------------------------------------
       Prepare API request
    ------------------------------------- */

    const data = {

        email: email,

        password: password,

        first_name: firstName,

        last_name: lastName,

        phone: phone,

        staff_type: staffType,

        designation: designation,

        department: department,

        /*
         * Selected service IDs
         *
         * Example:
         * services: [1, 2, 5]
         */

        services: selectedServiceIds
    };


    console.log(
        "Creating staff with data:",
        data
    );


    /* -------------------------------------
       Disable button
    ------------------------------------- */

    createButton.disabled = true;

    createButton.textContent =
        "Creating...";


    try {

        const token =
            localStorage.getItem(
                "access_token"
            );


        const response = await fetch(
            `${API_BASE_URL}/accounts/staff/`,
            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`
                },

                body: JSON.stringify(data)
            }
        );


        /* ---------------------------------
           Parse response
        --------------------------------- */

        const result =
            await response.json();


        console.log(
            "Staff API response:",
            result
        );


        /* ---------------------------------
           Unauthorized
        --------------------------------- */

        if (response.status === 401) {

            handleUnauthorized();

            return;
        }


        /* ---------------------------------
           Permission denied
        --------------------------------- */

        if (response.status === 403) {

            showMessage(
                "You do not have permission to create staff.",
                "error"
            );

            return;
        }


        /* ---------------------------------
           Validation / API error
        --------------------------------- */

        if (!response.ok) {

            const errorMessage =
                formatApiErrors(result);

            throw new Error(
                errorMessage
            );
        }


        /* ---------------------------------
           SUCCESS
        --------------------------------- */

        showMessage(
            "Staff account created successfully.",
            "success"
        );


        /*
         * Reset form
         */

        document
            .getElementById(
                "addStaffForm"
            )
            .reset();


        /*
         * Clear selected services
         */

        selectedServiceIds = [];


        /*
         * Update dropdown text
         */

        updateSelectedServicesText();


        /*
         * Uncheck all service checkboxes
         */

        document
            .querySelectorAll(
                ".service-checkbox"
            )
            .forEach(checkbox => {

                checkbox.checked = false;

            });


        /*
         * Redirect to Staff Management /
         * Dashboard after successful creation.
         *
         * Currently using dashboard.
         */

        setTimeout(() => {

            window.location.href =
                "dashboard.html";

        }, 1200);


    } catch (error) {

        console.error(
            "Staff creation error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to create staff account.",
            "error"
        );

    } finally {

        createButton.disabled = false;

        createButton.textContent =
            "Create Staff";
    }
}


/* =========================================
   FORMAT API ERRORS
========================================= */

function formatApiErrors(errors) {

    if (!errors) {

        return "Unable to create staff account.";
    }


    if (typeof errors === "string") {

        return errors;
    }


    const messages = [];


    Object.entries(errors)
        .forEach(([field, value]) => {

            /*
             * DRF error:
             *
             * {
             *   "email": [
             *      "A user with this email..."
             *   ]
             * }
             */

            if (Array.isArray(value)) {

                messages.push(
                    `${formatFieldName(field)}: ${value.join(", ")}`
                );

            } else {

                messages.push(
                    `${formatFieldName(field)}: ${value}`
                );
            }
        });


    if (messages.length === 0) {

        return "Unable to create staff account.";
    }


    return messages.join(" ");
}


/* =========================================
   FORMAT FIELD NAME
========================================= */

function formatFieldName(field) {

    return field
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


/* =========================================
   HTML ESCAPE
========================================= */

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


/* =========================================
   UNAUTHORIZED HANDLER
========================================= */

function handleUnauthorized() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "refresh_token"
    );

    localStorage.removeItem(
        "user"
    );

    sessionStorage.clear();


    alert(
        "Your session has expired. Please login again."
    );


    window.location.href =
        "../login.html";
}


/* =========================================
   SHOW MESSAGE
========================================= */

function showMessage(message, type) {

    const box =
        document.getElementById(
            "messageBox"
        );


    if (!box) {
        return;
    }


    box.textContent =
        message;


    box.className =
        `message-box ${type}`;


    box.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =========================================
   LOGOUT
========================================= */

function logout() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "refresh_token"
    );

    localStorage.removeItem(
        "user"
    );

    sessionStorage.clear();


    window.location.href =
        "../login.html";
}