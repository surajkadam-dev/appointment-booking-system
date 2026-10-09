const API_BASE = "http://127.0.0.1:8000/api";

let token = localStorage.getItem("access_token");
let currentUser = null;

let appointments = [];
let customers = [];
let doctors = [];
let services = [];

let filteredAppointments = [];
let currentPage = 1;

const PAGE_SIZE = 10;
let currentRescheduleAppointmentId = null;

document.addEventListener("DOMContentLoaded", async () => {

    if (!checkAuthentication()) {
        return;
    }

    const userLoaded = await loadCurrentUser();

    if (!userLoaded) {
        return;
    }

    setupEvents();

    setMinimumDates();

    prepareTimeSelectors();

    await Promise.all([
        loadAppointments(),
        loadCustomers(),
        loadDoctors(),
        loadServices()
    ]);

    populateFilterDropdowns();
    populateBookingDropdowns();

    applyFilters();
});

function checkAuthentication() {

    token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "../login.html";
        return false;
    }

    return true;
}

async function loadCurrentUser() {

    try {

        const response = await fetch(
            `${API_BASE}/accounts/me/`,
            {
                headers: authHeaders()
            }
        );

        if (response.status === 401) {

            logout();

            return false;
        }

        if (!response.ok) {

            showToast(
                "Unable to load user information."
            );

            return false;
        }

        currentUser = await response.json();

        localStorage.setItem(
            "user",
            JSON.stringify(currentUser)
        );

        const role =
            String(
                currentUser.role || ""
            ).toUpperCase();

        const staffType =
            String(
                currentUser.staff_type || ""
            ).toUpperCase();

        if (
            role !== "STAFF" ||
            staffType !== "RECEPTIONIST"
        ) {

            if (role === "ADMIN") {

                window.location.href =
                    "../admin/dashboard.html";

            } else {

                window.location.href =
                    "../staff/dashboard.html";
            }

            return false;
        }

        updateHeader();

        return true;

    } catch (error) {

        console.error(error);

        showToast(
            "Unable to connect to server."
        );

        return false;
    }
}

function authHeaders() {

    return {
        "Authorization":
            `Bearer ${token}`,

        "Content-Type":
            "application/json"
    };
}

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

    window.location.href =
        "../login.html";
}

function updateHeader() {

    const firstName =
        currentUser?.first_name || "";

    const lastName =
        currentUser?.last_name || "";

    const fullName =
        `${firstName} ${lastName}`.trim()
        || "Receptionist";

    const nameElement =
        document.getElementById(
            "staffName"
        );

    const avatarElement =
        document.getElementById(
            "staffAvatar"
        );

    if (nameElement) {

        nameElement.textContent =
            fullName;
    }

    if (avatarElement) {

        avatarElement.textContent =
            getInitials(fullName);
    }
}

function setupEvents() {

    bind(
        "logoutBtn",
        "click",
        logout
    );

    bind(
        "openBookModalBtn",
        "click",
        openBookModal
    );

    bind(
        "closeBookModalBtn",
        "click",
        closeBookModal
    );

    bind(
        "cancelBookBtn",
        "click",
        closeBookModal
    );

    bind(
        "bookAppointmentForm",
        "submit",
        handleBookAppointment
    );

    bind(
        "closeViewModalBtn",
        "click",
        closeViewModal
    );

    bind(
        "closeViewBtn",
        "click",
        closeViewModal
    );

    bind(
        "closeRescheduleModalBtn",
        "click",
        closeRescheduleModal
    );

    bind(
        "cancelRescheduleBtn",
        "click",
        closeRescheduleModal
    );

    bind(
        "rescheduleForm",
        "submit",
        handleReschedule
    );

    bind(
        "searchInput",
        "input",
        applyFilters
    );

    bind(
        "staffFilter",
        "change",
        applyFilters
    );

    bind(
        "serviceFilter",
        "change",
        applyFilters
    );

    bind(
        "statusFilter",
        "change",
        applyFilters
    );

    bind(
        "dateFilter",
        "change",
        applyFilters
    );

    bind(
        "clearFiltersBtn",
        "click",
        clearFilters
    );

    bind(
        "prevBtn",
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                renderAppointments();
            }
        }
    );

    bind(
        "nextBtn",
        "click",
        () => {

            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        filteredAppointments.length /
                        PAGE_SIZE
                    )
                );

            if (
                currentPage <
                totalPages
            ) {

                currentPage++;

                renderAppointments();
            }
        }
    );

    const customerInput =
        document.getElementById(
            "customerInput"
        );

    const serviceInput =
        document.getElementById(
            "serviceInput"
        );

    const staffInput =
        document.getElementById(
            "staffInput"
        );

    const dateInput =
        document.getElementById(
            "appointmentDateInput"
        );

    if (customerInput) {

        customerInput.addEventListener(
            "change",
            updateBookingSummary
        );
    }

    if (serviceInput) {

        serviceInput.addEventListener(
            "change",
            async () => {

                await handleBookingServiceChange();
            }
        );
    }

    if (staffInput) {

        staffInput.addEventListener(
            "change",
            async () => {

                await handleBookingDoctorChange();
            }
        );
    }

    if (dateInput) {

        dateInput.addEventListener(
            "change",
            async () => {

                await loadBookingTimeSlots();
            }
        );
    }

    const rescheduleDate =
        document.getElementById(
            "rescheduleDate"
        );

    if (rescheduleDate) {

        rescheduleDate.addEventListener(
            "change",
            async () => {

                await loadRescheduleTimeSlots();
            }
        );
    }

    document.addEventListener(
        "click",
        handleDynamicAppointmentButtons
    );
}

async function loadAppointments() {

    try {

        const response = await fetch(
            `${API_BASE}/appointments/`,
            {
                headers: authHeaders()
            }
        );

        if (response.status === 401) {

            logout();

            return;
        }

        if (!response.ok) {

            throw new Error(
                "Failed to load appointments."
            );
        }

        const data =
            await response.json();

        appointments =
            normalizeList(data);

        updateStatistics();

        applyFilters();

    } catch (error) {

        console.error(
            "Appointments:",
            error
        );

        showToast(
            "Failed to load appointments."
        );
    }
}

async function loadCustomers() {

    try {

        const response = await fetch(
            `${API_BASE}/accounts/customers/`,
            {
                headers: authHeaders()
            }
        );

        if (!response.ok) {

            throw new Error(
                "Failed to load customers."
            );
        }

        const data =
            await response.json();

        customers =
            normalizeList(data);

        populateBookingCustomerSelect();

    } catch (error) {

        console.error(
            "Customers:",
            error
        );

        showToast(
            "Failed to load customers."
        );
    }
}

async function loadDoctors() {

    try {

        const response = await fetch(
            `${API_BASE}/accounts/staff/`,
            {
                headers: authHeaders()
            }
        );

        if (!response.ok) {

            throw new Error(
                "Failed to load staff."
            );
        }

        const data =
            await response.json();

        const allStaff =
            normalizeList(data);

        doctors =
            allStaff.filter(
                staff => {

                    return isDoctor(staff);
                }
            );

        populateDoctorFilter();

        populateBookingDoctorSelect(
            []
        );

    } catch (error) {

        console.error(
            "Doctors:",
            error
        );

        showToast(
            "Failed to load doctors."
        );
    }
}

