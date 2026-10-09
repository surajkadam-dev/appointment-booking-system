const API_BASE_URL = "http://127.0.0.1:8000/api";

let appointments = [];
let customers = [];
let services = [];
let staffMembers = [];

let selectedService = null;
let selectedDoctor = null;

let currentRescheduleAppointment = null;

let currentPage = 1;
const ITEMS_PER_PAGE = 10;

const bookingModal =
    document.getElementById("bookingModal");

const bookingForm =
    document.getElementById("bookingForm");

const bookingCustomer =
    document.getElementById("bookingCustomer");

const bookingService =
    document.getElementById("bookingService");

const bookingStaff =
    document.getElementById("bookingStaff");

const bookingDate =
    document.getElementById("bookingDate");

const bookingStartTime =
    document.getElementById("bookingStartTime");

const bookingReason =
    document.getElementById("bookingReason");

const bookingSubmitBtn =
    document.getElementById("bookingSubmitBtn");

const bookingServiceHelp =
    document.getElementById("bookingServiceHelp");

const bookingDoctorHelp =
    document.getElementById("bookingDoctorHelp");

const bookingDateHelp =
    document.getElementById("bookingDateHelp");

const bookingTimeHelp =
    document.getElementById("bookingTimeHelp");

const bookingWorkingHoursInfo =
    document.getElementById("bookingWorkingHoursInfo");

const bookingWorkingHoursText =
    document.getElementById("bookingWorkingHoursText");

const summaryCustomer =
    document.getElementById("summaryCustomer");

const summaryService =
    document.getElementById("summaryService");

const summaryDoctor =
    document.getElementById("summaryDoctor");

const summaryDate =
    document.getElementById("summaryDate");

const summaryTime =
    document.getElementById("summaryTime");

const rescheduleModal =
    document.getElementById("rescheduleModal");

const rescheduleForm =
    document.getElementById("rescheduleForm");

const rescheduleDoctor =
    document.getElementById("rescheduleDoctor");

const rescheduleService =
    document.getElementById("rescheduleService");

const rescheduleDate =
    document.getElementById("rescheduleDate");

const rescheduleTime =
    document.getElementById("rescheduleTime");

const rescheduleDateHelp =
    document.getElementById("rescheduleDateHelp");

const rescheduleTimeHelp =
    document.getElementById("rescheduleTimeHelp");

const rescheduleWorkingHoursInfo =
    document.getElementById("rescheduleWorkingHoursInfo");

const rescheduleWorkingHoursText =
    document.getElementById("rescheduleWorkingHoursText");

const rescheduleSubmitBtn =
    document.getElementById("rescheduleSubmitBtn");

document.addEventListener("DOMContentLoaded", async () => {

    const token =
        localStorage.getItem("access_token");

    if (!token) {

        window.location.href = "../login.html";
        return;
    }

    setupAdminName();

    setupEventListeners();

    setMinimumDates();

    await loadInitialData();

    await loadAppointments();

    renderAppointments();
});

function setupAdminName() {

    try {

        const user =
            JSON.parse(
                localStorage.getItem("user") || "null"
            );

        if (!user) return;

        const element =
            document.getElementById("adminName");

        if (!element) return;

        const fullName =
            `${user.first_name || ""} ${user.last_name || ""}`.trim();

        element.textContent =
            fullName || "Admin";

    } catch (error) {

        console.error(
            "Unable to load admin name:",
            error
        );
    }
}

function getAuthHeaders() {

    const token =
        localStorage.getItem("access_token");

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

function handleUnauthorized() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "../login.html";
}

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "../login.html";
}

function setupEventListeners() {

    document
        .getElementById("openBookingBtn")
        ?.addEventListener("click", openBookingModal);

    bookingCustomer?.addEventListener("change", updateBookingSummary);

    bookingService?.addEventListener("change", handleBookingServiceChange);

    bookingStaff?.addEventListener("change", handleBookingDoctorChange);

    bookingDate?.addEventListener("change", handleBookingDateChange);

    bookingStartTime?.addEventListener("change", updateBookingSummary);

    bookingReason?.addEventListener("input", updateBookingSummary);

    bookingForm?.addEventListener("submit", handleBookingSubmit);

    rescheduleDate?.addEventListener("change", handleRescheduleDateChange);

    rescheduleTime?.addEventListener("change", updateRescheduleButton);

    rescheduleForm?.addEventListener("submit", handleRescheduleSubmit);

    document
        .getElementById("prevPageBtn")
        ?.addEventListener("click", previousPage);

    document
        .getElementById("nextPageBtn")
        ?.addEventListener("click", nextPage);

    document
        .getElementById("searchInput")
        ?.addEventListener("input", applyFilters);

    document
        .getElementById("staffFilter")
        ?.addEventListener("change", applyFilters);

    document
        .getElementById("serviceFilter")
        ?.addEventListener("change", applyFilters);

    document
        .getElementById("statusFilter")
        ?.addEventListener("change", applyFilters);

    document
        .getElementById("dateFilter")
        ?.addEventListener("change", applyFilters);

    document
        .getElementById("clearFiltersBtn")
        ?.addEventListener("click", () => {

            const searchInput =
                document.getElementById("searchInput");

            const staffFilter =
                document.getElementById("staffFilter");

            const serviceFilter =
                document.getElementById("serviceFilter");

            const statusFilter =
                document.getElementById("statusFilter");

            const dateFilter =
                document.getElementById("dateFilter");

            if (searchInput) searchInput.value = "";
            if (staffFilter) staffFilter.value = "";
            if (serviceFilter) serviceFilter.value = "";
            if (statusFilter) statusFilter.value = "";
            if (dateFilter) dateFilter.value = "";

            applyFilters();
        });

    document
        .querySelectorAll("[data-close]")
        .forEach(button => {

            button.addEventListener("click", () => {

                closeModal(button.dataset.close);
            });
        });

    document
        .querySelectorAll(".modal")
        .forEach(modal => {

            modal.addEventListener("click", event => {

                if (event.target === modal) {

                    modal.classList.add("hidden");
                }
            });
        });

    document
        .getElementById("logoutBtn")
        ?.addEventListener("click", logout);
}

