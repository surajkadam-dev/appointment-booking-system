from django.contrib import admin

from .models import Availability, Appointment


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "staff",
        "day_of_week",
        "start_time",
        "end_time",
        "is_available",
    )

    list_filter = (
        "day_of_week",
        "is_available",
    )

    search_fields = (
        "staff__user__email",
        "staff__user__first_name",
        "staff__user__last_name",
    )

    ordering = (
        "staff",
        "day_of_week",
        "start_time",
    )


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "customer",
        "staff",
        "service",
        "appointment_date",
        "start_time",
        "end_time",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "appointment_date",
        "staff",
        "service",
    )

    search_fields = (
        "customer__user__email",
        "customer__user__first_name",
        "customer__user__last_name",
        "staff__user__email",
        "staff__user__first_name",
        "staff__user__last_name",
        "service__name",
    )

    ordering = (
        "-appointment_date",
        "-start_time",
    )

    readonly_fields = (
        "end_time",
        "created_at",
        "updated_at",
    )