async function loadServices() {

    try {

        const response = await fetch(
            `${API_BASE}/services/`,
            {
                headers: authHeaders()
            }
        );

        if (!response.ok) {

            throw new Error(
                "Failed to load services."
            );
        }

        const data =
            await response.json();

        services =
            normalizeList(data)
                .filter(
                    service =>
                        service.is_active !== false
                );

        populateServiceFilter();

        populateBookingServiceSelect();

    } catch (error) {

        console.error(
            "Services:",
            error
        );

        showToast(
            "Failed to load services."
        );
    }
}

function populateBookingDropdowns() {

    populateBookingCustomerSelect();

    populateBookingServiceSelect();

    populateBookingDoctorSelect([]);
}

function populateBookingCustomerSelect() {

    const select =
        document.getElementById(
            "customerInput"
        );

    if (!select) return;

    const previous =
        select.value;

    select.innerHTML =
        `<option value="">
            Select customer
        </option>`;

    customers.forEach(
        customer => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                customer.id;

            option.textContent =
                getCustomerName(customer);

            select.appendChild(option);
        }
    );

    if (previous) {

        select.value =
            previous;
    }
}

function populateBookingServiceSelect() {

    const select =
        document.getElementById(
            "serviceInput"
        );

    if (!select) return;

    const previous =
        select.value;

    select.innerHTML =
        `<option value="">
            Select service
        </option>`;

    services.forEach(
        service => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                service.id;

            const duration =
                getServiceDuration(service);

            const price =
                service.price !== undefined &&
                service.price !== null
                    ? ` • ₹${service.price}`
                    : "";

            option.textContent =
                `${service.name || "Service"}`
                + ` (${duration} min)`
                + price;

            select.appendChild(option);
        }
    );

    if (previous) {

        select.value =
            previous;
    }
}

function populateBookingDoctorSelect(
    availableDoctors = []
) {

    const select =
        document.getElementById(
            "staffInput"
        );

    if (!select) return;

    const previous =
        select.value;

    if (!availableDoctors.length) {

        select.innerHTML =
            `<option value="">
                Select service first
            </option>`;

        return;
    }

    select.innerHTML =
        `<option value="">
            Select doctor
        </option>`;

    availableDoctors.forEach(
        doctor => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                doctor.id;

            option.textContent =
                getStaffName(doctor);

            select.appendChild(option);
        }
    );

    if (
        previous &&
        availableDoctors.some(
            doctor =>
                String(doctor.id) ===
                String(previous)
        )
    ) {

        select.value =
            previous;
    }
}

function populateFilterDropdowns() {

    populateDoctorFilter();

    populateServiceFilter();
}

function populateDoctorFilter() {

    const select =
        document.getElementById(
            "staffFilter"
        );

    if (!select) return;

    const previous =
        select.value;

    select.innerHTML =
        `<option value="">
            All Doctors
        </option>`;

    doctors.forEach(
        doctor => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                doctor.id;

            option.textContent =
                getStaffName(doctor);

            select.appendChild(option);
        }
    );

    select.value =
        previous;
}

function populateServiceFilter() {

    const select =
        document.getElementById(
            "serviceFilter"
        );

    if (!select) return;

    const previous =
        select.value;

    select.innerHTML =
        `<option value="">
            All Services
        </option>`;

    services.forEach(
        service => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                service.id;

            option.textContent =
                service.name || "Service";

            select.appendChild(option);
        }
    );

    select.value =
        previous;
}

async function handleBookingServiceChange() {

    const serviceId =
        getValue("serviceInput");

    const doctorSelect =
        document.getElementById(
            "staffInput"
        );

    clearBookingSlots();

    if (!serviceId) {

        populateBookingDoctorSelect([]);

        setAvailabilityInfo(
            "bookingAvailabilityInfo",
            "Select a service to see available doctors."
        );

        return;
    }

    if (doctorSelect) {

        doctorSelect.disabled = true;

        doctorSelect.innerHTML =
            `<option value="">
                Loading doctors...
            </option>`;
    }

    try {

        const serviceDoctors =
            await getDoctorsForService(
                serviceId
            );

        populateBookingDoctorSelect(
            serviceDoctors
        );

        if (!serviceDoctors.length) {

            setAvailabilityInfo(
                "bookingAvailabilityInfo",
                "No doctor is currently assigned to this service."
            );

        } else {

            setAvailabilityInfo(
                "bookingAvailabilityInfo",
                "Select a doctor to see their working days."
            );
        }

    } catch (error) {

        console.error(error);

        populateBookingDoctorSelect([]);

        setAvailabilityInfo(
            "bookingAvailabilityInfo",
            "Unable to load doctors for this service."
        );

    } finally {

        if (doctorSelect) {

            doctorSelect.disabled =
                false;
        }
    }

    updateBookingSummary();
}

async function getDoctorsForService(
    serviceId
) {

    try {

        const response =
            await fetch(
                `${API_BASE}/services/${serviceId}/doctors/`,
                {
                    headers:
                        authHeaders()
                }
            );

        if (response.ok) {

            const data =
                await response.json();

            const result =
                normalizeList(data);

            if (result.length) {

                return result.filter(
                    isDoctor
                );
            }
        }

    } catch (error) {

        console.warn(
            "Service doctors endpoint unavailable.",
            error
        );
    }

    return doctors.filter(
        doctor => {

            const staffServices =
                doctor.services ||
                doctor.service_ids ||
                doctor.serviceIds ||
                [];

            return staffServices.some(
                service => {

                    const id =
                        typeof service === "object"
                            ? service.id
                            : service;

                    return String(id) ===
                        String(serviceId);
                }
            );
        }
    );
}

async function handleBookingDoctorChange() {

    const staffId =
        getValue("staffInput");

    clearBookingSlots();

    if (!staffId) {

        setAvailabilityInfo(
            "bookingAvailabilityInfo",
            "Select a doctor to see available working days."
        );

        return;
    }

    await loadDoctorAvailabilitySummary(
        staffId,
        "bookingAvailabilityInfo"
    );

    await loadBookingTimeSlots();

    updateBookingSummary();
}

async function getStaffAvailability(
    staffId
) {

    const response =
        await fetch(
            `${API_BASE}/appointments/availability/?staff=${encodeURIComponent(staffId)}`,
            {
                headers:
                    authHeaders()
            }
        );

    if (!response.ok) {

        throw new Error(
            "Unable to load staff availability."
        );
    }

    return normalizeList(
        await response.json()
    );
}