async function loadInitialData() {

    try {

        await Promise.all([
            loadCustomers(),
            loadServices(),
            loadStaff()
        ]);

        populateBookingCustomers();
        populateBookingServices();

        populateFilterDropdowns();

    } catch (error) {

        console.error(
            "Initial data loading error:",
            error
        );

        showMessage(
            "Unable to load appointment data.",
            "error"
        );
    }
}

async function loadCustomers() {

    const response =
        await fetch(
            `${API_BASE_URL}/accounts/customers/`,
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
        throw new Error("Unable to load customers.");
    }

    const data = await response.json();

    customers =
        Array.isArray(data)
            ? data
            : data.results || [];
}

async function loadServices() {

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

    services =
        Array.isArray(data)
            ? data
            : data.results || [];

    services =
        services.filter(
            service => service.is_active !== false
        );
}

async function loadStaff() {

    const response =
        await fetch(
            `${API_BASE_URL}/accounts/staff/`,
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
        throw new Error("Unable to load staff.");
    }

    const data = await response.json();

    staffMembers =
        Array.isArray(data)
            ? data
            : data.results || [];

    staffMembers =
        staffMembers.filter(
            staff =>
                staff.is_active !== false &&
                staff.is_available !== false
        );
}

function populateBookingCustomers() {

    if (!bookingCustomer) return;

    bookingCustomer.innerHTML = `
        <option value="">
            Select Customer
        </option>
    `;

    customers.forEach(customer => {

        const option =
            document.createElement("option");

        option.value = customer.id;

        const name = getCustomerName(customer);

        const phone =
            customer.phone ? ` — ${customer.phone}` : "";

        option.textContent = `${name}${phone}`;

        bookingCustomer.appendChild(option);
    });
}

function populateBookingServices() {

    if (!bookingService) return;

    bookingService.innerHTML = `
        <option value="">
            Select Service
        </option>
    `;

    services.forEach(service => {

        const option =
            document.createElement("option");

        option.value = service.id;

        option.textContent =
            `${service.name} — ${service.duration} min`;

        bookingService.appendChild(option);
    });

    bookingService.disabled =
        services.length === 0;
}

function populateFilterDropdowns() {

    const staffFilter =
        document.getElementById("staffFilter");

    if (staffFilter) {

        staffFilter.innerHTML = `
            <option value="">
                All Staff
            </option>
        `;

        staffMembers.forEach(staff => {

            const option =
                document.createElement("option");

            option.value = staff.id;

            option.textContent = getStaffName(staff);

            staffFilter.appendChild(option);
        });
    }

    const serviceFilter =
        document.getElementById("serviceFilter");

    if (serviceFilter) {

        serviceFilter.innerHTML = `
            <option value="">
                All Services
            </option>
        `;

        services.forEach(service => {

            const option =
                document.createElement("option");

            option.value = service.id;

            option.textContent = service.name;

            serviceFilter.appendChild(option);
        });
    }
}

