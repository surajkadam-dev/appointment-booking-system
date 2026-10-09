const API_BASE_URL = "http://127.0.0.1:8000/api";

document.addEventListener("DOMContentLoaded", () => {

    if (!checkAuthentication()) {
        return;
    }

    loadProfile();

    document
        .getElementById("update-profile-form")
        .addEventListener("submit", updateProfile);

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

        document.getElementById("first-name").value =
            data.first_name || "";

        document.getElementById("last-name").value =
            data.last_name || "";

        document.getElementById("email").value =
            data.email || "";

        document.getElementById("phone").value =
            data.phone || "";

        document.getElementById("date-of-birth").value =
            data.date_of_birth || "";

        document.getElementById("address").value =
            data.address || "";

    } catch (error) {

        console.error("Load profile error:", error);

        showMessage(
            error.message || "Unable to load profile.",
            "error"
        );
    }
}

async function updateProfile(event) {

    event.preventDefault();

    const token = localStorage.getItem("access_token");

    const button =
        document.getElementById("save-profile-btn");

    const firstName =
        document.getElementById("first-name").value.trim();

    const lastName =
        document.getElementById("last-name").value.trim();

    const phone =
        document.getElementById("phone").value.trim();

    const dateOfBirth =
        document.getElementById("date-of-birth").value;

    const address =
        document.getElementById("address").value.trim();

    if (!firstName) {
        showMessage("First name is required.", "error");
        return;
    }

    if (!lastName) {
        showMessage("Last name is required.", "error");
        return;
    }

    if (!phone) {
        showMessage("Phone number is required.", "error");
        return;
    }

    const payload = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        date_of_birth: dateOfBirth || null,
        address: address || null
    };

    try {

        button.disabled = true;
        button.textContent = "Saving...";

        const response = await fetch(
            `${API_BASE_URL}/accounts/customer/me/`,
            {
                method: "PATCH",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(payload)
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        if (!response.ok) {

            const errorMessage = getErrorMessage(data);

            throw new Error(errorMessage);
        }

        showMessage(
            "Profile updated successfully.",
            "success"
        );

        const storedUser =
            localStorage.getItem("user");

        if (storedUser) {

            try {

                const user = JSON.parse(storedUser);

                user.first_name =
                    data.first_name ?? firstName;

                user.last_name =
                    data.last_name ?? lastName;

                localStorage.setItem(
                    "user",
                    JSON.stringify(user)
                );

            } catch (error) {

                console.warn(
                    "Could not update stored user.",
                    error
                );
            }
        }

        setTimeout(() => {
            window.location.href = "profile.html";
        }, 800);

    } catch (error) {

        console.error("Update profile error:", error);

        showMessage(
            error.message || "Unable to update profile.",
            "error"
        );

    } finally {

        button.disabled = false;
        button.textContent = "Save Changes";
    }
}

function getErrorMessage(data) {

    if (!data) {
        return "Unable to update profile.";
    }

    if (typeof data === "string") {
        return data;
    }

    if (data.detail) {
        return data.detail;
    }

    const messages = [];

    Object.keys(data).forEach((field) => {

        const value = data[field];

        if (Array.isArray(value)) {

            messages.push(
                `${field}: ${value.join(", ")}`
            );

        } else {

            messages.push(
                `${field}: ${value}`
            );
        }
    });

    return messages.length
        ? messages.join(" | ")
        : "Unable to update profile.";
}

function showMessage(message, type) {

    const element =
        document.getElementById("update-message");

    element.textContent = message;

    element.className =
        `update-message ${type}`;

    element.classList.remove("hidden");
}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("selected_service_id");

    window.location.href = "../login.html";
}