async function loadDoctorAvailabilitySummary(
    staffId,
    elementId
) {

    try {

        const availability =
            await getStaffAvailability(
                staffId
            );

        const active =
            availability.filter(
                item =>
                    item.is_available !== false
            );

        if (!active.length) {

            setAvailabilityInfo(
                elementId,
                "This doctor has no configured working hours."
            );

            return;
        }

        const grouped = {};

        active.forEach(
            item => {

                const day =
                    getDayName(
                        item.day_of_week
                    );

                if (!grouped[day]) {

                    grouped[day] = [];
                }

                grouped[day].push(
                    `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`
                );
            }
        );

        const text =
            Object.entries(grouped)
                .map(
                    ([day, times]) =>
                        `${day}: ${times.join(", ")}`
                )
                .join(" | ");

        setAvailabilityInfo(
            elementId,
            `Doctor availability: ${text}`
        );

    } catch (error) {

        console.error(
            "Availability:",
            error
        );

        setAvailabilityInfo(
            elementId,
            "Unable to load doctor working hours."
        );
    }
}

async function getAvailableSlots(
    staffId,
    serviceId,
    date,
    excludeAppointmentId = null
) {

    if (
        !staffId ||
        !serviceId ||
        !date
    ) {

        return [];
    }

    const availability =
        await getStaffAvailability(
            staffId
        );

    const selectedDate =
        parseDateOnly(date);

    const weekday =
        selectedDate.getDay() === 0
            ? 6
            : selectedDate.getDay() - 1;

    const dayAvailability =
        availability.filter(
            item => {

                return (
                    Number(item.day_of_week) ===
                    weekday
                ) &&
                item.is_available !== false;
            }
        );

    if (!dayAvailability.length) {

        return [];
    }

    const service =
        services.find(
            item =>
                String(item.id) ===
                String(serviceId)
        );

    if (!service) {

        return [];
    }

    const duration =
        getServiceDuration(service);

    if (
        !duration ||
        duration <= 0
    ) {

        return [];
    }

    const dayAppointments =
        appointments.filter(
            appointment => {

                const appointmentStaff =
                    getId(
                        appointment.staff,
                        appointment.staff_id
                    );

                if (
                    String(appointmentStaff) !==
                    String(staffId)
                ) {

                    return false;
                }

                const appointmentDate =
                    appointment.appointment_date ||
                    appointment.date;

                if (
                    appointmentDate !==
                    date
                ) {

                    return false;
                }

                if (
                    excludeAppointmentId &&
                    String(appointment.id) ===
                    String(excludeAppointmentId)
                ) {

                    return false;
                }

                const status =
                    String(
                        appointment.status || ""
                    ).toUpperCase();

                return (
                    status === "SCHEDULED" ||
                    status === "RESCHEDULED"
                );
            }
        );

    const slots = [];

    for (
        const window of dayAvailability
    ) {

        const windowStart =
            timeToMinutes(
                window.start_time
            );

        const windowEnd =
            timeToMinutes(
                window.end_time
            );

        if (
            windowStart == null ||
            windowEnd == null
        ) {

            continue;
        }

        for (
            let start = windowStart;
            start + duration <= windowEnd;
            start += duration
        ) {

            const end =
                start + duration;

            if (
                isPastDateTime(
                    date,
                    start
                )
            ) {

                continue;
            }

            const overlaps =
                dayAppointments.some(
                    appointment => {

                        const appointmentStart =
                            timeToMinutes(
                                appointment.start_time ||
                                appointment.startTime
                            );

                        const appointmentEnd =
                            timeToMinutes(
                                appointment.end_time ||
                                appointment.endTime
                            );

                        if (
                            appointmentStart == null ||
                            appointmentEnd == null
                        ) {

                            return false;
                        }

                        return (
                            appointmentStart < end &&
                            appointmentEnd > start
                        );
                    }
                );

            if (!overlaps) {

                slots.push({
                    start:
                        minutesToTime(start),

                    end:
                        minutesToTime(end)
                });
            }
        }
    }

    const uniqueSlots = [];

    const seen =
        new Set();

    slots.forEach(
        slot => {

            if (
                !seen.has(
                    slot.start
                )
            ) {

                seen.add(
                    slot.start
                );

                uniqueSlots.push(
                    slot
                );
            }
        }
    );

    return uniqueSlots;
}

async function loadBookingTimeSlots() {

    const serviceId =
        getValue("serviceInput");

    const staffId =
        getValue("staffInput");

    const date =
        getValue("appointmentDateInput");

    const select =
        getBookingTimeSelect();

    if (!select) return;

    select.innerHTML =
        `<option value="">
            Select doctor and date first
        </option>`;

    select.disabled = true;

    if (
        !serviceId ||
        !staffId ||
        !date
    ) {

        updateBookingSummary();

        return;
    }

    if (
        isDateInPast(date)
    ) {

        select.innerHTML =
            `<option value="">
                Past dates are not allowed
            </option>`;

        updateBookingSummary();

        return;
    }

    select.innerHTML =
        `<option value="">
            Loading available slots...
        </option>`;

    try {

        const slots =
            await getAvailableSlots(
                staffId,
                serviceId,
                date
            );

        if (!slots.length) {

            select.innerHTML =
                `<option value="">
                    No available time slots
                </option>`;

            setAvailabilityInfo(
                "bookingAvailabilityInfo",
                `${getSelectedDoctorName()} has no available slots on ${formatDisplayDate(date)}.`
            );

            updateBookingSummary();

            return;
        }

        select.innerHTML =
            `<option value="">
                Select available time
            </option>`;

        slots.forEach(
            slot => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    slot.start;

                option.textContent =
                    `${formatTime(slot.start)} - ${formatTime(slot.end)}`;

                option.dataset.endTime =
                    slot.end;

                select.appendChild(
                    option
                );
            }
        );

        select.disabled = false;

        setAvailabilityInfo(
            "bookingAvailabilityInfo",
            `${getSelectedDoctorName()} has ${slots.length} available slot(s) on ${formatDisplayDate(date)}.`
        );

    } catch (error) {

        console.error(
            "Booking slots:",
            error
        );

        select.innerHTML =
            `<option value="">
                Unable to load time slots
            </option>`;

        showToast(
            "Unable to load doctor availability."
        );
    }

    updateBookingSummary();
}

function openBookModal() {

    const modal =
        document.getElementById(
            "bookModal"
        );

    if (!modal) return;

    modal.classList.add(
        "show"
    );

    resetBookingForm();

    setMinimumDates();
}

function closeBookModal() {

    const modal =
        document.getElementById(
            "bookModal"
        );

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }

    resetBookingForm();
}

function resetBookingForm() {

    const form =
        document.getElementById(
            "bookAppointmentForm"
        );

    if (form) {

        form.reset();
    }

    populateBookingCustomerSelect();

    populateBookingServiceSelect();

    populateBookingDoctorSelect([]);

    const timeSelect =
        getBookingTimeSelect();

    if (timeSelect) {

        timeSelect.innerHTML =
            `<option value="">
                Select doctor and date first
            </option>`;

        timeSelect.disabled =
            true;
    }

    setAvailabilityInfo(
        "bookingAvailabilityInfo",
        "Select a service, doctor and date to see available slots."
    );

    updateBookingSummary();
}

