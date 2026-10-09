const API_BASE = "http://127.0.0.1:8000/api";

let token = localStorage.getItem("access_token");

let currentUser = null;

let appointments = [];


/* =========================
   PAGE LOAD
========================= */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("========================================");
    console.log("Receptionist Dashboard");
    console.log("========================================");


    if (!checkAuthentication()) {
        return;
    }


    const userLoaded = await loadCurrentUser();

    if (!userLoaded) {
        return;
    }


    setupLogout();

    await loadReceptionistDashboard();

});


/* =========================
   AUTHENTICATION
========================= */

function checkAuthentication() {

    token = localStorage.getItem("access_token");


    if (!token) {

        console.error("Access token not found.");

        window.location.href = "../login.html";

        return false;
    }


    return true;
}


/* =========================
   LOAD CURRENT USER
========================= */

async function loadCurrentUser() {

    try {

        console.log(
            "Loading current user from /api/accounts/me/..."
        );


        const response = await fetch(
            `${API_BASE}/accounts/me/`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );


        console.log(
            "Current user API status:",
            response.status
        );


        /* TOKEN INVALID */

        if (response.status === 401) {

            console.error(
                "Token expired or invalid."
            );

            logout();

            return false;
        }


        /* OTHER ERROR */

        if (!response.ok) {

            const errorData =
                await response.json()
                    .catch(() => ({}));


            console.error(
                "Current user API error:",
                errorData
            );


            showToast(
                errorData.detail ||
                "Unable to load current user information."
            );


            return false;
        }


        /* SUCCESS */

        const data = await response.json();


        console.log(
            "Current user from API:",
            data
        );


        currentUser = data;


        /*
         * Update localStorage with
         * fresh backend information.
         */

        localStorage.setItem(
            "user",
            JSON.stringify(data)
        );


        const role =
            String(data.role || "").toUpperCase();


        /*
         * Receptionist is still
         * STAFF in backend.
         */

        if (role !== "STAFF") {

            console.error(
                "Current user is not Staff:",
                role
            );


            if (role === "ADMIN") {

                window.location.href =
                    "../admin/dashboard.html";

            }
            else if (role === "CUSTOMER") {

                window.location.href =
                    "../customer/dashboard.html";

            }
            else {

                window.location.href =
                    "../index.html";
            }


            return false;
        }


        /*
         * Important:
         * Only Receptionist should
         * access this dashboard.
         */

        const staffType =
            String(data.staff_type || "")
                .toUpperCase();


        if (staffType !== "RECEPTIONIST") {

            console.error(
                "User is not a Receptionist:",
                staffType
            );


            /*
             * Doctor / Other Staff
             * should use staff dashboard.
             */

            window.location.href =
                "../staff/dashboard.html";


            return false;
        }


        console.log(
            "Receptionist verified:",
            data
        );


        return true;


    }
    catch (error) {

        console.error(
            "Unable to load current user:",
            error
        );


        showToast(
            "Unable to connect to the server."
        );


        return false;
    }
}


/* =========================
   LOAD DASHBOARD
========================= */

async function loadReceptionistDashboard() {

    try {

        updateUserInformation();

        await loadAppointments();

    }
    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        showToast(
            "Unable to load dashboard."
        );
    }
}


/* =========================
   USER INFORMATION
========================= */

