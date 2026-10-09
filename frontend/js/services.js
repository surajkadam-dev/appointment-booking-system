const API_BASE_URL = "http://127.0.0.1:8000/api";

const servicesGrid =
    document.getElementById("services-grid");

const servicesLoading =
    document.getElementById("services-loading");

const servicesEmpty =
    document.getElementById("services-empty");

const servicesMessage =
    document.getElementById("services-message");

const logoutButton =
    document.getElementById("logout-btn");

document.addEventListener("DOMContentLoaded", () => {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "../login.html";
        return;
    }

    loadServices();

    setupLogout();
});

function getAuthHeaders() {

    const token =
        localStorage.getItem("access_token");

    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

async function loadServices() {

    showLoading();

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/services/`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load services.");
        }

        const data = await response.json();

        const services =
            Array.isArray(data)
                ? data
                : data.results || [];

        hideLoading();

        if (services.length === 0) {
            showEmpty();
            return;
        }

        renderServices(services);

    } catch (error) {

        console.error("Services loading error:", error);

        hideLoading();

        showMessage(
            "Unable to load services. Please try again.",
            "error"
        );
    }
}

function renderServices(services) {

    servicesGrid.innerHTML = "";

    services.forEach(service => {

        const card = createServiceCard(service);

        servicesGrid.appendChild(card);
    });
}

function createServiceCard(service) {

    const card =
        document.createElement("article");

    card.className = "service-card";

    const description =
        service.description && service.description.trim()
            ? service.description
            : "No description available.";

    const price =
        formatPrice(service.price);

    const duration =
        `${service.duration} min`;

    card.innerHTML = `

        <div class="service-card-top">

            <div class="service-icon">✓</div>

            <span class="service-status">Available</span>

        </div>


        <h2 class="service-name">
            ${escapeHtml(service.name)}
        </h2>


        <p class="service-description">
            ${escapeHtml(description)}
        </p>


        <div class="service-details">

            <div class="service-detail">

                <span class="service-detail-label">Duration</span>

                <span class="service-detail-value">${duration}</span>

            </div>


            <div class="service-detail">

                <span class="service-detail-label">Fees</span>

                <span class="service-detail-value">${price}</span>

            </div>

        </div>


        <div class="service-card-footer">

            <button
                type="button"
                class="book-service-btn"
                data-service-id="${service.id}"
            >
                Book Appointment
            </button>

        </div>

    `;

    const button =
        card.querySelector(".book-service-btn");

    button.addEventListener("click", () => {

        bookService(service.id);
    });

    return card;
}

function bookService(serviceId) {

    sessionStorage.setItem(
        "selected_service_id",
        String(serviceId)
    );

    window.location.href = "book-appointment.html";
}

function formatPrice(price) {

    const amount = Number(price);

    if (Number.isNaN(amount)) {
        return "₹ —";
    }

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(amount);
}

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showLoading() {

    servicesLoading.hidden = false;

    servicesLoading.classList.remove("hidden");

    servicesGrid.innerHTML = "";

    servicesEmpty.hidden = true;
}

function hideLoading() {

    servicesLoading.hidden = true;

    servicesLoading.classList.add("hidden");
}

function showEmpty() {

    servicesEmpty.hidden = false;

    servicesGrid.innerHTML = "";
}

function showMessage(message, type = "error") {

    servicesMessage.textContent = message;

    servicesMessage.className =
        `services-message ${type}`;

    servicesMessage.hidden = false;
}

function clearMessage() {

    servicesMessage.textContent = "";

    servicesMessage.className = "services-message";

    servicesMessage.hidden = true;
}

function handleUnauthorized() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "../login.html";
}

function setupLogout() {

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", () => {

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");

        sessionStorage.removeItem("selected_service_id");

        window.location.href = "../login.html";
    });
}