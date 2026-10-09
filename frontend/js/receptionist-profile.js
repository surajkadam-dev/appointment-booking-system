const API_BASE_URL = "http://127.0.0.1:8000/api";

const loadingState =
    document.getElementById("loadingState");

const errorState =
    document.getElementById("errorState");

const profileContent =
    document.getElementById("profileContent");

const errorMessage =
    document.getElementById("errorMessage");

const retryBtn =
    document.getElementById("retryBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadProfile();
    }
);

async function loadProfile() {

    showLoading();

    const token =
        localStorage.getItem("access_token");

    if (!token) {

        window.location.href = "../login.html";

        return;
    }

    try {

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

            return;
        }

        const data = await response.json();

        console.log("Receptionist profile:", data);

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to load profile."
            );
        }

        if (data.role !== "STAFF") {

            redirectByRole(data.role, data.staff_type);

            return;
        }

        if (data.staff_type !== "RECEPTIONIST") {

            redirectByRole(data.role, data.staff_type);

            return;
        }

        displayProfile(data);

    } catch (error) {

        console.error("Profile loading error:", error);

        showError(
            error.message ||
            "Unable to load profile."
        );
    }
}

function displayProfile(data) {

    const firstName = data.first_name || "";
    const lastName = data.last_name || "";

    const fullName =
        `${firstName} ${lastName}`.trim();

    document.getElementById("topbarName").textContent =
        fullName || "Receptionist";

    document.getElementById("profileName").textContent =
        fullName || "Receptionist";

    document.getElementById("profileEmail").textContent =
        data.email || "-";

    const initial =
        firstName
            ? firstName.charAt(0).toUpperCase()
            : "R";

    document.getElementById("topbarAvatar").textContent =
        initial;

    document.getElementById("profileAvatar").textContent =
        initial;

    document.getElementById("firstName").textContent =
        firstName || "-";

    document.getElementById("lastName").textContent =
        lastName || "-";

    document.getElementById("email").textContent =
        data.email || "-";

    document.getElementById("phone").textContent =
        data.phone || "-";

    document.getElementById("staffType").textContent =
        formatStaffType(data.staff_type);

    document.getElementById("designation").textContent =
        data.designation || "-";

    document.getElementById("department").textContent =
        data.department || "-";

    const statusElement =
        document.getElementById("accountStatus");

    if (data.is_active === false) {

        statusElement.textContent = "Inactive";
        statusElement.className = "status-badge";

    } else {

        statusElement.textContent = "Active";
        statusElement.className = "status-badge active";
    }

    loadingState.classList.add("hidden");
    errorState.classList.add("hidden");
    profileContent.classList.remove("hidden");
}

function formatStaffType(type) {

    if (!type) {
        return "-";
    }

    switch (type) {

        case "RECEPTIONIST":
            return "Receptionist";

        case "DOCTOR":
            return "Doctor";

        case "OTHER":
            return "Other Staff";

        default:
            return type;
    }
}

function showLoading() {

    loadingState.classList.remove("hidden");
    errorState.classList.add("hidden");
    profileContent.classList.add("hidden");
}

function showError(message) {

    loadingState.classList.add("hidden");
    profileContent.classList.add("hidden");
    errorState.classList.remove("hidden");

    errorMessage.textContent = message;
}

if (retryBtn) {

    retryBtn.addEventListener(
        "click",
        () => {

            loadProfile();
        }
    );
}

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            logout();
        }
    );
}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "../login.html";
}

function redirectByRole(role, staffType = null) {

    if (role === "ADMIN") {

        window.location.href =
            "../admin/dashboard.html";

        return;
    }

    if (role === "CUSTOMER") {

        window.location.href =
            "../customer/dashboard.html";

        return;
    }

    if (role === "STAFF") {

        if (staffType === "RECEPTIONIST") {

            window.location.href = "dashboard.html";

        } else {

            window.location.href =
                "../staff/dashboard.html";
        }

        return;
    }

    logout();
}