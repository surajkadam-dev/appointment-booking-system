/* =========================================================
   APPOINTLY
   Customer Registration
   ========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000/api";


document.addEventListener("DOMContentLoaded", () => {

    const registerForm =
        document.getElementById("registerForm");

    const registerButton =
        document.getElementById("registerButton");

    const registerButtonText =
        document.getElementById("registerButtonText");

    const registerSpinner =
        document.getElementById("registerSpinner");

    const registerError =
        document.getElementById("registerError");


    /* =========================
       PASSWORD VISIBILITY
    ========================== */

    const passwordToggles =
        document.querySelectorAll(
            ".password-toggle"
        );

    passwordToggles.forEach((button) => {

        button.addEventListener("click", () => {

            const targetId =
                button.dataset.target;

            const input =
                document.getElementById(targetId);

            if (!input) {
                return;
            }

            const showingPassword =
                input.type === "text";

            input.type =
                showingPassword
                    ? "password"
                    : "text";

            button.textContent =
                showingPassword
                    ? "Show"
                    : "Hide";

        });

    });


    /* =========================
       REGISTRATION
    ========================== */

    registerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            clearErrors();


            const firstName =
                document
                    .getElementById("firstName")
                    .value
                    .trim();

            const lastName =
                document
                    .getElementById("lastName")
                    .value
                    .trim();

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const phone =
                document
                    .getElementById("phone")
                    .value
                    .trim();

            const dateOfBirth =
                document
                    .getElementById("dateOfBirth")
                    .value;

            const address =
                document
                    .getElementById("address")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;

            const confirmPassword =
                document
                    .getElementById("confirmPassword")
                    .value;


            /* =========================
               CLIENT VALIDATION
            ========================== */

            let hasError = false;


            if (!firstName) {

                showFieldError(
                    "firstNameError",
                    "First name is required."
                );

                hasError = true;

            }


            if (!lastName) {

                showFieldError(
                    "lastNameError",
                    "Last name is required."
                );

                hasError = true;

            }


            if (!email) {

                showFieldError(
                    "emailError",
                    "Email address is required."
                );

                hasError = true;

            } else if (!isValidEmail(email)) {

                showFieldError(
                    "emailError",
                    "Enter a valid email address."
                );

                hasError = true;

            }


            if (!phone) {

                showFieldError(
                    "phoneError",
                    "Phone number is required."
                );

                hasError = true;

            } else if (!isValidPhone(phone)) {

                showFieldError(
                    "phoneError",
                    "Enter a valid phone number."
                );

                hasError = true;

            }


            if (!password) {

                showFieldError(
                    "passwordError",
                    "Password is required."
                );

                hasError = true;

            } else if (password.length < 8) {

                showFieldError(
                    "passwordError",
                    "Password must be at least 8 characters."
                );

                hasError = true;

            }


            if (!confirmPassword) {

                showFieldError(
                    "confirmPasswordError",
                    "Please confirm your password."
                );

                hasError = true;

            } else if (
                password !== confirmPassword
            ) {

                showFieldError(
                    "confirmPasswordError",
                    "Passwords do not match."
                );

                hasError = true;

            }


            if (hasError) {
                return;
            }


            setLoading(true);


            try {

                /*
                 * The backend forces the registered
                 * account to CUSTOMER.
                 *
                 * No role is sent from the frontend.
                 */

                const payload = {

                    email: email,

                    password: password,

                    first_name: firstName,

                    last_name: lastName,

                    phone: phone,

                    address: address || null,

                    date_of_birth:
                        dateOfBirth || null

                };


                const response = await fetch(
                    `${API_BASE_URL}/accounts/register/`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );


                const data =
                    await getResponseData(response);


                if (!response.ok) {

                    throw new Error(
                        getRegistrationErrorMessage(
                            data
                        )
                    );

                }


                /*
                 * Registration successful.
                 *
                 * We do not automatically log the
                 * customer in unless the backend
                 * explicitly returns JWT tokens.
                 */

                showSuccessMessage(
                    "Account created successfully. Redirecting to sign in..."
                );


                setTimeout(() => {

                    window.location.href =
                        "login.html";

                }, 1200);


            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );

                showRegisterError(
                    error.message ||
                    "Unable to create your account. Please try again."
                );

            } finally {

                setLoading(false);

            }

        }
    );


    /* =========================
       FIELD ERROR
    ========================== */

    function showFieldError(
        elementId,
        message
    ) {

        const element =
            document.getElementById(elementId);

        if (element) {
            element.textContent = message;
        }

    }


    /* =========================
       CLEAR ERRORS
    ========================== */

    function clearErrors() {

        const errors =
            document.querySelectorAll(
                ".field-error"
            );

        errors.forEach((error) => {
            error.textContent = "";
        });


        registerError.textContent = "";

        registerError.classList.remove(
            "visible"
        );

        registerError.classList.remove(
            "success"
        );

    }


    /* =========================
       REGISTER ERROR
    ========================== */

    function showRegisterError(message) {

        registerError.textContent =
            message;

        registerError.classList.add(
            "visible"
        );

    }


    /* =========================
       SUCCESS
    ========================== */

    function showSuccessMessage(message) {

        registerError.textContent =
            message;

        registerError.classList.add(
            "visible"
        );

        registerError.classList.add(
            "success"
        );

    }


    /* =========================
       LOADING
    ========================== */

    function setLoading(isLoading) {

        registerButton.disabled =
            isLoading;

        registerSpinner.classList.toggle(
            "visible",
            isLoading
        );

        registerButtonText.textContent =
            isLoading
                ? "Creating account..."
                : "Create account";

    }


    /* =========================
       EMAIL VALIDATION
    ========================== */

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);

    }


    /* =========================
       PHONE VALIDATION
    ========================== */

    function isValidPhone(phone) {

        return /^[0-9+\-\s()]{10,15}$/
            .test(phone);

    }


    /* =========================
       RESPONSE
    ========================== */

    async function getResponseData(
        response
    ) {

        const contentType =
            response.headers.get(
                "content-type"
            );


        if (
            contentType &&
            contentType.includes(
                "application/json"
            )
        ) {

            return await response.json();

        }


        const text =
            await response.text();

        return {
            detail:
                text ||
                "Unexpected server response."
        };

    }


    /* =========================
       BACKEND ERROR
    ========================== */

    function getRegistrationErrorMessage(
        data
    ) {

        if (data.detail) {
            return data.detail;
        }


        const messages = [];


        const fields = [
            "email",
            "password",
            "first_name",
            "last_name",
            "phone",
            "address",
            "date_of_birth"
        ];


        fields.forEach((field) => {

            if (!data[field]) {
                return;
            }


            const value =
                data[field];


            if (Array.isArray(value)) {

                messages.push(
                    `${field}: ${value.join(" ")}`
                );

            } else {

                messages.push(
                    `${field}: ${value}`
                );

            }

        });


        if (data.non_field_errors) {

            if (
                Array.isArray(
                    data.non_field_errors
                )
            ) {

                messages.push(
                    data.non_field_errors.join(" ")
                );

            } else {

                messages.push(
                    data.non_field_errors
                );

            }

        }


        return messages.length > 0
            ? messages.join(" ")
            : "Unable to create the account.";

    }

});