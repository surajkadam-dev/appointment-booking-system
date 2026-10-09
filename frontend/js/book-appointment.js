const API_BASE_URL = "http://127.0.0.1:8000/api";

let services = [];
let doctors = [];
let selectedService = null;
let selectedDoctor = null;
let availabilityRecords = [];

const bookingForm = document.getElementById("booking-form");

const serviceSelect = document.getElementById("service");
const staffSelect = document.getElementById("staff");

const appointmentDateInput =
    document.getElementById("appointment-date");

const appointmentTimeSelect =
    document.getElementById("appointment-time");

const reasonInput =
    document.getElementById("reason");

const bookButton =
    document.getElementById("book-appointment-btn");

const logoutButton =
    document.getElementById("logout-btn");

const bookingMessage =
    document.getElementById("booking-message");

const doctorHelp =
    document.getElementById("doctor-help");

const timeHelp =
    document.getElementById("time-help");

const workingHoursInfo =
    document.getElementById("working-hours-info");

const workingHoursText =
    document.getElementById("working-hours-text");

const summaryService =
    document.getElementById("summary-service");

const summaryDoctor =
    document.getElementById("summary-doctor");

const summaryDate =
    document.getElementById("summary-date");

const summaryTime =
    document.getElementById("summary-time");

const summaryDuration =
    document.getElementById("summary-duration");

const summaryEndTime =
    document.getElementById("summary-end-time");

document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "../login.html";
        return;
    }

    setMinimumDate();

    loadServices();

    setupEventListeners();

});

