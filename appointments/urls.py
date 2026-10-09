from django.urls import path

from .views import (
    AvailabilityListCreateView,
    AvailabilityDetailView,
    AppointmentListCreateView,
    StaffAppointmentCreateView,
    AppointmentDetailView,
    AppointmentCancelView,
    AppointmentRescheduleView,
    AppointmentCompleteView,
)


urlpatterns = [

    # ============================================================
    # AVAILABILITY
    # ============================================================

    path(
        "availability/",
        AvailabilityListCreateView.as_view(),
        name="availability-list-create"
    ),

    path(
        "availability/<int:pk>/",
        AvailabilityDetailView.as_view(),
        name="availability-detail"
    ),

    # ============================================================
    # APPOINTMENTS
    # ============================================================

    # Customer:
    # GET  -> own appointments
    # POST -> book own appointment
    path(
        "",
        AppointmentListCreateView.as_view(),
        name="appointment-list-create"
    ),

    # Admin / Receptionist:
    # POST -> book appointment for a customer
    path(
        "staff-book/",
        StaffAppointmentCreateView.as_view(),
        name="staff-appointment-create"
    ),

    # GET -> appointment details according to user's role
    path(
        "<int:pk>/",
        AppointmentDetailView.as_view(),
        name="appointment-detail"
    ),

    # POST -> cancel appointment
    path(
        "<int:pk>/cancel/",
        AppointmentCancelView.as_view(),
        name="appointment-cancel"
    ),

    # POST -> reschedule appointment
    path(
        "<int:pk>/reschedule/",
        AppointmentRescheduleView.as_view(),
        name="appointment-reschedule"
    ),

    # POST -> complete appointment
    path(
        "<int:pk>/complete/",
        AppointmentCompleteView.as_view(),
        name="appointment-complete"
    ),
]