async function handleBookAppointment(
    event
) {

    event.preventDefault();

    const customer =
        getValue(
            "customerInput"
        );

    const staff =
        getValue(
            "staffInput"
        );

    const service =
        getValue(
            "serviceInput"
        );

    const appointmentDate =
        getValue(
            "appointmentDateInput"
        );

    const startTime =
        getValue(
            "startTimeInput"
        );

    const reason =
        getValue(
            "reasonInput"
        ).trim();

    if (
        !customer ||
        !staff ||
        !service ||
        !appointmentDate ||
        !startTime
    ) {

        showToast(
            "Please complete all required booking fields."
        );

        return;
    }

    if (
        isDateInPast(
            appointmentDate
        )
    ) {

        showToast(
            "Appointments cannot be booked in the past."
        );

        return;
    }

    const availableSlots =
        await getAvailableSlots(
            staff,
            service,
            appointmentDate
        );

    const selectedSlot =
        availableSlots.find(
            slot =>
                slot.start ===
                startTime
        );

    if (!selectedSlot) {

        showToast(
            "The selected time is no longer available. Please choose another slot."
        );

        await loadBookingTimeSlots();

        return;
    }

    const payload = {

        customer:
            Number(customer),

        staff:
            Number(staff),

        service:
            Number(service),

        appointment_date:
            appointmentDate,

        start_time:
            startTime,

        reason:
            reason || null
    };

    try {

        setButtonLoading(
            "bookAppointmentForm",
            true
        );

        const response =
            await fetch(
                `${API_BASE}/appointments/staff-book/`,
                {
                    method: "POST",

                    headers:
                        authHeaders(),

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        const data =
            await parseResponse(
                response
            );

        if (!response.ok) {

            console.error(
                "Booking API error:",
                data
            );

            showToast(
                getApiErrorMessage(
                    data,
                    "Failed to book appointment."
                )
            );

            await loadAppointments();

            await loadBookingTimeSlots();

            return;
        }

        showToast(
            "Appointment booked successfully."
        );

        closeBookModal();

        await loadAppointments();

    } catch (error) {

        console.error(
            "Booking:",
            error
        );

        showToast(
            "Unable to book appointment."
        );

    } finally {

        setButtonLoading(
            "bookAppointmentForm",
            false
        );
    }
}

async function openRescheduleModal(
    appointmentId
) {

    const appointment =
        appointments.find(
            item =>
                String(item.id) ===
                String(appointmentId)
        );

    if (!appointment) {

        showToast(
            "Appointment not found."
        );

        return;
    }

    const status =
        String(
            appointment.status || ""
        ).toUpperCase();

    if (
        status === "CANCELLED" ||
        status === "COMPLETED"
    ) {

        showToast(
            "Cancelled or completed appointments cannot be rescheduled."
        );

        return;
    }

    currentRescheduleAppointmentId =
        appointment.id;

    const modal =
        document.getElementById(
            "rescheduleModal"
        );

    if (modal) {

        modal.classList.add(
            "show"
        );
    }

    const hiddenId =
        document.getElementById(
            "rescheduleAppointmentId"
        );

    if (hiddenId) {

        hiddenId.value =
            appointment.id;
    }

    const dateInput =
        document.getElementById(
            "rescheduleDate"
        );

    if (dateInput) {

        dateInput.value =
            appointment.appointment_date ||
            appointment.date ||
            "";

        setMinimumDateElement(
            dateInput
        );
    }

    const timeSelect =
        getRescheduleTimeSelect();

    if (timeSelect) {

        timeSelect.innerHTML =
            `<option value="">
                Loading available slots...
            </option>`;

        timeSelect.disabled =
            true;
    }

    const staffId =
        getId(
            appointment.staff,
            appointment.staff_id
        );

    if (staffId) {

        await loadDoctorAvailabilitySummary(
            staffId,
            "rescheduleAvailabilityInfo"
        );
    }

    await loadRescheduleTimeSlots();

    const oldTime =
        appointment.start_time ||
        appointment.startTime;

    if (
        timeSelect &&
        oldTime
    ) {

        const normalized =
            normalizeTime(
                oldTime
            );

        const option =
            [...timeSelect.options]
                .find(
                    option =>
                        option.value ===
                        normalized
                );

        if (option) {

            timeSelect.value =
                normalized;
        }
    }
}

function closeRescheduleModal() {

    const modal =
        document.getElementById(
            "rescheduleModal"
        );

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }

    const form =
        document.getElementById(
            "rescheduleForm"
        );

    if (form) {

        form.reset();
    }

    const timeSelect =
        getRescheduleTimeSelect();

    if (timeSelect) {

        timeSelect.innerHTML =
            `<option value="">
                Select available time
            </option>`;

        timeSelect.disabled =
            true;
    }

    currentRescheduleAppointmentId =
        null;
}

async function loadRescheduleTimeSlots() {

    const appointmentId =
        currentRescheduleAppointmentId;

    const date =
        getValue(
            "rescheduleDate"
        );

    const select =
        getRescheduleTimeSelect();

    if (
        !select ||
        !appointmentId
    ) {

        return;
    }

    select.innerHTML =
        `<option value="">
            Select new date first
        </option>`;

    select.disabled =
        true;

    const appointment =
        appointments.find(
            item =>
                String(item.id) ===
                String(appointmentId)
        );

    if (!appointment) return;

    const staffId =
        getId(
            appointment.staff,
            appointment.staff_id
        );

    const serviceId =
        getId(
            appointment.service,
            appointment.service_id
        );

    if (
        !date ||
        !staffId ||
        !serviceId
    ) {

        return;
    }

    if (
        isDateInPast(date)
    ) {

        select.innerHTML =
            `<option value="">
                Past dates are not allowed
            </option>`;

        return;
    }

    select.innerHTML =
        `<option value="">
            Loading available slots...
        </option>`;

    try {

        const slots =
            await getAvailableSlots(
                staffId,
                serviceId,
                date,
                appointmentId
            );

        if (!slots.length) {

            select.innerHTML =
                `<option value="">
                    No available time slots
                </option>`;

            setAvailabilityInfo(
                "rescheduleAvailabilityInfo",
                `No available slots for ${formatDisplayDate(date)}.`
            );

            return;
        }

        select.innerHTML =
            `<option value="">
                Select available time
            </option>`;

        slots.forEach(
            slot => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    slot.start;

                option.textContent =
                    `${formatTime(slot.start)} - ${formatTime(slot.end)}`;

                option.dataset.endTime =
                    slot.end;

                select.appendChild(
                    option
                );
            }
        );

        select.disabled =
            false;

        setAvailabilityInfo(
            "rescheduleAvailabilityInfo",
            `${slots.length} available slot(s) on ${formatDisplayDate(date)}.`
        );

    } catch (error) {

        console.error(
            "Reschedule slots:",
            error
        );

        select.innerHTML =
            `<option value="">
                Unable to load time slots
            </option>`;
    }
}