async function handleBookingServiceChange() {

    const serviceId = bookingService.value;

    selectedService = null;
    selectedDoctor = null;

    resetBookingDoctor();
    resetBookingDate();
    resetBookingTime();

    if (!serviceId) {
        updateBookingSummary();
        return;
    }

    selectedService =
        services.find(
            service =>
                Number(service.id) === Number(serviceId)
        );

    if (!selectedService) return;

    bookingStaff.disabled = true;

    bookingDoctorHelp.textContent =
        "Loading doctors...";

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/services/${serviceId}/doctors/`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (response.ok) {

            const data = await response.json();

            let doctors =
                Array.isArray(data)
                    ? data
                    : data.results || [];

            doctors =
                doctors.filter(
                    doctor =>
                        doctor.is_active !== false &&
                        doctor.is_available !== false
                );

            populateBookingDoctors(doctors);
            return;
        }

        const doctors =
            staffMembers.filter(
                staff => {

                    if (!Array.isArray(staff.services)) {
                        return false;
                    }

                    return staff.services.some(
                        service => {

                            const value =
                                typeof service === "object"
                                    ? service.id
                                    : service;

                            return Number(value) ===
                                Number(serviceId);
                        }
                    );
                }
            );

        populateBookingDoctors(doctors);

    } catch (error) {

        console.error("Doctor loading error:", error);

        const doctors =
            staffMembers.filter(
                staff => {

                    if (!Array.isArray(staff.services)) {
                        return false;
                    }

                    return staff.services.some(
                        service => {

                            const id =
                                typeof service === "object"
                                    ? service.id
                                    : service;

                            return Number(id) ===
                                Number(serviceId);
                        }
                    );
                }
            );

        populateBookingDoctors(doctors);
    }
}

function populateBookingDoctors(doctors) {

    bookingStaff.innerHTML = `
        <option value="">
            Select Doctor
        </option>
    `;

    if (!doctors || doctors.length === 0) {

        bookingStaff.innerHTML = `
            <option value="">
                No doctors available
            </option>
        `;

        bookingStaff.disabled = true;

        bookingDoctorHelp.textContent =
            "No doctors are assigned to this service.";

        return;
    }

    doctors.forEach(doctor => {

        const option =
            document.createElement("option");

        option.value = doctor.id;

        option.textContent = getStaffName(doctor);

        bookingStaff.appendChild(option);
    });

    bookingStaff.disabled = false;

    bookingDoctorHelp.textContent =
        "Select a doctor to view available dates.";
}

async function handleBookingDoctorChange() {

    const staffId = bookingStaff.value;

    selectedDoctor = null;

    resetBookingDate();
    resetBookingTime();

    if (!staffId) {
        updateBookingSummary();
        return;
    }

    selectedDoctor =
        staffMembers.find(
            staff =>
                Number(staff.id) === Number(staffId)
        );

    if (!selectedDoctor) {

        selectedDoctor = {
            id: Number(staffId),
            first_name:
                bookingStaff
                    .selectedOptions[0]
                    ?.textContent || "",
            last_name: ""
        };
    }

    bookingDate.disabled = false;

    bookingDateHelp.textContent =
        "Select a date to see available time slots.";

    updateBookingSummary();
}

async function handleBookingDateChange() {

    const date = bookingDate.value;

    resetBookingTime();

    if (!date) return;

    if (!selectedDoctor) {

        showMessage(
            "Please select a doctor first.",
            "error"
        );

        bookingDate.value = "";
        return;
    }

    if (date < getLocalDateString()) {

        showMessage(
            "Past dates cannot be selected.",
            "error"
        );

        bookingDate.value = "";
        return;
    }

    await loadAvailableTimeSlots(
        selectedDoctor.id,
        selectedService?.id,
        date,
        bookingStartTime,
        bookingTimeHelp,
        bookingWorkingHoursInfo,
        bookingWorkingHoursText,
        null
    );

    updateBookingSummary();
}

async function loadAvailableTimeSlots(
    staffId,
    serviceId,
    date,
    timeSelect,
    helpElement,
    workingHoursElement,
    workingHoursTextElement,
    excludeAppointmentId
) {

    if (!staffId || !serviceId || !date) {
        return;
    }

    timeSelect.disabled = true;

    timeSelect.innerHTML = `
        <option value="">
            Checking availability...
        </option>
    `;

    helpElement.textContent =
        "Checking doctor's working hours...";

    workingHoursElement.hidden = true;

    try {

        const availabilityResponse =
            await fetch(
                `${API_BASE_URL}/appointments/availability/?staff=${staffId}`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );

        if (availabilityResponse.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!availabilityResponse.ok) {
            throw new Error(
                "Unable to load doctor availability."
            );
        }

        const availabilityData =
            await availabilityResponse.json();

        const availability =
            Array.isArray(availabilityData)
                ? availabilityData
                : availabilityData.results || [];

        const dateObject = parseLocalDate(date);

        const javascriptDay = dateObject.getDay();

        const backendDay =
            javascriptDay === 0
                ? 6
                : javascriptDay - 1;

        const dayAvailability =
            availability
                .filter(
                    record =>
                        Number(record.staff) ===
                            Number(staffId)
                        &&
                        Number(record.day_of_week) ===
                            Number(backendDay)
                        &&
                        record.is_available === true
                )
                .sort(
                    (a, b) =>
                        timeToMinutes(a.start_time) -
                        timeToMinutes(b.start_time)
                );

        if (dayAvailability.length === 0) {

            timeSelect.innerHTML = `
                <option value="">
                    No working hours for this date
                </option>
            `;

            helpElement.textContent =
                "The doctor is not available on this day.";

            timeSelect.disabled = true;

            return;
        }

        const workingHours =
            dayAvailability
                .map(
                    record =>
                        `${formatTime(record.start_time)} - ${formatTime(record.end_time)}`
                )
                .join(" | ");

        workingHoursTextElement.textContent = workingHours;

        workingHoursElement.hidden = false;

        const appointmentResponse =
            await fetch(
                `${API_BASE_URL}/appointments/`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );

        if (appointmentResponse.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!appointmentResponse.ok) {
            throw new Error(
                "Unable to check existing appointments."
            );
        }

        const appointmentData =
            await appointmentResponse.json();

        const allAppointments =
            Array.isArray(appointmentData)
                ? appointmentData
                : appointmentData.results || [];

        const existingAppointments =
            allAppointments.filter(
                appointment => {

                    if (
                        Number(appointment.staff) !==
                        Number(staffId)
                    ) {
                        return false;
                    }

                    if (
                        appointment.appointment_date !==
                        date
                    ) {
                        return false;
                    }

                    if (
                        appointment.status !== "SCHEDULED"
                        &&
                        appointment.status !== "RESCHEDULED"
                    ) {
                        return false;
                    }

                    if (
                        excludeAppointmentId
                        &&
                        Number(appointment.id) ===
                            Number(excludeAppointmentId)
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        const service =
            services.find(
                item =>
                    Number(item.id) === Number(serviceId)
            );

        if (!service) {
            throw new Error("Service not found.");
        }

        const duration = Number(service.duration);

        if (!duration || duration <= 0) {
            throw new Error("Invalid service duration.");
        }

        const slots = [];

        dayAvailability.forEach(availabilityRecord => {

            let current =
                timeToMinutes(availabilityRecord.start_time);

            const end =
                timeToMinutes(availabilityRecord.end_time);

            while (current + duration <= end) {

                const slotStart = current;

                const slotEnd = current + duration;

                let isPast = false;

                if (date === getLocalDateString()) {

                    const now = new Date();

                    const currentMinutes =
                        now.getHours() * 60 +
                        now.getMinutes();

                    if (slotStart <= currentMinutes) {
                        isPast = true;
                    }
                }

                const hasConflict =
                    existingAppointments.some(
                        appointment => {

                            const existingStart =
                                timeToMinutes(
                                    appointment.start_time
                                );

                            const existingEnd =
                                timeToMinutes(
                                    appointment.end_time
                                );

                            return (
                                slotStart < existingEnd
                                &&
                                slotEnd > existingStart
                            );
                        }
                    );

                if (!isPast && !hasConflict) {

                    slots.push({
                        start: minutesToTime(slotStart),
                        end: minutesToTime(slotEnd)
                    });
                }

                current += duration;
            }
        });

        const uniqueSlots =
            slots.filter(
                (slot, index, array) =>
                    index ===
                    array.findIndex(
                        item =>
                            item.start === slot.start
                    )
            );

        if (uniqueSlots.length === 0) {

            timeSelect.innerHTML = `
                <option value="">
                    No available time slots
                </option>
            `;

            timeSelect.disabled = true;

            helpElement.textContent =
                "No appointment slots are available for this date.";

            return;
        }

        timeSelect.innerHTML = `
            <option value="">
                Select available time
            </option>
        `;

        uniqueSlots.forEach(slot => {

            const option =
                document.createElement("option");

            option.value = slot.start;

            option.textContent =
                `${formatTime(slot.start)} - ${formatTime(slot.end)}`;

            timeSelect.appendChild(option);
        });

        timeSelect.disabled = false;

        helpElement.textContent =
            `${uniqueSlots.length} available time slot(s).`;

    } catch (error) {

        console.error(
            "Time slot loading error:",
            error
        );

        timeSelect.innerHTML = `
            <option value="">
                Unable to load time slots
            </option>
        `;

        timeSelect.disabled = true;

        helpElement.textContent =
            error.message ||
            "Unable to load available time slots.";
    }
}

async function handleBookingSubmit(event) {

    event.preventDefault();

    const customerId = bookingCustomer.value;
    const serviceId = bookingService.value;
    const staffId = bookingStaff.value;
    const appointmentDate = bookingDate.value;
    const startTime = bookingStartTime.value;
    const reason = bookingReason.value.trim();

    if (!customerId) {
        showMessage("Please select a customer.", "error");
        return;
    }

    if (!serviceId) {
        showMessage("Please select a service.", "error");
        return;
    }

    if (!staffId) {
        showMessage("Please select a doctor.", "error");
        return;
    }

    if (!appointmentDate) {
        showMessage(
            "Please select an appointment date.",
            "error"
        );
        return;
    }

    if (!startTime) {
        showMessage(
            "Please select an available time.",
            "error"
        );
        return;
    }

    if (appointmentDate < getLocalDateString()) {
        showMessage(
            "Past dates cannot be selected.",
            "error"
        );
        return;
    }

    const requestBody = {
        customer: Number(customerId),
        staff: Number(staffId),
        service: Number(serviceId),
        appointment_date: appointmentDate,
        start_time: startTime,
        reason: reason || null
    };

    bookingSubmitBtn.disabled = true;
    bookingSubmitBtn.textContent = "Booking...";

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/staff-book/`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(requestBody)
                }
            );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {
            showMessage(extractApiError(data), "error");
            return;
        }

        showMessage(
            "Appointment booked successfully.",
            "success"
        );

        closeModal("bookingModal");

        bookingForm.reset();

        resetBookingDoctor();
        resetBookingDate();
        resetBookingTime();

        await loadAppointments();

        currentPage = 1;

        renderAppointments();

    } catch (error) {

        console.error("Booking error:", error);

        showMessage(
            error.message ||
            "Unable to book appointment.",
            "error"
        );

    } finally {

        bookingSubmitBtn.disabled = false;
        bookingSubmitBtn.textContent = "Book Appointment";
    }
}