function setupEventListeners() {

    serviceSelect.addEventListener(
        "change",
        handleServiceChange
    );

    staffSelect.addEventListener(
        "change",
        handleDoctorChange
    );

    appointmentDateInput.addEventListener(
        "change",
        handleDateChange
    );

    appointmentTimeSelect.addEventListener(
        "change",
        handleTimeChange
    );

    reasonInput.addEventListener(
        "input",
        updateSummary
    );

    bookingForm.addEventListener(
        "submit",
        handleBookingSubmit
    );

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            logout
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

async function loadServices() {

    try {

        serviceSelect.disabled = true;

        serviceSelect.innerHTML = `
            <option value="">
                Loading services...
            </option>
        `;

        const response = await fetch(
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
            throw new Error(
                "Unable to load services."
            );
        }

        const data = await response.json();

        services = Array.isArray(data)
            ? data
            : data.results || [];

        serviceSelect.innerHTML = `
            <option value="">
                Select a service
            </option>
        `;

        if (services.length === 0) {

            serviceSelect.innerHTML = `
                <option value="">
                    No services available
                </option>
            `;

            return;
        }

        services.forEach(service => {

            const option =
                document.createElement("option");

            option.value = service.id;

            option.textContent =
                `${service.name} — ${service.duration} min`;

            serviceSelect.appendChild(option);

        });

        serviceSelect.disabled = false;

    } catch (error) {

        console.error(
            "Service loading error:",
            error
        );

        serviceSelect.innerHTML = `
            <option value="">
                Unable to load services
            </option>
        `;

        showMessage(
            "Unable to load services. Please refresh the page.",
            "error"
        );

    }

}

async function handleServiceChange() {

    const serviceId =
        serviceSelect.value;

    resetDoctor();

    resetDate();

    resetTime();

    if (!serviceId) {

        selectedService = null;

        updateSummary();

        return;
    }

    selectedService =
        services.find(
            service =>
                String(service.id) ===
                String(serviceId)
        );

    if (!selectedService) {

        return;
    }

    updateSummary();

    await loadDoctorsForService(
        serviceId
    );

}

async function loadDoctorsForService(
    serviceId
) {

    try {

        staffSelect.disabled = true;

        staffSelect.innerHTML = `
            <option value="">
                Loading doctors...
            </option>
        `;

        doctorHelp.textContent =
            "Loading doctors for the selected service...";

        const response = await fetch(
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

        if (!response.ok) {
            throw new Error(
                "Unable to load doctors."
            );
        }

        const data =
            await response.json();

        doctors = Array.isArray(data)
            ? data
            : data.results || [];

        staffSelect.innerHTML = `
            <option value="">
                Select a doctor
            </option>
        `;

        if (doctors.length === 0) {

            staffSelect.innerHTML = `
                <option value="">
                    No doctors available for this service
                </option>
            `;

            doctorHelp.textContent =
                "No available doctors are assigned to this service.";

            return;
        }

        doctors.forEach(doctor => {

            const option =
                document.createElement("option");

            option.value =
                doctor.id;

            option.textContent =
                doctor.name;

            staffSelect.appendChild(
                option
            );

        });

        staffSelect.disabled = false;

        doctorHelp.textContent =
            "Select an available doctor.";

    } catch (error) {

        console.error(
            "Doctor loading error:",
            error
        );

        staffSelect.innerHTML = `
            <option value="">
                Unable to load doctors
            </option>
        `;

        doctorHelp.textContent =
            "Unable to load doctors. Please try again.";

    }

}

async function handleDoctorChange() {

    const doctorId =
        staffSelect.value;

    resetDate();

    resetTime();

    if (!doctorId) {

        selectedDoctor = null;

        updateSummary();

        return;
    }

    selectedDoctor =
        doctors.find(
            doctor =>
                String(doctor.id) ===
                String(doctorId)
        );

    if (!selectedDoctor) {

        return;
    }

    appointmentDateInput.disabled = false;

    updateSummary();

}

function setMinimumDate() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    const todayString =
        `${year}-${month}-${day}`;

    appointmentDateInput.min =
        todayString;

}

async function handleDateChange() {

    resetTime();

    const selectedDate =
        appointmentDateInput.value;

    if (!selectedDate) {

        return;
    }

    if (!selectedDoctor) {

        showMessage(
            "Please select a doctor first.",
            "error"
        );

        return;
    }

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    const selected =
        parseLocalDate(
            selectedDate
        );

    if (selected < today) {

        showMessage(
            "Past dates cannot be selected.",
            "error"
        );

        appointmentDateInput.value = "";

        return;
    }

    await loadDoctorAvailability(
        selectedDate
    );

    updateSummary();

}

async function loadDoctorAvailability(
    selectedDate
) {

    try {

        appointmentTimeSelect.disabled =
            true;

        appointmentTimeSelect.innerHTML = `
            <option value="">
                Loading available times...
            </option>
        `;

        timeHelp.textContent =
            "Checking doctor's working hours...";

        workingHoursInfo.hidden =
            true;

        const date =
            parseLocalDate(
                selectedDate
            );

        const javascriptDay =
            date.getDay();

        const backendDay =
            javascriptDay === 0
                ? 6
                : javascriptDay - 1;

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/availability/?staff=${selectedDoctor.id}`,
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

            throw new Error(
                "Unable to load availability."
            );

        }

        const data =
            await response.json();

        availabilityRecords =
            Array.isArray(data)
                ? data
                : data.results || [];

        const dayAvailability =
            availabilityRecords.filter(
                record =>
                    Number(record.staff) ===
                        Number(selectedDoctor.id)
                    &&
                    Number(record.day_of_week) ===
                        Number(backendDay)
                    &&
                    record.is_available === true
            );

        if (dayAvailability.length === 0) {

            appointmentTimeSelect.innerHTML = `
                <option value="">
                    No working hours for this date
                </option>
            `;

            appointmentTimeSelect.disabled =
                true;

            timeHelp.textContent =
                "The selected doctor is not available on this day.";

            return;
        }

        dayAvailability.sort(
            (a, b) =>
                a.start_time.localeCompare(
                    b.start_time
                )
        );

        displayWorkingHours(
            dayAvailability
        );

        generateAvailableTimeSlots(
            dayAvailability
        );

    } catch (error) {

        console.error(
            "Availability error:",
            error
        );

        appointmentTimeSelect.innerHTML = `
            <option value="">
                Unable to load available times
            </option>
        `;

        appointmentTimeSelect.disabled =
            true;

        timeHelp.textContent =
            "Unable to check availability. Please try again.";

    }

}

function displayWorkingHours(
    records
) {

    const text =
        records
            .map(record => {

                return `${formatTime(record.start_time)}
                        - ${formatTime(record.end_time)}`;

            })
            .join(" • ");

    workingHoursText.textContent =
        text;

    workingHoursInfo.hidden =
        false;

}

function generateAvailableTimeSlots(
    workingHours
) {

    appointmentTimeSelect.innerHTML = `
        <option value="">
            Select a start time
        </option>
    `;

    const duration =
        Number(
            selectedService?.duration
        );

    if (!duration || duration <= 0) {

        appointmentTimeSelect.innerHTML = `
            <option value="">
                Invalid service duration
            </option>
        `;

        return;
    }

    let slotCount = 0;

    workingHours.forEach(period => {

        const startMinutes =
            timeToMinutes(
                period.start_time
            );

        const endMinutes =
            timeToMinutes(
                period.end_time
            );

        for (
            let current = startMinutes;
            current + duration <= endMinutes;
            current += duration
        ) {

            const time =
                minutesToTime(
                    current
                );

            const option =
                document.createElement("option");

            option.value =
                time;

            option.textContent =
                formatTime(time);

            appointmentTimeSelect.appendChild(
                option
            );

            slotCount++;

        }

    });

    if (slotCount === 0) {

        appointmentTimeSelect.innerHTML = `
            <option value="">
                No valid time slots available
            </option>
        `;

        appointmentTimeSelect.disabled =
            true;

        timeHelp.textContent =
            "No complete appointment slot fits within the doctor's working hours.";

        return;
    }

    appointmentTimeSelect.disabled =
        false;

    timeHelp.textContent =
        `Available slots are based on the ${duration}-minute service duration.`;

}

function handleTimeChange() {

    updateSummary();

}

function updateSummary() {

    if (selectedService) {

        summaryService.textContent =
            selectedService.name;

        summaryDuration.textContent =
            `${selectedService.duration} minutes`;

    } else {

        summaryService.textContent =
            "—";

        summaryDuration.textContent =
            "—";

    }

    if (selectedDoctor) {

        summaryDoctor.textContent =
            selectedDoctor.name;

    } else {

        summaryDoctor.textContent =
            "—";

    }

    const date =
        appointmentDateInput.value;

    if (date) {

        summaryDate.textContent =
            formatDate(date);

    } else {

        summaryDate.textContent =
            "—";

    }

    const startTime =
        appointmentTimeSelect.value;

    if (startTime) {

        summaryTime.textContent =
            formatTime(startTime);

    } else {

        summaryTime.textContent =
            "—";

    }

    if (
        startTime &&
        selectedService &&
        selectedService.duration
    ) {

        const startMinutes =
            timeToMinutes(
                startTime
            );

        const endMinutes =
            startMinutes +
            Number(
                selectedService.duration
            );

        summaryEndTime.textContent =
            formatTime(
                minutesToTime(
                    endMinutes
                )
            );

    } else {

        summaryEndTime.textContent =
            "—";

    }

}

async function handleBookingSubmit(
    event
) {

    event.preventDefault();

    clearMessage();

    if (!selectedService) {

        showMessage(
            "Please select a service.",
            "error"
        );

        serviceSelect.focus();

        return;
    }

    if (!selectedDoctor) {

        showMessage(
            "Please select a doctor.",
            "error"
        );

        staffSelect.focus();

        return;
    }

    const appointmentDate =
        appointmentDateInput.value;

    if (!appointmentDate) {

        showMessage(
            "Please select an appointment date.",
            "error"
        );

        appointmentDateInput.focus();

        return;
    }

    const startTime =
        appointmentTimeSelect.value;

    if (!startTime) {

        showMessage(
            "Please select an available start time.",
            "error"
        );

        appointmentTimeSelect.focus();

        return;
    }

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    const selectedDate =
        parseLocalDate(
            appointmentDate
        );

    if (selectedDate < today) {

        showMessage(
            "You cannot book an appointment for a past date.",
            "error"
        );

        return;
    }

    const now =
        new Date();

    const isToday =
        appointmentDate ===
        formatDateForInput(now);

    if (isToday) {

        const currentMinutes =
            now.getHours() * 60 +
            now.getMinutes();

        const selectedMinutes =
            timeToMinutes(
                startTime
            );

        if (
            selectedMinutes <=
            currentMinutes
        ) {

            showMessage(
                "You cannot book a past time for today.",
                "error"
            );

            return;
        }

    }

    const requestBody = {

        staff: Number(
            selectedDoctor.id
        ),

        service: Number(
            selectedService.id
        ),

        appointment_date:
            appointmentDate,

        start_time:
            startTime,

        reason:
            reasonInput.value.trim() || null

    };

    bookButton.disabled =
        true;

    bookButton.textContent =
        "Booking...";

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/appointments/`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(
                        requestBody
                    )
                }
            );

        if (response.status === 401) {

            handleUnauthorized();

            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            const errorMessage =
                extractErrorMessage(
                    data
                );

            showMessage(
                errorMessage,
                "error"
            );

            return;
        }

        showMessage(
            "Appointment booked successfully.",
            "success"
        );

        setTimeout(
            () => {

                window.location.href =
                    "dashboard.html";

            },
            1200
        );

    } catch (error) {

        console.error(
            "Booking error:",
            error
        );

        showMessage(
            "Unable to book the appointment. Please try again.",
            "error"
        );

    } finally {

        bookButton.disabled =
            false;

        bookButton.textContent =
            "Book Appointment";

    }

}