function updateUserInformation() {

    if (!currentUser) {

        console.error(
            "Current user is not available."
        );

        return;
    }


    const firstName =
        currentUser.first_name || "";


    const lastName =
        currentUser.last_name || "";


    const fullName =
        `${firstName} ${lastName}`.trim()
        || "Receptionist";


    const email =
        currentUser.email || "-";


    const staffType =
        formatStaffType(
            currentUser.staff_type ||
            "RECEPTIONIST"
        );


    const department =
        currentUser.department || "-";


    const designation =
        currentUser.designation || "-";


    /* HEADER */

    const welcomeTitle =
        document.getElementById(
            "welcomeTitle"
        );


    if (welcomeTitle) {

        welcomeTitle.textContent =
            `Welcome, ${firstName || "Receptionist"}`;
    }


    const staffName =
        document.getElementById(
            "staffName"
        );


    if (staffName) {

        staffName.textContent =
            fullName;
    }


    const staffTypeElement =
        document.getElementById(
            "staffType"
        );


    if (staffTypeElement) {

        staffTypeElement.textContent =
            staffType;
    }


    const staffSubtitle =
        document.getElementById(
            "staffSubtitle"
        );


    if (staffSubtitle) {

        staffSubtitle.textContent =
            "Receptionist Dashboard";
    }


    const staffAvatar =
        document.getElementById(
            "staffAvatar"
        );


    if (staffAvatar) {

        staffAvatar.textContent =
            getInitials(fullName);
    }


    /* PROFILE */

    const profileName =
        document.getElementById(
            "profileName"
        );


    if (profileName) {

        profileName.textContent =
            fullName;
    }


    const profileEmail =
        document.getElementById(
            "profileEmail"
        );


    if (profileEmail) {

        profileEmail.textContent =
            email;
    }


    const profileStaffType =
        document.getElementById(
            "profileStaffType"
        );


    if (profileStaffType) {

        profileStaffType.textContent =
            staffType;
    }


    const profileDepartment =
        document.getElementById(
            "profileDepartment"
        );


    if (profileDepartment) {

        profileDepartment.textContent =
            department;
    }


    const profileDesignation =
        document.getElementById(
            "profileDesignation"
        );


    if (profileDesignation) {

        profileDesignation.textContent =
            designation;
    }

}


/* =========================
   LOAD APPOINTMENTS
========================= */

async function loadAppointments() {

    try {

        console.log(
            "Loading receptionist appointments..."
        );


        const response = await fetch(
            `${API_BASE}/appointments/`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );


        console.log(
            "Appointments API status:",
            response.status
        );


        /* TOKEN INVALID */

        if (response.status === 401) {

            console.error(
                "Appointment API returned 401."
            );


            logout();

            return;
        }


        /* API ERROR */

        if (!response.ok) {

            throw new Error(
                `Appointment API failed: ${response.status}`
            );
        }


        const data =
            await response.json();


        console.log(
            "Appointments API response:",
            data
        );


        /*
         * DRF pagination support.
         */

        appointments =
            Array.isArray(data)
                ? data
                : (
                    Array.isArray(data.results)
                        ? data.results
                        : []
                );


        console.log(
            "Receptionist appointments:",
            appointments
        );


        updateStatistics();

        renderTodayAppointments();

    }
    catch (error) {

        console.error(
            "Load appointments error:",
            error
        );


        showToast(
            "Unable to load appointments."
        );
    }
}


/* =========================
   STATISTICS
========================= */

function updateStatistics() {

    const total =
        appointments.length;


    const completed =
        appointments.filter(
            appointment =>
                appointment.status === "COMPLETED"
        ).length;


    const cancelled =
        appointments.filter(
            appointment =>
                appointment.status === "CANCELLED"
        ).length;


    const today =
        getTodayAppointments().length;


    const totalElement =
        document.getElementById(
            "totalAppointments"
        );


    const todayElement =
        document.getElementById(
            "todayAppointments"
        );


    const completedElement =
        document.getElementById(
            "completedAppointments"
        );


    const cancelledElement =
        document.getElementById(
            "cancelledAppointments"
        );


    if (totalElement) {

        totalElement.textContent =
            total;
    }


    if (todayElement) {

        todayElement.textContent =
            today;
    }


    if (completedElement) {

        completedElement.textContent =
            completed;
    }


    if (cancelledElement) {

        cancelledElement.textContent =
            cancelled;
    }

}


/* =========================
   TODAY'S APPOINTMENTS
========================= */

function getTodayAppointments() {

    const today =
        getLocalDateString();


    return appointments

        .filter(
            appointment =>
                appointment.appointment_date === today
        )

        .sort(
            (a, b) =>
                (a.start_time || "")
                    .localeCompare(
                        b.start_time || ""
                    )
        );
}


/* =========================
   RENDER TODAY APPOINTMENTS
========================= */