async function openRescheduleModal(appointmentId) {

    const appointment =
        appointments.find(
            item =>
                Number(item.id) ===
                Number(appointmentId)
        );

    if (!appointment) {
        showMessage("Appointment not found.", "error");
        return;
    }

    if (
        appointment.status === "CANCELLED"
        ||
        appointment.status === "COMPLETED"
    ) {
        showMessage(
            "This appointment cannot be rescheduled.",
            "error"
        );
        return;
    }

    currentRescheduleAppointment = appointment;

    if (rescheduleDoctor) {
        rescheduleDoctor.textContent =
            getAppointmentStaffName(appointment);
    }

    if (rescheduleService) {
        rescheduleService.textContent =
            getAppointmentServiceName(appointment);
    }

    rescheduleDate.value = "";

    rescheduleTime.innerHTML = `
        <option value="">
            Select a date first
        </option>
    `;

    rescheduleTime.disabled = true;

    rescheduleSubmitBtn.disabled = true;

    rescheduleDate.min = getLocalDateString();

    rescheduleDateHelp.textContent =
        "Select a new date for this doctor.";

    rescheduleTimeHelp.textContent =
        "Available time slots will appear after selecting a date.";

    rescheduleWorkingHoursInfo.hidden = true;

    openModal("rescheduleModal");
}