function resetDoctor() {

    doctors = [];

    selectedDoctor = null;

    staffSelect.innerHTML = `
        <option value="">
            Select a service first
        </option>
    `;

    staffSelect.disabled =
        true;

    doctorHelp.textContent =
        "Doctors will appear after selecting a service.";

}

function resetDate() {

    appointmentDateInput.value = "";

    appointmentDateInput.disabled =
        true;

}

function resetTime() {

    availabilityRecords = [];

    appointmentTimeSelect.innerHTML = `
        <option value="">
            Select doctor and date first
        </option>
    `;

    appointmentTimeSelect.disabled =
        true;

    timeHelp.textContent =
        "Available time slots will appear after selecting a date.";

    workingHoursInfo.hidden =
        true;

    workingHoursText.textContent =
        "-";

}

function showMessage(
    message,
    type = "error"
) {

    bookingMessage.textContent =
        message;

    bookingMessage.className =
        `booking-message ${type}`;

    bookingMessage.hidden =
        false;

    bookingMessage.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}

function clearMessage() {

    bookingMessage.textContent =
        "";

    bookingMessage.className =
        "booking-message";

    bookingMessage.hidden =
        true;

}

function extractErrorMessage(
    data
) {

    if (!data) {

        return "Something went wrong.";

    }

    if (data.detail) {

        return data.detail;

    }

    if (
        Array.isArray(
            data.non_field_errors
        )
    ) {

        return data.non_field_errors.join(
            " "
        );

    }

    const messages = [];

    Object.entries(data).forEach(
        ([field, errors]) => {

            if (Array.isArray(errors)) {

                messages.push(
                    `${formatFieldName(field)}: ${errors.join(" ")}`
                );

            } else {

                messages.push(
                    `${formatFieldName(field)}: ${errors}`
                );

            }

        }
    );

    if (messages.length > 0) {

        return messages.join(" ");

    }

    return "Unable to complete the request.";

}