async function handleReschedule(
    event
) {

    event.preventDefault();

    const appointmentId =
        document.getElementById(
            "rescheduleAppointmentId"
        )?.value ||
        currentRescheduleAppointmentId;

    const date =
        getValue(
            "rescheduleDate"
        );

    const startTime =
        getValue(
            "rescheduleTime"
        );

    if (
        !appointmentId ||
        !date ||
        !startTime
    ) {

        showToast(
            "Please select a new date and available time."
        );

        return;
    }

    if (
        isDateInPast(date)
    ) {

        showToast(
            "Rescheduled appointments cannot be in the past."
        );

        return;
    }

    const appointment =
        appointments.find(
            item =>
                String(item.id) ===
                String(appointmentId)
        );

    if (!appointment) {

        showToast(
            "Appointment not found."
        );

        return;
    }

    const staffId =
        getId(
            appointment.staff,
            appointment.staff_id
        );

    const serviceId =
        getId(
            appointment.service,
            appointment.service_id
        );

    const slots =
        await getAvailableSlots(
            staffId,
            serviceId,
            date,
            appointmentId
        );

    const isAvailable =
        slots.some(
            slot =>
                slot.start ===
                startTime
        );

    if (!isAvailable) {

        showToast(
            "Selected slot is not available. Please choose another slot."
        );

        await loadRescheduleTimeSlots();

        return;
    }

    try {

        setButtonLoading(
            "rescheduleForm",
            true
        );

        const response =
            await fetch(
                `${API_BASE}/appointments/${appointmentId}/reschedule/`,
                {
                    method: "POST",

                    headers:
                        authHeaders(),

                    body:
                        JSON.stringify({
                            appointment_date:
                                date,

                            start_time:
                                startTime
                        })
                }
            );

        const data =
            await parseResponse(
                response
            );

        if (!response.ok) {

            showToast(
                getApiErrorMessage(
                    data,
                    "Failed to reschedule appointment."
                )
            );

            await loadAppointments();

            await loadRescheduleTimeSlots();

            return;
        }

        showToast(
            "Appointment rescheduled successfully."
        );

        closeRescheduleModal();

        await loadAppointments();

    } catch (error) {

        console.error(
            "Reschedule:",
            error
        );

        showToast(
            "Unable to reschedule appointment."
        );

    } finally {

        setButtonLoading(
            "rescheduleForm",
            false
        );
    }
}

async function cancelAppointment(
    appointmentId
) {

    const appointment =
        appointments.find(
            item =>
                String(item.id) ===
                String(appointmentId)
        );

    if (!appointment) {

        showToast(
            "Appointment not found."
        );

        return;
    }

    const status =
        String(
            appointment.status || ""
        ).toUpperCase();

    if (status === "CANCELLED") {

        showToast(
            "Appointment is already cancelled."
        );

        return;
    }

    if (status === "COMPLETED") {

        showToast(
            "Completed appointments cannot be cancelled."
        );

        return;
    }

    const reason =
        window.prompt(
            "Enter cancellation reason:"
        );

    if (reason === null) {

        return;
    }

    if (!reason.trim()) {

        showToast(
            "Cancellation reason is required."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/appointments/${appointmentId}/cancel/`,
                {
                    method: "POST",

                    headers:
                        authHeaders(),

                    body:
                        JSON.stringify({
                            cancellation_reason:
                                reason.trim(),

                            reason:
                                reason.trim()
                        })
                }
            );

        const data =
            await parseResponse(
                response
            );

        if (!response.ok) {

            showToast(
                getApiErrorMessage(
                    data,
                    "Failed to cancel appointment."
                )
            );

            return;
        }

        showToast(
            "Appointment cancelled successfully."
        );

        await loadAppointments();

    } catch (error) {

        console.error(
            "Cancel:",
            error
        );

        showToast(
            "Unable to cancel appointment."
        );
    }
}

async function completeAppointment(
    appointmentId
) {

    const appointment =
        appointments.find(
            item =>
                String(item.id) ===
                String(appointmentId)
        );

    if (!appointment) return;

    const status =
        String(
            appointment.status || ""
        ).toUpperCase();

    if (
        status !== "SCHEDULED" &&
        status !== "RESCHEDULED"
    ) {

        showToast(
            "Only scheduled appointments can be completed."
        );

        return;
    }

    const confirmed =
        window.confirm(
            "Mark this appointment as completed?"
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                `${API_BASE}/appointments/${appointmentId}/complete/`,
                {
                    method: "POST",

                    headers:
                        authHeaders()
                }
            );

        const data =
            await parseResponse(
                response
            );

        if (!response.ok) {

            showToast(
                getApiErrorMessage(
                    data,
                    "Failed to complete appointment."
                )
            );

            return;
        }

        showToast(
            "Appointment marked as completed."
        );

        await loadAppointments();

    } catch (error) {

        console.error(
            "Complete:",
            error
        );

        showToast(
            "Unable to complete appointment."
        );
    }
}

function clearFilters() {

    setValue(
        "searchInput",
        ""
    );

    setValue(
        "staffFilter",
        ""
    );

    setValue(
        "serviceFilter",
        ""
    );

    setValue(
        "statusFilter",
        ""
    );

    setValue(
        "dateFilter",
        ""
    );

    currentPage = 1;

    applyFilters();
}

function applyFilters() {

    const search =
        getValue(
            "searchInput"
        )
        .trim()
        .toLowerCase();

    const staff =
        getValue(
            "staffFilter"
        );

    const service =
        getValue(
            "serviceFilter"
        );

    const status =
        getValue(
            "statusFilter"
        );

    const date =
        getValue(
            "dateFilter"
        );

    filteredAppointments =
        appointments.filter(
            appointment => {

                const customerName =
                    getAppointmentCustomerName(
                        appointment
                    )
                    .toLowerCase();

                const doctorName =
                    getAppointmentDoctorName(
                        appointment
                    )
                    .toLowerCase();

                const serviceName =
                    getAppointmentServiceName(
                        appointment
                    )
                    .toLowerCase();

                const appointmentId =
                    String(
                        appointment.id || ""
                    )
                    .toLowerCase();

                const matchesSearch =
                    !search ||
                    customerName.includes(
                        search
                    ) ||
                    doctorName.includes(
                        search
                    ) ||
                    serviceName.includes(
                        search
                    ) ||
                    appointmentId.includes(
                        search
                    );

                const appointmentStaff =
                    getId(
                        appointment.staff,
                        appointment.staff_id
                    );

                const appointmentService =
                    getId(
                        appointment.service,
                        appointment.service_id
                    );

                const matchesStaff =
                    !staff ||
                    String(
                        appointmentStaff
                    ) ===
                    String(staff);

                const matchesService =
                    !service ||
                    String(
                        appointmentService
                    ) ===
                    String(service);

                const appointmentStatus =
                    String(
                        appointment.status || ""
                    ).toUpperCase();

                const matchesStatus =
                    !status ||
                    appointmentStatus ===
                    String(status)
                        .toUpperCase();

                const appointmentDate =
                    appointment.appointment_date ||
                    appointment.date ||
                    "";

                const matchesDate =
                    !date ||
                    appointmentDate === date;

                return (
                    matchesSearch &&
                    matchesStaff &&
                    matchesService &&
                    matchesStatus &&
                    matchesDate
                );
            }
        );

    currentPage = 1;

    renderAppointments();
}

function renderAppointments() {

    const body =
        document.getElementById(
            "appointmentsBody"
        );

    if (!body) return;

    body.innerHTML = "";

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredAppointments.length /
                PAGE_SIZE
            )
        );

    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;
    }

    const start =
        (
            currentPage - 1
        ) * PAGE_SIZE;

    const pageItems =
        filteredAppointments.slice(
            start,
            start + PAGE_SIZE
        );

    if (!pageItems.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="loading-cell"
                >
                    No appointments found.
                </td>
            </tr>
        `;

        updatePagination(0);

        return;
    }

    pageItems.forEach(
        (appointment, index) => {

            const row =
                document.createElement(
                    "tr"
                );

            const srNo =
                start + index + 1;

            const status =
                String(
                    appointment.status || ""
                ).toUpperCase();

            const date =
                appointment.appointment_date ||
                appointment.date ||
                "";

            const startTime =
                appointment.start_time ||
                appointment.startTime ||
                "";

            const endTime =
                appointment.end_time ||
                appointment.endTime ||
                "";

            const customerName =
                getAppointmentCustomerName(
                    appointment
                );

            const doctorName =
                getAppointmentDoctorName(
                    appointment
                );

            const serviceName =
                getAppointmentServiceName(
                    appointment
                );

            row.innerHTML = `

                <td>
                    ${srNo}
                </td>

                <td>
                    ${escapeHtml(
                        customerName
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        doctorName
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        serviceName
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatDisplayDate(
                            date
                        )
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatTime(
                            startTime
                        )
                    )}

                    ${
                        endTime
                            ? ` - ${escapeHtml(
                                formatTime(
                                    endTime
                                )
                            )}`
                            : ""
                    }
                </td>

                <td>
                    <span
                        class="status-badge ${getStatusClass(status)}"
                    >
                        ${escapeHtml(
                            formatStatus(
                                status
                            )
                        )}
                    </span>
                </td>

                <td>

                    <div class="action-buttons">

                        <button
                            type="button"
                            class="action-btn view-btn"
                            data-action="view"
                            data-id="${appointment.id}"
                        >
                            View
                        </button>

                        ${
                            (
                                status === "SCHEDULED" ||
                                status === "RESCHEDULED"
                            )
                            ? `

                                <button
                                    type="button"
                                    class="action-btn"
                                    data-action="reschedule"
                                    data-id="${appointment.id}"
                                >
                                    Reschedule
                                </button>

                                <button
                                    type="button"
                                    class="action-btn danger"
                                    data-action="cancel"
                                    data-id="${appointment.id}"
                                >
                                    Cancel
                                </button>

                            `
                            : ""
                        }

                        ${
                            (
                                status === "SCHEDULED" ||
                                status === "RESCHEDULED"
                            )
                            ? `

                                <button
                                    type="button"
                                    class="action-btn success"
                                    data-action="complete"
                                    data-id="${appointment.id}"
                                >
                                    Complete
                                </button>

                            `
                            : ""
                        }

                    </div>

                </td>
            `;

            body.appendChild(
                row
            );
        }
    );

    updatePagination(
        filteredAppointments.length
    );
}

function updatePagination(
    totalItems
) {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalItems /
                PAGE_SIZE
            )
        );

    const pageInfo =
        document.getElementById(
            "pageInfo"
        );

    const prevBtn =
        document.getElementById(
            "prevBtn"
        );

    const nextBtn =
        document.getElementById(
            "nextBtn"
        );

    if (pageInfo) {

        pageInfo.textContent =
            `Page ${currentPage} of ${totalPages}`;
    }

    if (prevBtn) {

        prevBtn.disabled =
            currentPage <= 1;
    }

    if (nextBtn) {

        nextBtn.disabled =
            currentPage >= totalPages;
    }
}