async function handleRescheduleDateChange() {

    if (!currentRescheduleAppointment) return;

    const date = rescheduleDate.value;

    rescheduleTime.innerHTML = `
        <option value="">
            Checking availability...
        </option>
    `;

    rescheduleTime.disabled = true;
    rescheduleSubmitBtn.disabled = true;

    if (!date) return;

    if (date < getLocalDateString()) {

        showMessage(
            "Past dates cannot be selected.",
            "error"
        );

        rescheduleDate.value = "";
        return;
    }

    const appointment = currentRescheduleAppointment;

    await loadAvailableTimeSlots(
        appointment.staff,
        appointment.service,
        date,
        rescheduleTime,
        rescheduleTimeHelp,
        rescheduleWorkingHoursInfo,
        rescheduleWorkingHoursText,
        appointment.id
    );

    updateRescheduleButton();
}

function updateRescheduleButton() {

    if (!rescheduleSubmitBtn) return;

    rescheduleSubmitBtn.disabled =
        !(
            currentRescheduleAppointment
            &&
            rescheduleDate.value
            &&
            rescheduleTime.value
        );
}

async function handleRescheduleSubmit(event) {

    event.preventDefault();

    if (!currentRescheduleAppointment) return;

    const date = rescheduleDate.value;
    const time = rescheduleTime.value;

    if (!date || !time) {
        showMessage(
            "Please select an available date and time.",
            "error"
        );
        return;
    }

    rescheduleSubmitBtn.disabled = true;
    rescheduleSubmitBtn.textContent = "Rescheduling...";

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/${currentRescheduleAppointment.id}/reschedule/`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        appointment_date: date,
                        start_time: time
                    })
                }
            );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {
            showMessage(extractApiError(data), "error");
            return;
        }

        showMessage(
            "Appointment rescheduled successfully.",
            "success"
        );

        closeModal("rescheduleModal");

        currentRescheduleAppointment = null;

        await loadAppointments();

        currentPage = 1;

        renderAppointments();

    } catch (error) {

        console.error("Reschedule error:", error);

        showMessage(
            error.message ||
            "Unable to reschedule appointment.",
            "error"
        );

    } finally {

        rescheduleSubmitBtn.disabled = false;
        rescheduleSubmitBtn.textContent = "Reschedule";
    }
}

async function loadAppointments() {

    const tbody =
        document.getElementById("appointmentsTableBody");

    if (tbody) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    Loading appointments...
                </td>
            </tr>
        `;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/`,
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
            throw new Error("Unable to load appointments.");
        }

        const data = await response.json();

        appointments =
            Array.isArray(data)
                ? data
                : data.results || [];

        updateStatistics();

    } catch (error) {

        console.error("Appointment loading error:", error);

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="error-cell">
                        Unable to load appointments.
                    </td>
                </tr>
            `;
        }
    }
}