function formatFieldName(
    field
) {

    return field
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );

}

function timeToMinutes(
    time
) {

    if (!time) {

        return 0;

    }

    const parts =
        time.split(":");

    const hours =
        Number(parts[0]);

    const minutes =
        Number(parts[1]);

    return (
        hours * 60 +
        minutes
    );

}

function minutesToTime(
    totalMinutes
) {

    const hours =
        Math.floor(
            totalMinutes / 60
        );

    const minutes =
        totalMinutes % 60;

    return (
        String(hours).padStart(2, "0")
        +
        ":"
        +
        String(minutes).padStart(2, "0")
        +
        ":00"
    );

}

function formatTime(
    time
) {

    if (!time) {

        return "—";

    }

    const [hour, minute] =
        time.split(":");

    const hours =
        Number(hour);

    const suffix =
        hours >= 12
            ? "PM"
            : "AM";

    const displayHour =
        hours % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;

}

function parseLocalDate(
    dateString
) {

    const [
        year,
        month,
        day
    ] =
        dateString
            .split("-")
            .map(Number);

    return new Date(
        year,
        month - 1,
        day
    );

}

function formatDate(
    dateString
) {

    const date =
        parseLocalDate(
            dateString
        );

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}

function formatDateForInput(
    date
) {

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

    window.location.href =
        "../login.html";

}