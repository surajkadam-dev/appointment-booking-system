const API_BASE_URL = "http://127.0.0.1:8000/api";

document.addEventListener("DOMContentLoaded", () => {

    checkAuthentication();

    loadProfile();

    document
        .getElementById("logout-btn")
        .addEventListener("click", logout);
});

function checkAuthentication() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "../login.html";
        return false;
    }

    return true;
}

async function loadProfile() {

    const token = localStorage.getItem("access_token");

    try {

        const response = await fetch(
            `${API_BASE_URL}/accounts/customer/me/`,
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

        if (!response.ok) {
            throw new Error(
                data.detail || "Unable to load profile."
            );
        }

        displayProfile(data);

    } catch (error) {

        console.error("Profile error:", error);

        showMessage(
            error.message || "Unable to load profile.",
            "error"
        );
    }
}

function displayProfile(data) {

    const fullName =
        `${data.first_name || ""} ${data.last_name || ""}`.trim();

    document.getElementById("profile-name").textContent =
        fullName || "Customer";

    document.getElementById("profile-email").textContent =
        data.email || "-";

    document.getElementById("first-name").textContent =
        data.first_name || "-";

    document.getElementById("last-name").textContent =
        data.last_name || "-";

    document.getElementById("email").textContent =
        data.email || "-";

    document.getElementById("phone").textContent =
        data.phone || "-";

    document.getElementById("date-of-birth").textContent =
        formatDate(data.date_of_birth);

    document.getElementById("address").textContent =
        data.address || "No address added.";

    document.getElementById("customer-id").textContent =
        data.id || "-";

    document.getElementById("account-status").textContent =
        data.is_active ? "Active" : "Inactive";

    document.getElementById("account-status").className =
        data.is_active
            ? "field-value status-active"
            : "field-value";

    document.getElementById("created-at").textContent =
        formatDateTime(data.created_at);

    const firstLetter =
        (data.first_name || "C").charAt(0).toUpperCase();

    document.getElementById("profile-avatar").textContent =
        firstLetter;

    const topbarName =
        document.getElementById("topbar-name");

    if (topbarName) {
        topbarName.textContent = fullName || "Customer";
    }

    const topbarAvatar =
        document.getElementById("topbar-avatar");

    if (topbarAvatar) {
        topbarAvatar.textContent = firstLetter;
    }
}

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(dateString) {

    if (!dateString) {
        return "-";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function showMessage(message, type) {

    const messageElement =
        document.getElementById("profile-message");

    messageElement.textContent = message;

    messageElement.className =
        `profile-message ${type}`;

    messageElement.classList.remove("hidden");
}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("selected_service_id");

    window.location.href = "../login.html";
}