function renderAppointments() {

    const tbody =
        document.getElementById("appointmentsTableBody");

    if (!tbody) return;

    const filtered = getFilteredAppointments();

    const totalPages =
        Math.max(
            1,
            Math.ceil(filtered.length / ITEMS_PER_PAGE)
        );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex =
        (currentPage - 1) * ITEMS_PER_PAGE;

    const pageItems =
        filtered.slice(
            startIndex,
            startIndex + ITEMS_PER_PAGE
        );

    if (pageItems.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-cell">
                    No appointments found.
                </td>
            </tr>
        `;

    } else {

        tbody.innerHTML =
            pageItems
                .map((appointment, index) =>
                    renderAppointmentRow(
                        appointment,
                        startIndex + index + 1
                    )
                )
                .join("");
    }

    updatePagination(filtered.length, totalPages);
}

function renderAppointmentRow(appointment, serialNumber) {

    const customerName =
        getAppointmentCustomerName(appointment);

    const doctorName =
        getAppointmentStaffName(appointment);

    const serviceName =
        getAppointmentServiceName(appointment);

    const date =
        formatDate(appointment.appointment_date);

    const time =
        formatTime(appointment.start_time);

    const status =
        appointment.status || "SCHEDULED";

    const statusClass =
        status.toLowerCase();

    const canCancel =
        status === "SCHEDULED" ||
        status === "RESCHEDULED";

    const canReschedule =
        status === "SCHEDULED" ||
        status === "RESCHEDULED";

    const canComplete =
        status === "SCHEDULED" ||
        status === "RESCHEDULED";

    return `
        <tr>

            <td>${serialNumber}</td>

            <td>
                <strong>
                    ${escapeHtml(customerName)}
                </strong>
            </td>

            <td>
                ${escapeHtml(doctorName)}
            </td>

            <td>
                ${escapeHtml(serviceName)}
            </td>

            <td>
                ${escapeHtml(date)}
            </td>

            <td>
                ${escapeHtml(time)}
            </td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${escapeHtml(formatStatus(status))}
                </span>
            </td>

            <td>

                <div class="table-actions">

                    <button
                        type="button"
                        class="btn-small btn-view"
                        onclick="viewAppointment(${appointment.id})"
                    >
                        View
                    </button>

                    ${
                        canReschedule
                            ? `
                                <button
                                    type="button"
                                    class="btn-small btn-edit"
                                    onclick="openRescheduleModal(${appointment.id})"
                                >
                                    Reschedule
                                </button>
                            `
                            : ""
                    }

                    ${
                        canComplete
                            ? `
                                <button
                                    type="button"
                                    class="btn-small btn-success"
                                    onclick="completeAppointment(${appointment.id})"
                                >
                                    Complete
                                </button>
                            `
                            : ""
                    }

                    ${
                        canCancel
                            ? `
                                <button
                                    type="button"
                                    class="btn-small btn-danger"
                                    onclick="cancelAppointment(${appointment.id})"
                                >
                                    Cancel
                                </button>
                            `
                            : ""
                    }

                </div>

            </td>

        </tr>
    `;
}

function getFilteredAppointments() {

    const searchInput =
        document.getElementById("searchInput");

    const staffFilter =
        document.getElementById("staffFilter");

    const serviceFilter =
        document.getElementById("serviceFilter");

    const statusFilter =
        document.getElementById("statusFilter");

    const dateFilter =
        document.getElementById("dateFilter");

    const search =
        (searchInput?.value || "")
            .trim()
            .toLowerCase();

    const staffId = staffFilter?.value || "";
    const serviceId = serviceFilter?.value || "";
    const status = statusFilter?.value || "";
    const date = dateFilter?.value || "";

    return appointments.filter(appointment => {

        const customerName =
            getAppointmentCustomerName(appointment)
                .toLowerCase();

        const doctorName =
            getAppointmentStaffName(appointment)
                .toLowerCase();

        const serviceName =
            getAppointmentServiceName(appointment)
                .toLowerCase();

        const matchesSearch =
            !search ||
            customerName.includes(search) ||
            doctorName.includes(search) ||
            serviceName.includes(search);

        const matchesStaff =
            !staffId ||
            Number(appointment.staff) === Number(staffId);

        const matchesService =
            !serviceId ||
            Number(appointment.service) === Number(serviceId);

        const matchesStatus =
            !status ||
            appointment.status === status;

        const matchesDate =
            !date ||
            appointment.appointment_date === date;

        return (
            matchesSearch &&
            matchesStaff &&
            matchesService &&
            matchesStatus &&
            matchesDate
        );
    });
}

function applyFilters() {

    currentPage = 1;

    renderAppointments();
}

function updatePagination(totalItems, totalPages) {

    const pageInfo =
        document.getElementById("pageInfo");

    const prevButton =
        document.getElementById("prevPageBtn");

    const nextButton =
        document.getElementById("nextPageBtn");

    if (pageInfo) {
        pageInfo.textContent =
            `Page ${currentPage} of ${totalPages}`;
    }

    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
    }

    if (nextButton) {
        nextButton.disabled =
            currentPage >= totalPages;
    }
}

function previousPage() {

    if (currentPage > 1) {

        currentPage--;

        renderAppointments();
    }
}

function nextPage() {

    const filtered = getFilteredAppointments();

    const totalPages =
        Math.max(
            1,
            Math.ceil(filtered.length / ITEMS_PER_PAGE)
        );

    if (currentPage < totalPages) {

        currentPage++;

        renderAppointments();
    }
}

function updateStatistics() {

    const total = appointments.length;

    const scheduled =
        appointments.filter(
            appointment =>
                appointment.status === "SCHEDULED"
                ||
                appointment.status === "RESCHEDULED"
        ).length;

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

    setText("totalAppointments", total);
    setText("scheduledAppointments", scheduled);
    setText("completedAppointments", completed);
    setText("cancelledAppointments", cancelled);
}

function viewAppointment(appointmentId) {

    const appointment =
        appointments.find(
            item =>
                Number(item.id) ===
                Number(appointmentId)
        );

    if (!appointment) return;

    const customerName =
        getAppointmentCustomerName(appointment);

    const doctorName =
        getAppointmentStaffName(appointment);

    const serviceName =
        getAppointmentServiceName(appointment);

    const date =
        formatDate(appointment.appointment_date);

    const time =
        `${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}`;

    const container =
        document.getElementById("appointmentDetails");

    if (!container) return;

    container.innerHTML = `

        <div class="detail-row">
            <span class="detail-label">
                Customer
            </span>
            <span class="detail-value">
                ${escapeHtml(customerName)}
            </span>
        </div>

        <div class="detail-row">
            <span class="detail-label">
                Doctor
            </span>
            <span class="detail-value">
                ${escapeHtml(doctorName)}
            </span>
        </div>

        <div class="detail-row">
            <span class="detail-label">
                Service
            </span>
            <span class="detail-value">
                ${escapeHtml(serviceName)}
            </span>
        </div>

        <div class="detail-row">
            <span class="detail-label">
                Date
            </span>
            <span class="detail-value">
                ${escapeHtml(date)}
            </span>
        </div>

        <div class="detail-row">
            <span class="detail-label">
                Time
            </span>
            <span class="detail-value">
                ${escapeHtml(time)}
            </span>
        </div>

        <div class="detail-row">
            <span class="detail-label">
                Status
            </span>
            <span class="detail-value">
                ${escapeHtml(formatStatus(appointment.status))}
            </span>
        </div>

        <div class="detail-row">
            <span class="detail-label">
                Reason
            </span>
            <span class="detail-value">
                ${escapeHtml(appointment.reason || "—")}
            </span>
        </div>
    `;

    openModal("viewModal");
}

async function cancelAppointment(appointmentId) {

    const appointment =
        appointments.find(
            item =>
                Number(item.id) ===
                Number(appointmentId)
        );

    if (!appointment) return;

    const reason =
        prompt("Enter cancellation reason:");

    if (reason === null) return;

    if (!reason.trim()) {

        showMessage(
            "Cancellation reason is required.",
            "error"
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/${appointmentId}/cancel/`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        cancellation_reason: reason.trim()
                    })
                }
            );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {
            showMessage(extractApiError(data), "error");
            return;
        }

        showMessage(
            "Appointment cancelled successfully.",
            "success"
        );

        await loadAppointments();
        renderAppointments();

    } catch (error) {

        console.error("Cancel appointment error:", error);

        showMessage(
            "Unable to cancel appointment.",
            "error"
        );
    }
}