function handleDynamicAppointmentButtons(
    event
) {

    const button =
        event.target.closest(
            "[data-action][data-id]"
        );

    if (!button) return;

    const action =
        button.dataset.action;

    const id =
        button.dataset.id;

    if (action === "view") {

        viewAppointment(id);
    }

    if (
        action === "reschedule"
    ) {

        openRescheduleModal(id);
    }

    if (
        action === "cancel"
    ) {

        cancelAppointment(id);
    }

    if (
        action === "complete"
    ) {

        completeAppointment(id);
    }
}

function viewAppointment(
    appointmentId
) {

    const appointment =
        appointments.find(
            item =>
                String(item.id) ===
                String(appointmentId)
        );

    if (!appointment) {

        showToast(
            "Appointment not found."
        );

        return;
    }

    const container =
        document.getElementById(
            "appointmentDetails"
        );

    if (!container) return;

    const date =
        appointment.appointment_date ||
        appointment.date ||
        "";

    const startTime =
        appointment.start_time ||
        appointment.startTime ||
        "";

    const endTime =
        appointment.end_time ||
        appointment.endTime ||
        "";

    const status =
        String(
            appointment.status || ""
        ).toUpperCase();

    const reason =
        appointment.reason ||
        appointment.notes ||
        "—";

    container.innerHTML = `

        <div class="appointment-detail-grid">

            <div>
                <strong>
                    Appointment ID
                </strong>

                <span>
                    #${escapeHtml(
                        String(
                            appointment.id || ""
                        )
                    )}
                </span>
            </div>

            <div>
                <strong>
                    Customer
                </strong>

                <span>
                    ${escapeHtml(
                        getAppointmentCustomerName(
                            appointment
                        )
                    )}
                </span>
            </div>

            <div>
                <strong>
                    Doctor
                </strong>

                <span>
                    ${escapeHtml(
                        getAppointmentDoctorName(
                            appointment
                        )
                    )}
                </span>
            </div>

            <div>
                <strong>
                    Service
                </strong>

                <span>
                    ${escapeHtml(
                        getAppointmentServiceName(
                            appointment
                        )
                    )}
                </span>
            </div>

            <div>
                <strong>
                    Date
                </strong>

                <span>
                    ${escapeHtml(
                        formatDisplayDate(
                            date
                        )
                    )}
                </span>
            </div>

            <div>
                <strong>
                    Time
                </strong>

                <span>

                    ${escapeHtml(
                        formatTime(
                            startTime
                        )
                    )}

                    ${
                        endTime
                            ? ` - ${escapeHtml(
                                formatTime(
                                    endTime
                                )
                            )}`
                            : ""
                    }

                </span>
            </div>

            <div>
                <strong>
                    Status
                </strong>

                <span>
                    ${escapeHtml(
                        formatStatus(
                            status
                        )
                    )}
                </span>
            </div>

            <div>
                <strong>
                    Reason
                </strong>

                <span>
                    ${escapeHtml(
                        reason
                    )}
                </span>
            </div>

        </div>
    `;

    const modal =
        document.getElementById(
            "viewModal"
        );

    if (modal) {

        modal.classList.add(
            "show"
        );
    }
}