function renderTodayAppointments() {

    const tbody =
        document.getElementById(
            "todayAppointmentsBody"
        );


    if (!tbody) {

        console.error(
            "todayAppointmentsBody not found."
        );

        return;
    }


    const todayAppointments =
        getTodayAppointments();


    /*
     * No appointments.
     */

    if (todayAppointments.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-cell">
                    No appointments scheduled for today.
                </td>
            </tr>
        `;

        return;
    }


    /*
     * Display maximum 5
     * appointments on dashboard.
     */

    tbody.innerHTML =
        todayAppointments
            .slice(0, 5)
            .map(appointment => {


                const customer =
                    appointment.customer_name ||
                    "Customer";


                const doctor =
                    appointment.staff_name ||
                    "Doctor";


                const service =
                    appointment.service_name ||
                    "Service";


                const time =
                    formatTime(
                        appointment.start_time
                    );


                const status =
                    appointment.status ||
                    "SCHEDULED";


                return `

                    <tr>

                        <td>
                            ${escapeHtml(customer)}
                        </td>

                        <td>
                            ${escapeHtml(doctor)}
                        </td>

                        <td>
                            ${escapeHtml(service)}
                        </td>

                        <td>
                            ${escapeHtml(time)}
                        </td>

                        <td>

                            <span
                                class="status-badge ${status.toLowerCase()}"
                            >

                                ${formatStatus(status)}

                            </span>

                        </td>

                        <td>

                            <button
                                class="action-btn"
                                onclick="viewAppointment(${appointment.id})"
                            >

                                View

                            </button>

                        </td>

                    </tr>

                `;
            })
            .join("");
}


/* =========================
   VIEW APPOINTMENT
========================= */

function viewAppointment(id) {

    window.location.href =
        `appointments.html?id=${id}`;
}


/* =========================
   LOGOUT
========================= */

function setupLogout() {

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (!logoutBtn) {

        console.warn(
            "Logout button not found."
        );

        return;
    }


    logoutBtn.addEventListener(
        "click",
        logout
    );
}


function logout() {

    console.log(
        "Receptionist logging out..."
    );


    localStorage.removeItem(
        "access_token"
    );


    localStorage.removeItem(
        "refresh_token"
    );


    localStorage.removeItem(
        "user"
    );


    window.location.href =
        "../login.html";
}


/* =========================
   DATE
========================= */

function getLocalDateString() {

    const date =
        new Date();


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


/* =========================
   TIME FORMAT
========================= */

function formatTime(time) {

    if (!time) {

        return "-";
    }


    const parts =
        String(time).split(":");


    let hour =
        parseInt(
            parts[0],
            10
        );


    const minute =
        parts[1] || "00";


    const suffix =
        hour >= 12
            ? "PM"
            : "AM";


    hour =
        hour % 12 || 12;


    return `${hour}:${minute} ${suffix}`;
}


/* =========================
   STATUS FORMAT
========================= */

function formatStatus(status) {

    if (!status) {

        return "-";
    }


    return String(status)

        .toLowerCase()

        .replace(
            /_/g,
            " "
        )

        .replace(
            /\b\w/g,
            char =>
                char.toUpperCase()
        );
}


/* =========================
   STAFF TYPE FORMAT
========================= */

function formatStaffType(type) {

    if (!type) {

        return "Staff";
    }


    return String(type)

        .toLowerCase()

        .replace(
            /_/g,
            " "
        )

        .replace(
            /\b\w/g,
            char =>
                char.toUpperCase()
        );
}


/* =========================
   INITIALS
========================= */

function getInitials(name) {

    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (parts.length === 0) {

        return "R";
    }


    if (parts.length === 1) {

        return parts[0]
            .charAt(0)
            .toUpperCase();
    }


    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


/* =========================
   HTML ESCAPE
========================= */

function escapeHtml(value) {

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


/* =========================
   TOAST
========================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        console.warn(
            "Toast element not found:",
            message
        );

        return;
    }


    toast.textContent =
        message;


    toast.style.display =
        "block";


    setTimeout(() => {

        toast.style.display =
            "none";

    }, 3000);
}