async function completeAppointment(appointmentId) {

    const confirmed =
        confirm(
            "Are you sure you want to mark this appointment as completed?"
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/${appointmentId}/complete/`,
                {
                    method: "POST",
                    headers: getAuthHeaders()
                }
            );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {
            showMessage(extractApiError(data), "error");
            return;
        }

        showMessage(
            "Appointment completed successfully.",
            "success"
        );

        await loadAppointments();
        renderAppointments();

    } catch (error) {

        console.error("Complete appointment error:", error);

        showMessage(
            "Unable to complete appointment.",
            "error"
        );
    }
}

function openBookingModal() {

    bookingForm?.reset();

    selectedService = null;
    selectedDoctor = null;

    resetBookingDoctor();
    resetBookingDate();
    resetBookingTime();

    setMinimumDates();

    updateBookingSummary();

    openModal("bookingModal");
}

function resetBookingDoctor() {

    if (!bookingStaff) return;

    bookingStaff.innerHTML = `
        <option value="">
            Select a service first
        </option>
    `;

    bookingStaff.disabled = true;

    if (bookingDoctorHelp) {

        bookingDoctorHelp.textContent =
            "Doctors assigned to the selected service will appear here.";
    }
}

function resetBookingDate() {

    if (!bookingDate) return;

    bookingDate.value = "";
    bookingDate.disabled = true;
    bookingDate.min = getLocalDateString();

    if (bookingDateHelp) {

        bookingDateHelp.textContent =
            "Select a doctor first.";
    }
}

function resetBookingTime() {

    if (!bookingStartTime) return;

    bookingStartTime.innerHTML = `
        <option value="">
            Select doctor and date first
        </option>
    `;

    bookingStartTime.disabled = true;

    if (bookingTimeHelp) {

        bookingTimeHelp.textContent =
            "Available time slots will appear after selecting a date.";
    }

    if (bookingWorkingHoursInfo) {
        bookingWorkingHoursInfo.hidden = true;
    }
}

function updateBookingSummary() {

    if (summaryCustomer) {

        const customer =
            customers.find(
                item =>
                    Number(item.id) ===
                    Number(bookingCustomer?.value)
            );

        summaryCustomer.textContent =
            customer
                ? getCustomerName(customer)
                : "—";
    }

    if (summaryService) {

        summaryService.textContent =
            selectedService
                ? selectedService.name
                : "—";
    }

    if (summaryDoctor) {

        summaryDoctor.textContent =
            selectedDoctor
                ? getStaffName(selectedDoctor)
                : "—";
    }

    if (summaryDate) {

        summaryDate.textContent =
            bookingDate?.value
                ? formatDate(bookingDate.value)
                : "—";
    }

    if (summaryTime) {

        summaryTime.textContent =
            bookingStartTime?.value
                ? formatTime(bookingStartTime.value)
                : "—";
    }
}

function openModal(modalId) {

    const modal = document.getElementById(modalId);

    if (!modal) return;

    modal.classList.remove("hidden");
}

function closeModal(modalId) {

    const modal = document.getElementById(modalId);

    if (!modal) return;

    modal.classList.add("hidden");

    if (modalId === "rescheduleModal") {
        currentRescheduleAppointment = null;
    }
}

function setMinimumDates() {

    const today = getLocalDateString();

    if (bookingDate) {
        bookingDate.min = today;
    }

    if (rescheduleDate) {
        rescheduleDate.min = today;
    }
}

function getLocalDateString() {

    const now = new Date();

    const year = now.getFullYear();

    const month =
        String(now.getMonth() + 1).padStart(2, "0");

    const day =
        String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {

    const [year, month, day] =
        dateString.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function timeToMinutes(time) {

    if (!time) return 0;

    const parts =
        String(time)
            .substring(0, 5)
            .split(":")
            .map(Number);

    return parts[0] * 60 + parts[1];
}

function minutesToTime(totalMinutes) {

    const hours =
        Math.floor(totalMinutes / 60);

    const minutes =
        totalMinutes % 60;

    return (
        String(hours).padStart(2, "0")
        +
        ":" +
        String(minutes).padStart(2, "0")
    );
}

function formatTime(time) {

    if (!time) return "—";

    const [hourString, minuteString] =
        String(time).substring(0, 5).split(":");

    let hour = Number(hourString);

    const minute = minuteString;

    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) hour = 12;

    return `${hour}:${minute} ${suffix}`;
}

function formatDate(dateString) {

    if (!dateString) return "—";

    const date = parseLocalDate(dateString);

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function getCustomerName(customer) {

    if (!customer) return "Unknown Customer";

    if (customer.user) {

        const first = customer.user.first_name || "";
        const last = customer.user.last_name || "";
        const full = `${first} ${last}`.trim();

        if (full) return full;
    }

    const first = customer.first_name || "";
    const last = customer.last_name || "";
    const full = `${first} ${last}`.trim();

    if (full) return full;

    return (
        customer.name ||
        customer.email ||
        `Customer #${customer.id}`
    );
}