function closeViewModal() {

    const modal =
        document.getElementById(
            "viewModal"
        );

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }
}

function updateStatistics() {

    const total =
        appointments.length;

    const scheduled =
        appointments.filter(
            appointment => {

                const status =
                    String(
                        appointment.status || ""
                    ).toUpperCase();

                return (
                    status === "SCHEDULED" ||
                    status === "RESCHEDULED"
                );
            }
        ).length;

    const completed =
        appointments.filter(
            appointment => {

                return (
                    String(
                        appointment.status || ""
                    ).toUpperCase()
                    === "COMPLETED"
                );
            }
        ).length;

    const cancelled =
        appointments.filter(
            appointment => {

                return (
                    String(
                        appointment.status || ""
                    ).toUpperCase()
                    === "CANCELLED"
                );
            }
        ).length;

    setText(
        "totalAppointments",
        total
    );

    setText(
        "scheduledAppointments",
        scheduled
    );

    setText(
        "completedAppointments",
        completed
    );

    setText(
        "cancelledAppointments",
        cancelled
    );
}

function setMinimumDates() {

    setMinimumDateElement(
        document.getElementById(
            "appointmentDateInput"
        )
    );

    setMinimumDateElement(
        document.getElementById(
            "rescheduleDate"
        )
    );
}

function setMinimumDateElement(
    element
) {

    if (!element) return;

    element.min =
        getLocalDateString();
}

function getLocalDateString() {

    const date =
        new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        )
        .padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}

function parseDateOnly(
    value
) {

    const [
        year,
        month,
        day
    ] =
        String(value)
            .split("-")
            .map(Number);

    return new Date(
        year,
        month - 1,
        day
    );
}

function isDateInPast(
    dateString
) {

    if (!dateString) {

        return false;
    }

    return (
        dateString <
        getLocalDateString()
    );
}

function isPastDateTime(
    dateString,
    minutes
) {

    if (
        dateString <
        getLocalDateString()
    ) {

        return true;
    }

    if (
        dateString >
        getLocalDateString()
    ) {

        return false;
    }

    const now =
        new Date();

    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

    return (
        minutes <=
        currentMinutes
    );
}

function timeToMinutes(
    value
) {

    if (!value) return null;

    const normalized =
        normalizeTime(
            value
        );

    const parts =
        normalized.split(":");

    if (
        parts.length < 2
    ) {

        return null;
    }

    const hour =
        Number(
            parts[0]
        );

    const minute =
        Number(
            parts[1]
        );

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute)
    ) {

        return null;
    }

    return (
        hour * 60 +
        minute
    );
}

function minutesToTime(
    minutes
) {

    const hour =
        Math.floor(
            minutes / 60
        );

    const minute =
        minutes % 60;

    return (
        String(hour)
            .padStart(
                2,
                "0"
            ) +
        ":" +
        String(minute)
            .padStart(
                2,
                "0"
            )
    );
}

function normalizeTime(
    value
) {

    if (!value) return "";

    const text =
        String(value)
            .trim();

    if (
        /^\d{2}:\d{2}:\d{2}$/
            .test(text)
    ) {

        return text.substring(
            0,
            5
        );
    }

    return text.substring(
        0,
        5
    );
}

function formatTime(
    value
) {

    if (!value) {

        return "—";
    }

    const normalized =
        normalizeTime(
            value
        );

    const [
        hourString,
        minuteString
    ] =
        normalized.split(":");

    let hour =
        Number(
            hourString
        );

    const minute =
        minuteString || "00";

    if (
        Number.isNaN(hour)
    ) {

        return value;
    }

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    hour =
        hour % 12 || 12;

    return (
        `${hour}:${minute} ${suffix}`
    );
}

function prepareTimeSelectors() {

    replaceTimeInputWithSelect(
        "startTimeInput"
    );

    replaceTimeInputWithSelect(
        "rescheduleTime"
    );

    ensureAvailabilityInfo(
        "appointmentDateInput",
        "bookingAvailabilityInfo"
    );

    ensureAvailabilityInfo(
        "rescheduleDate",
        "rescheduleAvailabilityInfo"
    );
}

function replaceTimeInputWithSelect(
    inputId
) {

    const oldElement =
        document.getElementById(
            inputId
        );

    if (
        !oldElement ||
        oldElement.tagName ===
        "SELECT"
    ) {

        return;
    }

    const select =
        document.createElement(
            "select"
        );

    select.id =
        inputId;

    select.name =
        oldElement.name ||
        "start_time";

    select.required =
        oldElement.required;

    select.className =
        oldElement.className;

    select.innerHTML =
        `<option value="">
            Select available time
        </option>`;

    oldElement.replaceWith(
        select
    );
}

function getBookingTimeSelect() {

    return document.getElementById(
        "startTimeInput"
    );
}

function getRescheduleTimeSelect() {

    return document.getElementById(
        "rescheduleTime"
    );
}

function ensureAvailabilityInfo(
    anchorId,
    elementId
) {

    if (
        document.getElementById(
            elementId
        )
    ) {

        return;
    }

    const anchor =
        document.getElementById(
            anchorId
        );

    if (
        !anchor ||
        !anchor.parentElement
    ) {

        return;
    }

    const info =
        document.createElement(
            "div"
        );

    info.id =
        elementId;

    info.style.fontSize =
        "12px";

    info.style.marginTop =
        "6px";

    info.style.opacity =
        "0.8";

    info.style.lineHeight =
        "1.5";

    anchor.parentElement.appendChild(
        info
    );
}

function setAvailabilityInfo(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );

    if (element) {

        element.textContent =
            message || "";
    }
}

function clearBookingSlots() {

    const select =
        getBookingTimeSelect();

    if (select) {

        select.innerHTML =
            `<option value="">
                Select doctor and date first
            </option>`;

        select.disabled =
            true;
    }
}

function getDayName(
    dayOfWeek
) {

    const names = [

        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"

    ];

    const index =
        Number(dayOfWeek);

    return (
        names[index] ||
        "Unknown day"
    );
}

function isDoctor(
    staff
) {

    return (
        String(
            staff.staff_type ||
            staff.staffType ||
            ""
        ).toUpperCase()
        === "DOCTOR"
    );
}

function getServiceDuration(
    service
) {

    if (!service) {

        return 0;
    }

    return Number(
        service.duration ||
        service.duration_minutes ||
        service.durationMinutes ||
        0
    );
}

function getStaffName(
    staff
) {

    if (!staff) {

        return "Unknown Doctor";
    }

    if (staff.name) {

        return staff.name;
    }

    if (staff.full_name) {

        return staff.full_name;
    }

    if (
        staff.user?.first_name ||
        staff.user?.last_name
    ) {

        return (
            `${staff.user?.first_name || ""} ` +
            `${staff.user?.last_name || ""}`
        ).trim();
    }

    if (
        staff.first_name ||
        staff.last_name
    ) {

        return (
            `${staff.first_name || ""} ` +
            `${staff.last_name || ""}`
        ).trim();
    }

    return (
        staff.email ||
        `Doctor #${staff.id}`
    );
}

