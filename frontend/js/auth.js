/* =========================================================
   APPOINTLY
   Authentication
   ========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000/api";


document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");

    const emailInput = document.getElementById("email");

    const passwordInput = document.getElementById("password");

    const passwordToggle =
        document.getElementById("passwordToggle");

    const loginButton =
        document.getElementById("loginButton");

    const loginButtonText =
        document.getElementById("loginButtonText");

    const loginSpinner =
        document.getElementById("loginSpinner");

    const loginError =
        document.getElementById("loginError");

    const emailError =
        document.getElementById("emailError");

    const passwordError =
        document.getElementById("passwordError");


    /* =========================
       PASSWORD VISIBILITY
    ========================== */

    passwordToggle.addEventListener("click", () => {

        const isPassword =
            passwordInput.type === "password";

        passwordInput.type =
            isPassword ? "text" : "password";

        passwordToggle.textContent =
            isPassword ? "Hide" : "Show";

        passwordToggle.setAttribute(
            "aria-label",
            isPassword
                ? "Hide password"
                : "Show password"
        );

    });


    /* =========================
       LOGIN
    ========================== */

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        clearErrors();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        const rememberMe =
            document.getElementById("rememberMe").checked;


        /* Validate */

        let hasError = false;


        if (!email) {

            emailError.textContent =
                "Email address is required.";

            hasError = true;

        } else if (!isValidEmail(email)) {

            emailError.textContent =
                "Enter a valid email address.";

            hasError = true;
        }


        if (!password) {

            passwordError.textContent =
                "Password is required.";

            hasError = true;
        }


        if (hasError) {
            return;
        }


        setLoading(true);


        try {

            const response = await fetch(
                `${API_BASE_URL}/accounts/login/`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );


            const data = await getResponseData(response);


            if (!response.ok) {

                throw new Error(
                    getLoginErrorMessage(data)
                );
            }


            /*
             * Your Django backend returns JWT tokens
             * and user information including the role.
             */

            if (!data.access) {

                throw new Error(
                    "Login succeeded but no access token was returned."
                );
            }


            /*
             * Store authentication information.
             */

// ==========================================
// STORE AUTHENTICATION DATA
// ==========================================

localStorage.setItem(
    "access_token",
    data.access
);


if (data.refresh) {

    localStorage.setItem(
        "refresh_token",
        data.refresh
    );

}


if (data.user) {

    localStorage.setItem(
        "user",
        JSON.stringify(data.user)
    );

}


            /*
             * Redirect according to role.
             */

            const role =
                data.user?.role;


            redirectByRole(role,data.user.staff_type);


        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            showLoginError(
                error.message ||
                "Unable to sign in. Please try again."
            );

        } finally {

            setLoading(false);

        }

    });


    /* =========================
       CLEAR ERRORS
    ========================== */

    function clearErrors() {

        emailError.textContent = "";

        passwordError.textContent = "";

        loginError.textContent = "";

        loginError.classList.remove(
            "visible"
        );

    }


    /* =========================
       SHOW LOGIN ERROR
    ========================== */

    function showLoginError(message) {

        loginError.textContent = message;

        loginError.classList.add(
            "visible"
        );

    }


    /* =========================
       LOADING STATE
    ========================== */

    function setLoading(isLoading) {

        loginButton.disabled =
            isLoading;

        loginSpinner.classList.toggle(
            "visible",
            isLoading
        );

        loginButtonText.textContent =
            isLoading
                ? "Signing in..."
                : "Sign in";

    }


    /* =========================
       EMAIL VALIDATION
    ========================== */

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);

    }


    /* =========================
       RESPONSE PARSER
    ========================== */

    async function getResponseData(response) {

        const contentType =
            response.headers.get(
                "content-type"
            );


        if (
            contentType &&
            contentType.includes("application/json")
        ) {

            return await response.json();

        }


        const text =
            await response.text();

        return {
            detail:
                text || "Unexpected server response."
        };

    }


    /* =========================
       ERROR MESSAGE
    ========================== */

    function getLoginErrorMessage(data) {

        if (data.detail) {
            return data.detail;
        }


        if (data.non_field_errors) {

            return Array.isArray(
                data.non_field_errors
            )
                ? data.non_field_errors.join(" ")
                : data.non_field_errors;
        }


        if (data.email) {

            return Array.isArray(data.email)
                ? data.email.join(" ")
                : data.email;
        }


        if (data.password) {

            return Array.isArray(data.password)
                ? data.password.join(" ")
                : data.password;
        }


        return "Invalid email or password.";

    }


    /* =========================
       ROLE REDIRECTION
    ========================== */

function redirectByRole(role, staffType = null) {

    switch (role) {

        case "CUSTOMER":

            window.location.href =
                "customer/dashboard.html";

            break;


        case "STAFF":

            if (staffType === "RECEPTIONIST") {

                window.location.href =
                    "receptionist/dashboard.html";

            } else {

                // Doctor / Other Staff
                window.location.href =
                    "staff/dashboard.html";
            }

            break;


        case "ADMIN":

            window.location.href =
                "admin/dashboard.html";

            break;


        default:

            showLoginError(
                "Your account role could not be determined."
            );

            break;
    }
}

});