function getStaffName(staff) {

    if (!staff) return "Unknown Doctor";

    if (staff.user) {

        const first = staff.user.first_name || "";
        const last = staff.user.last_name || "";
        const full = `${first} ${last}`.trim();

        if (full) return full;
    }

    const first = staff.first_name || "";
    const last = staff.last_name || "";
    const full = `${first} ${last}`.trim();

    if (full) return full;

    return (
        staff.name ||
        staff.email ||
        `Doctor #${staff.id}`
    );
}

function getAppointmentCustomerName(appointment) {

    if (appointment.customer_details) {
        return getCustomerName(appointment.customer_details);
    }

    if (appointment.customer_name) {
        return appointment.customer_name;
    }

    const customer =
        customers.find(
            item =>
                Number(item.id) ===
                Number(appointment.customer)
        );

    if (customer) {
        return getCustomerName(customer);
    }

    return `Customer #${appointment.customer || "—"}`;
}

function getAppointmentStaffName(appointment) {

    if (appointment.staff_details) {
        return getStaffName(appointment.staff_details);
    }

    if (appointment.staff_name) {
        return appointment.staff_name;
    }

    const staff =
        staffMembers.find(
            item =>
                Number(item.id) ===
                Number(appointment.staff)
        );

    if (staff) {
        return getStaffName(staff);
    }

    return `Doctor #${appointment.staff || "—"}`;
}

function getAppointmentServiceName(appointment) {

    if (appointment.service_details) {
        return (
            appointment.service_details.name ||
            `Service #${appointment.service}`
        );
    }

    if (appointment.service_name) {
        return appointment.service_name;
    }

    const service =
        services.find(
            item =>
                Number(item.id) ===
                Number(appointment.service)
        );

    if (service) {
        return service.name;
    }

    return `Service #${appointment.service || "—"}`;
}

function formatStatus(status) {

    if (!status) return "Unknown";

    return String(status)
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(
            /\b\w/g,
            char => char.toUpperCase()
        );
}

function extractApiError(data) {

    if (!data) return "Something went wrong.";

    if (typeof data === "string") {
        return data;
    }

    if (data.detail) {
        return String(data.detail);
    }

    if (data.message) {
        return String(data.message);
    }

    const messages = [];

    Object.keys(data).forEach(key => {

        const value = data[key];

        if (Array.isArray(value)) {

            messages.push(
                `${key}: ${value.join(", ")}`
            );

        } else if (
            typeof value === "object" &&
            value !== null
        ) {

            messages.push(
                `${key}: ${JSON.stringify(value)}`
            );

        } else {

            messages.push(`${key}: ${value}`);
        }
    });

    return messages.length
        ? messages.join(" | ")
        : "Something went wrong.";
}

function showMessage(message, type = "info") {

    const toast =
        document.getElementById("toast");

    if (!toast) {

        alert(message);
        return;
    }

    toast.textContent = message;

    toast.className = `toast ${type}`;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3500);
}

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.viewAppointment = viewAppointment;
window.openRescheduleModal = openRescheduleModal;
window.cancelAppointment = cancelAppointment;
window.completeAppointment = completeAppointment;
window.closeModal = closeModal;