function getCustomerName(
    customer
) {

    if (!customer) {

        return "Unknown Customer";
    }

    if (customer.name) {

        return customer.name;
    }

    if (customer.full_name) {

        return customer.full_name;
    }

    if (
        customer.user?.first_name ||
        customer.user?.last_name
    ) {

        return (
            `${customer.user?.first_name || ""} ` +
            `${customer.user?.last_name || ""}`
        ).trim();
    }

    if (
        customer.first_name ||
        customer.last_name
    ) {

        return (
            `${customer.first_name || ""} ` +
            `${customer.last_name || ""}`
        ).trim();
    }

    return (
        customer.email ||
        customer.phone ||
        `Customer #${customer.id}`
    );
}

function getAppointmentCustomerName(
    appointment
) {

    if (
        appointment.customer_name
    ) {

        return appointment.customer_name;
    }

    if (
        appointment.customer?.name
    ) {

        return appointment.customer.name;
    }

    if (
        appointment.customer?.full_name
    ) {

        return appointment.customer.full_name;
    }

    const customerId =
        getId(
            appointment.customer,
            appointment.customer_id
        );

    const customer =
        customers.find(
            item =>
                String(item.id) ===
                String(customerId)
        );

    return customer
        ? getCustomerName(customer)
        : `Customer #${customerId || "—"}`;
}

function getAppointmentDoctorName(
    appointment
) {

    if (
        appointment.staff_name
    ) {

        return appointment.staff_name;
    }

    if (
        appointment.doctor_name
    ) {

        return appointment.doctor_name;
    }

    if (
        appointment.staff?.name
    ) {

        return appointment.staff.name;
    }

    const staffId =
        getId(
            appointment.staff,
            appointment.staff_id
        );

    const doctor =
        doctors.find(
            item =>
                String(item.id) ===
                String(staffId)
        );

    return doctor
        ? getStaffName(doctor)
        : `Doctor #${staffId || "—"}`;
}

function getAppointmentServiceName(
    appointment
) {

    if (
        appointment.service_name
    ) {

        return appointment.service_name;
    }

    if (
        appointment.service?.name
    ) {

        return appointment.service.name;
    }

    const serviceId =
        getId(
            appointment.service,
            appointment.service_id
        );

    const service =
        services.find(
            item =>
                String(item.id) ===
                String(serviceId)
        );

    return service
        ? service.name
        : `Service #${serviceId || "—"}`;
}

function getSelectedDoctorName() {

    const staffId =
        getValue(
            "staffInput"
        );

    const doctor =
        doctors.find(
            item =>
                String(item.id) ===
                String(staffId)
        );

    return doctor
        ? getStaffName(doctor)
        : "Selected doctor";
}

function getId(
    primary,
    fallback
) {

    if (
        primary !== undefined &&
        primary !== null &&
        typeof primary !== "object"
    ) {

        return primary;
    }

    if (
        fallback !== undefined &&
        fallback !== null
    ) {

        return fallback;
    }

    if (
        primary &&
        typeof primary === "object"
    ) {

        return primary.id;
    }

    return null;
}

function formatStatus(
    status
) {

    if (!status) {

        return "Unknown";
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

function getStatusClass(
    status
) {

    switch (
        String(status).toUpperCase()
    ) {

        case "SCHEDULED":
        case "RESCHEDULED":

            return "scheduled";

        case "COMPLETED":

            return "completed";

        case "CANCELLED":

            return "cancelled";

        default:

            return "";
    }
}

function normalizeList(
    data
) {

    if (
        Array.isArray(data)
    ) {

        return data;
    }

    if (
        Array.isArray(
            data?.results
        )
    ) {

        return data.results;
    }

    if (
        Array.isArray(
            data?.data
        )
    ) {

        return data.data;
    }

    return [];
}

async function parseResponse(
    response
) {

    const text =
        await response.text();

    if (!text) {

        return {};
    }

    try {

        return JSON.parse(text);

    } catch {

        return {
            detail: text
        };
    }
}

function getApiErrorMessage(
    data,
    fallback
) {

    if (!data) {

        return fallback;
    }

    if (
        typeof data ===
        "string"
    ) {

        return data;
    }

    if (data.detail) {

        return Array.isArray(
            data.detail
        )
            ? data.detail.join(" ")
            : String(data.detail);
    }

    if (
        data.non_field_errors
    ) {

        return Array.isArray(
            data.non_field_errors
        )
            ? data.non_field_errors.join(" ")
            : String(
                data.non_field_errors
            );
    }

    const messages = [];

    Object.entries(
        data
    ).forEach(
        ([field, value]) => {

            if (
                Array.isArray(value)
            ) {

                messages.push(
                    `${field}: ${value.join(" ")}`
                );

            } else if (
                typeof value ===
                "string"
            ) {

                messages.push(
                    `${field}: ${value}`
                );
            }
        }
    );

    return messages.length
        ? messages.join(" ")
        : fallback;
}

function bind(
    id,
    event,
    handler
) {

    const element =
        document.getElementById(
            id
        );

    if (element) {

        element.addEventListener(
            event,
            handler
        );
    }
}

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );

    return element
        ? String(
            element.value || ""
        )
        : "";
}

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (element) {

        element.value =
            value ?? "";
    }
}

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (element) {

        element.textContent =
            value;
    }
}

function setButtonLoading(
    formId,
    loading
) {

    const form =
        document.getElementById(
            formId
        );

    if (!form) return;

    const button =
        form.querySelector(
            'button[type="submit"]'
        );

    if (!button) return;

    if (loading) {

        button.dataset.originalText =
            button.textContent;

        button.disabled =
            true;

        button.textContent =
            "Please wait...";

    } else {

        button.disabled =
            false;

        if (
            button.dataset.originalText
        ) {

            button.textContent =
                button.dataset.originalText;
        }
    }
}

function formatDisplayDate(
    value
) {

    if (!value) {

        return "—";
    }

    const date =
        parseDateOnly(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;
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

function getInitials(
    name
) {

    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (!parts.length) {

        return "R";
    }

    return parts
        .slice(0, 2)
        .map(
            part =>
                part
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");
}

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
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

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {

        console.log(message);

        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        showToast.timeout
    );

    showToast.timeout =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );
}

function updateBookingSummary() {
}

window.addEventListener(
    "click",
    event => {

        const bookModal =
            document.getElementById(
                "bookModal"
            );

        const viewModal =
            document.getElementById(
                "viewModal"
            );

        const rescheduleModal =
            document.getElementById(
                "rescheduleModal"
            );

        if (
            event.target ===
            bookModal
        ) {

            closeBookModal();
        }

        if (
            event.target ===
            viewModal
        ) {

            closeViewModal();
        }

        if (
            event.target ===
            rescheduleModal
        ) {

            closeRescheduleModal();
        }
    }
);

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;
        }

        closeBookModal();

        closeViewModal();

        closeRescheduleModal();
    }
);